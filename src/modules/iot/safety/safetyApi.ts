import { validSettings, type WateringSettings } from '../automation/wateringSettings';
import type { Monitoring } from '../devices/monitoringApi';
export interface SafetyRule {
  enabled:boolean;lowCount:number;activeCommand:string|null;cooldownUntil:string|null;lastResult:string;
}
export interface SafetySnapshot {
  farmId:'FARM001';asOf:string;mqtt:Monitoring['mqtt'];controlEnabled:boolean;controlTransportConnected:boolean;
  sensor:{observedAt:string;receivedAt:string;soilMoisture:number}|null;
  relay:{observedAt:string;receivedAt:string;reportedState:'ON'|'OFF';safetyLockout:boolean;stateReason:string|null}|null;
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
const reasons=['BOOT','COMMAND_ON','COMMAND_OFF','LOCKOUT_RESET','TIMER_EXPIRED','CONNECTION_LOST','DEVICE_FAULT'];
const reason=(v:unknown)=>v===null||text(v)&&reasons.includes(v);
const uuid=(v:unknown)=>text(v)&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
export function parseSafety(value:unknown):SafetySnapshot {
  const v=value as SafetySnapshot;
  if(!v||v.farmId!=='FARM001'||!date(v.asOf)||!v.mqtt||!['DISABLED','STARTING','CONNECTED','DISCONNECTED','STOPPED'].includes(v.mqtt.state)
    ||!date(v.mqtt.changedAt)||!nullableDate(v.mqtt.lastProcessedAt)||typeof v.controlEnabled!=='boolean'||typeof v.controlTransportConnected!=='boolean'
    ||!(v.sensor===null||v.sensor&&date(v.sensor.observedAt)&&date(v.sensor.receivedAt)&&Number.isFinite(v.sensor.soilMoisture)&&v.sensor.soilMoisture>=0&&v.sensor.soilMoisture<=100)
    ||!(v.relay===null||v.relay&&date(v.relay.observedAt)&&date(v.relay.receivedAt)&&states.includes(v.relay.reportedState)&&typeof v.relay.safetyLockout==='boolean'&&reason(v.relay.stateReason))
    ||!v.rule||typeof v.rule.enabled!=='boolean'||!count(v.rule.lowCount)||v.rule.lowCount>2||!(v.rule.activeCommand===null||uuid(v.rule.activeCommand))||!nullableDate(v.rule.cooldownUntil)||!text(v.rule.lastResult)
    ||!validSettings(v.settings)||!v.queue||!count(v.queue.unresolved)||!count(v.queue.overdue)||v.queue.overdue>v.queue.unresolved
    ||!Array.isArray(v.recentProblems)||v.recentProblems.length>10||!v.recentProblems.every(c=>c&&uuid(c.commandId)&&['ON','OFF','RESET_LOCKOUT'].includes(c.action)&&date(c.issuedAt)&&date(c.expiresAt)&&['PENDING','SENT','PUBLISH_UNCERTAIN','FAILED','TIMED_OUT'].includes(c.state)&&nullableText(c.errorCode))
    ||!Array.isArray(v.stateHistory)||v.stateHistory.length>50||!v.stateHistory.every(h=>h&&count(h.id)&&h.id>0&&date(h.observedAt)&&date(h.receivedAt)&&states.includes(h.reportedState)&&typeof h.safetyLockout==='boolean'&&['FIRST_STATUS','NEW_BOOT','STATE_CHANGED'].includes(h.changeType)&&reason(h.stateReason)))
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
export const reasonLabels:Record<string,string>={BOOT:'Khởi động, relay OFF',COMMAND_ON:'Nhận lệnh bật',COMMAND_OFF:'Nhận lệnh tắt',LOCKOUT_RESET:'Đặt lại khóa an toàn',TIMER_EXPIRED:'Hết thời gian hẹn',CONNECTION_LOST:'Mất kết nối',DEVICE_FAULT:'Lỗi thiết bị'};
export const ruleLabels:Record<string,string>={DISABLED:'Đã tắt',RESTART_PAUSED:'Tạm dừng sau khởi động',WAITING_SAMPLES:'Chờ hai mẫu khô mới',STALE_SENSOR:'Dữ liệu cảm biến đã cũ',COMMAND_SENT:'Đã gửi ON, theo dõi ACK/trạng thái',COMMAND_UNCONFIRMED:'Lệnh chưa được xác nhận',STOP_REQUESTED:'Yêu cầu dừng',STOP_SENT:'Đã gửi OFF, chờ trạng thái',STOP_UNCONFIRMED:'Chưa xác nhận tắt',REPORTED_OFF:'Đã xác nhận OFF',MANUAL_HOLD:'Tạm dừng do điều khiển thủ công',DISPATCH_FAILED:'Chưa xác nhận gửi lệnh',COOLDOWN:'Đang nghỉ sau OFF xác nhận',SAFETY_LOCKOUT:'Bị chặn bởi khóa an toàn',DEVICE_NOT_READY:'Thiết bị chưa sẵn sàng',COMMAND_PENDING:'Còn lệnh chưa rõ kết quả',WAITING_NEW_SAMPLE:'Chờ mẫu mới',SOIL_NOT_LOW:'Đất chưa dưới ngưỡng tưới',EXECUTION_CONFIRMED:'Thiết bị đã ACK thực thi ON'};
