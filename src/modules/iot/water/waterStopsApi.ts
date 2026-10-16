import {parseWaterGate,type WaterGateView} from './waterGateApi';
export interface WaterStop {sessionId:string;circuitId:string;requestId:string;createdAt:string;evidence:WaterGateView;operationState:'RESERVED'|'RETURNED'|'UNRESOLVED';commandState:string|null;errorCode:string|null}
export interface WaterStops {circuitId:string;asOf:string;workerEnabled:boolean;items:WaterStop[]}
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v);
export function parseWaterStops(v:any,id:string):WaterStops {
 if(!v||v.circuitId!==id||typeof v.asOf!=='string'||!/(Z|[+-]\d\d:\d\d)$/.test(v.asOf)||!Number.isFinite(Date.parse(v.asOf))||typeof v.workerEnabled!=='boolean'||!Array.isArray(v.items)||v.items.length>20)throw new Error('Lịch sử dừng không hợp lệ.');
 const seen=new Set<string>();for(const r of v.items){
  if(!r||!uuid(r.sessionId)||!uuid(r.requestId)||seen.has(r.sessionId)||r.circuitId!==id||typeof r.circuitId!=='string'||!/^[A-Z][A-Z0-9_-]{1,31}$/.test(r.circuitId)||typeof r.createdAt!=='string'||!Number.isFinite(Date.parse(r.createdAt))||!['RESERVED','RETURNED','UNRESOLVED'].includes(r.operationState)||!(r.commandState===null||['PENDING','SENT','EXECUTED','FAILED','EXPIRED','TIMED_OUT','PUBLISH_UNCERTAIN'].includes(r.commandState))||!(r.errorCode===null||typeof r.errorCode==='string'))throw new Error('Yêu cầu dừng không hợp lệ.');
  const e=parseWaterGate(r.evidence,id);if(e.config.circuitId!==id||e.allowed||!e.policy?.stopOnUnavailable)throw new Error('Bằng chứng dừng sai nhánh hoặc chế độ.');seen.add(r.sessionId);
 }return v as WaterStops;
}
export const stopOperationLabels={RESERVED:'Đã giữ chỗ; chưa xác nhận kết quả gửi',RETURNED:'Đã nhận kết quả gọi; cần kiểm tra trạng thái thiết bị',UNRESOLVED:'Kết quả chưa rõ; cần xử lý thủ công'};
