import test from 'node:test';
import assert from 'node:assert/strict';
import {healthAlertTitle,healthRules,parseHealthAlert,parseHealthAlerts,parseHealthSettings,sameHealthEpisode,type HealthAlert} from './healthAlertApi';
import {completenessTone,parseStatistics,uptimeLabel} from '../devices/statisticsApi';

const alert:HealthAlert={id:1,deviceId:'ENV01',type:'STUCK_VALUE',channelId:'SOIL',openedAt:'2026-11-19T01:00:00Z',detail:'VALUE 40.0 UNCHANGED SINCE 2026-11-19T00:30:00Z',clearedAt:null,acknowledgedAt:null,acknowledgementNote:null};

test('health alerts keep channel only for stuck values and never clear before opening',()=>{
  assert.deepEqual(parseHealthAlert(alert),alert);
  assert.throws(()=>parseHealthAlert({...alert,channelId:null}));
  assert.throws(()=>parseHealthAlert({...alert,type:'DEVICE_OFFLINE'}),'offline episodes carry no channel');
  assert.doesNotThrow(()=>parseHealthAlert({...alert,type:'PUMP_NO_FLOW',channelId:null}));
  assert.throws(()=>parseHealthAlert({...alert,clearedAt:'2026-11-19T00:59:59Z'}));
  assert.throws(()=>parseHealthAlert({...alert,acknowledgementNote:'x'}),'a note needs an acknowledgement');
  assert.throws(()=>parseHealthAlert({...alert,type:'BATTERY_LOW'}));
  assert.throws(()=>parseHealthAlerts([alert,alert]),'duplicate IDs');
  assert.match(healthAlertTitle(alert),/độ ẩm đất/);
  assert.equal(sameHealthEpisode(alert,{...alert,acknowledgedAt:'2026-11-19T01:01:00Z',acknowledgementNote:'ok'}),true);
  assert.equal(sameHealthEpisode(alert,{...alert,openedAt:'2026-11-19T01:00:01Z'}),false);
});

test('rules text follows the server settings and says when pump flow checking is off',()=>{
  const settings=parseHealthSettings({offlineSeconds:60,stuckMinutes:0,flowNode:null,flowChannel:null,minimumFlow:0.5,flowGraceSeconds:20,pumpObserved:true});
  const rules=healthRules(settings);
  assert.match(rules[0],/60 giây/);assert.match(rules[1],/đang tắt/);assert.match(rules[2],/đang tắt/);
  const on=healthRules({...settings,stuckMinutes:30,flowNode:'WATER01',flowChannel:'FLOW'});
  assert.match(on[1],/30 phút/);assert.match(on[2],/WATER01\/FLOW/);assert.match(on[2],/không tự tắt bơm/);
  assert.throws(()=>parseHealthSettings({...settings,flowNode:'WATER01'}),'node and channel come together');
  assert.throws(()=>parseHealthSettings({...settings,stuckMinutes:3}));
});

test('statistics reject impossible values and label uptime and completeness',()=>{
  const report={from:'2026-11-19T00:00:00Z',to:'2026-11-19T01:00:00Z',hours:1,cadenceSeconds:5,gapSeconds:15,spikeTemperature:5,spikeSoilMoisture:20,devices:[
    {deviceId:'ENV01',nodeType:'ENVIRONMENT',samples:706,expectedSamples:720,completeness:0.98,gaps:1,maxGapSeconds:60,reboots:1,spikes:2,latestUptimeMs:3595000},
    {deviceId:'WATER01',nodeType:'WATER',samples:0,expectedSamples:720,completeness:0,gaps:0,maxGapSeconds:0,reboots:0,spikes:null,latestUptimeMs:null}]};
  assert.equal(parseStatistics(report).devices.length,2);
  assert.throws(()=>parseStatistics({...report,devices:[{...report.devices[0],completeness:1.2}]}));
  assert.throws(()=>parseStatistics({...report,devices:[{...report.devices[1],spikes:0}]}),'water nodes have no jump statistic');
  assert.throws(()=>parseStatistics({...report,devices:[{...report.devices[1],latestUptimeMs:5}]}),'no uptime without samples');
  assert.throws(()=>parseStatistics({...report,hours:48}));
  assert.equal(uptimeLabel(3595000),'59 phút');assert.equal(uptimeLabel(90061000),'1 ngày 1 giờ');assert.equal(uptimeLabel(null),'—');
  assert.deepEqual([completenessTone(0.95),completenessTone(0.6),completenessTone(0.2)],['good','warn','bad']);
});
