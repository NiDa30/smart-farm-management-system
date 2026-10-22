import {historyMicros} from './sessionHistoryApi';
export const cycleLabels={ARMED:'Đã duyệt, chưa gửi bước đầu',OPEN_RESERVED:'Đã giữ mã OPEN',WAIT_OPEN:'Chờ ACK, trạng thái van OPEN và proof tại bơm',ON_RESERVED:'Đã giữ mã ON',WAIT_ON:'Chờ ACK và trạng thái bơm ON mới',RUNNING:'Đã nhận bằng chứng ON; chờ hạn dừng',OFF_RESERVED:'Đã giữ mã OFF',WAIT_OFF:'Chờ ACK và trạng thái bơm OFF mới',CLOSE_RESERVED:'Đã giữ mã CLOSE',WAIT_CLOSED:'Chờ ACK và trạng thái van CLOSED mới',COMPLETE:'Đã khép phiên với OFF/CLOSED xác nhận',PAUSED:'Đã ngừng tự chuyển bước',EXPIRED:'Hết cửa sổ; cần phục hồi thủ công',INTERRUPTED:'Đã ngắt; không tự tiếp tục',UNRESOLVED:'Kết quả chưa rõ; cần kiểm tra thủ công'};
export interface CycleArm {armId:string;expectedRevision:number;reviewedAt:string}
export interface CycleRecord {sessionId:string;armId:string;definition:CycleArm;openId:string;onId:string;offId:string;closeId:string;finishId:string;armedAt:string;deadline:string;stepDeadline:string|null;stopAt:string|null;stopReason:string|null;state:keyof typeof cycleLabels;reason:string;finishedAt:string|null}
export interface CycleView {mode:'SINGLE_SESSION_CYCLE';circuitId:string;sessionId:string;asOf:string;sessionRevision:number;phase:string;durationSeconds:number;enabled:boolean;canArm:boolean;reason:string;cycle:CycleRecord|null}
export type CyclePending={kind:'ARM';body:CycleArm}|{kind:'PAUSE';armId:string};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v);
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const revision=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0;
const validArm=(v:any):v is CycleArm=>!!v&&uuid(v.armId)&&revision(v.expectedRevision)&&date(v.reviewedAt);
export const cycleActive=(c:CycleRecord)=>!['COMPLETE','PAUSED','EXPIRED','INTERRUPTED','UNRESOLVED'].includes(c.state);
export const sameCycleArm=(a:CycleArm,b:CycleArm)=>a.armId===b.armId&&a.expectedRevision===b.expectedRevision&&historyMicros(a.reviewedAt)===historyMicros(b.reviewedAt);
export function parseCycleRecord(v:any,session:string):CycleRecord {
 if(!v||v.sessionId!==session||!uuid(session)||!uuid(v.armId)||!validArm(v.definition)||v.definition.armId!==v.armId||!['openId','onId','offId','closeId','finishId'].every(k=>uuid(v[k]))||new Set([v.openId,v.onId,v.offId,v.closeId,v.finishId]).size!==5||!date(v.armedAt)||!date(v.deadline)||historyMicros(v.deadline)-historyMicros(v.armedAt)!==30000000n||!(v.stepDeadline===null||date(v.stepDeadline))||!(v.stopAt===null||date(v.stopAt))||!(v.stopReason===null||typeof v.stopReason==='string')||!Object.hasOwn(cycleLabels,v.state)||typeof v.reason!=='string'||(cycleActive(v)?v.finishedAt!==null:!date(v.finishedAt)))throw new Error('Bản lưu chu trình không hợp lệ.');
 if(['ON_RESERVED','WAIT_ON','RUNNING','OFF_RESERVED','WAIT_OFF','CLOSE_RESERVED','WAIT_CLOSED','COMPLETE'].includes(v.state)&&v.stopAt===null)throw new Error('Thiếu mốc dừng đã lưu trước ON.');return v;
}
export function parseCycleView(v:any,circuit:string,session:string):CycleView {
 if(!v||v.mode!=='SINGLE_SESSION_CYCLE'||v.circuitId!==circuit||v.sessionId!==session||!uuid(session)||!date(v.asOf)||!revision(v.sessionRevision)||typeof v.enabled!=='boolean'||typeof v.canArm!=='boolean'||!Number.isInteger(v.durationSeconds)||v.durationSeconds<1||v.durationSeconds>10||typeof v.reason!=='string'||!['PREPARED','DISPATCHING_OPEN','WAIT_OPEN','DISPATCHING_ON','WAIT_ON','DISPATCHING_OFF','WAIT_OFF','DISPATCHING_CLOSE','WAIT_CLOSED','CLOSED_CONFIRMED','RECOVERY_REQUIRED'].includes(v.phase))throw new Error('Phản hồi chu trình không khớp phiên.');
 if(v.cycle!==null){parseCycleRecord(v.cycle,session);if(v.canArm)throw new Error('Không bật lại định nghĩa đã lưu.');}
 if(v.canArm&&(!v.enabled||v.cycle!==null||v.reason!=='READY'||v.phase!=='PREPARED'))throw new Error('Chưa có quyền chạy một phiên đã chuẩn bị.');return v;
}
export const CYCLE_PENDING_KEY='smartfarm:irrigation-cycle:pending:v1:';
export function loadCyclePending(key:string):CyclePending|null{try{const v=JSON.parse(sessionStorage.getItem(CYCLE_PENDING_KEY+key)??'null');return v&&(v.kind==='ARM'&&validArm(v.body)||v.kind==='PAUSE'&&uuid(v.armId))?v:null;}catch{return null;}}
export const cycleReasons:Record<string,string>={READY:'Sẵn sàng duyệt một chu trình của phiên',PROFILE_DISABLED:'Backend chưa bật chu trình hoặc chưa qua phục hồi startup',PREPARED_SESSION_REQUIRED:'Cần phiên PREPARED chưa gửi bước nào',CLOSURE_ALREADY_DEFINED:'Phiên đã có định nghĩa tự khép khác',CIRCUIT_NOT_READY:'Nhánh, boot hoặc bằng chứng chưa sẵn sàng'};
