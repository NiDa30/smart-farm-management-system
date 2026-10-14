import {parseChannelReading,type ChannelReading} from '../nodes/nodeApi';
export interface ZoneConfig {zoneId:string;name:string;areaId:string;soilNodeId:string;channelIds:string[];expectedSource:'SIMULATOR'|'PHYSICAL';dryThreshold:number;wetThreshold:number;revision:number}
export interface ZonePoint {channelId:string;state:'MISSING'|'CLOCK_SKEW'|'STALE'|'SENSOR_FAULT'|'SOURCE_MISMATCH'|'FRESH';latest:ChannelReading|null}
export interface ZoneView {config:ZoneConfig;asOf:string;points:ZonePoint[];assessment:{state:'UNAVAILABLE'|'INCOHERENT'|'DRY'|'WET'|'MIXED';dryCount:number|null;wetCount:number|null;validUntil:string|null}}
export interface ZoneSnapshot {farmId:'FARM001';asOf:string;zones:ZoneView[]}
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const code=(v:unknown)=>typeof v==='string'&&/^[A-Z][A-Z0-9_-]{1,31}$/.test(v);
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
export function validZone(c:unknown):c is ZoneConfig {
 if(!object(c))return false;
 return code(c.zoneId)&&typeof c.name==='string'&&!!c.name.trim()&&c.name.length<=80&&code(c.areaId)&&code(c.soilNodeId)
  &&Array.isArray(c.channelIds)&&c.channelIds.length===3&&c.channelIds.every(code)&&new Set(c.channelIds).size===3
  &&['SIMULATOR','PHYSICAL'].includes(c.expectedSource)&&Number.isInteger(c.dryThreshold)&&c.dryThreshold>=0&&c.dryThreshold<=95
  &&Number.isInteger(c.wetThreshold)&&c.wetThreshold>=c.dryThreshold+5&&c.wetThreshold<=100&&Number.isInteger(c.revision)&&c.revision>=1&&c.revision<=2147483647;
}
export function parseZone(value:unknown):ZoneView {
 const v=value as ZoneView;
 if(!v||!validZone(v.config)||!date(v.asOf)||!Array.isArray(v.points)||v.points.length!==3||!object(v.assessment))throw new Error('Phản hồi vùng tưới không hợp lệ.');
 const c=v.config,a=v.assessment;
 for(let i=0;i<3;i++){
  const p=v.points[i];if(!p||p.channelId!==c.channelIds[i]||!['MISSING','CLOCK_SKEW','STALE','SENSOR_FAULT','SOURCE_MISMATCH','FRESH'].includes(p.state))throw new Error('Kênh vùng không khớp.');
  if(p.latest!==null)parseChannelReading(p.latest,'SOIL_MOISTURE');
  if((p.state==='MISSING')!==(p.latest===null))throw new Error('Thiếu dữ liệu kênh.');
  if(p.state==='FRESH'&&(!p.latest||p.latest.quality!=='VALID'||p.latest.dataSource!==c.expectedSource))throw new Error('Chưa đủ dữ liệu đúng nguồn.');
 }
 const allFresh=v.points.every(p=>p.state==='FRESH');
 const first=v.points[0].latest;
 const coherent=allFresh&&v.points.every(p=>p.latest!.bootId===first!.bootId&&p.latest!.sequence===first!.sequence&&p.latest!.observedAt===first!.observedAt&&p.latest!.receivedAt===first!.receivedAt);
 if(a.state==='UNAVAILABLE'||a.state==='INCOHERENT'){
  if(a.dryCount!==null||a.wetCount!==null||a.validUntil!==null||a.state==='UNAVAILABLE'&&allFresh||a.state==='INCOHERENT'&&(!allFresh||coherent))throw new Error('Đánh giá vùng không khớp dữ liệu.');
 }else{
  const dry=v.points.filter(p=>typeof p.latest?.value==='number'&&p.latest.value<c.dryThreshold).length,wet=v.points.filter(p=>typeof p.latest?.value==='number'&&p.latest.value>=c.wetThreshold).length;
  if(!coherent||a.dryCount!==dry||a.wetCount!==wet||a.state!==(dry>=2?'DRY':wet>=2?'WET':'MIXED')||!date(a.validUntil)
   ||Date.parse(a.validUntil)<Date.parse(v.asOf)||Date.parse(a.validUntil)>Date.parse(v.asOf)+30000
   ||v.points.some(p=>Math.min(Date.parse(p.latest!.observedAt),Date.parse(p.latest!.receivedAt))+30000<Date.parse(a.validUntil!)))throw new Error('Đánh giá độ ẩm không khớp ba điểm.');
 }
 return v;
}
export function parseZones(value:unknown):ZoneSnapshot {
 if(!object(value)||value.farmId!=='FARM001'||!date(value.asOf)||!Array.isArray(value.zones))throw new Error('Danh sách vùng không hợp lệ.');
 const zones=value.zones.map(parseZone);if(zones.some(z=>z.asOf!==value.asOf)||new Set(zones.map(z=>z.config.zoneId)).size!==zones.length)throw new Error('Mốc dữ liệu hoặc mã vùng không khớp.');
 const bindings=zones.flatMap(z=>z.config.channelIds.map(id=>`${z.config.soilNodeId}/${id}`));if(new Set(bindings).size!==bindings.length)throw new Error('Kênh được gán trùng vùng.');
 return {...value,zones} as ZoneSnapshot;
}
export function sameZone(a:ZoneConfig,b:ZoneConfig){return a.zoneId===b.zoneId&&a.name===b.name&&a.areaId===b.areaId&&a.soilNodeId===b.soilNodeId&&a.expectedSource===b.expectedSource&&a.dryThreshold===b.dryThreshold&&a.wetThreshold===b.wetThreshold&&a.channelIds.every((id,i)=>id===b.channelIds[i]);}
export class ZoneSaveError extends Error {constructor(message:string,readonly uncertain:boolean,readonly conflict=false){super(message);}}
export async function saveZone(input:ZoneConfig,editing:boolean,signal:AbortSignal):Promise<ZoneView>{
 const {revision,...rest}=input;let response:Response;
 try{response=await fetch('/api/v1/irrigation-zones'+(editing?`/${encodeURIComponent(input.zoneId)}`:''),{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(editing?input:rest),signal});}
 catch{throw new ZoneSaveError('Chưa rõ kết quả lưu. Đối chiếu vùng trước khi gửi lại.',true);}
 if(response.status===400||response.status===409)throw new ZoneSaveError(response.status===409?'Phiên bản hoặc kênh đã được dùng. Đọc cấu hình mới nhất để đối chiếu.':'Khai báo không hợp lệ; kiểm tra khu vực, ba kênh đất và ngưỡng.',false,response.status===409);
 try{if(response.status!==(editing?200:201))throw new Error();const v=parseZone(await response.json());if(!sameZone(v.config,input)||v.config.revision!==(editing?revision+1:1))throw new Error();return v;}
 catch{throw new ZoneSaveError('Chưa xác nhận kết quả lưu. Đối chiếu vùng theo mã.',true);}
}
export function displayedAssessment(v:ZoneView,now:number,unavailable:boolean){return unavailable?'UNAVAILABLE':v.assessment.validUntil&&Date.parse(v.assessment.validUntil)<=now?'EXPIRED':v.assessment.state;}
export const assessmentLabels={UNAVAILABLE:'Chưa đủ dữ liệu để khảo sát',INCOHERENT:'Ba điểm chưa thuộc cùng một mẫu',EXPIRED:'Dữ liệu khảo sát đã cũ',DRY:'Đa số điểm đất đang khô',WET:'Đa số điểm đất đủ ẩm',MIXED:'Độ ẩm chưa đồng thuận'};
export const pointLabels={MISSING:'Chưa có dữ liệu',CLOCK_SKEW:'Lệch giờ nguồn',STALE:'Dữ liệu cũ',SENSOR_FAULT:'Cảm biến báo lỗi',SOURCE_MISMATCH:'Nguồn khác cấu hình vùng',FRESH:'Dữ liệu mới'};
