import {parseChannelReading,type ChannelReading} from '../nodes/nodeApi';
export const rainLabels={NOT_CONFIGURED:'Chưa cấu hình chốt mưa',DISABLED:'Chốt mưa đang tắt',CONFIG_CHANGED:'Cấu hình vùng hoặc kênh đã đổi',CHANNEL_UNAVAILABLE:'Kênh mưa không còn phù hợp',MISSING:'Chưa có mẫu mưa',CLOCK_SKEW:'Đồng hồ mẫu không hợp lệ',STALE:'Mẫu mưa đã cũ',SENSOR_FAULT:'Cảm biến mưa báo lỗi',SOURCE_MISMATCH:'Nguồn mẫu không khớp',CALIBRATION_MISMATCH:'Hiệu chuẩn mẫu không khớp',RAIN:'Có mưa · chặn lượt bật mới',DRY:'Không mưa · qua chốt mưa',UNKNOWN:'Chưa xác nhận dữ liệu mới'};
export interface RainRequest {expectedRevision:number;zoneRevision:number;nodeId:string;channelId:string;expectedSource:'SIMULATOR'|'PHYSICAL';calibrationVersion:string|null;enabled:boolean}
export interface RainPolicy extends Omit<RainRequest,'expectedRevision'> {zoneId:string;revision:number}
export interface RainView {zoneId:string;zoneRevision:number;areaId:string;zoneSource:'SIMULATOR'|'PHYSICAL';asOf:string;policy:RainPolicy|null;state:Exclude<keyof typeof rainLabels,'UNKNOWN'>;allowed:boolean;validUntil:string|null;sample:ChannelReading|null}
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const code=(v:unknown)=>typeof v==='string'&&/^[A-Z][A-Z0-9_-]{1,31}$/.test(v);
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
export function parseRainPolicy(v:unknown):RainPolicy{
 if(!object(v)||!code(v.zoneId)||!code(v.nodeId)||!code(v.channelId)||!Number.isSafeInteger(v.revision)||v.revision<1||!Number.isSafeInteger(v.zoneRevision)||v.zoneRevision<1||!['SIMULATOR','PHYSICAL'].includes(v.expectedSource)||typeof v.enabled!=='boolean'||!(v.calibrationVersion===null||typeof v.calibrationVersion==='string'&&v.calibrationVersion.trim().length>0&&v.calibrationVersion.length<=40))throw new Error('Cấu hình chốt mưa không hợp lệ.');return v as RainPolicy;
}
export function parseRainView(v:unknown):RainView{
 if(!object(v)||!code(v.zoneId)||!code(v.areaId)||!Number.isSafeInteger(v.zoneRevision)||v.zoneRevision<1||!['SIMULATOR','PHYSICAL'].includes(v.zoneSource)||!date(v.asOf)||!Object.hasOwn(rainLabels,v.state)||v.state==='UNKNOWN'||typeof v.allowed!=='boolean')throw new Error('Phản hồi chốt mưa không hợp lệ.');
 const p=v.policy===null?null:parseRainPolicy(v.policy),s=v.sample===null?null:parseChannelReading(v.sample,'RAIN_DETECTED');
 if(p&&p.zoneId!==v.zoneId||s&&s.dataSource===undefined||v.allowed!==['NOT_CONFIGURED','DISABLED','DRY'].includes(v.state)||v.state==='NOT_CONFIGURED'&&p!==null||v.state==='DISABLED'&&(!p||p.enabled)||!['NOT_CONFIGURED','DISABLED'].includes(v.state)&&!p?.enabled)throw new Error('Trạng thái chốt mưa không nhất quán.');
 if(['RAIN','DRY'].includes(v.state)){
  if(!p||!s||!date(v.validUntil)||s.quality!=='VALID'||s.value!==(v.state==='RAIN')||p.zoneRevision!==v.zoneRevision||p.expectedSource!==v.zoneSource||s.dataSource!==p.expectedSource||s.calibrationVersion!==p.calibrationVersion)throw new Error('Mẫu mưa không khớp cấu hình.');
  const at=Date.parse(v.asOf),a=Date.parse(s.observedAt),b=Date.parse(s.receivedAt);if(a>at+2000||b>at+2000||Math.min(a,b)+30000<=at||Math.abs(Date.parse(v.validUntil)-(Math.min(a,b)+30000))>1)throw new Error('Mẫu mưa chưa đủ mới.');
 }else if(v.validUntil!==null)throw new Error('Không được suy diễn thời hạn mẫu mưa.');
 return v as RainView;
}
export function rainState(v:RainView,now:number,unavailable:boolean):keyof typeof rainLabels {if(unavailable)return 'UNKNOWN';return v.validUntil&&now>=Date.parse(v.validUntil)?'STALE':v.state;}
export function rainMatches(p:RainPolicy|null,r:RainRequest,zoneId:string){return !!p&&p.zoneId===zoneId&&p.revision===r.expectedRevision+1&&p.zoneRevision===r.zoneRevision&&p.nodeId===r.nodeId&&p.channelId===r.channelId&&p.expectedSource===r.expectedSource&&p.calibrationVersion===r.calibrationVersion&&p.enabled===r.enabled;}
