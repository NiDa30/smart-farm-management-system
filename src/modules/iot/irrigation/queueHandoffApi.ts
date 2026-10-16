import {parseQueueItem,type QueueItem} from './queueApi';
import {parseSessionRun,sameStart,validStart,type SessionStart,type SessionRun} from './irrigationSessionApi';
import {sameCircuit} from './circuitApi';
export interface HandoffRequest {queueRevision:number;session:SessionStart}
export interface HandoffReview {circuitRevision:number;zoneRevision:number;pumpBootId:string;valveBootId:string;reviewedAt:string}
export interface HandoffReceipt {requestId:string;preparedAt:string;definition:HandoffRequest;session:SessionRun}
export interface HandoffView {mode:'OPERATOR_PREPARATION';requestId:string;asOf:string;enabled:boolean;queueRevision:number;request:QueueItem;canPrepare:boolean;reason:string;review:HandoffReview|null;receipt:HandoffReceipt|null}
const uuid=(s:unknown):s is string=>typeof s==='string'&&/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(s);
const date=(s:unknown):s is string=>typeof s==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(s)&&Number.isFinite(Date.parse(s));
const positive=(n:unknown):n is number=>Number.isSafeInteger(n)&&Number(n)>0;
export function validHandoffRequest(v:any):v is HandoffRequest{return !!v&&positive(v.queueRevision)&&validStart(v.session);}
const micros=(s:string)=>BigInt(Date.parse(s))*1000n+BigInt((s.match(/\.(\d+)(?:Z|[+-]\d\d:\d\d)$/)?.[1]??'').padEnd(6,'0').slice(3,6));
export function sameHandoff(a:HandoffRequest,b:HandoffRequest){return a.queueRevision===b.queueRevision&&['sessionId','circuitRevision','zoneRevision','pumpBootId','valveBootId','durationSeconds','reviewedAt'].every(k=>k==='reviewedAt'?micros(a.session.reviewedAt)===micros(b.session.reviewedAt):a.session[k as keyof SessionStart]===b.session[k as keyof SessionStart]);}
export function parseHandoffReceipt(v:any,id:string,item:QueueItem):HandoffReceipt {
 if(!v||v.requestId!==id||!date(v.preparedAt)||!validHandoffRequest(v.definition)||!item.circuitSnapshot)throw new Error('Bản chuyển phiên không hợp lệ.');
 const s=parseSessionRun(v.session),c=item.circuitSnapshot;
 if(!sameStart(s,v.definition.session,c.circuitId)||!sameCircuit(s.config,c)||s.config.revision!==c.revision||s.durationSeconds!==item.durationSeconds||s.config.zoneId!==item.zoneId||s.config.zoneRevision!==item.zoneRevision)throw new Error('Phiên không khớp lượt hàng chờ.');
 return v;
}
export function parseHandoffView(v:any,id:string):HandoffView {
 if(!v||v.mode!=='OPERATOR_PREPARATION'||v.requestId!==id||!uuid(id)||!date(v.asOf)||typeof v.enabled!=='boolean'||!positive(v.queueRevision)||typeof v.canPrepare!=='boolean'||typeof v.reason!=='string')throw new Error('Phản hồi chuyển phiên không hợp lệ.');
 const item=parseQueueItem(v.request);if(item.requestId!==id)throw new Error('Sai mã lượt chờ.');
 if(v.receipt!==null){parseHandoffReceipt(v.receipt,id,item);if(item.state!=='HANDED_OFF'||v.canPrepare||v.reason!=='HANDED_OFF'||v.review!==null)throw new Error('Trạng thái chuyển phiên mâu thuẫn.');}
 else if(item.state==='HANDED_OFF'||v.reason==='HANDED_OFF')throw new Error('Thiếu liên kết phiên đã chuyển.');
 if(v.canPrepare){const r=v.review,c=item.circuitSnapshot;if(!v.enabled||v.reason!=='READY'||v.receipt!==null||item.state!=='QUEUED'||item.durationSeconds>10||Date.parse(item.expiresAt)<=Date.parse(v.asOf)||!c||!r||!positive(r.circuitRevision)||r.circuitRevision!==c.revision||r.zoneRevision!==item.zoneRevision||!uuid(r.pumpBootId)||!uuid(r.valveBootId)||!date(r.reviewedAt)||Date.parse(v.asOf)-Date.parse(r.reviewedAt)>10000||Date.parse(r.reviewedAt)>Date.parse(v.asOf)+2000)throw new Error('Chưa đủ điều kiện chuyển phiên.');}
 else if(v.review!==null||v.reason==='READY')throw new Error('Không suy diễn quyền chuẩn bị phiên.');
 return v;
}
export const handoffLabels:Record<string,string>={READY:'Đủ điều kiện chuẩn bị; chưa gửi lệnh',HANDED_OFF:'Lượt đã chuyển sang phiên có xác nhận',PROFILE_DISABLED:'Backend chưa bật chuyển hàng chờ sang phiên',NOT_WAITING:'Lượt không còn ở trạng thái chờ',REHEARSAL_ACTIVE:'Cần kết thúc lượt đang diễn tập',NOT_FIFO_HEAD:'Chỉ chuyển đúng lượt đầu hàng',EXPIRED:'Lượt chờ đã hết hạn',CIRCUIT_REQUIRED:'Lượt chưa có nhánh đã duyệt',DURATION_TOO_LONG:'Thời hạn diễn tập trên 10 giây; không tự rút ngắn',CONFIG_CHANGED:'Vùng hoặc nhánh đã đổi; cần lập lượt mới',FLOW_GRACE_TOO_LONG:'Thời hạn lượt phải dài hơn thời gian chờ FLOW',SESSION_SESSION_ACTIVE:'Đang có phiên khác giữ quy trình',SESSION_PROFILE_DISABLED:'Profile phiên tưới chưa bật',SESSION_PUMP_ROUTE_MISMATCH:'Bơm chưa khai báo đúng route của lượt',SESSION_PUMP_NOT_IDLE:'Bơm chưa nghỉ có xác nhận',SESSION_VALVES_NOT_READY:'Van chưa có bằng chứng CLOSED mới',SESSION_PUMP_OFFLINE:'Thiếu bằng chứng kết nối bơm',SESSION_PUMP_PROFILE_NOT_READY:'Profile bơm chưa sẵn sàng'};
export const HANDOFF_PENDING_KEY='smartfarm:queue-handoff:pending:v1:';
export function loadHandoffPending(id:string):HandoffRequest|null{try{const v=JSON.parse(sessionStorage.getItem(HANDOFF_PENDING_KEY+id)??'null');return validHandoffRequest(v)?v:null;}catch{return null;}}
