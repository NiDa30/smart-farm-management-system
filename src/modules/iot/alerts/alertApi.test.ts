import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseAlert,parseAlerts,type SensorAlert} from './alertApi';
import {parseEventPage} from '../events/eventApi';
const alert=():SensorAlert=>({id:1,deviceId:'ENV01',type:'LOW_SOIL',openedAt:'2026-10-14T12:00:00Z',openedValue:28,clearedAt:null,clearedValue:null,acknowledgedAt:null,acknowledgementNote:null});
test('acknowledged is independent of cleared condition',()=>{
 const value={...alert(),acknowledgedAt:'2026-10-14T12:01:00Z',acknowledgementNote:'Checked'};
 assert.equal(parseAlert(value).clearedAt,null);assert.equal(parseAlerts([value]).length,1);
});
test('rejects duplicate, mismatched clear metadata and acknowledgement without time',()=>{
 assert.throws(()=>parseAlerts([alert(),alert()]));
 assert.throws(()=>parseAlert({...alert(),clearedValue:40}));
 assert.throws(()=>parseAlert({...alert(),acknowledgementNote:'Fake saved note'}));
 assert.throws(()=>parseAlert({...alert(),acknowledgedAt:'bad-date'}));
});
test('alert acknowledgement event has backend time and no device command correlation',()=>{
 const page=parseEventPage({from:'2026-10-14T12:00:00Z',to:'2026-10-14T13:00:00Z',nextCursor:null,items:[{id:'alert-seen:1',eventAt:'2026-10-14T12:01:00Z',sourceAt:null,recordedAt:'2026-10-14T12:01:00Z',category:'ALERT',type:'ALERT_ACKNOWLEDGED',deviceId:'ENV01',action:null,state:'ACKNOWLEDGED',reason:'LOW_SOIL',value:null,commandId:null,runId:null}]});
 assert.equal(page.items[0].type,'ALERT_ACKNOWLEDGED');assert.equal(page.items[0].sourceAt,null);
});
