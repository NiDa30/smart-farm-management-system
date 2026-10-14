import { currentDataState, parseMonitoring, type Monitoring, type MonitoredDevice } from '../devices/monitoringApi';
import { type IoTEvent, parseEventPage } from '../events/eventApi';
export interface Overview {
  monitoring:Monitoring;areas:{id:string;name:string}[];activeAlertCount:number;
  recentActiveAlerts:{id:number;deviceId:string;type:'LOW_SOIL'|'HIGH_TEMPERATURE';openedAt:string;openedValue:number;clearedAt:null;clearedValue:null}[];
  rule:{enabled:boolean;lowCount:number;activeCommand:string|null;cooldownUntil:string|null;lastResult:string};recentEvents:IoTEvent[];
}
export function parseOverview(value:unknown):Overview {
  const v=value as Overview;
  if(!v)throw new Error('Invalid overview');
  const monitoring=parseMonitoring(v.monitoring);
  if(!Array.isArray(v.areas)||!v.areas.every(a=>a&&typeof a.id==='string'&&typeof a.name==='string')
    ||new Set(v.areas.map(a=>a.id)).size!==v.areas.length||!Number.isSafeInteger(v.activeAlertCount)||v.activeAlertCount<0
    ||!Array.isArray(v.recentActiveAlerts)||v.recentActiveAlerts.length>5||!v.recentActiveAlerts.every(a=>a&&Number.isSafeInteger(a.id)&&typeof a.deviceId==='string'&&['LOW_SOIL','HIGH_TEMPERATURE'].includes(a.type)&&typeof a.openedAt==='string'&&Number.isFinite(Date.parse(a.openedAt))&&typeof a.openedValue==='number'&&Number.isFinite(a.openedValue)&&a.clearedAt===null&&a.clearedValue===null)
    ||v.activeAlertCount<v.recentActiveAlerts.length||!v.rule||typeof v.rule.enabled!=='boolean'||!Number.isInteger(v.rule.lowCount)||v.rule.lowCount<0||v.rule.lowCount>2||typeof v.rule.lastResult!=='string'
    ||!(v.rule.activeCommand===null||typeof v.rule.activeCommand==='string')||!(v.rule.cooldownUntil===null||typeof v.rule.cooldownUntil==='string'&&Number.isFinite(Date.parse(v.rule.cooldownUntil))))throw new Error('Invalid overview');
  parseEventPage({items:v.recentEvents,nextCursor:null,from:new Date(Date.parse(monitoring.asOf)-86400000).toISOString(),to:monitoring.asOf});
  if(v.recentEvents.length>8)throw new Error('Invalid events');
  return v;
}
export function freshAverages(devices:MonitoredDevice[],now:number) {
  const fresh=devices.filter(d=>d.kind==='SENSOR'&&currentDataState(d,now)==='FRESH');
  const average=(field:'temperature'|'humidity'|'soilMoisture')=>{
    const values=fresh.map(d=>d[field]).filter((v):v is number=>v!==null);
    return values.length?values.reduce((sum,v)=>sum+v,0)/values.length:null;
  };
  return {count:fresh.length,temperature:average('temperature'),humidity:average('humidity'),soilMoisture:average('soilMoisture')};
}
