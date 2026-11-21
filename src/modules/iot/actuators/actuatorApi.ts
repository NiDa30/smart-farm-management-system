// Contract v3 actuators on ENV01 and the sequential zone run. Every response is checked
// before it reaches the screen: an unexpected shape is an error, never a guessed state.
export type ActuatorType='VALVE'|'FAN'|'LIGHT'|'MIST';
export type ReportedState='ON'|'OFF'|'UNKNOWN';
export interface Actuator {actuatorId:string;actuatorType:ActuatorType;zoneName:string|null;maxSeconds:number;reportedState:ReportedState;safetyLockout:boolean;stateReason:string|null;fresh:boolean;observedAt:string|null}
export interface ActuatorOverview {enabled:boolean;actuators:Actuator[]}
export interface ActuatorCommand {commandId:string;actuatorId:string;action:'ON'|'OFF'|'RESET_LOCKOUT';durationSeconds:number|null;issuedAt:string;expiresAt:string;state:string;reportedState:'ON'|'OFF'|null;errorCode:string|null;source:'MANUAL'|'SEQUENCE'}
export type Phase='WAITING'|'OPENING_VALVE'|'STARTING_PUMP'|'WATERING'|'CLOSING_VALVE'|'DONE'|'FAILED'|'SKIPPED';
export interface SequenceStep {stepNo:number;valveId:string;zoneName:string;pumpSeconds:number;phase:Phase;phaseStartedAt:string|null;result:string|null}
export interface SequenceRun {id:number;state:'RUNNING'|'COMPLETED'|'ABORTED';createdAt:string;finishedAt:string|null;result:string|null;currentStep:number;steps:SequenceStep[]}
export interface SequenceView {enabled:boolean;current:SequenceRun|null;recent:SequenceRun[]}

const obj=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const id=(v:unknown):v is string=>typeof v==='string'&&/^[A-Z][A-Z0-9]{1,15}$/.test(v);
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const text=(v:unknown,max:number)=>v===null||(typeof v==='string'&&v.length>=1&&v.length<=max);
const PHASES:readonly Phase[]=['WAITING','OPENING_VALVE','STARTING_PUMP','WATERING','CLOSING_VALVE','DONE','FAILED','SKIPPED'];
const CAPS:Record<ActuatorType,number>={VALVE:3600,FAN:14400,LIGHT:14400,MIST:600};

export function parseOverview(v:unknown):ActuatorOverview{
 if(!obj(v)||typeof v.enabled!=='boolean'||!Array.isArray(v.actuators))throw new Error('Danh sách actuator không hợp lệ.');
 const seen=new Set<string>();
 for(const a of v.actuators){
  if(!obj(a)||!id(a.actuatorId)||a.actuatorId==='PUMP01'||seen.has(a.actuatorId)||!(a.actuatorType in CAPS)
   ||!Number.isInteger(a.maxSeconds)||a.maxSeconds<1||a.maxSeconds>CAPS[a.actuatorType as ActuatorType]
   ||(a.actuatorType==='VALVE')!==(typeof a.zoneName==='string'&&a.zoneName.length>0)||(a.actuatorType!=='VALVE'&&a.zoneName!==null)
   ||!['ON','OFF','UNKNOWN'].includes(a.reportedState)||typeof a.safetyLockout!=='boolean'||typeof a.fresh!=='boolean'
   ||(a.observedAt!==null&&!date(a.observedAt))||!text(a.stateReason,40)
   ||(!a.fresh&&a.reportedState!=='UNKNOWN')||(a.fresh&&a.observedAt===null))throw new Error('Actuator không hợp lệ.');
  seen.add(a.actuatorId);
 }
 return v as ActuatorOverview;
}

export function parseCommands(v:unknown):ActuatorCommand[]{
 if(!Array.isArray(v)||!v.every(c=>obj(c)&&uuid(c.commandId)&&id(c.actuatorId)&&['ON','OFF','RESET_LOCKOUT'].includes(c.action)
  &&(c.action==='ON'?Number.isInteger(c.durationSeconds)&&c.durationSeconds>=1:c.durationSeconds===null)
  &&date(c.issuedAt)&&date(c.expiresAt)&&typeof c.state==='string'&&['MANUAL','SEQUENCE'].includes(c.source)
  &&(c.reportedState===null||['ON','OFF'].includes(c.reportedState))&&text(c.errorCode,80)))throw new Error('Lịch sử lệnh không hợp lệ.');
 return v as ActuatorCommand[];
}

