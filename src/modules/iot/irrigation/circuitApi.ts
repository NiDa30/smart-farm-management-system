import {parseChannelReading,type ChannelReading} from '../nodes/nodeApi';
import {validPosition,type PositionFeedback} from './valveApi';
export interface CircuitConfig {circuitId:string;name:string;zoneId:string;zoneRevision:number;controllerId:string;valveId:string;pumpId:'PUMP01';waterNodeId:string;lowChannelId:string;flowChannelId:string;expectedSource:'SIMULATOR'|'PHYSICAL';revision:number}
export interface CircuitSignal {state:string;latest:ChannelReading|null}
export interface ValveObservation {controllerId:string;actuatorId:string;circuitId:string;circuitRevision:number;zoneId:string;zoneRevision:number;bootId:string;sequence:number;observedAt:string;receivedAt:string;dataSource:'SIMULATOR';monitorOnly:true;gpioState:'CLOSED';reason:string;positionFeedback:PositionFeedback|null}
export interface CircuitView {config:CircuitConfig;configurationState:string;low:CircuitSignal;flow:CircuitSignal;valveState:string;valveObservation?:ValveObservation|null}
export interface CircuitSnapshot {mode:'CONFIGURATION_ONLY';dispatchAvailable:false;valveMonitorEnabled?:boolean;asOf:string;revision:number;circuits:CircuitView[]}
const obj=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const code=(v:unknown)=>typeof v==='string'&&/^[A-Z][A-Z0-9_-]{1,31}$/.test(v);
const revision=(v:unknown)=>Number.isInteger(v)&&Number(v)>0&&Number(v)<2147483647;
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
function parseObservation(v:unknown):ValveObservation {
 if(!obj(v)||typeof v.controllerId!=='string'||!/^IRRIGATION(0[2-9]|[1-9][0-9])$/.test(v.controllerId)||typeof v.actuatorId!=='string'||!/^VALVE(0[2-9]|[1-9][0-9])$/.test(v.actuatorId)||!code(v.circuitId)||!revision(v.circuitRevision)||!code(v.zoneId)||!revision(v.zoneRevision)||typeof v.bootId!=='string'||!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v.bootId)||!Number.isSafeInteger(v.sequence)||v.sequence<0||!date(v.observedAt)||!date(v.receivedAt)||v.dataSource!=='SIMULATOR'||v.monitorOnly!==true||v.gpioState!=='CLOSED'||!['BOOT','CONNECTION_LOST','DEVICE_FAULT','POSITION_FAULT'].includes(v.reason)||(v.positionFeedback===null?v.reason==='POSITION_FAULT':!validPosition(v.positionFeedback,v.gpioState,v.reason)))throw new Error('Quan sát van không hợp lệ.');
 return v as ValveObservation;
}
export function parseCircuit(v:unknown):CircuitConfig {
 if(!obj(v)||!code(v.circuitId)||typeof v.name!=='string'||!v.name.trim()||v.name.length>80||!code(v.zoneId)||!revision(v.zoneRevision)||!revision(v.revision)
  ||typeof v.controllerId!=='string'||!/^IRRIGATION(0[1-9]|[1-9][0-9])$/.test(v.controllerId)||typeof v.valveId!=='string'||!/^VALVE(0[1-9]|[1-9][0-9])$/.test(v.valveId)
  ||v.pumpId!=='PUMP01'||!code(v.waterNodeId)||!code(v.lowChannelId)||!code(v.flowChannelId)||v.lowChannelId===v.flowChannelId||!['SIMULATOR','PHYSICAL'].includes(v.expectedSource))throw new Error('Cấu hình nhánh không hợp lệ.');
 return v as CircuitConfig;
}
export const circuitLabels:Record<string,string>={CURRENT:'Khớp cấu hình hiện tại',ZONE_CHANGED:'Cấu hình vùng đã đổi',WATER_DECLARATION_CHANGED:'Kênh trạm nước đã đổi',IDENTITY_CONFLICT:'Mã dự kiến trùng thiết bị',MISSING:'Chưa có dữ liệu',STALE:'Dữ liệu cũ',CLOCK_SKEW:'Lệch giờ',SENSOR_FAULT:'Cảm biến báo lỗi',SOURCE_MISMATCH:'Nguồn đo khác cấu hình',AVAILABLE:'Có nước tại phao',LOW:'Không có nước tại phao',FRESH:'Có mẫu lưu lượng mới',NOT_CONNECTED:'Chưa có kết nối van này',BINDING_MISMATCH:'Van demo đang gắn vùng khác',NO_STATUS:'Chưa có trạng thái van',UNVERIFIED:'Chưa xác minh vị trí van',FAULT:'Van báo lỗi',UNKNOWN:'Chưa xác định vị trí van',OPEN:'Phản hồi van mở',CLOSED:'Phản hồi van đóng',CONFLICT:'Hai công tắc vị trí mâu thuẫn'};
export function parseCircuits(v:unknown):CircuitSnapshot {
 if(!obj(v)||v.mode!=='CONFIGURATION_ONLY'||v.dispatchAvailable!==false||typeof v.asOf!=='string'||!/(Z|[+-]\d\d:\d\d)$/.test(v.asOf)||!Number.isFinite(Date.parse(v.asOf))||!Number.isSafeInteger(v.revision)||v.revision<1||!Array.isArray(v.circuits))throw new Error('Danh sách nhánh không hợp lệ.');
 if(v.valveMonitorEnabled!==undefined&&typeof v.valveMonitorEnabled!=='boolean')throw new Error('Cờ giám sát không hợp lệ.');
 const circuits=v.circuits.map((x:unknown)=>{if(!obj(x)||!['CURRENT','ZONE_CHANGED','WATER_DECLARATION_CHANGED','IDENTITY_CONFLICT'].includes(x.configurationState)||!['NOT_CONNECTED','MONITOR_DISABLED','CONFIG_CHANGED','BINDING_MISMATCH','NO_STATUS','STALE','UNVERIFIED','FAULT','UNKNOWN','OPEN','CLOSED','CONFLICT'].includes(x.valveState))throw new Error('Trạng thái nhánh không hợp lệ.');
  const config=parseCircuit(x.config);
  if(x.valveObservation!=null){const o=parseObservation(x.valveObservation),matches=o.actuatorId===config.valveId&&o.controllerId===config.controllerId&&o.circuitId===config.circuitId&&o.circuitRevision===config.revision&&o.zoneId===config.zoneId&&o.zoneRevision===config.zoneRevision&&config.expectedSource===o.dataSource&&x.configurationState==='CURRENT';
   const fresh=Math.min(Date.parse(o.observedAt),Date.parse(o.receivedAt))>Date.parse(v.asOf)-15000&&Math.max(Date.parse(o.observedAt),Date.parse(o.receivedAt))<=Date.parse(v.asOf)+2000;
   const expected=!matches?'CONFIG_CHANGED':!v.valveMonitorEnabled?'MONITOR_DISABLED':!fresh?'STALE':o.reason==='DEVICE_FAULT'?'FAULT':o.positionFeedback===null?'UNVERIFIED':o.positionFeedback.fault?'FAULT':o.positionFeedback.state;
   if(o.actuatorId!==config.valveId||x.valveState!==expected)throw new Error('Phản hồi không thuộc van hoặc phiên bản hiện tại.');
  }else if(!['IRRIGATION01/VALVE01'].includes(config.controllerId+'/'+config.valveId)&&x.valveState!=='NOT_CONNECTED')throw new Error('Chưa có packet để xác nhận van này.');
  for(const key of ['low','flow'] as const){const s=x[key];if(!obj(s)||!['MISSING','CLOCK_SKEW','STALE','SENSOR_FAULT','SOURCE_MISMATCH',...(key==='low'?['AVAILABLE','LOW']:['FRESH'])].includes(s.state)||(s.state==='MISSING')!==(s.latest===null))throw new Error('Trạng thái nước không hợp lệ.');
   if(s.latest!==null)parseChannelReading(s.latest,key==='low'?'WATER_PRESENT':'FLOW_RATE');
   if(['AVAILABLE','LOW','FRESH'].includes(s.state)&&(!s.latest||s.latest.quality!=='VALID'||s.latest.dataSource!==config.expectedSource||key==='low'&&s.latest.value!==(s.state==='AVAILABLE')||[s.latest.observedAt,s.latest.receivedAt].some(t=>Date.parse(t)>Date.parse(v.asOf)+2000||Date.parse(v.asOf)-Date.parse(t)>=15000)))throw new Error('Tín hiệu nước chưa được xác nhận.');
  }return {...x,config} as CircuitView;});
 for(const field of ['circuitId','zoneId','valveId'] as const)if(new Set(circuits.map(c=>c.config[field])).size!==circuits.length)throw new Error('Ánh xạ nhánh bị trùng.');
 return {...v,circuits} as CircuitSnapshot;
}
export function sameCircuit(a:CircuitConfig,b:CircuitConfig){return (Object.keys(a) as (keyof CircuitConfig)[]).every(k=>k==='revision'||a[k]===b[k])&&(Object.keys(b) as (keyof CircuitConfig)[]).every(k=>k==='revision'||a[k]===b[k]);}
Object.assign(circuitLabels,{MONITOR_DISABLED:'Đã tắt giám sát; chỉ còn dữ liệu lưu',CONFIG_CHANGED:'Quan sát thuộc cấu hình cũ'});
export function observedValveState(v:CircuitView,now:number,fresh:boolean){if(!fresh)return 'Cần đọc lại dữ liệu';const o=v.valveObservation;if(o&&!['MONITOR_DISABLED','CONFIG_CHANGED'].includes(v.valveState)&&(Math.min(Date.parse(o.observedAt),Date.parse(o.receivedAt))<=now-15000||Math.max(Date.parse(o.observedAt),Date.parse(o.receivedAt))>now+2000))return circuitLabels.STALE;return circuitLabels[v.valveState];}
