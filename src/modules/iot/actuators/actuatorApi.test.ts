import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseOverview,parseCommands,parseSequence,zoneRequest,resultLabel,type Actuator} from './actuatorApi';
const now='2026-11-19T01:00:00Z';
const valve=(n:number,extra:Partial<Actuator>={}):Actuator=>({actuatorId:`VALVE0${n}`,actuatorType:'VALVE',zoneName:`Zone ${n}`,maxSeconds:3600,reportedState:'OFF',safetyLockout:false,stateReason:'BOOT',fresh:true,observedAt:now,...extra});
const fan:Actuator={actuatorId:'FAN01',actuatorType:'FAN',zoneName:null,maxSeconds:14400,reportedState:'UNKNOWN',safetyLockout:false,stateReason:null,fresh:false,observedAt:null};
const run=(extra:Record<string,unknown>={})=>({id:1,state:'RUNNING',createdAt:now,finishedAt:null,result:null,currentStep:1,
 steps:[{stepNo:1,valveId:'VALVE01',zoneName:'Zone 1',pumpSeconds:300,phase:'WATERING',phaseStartedAt:now,result:null}],...extra});

test('overview accepts v3 actuators and rejects anything that would misstate safety',()=>{
 assert.equal(parseOverview({enabled:true,actuators:[valve(1),fan]}).actuators.length,2);
 for(const bad of [
  {...fan,actuatorId:'PUMP01'},{...fan,actuatorType:'PUMP'},{...fan,maxSeconds:14401},{...valve(1),zoneName:null},{...fan,zoneName:'Zone'},
  {...fan,reportedState:'OFF'},            // stale data cannot claim OFF
  {...valve(1),observedAt:null},{...valve(1),safetyLockout:'no'},{...valve(1),actuatorType:'MIST',zoneName:null,maxSeconds:601}])
  assert.throws(()=>parseOverview({enabled:true,actuators:[bad]}),JSON.stringify(bad));
 assert.throws(()=>parseOverview({enabled:true,actuators:[valve(1),valve(1)]}));
});
test('commands need a duration exactly for ON',()=>{
 const c={commandId:'6f1c2e1a-8d43-4c55-9b0e-7f6a5e3d2c10',actuatorId:'VALVE01',action:'ON',durationSeconds:360,issuedAt:now,expiresAt:now,state:'SENT',reportedState:null,errorCode:null,source:'SEQUENCE'};
 assert.equal(parseCommands([c]).length,1);
 assert.throws(()=>parseCommands([{...c,durationSeconds:null}]));
 assert.throws(()=>parseCommands([{...c,action:'OFF'}]));
 assert.throws(()=>parseCommands([{...c,source:'BROWSER'}]));
});
test('sequence view: running has no finish time and steps are numbered from 1',()=>{
 const view=parseSequence({enabled:true,current:run(),recent:[run()]});
 assert.equal(view.current?.steps[0].phase,'WATERING');
 assert.throws(()=>parseSequence({enabled:true,current:run({state:'COMPLETED',finishedAt:now}),recent:[]}));
 assert.throws(()=>parseSequence({enabled:true,current:null,recent:[run({finishedAt:now})]}));
 assert.throws(()=>parseSequence({enabled:true,current:null,recent:[run({steps:[{...run().steps[0],stepNo:2}]})]}));
 assert.throws(()=>parseSequence({enabled:true,current:null,recent:[run({steps:[{...run().steps[0],pumpSeconds:1801}]})]}));
});
test('zone request checks selection, pump time and the valve cap',()=>{
 const valves=[valve(1),valve(2,{maxSeconds:120})];
 assert.deepEqual(zoneRequest([{valveId:'VALVE01',selected:true,minutes:5},{valveId:'VALVE02',selected:false,minutes:1}],valves),{zones:[{valveId:'VALVE01',pumpSeconds:300}]});
 assert.equal(typeof zoneRequest([{valveId:'VALVE01',selected:false,minutes:5}],valves),'string');
 assert.equal(typeof zoneRequest([{valveId:'VALVE01',selected:true,minutes:31}],valves),'string');
 assert.equal(typeof zoneRequest([{valveId:'VALVE01',selected:true,minutes:0}],valves),'string');
 assert.match(zoneRequest([{valveId:'VALVE02',selected:true,minutes:2}],valves) as string,/quá ngắn/);
 assert.equal(resultLabel('VALVE_OPEN_FAILED VALVE_LIMIT'),'Van không mở (VALVE_LIMIT)');
 assert.equal(resultLabel('PUMP_STOPPED WATER_LOW'),'Bơm dừng bất thường (WATER_LOW)');
});
