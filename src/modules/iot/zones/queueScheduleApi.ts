import {parseCircuit,type CircuitConfig} from '../irrigation/circuitApi';
import {validZone,type ZoneConfig} from './zoneApi';
import {historyMicros} from '../irrigation/sessionHistoryApi';
export interface ScheduleSlot {days:number[];time:string}
export interface ScheduleSave {revision:number;enabled:boolean;zoneRevision:number;circuitId:string;circuitRevision:number;durationSeconds:number;timezone:'Asia/Ho_Chi_Minh';slots:ScheduleSlot[];reviewedAt:string}
export interface SchedulePlan {revision:number;definition:ScheduleSave;zoneSnapshot:ZoneConfig;circuitSnapshot:CircuitConfig|null;updatedAt:string}
export interface ScheduleOccurrence {dueAt:string;scheduleRevision:number;definition:ScheduleSave;state:'QUEUED'|'SKIPPED';reason:string;requestId:string|null;evaluatedAt:string}
export interface ScheduleView {mode:'SCHEDULE_TO_QUEUE';zoneId:string;asOf:string;workerEnabled:boolean;lastTickAt:string|null;lastTickResult:string;zoneRevision:number;circuit:CircuitConfig|null;configurationState:'NO_PLAN'|'CURRENT'|'CONFIG_CHANGED';plan:SchedulePlan|null;nextDueAt:string|null;occurrences:ScheduleOccurrence[]}
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const count=(v:unknown,min=0)=>Number.isSafeInteger(v)&&Number(v)>=min;
const code=(v:unknown)=>typeof v==='string'&&/^[A-Z][A-Z0-9_-]{1,31}$/.test(v);
export const scheduleReasons:Record<string,string>={REQUEST_CREATED:'Đã tạo lượt chờ',CONFIG_CHANGED:'Bỏ qua: cấu hình vùng/nhánh đã đổi',ZONE_ALREADY_WAITING:'Bỏ qua: vùng đã có lượt đang chờ hoặc diễn tập',QUEUE_FULL:'Bỏ qua: hàng chờ đã đầy'};
export function normalizeSchedule(v:ScheduleSave):ScheduleSave {
 if(!v||!count(v.revision)||v.revision>=Number.MAX_SAFE_INTEGER||typeof v.enabled!=='boolean'||!count(v.zoneRevision,1)||!code(v.circuitId)||!count(v.circuitRevision,1)||!count(v.durationSeconds,1)||v.durationSeconds>10||v.timezone!=='Asia/Ho_Chi_Minh'||!date(v.reviewedAt)||!Array.isArray(v.slots)||v.slots.length>8||v.enabled&&v.slots.length===0)throw new Error('Chọn nhánh hợp lệ, 1–10 giây và tối đa 8 giờ theo tuần.');
 const seen=new Set<string>();const slots=v.slots.map(s=>{
  if(!s||!Array.isArray(s.days)||!s.days.length||s.days.length>7||s.days.some(d=>!count(d,1)||d>7)||new Set(s.days).size!==s.days.length||typeof s.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time))throw new Error('Chọn ít nhất một thứ và giờ HH:mm cho mỗi dòng.');
  for(const day of s.days){const key=day+'/'+s.time;if(seen.has(key))throw new Error('Có ngày và giờ bị trùng giữa các dòng.');seen.add(key);}
  return {days:[...s.days].sort((a,b)=>a-b),time:s.time};
 }).sort((a,b)=>a.time.localeCompare(b.time)||a.days.toString().localeCompare(b.days.toString()));
 return {revision:v.revision,enabled:v.enabled,zoneRevision:v.zoneRevision,circuitId:v.circuitId,circuitRevision:v.circuitRevision,durationSeconds:v.durationSeconds,timezone:v.timezone,slots,reviewedAt:v.reviewedAt};
}
export function sameSchedule(a:ScheduleSave,b:ScheduleSave){const {reviewedAt:at,...x}=normalizeSchedule(a),{reviewedAt:bt,...y}=normalizeSchedule(b);return JSON.stringify(x)===JSON.stringify(y)&&historyMicros(at)===historyMicros(bt);}
export function parseQueueSchedule(v:any,zone:string):ScheduleView {
 if(!v||v.mode!=='SCHEDULE_TO_QUEUE'||v.zoneId!==zone||!date(v.asOf)||typeof v.workerEnabled!=='boolean'||!(v.lastTickAt===null||date(v.lastTickAt))||!['DISABLED','STARTUP_SKIPPED','EVALUATED','GAP_SKIPPED'].includes(v.lastTickResult)||!count(v.zoneRevision,1)||!['NO_PLAN','CURRENT','CONFIG_CHANGED'].includes(v.configurationState)||!(v.nextDueAt===null||date(v.nextDueAt))||!Array.isArray(v.occurrences)||v.occurrences.length>20)throw new Error('Phản hồi lịch không khớp vùng.');
 if(v.circuit!==null){parseCircuit(v.circuit);if(v.circuit.zoneId!==zone)throw new Error('Nhánh thuộc vùng khác.');}
 if(v.plan!==null){const p=v.plan;normalizeSchedule(p.definition);if(!count(p.revision,1)||p.definition.revision!==p.revision-1||!validZone(p.zoneSnapshot)||p.zoneSnapshot.zoneId!==zone||!date(p.updatedAt))throw new Error('Phiên bản lịch không hợp lệ.');if(p.circuitSnapshot!==null){parseCircuit(p.circuitSnapshot);if(p.circuitSnapshot.zoneId!==zone)throw new Error('Snapshot nhánh thuộc vùng khác.');}}
 if((v.configurationState==='NO_PLAN')!==(v.plan===null)||v.nextDueAt!==null&&(!v.workerEnabled||!v.plan?.definition.enabled||v.configurationState!=='CURRENT'||historyMicros(v.nextDueAt)<=historyMicros(v.asOf)))throw new Error('Mốc lịch tiếp theo chưa đủ điều kiện.');
 const seen=new Set<string>();for(const [i,e]of v.occurrences.entries()){
  if(!date(e.dueAt)||!date(e.evaluatedAt)||historyMicros(e.dueAt)>historyMicros(e.evaluatedAt)||!count(e.scheduleRevision,1)||!['QUEUED','SKIPPED'].includes(e.state)||!Object.hasOwn(scheduleReasons,e.reason)||seen.has(e.dueAt)||i>0&&historyMicros(v.occurrences[i-1].dueAt)<=historyMicros(e.dueAt))throw new Error('Lần đánh giá lịch không hợp lệ.');
  normalizeSchedule(e.definition);if(e.definition.revision!==e.scheduleRevision-1||!e.definition.enabled||(e.state==='QUEUED')!==(e.reason==='REQUEST_CREATED')||(e.state==='QUEUED'?!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(e.requestId):e.requestId!==null))throw new Error('Lượt chờ không khớp kết quả lịch.');seen.add(e.dueAt);
 }return v;
}
const url=(zone:string)=>'/api/v1/irrigation-zones/'+encodeURIComponent(zone)+'/queue-schedule';
export async function readQueueSchedule(zone:string,signal:AbortSignal){const r=await fetch(url(zone),{signal,cache:'no-store'});if(!r.ok)throw new Error('Không đọc được lịch vùng.');return parseQueueSchedule(await r.json(),zone);}
export class ScheduleSaveError extends Error {constructor(message:string,readonly uncertain:boolean){super(message);}}
export async function saveQueueSchedule(zone:string,input:ScheduleSave,signal:AbortSignal){
 const body=normalizeSchedule(input);let r:Response;try{r=await fetch(url(zone),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});}catch{throw new ScheduleSaveError('Chưa rõ kết quả lưu lịch. Chỉ đọc đối chiếu trước khi thao tác tiếp.',true);}
 if(r.status===400||r.status===409)throw new ScheduleSaveError(r.status===409?'Lịch hoặc mapping đã đổi; đọc bản hiện tại trước khi lưu.':'Lịch không hợp lệ; kiểm tra ngày, giờ và thời lượng.',false);
 try{if(!r.ok)throw new Error();const v=parseQueueSchedule(await r.json(),zone);if(v.plan?.revision!==body.revision+1||!sameSchedule(v.plan.definition,body))throw new Error();return v;}catch{throw new ScheduleSaveError('Chưa xác nhận phản hồi lưu lịch. Đọc đối chiếu, không tự gửi lại.',true);}
}
