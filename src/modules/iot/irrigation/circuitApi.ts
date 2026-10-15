import {parseChannelReading,type ChannelReading} from '../nodes/nodeApi';
export interface CircuitConfig {circuitId:string;name:string;zoneId:string;zoneRevision:number;controllerId:string;valveId:string;pumpId:'PUMP01';waterNodeId:string;lowChannelId:string;flowChannelId:string;expectedSource:'SIMULATOR'|'PHYSICAL';revision:number}
export interface CircuitSignal {state:string;latest:ChannelReading|null}
export interface CircuitView {config:CircuitConfig;configurationState:string;low:CircuitSignal;flow:CircuitSignal;valveState:string}
export interface CircuitSnapshot {mode:'CONFIGURATION_ONLY';dispatchAvailable:false;asOf:string;revision:number;circuits:CircuitView[]}
const obj=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const code=(v:unknown)=>typeof v==='string'&&/^[A-Z][A-Z0-9_-]{1,31}$/.test(v);
const revision=(v:unknown)=>Number.isInteger(v)&&Number(v)>0&&Number(v)<2147483647;
export function parseCircuit(v:unknown):CircuitConfig {
 if(!obj(v)||!code(v.circuitId)||typeof v.name!=='string'||!v.name.trim()||v.name.length>80||!code(v.zoneId)||!revision(v.zoneRevision)||!revision(v.revision)
  ||typeof v.controllerId!=='string'||!/^IRRIGATION(0[1-9]|[1-9][0-9])$/.test(v.controllerId)||typeof v.valveId!=='string'||!/^VALVE(0[1-9]|[1-9][0-9])$/.test(v.valveId)
  ||v.pumpId!=='PUMP01'||!code(v.waterNodeId)||!code(v.lowChannelId)||!code(v.flowChannelId)||v.lowChannelId===v.flowChannelId||!['SIMULATOR','PHYSICAL'].includes(v.expectedSource))throw new Error('Cấu hình nhánh không hợp lệ.');
 return v as CircuitConfig;
}
export const circuitLabels:Record<string,string>={CURRENT:'Khớp cấu hình hiện tại',ZONE_CHANGED:'Cấu hình vùng đã đổi',WATER_DECLARATION_CHANGED:'Kênh trạm nước đã đổi',IDENTITY_CONFLICT:'Mã dự kiến trùng thiết bị',MISSING:'Chưa có dữ liệu',STALE:'Dữ liệu cũ',CLOCK_SKEW:'Lệch giờ',SENSOR_FAULT:'Cảm biến báo lỗi',SOURCE_MISMATCH:'Nguồn đo khác cấu hình',AVAILABLE:'Có nước tại phao',LOW:'Không có nước tại phao',FRESH:'Có mẫu lưu lượng mới',NOT_CONNECTED:'Chưa có kết nối van này',BINDING_MISMATCH:'Van demo đang gắn vùng khác',NO_STATUS:'Chưa có trạng thái van',UNVERIFIED:'Chưa xác minh vị trí van',FAULT:'Van báo lỗi',UNKNOWN:'Chưa xác định vị trí van',OPEN:'Phản hồi van mở',CLOSED:'Phản hồi van đóng',CONFLICT:'Hai công tắc vị trí mâu thuẫn'};
export function parseCircuits(v:unknown):CircuitSnapshot {
 if(!obj(v)||v.mode!=='CONFIGURATION_ONLY'||v.dispatchAvailable!==false||typeof v.asOf!=='string'||!/(Z|[+-]\d\d:\d\d)$/.test(v.asOf)||!Number.isFinite(Date.parse(v.asOf))||!Number.isSafeInteger(v.revision)||v.revision<1||!Array.isArray(v.circuits))throw new Error('Danh sách nhánh không hợp lệ.');
 const circuits=v.circuits.map((x:unknown)=>{if(!obj(x)||!['CURRENT','ZONE_CHANGED','WATER_DECLARATION_CHANGED','IDENTITY_CONFLICT'].includes(x.configurationState)||!['NOT_CONNECTED','BINDING_MISMATCH','NO_STATUS','STALE','UNVERIFIED','FAULT','UNKNOWN','OPEN','CLOSED','CONFLICT'].includes(x.valveState))throw new Error('Trạng thái nhánh không hợp lệ.');
  const config=parseCircuit(x.config);
  for(const key of ['low','flow'] as const){const s=x[key];if(!obj(s)||!['MISSING','CLOCK_SKEW','STALE','SENSOR_FAULT','SOURCE_MISMATCH',...(key==='low'?['AVAILABLE','LOW']:['FRESH'])].includes(s.state)||(s.state==='MISSING')!==(s.latest===null))throw new Error('Trạng thái nước không hợp lệ.');
   if(s.latest!==null)parseChannelReading(s.latest,key==='low'?'WATER_PRESENT':'FLOW_RATE');
   if(['AVAILABLE','LOW','FRESH'].includes(s.state)&&(!s.latest||s.latest.quality!=='VALID'||s.latest.dataSource!==config.expectedSource||key==='low'&&s.latest.value!==(s.state==='AVAILABLE')||[s.latest.observedAt,s.latest.receivedAt].some(t=>Date.parse(t)>Date.parse(v.asOf)+2000||Date.parse(v.asOf)-Date.parse(t)>=15000)))throw new Error('Tín hiệu nước chưa được xác nhận.');
  }return {...x,config} as CircuitView;});
 for(const field of ['circuitId','zoneId','valveId'] as const)if(new Set(circuits.map(c=>c.config[field])).size!==circuits.length)throw new Error('Ánh xạ nhánh bị trùng.');
 return {...v,circuits} as CircuitSnapshot;
}
export function sameCircuit(a:CircuitConfig,b:CircuitConfig){return (Object.keys(a) as (keyof CircuitConfig)[]).every(k=>k==='revision'||a[k]===b[k])&&(Object.keys(b) as (keyof CircuitConfig)[]).every(k=>k==='revision'||a[k]===b[k]);}
