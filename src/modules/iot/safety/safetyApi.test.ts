import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSafety,safetyFreshness,reasonLabels } from './safetyApi';
import { safetyFixture } from '../../../../tools/tests/safety.fixture';
test('safety freshness requires source and receipt within 15 seconds, independent of browser wall clock',()=>{
 const now=Date.parse('2026-10-14T12:00:00Z'),time=(delta:number)=>new Date(now+delta).toISOString();
 assert.equal(safetyFreshness({observedAt:time(-14999),receivedAt:time(-1)},now),'FRESH');
 assert.equal(safetyFreshness({observedAt:time(-15000),receivedAt:time(-1)},now),'STALE');
 assert.equal(safetyFreshness({observedAt:time(-1),receivedAt:time(-15000)},now),'STALE');
 assert.equal(safetyFreshness({observedAt:time(2001),receivedAt:time(-1)},now),'CLOCK_SKEW');
 assert.equal(safetyFreshness(null,now),'EMPTY');
});
test('safety parser rejects wrong identity, impossible queue counts and malformed history',()=>{
 assert.equal(parseSafety(safetyFixture()).farmId,'FARM001');
 for(const mutate of [
  (v:any)=>{v.farmId='FARM002';},(v:any)=>{v.queue={unresolved:0,overdue:1};},
  (v:any)=>{v.sensor.soilMoisture='28';},(v:any)=>{v.relay.safetyLockout='false';},
  (v:any)=>{v.stateHistory=[{id:1,reportedState:'OFF'}];},(v:any)=>{v.settings.durationSeconds=3600;},
 ]){const value=safetyFixture();mutate(value);assert.throws(()=>parseSafety(value));}
});
test('missing readings remain null and historical lockout does not turn into current OFF',()=>{
 const value=safetyFixture();value.sensor=null;value.relay=null;assert.equal(parseSafety(value).relay,null);
 const now=Date.now(),old=new Date(now-60000).toISOString();
 value.relay={observedAt:old,receivedAt:old,reportedState:'ON',safetyLockout:true,stateReason:'CONNECTION_LOST'};
 const parsed=parseSafety(value);assert.equal(parsed.relay!.reportedState,'ON');assert.equal(safetyFreshness(parsed.relay,now),'STALE');
});

test('water-low device history remains a lockout with a Vietnamese reason',()=>{
 const value=safetyFixture();
 value.relay!.stateReason='WATER_LOW'; value.relay!.safetyLockout=true; value.relay!.reportedState='OFF';
 value.stateHistory=[{id:1,observedAt:value.relay!.observedAt,receivedAt:value.relay!.receivedAt,
  reportedState:'OFF',safetyLockout:true,stateReason:'WATER_LOW',changeType:'STATE_CHANGED'}];
 const parsed=parseSafety(value);
 assert.equal(parsed.relay!.stateReason,'WATER_LOW');
 assert.equal(parsed.stateHistory[0].stateReason,'WATER_LOW');
 assert.match(reasonLabels.WATER_LOW,/cạn nước/);
});


test('local flow trip reasons remain device-reported locked OFF observations',()=>{
 for(const reason of ['FLOW_LOW','FLOW_SENSOR_FAULT']){
  const v=safetyFixture();v.relay!.stateReason=reason;v.relay!.reportedState='OFF';v.relay!.safetyLockout=true;
  v.stateHistory=[{id:1,observedAt:v.relay!.observedAt,receivedAt:v.relay!.receivedAt,reportedState:'OFF',safetyLockout:true,stateReason:reason,changeType:'STATE_CHANGED'}];
  assert.equal(parseSafety(v).stateHistory[0].stateReason,reason);assert.match(reasonLabels[reason],/thiết bị báo/);
 }
});

test('flow fault observations must be OFF and locked, not an ON permission',()=>{
 const v=safetyFixture();v.relay!.stateReason='FLOW_LOW';v.relay!.reportedState='ON';v.relay!.safetyLockout=true;assert.throws(()=>parseSafety(v));
 v.relay!.reportedState='OFF';v.relay!.safetyLockout=false;assert.throws(()=>parseSafety(v));
});

