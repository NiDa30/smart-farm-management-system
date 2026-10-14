import test from 'node:test';
import assert from 'node:assert/strict';
import { freshAverages } from './overviewApi';
import type { MonitoredDevice } from '../devices/monitoringApi';
const now=Date.parse('2026-10-14T01:00:00Z');
const sensor:MonitoredDevice={deviceId:'ENV01',name:'Sensor',kind:'SENSOR',areaId:'AREA001',areaName:'Khu A',observedAt:new Date(now).toISOString(),receivedAt:new Date(now).toISOString(),lastMessageAt:new Date(now).toISOString(),dataState:'FRESH',activity:'RECENT',temperature:25,humidity:50,soilMoisture:28,reportedState:null,safetyLockout:null,activeAlerts:0};
test('average excludes stale data and logical actuator',()=>{
 const stale={...sensor,deviceId:'ENV02',observedAt:new Date(now-60000).toISOString(),temperature:79};
 const pump={...sensor,deviceId:'PUMP01',kind:'ACTUATOR' as const,temperature:80};
 const result=freshAverages([sensor,stale,pump],now);assert.equal(result.count,1);assert.equal(result.temperature,25);assert.equal(result.soilMoisture,28);
});
test('no fresh data returns null rather than a misleading zero',()=>{
 const result=freshAverages([sensor],now+30000);assert.equal(result.count,0);assert.equal(result.temperature,null);assert.equal(result.soilMoisture,null);
});
test('fresh sensors have equal weight in current-value average',()=>{
 const result=freshAverages([sensor,{...sensor,deviceId:'ENV02',temperature:27}],now);assert.equal(result.temperature,26);assert.equal(result.count,2);
});
