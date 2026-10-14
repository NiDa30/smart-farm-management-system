import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseWaterHistory,waterHistoryCsv,historyUrl,type HistoryPage,type HistoryQuery} from './waterHistoryApi';
import type {NodeChannel} from './nodeApi';
const channel:NodeChannel={channelId:'FLOW',metric:'FLOW_RATE',unit:'L/min',calibrationVersion:null,latest:null};
const query:HistoryQuery={from:'2026-10-14T00:00:00Z',to:'2026-10-14T01:00:00Z',dataSource:null,quality:null,limit:100,cursor:null};
const row=(sampleId=1)=>({sampleId,value:0,quality:'VALID' as const,observedAt:'2026-10-14T00:01:00.000001Z',receivedAt:'2026-10-14T00:01:00.01Z',bootId:'37000000-0000-4000-8000-000000000001',sequence:sampleId,calibrationVersion:null,dataSource:'SIMULATOR' as const});
const page=():HistoryPage=>({nodeId:'WATER01',channel:{channelId:'FLOW',metric:'FLOW_RATE',unit:'L/min',calibrationVersion:null},from:query.from,to:query.to,dataSource:null,quality:null,snapshotId:10,items:[row()],nextCursor:null});
test('keeps raw zero, false, fault/null and per-reading source',()=>{
 assert.equal(parseWaterHistory(page(),'WATER01',channel,query).items[0].value,0);
 const fault={...page(),items:[{...row(),quality:'SENSOR_FAULT' as const,value:null}]};assert.equal(parseWaterHistory(fault,'WATER01',channel,query).items[0].value,null);
 const low:NodeChannel={...channel,channelId:'LOW',metric:'WATER_PRESENT',unit:'boolean'};
 assert.equal(parseWaterHistory({...page(),channel:low,items:[{...row(),value:false}]},'WATER01',low,query).items[0].value,false);
});
test('orders microseconds correctly even when receipt IDs are out of order',()=>{
 const p=page();p.items=[{...row(1),observedAt:'2026-10-14T00:01:00.000002Z'},row(2)];assert.doesNotThrow(()=>parseWaterHistory(p,'WATER01',channel,query));
 p.items.reverse();assert.throws(()=>parseWaterHistory(p,'WATER01',channel,query));
});
test('rejects scope mismatch, duplicate ID, invalid quality values and invalid cursors',()=>{
 for(const bad of [{...page(),nodeId:'WATER02'},{...page(),dataSource:'SIMULATOR'},
  {...page(),items:[row(),row()]},{...page(),items:[{...row(),quality:'SENSOR_FAULT',value:0}]},
  {...page(),items:[{...row(),dataSource:'REAL'}]},{...page(),nextCursor:'bad!'},
  {...page(),items:[{...row(),observedAt:query.to}]}])assert.throws(()=>parseWaterHistory(bad,'WATER01',channel,query));
});
test('checks filter membership, ID cap and cursor progression',()=>{
 assert.throws(()=>parseWaterHistory({...page(),dataSource:'PHYSICAL'},'WATER01',channel,{...query,dataSource:'PHYSICAL'}));
 assert.throws(()=>parseWaterHistory({...page(),snapshotId:0},'WATER01',channel,query));
 assert.throws(()=>parseWaterHistory({...page(),nextCursor:'NEXT'},'WATER01',channel,{...query,limit:1,cursor:'NEXT'}));
});
test('CSV keeps raw timestamps, zero and null; escapes formula text without changing negative numbers',()=>{
 const p=page();p.items=[{...row(),calibrationVersion:'=1+1'}, {...row(2),quality:'SENSOR_FAULT',value:null}];
 const csv=waterHistoryCsv(p);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\'=1+1"'));assert.ok(csv.includes('00:01:00.000001Z'));assert.ok(csv.includes(',0,'));assert.ok(csv.includes('"SENSOR_FAULT",""'));
 const temperature={...p,channel:{...p.channel,metric:'WATER_TEMPERATURE' as const,unit:'°C'},items:[{...row(),value:-2.5}]};assert.ok(waterHistoryCsv(temperature).includes(',-2.5,'));
 assert.equal(csv.split('\r\n').length,4);
});
test('URL encodes query scope and passes pagination unchanged',()=>{
 const url=new URL(historyUrl('WATER01','FLOW',{...query,dataSource:'SIMULATOR',quality:'VALID',cursor:'NEXT'}),'http://local');
 assert.equal(url.pathname,'/api/v1/nodes/WATER01/channels/FLOW/history');assert.equal(url.searchParams.get('dataSource'),'SIMULATOR');assert.equal(url.searchParams.get('cursor'),'NEXT');
});
