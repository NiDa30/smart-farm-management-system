export interface SensorAlert {
  id:number;deviceId:string;type:'LOW_SOIL'|'HIGH_TEMPERATURE';openedAt:string;openedValue:number;
  clearedAt:string|null;clearedValue:number|null;acknowledgedAt:string|null;acknowledgementNote:string|null;
}
const date=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function parseAlert(value:unknown):SensorAlert {
  const a=value as SensorAlert;
  if(!a||!Number.isSafeInteger(a.id)||a.id<1||typeof a.deviceId!=='string'||!/^[A-Z][A-Z0-9_-]{1,31}$/.test(a.deviceId)||!['LOW_SOIL','HIGH_TEMPERATURE'].includes(a.type)||!date(a.openedAt)
    ||typeof a.openedValue!=='number'||!Number.isFinite(a.openedValue)
    ||!(a.clearedAt===null||date(a.clearedAt))||!(a.clearedValue===null||typeof a.clearedValue==='number'&&Number.isFinite(a.clearedValue))
    ||(a.clearedAt===null)!==(a.clearedValue===null)
    ||!(a.acknowledgedAt===null||date(a.acknowledgedAt))||!(a.acknowledgementNote===null||typeof a.acknowledgementNote==='string'&&a.acknowledgementNote.length<=500)
    ||a.acknowledgedAt===null&&a.acknowledgementNote!==null)throw new Error('Phản hồi cảnh báo không hợp lệ.');
  return a;
}
export function parseAlerts(value:unknown):SensorAlert[] {
  if(!Array.isArray(value)||value.length>100)throw new Error('Phản hồi cảnh báo không hợp lệ.');
  const alerts=value.map(parseAlert);
  if(new Set(alerts.map(a=>a.id)).size!==alerts.length)throw new Error('Cảnh báo trùng mã.');
  return alerts;
}
export const alertTitle=(alert:SensorAlert)=>`${alert.deviceId} · ${alert.type==='LOW_SOIL'?'Độ ẩm đất thấp':'Nhiệt độ cao'}`;
