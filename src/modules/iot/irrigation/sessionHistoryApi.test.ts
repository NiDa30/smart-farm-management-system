import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSessionHistory,parseSessionSteps,sessionsCsv,sessionStepsCsv,type SessionQuery} from './sessionHistoryApi';
import {historyRun,historyStep,historySession,historyBoot} from '../../../../tools/tests/fixtures/session-history-data';
const at='2026-10-16T06:30:00.123456Z';
const q:SessionQuery={from:'2026-10-16T06:00:00Z',to:'2026-10-16T07:00:00Z',circuitId:'PC1',condition:'ALL'};
const page=(items:any[])=>({...q,asOf:q.to,ceilingId:10,items,nextCursor:null});
const entry=(id=1)=>({id,session:historyRun(at),actionCount:5,unresolvedCount:0});
const steps=(items:any[])=>({session:historyRun(at),asOf:q.to,ceilingId:10,items,nextCursor:null});
test('history retains stored route and microsecond bounds independently of current config',()=>{
 assert.equal(parseSessionHistory(page([entry()]),q).items.length,1);
 assert.throws(()=>parseSessionHistory({...page([]),from:q.from.replace('00Z','00.000001Z')},q));
 assert.throws(()=>parseSessionHistory(page([{...entry(),session:{...historyRun(at),createdAt:q.to}}]),q));
});
test('wrong branch, phase filter, duplicate session and invalid counts are rejected',()=>{
 for(const v of [{...page([entry()]),circuitId:'PC2'},page([entry(),entry(2)]),page([{...entry(),unresolvedCount:6}]),{...page([entry()]),condition:'RECOVERY'}])assert.throws(()=>parseSessionHistory(v,q));
});
test('order uses microseconds before identity and rejects duplicate or reversed rows',()=>{
 const a=entry(2),b={...entry(3),session:{...historyRun('2026-10-16T06:30:00.123001Z','86000000-0000-4000-8000-000000000004')}};
 assert.equal(parseSessionHistory(page([a,b]),q).items.length,2);assert.throws(()=>parseSessionHistory(page([b,a]),q));
});
test('steps keep saved dispatch result distinct from current ACK ledger',()=>{
 const v=parseSessionSteps(steps([historyStep(at)]),'PC1',historySession);assert.equal(v.items[0].operation.result.command.state,'SENT');assert.equal(v.items[0].command!.state,'EXECUTED');
});
test('cross session, missing fields and contradictory ACK cannot become valid evidence',()=>{
 for(const edit of [(v:any)=>v.operation.sessionId=crypto.randomUUID(),(v:any)=>v.command.ackBootId=crypto.randomUUID(),(v:any)=>v.command.state='SENT',(v:any)=>delete v.command,(v:any)=>v.command.reportedState='OFF']){const v=historyStep(at);edit(v);assert.throws(()=>parseSessionSteps(steps([v]),'PC1',historySession));}
});
test('missing matching command is allowed as unknown without inventing a result',()=>{const v={...historyStep(at),command:null};assert.equal(parseSessionSteps(steps([v]),'PC1',historySession).items[0].command,null);});
test('route-free OFF ACK can come from a newer boot, while ON must match target',()=>{
 const v:any=historyStep(at);v.operation.action=v.operation.definition.action=v.operation.payload.action=v.operation.result.request.action=v.operation.result.command.action='OFF';v.operation.payload.durationSeconds=v.operation.result.command.durationSeconds=null;v.operation.payload.expectedBootId=null;delete v.operation.payload.route;v.command.action='OFF';v.command.reportedState='OFF';v.command.ackBootId=crypto.randomUUID();
 assert.equal(parseSessionSteps(steps([v]),'PC1',historySession).items[0].command!.action,'OFF');
});
test('valve ACK sequence has no invented receipt clock or GPIO state',()=>{
 const v:any=historyStep(at);v.operation.action=v.operation.definition.action='CLOSE';v.operation.payload={requestId:v.operation.requestId,action:'CLOSE',durationSeconds:null,expectedBootId:historyBoot,expectedRevision:1,expectedZoneRevision:1,requestedAt:at};v.operation.result=null;v.operation.state='UNRESOLVED';v.command={...v.command,kind:'VALVE',action:'CLOSE',reportedState:null,acknowledgedAt:null};
 assert.equal(parseSessionSteps(steps([v]),'PC1',historySession).items.length,1);v.command.acknowledgedAt=at;assert.throws(()=>parseSessionSteps(steps([v]),'PC1',historySession));
});
test('FINISH has no command and invalid pagination cannot be exported as complete',()=>{
 assert.throws(()=>parseSessionSteps({...steps([]),nextCursor:'a'},'PC1',historySession));const v:any=historyStep(at);v.operation.action=v.operation.definition.action='FINISH';v.operation.payload=v.operation.result=null;assert.throws(()=>parseSessionSteps(steps([v]),'PC1',historySession));v.command=null;assert.equal(parseSessionSteps(steps([v]),'PC1',historySession).items.length,1);
});
test('CSV preserves read/source clocks and neutralizes spreadsheet formula injection',()=>{
 const r={...entry(),readAt:q.to};r.session.reason=' =HYPERLINK("bad")';const csv=sessionsCsv([r] as any);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes("' =HYPERLINK"));assert.ok(csv.includes(at));assert.ok(csv.includes('requestedDurationSeconds'));assert.equal(csv.split('\r\n').length,3);
 const v={...historyStep(at),readAt:q.to};const c=sessionStepsCsv(historyRun(at) as any,[v] as any);assert.ok(c.includes('"SENT","EXECUTED"'));assert.ok(c.includes(q.to));
});
