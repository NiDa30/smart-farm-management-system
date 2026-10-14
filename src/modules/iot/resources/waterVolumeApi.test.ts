import test from 'node:test';import assert from 'node:assert/strict';
import {parseVolume,volumeUrl,sameVolumeScope,type VolumeQuery} from './waterVolumeApi';
const q:VolumeQuery={nodeId:'WATER01',channelId:'FLOW',from:'2026-01-01T00:00:00Z',to:'2026-01-01T00:01:00Z',dataSource:'SIMULATOR'};
const report=()=>({...q,method:'TRAPEZOID_V1',maxGapSeconds:15,packetCount:2,sourcePacketCount:2,acceptedIntervals:1,excluded:{},coveredSeconds:5,uncoveredSeconds:55,estimatedLitres:0,groups:[{calibrationVersion:null,intervals:1,coveredSeconds:5,estimatedLitres:0}]});
test('measured zero is retained, unknown without intervals requires null',()=>{
 assert.equal(parseVolume(report(),q).estimatedLitres,0);
 const empty={...report(),packetCount:0,sourcePacketCount:0,acceptedIntervals:0,coveredSeconds:0,uncoveredSeconds:60,estimatedLitres:null,groups:[]};assert.equal(parseVolume(empty,q).estimatedLitres,null);assert.throws(()=>parseVolume({...empty,estimatedLitres:0},q));
});
test('coverage, interval arithmetic and calibration identities must agree',()=>{
 assert.throws(()=>parseVolume({...report(),uncoveredSeconds:54},q));assert.throws(()=>parseVolume({...report(),excluded:{MISSING_CHANNEL:1}},q));assert.throws(()=>parseVolume({...report(),packetCount:3,acceptedIntervals:2,coveredSeconds:10,uncoveredSeconds:50,groups:[...report().groups,...report().groups]},q));
});
test('rejects infinities, unknown methods, mismatched source and channel',()=>{
 for(const patch of [{estimatedLitres:Infinity},{method:'SUM_FLOW'},{channelId:'OTHER'},{dataSource:'PHYSICAL'},{packetCount:25001}])assert.throws(()=>parseVolume({...report(),...patch},q));
});
test('query explicitly scopes source, range and channel',()=>{
 const url=new URL(volumeUrl(q),'http://localhost');assert.equal(url.pathname,'/api/v1/nodes/WATER01/channels/FLOW/water-volume');assert.equal(url.searchParams.get('dataSource'),'SIMULATOR');assert.equal(url.searchParams.get('from'),q.from);
});

test('canonical Java timestamps match the same applied scope',()=>{assert.equal(sameVolumeScope({...q,from:"2026-01-01T00:00:00.000Z"},q),true);});
