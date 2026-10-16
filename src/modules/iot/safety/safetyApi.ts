import {validRoute,type PumpCircuitRoute} from '../control/pumpCircuitRoute';
import { validSettings, type WateringSettings } from '../automation/wateringSettings';
import type { Monitoring } from '../devices/monitoringApi';
export interface SafetyRule {
  enabled:boolean;lowCount:number;activeCommand:string|null;cooldownUntil:string|null;lastResult:string;
}
export interface LocalValveProof {version:1;enabled:true;dataSource:'SIMULATOR';state:'UNKNOWN'|'CLOSED'|'OPEN'|'CONFLICT';fault:'VALVE_NOT_OPEN'|'VALVE_PROOF_LOST'|'VALVE_SWITCH_CONFLICT'|null;route?:PumpCircuitRoute}
export interface DurableSafety {version:1;enabled:true;storage:'NVS';state:'READY'|'ARMED'|'LOCKED'|'STORAGE_FAULT'}
export interface SafetySnapshot {
  farmId:'FARM001';asOf:string;mqtt:Monitoring['mqtt'];controlEnabled:boolean;controlTransportConnected:boolean;
  sensor:{observedAt:string;receivedAt:string;soilMoisture:number}|null;
  relay:{observedAt:string;receivedAt:string;reportedState:'ON'|'OFF';safetyLockout:boolean;stateReason:string|null;valveInterlock?:LocalValveProof|null;durableSafety?:DurableSafety|null}|null;
  rule:SafetyRule;settings:WateringSettings;queue:{unresolved:number;overdue:number};
  recentProblems:{commandId:string;action:'ON'|'OFF'|'RESET_LOCKOUT';issuedAt:string;expiresAt:string;state:string;errorCode:string|null}[];
  stateHistory:{id:number;observedAt:string;receivedAt:string;reportedState:'ON'|'OFF';safetyLockout:boolean;changeType:string;stateReason:string|null}[];
}
const date=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const text=(v:unknown):v is string=>typeof v==='string';
const nullableText=(v:unknown)=>v===null||text(v);
const nullableDate=(v:unknown)=>v===null||date(v);
const count=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const states=['ON','OFF'];
const valveFaults=['VALVE_NOT_OPEN','VALVE_PROOF_LOST','VALVE_SWITCH_CONFLICT'];
const durableReasons=['RESTART_LOCKOUT','SAFETY_STORAGE_FAULT'];
const reasons=[...durableReasons,'BOOT','COMMAND_ON','COMMAND_OFF','LOCKOUT_RESET','TIMER_EXPIRED','CONNECTION_LOST','DEVICE_FAULT','WATER_LOW','FLOW_LOW','FLOW_SENSOR_FAULT',...valveFaults];
const reason=(v:unknown)=>v===null||text(v)&&reasons.includes(v);
const flowConsistent=(r:{stateReason:string|null;reportedState:string;safetyLockout:boolean})=>!['FLOW_LOW','FLOW_SENSOR_FAULT',...valveFaults,...durableReasons].includes(r.stateReason??'')||r.reportedState==='OFF'&&r.safetyLockout;
export function valveConsistent(r:NonNullable<SafetySnapshot['relay']>){const p=r.valveInterlock;
 if(p==null)return !valveFaults.includes(r.stateReason??'');
 if(typeof p!=='object'||Object.keys(p).filter(k=>k!=='route').sort().join(',')!=='dataSource,enabled,fault,state,version'||('route' in p&&!validRoute(p.route))||p.version!==1||p.enabled!==true||p.dataSource!=='SIMULATOR'||!['UNKNOWN','CLOSED','OPEN','CONFLICT'].includes(p.state)||!(p.fault===null||valveFaults.includes(p.fault)))return false;
 return !(p.fault!==null&&(r.reportedState!=='OFF'||!r.safetyLockout)||r.reportedState==='ON'&&(p.state!=='OPEN'||p.fault!==null||r.safetyLockout)||valveFaults.includes(r.stateReason??'')&&r.stateReason!==p.fault||r.stateReason==='LOCKOUT_RESET'&&(p.fault!==null||p.state!=='OPEN'));
}
export function durableConsistent(r:NonNullable<SafetySnapshot['relay']>){
 const d=r.durableSafety;if(d==null)return !durableReasons.includes(r.stateReason??'');
 if(typeof d!=='object'||Object.keys(d).sort().join(',')!=='enabled,state,storage,version'||d.version!==1||d.enabled!==true||d.storage!=='NVS'||!['READY','ARMED','LOCKED','STORAGE_FAULT'].includes(d.state))return false;
 const locked=d.state==='LOCKED'||d.state==='STORAGE_FAULT';
 return !(locked&&(r.reportedState!=='OFF'||!r.safetyLockout)||!locked&&r.safetyLockout||r.reportedState==='ON'&&d.state!=='ARMED'||d.state==='READY'&&r.reportedState!=='OFF'||r.stateReason==='RESTART_LOCKOUT'&&d.state!=='LOCKED'||r.stateReason==='SAFETY_STORAGE_FAULT'&&d.state!=='STORAGE_FAULT'||r.stateReason==='LOCKOUT_RESET'&&d.state!=='READY');
}
const uuid=(v:unknown)=>text(v)&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
export function parseSafety(value:unknown):SafetySnapshot {
  const v=value as SafetySnapshot;
  if(!v||v.farmId!=='FARM001'||!date(v.asOf)||!v.mqtt||!['DISABLED','STARTING','CONNECTED','DISCONNECTED','STOPPED'].includes(v.mqtt.state)
    ||!date(v.mqtt.changedAt)||!nullableDate(v.mqtt.lastProcessedAt)||typeof v.controlEnabled!=='boolean'||typeof v.controlTransportConnected!=='boolean'
    ||!(v.sensor===null||v.sensor&&date(v.sensor.observedAt)&&date(v.sensor.receivedAt)&&Number.isFinite(v.sensor.soilMoisture)&&v.sensor.soilMoisture>=0&&v.sensor.soilMoisture<=100)
    ||!(v.relay===null||v.relay&&date(v.relay.observedAt)&&date(v.relay.receivedAt)&&states.includes(v.relay.reportedState)&&typeof v.relay.safetyLockout==='boolean'&&reason(v.relay.stateReason)&&flowConsistent(v.relay)&&valveConsistent(v.relay)&&durableConsistent(v.relay))
    ||!v.rule||typeof v.rule.enabled!=='boolean'||!count(v.rule.lowCount)||v.rule.lowCount>2||!(v.rule.activeCommand===null||uuid(v.rule.activeCommand))||!nullableDate(v.rule.cooldownUntil)||!text(v.rule.lastResult)
    ||!validSettings(v.settings)||!v.queue||!count(v.queue.unresolved)||!count(v.queue.overdue)||v.queue.overdue>v.queue.unresolved
    ||!Array.isArray(v.recentProblems)||v.recentProblems.length>10||!v.recentProblems.every(c=>c&&uuid(c.commandId)&&['ON','OFF','RESET_LOCKOUT'].includes(c.action)&&date(c.issuedAt)&&date(c.expiresAt)&&['PENDING','SENT','PUBLISH_UNCERTAIN','FAILED','TIMED_OUT'].includes(c.state)&&nullableText(c.errorCode))
    ||!Array.isArray(v.stateHistory)||v.stateHistory.length>50||!v.stateHistory.every(h=>h&&count(h.id)&&h.id>0&&date(h.observedAt)&&date(h.receivedAt)&&states.includes(h.reportedState)&&typeof h.safetyLockout==='boolean'&&['FIRST_STATUS','NEW_BOOT','STATE_CHANGED'].includes(h.changeType)&&reason(h.stateReason)&&flowConsistent(h)))
    throw new Error('Phản hồi an toàn không hợp lệ.');
  return v;
}
export type Freshness='EMPTY'|'FRESH'|'STALE'|'CLOCK_SKEW';
// Both source and receipt must be fresh; this page uses the rule's 15s window, not sensor monitoring's 30s.
export function safetyFreshness(observation:{observedAt:string;receivedAt:string}|null,now:number):Freshness {
  if(!observation)return 'EMPTY';
  const source=Date.parse(observation.observedAt),receipt=Date.parse(observation.receivedAt);
  if(!Number.isFinite(source)||!Number.isFinite(receipt)||source>now+2000||receipt>now+2000)return 'CLOCK_SKEW';
  return now-source<15000&&now-receipt<15000?'FRESH':'STALE';
}
export const reasonLabels:Record<string,string>={BOOT:'Khởi động, relay OFF',COMMAND_ON:'Nhận lệnh bật',COMMAND_OFF:'Nhận lệnh tắt',LOCKOUT_RESET:'Đặt lại khóa an toàn',TIMER_EXPIRED:'Hết thời gian hẹn',CONNECTION_LOST:'Mất kết nối',DEVICE_FAULT:'Lỗi thiết bị',WATER_LOW:'Bồn cạn nước hoặc đứt dây phao',FLOW_LOW:'Thiếu lưu lượng tại bộ điều khiển (thiết bị báo)',FLOW_SENSOR_FAULT:'Tín hiệu lưu lượng tại bộ điều khiển lỗi (thiết bị báo)'};
export const ruleLabels:Record<string,string>={WAITING_SCHEDULE_SAMPLE:'Chờ mẫu mới trong khung giờ tưới',OUTSIDE_SCHEDULE:'Đang ngoài khung giờ tưới',DISABLED:'Đã tắt',RESTART_PAUSED:'Tạm dừng sau khởi động',WAITING_SAMPLES:'Chờ hai mẫu khô mới',STALE_SENSOR:'Dữ liệu cảm biến đã cũ',COMMAND_SENT:'Đã gửi ON, theo dõi ACK/trạng thái',COMMAND_UNCONFIRMED:'Lệnh chưa được xác nhận',STOP_REQUESTED:'Yêu cầu dừng',STOP_SENT:'Đã gửi OFF, chờ trạng thái',STOP_UNCONFIRMED:'Chưa xác nhận tắt',REPORTED_OFF:'Đã xác nhận OFF',MANUAL_HOLD:'Tạm dừng do điều khiển thủ công',DISPATCH_FAILED:'Chưa xác nhận gửi lệnh',COOLDOWN:'Đang nghỉ sau OFF xác nhận',SAFETY_LOCKOUT:'Bị chặn bởi khóa an toàn',DEVICE_NOT_READY:'Thiết bị chưa sẵn sàng',COMMAND_PENDING:'Còn lệnh chưa rõ kết quả',WAITING_NEW_SAMPLE:'Chờ mẫu mới',SOIL_NOT_LOW:'Đất chưa dưới ngưỡng tưới',EXECUTION_CONFIRMED:'Thiết bị đã ACK thực thi ON'};
Object.assign(reasonLabels,{VALVE_NOT_OPEN:'Chưa có phản hồi van mở tại bơm',VALVE_PROOF_LOST:'Mất phản hồi van mở khi bơm đang bật',VALVE_SWITCH_CONFLICT:'Hai công tắc van tại bơm mâu thuẫn'});

export const durableSafetyLabels:Record<DurableSafety['state'],string>={READY:'Đã reset khóa, chưa bật relay',ARMED:'Đã ghi khóa trước lần bật; chưa kết luận GPIO đang bật',LOCKED:'Thiết bị báo đang khóa, cần reset',STORAGE_FAULT:'Thiết bị báo lỗi lưu trữ, giữ OFF và khóa'};
Object.assign(reasonLabels,{RESTART_LOCKOUT:'Khóa sau khởi động lại; cần kiểm tra và reset',SAFETY_STORAGE_FAULT:'Lỗi đọc/ghi khóa NVS; thiết bị giữ OFF'});
