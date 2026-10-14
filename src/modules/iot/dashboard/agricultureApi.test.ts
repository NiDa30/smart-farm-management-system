import test from 'node:test';
import assert from 'node:assert/strict';
import {nodeSummary,parseAgriculture} from './agricultureApi';
import type {FarmNode} from '../nodes/nodeApi';
const now=Date.parse('2026-10-15T01:00:00Z'),at=new Date(now).toISOString();
const node:FarmNode={nodeId:'SOIL01',name:'Đất',areaId:'AREA001',nodeType:'SOIL',telemetryVersion:2,actuators:[],channels:[{channelId:'SOIL1',metric:'SOIL_MOISTURE',unit:'%',calibrationVersion:null,latest:{value:0,quality:'VALID',observedAt:at,receivedAt:at,bootId:'47000000-0000-4000-8000-000000000001',sequence:1,calibrationVersion:null,dataSource:'SIMULATOR'}}]};
test('zero is fresh; one missing or fault channel prevents complete-node freshness',()=>{
 assert.deepEqual(nodeSummary(node,now),{fresh:1,total:1,complete:true});
 const partial={...node,channels:[...node.channels,{...node.channels[0],channelId:'SOIL2',latest:null}]};assert.deepEqual(nodeSummary(partial,now),{fresh:1,total:2,complete:false});
 partial.channels[1].latest={...node.channels[0].latest!,quality:'SENSOR_FAULT',value:null};assert.equal(nodeSummary(partial,now).complete,false);
});
test('both observed and received timestamps must be fresh, with bounded future skew',()=>{
 assert.equal(nodeSummary(node,now+30000).fresh,0);
 const copy=structuredClone(node);copy.channels[0].latest!.receivedAt=new Date(now-31000).toISOString();assert.equal(nodeSummary(copy,now).fresh,0);
 copy.channels[0].latest!.receivedAt=new Date(now+3000).toISOString();assert.equal(nodeSummary(copy,now).fresh,0);
});
test('agriculture validates its clock and totals independently of preview and preserves absent sources',()=>{
 const value={inventory:{farmId:'FARM001',asOf:at,nodes:[node]},zones:{farmId:'FARM001',asOf:at,zones:[]},waterActiveCount:0,soilActiveCount:105,recentChannelAlerts:[]};
 assert.equal(parseAgriculture(value).soilActiveCount,105);
 assert.throws(()=>parseAgriculture({...value,zones:{...value.zones,asOf:new Date(now+1).toISOString()}}));
 assert.throws(()=>parseAgriculture({...value,soilActiveCount:Number.MAX_SAFE_INTEGER,waterActiveCount:1}));
});
