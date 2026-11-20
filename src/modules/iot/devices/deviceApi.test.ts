import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseConfig,parseOta,settingsError,errorLabel,type Settings} from './deviceApi';
const now='2026-11-20T01:00:00Z';
const s:Settings={telemetrySeconds:8,heartbeatSeconds:15,soilWetAdc:900,soilDryAdc:3100,pumpMaxSeconds:600};
const device={revision:5,settings:s,firmwareVersion:'1.3.0',partition:'app0',otaTrial:false,observedAt:now};
const request=(extra={})=>({configId:'5b0d8a52-4b7e-4f4c-9d33-2a6c1e0f9b11',revision:5,settings:s,issuedAt:now,state:'APPLIED',errorCode:null,appliedRevision:5,...extra});
const release={version:'1.4.0',size:807409,sha256:'d41d438c379110c7f7b2c561b1f04f26c1b4549110791f8e022f48974280c13e',signature:'MEUC'.padEnd(96,'A'),url:'https://fw.s3.amazonaws.com/a.bin',createdAt:now};
const job=(extra={})=>({otaId:'0a7f3b2e-58c1-4d1e-a0f4-6b9e2d7c4a35',version:'1.4.0',fromVersion:'1.3.0',issuedAt:now,state:'DOWNLOADING',progress:50,errorCode:null,updatedAt:now,...extra});

test('settings bounds match the firmware',()=>{
 assert.equal(settingsError(s),null);
 for(const bad of [{telemetrySeconds:11},{telemetrySeconds:4},{heartbeatSeconds:21},{soilDryAdc:1000},{soilWetAdc:-1},{pumpMaxSeconds:3601},{pumpMaxSeconds:1.5}])
  assert.notEqual(settingsError({...s,...bad}),null,JSON.stringify(bad));
});
test('config view rejects inconsistent device data',()=>{
 assert.equal(parseConfig({enabled:true,device,requests:[request()]}).device?.revision,5);
 assert.equal(parseConfig({enabled:true,device:null,requests:[]}).device,null);
 assert.throws(()=>parseConfig({enabled:true,device:{...device,settings:{...s,telemetrySeconds:60}},requests:[]}));
 assert.throws(()=>parseConfig({enabled:true,device:{...device,settings:{...s,extra:1}},requests:[]}));
 assert.throws(()=>parseConfig({enabled:true,device,requests:[request({state:'REJECTED',errorCode:null})]}));
 assert.throws(()=>parseConfig({enabled:true,device,requests:[request({state:'DONE'})]}));
});
test('ota view: valid releases, at most one active job',()=>{
 assert.equal(parseOta({enabled:true,signingKeyConfigured:true,runningVersion:'1.3.0',releases:[release],jobs:[job()]}).jobs.length,1);
 assert.throws(()=>parseOta({enabled:true,signingKeyConfigured:true,runningVersion:null,releases:[{...release,url:'http://x'}],jobs:[]}));
 assert.throws(()=>parseOta({enabled:true,signingKeyConfigured:true,runningVersion:null,releases:[{...release,sha256:'X'.repeat(64)}],jobs:[]}));
 assert.throws(()=>parseOta({enabled:true,signingKeyConfigured:true,runningVersion:null,releases:[],jobs:[job(),job({otaId:'1a7f3b2e-58c1-4d1e-a0f4-6b9e2d7c4a35',state:'SENT'})]}));
 assert.throws(()=>parseOta({enabled:true,signingKeyConfigured:true,runningVersion:null,releases:[],jobs:[job({progress:101})]}));
 assert.equal(errorLabel('BAD_SIGNATURE'),' (sai chữ ký)');
});
