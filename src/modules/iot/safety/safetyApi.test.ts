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
