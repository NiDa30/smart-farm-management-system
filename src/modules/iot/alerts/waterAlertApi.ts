export interface WaterAlert {
  id:number;nodeId:string;type:'LOW_WATER'|'INCONSISTENT_FLOATS'|'SENSOR_FAULT';channelId:string|null;
  dataSource:'SIMULATOR'|'PHYSICAL'|'UNSPECIFIED';openedSampleId:number;openedAt:string;openedReceivedAt:string;
  clearedSampleId:number|null;clearedAt:string|null;clearedReceivedAt:string|null;
  acknowledgedAt:string|null;acknowledgementNote:string|null;
}
const id=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0;
const date=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const code=(v:unknown):v is string=>typeof v==='string'&&/^[A-Z][A-Z0-9_-]{1,31}$/.test(v);
export function parseWaterAlert(value:unknown):WaterAlert {
  const a=value as WaterAlert;
  if(!a||!id(a.id)||!code(a.nodeId)||!['LOW_WATER','INCONSISTENT_FLOATS','SENSOR_FAULT'].includes(a.type)
    ||!['SIMULATOR','PHYSICAL','UNSPECIFIED'].includes(a.dataSource)
    ||(a.type==='SENSOR_FAULT'?!code(a.channelId):a.channelId!==null)
    ||!id(a.openedSampleId)||!date(a.openedAt)||!date(a.openedReceivedAt)
    ||!(a.clearedSampleId===null||id(a.clearedSampleId))||!(a.clearedAt===null||date(a.clearedAt))
    ||!(a.clearedReceivedAt===null||date(a.clearedReceivedAt))
    ||(a.clearedSampleId===null)!==(a.clearedAt===null)||(a.clearedSampleId===null)!==(a.clearedReceivedAt===null)
    ||a.clearedAt!==null&&Date.parse(a.clearedAt)<Date.parse(a.openedAt)
    ||!(a.acknowledgedAt===null||date(a.acknowledgedAt))
    ||!(a.acknowledgementNote===null||typeof a.acknowledgementNote==='string'&&a.acknowledgementNote.length<=500)
    ||a.acknowledgedAt===null&&a.acknowledgementNote!==null)throw new Error('Phản hồi cảnh báo nước không hợp lệ.');
  return a;
}
export function parseWaterAlerts(value:unknown):WaterAlert[]{
  if(!Array.isArray(value)||value.length>100)throw new Error('Danh sách cảnh báo nước không hợp lệ.');
  const alerts=value.map(parseWaterAlert);
  if(new Set(alerts.map(a=>a.id)).size!==alerts.length)throw new Error('Cảnh báo nước trùng mã.');
  return alerts;
}
export const waterAlertTitle=(a:WaterAlert)=>`${a.nodeId} · ${a.type==='LOW_WATER'?'Nước dưới phao LOW':a.type==='INCONSISTENT_FLOATS'?'Hai phao bất nhất':`Lỗi cảm biến ${a.channelId}`}`;
export const waterSourceLabel=(a:WaterAlert)=>a.dataSource==='SIMULATOR'?'Mô phỏng (thiết bị khai báo)':a.dataSource==='PHYSICAL'?'Vật lý (thiết bị khai báo)':'Chưa khai báo nguồn';

export const sameWaterEpisode=(a:WaterAlert,b:WaterAlert)=>a.id===b.id&&a.nodeId===b.nodeId&&a.type===b.type
  &&a.channelId===b.channelId&&a.dataSource===b.dataSource&&a.openedSampleId===b.openedSampleId
  &&a.openedAt===b.openedAt&&a.openedReceivedAt===b.openedReceivedAt;