test('optional local valve metadata remains an explicitly reported simulator capability',()=>{const v:any=safetyFixture();assert.equal(parseSafety(v).relay!.valveInterlock,undefined);v.relay.valveInterlock={version:1,enabled:true,dataSource:'SIMULATOR',state:'OPEN',fault:null};assert.equal(parseSafety(v).relay!.valveInterlock!.state,'OPEN');for(const edit of [(p:any)=>p.dataSource='PHYSICAL',(p:any)=>p.enabled=false,(p:any)=>p.extra=1]){const copy=structuredClone(v);edit(copy.relay.valveInterlock);assert.throws(()=>parseSafety(copy));}});
test('local valve faults require locked OFF and matching fault metadata',()=>{for(const cause of ['VALVE_NOT_OPEN','VALVE_PROOF_LOST','VALVE_SWITCH_CONFLICT']){const v:any=safetyFixture();v.relay.safetyLockout=true;v.relay.stateReason=cause;v.relay.valveInterlock={version:1,enabled:true,dataSource:'SIMULATOR',state:'OPEN',fault:cause};assert.equal(parseSafety(v).relay!.valveInterlock!.fault,cause);v.relay.reportedState='ON';assert.throws(()=>parseSafety(v));v.relay.reportedState='OFF';v.relay.safetyLockout=false;assert.throws(()=>parseSafety(v));}});
test('ON cannot be represented as valid with closed or unknown proof, reset needs open proof',()=>{for(const state of ['CLOSED','UNKNOWN','CONFLICT']){const v:any=safetyFixture();v.relay.valveInterlock={version:1,enabled:true,dataSource:'SIMULATOR',state,fault:null};v.relay.reportedState='ON';assert.throws(()=>parseSafety(v));v.relay.reportedState='OFF';v.relay.stateReason='LOCKOUT_RESET';assert.throws(()=>parseSafety(v));}});

test('durable journal is optional and faults require locked OFF reports',()=>{
 for(const [state,reason] of [['LOCKED','RESTART_LOCKOUT'],['STORAGE_FAULT','SAFETY_STORAGE_FAULT']]){
  const v:any=safetyFixture();v.relay.durableSafety={version:1,enabled:true,storage:'NVS',state};v.relay.stateReason=reason;v.relay.safetyLockout=true;
  assert.equal(parseSafety(v).relay!.durableSafety!.state,state);v.relay.reportedState='ON';assert.throws(()=>parseSafety(v));v.relay.reportedState='OFF';v.relay.safetyLockout=false;assert.throws(()=>parseSafety(v));
 }
});
test('durable reason cannot invent NVS and malformed capability is rejected',()=>{
 const v:any=safetyFixture();v.relay.stateReason='RESTART_LOCKOUT';v.relay.safetyLockout=true;assert.throws(()=>parseSafety(v));
 v.relay.durableSafety={version:1,enabled:true,storage:'NVS',state:'LOCKED'};
 for(const edit of [(d:any)=>d.storage='RAM',(d:any)=>d.enabled=false,(d:any)=>d.version=2,(d:any)=>d.extra=true,(d:any)=>d.state='SAFE']){const copy=structuredClone(v);edit(copy.relay.durableSafety);assert.throws(()=>parseSafety(copy));}
});
test('READY is OFF without lock, ARMED is a journal rather than output proof',()=>{
 const v:any=safetyFixture();v.relay.stateReason='LOCKOUT_RESET';v.relay.durableSafety={version:1,enabled:true,storage:'NVS',state:'READY'};assert.equal(parseSafety(v).relay!.reportedState,'OFF');v.relay.reportedState='ON';assert.throws(()=>parseSafety(v));v.relay.stateReason='COMMAND_ON';v.relay.durableSafety.state='ARMED';assert.equal(parseSafety(v).relay!.reportedState,'ON');v.relay.reportedState='OFF';assert.equal(parseSafety(v).relay!.durableSafety!.state,'ARMED');
});

test('local proof may declare a strict simulator circuit route without becoming physical attestation',()=>{const v:any=safetyFixture();v.relay.valveInterlock={version:1,enabled:true,dataSource:'SIMULATOR',state:'OPEN',fault:null,route:{circuitId:'CIRCUIT08',circuitRevision:1,zoneId:'ZONE08',zoneRevision:1,controllerId:'IRRIGATION08',valveId:'VALVE08'}};assert.equal(parseSafety(v).relay!.valveInterlock!.route!.valveId,'VALVE08');v.relay.valveInterlock.route.zoneRevision=true;assert.throws(()=>parseSafety(v));});
