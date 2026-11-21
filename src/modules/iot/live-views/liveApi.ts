// Live IoT views built only from device evidence the backend stored: topology, digital twin,
// edge status, energy (ESTIMATED from runtime) and IoT analytics. Unknown stays unknown.
import type { NodesSnapshot } from '../nodes/nodeApi';
import type { Monitoring, MonitoredDevice } from '../devices/monitoringApi';
import type { ActuatorOverview } from '../actuators/actuatorApi';

const obj=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const day=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v);
const count=(v:unknown)=>Number.isInteger(v)&&(v as number)>=0;
const kwh=(v:unknown)=>v===null||(typeof v==='number'&&Number.isFinite(v)&&v>=0);
const TYPES=['PUMP','VALVE','FAN','LIGHT','MIST'];

export interface DayValue {day:string;seconds:number;kilowattHours:number|null}
export interface ActuatorEnergy {actuatorId:string;actuatorType:'PUMP'|'VALVE'|'FAN'|'LIGHT'|'MIST';ratedWatts:number|null;seconds:number;kilowattHours:number|null;days:DayValue[]}
export interface Energy {days:number;from:string;to:string;method:'ESTIMATED_FROM_RUNTIME';actuators:ActuatorEnergy[];totalKilowattHours:number|null;unrated:string[]}
export interface Commands {total:number;executed:number;failed:number;timedOut:number;uncertain:number;errors:Record<string,number>}
export interface Analytics {days:number;from:string;to:string;pump:Commands;actuators:Commands;wateringRuns:number;sequencesCompleted:number;sequencesAborted:number;
 alertsOpened:Record<'SENSOR'|'WATER'|'DEVICE_HEALTH',number>;runtime:ActuatorEnergy[]}

function actuatorEnergy(a:unknown):ActuatorEnergy{
 if(!obj(a)||typeof a.actuatorId!=='string'||!TYPES.includes(a.actuatorType)||(a.ratedWatts!==null&&!(Number.isInteger(a.ratedWatts)&&a.ratedWatts>=1&&a.ratedWatts<=20000))
  ||!count(a.seconds)||!kwh(a.kilowattHours)||(a.ratedWatts===null)!==(a.kilowattHours===null)||!Array.isArray(a.days)
  ||!a.days.every((d:unknown)=>obj(d)&&day(d.day)&&count(d.seconds)&&d.seconds<=86400&&kwh(d.kilowattHours))
  ||a.days.reduce((s:number,d:DayValue)=>s+d.seconds,0)!==a.seconds)throw new Error('Thời gian chạy không hợp lệ.');
 return a as ActuatorEnergy;
}
export function parseEnergy(v:unknown):Energy{
 if(!obj(v)||!count(v.days)||!date(v.from)||!date(v.to)||v.method!=='ESTIMATED_FROM_RUNTIME'||!Array.isArray(v.actuators)||!kwh(v.totalKilowattHours)
  ||!Array.isArray(v.unrated)||!v.unrated.every((u:unknown)=>typeof u==='string'))throw new Error('Dữ liệu điện năng không hợp lệ.');
 const actuators=v.actuators.map(actuatorEnergy);
 const unrated=actuators.filter(a=>a.ratedWatts===null).map(a=>a.actuatorId).sort();
 if(JSON.stringify(unrated)!==JSON.stringify([...v.unrated].sort()))throw new Error('Danh sách thiết bị chưa khai báo công suất không khớp.');
 return {...(v as Energy),actuators};
}
function commands(v:unknown):Commands{
 if(!obj(v)||![v.total,v.executed,v.failed,v.timedOut,v.uncertain].every(count)||v.executed+v.failed+v.timedOut+v.uncertain>v.total
  ||!obj(v.errors)||!Object.values(v.errors).every(count))throw new Error('Thống kê lệnh không hợp lệ.');
 return v as Commands;
}
export function parseAnalytics(v:unknown):Analytics{
 if(!obj(v)||!count(v.days)||!date(v.from)||!date(v.to)||![v.wateringRuns,v.sequencesCompleted,v.sequencesAborted].every(count)
  ||!obj(v.alertsOpened)||!['SENSOR','WATER','DEVICE_HEALTH'].every(k=>count(v.alertsOpened[k]))||!Array.isArray(v.runtime))throw new Error('Phân tích IoT không hợp lệ.');
 return {...(v as Analytics),pump:commands(v.pump),actuators:commands(v.actuators),runtime:v.runtime.map(actuatorEnergy)};
}

export const successRate=(c:Commands)=>c.total===0?null:Math.round(c.executed/c.total*100);
export function hours(seconds:number){
 if(seconds<60)return `${seconds} giây`;
 const h=Math.floor(seconds/3600),m=Math.round(seconds%3600/60);
 return h?`${h} giờ ${m} phút`:`${m} phút`;
}

// ---- topology / twin model (pure, unit-tested) ----
export type Link='CONNECTED'|'SILENT'|'NEVER_SEEN'|'UNKNOWN';
export interface TopoActuator {actuatorId:string;type:string;state:'ON'|'OFF'|'UNKNOWN';locked:boolean|null}
export interface TopoNode {nodeId:string;name:string;nodeType:'ENVIRONMENT'|'WATER';areaId:string;link:Link;lastMessageAt:string|null;channels:{channelId:string;metric:string;value:number|boolean|null;fresh:boolean}[];actuators:TopoActuator[]}
export interface Topology {broker:Monitoring['mqtt']['state'];nodes:TopoNode[]}

const FRESH_MS=30_000;
export function buildTopology(nodes:NodesSnapshot,monitoring:Monitoring|null,actuators:ActuatorOverview|null,now:number):Topology{
 const device=(id:string):MonitoredDevice|undefined=>monitoring?.devices.find(d=>d.deviceId===id);
 return {broker:monitoring?.mqtt.state??'DISABLED',nodes:nodes.nodes.map(n=>{
  const d=device(n.nodeId);
  const latest=n.channels.map(c=>c.latest?Date.parse(c.latest.receivedAt):0).reduce((a,b)=>Math.max(a,b),0);
  const heard=d?.lastMessageAt?Date.parse(d.lastMessageAt):latest||null;
  const link:Link=heard===null||heard===0?(d?'NEVER_SEEN':'UNKNOWN'):now-heard<=FRESH_MS?'CONNECTED':'SILENT';
  return {nodeId:n.nodeId,name:n.name,nodeType:n.nodeType,areaId:n.areaId,link,lastMessageAt:heard?new Date(heard).toISOString():null,
   channels:n.channels.map(c=>({channelId:c.channelId,metric:c.metric,value:c.latest?.value??null,fresh:!!c.latest&&now-Date.parse(c.latest.receivedAt)<=FRESH_MS})),
   actuators:n.actuators.map(a=>{
    if(a.actuatorId==='PUMP01'){const p=device('PUMP01');const fresh=!!p&&p.dataState==='FRESH';
     return {actuatorId:a.actuatorId,type:a.actuatorType,state:fresh&&p?.reportedState?p.reportedState:'UNKNOWN',locked:fresh?p?.safetyLockout??null:null};}
    const v=actuators?.actuators.find(x=>x.actuatorId===a.actuatorId);
    return {actuatorId:a.actuatorId,type:a.actuatorType,state:v&&v.fresh?v.reportedState:'UNKNOWN',locked:v&&v.fresh?v.safetyLockout:null};
   })};
 })};
}
export const linkLabel:Record<Link,string>={CONNECTED:'Đang gửi dữ liệu',SILENT:'Im lặng > 30 giây',NEVER_SEEN:'Chưa từng gửi',UNKNOWN:'Chưa xác định'};
