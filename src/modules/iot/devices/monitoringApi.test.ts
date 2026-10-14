import test from 'node:test';
import assert from 'node:assert/strict';
import { currentDataState,parseMonitoring,type MonitoredDevice } from './monitoringApi';
const now=Date.parse('2026-10-14T01:00:00Z');
const device:MonitoredDevice={deviceId:'ENV01',name:'Sensor',kind:'SENSOR',areaId:'AREA001',areaName:'Khu A',observedAt:new Date(now-20000).toISOString(),receivedAt:new Date(now).toISOString(),lastMessageAt:new Date(now).toISOString(),dataState:'FRESH',activity:'RECENT',temperature:25,humidity:50,soilMoisture:28,reportedState:null,safetyLockout:null,activeAlerts:0};
test('sensor and relay use separate freshness windows based on server time',()=>{
 assert.equal(currentDataState(device,now),'FRESH');
 assert.equal(currentDataState({...device,kind:'ACTUATOR'},now),'STALE');
 assert.equal(currentDataState(device,now+10000),'STALE');
});
test('future or missing times cannot imply fresh data',()=>{
 assert.equal(currentDataState({...device,observedAt:new Date(now+3000).toISOString()},now),'CLOCK_SKEW');
 assert.equal(currentDataState({...device,observedAt:null,receivedAt:null},now),'EMPTY');
});
test('invalid measurements and duplicate identities are rejected',()=>{
 const value={asOf:new Date(now).toISOString(),mqtt:{state:'DISABLED',changedAt:new Date(now).toISOString(),lastProcessedAt:null},devices:[device]};
 assert.equal(parseMonitoring(value).devices.length,1);
 assert.throws(()=>parseMonitoring({...value,devices:[device,device]}));
 assert.throws(()=>parseMonitoring({...value,devices:[{...device,temperature:Infinity}]}));
});
