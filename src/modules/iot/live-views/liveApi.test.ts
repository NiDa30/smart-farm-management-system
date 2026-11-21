import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseEnergy,parseAnalytics,buildTopology,hours,successRate} from './liveApi';
const now=Date.parse('2026-11-21T02:00:00Z');const iso=(ms:number)=>new Date(now-ms).toISOString();
const fan={actuatorId:'FAN01',actuatorType:'FAN',ratedWatts:200,seconds:1800,kilowattHours:0.1,days:[{day:'2026-11-21',seconds:1800,kilowattHours:0.1}]};
const pump={actuatorId:'PUMP01',actuatorType:'PUMP',ratedWatts:null,seconds:0,kilowattHours:null,days:[]};
const energy=(extra={})=>({days:1,from:iso(3600e3),to:iso(0),method:'ESTIMATED_FROM_RUNTIME',actuators:[pump,fan],totalKilowattHours:0.1,unrated:['PUMP01'],...extra});
const cmds={total:3,executed:2,failed:1,timedOut:0,uncertain:0,errors:{WATER_LOW:1}};

test('energy: estimates only, unknown power never turned into kWh',()=>{
 assert.equal(parseEnergy(energy()).actuators.length,2);
 assert.throws(()=>parseEnergy(energy({method:'METER'})));
 assert.throws(()=>parseEnergy(energy({actuators:[{...pump,kilowattHours:0.5}]})),'kWh without rated power');
 assert.throws(()=>parseEnergy(energy({actuators:[{...fan,seconds:10}]})),'days must add up');
 assert.throws(()=>parseEnergy(energy({unrated:[]})),'unrated list must match');
 assert.throws(()=>parseEnergy(energy({actuators:[{...fan,days:[{day:'2026-11-21',seconds:90000,kilowattHours:1}],seconds:90000}]})),'> 24 h a day');
});
test('analytics parses and keeps counts consistent',()=>{
 const a=parseAnalytics({days:7,from:iso(7*86400e3),to:iso(0),pump:cmds,actuators:{...cmds,total:0,executed:0,failed:0,errors:{}},wateringRuns:4,sequencesCompleted:1,sequencesAborted:0,alertsOpened:{SENSOR:1,WATER:0,DEVICE_HEALTH:2},runtime:[fan]});
 assert.equal(successRate(a.pump),67);assert.equal(successRate(a.actuators),null);
 assert.throws(()=>parseAnalytics({...a,pump:{...cmds,executed:5}}));
 assert.throws(()=>parseAnalytics({...a,alertsOpened:{SENSOR:1}}));
 assert.equal(hours(45),'45 giây');assert.equal(hours(5400),'1 giờ 30 phút');
});
test('topology: link state from evidence; actuators unknown unless fresh',()=>{
 const nodes={farmId:'FARM001',asOf:iso(0),nodes:[
  {nodeId:'ENV01',name:'Env',areaId:'A1',nodeType:'ENVIRONMENT',telemetryVersion:1,channels:[],actuators:[{actuatorId:'PUMP01',actuatorType:'PUMP',commandContract:'PUMP_V1'},{actuatorId:'FAN01',actuatorType:'FAN',commandContract:'ACTUATOR_V3'}]},
  {nodeId:'WATER01',name:'Water',areaId:'A1',nodeType:'WATER',telemetryVersion:2,channels:[{channelId:'LOW',metric:'WATER_PRESENT',unit:'boolean',calibrationVersion:null,latest:{value:true,quality:'VALID',observedAt:iso(90e3),receivedAt:iso(90e3),bootId:'b',sequence:1,calibrationVersion:null,dataSource:'SIMULATOR'}}],actuators:[]}]} as any;
 const monitoring={asOf:iso(0),mqtt:{state:'CONNECTED',changedAt:iso(0),lastProcessedAt:iso(0)},devices:[
  {deviceId:'ENV01',lastMessageAt:iso(5e3),dataState:'FRESH'},{deviceId:'PUMP01',lastMessageAt:iso(5e3),dataState:'FRESH',reportedState:'OFF',safetyLockout:false}]} as any;
 const overview={enabled:true,actuators:[{actuatorId:'FAN01',fresh:false,reportedState:'UNKNOWN',safetyLockout:false}]} as any;
 const t=buildTopology(nodes,monitoring,overview,now);
 assert.equal(t.broker,'CONNECTED');
 assert.equal(t.nodes[0].link,'CONNECTED');assert.equal(t.nodes[1].link,'SILENT');
 assert.deepEqual(t.nodes[0].actuators.map(a=>[a.actuatorId,a.state]),[['PUMP01','OFF'],['FAN01','UNKNOWN']]);
 assert.equal(t.nodes[1].channels[0].fresh,false);
 assert.equal(buildTopology(nodes,null,null,now).nodes[0].actuators[0].state,'UNKNOWN');
});
