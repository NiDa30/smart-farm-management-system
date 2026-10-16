import {parseSessionRun,parseSessionOperation,type SessionRun,type SessionOperation} from './irrigationSessionApi';
export type SessionCondition='ALL'|'UNFINISHED'|'CLOSED'|'RECOVERY';
export interface SessionQuery {from:string;to:string;circuitId:string;condition:SessionCondition}
export interface SessionEntry {id:number;session:SessionRun;actionCount:number;unresolvedCount:number}
export interface SessionPage {from:string;to:string;circuitId:string|null;condition:SessionCondition;asOf:string;ceilingId:number;items:SessionEntry[];nextCursor:string|null}
export interface SessionCommand {kind:'PUMP'|'VALVE';commandId:string;action:string;state:string;reportedState:'ON'|'OFF'|null;errorCode:string|null;issuedAt:string;expiresAt:string;targetBootId:string|null;ordinal:number;acknowledgedAt:string|null;ackBootId:string|null;ackSequence:number|null}
export interface SessionHistoryStep {id:number;createdAt:string;operation:SessionOperation;command:SessionCommand|null}
export interface SessionSteps {session:SessionRun;asOf:string;ceilingId:number;items:SessionHistoryStep[];nextCursor:string|null}
export type Loaded<T>=T&{readAt:string};
export const sessionConditions:Record<SessionCondition,string>={ALL:'Tất cả',UNFINISHED:'Chưa khép phiên',CLOSED:'Đã khép phiên',RECOVERY:'Cần phục hồi'};
export const sessionPhases:Record<string,string>={PREPARED:'Đã giữ phiên',DISPATCHING_OPEN:'Đang xử lý mở van',WAIT_OPEN:'Chờ bằng chứng mở van',DISPATCHING_ON:'Đang xử lý bật bơm',WAIT_ON:'Đã lưu bước bật',DISPATCHING_OFF:'Đang xử lý tắt bơm',WAIT_OFF:'Chờ bằng chứng OFF',DISPATCHING_CLOSE:'Đang xử lý đóng van',WAIT_CLOSED:'Chờ bằng chứng CLOSED',RECOVERY_REQUIRED:'Cần phục hồi',CLOSED_CONFIRMED:'Đã khép phiên'};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const count=(v:unknown,min=0):v is number=>Number.isSafeInteger(v)&&(v as number)>=min;
export const historyMicros=(s:string)=>BigInt(Date.parse(s))*1000n+BigInt((s.match(/\.(\d+)(?:Z|[+-]\d\d:\d\d)$/)?.[1]??'').padEnd(6,'0').slice(3,6));
export const validSessionQuery=(q:SessionQuery)=>date(q.from)&&date(q.to)&&historyMicros(q.from)<historyMicros(q.to)&&historyMicros(q.to)-historyMicros(q.from)<=31n*86400000000n&&(!q.circuitId||/^[A-Z][A-Z0-9_-]{1,31}$/.test(q.circuitId))&&Object.hasOwn(sessionConditions,q.condition);
export function historyFollows(a:{id:number;createdAt:string},b:{id:number;createdAt:string}){return historyMicros(a.createdAt)>historyMicros(b.createdAt)||historyMicros(a.createdAt)===historyMicros(b.createdAt)&&a.id>b.id;}
function validPage(v:any){return !!v&&date(v.asOf)&&count(v.ceilingId)&&Array.isArray(v.items)&&v.items.length<=50&&(v.nextCursor===null||typeof v.nextCursor==='string'&&/^[A-Za-z0-9_-]{1,512}$/.test(v.nextCursor)&&v.items.length>0);}
export function parseSessionHistory(v:any,q:SessionQuery):SessionPage {
 if(!validSessionQuery(q)||!validPage(v)||!date(v.from)||!date(v.to)||historyMicros(v.from)!==historyMicros(q.from)||historyMicros(v.to)!==historyMicros(q.to)||v.circuitId!==(q.circuitId||null)||v.condition!==q.condition)throw new Error('Phản hồi lịch sử phiên không khớp bộ lọc.');
 const seen=new Set<string>();
 for(let i=0;i<v.items.length;i++){
  const x=v.items[i];parseSessionRun(x?.session);const r=x.session;
  if(!count(x.id,1)||x.id>v.ceilingId||!count(x.actionCount)||!count(x.unresolvedCount)||x.unresolvedCount>x.actionCount||seen.has(r.sessionId)||historyMicros(r.createdAt)<historyMicros(q.from)||historyMicros(r.createdAt)>=historyMicros(q.to)||q.circuitId&&r.config.circuitId!==q.circuitId||q.condition==='CLOSED'&&r.phase!=='CLOSED_CONFIRMED'||q.condition==='UNFINISHED'&&r.phase==='CLOSED_CONFIRMED'||q.condition==='RECOVERY'&&r.phase!=='RECOVERY_REQUIRED'||i>0&&!historyFollows({id:v.items[i-1].id,createdAt:v.items[i-1].session.createdAt},{id:x.id,createdAt:r.createdAt}))throw new Error('Phiên không khớp khoảng giờ, nhánh hoặc thứ tự.');
  seen.add(r.sessionId);
 }return v;
}
function parseCommand(c:any,op:SessionOperation):SessionCommand|null {
 if(c===null)return null;
 const pump=['ON','OFF'].includes(op.action),p=op.payload,ack=c?.ackSequence!==null;
 if(op.action==='FINISH'||!c||c.kind!==(pump?'PUMP':'VALVE')||c.commandId!==op.requestId||c.action!==op.action||!count(c.ordinal,1)||!date(c.issuedAt)||!date(c.expiresAt)||historyMicros(c.expiresAt)<=historyMicros(c.issuedAt)||historyMicros(c.expiresAt)-historyMicros(c.issuedAt)>15000000n||!(c.errorCode===null||typeof c.errorCode==='string')||!(c.targetBootId===null||uuid(c.targetBootId))||!(c.acknowledgedAt===null||date(c.acknowledgedAt))||!(c.ackBootId===null||uuid(c.ackBootId))||!(c.ackSequence===null||count(c.ackSequence))||!(c.reportedState===null||['ON','OFF'].includes(c.reportedState)))throw new Error('Bản lưu lệnh không khớp bước.');
 if(pump){
  if(!['PENDING','SENT','PUBLISH_UNCERTAIN','EXECUTED','FAILED','TIMED_OUT'].includes(c.state)||op.action==='ON'&&c.targetBootId!==p.expectedBootId||ack&&(!uuid(c.ackBootId)||op.action==='ON'&&c.ackBootId!==c.targetBootId||c.acknowledgedAt===null||c.reportedState===null||!['EXECUTED','FAILED'].includes(c.state))||!ack&&(c.ackBootId!==null||c.acknowledgedAt!==null)||c.state==='EXECUTED'&&(!ack||c.reportedState!==op.action))throw new Error('ACK bơm thiếu hoặc mâu thuẫn.');
 }else if(!['PENDING','SENT','PUBLISH_UNCERTAIN','EXECUTED','REJECTED'].includes(c.state)||c.targetBootId!==p.expectedBootId||c.reportedState!==null||c.acknowledgedAt!==null||ack&&(c.ackBootId!==c.targetBootId||!['EXECUTED','REJECTED'].includes(c.state))||!ack&&(c.ackBootId!==null||['EXECUTED','REJECTED'].includes(c.state)))throw new Error('ACK van thiếu hoặc mâu thuẫn.');
 return c;
}
export function parseSessionSteps(v:any,circuit:string,session:string):SessionSteps {
 if(!validPage(v))throw new Error('Phản hồi các bước không hợp lệ.');parseSessionRun(v.session);
 if(v.session.sessionId!==session||v.session.config.circuitId!==circuit)throw new Error('Chi tiết thuộc phiên hoặc nhánh khác.');
 const seen=new Set<string>();
 for(let i=0;i<v.items.length;i++){
  const x=v.items[i];parseSessionOperation(x?.operation,circuit);
  if(!count(x.id,1)||x.id>v.ceilingId||!date(x.createdAt)||x.operation.sessionId!==session||seen.has(x.operation.requestId)||i>0&&!historyFollows(v.items[i-1],x))throw new Error('Bước thuộc phiên khác hoặc sai thứ tự.');
  parseCommand(x.command,x.operation);seen.add(x.operation.requestId);
 }return v;
}
export async function fetchSessionHistory(q:SessionQuery,cursor:string|null,signal:AbortSignal){
 if(!validSessionQuery(q))throw new Error('Chọn mã nhánh hợp lệ và khoảng giờ tối đa 31 ngày.');
 const p=new URLSearchParams({from:q.from,to:q.to,condition:q.condition,limit:'50'});if(q.circuitId)p.set('circuitId',q.circuitId);if(cursor)p.set('cursor',cursor);
 const r=await fetch('/api/v1/irrigation-session-history?'+p,{signal,cache:'no-store'});if(!r.ok)throw new Error('Không đọc được lịch sử phiên tưới.');return parseSessionHistory(await r.json(),q);
}
export async function fetchSessionSteps(circuit:string,session:string,cursor:string|null,signal:AbortSignal){
 const p=new URLSearchParams({limit:'50'});if(cursor)p.set('cursor',cursor);
 const r=await fetch('/api/v1/irrigation-session-history/'+encodeURIComponent(circuit)+'/'+encodeURIComponent(session)+'/steps?'+p,{signal,cache:'no-store'});if(!r.ok)throw new Error('Không đọc được các bước của phiên tưới.');return parseSessionSteps(await r.json(),circuit,session);
}
const cell=(v:unknown)=>{let s=v==null?'':String(v);if(/^[=+\-@\t\r]/.test(s.trimStart()))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
const csv=(rows:unknown[][])=>'\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';
export const sessionsCsv=(rows:Loaded<SessionEntry>[])=>csv([['sessionId','circuit','circuitRevision','zone','zoneRevision','controller','valve','source','requestedDurationSeconds','phaseAtRead','reason','stopRequested','requestedAt','createdAt','finishedAt','pumpBoot','valveBoot','actionCountAtRead','unresolvedCallCountAtRead','readAt'],...rows.map(x=>{const s=x.session,c=s.config;return [s.sessionId,c.circuitId,c.revision,c.zoneId,c.zoneRevision,c.controllerId,c.valveId,c.expectedSource,s.durationSeconds,s.phase,s.reason,s.stopRequested,s.requestedAt,s.createdAt,s.finishedAt,s.pumpBootId,s.valveBootId,x.actionCount,x.unresolvedCount,x.readAt];})]);
export const sessionStepsCsv=(session:SessionRun,rows:Loaded<SessionHistoryStep>[])=>csv([['sessionId','circuit','circuitRevision','requestId','step','createdAt','reviewedAt','expectedRevision','callState','dispatchResultState','ledgerStateAtRead','ordinal','targetBoot','reportedStateInAck','errorCode','acknowledgedAt','ackBoot','ackSequence','readAt'],...rows.map(x=>[session.sessionId,session.config.circuitId,session.config.revision,x.operation.requestId,x.operation.action,x.createdAt,x.operation.definition.reviewedAt,x.operation.definition.expectedRevision,x.operation.state,x.operation.result?.state??x.operation.result?.command?.state,x.command?.state,x.command?.ordinal,x.command?.targetBootId,x.command?.reportedState,x.command?.errorCode,x.command?.acknowledgedAt,x.command?.ackBootId,x.command?.ackSequence,x.readAt])]);
