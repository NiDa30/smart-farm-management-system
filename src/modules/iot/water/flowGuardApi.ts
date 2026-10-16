import {parseChannelReading,type ChannelReading} from '../nodes/nodeApi';
import {parseCircuit,type CircuitConfig} from '../irrigation/circuitApi';
export const flowLabels={NOT_CONFIGURED:'Chưa cấu hình giám sát FLOW',DISABLED:'Giám sát FLOW đang tắt',MONITOR_DISABLED:'Backend chưa bật giám sát FLOW',IDLE:'Chưa có phiên giữ ON cần giám sát',GRACE:'Đang chờ nước lên sau ý định ON',CONFIG_CHANGED:'Cấu hình nhánh, vùng hoặc hiệu chuẩn đã đổi',CHANNEL_UNAVAILABLE:'Kênh FLOW không còn phù hợp',ANCHOR_MISSING:'Thiếu thời điểm giữ ý định ON',MISSING:'Chưa có mẫu FLOW',BEFORE_ON:'Mẫu FLOW chưa mới hơn ý định ON',CLOCK_SKEW:'Đồng hồ FLOW không hợp lệ',STALE:'Mẫu FLOW đã cũ',SENSOR_FAULT:'Cảm biến FLOW báo lỗi',SOURCE_MISMATCH:'Nguồn mẫu FLOW không khớp',CALIBRATION_MISMATCH:'Hiệu chuẩn mẫu FLOW không khớp',LOW_FLOW:'FLOW dưới ngưỡng đã đặt',FLOW_OK:'Mẫu FLOW tại trạm đạt ngưỡng',UNKNOWN:'Chưa xác nhận dữ liệu mới',AWAITING_RECHECK:'Đã hết thời gian chờ; cần kết quả đánh giá mới'};
export interface FlowRequest {expectedRevision:number;circuitRevision:number;calibrationVersion:string|null;enabled:boolean;minimumLpm:number;graceSeconds:number}
export interface FlowPolicy extends Omit<FlowRequest,'expectedRevision'>{circuitId:string;revision:number}
export interface FlowView {config:CircuitConfig;asOf:string;workerEnabled:boolean;calibrationVersion:string|null;policy:FlowPolicy|null;sessionId:string|null;onId:string|null;onReservedAt:string|null;graceUntil:string|null;state:Exclude<keyof typeof flowLabels,'UNKNOWN'|'AWAITING_RECHECK'>;stopRequired:boolean;validUntil:string|null;sample:ChannelReading|null}
const obj=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const cal=(v:unknown)=>v===null||typeof v==='string'&&!!v.trim()&&v.length<=40;
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v);
const passive=['NOT_CONFIGURED','DISABLED','MONITOR_DISABLED','IDLE'];
const nonStop=[...passive,'GRACE','FLOW_OK'];
export function parseFlowPolicy(v:unknown):FlowPolicy {
 if(!obj(v)||typeof v.circuitId!=='string'||!/^[A-Z][A-Z0-9_-]{1,31}$/.test(v.circuitId)||!Number.isSafeInteger(v.revision)||v.revision<1||!Number.isSafeInteger(v.circuitRevision)||v.circuitRevision<1||!cal(v.calibrationVersion)||typeof v.enabled!=='boolean'||typeof v.minimumLpm!=='number'||!Number.isFinite(v.minimumLpm)||v.minimumLpm<=0||v.minimumLpm>1000||!Number.isSafeInteger(v.graceSeconds)||v.graceSeconds<1||v.graceSeconds>8)throw new Error('Policy FLOW không hợp lệ.');
 return v as FlowPolicy;
}
export function parseFlowView(v:unknown,id:string):FlowView {
 if(!obj(v)||!date(v.asOf)||typeof v.workerEnabled!=='boolean'||!cal(v.calibrationVersion)||!Object.hasOwn(flowLabels,v.state)||['UNKNOWN','AWAITING_RECHECK'].includes(v.state)||typeof v.stopRequired!=='boolean'||v.stopRequired===nonStop.includes(v.state))throw new Error('Phản hồi giám sát FLOW không hợp lệ.');
 const c=parseCircuit(v.config),p=v.policy===null?null:parseFlowPolicy(v.policy),s=v.sample===null?null:parseChannelReading(v.sample,'FLOW_RATE');
 if(c.circuitId!==id||p&&p.circuitId!==id||s&&s.dataSource===undefined||v.state==='NOT_CONFIGURED'&&p!==null||v.state==='DISABLED'&&(!p||p.enabled)||!['NOT_CONFIGURED','DISABLED'].includes(v.state)&&!p?.enabled||!passive.includes(v.state)&&!v.workerEnabled||v.state==='MONITOR_DISABLED'&&v.workerEnabled)throw new Error('Giám sát FLOW sai nhánh hoặc chế độ.');
 if(passive.includes(v.state)){if([v.sessionId,v.onId,v.onReservedAt,v.graceUntil,v.sample,v.validUntil].some(x=>x!==null))throw new Error('Không suy diễn FLOW ngoài phiên.');}
 else {
  if(!uuid(v.sessionId)||!uuid(v.onId)||!(v.onReservedAt===null||date(v.onReservedAt))||!(v.graceUntil===null||date(v.graceUntil)))throw new Error('Thiếu danh tính ý định ON.');
  if(v.onReservedAt!==null&&(!date(v.graceUntil)||Math.abs(Date.parse(v.graceUntil)-Date.parse(v.onReservedAt)-p!.graceSeconds*1000)>1))throw new Error('Thời gian chờ không khớp policy.');
  if(v.state==='GRACE'&&(!date(v.onReservedAt)||Date.parse(v.onReservedAt)>Date.parse(v.asOf)||Date.parse(v.graceUntil)<=Date.parse(v.asOf)))throw new Error('Thời gian chờ đã hết.');
 }
 if(['FLOW_OK','LOW_FLOW'].includes(v.state)){
  if(!p||!s||s.quality!=='VALID'||typeof s.value!=='number'||p.circuitRevision!==c.revision||p.calibrationVersion!==v.calibrationVersion||s.calibrationVersion!==p.calibrationVersion||s.dataSource!==c.expectedSource||!date(v.validUntil)||!date(v.onReservedAt)||(s.value>=p.minimumLpm)!==(v.state==='FLOW_OK'))throw new Error('Mẫu FLOW không khớp policy.');
  const now=Date.parse(v.asOf),a=Date.parse(s.observedAt),b=Date.parse(s.receivedAt),anchor=Date.parse(v.onReservedAt);
  if(a<=anchor||b<=anchor||a>now+2000||b>now+2000||Math.min(a,b)+10000<=now||Math.abs(Date.parse(v.validUntil)-Math.min(a,b)-10000)>1)throw new Error('Mẫu FLOW chưa đủ mới sau ON.');
 }else if(v.validUntil!==null)throw new Error('Không suy diễn thời hạn FLOW.');
 return v as FlowView;
}
export function flowPolicyMatches(p:FlowPolicy,r:FlowRequest,id:string){return p.circuitId===id&&p.revision===r.expectedRevision+1&&p.circuitRevision===r.circuitRevision&&p.calibrationVersion===r.calibrationVersion&&p.enabled===r.enabled&&p.minimumLpm===r.minimumLpm&&p.graceSeconds===r.graceSeconds;}
export function flowDisplayState(v:FlowView,now:number,unavailable:boolean):keyof typeof flowLabels {return unavailable?'UNKNOWN':v.state==='GRACE'&&now>=Date.parse(v.graceUntil!)?'AWAITING_RECHECK':v.validUntil&&now>=Date.parse(v.validUntil)?'STALE':v.state;}
export interface FlowStop {sessionId:string;circuitId:string;requestId:string;createdAt:string;evidence:FlowView;operationState:'RESERVED'|'RETURNED'|'UNRESOLVED';commandState:string|null;errorCode:string|null}
export interface FlowStops {circuitId:string;asOf:string;workerEnabled:boolean;items:FlowStop[]}
export function parseFlowStops(v:any,id:string):FlowStops {
 if(!obj(v)||v.circuitId!==id||!date(v.asOf)||typeof v.workerEnabled!=='boolean'||!Array.isArray(v.items)||v.items.length>20)throw new Error('Lịch sử FLOW không hợp lệ.');
 const seen=new Set<string>();for(const r of v.items){
  if(!obj(r)||!uuid(r.sessionId)||!uuid(r.requestId)||seen.has(r.sessionId)||r.circuitId!==id||!date(r.createdAt)||!['RESERVED','RETURNED','UNRESOLVED'].includes(r.operationState)||!(r.commandState===null||['PENDING','SENT','EXECUTED','FAILED','EXPIRED','TIMED_OUT','PUBLISH_UNCERTAIN'].includes(r.commandState))||!(r.errorCode===null||typeof r.errorCode==='string'))throw new Error('Yêu cầu dừng FLOW không hợp lệ.');
  const e=parseFlowView(r.evidence,id);if(!e.stopRequired||e.sessionId!==r.sessionId)throw new Error('Bằng chứng FLOW sai phiên.');seen.add(r.sessionId);
 }return v as unknown as FlowStops;
}
