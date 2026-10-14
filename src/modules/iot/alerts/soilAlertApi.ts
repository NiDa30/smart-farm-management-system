import {type ChannelEpisode} from './ChannelAlertCenter';
export interface SoilAlert extends ChannelEpisode {
 type:'DRY_SOIL'|'SENSOR_FAULT';channelId:string;openedValue:number|null;clearedValue:number|null;
}
const id=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0;
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const code=(v:unknown):v is string=>typeof v==='string'&&/^[A-Z][A-Z0-9_-]{1,31}$/.test(v);
const moisture=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
export function parseSoilAlert(value:unknown):SoilAlert {
 const a=value as SoilAlert;
 if(!a||!id(a.id)||!code(a.nodeId)||!code(a.channelId)||!['DRY_SOIL','SENSOR_FAULT'].includes(a.type)
  ||!['SIMULATOR','PHYSICAL','UNSPECIFIED'].includes(a.dataSource)||!id(a.openedSampleId)||!date(a.openedAt)||!date(a.openedReceivedAt)
  ||!(a.clearedSampleId===null||id(a.clearedSampleId))||!(a.clearedAt===null||date(a.clearedAt))||!(a.clearedReceivedAt===null||date(a.clearedReceivedAt))
  ||(a.clearedSampleId===null)!==(a.clearedAt===null)||(a.clearedAt===null)!==(a.clearedReceivedAt===null)
  ||a.clearedAt!==null&&Date.parse(a.clearedAt)<Date.parse(a.openedAt)
  ||(a.type==='SENSOR_FAULT'?a.openedValue!==null:!moisture(a.openedValue)||a.openedValue>=30)
  ||(a.clearedAt===null?a.clearedValue!==null:!moisture(a.clearedValue)||a.type==='DRY_SOIL'&&a.clearedValue<35)
  ||!(a.acknowledgedAt===null||date(a.acknowledgedAt))
  ||!(a.acknowledgementNote===null||typeof a.acknowledgementNote==='string'&&a.acknowledgementNote.length<=500)
  ||a.acknowledgedAt===null&&a.acknowledgementNote!==null)throw new Error('Phản hồi cảnh báo đất không hợp lệ.');
 return a;
}
export function parseSoilAlerts(value:unknown):SoilAlert[]{
 if(!Array.isArray(value)||value.length>100)throw new Error('Danh sách cảnh báo đất không hợp lệ.');
 const alerts=value.map(parseSoilAlert);if(new Set(alerts.map(a=>a.id)).size!==alerts.length)throw new Error('Cảnh báo đất trùng mã.');return alerts;
}
export const soilAlertTitle=(a:SoilAlert)=>`${a.nodeId} · ${a.channelId} · ${a.type==='DRY_SOIL'?'Đất khô':'Lỗi cảm biến đất'}`;
export const soilSourceLabel=(a:SoilAlert)=>a.dataSource==='SIMULATOR'?'Mô phỏng (thiết bị khai báo)':a.dataSource==='PHYSICAL'?'Vật lý (thiết bị khai báo)':'Chưa khai báo nguồn';
export const sameSoilEpisode=(a:SoilAlert,b:SoilAlert)=>a.id===b.id&&a.nodeId===b.nodeId&&a.channelId===b.channelId&&a.type===b.type&&a.dataSource===b.dataSource
 &&a.openedSampleId===b.openedSampleId&&a.openedAt===b.openedAt&&a.openedReceivedAt===b.openedReceivedAt&&a.openedValue===b.openedValue;
