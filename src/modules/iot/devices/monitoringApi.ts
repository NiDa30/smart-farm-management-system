export interface MonitoredDevice {
  deviceId:string;name:string;kind:'SENSOR'|'ACTUATOR';areaId:string|null;areaName:string|null;
  observedAt:string|null;receivedAt:string|null;lastMessageAt:string|null;dataState:'FRESH'|'STALE'|'EMPTY'|'CLOCK_SKEW';activity:'RECENT'|'SILENT'|'NEVER_SEEN'|'CLOCK_SKEW';
  temperature:number|null;humidity:number|null;soilMoisture:number|null;reportedState:'ON'|'OFF'|null;safetyLockout:boolean|null;activeAlerts:number;
}
export interface Monitoring {
  asOf:string;mqtt:{state:'DISABLED'|'STARTING'|'CONNECTED'|'DISCONNECTED'|'STOPPED';changedAt:string;lastProcessedAt:string|null};devices:MonitoredDevice[];
}
const date=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const nullableDate=(v:unknown)=>v===null||date(v);
const nullableText=(v:unknown)=>v===null||typeof v==='string';
const measurement=(v:unknown,min:number,max:number)=>v===null||typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function parseMonitoring(value:unknown):Monitoring {
  const v=value as Monitoring;
  if(!v||!date(v.asOf)||!v.mqtt||!['DISABLED','STARTING','CONNECTED','DISCONNECTED','STOPPED'].includes(v.mqtt.state)||!date(v.mqtt.changedAt)||!nullableDate(v.mqtt.lastProcessedAt)||!Array.isArray(v.devices)
    ||!v.devices.every(d=>d&&typeof d.deviceId==='string'&&/^[A-Z][A-Z0-9_-]{1,31}$/.test(d.deviceId)&&typeof d.name==='string'&&['SENSOR','ACTUATOR'].includes(d.kind)
      &&nullableText(d.areaId)&&nullableText(d.areaName)&&nullableDate(d.observedAt)&&nullableDate(d.receivedAt)&&nullableDate(d.lastMessageAt)
      &&['FRESH','STALE','EMPTY','CLOCK_SKEW'].includes(d.dataState)&&['RECENT','SILENT','NEVER_SEEN','CLOCK_SKEW'].includes(d.activity)
      &&measurement(d.temperature,-40,80)&&measurement(d.humidity,0,100)&&measurement(d.soilMoisture,0,100)
      &&(d.reportedState===null||['ON','OFF'].includes(d.reportedState))&&(d.safetyLockout===null||typeof d.safetyLockout==='boolean')&&Number.isSafeInteger(d.activeAlerts)&&d.activeAlerts>=0)
    ||new Set(v.devices.map(d=>d.deviceId)).size!==v.devices.length)throw new Error('Phản hồi giám sát không hợp lệ.');
  return v;
}
// Server time + elapsed time avoids depending on the viewer's wall clock.
export function currentDataState(device:MonitoredDevice,serverNow:number):MonitoredDevice['dataState'] {
  if(device.observedAt===null||device.receivedAt===null)return 'EMPTY';
  if(Date.parse(device.observedAt)>serverNow+2000||Date.parse(device.receivedAt)>serverNow+2000)return 'CLOCK_SKEW';
  const window=(device.kind==='SENSOR'?30:15)*1000;
  return serverNow-Date.parse(device.observedAt)<window&&serverNow-Date.parse(device.receivedAt)<window?'FRESH':'STALE';
}
