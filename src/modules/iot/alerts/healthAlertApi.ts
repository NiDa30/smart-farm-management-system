export type HealthAlertType='DEVICE_OFFLINE'|'STUCK_VALUE'|'PUMP_NO_FLOW';
export interface HealthAlert {
  id:number;deviceId:string;type:HealthAlertType;channelId:string|null;openedAt:string;detail:string;
  clearedAt:string|null;acknowledgedAt:string|null;acknowledgementNote:string|null;
}
export interface HealthSettings {
  offlineSeconds:number;stuckMinutes:number;flowNode:string|null;flowChannel:string|null;
  minimumFlow:number;flowGraceSeconds:number;pumpObserved:boolean;
}
const id=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0;
const date=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const code=(v:unknown):v is string=>typeof v==='string'&&/^[A-Z][A-Z0-9_-]{1,31}$/.test(v);
const TYPES:HealthAlertType[]=['DEVICE_OFFLINE','STUCK_VALUE','PUMP_NO_FLOW'];

export function parseHealthAlert(value:unknown):HealthAlert {
  const a=value as HealthAlert;
  if(!a||!id(a.id)||!code(a.deviceId)||!TYPES.includes(a.type)
    ||(a.type==='STUCK_VALUE'?!code(a.channelId):a.channelId!==null)
    ||!date(a.openedAt)||typeof a.detail!=='string'||a.detail.length<1||a.detail.length>200
    ||!(a.clearedAt===null||date(a.clearedAt))||a.clearedAt!==null&&Date.parse(a.clearedAt)<Date.parse(a.openedAt)
    ||!(a.acknowledgedAt===null||date(a.acknowledgedAt))
    ||!(a.acknowledgementNote===null||typeof a.acknowledgementNote==='string'&&a.acknowledgementNote.length<=500)
    ||a.acknowledgedAt===null&&a.acknowledgementNote!==null)throw new Error('Phản hồi cảnh báo sức khỏe thiết bị không hợp lệ.');
  return a;
}
export function parseHealthAlerts(value:unknown):HealthAlert[] {
  if(!Array.isArray(value)||value.length>100)throw new Error('Danh sách cảnh báo sức khỏe không hợp lệ.');
  const alerts=value.map(parseHealthAlert);
  if(new Set(alerts.map(a=>a.id)).size!==alerts.length)throw new Error('Cảnh báo sức khỏe trùng mã.');
  return alerts;
}
export function parseHealthSettings(value:unknown):HealthSettings {
  const s=value as HealthSettings;
  const int=(v:unknown,min:number,max:number)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
  if(!s||!int(s.offlineSeconds,30,3600)||!(s.stuckMinutes===0||int(s.stuckMinutes,5,1440))
    ||(s.flowNode===null)!==(s.flowChannel===null)||!(s.flowNode===null||code(s.flowNode))||!(s.flowChannel===null||code(s.flowChannel))
    ||typeof s.minimumFlow!=='number'||!(s.minimumFlow>0&&s.minimumFlow<=1000)||!int(s.flowGraceSeconds,5,300)||typeof s.pumpObserved!=='boolean')
    throw new Error('Cấu hình giám sát sức khỏe không hợp lệ.');
  return s;
}
const channelNames:Record<string,string>={AIR_TEMP:'nhiệt độ không khí',AIR_HUMIDITY:'độ ẩm không khí',SOIL:'độ ẩm đất'};
export const healthAlertTitle=(a:HealthAlert)=>`${a.deviceId} · ${a.type==='DEVICE_OFFLINE'?'Mất tín hiệu'
  :a.type==='STUCK_VALUE'?`Giá trị ${channelNames[a.channelId??'']??a.channelId} không đổi`:'Bơm chạy nhưng không có lưu lượng'}`;
export const sameHealthEpisode=(a:HealthAlert,b:HealthAlert)=>a.id===b.id&&a.deviceId===b.deviceId&&a.type===b.type
  &&a.channelId===b.channelId&&a.openedAt===b.openedAt&&a.detail===b.detail;
/** Plain-language rules shown above the list; numbers come from the server's own settings. */
export function healthRules(s:HealthSettings):string[] {
  return [
    `Mất tín hiệu: backend không nhận gói nào từ thiết bị trong ${s.offlineSeconds} giây; hết khi lại nhận gói trong ${Math.floor(s.offlineSeconds/2)} giây gần nhất. Thiết bị chưa từng gửi dữ liệu không bị tính.`,
    s.stuckMinutes===0?'Giá trị không đổi: đang tắt.'
      :`Giá trị không đổi: một kênh nhiệt độ, độ ẩm không khí hoặc độ ẩm đất giữ nguyên đúng một giá trị trong ${s.stuckMinutes} phút, với ít nhất một nửa số mẫu dự kiến. Có thể do cảm biến kẹt, hoặc chưa chỉnh thanh trượt trên Wokwi.`,
    s.flowNode===null||!s.pumpObserved?'Bơm chạy không có lưu lượng: đang tắt (chưa cấu hình kênh lưu lượng gắn với PUMP01, hoặc chưa bật điều khiển).'
      :`Bơm chạy không có lưu lượng: PUMP01 báo ON quá ${s.flowGraceSeconds} giây mà ${s.flowNode}/${s.flowChannel} đo dưới ${s.minimumFlow} L/min. Đây là cảnh báo; backend không tự tắt bơm.`,
  ];
}