function parseRun(r:unknown):SequenceRun{
 if(!obj(r)||!Number.isInteger(r.id)||!['RUNNING','COMPLETED','ABORTED'].includes(r.state)||!date(r.createdAt)
  ||(r.state==='RUNNING')!==(r.finishedAt===null)||(r.finishedAt!==null&&!date(r.finishedAt))||!text(r.result,120)
  ||!Number.isInteger(r.currentStep)||!Array.isArray(r.steps)||r.steps.length<1||r.steps.length>4)throw new Error('Lượt tưới không hợp lệ.');
 r.steps.forEach((s:unknown,i:number)=>{
  if(!obj(s)||s.stepNo!==i+1||!id(s.valveId)||typeof s.zoneName!=='string'||!Number.isInteger(s.pumpSeconds)||s.pumpSeconds<1||s.pumpSeconds>1800
   ||!PHASES.includes(s.phase)||(s.phaseStartedAt!==null&&!date(s.phaseStartedAt))||!text(s.result,120))throw new Error('Bước tưới không hợp lệ.');
 });
 return r as SequenceRun;
}
export function parseSequence(v:unknown):SequenceView{
 if(!obj(v)||typeof v.enabled!=='boolean'||!Array.isArray(v.recent))throw new Error('Trạng thái tưới theo zone không hợp lệ.');
 const recent=v.recent.map(parseRun);
 const current=v.current===null?null:parseRun(v.current);
 if(current&&current.state!=='RUNNING')throw new Error('Lượt đang chạy không hợp lệ.');
 return {enabled:v.enabled,current,recent};
}

/** Builds the start body or explains what is wrong; never sends a guessed duration. */
export function zoneRequest(rows:{valveId:string;selected:boolean;minutes:number}[],valves:Actuator[]):{zones:{valveId:string;pumpSeconds:number}[]}|string{
 const zones=rows.filter(r=>r.selected).map(r=>({valveId:r.valveId,pumpSeconds:Math.round(r.minutes*60)}));
 if(zones.length===0)return 'Chọn ít nhất một zone.';
 if(zones.length>4)return 'Tối đa 4 zone mỗi lượt.';
 for(const z of zones){
  const valve=valves.find(v=>v.actuatorId===z.valveId);
  if(!valve||valve.actuatorType!=='VALVE')return `Van ${z.valveId} không tồn tại.`;
  if(!Number.isInteger(z.pumpSeconds)||z.pumpSeconds<1||z.pumpSeconds>1800)return 'Thời gian bơm mỗi zone 1 giây – 30 phút.';
  if(z.pumpSeconds+60>valve.maxSeconds)return `Giới hạn van ${z.valveId} quá ngắn cho thời gian này.`;
 }
 return {zones};
}

export const typeLabel:Record<ActuatorType,string>={VALVE:'Van zone',FAN:'Quạt',LIGHT:'Đèn',MIST:'Phun sương'};
export const phaseLabel:Record<Phase,string>={WAITING:'Chờ',OPENING_VALVE:'Đang mở van',STARTING_PUMP:'Đang bật bơm',WATERING:'Đang tưới',CLOSING_VALVE:'Đang đóng van',DONE:'Xong',FAILED:'Lỗi',SKIPPED:'Bỏ qua'};
const reasons:Record<string,string>={BOOT:'Khởi động',COMMAND_ON:'Lệnh bật',COMMAND_OFF:'Lệnh tắt',LOCKOUT_RESET:'Đã mở khóa',TIMER_EXPIRED:'Hết giờ',CONNECTION_LOST:'Mất kết nối',DEVICE_FAULT:'Lỗi thiết bị',WATER_LOW:'Cạn nước'};
export const reasonLabel=(r:string|null)=>r===null?'—':reasons[r]??r;
export function resultLabel(r:string|null){
 if(r===null)return '—';
 const [head,...rest]=r.split(' ');
 const map:Record<string,string>={COMPLETED:'Hoàn tất',CANCELLED:'Đã hủy',VALVE_OPEN_FAILED:'Van không mở',VALVE_OPEN_TIMEOUT:'Van không xác nhận mở',PUMP_START_FAILED:'Bơm không bật',PUMP_START_TIMEOUT:'Bơm không xác nhận bật',
  PUMP_STOPPED:'Bơm dừng bất thường',VALVE_CLOSED_EARLY:'Van đóng sớm',PUMP_DID_NOT_STOP:'Bơm không tự tắt',VALVE_CLOSE_FAILED:'Van không đóng',VALVE_CLOSE_TIMEOUT:'Van không xác nhận đóng',
  WATERING_RULE_ENABLED:'Quy tắc tưới tự động được bật',COMMAND_REFUSED:'Lệnh bị từ chối',INTERNAL_ERROR:'Lỗi backend',OK:'Xong'};
 return (map[head]??head)+(rest.length?` (${rest.join(' ')})`:'');
}
