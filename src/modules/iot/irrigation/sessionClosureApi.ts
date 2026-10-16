export const closureLabels={ARMED:'Đang chờ ACK và trạng thái bơm OFF mới',CLOSE_RESERVED:'Đã giữ mã CLOSE; chưa xác nhận kết quả',WAIT_CLOSED:'Đang chờ ACK và trạng thái van CLOSED mới',COMPLETE:'Đã khép phiên với bằng chứng OFF/CLOSED',PAUSED:'Đã ngừng bước tự động tiếp theo',EXPIRED:'Hết cửa sổ chờ; cần phục hồi thủ công',INTERRUPTED:'Đã ngắt tự khép; không tự tiếp tục',UNRESOLVED:'Kết quả chưa rõ; không gửi lại CLOSE'};
export interface ClosureArm {armId:string;expectedRevision:number;offId:string;reviewedAt:string}
export interface ClosureRecord {sessionId:string;armId:string;definition:ClosureArm;offId:string;closeId:string;finishId:string;armedAt:string;deadline:string;state:keyof typeof closureLabels;reason:string;finishedAt:string|null}
export interface ClosureView {mode:'POST_OFF_CLOSURE';circuitId:string;sessionId:string;asOf:string;sessionRevision:number;offId:string|null;phase:string;enabled:boolean;canArm:boolean;reason:string;closure:ClosureRecord|null}
export type ClosurePending={kind:'ARM';body:ClosureArm}|{kind:'PAUSE';armId:string};
const uuid=(s:unknown):s is string=>typeof s==='string'&&/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(s);
const date=(s:unknown):s is string=>typeof s==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(s)&&Number.isFinite(Date.parse(s));
const revision=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0;
const phases=['PREPARED','DISPATCHING_OPEN','WAIT_OPEN','DISPATCHING_ON','WAIT_ON','DISPATCHING_OFF','WAIT_OFF','DISPATCHING_CLOSE','WAIT_CLOSED','RECOVERY_REQUIRED','CLOSED_CONFIRMED'];
export const closureActive=(r:ClosureRecord)=>['ARMED','CLOSE_RESERVED','WAIT_CLOSED'].includes(r.state);
const validArm=(v:any):v is ClosureArm=>!!v&&uuid(v.armId)&&revision(v.expectedRevision)&&uuid(v.offId)&&date(v.reviewedAt);
const micros=(s:string)=>BigInt(Date.parse(s))*1000n+BigInt((s.match(/\.(\d+)(?:Z|[+-]\d\d:\d\d)$/)?.[1]??'').padEnd(6,'0').slice(3,6));
export const sameClosureArm=(a:ClosureArm,b:ClosureArm)=>a.armId===b.armId&&a.offId===b.offId&&a.expectedRevision===b.expectedRevision&&micros(a.reviewedAt)===micros(b.reviewedAt);
export function parseClosureRecord(v:any,session:string):ClosureRecord {
 if(!v||v.sessionId!==session||!uuid(v.sessionId)||!uuid(v.armId)||!uuid(v.offId)||!uuid(v.closeId)||!uuid(v.finishId)||!validArm(v.definition)||v.definition.armId!==v.armId||v.definition.offId!==v.offId||!date(v.armedAt)||!date(v.deadline)||Math.abs(Date.parse(v.deadline)-Date.parse(v.armedAt)-15000)>1||!Object.hasOwn(closureLabels,v.state)||typeof v.reason!=='string'||(closureActive(v)?v.finishedAt!==null:!date(v.finishedAt)))throw new Error('Bản tự khép phiên không hợp lệ.');return v;
}
export function parseClosureView(v:any,circuit:string,session:string):ClosureView {
 if(!v||v.mode!=='POST_OFF_CLOSURE'||v.circuitId!==circuit||v.sessionId!==session||!uuid(session)||!date(v.asOf)||!revision(v.sessionRevision)||!(v.offId===null||uuid(v.offId))||!phases.includes(v.phase)||typeof v.enabled!=='boolean'||typeof v.canArm!=='boolean'||typeof v.reason!=='string')throw new Error('Phản hồi tự khép phiên không hợp lệ.');
 if(v.closure!==null){parseClosureRecord(v.closure,session);if(v.canArm)throw new Error('Không tự bật lại một định nghĩa đã lưu.');}
 if(v.canArm&&(!v.enabled||v.reason!=='READY'||v.closure!==null||v.phase!=='WAIT_OFF'||v.offId===null))throw new Error('Chưa đủ điều kiện tự khép phiên.');return v;
}
export const CLOSURE_PENDING_KEY='smartfarm:session-closure:pending:v1:';
export function loadClosurePending(key:string):ClosurePending|null{try{const v=JSON.parse(sessionStorage.getItem(CLOSURE_PENDING_KEY+key)??'null');return v&&(v.kind==='ARM'&&validArm(v.body)||v.kind==='PAUSE'&&uuid(v.armId))?v:null;}catch{return null;}}
export const closureReasons:Record<string,string>={READY:'Có thể bật riêng cho phiên sau OFF',PROFILE_DISABLED:'Backend chưa bật chế độ tự khép',REQUEST_OFF_FIRST:'Cần gửi OFF và đọc lại phiên trước',BINDING_OR_PROFILE_CHANGED:'Boot, nhánh hoặc profile đã đổi',OFF_OUTCOME_UNRESOLVED:'Kết quả OFF chưa đủ để bật chế độ này'};
