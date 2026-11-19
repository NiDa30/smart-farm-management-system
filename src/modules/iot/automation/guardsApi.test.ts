import test from 'node:test';
import assert from 'node:assert/strict';
import {guardSummary,parseOptional,parseSimulation,sameGuards,validGuards,type WateringGuards} from './guardsApi';

const none:WateringGuards={minAirTemperature:null,maxAirTemperature:null,maxAirHumidity:null,waterNode:null,waterChannel:null,maxRunsPerDay:null,revision:1};

test('guards mirror backend bounds and keep water node and channel together',()=>{
  assert.equal(validGuards(none),true);
  assert.equal(validGuards({...none,minAirTemperature:30,maxAirTemperature:20}),false);
  assert.equal(validGuards({...none,maxAirHumidity:0}),false);
  assert.equal(validGuards({...none,waterNode:'WATER01'}),false);
  assert.equal(validGuards({...none,waterNode:'WATER01',waterChannel:'LOW'}),true);
  assert.equal(validGuards({...none,waterNode:'water01',waterChannel:'LOW'}),false);
  assert.equal(validGuards({...none,maxRunsPerDay:2.5}),false);
  assert.equal(validGuards({...none,maxRunsPerDay:201}),false);
  assert.equal(validGuards({...none,revision:0}),false);
  assert.equal(sameGuards(none,{...none,revision:9}),true,'revision is not part of the content');
});

test('optional fields: empty means unchecked, decimals accept a comma, integers stay integers',()=>{
  assert.equal(parseOptional(''),null);assert.equal(parseOptional('  '),null);
  assert.equal(parseOptional('32,5'),32.5);assert.equal(parseOptional('-3'),-3);
  assert.equal(parseOptional('abc'),undefined);assert.equal(parseOptional('1e3'),undefined);
  assert.equal(parseOptional('4',true),4);assert.equal(parseOptional('4.5',true),undefined);
});

test('summary lists only configured guards',()=>{
  assert.deepEqual(guardSummary(none),[]);
  const all=guardSummary({...none,minAirTemperature:15,maxAirTemperature:35,maxAirHumidity:90,waterNode:'WATER01',waterChannel:'LOW',maxRunsPerDay:6});
  assert.equal(all.length,4);assert.match(all[0],/từ 15°C đến 35°C/);assert.match(all[2],/WATER01\/LOW/);
});

test('simulation results are checked before display',()=>{
  const ok={from:'2026-11-18T00:00:00Z',to:'2026-11-19T00:00:00Z',samples:17000,runs:3,pumpSeconds:55,earlyStops:1,timerStops:2,
    blocked:{DAILY_LIMIT_REACHED:2},runsPerDay:{'2026-11-18':3},waterGuardAssumed:false,eventsTruncated:false,
    events:[{at:'2026-11-18T01:00:00Z',type:'START',reason:null,soilMoisture:28}]};
  assert.equal(parseSimulation(ok).runs,3);
  assert.throws(()=>parseSimulation({...ok,earlyStops:3}),'stops cannot exceed runs');
  assert.throws(()=>parseSimulation({...ok,blocked:{X:-1}}));
  assert.throws(()=>parseSimulation({...ok,events:[{...ok.events[0],type:'BOOM'}]}));
  assert.throws(()=>parseSimulation({...ok,to:ok.from}));
});
