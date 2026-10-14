import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseWaterAlert,parseWaterAlerts,sameWaterEpisode,waterAlertTitle,waterSourceLabel,type WaterAlert} from './waterAlertApi';
const alert=():WaterAlert=>({id:1,nodeId:'WATER01',type:'LOW_WATER',channelId:null,dataSource:'SIMULATOR',openedSampleId:10,
  openedAt:'2026-10-14T00:00:00Z',openedReceivedAt:'2026-10-14T00:00:01Z',clearedSampleId:null,clearedAt:null,clearedReceivedAt:null,
  acknowledgedAt:null,acknowledgementNote:null});
test('water episode keeps packet identity and explicitly declared source',()=>{
 assert.equal(parseWaterAlert(alert()).openedSampleId,10);assert.match(waterAlertTitle(alert()),/LOW/);assert.match(waterSourceLabel(alert()),/Mô phỏng/);
 assert.match(waterSourceLabel({...alert(),dataSource:'PHYSICAL'}),/thiết bị khai báo/);
 assert.match(waterAlertTitle({...alert(),type:'SENSOR_FAULT',channelId:'FLOW'}),/FLOW/);
});
test('rejects incomplete restoration, invalid source, channel and acknowledgment',()=>{
 for(const patch of [{dataSource:'REAL'},{openedSampleId:0},{channelId:'LOW'},{type:'SENSOR_FAULT'},
  {clearedSampleId:11},{clearedAt:'bad'},{acknowledgementNote:'unconfirmed'},{openedReceivedAt:null},
  {clearedSampleId:11,clearedAt:'2026-10-13T00:00:00Z',clearedReceivedAt:'2026-10-14T00:00:02Z'}])
  assert.throws(()=>parseWaterAlert({...alert(),...patch}));
});
test('accepts complete clearing and safe note text but bounds collection',()=>{
 const note='<script>example</script>';
 assert.equal(parseWaterAlert({...alert(),acknowledgedAt:'2026-10-14T00:00:02Z',acknowledgementNote:note,
  clearedSampleId:11,clearedAt:'2026-10-14T00:00:03Z',clearedReceivedAt:'2026-10-14T00:00:04Z'}).acknowledgementNote,note);
 assert.throws(()=>parseWaterAlerts([alert(),alert()]));assert.throws(()=>parseWaterAlerts({items:[]}));
 assert.throws(()=>parseWaterAlerts(Array.from({length:101},(_,i)=>({...alert(),id:i+1}))));
});

test('acknowledgement must retain the immutable node, source and opening evidence',()=>{
 assert.ok(sameWaterEpisode(alert(),{...alert(),acknowledgedAt:'2026-10-14T00:00:02Z'}));
 for(const patch of [{nodeId:'WATER02'},{dataSource:'PHYSICAL' as const},{openedSampleId:11},{openedReceivedAt:'2026-10-14T00:00:02Z'}])
  assert.equal(sameWaterEpisode(alert(),{...alert(),...patch}),false);
});
