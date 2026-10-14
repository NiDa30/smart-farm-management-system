import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseNodes,channelFreshness,matchesDeclaration,type FarmNode} from './nodeApi';
const now='2026-10-14T12:00:00Z';
function node():FarmNode{return {nodeId:'WATER01',name:'Trạm nước',areaId:'AREA001',nodeType:'WATER',telemetryVersion:2,actuators:[],channels:[{channelId:'LOW',metric:'WATER_PRESENT',unit:'boolean',calibrationVersion:null,latest:{value:false,quality:'VALID',observedAt:now,receivedAt:now,bootId:'31000000-0000-4000-8000-000000000001',sequence:1,calibrationVersion:null}}]};}
function parse(n:unknown){return parseNodes({farmId:'FARM001',asOf:now,nodes:[n]});}
test('binary false, zero and missing/fault are distinct',()=>{
 const n=node();assert.equal(parse(n).nodes[0].channels[0].latest!.value,false);
 n.channels[0].metric='FLOW_RATE';n.channels[0].unit='L/min';n.channels[0].latest!.value=0;assert.equal(parse(n).nodes[0].channels[0].latest!.value,0);
 n.channels[0].latest!.quality='SENSOR_FAULT';n.channels[0].latest!.value=null;assert.equal(parse(n).nodes[0].channels[0].latest!.value,null);
 n.channels[0].latest=null;assert.equal(parse(n).nodes[0].channels[0].latest,null);
});
test('parser rejects mismatched metric/unit/node/version and malformed readings',()=>{
 for(const mutate of [(n:any)=>n.telemetryVersion=1,(n:any)=>n.channels[0].unit='%',(n:any)=>n.channels[0].latest.value=0,(n:any)=>n.channels[0].latest.quality='UNKNOWN',(n:any)=>n.channels.push(n.channels[0]),(n:any)=>n.channels[0].metric='__proto__']){
  const n=node();mutate(n);assert.throws(()=>parse(n));
 }
});
test('freshness requires source and receipt and expires using backend clock',()=>{
 const r=node().channels[0].latest!,t=Date.parse(now);assert.equal(channelFreshness(r,t),'FRESH');
 assert.equal(channelFreshness(r,t+30000),'STALE');assert.equal(channelFreshness(r,t-2001),'CLOCK_SKEW');
 r.receivedAt=new Date(t-30000).toISOString();assert.equal(channelFreshness(r,t),'STALE');
 r.receivedAt=now;r.quality='SENSOR_FAULT';r.value=null;assert.equal(channelFreshness(r,t),'SENSOR_FAULT');assert.equal(channelFreshness(null,t),'EMPTY');
});
test('readback must match whole declaration, not merely same identifier',()=>{
 const n=node(),d={nodeId:n.nodeId,name:n.name,areaId:n.areaId,channels:n.channels.map(({latest,...c})=>c)};
 assert.equal(matchesDeclaration(n,d),true);assert.equal(matchesDeclaration(n,{...d,name:'Other'}),false);assert.equal(matchesDeclaration(n,{...d,channels:[]}),false);
});
