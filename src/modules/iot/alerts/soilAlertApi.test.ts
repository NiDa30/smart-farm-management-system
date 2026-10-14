import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseSoilAlert,parseSoilAlerts,sameSoilEpisode,soilAlertTitle,type SoilAlert} from './soilAlertApi';
const alert=():SoilAlert=>({id:1,nodeId:'SOIL01',channelId:'SOIL1',type:'DRY_SOIL',dataSource:'SIMULATOR',openedSampleId:10,openedAt:'2026-10-15T00:00:00Z',openedReceivedAt:'2026-10-15T00:00:01Z',openedValue:0,clearedSampleId:null,clearedAt:null,clearedReceivedAt:null,clearedValue:null,acknowledgedAt:null,acknowledgementNote:null});
test('soil episode preserves real zero, fault/null and valid fault recovery zero',()=>{
 assert.equal(parseSoilAlert(alert()).openedValue,0);assert.match(soilAlertTitle(alert()),/SOIL01.*SOIL1.*Đất khô/);
 const fault={...alert(),type:'SENSOR_FAULT' as const,openedValue:null};assert.equal(parseSoilAlert(fault).openedValue,null);
 assert.equal(parseSoilAlert({...fault,clearedSampleId:11,clearedAt:'2026-10-15T00:00:02Z',clearedReceivedAt:'2026-10-15T00:00:03Z',clearedValue:0}).clearedValue,0);
});
test('malformed evidence, source, thresholds or incomplete clearance are rejected',()=>{
 for(const patch of [{channelId:null},{openedValue:30},{openedValue:'0'},{type:'SENSOR_FAULT',openedValue:0},{dataSource:'MOCK'},{openedSampleId:0},{openedAt:'2026-10-15T00:00:00'},{clearedValue:40},{acknowledgementNote:'without timestamp'},
  {clearedSampleId:11,clearedAt:'2026-10-15T00:00:02Z',clearedReceivedAt:'2026-10-15T00:00:03Z',clearedValue:34.9}])assert.throws(()=>parseSoilAlert({...alert(),...patch}));
});
test('readback compares immutable point/source and opening evidence',()=>{
 const a=alert();assert.ok(sameSoilEpisode(a,{...a,acknowledgedAt:'2026-10-15T00:00:05Z',acknowledgementNote:'Seen'}));
 for(const patch of [{nodeId:'SOIL02'},{channelId:'SOIL2'},{openedValue:20},{dataSource:'PHYSICAL' as const},{openedSampleId:11},{openedAt:'2026-10-15T00:00:01Z'}])assert.equal(sameSoilEpisode(a,{...a,...patch}),false);
});
test('bounded list rejects duplicates and note remains plain untrusted text',()=>{
 assert.throws(()=>parseSoilAlerts([alert(),alert()]));assert.throws(()=>parseSoilAlerts(Array.from({length:101},(_,i)=>({...alert(),id:i+1}))));
 const note='<img src=x onerror=bad()>';assert.equal(parseSoilAlert({...alert(),acknowledgedAt:'2026-10-15T00:00:02Z',acknowledgementNote:note}).acknowledgementNote,note);
});
