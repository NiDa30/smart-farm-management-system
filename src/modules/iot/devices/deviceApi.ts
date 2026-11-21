// Remote configuration and OTA for ENV01 (contract v4). Responses are validated before use;
// the device's own report (config-state, OTA stage) is what the screen shows as truth.
export interface Settings {telemetrySeconds:number;heartbeatSeconds:number;soilWetAdc:number;soilDryAdc:number;pumpMaxSeconds:number}
export type ConfigState='PENDING'|'SENT'|'PUBLISH_UNCERTAIN'|'APPLIED'|'REJECTED'|'TIMED_OUT';
export interface ConfigRequest {configId:string;revision:number;settings:Settings;issuedAt:string;state:ConfigState;errorCode:string|null;appliedRevision:number|null}
export interface DeviceState {revision:number;settings:Settings;firmwareVersion:string;partition:string;otaTrial:boolean;observedAt:string}
export interface ConfigView {enabled:boolean;device:DeviceState|null;requests:ConfigRequest[]}
export interface Release {version:string;size:number;sha256:string;signature:string;url:string;createdAt:string}
export type OtaState='SENT'|'PUBLISH_UNCERTAIN'|'RECEIVED'|'DOWNLOADING'|'REBOOTING'|'REJECTED'|'FAILED'|'CONFIRMED'|'ROLLED_BACK'|'TIMED_OUT';
export interface OtaJob {otaId:string;version:string;fromVersion:string|null;issuedAt:string;state:OtaState;progress:number|null;errorCode:string|null;updatedAt:string}
export interface OtaView {enabled:boolean;signingKeyConfigured:boolean;runningVersion:string|null;releases:Release[];jobs:OtaJob[]}

const obj=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const int=(v:unknown,lo:number,hi:number)=>Number.isInteger(v)&&(v as number)>=lo&&(v as number)<=hi;
const code=(v:unknown)=>v===null||(typeof v==='string'&&v.length>=1&&v.length<=80);
const VERSION=/^[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9]{1,8})?$/;
const CONFIG_STATES:readonly ConfigState[]=['PENDING','SENT','PUBLISH_UNCERTAIN','APPLIED','REJECTED','TIMED_OUT'];
const OTA_STATES:readonly OtaState[]=['SENT','PUBLISH_UNCERTAIN','RECEIVED','DOWNLOADING','REBOOTING','REJECTED','FAILED','CONFIRMED','ROLLED_BACK','TIMED_OUT'];
export const OTA_ACTIVE:readonly OtaState[]=['SENT','PUBLISH_UNCERTAIN','RECEIVED','DOWNLOADING','REBOOTING'];

/** Same bounds as the firmware and backend; returns an explanation or null. */
export function settingsError(s:Settings):string|null{
 if(!int(s.telemetrySeconds,5,10))return 'Chu kỳ gửi dữ liệu 5–10 giây (backend coi dữ liệu cũ sau 15 giây).';
 if(!int(s.heartbeatSeconds,5,20))return 'Chu kỳ heartbeat 5–20 giây (offline sau 30 giây).';
 if(!int(s.soilWetAdc,0,4095)||!int(s.soilDryAdc,0,4095)||Math.abs(s.soilDryAdc-s.soilWetAdc)<200)return 'Hiệu chuẩn độ ẩm đất 0–4095, ướt và khô cách nhau ít nhất 200.';
 if(!int(s.pumpMaxSeconds,1,3600))return 'Giới hạn bơm 1–3600 giây.';
 return null;
}
const settings=(v:unknown):v is Settings=>obj(v)&&Object.keys(v).length===5&&settingsError(v as Settings)===null;

export function parseConfig(v:unknown):ConfigView{
 if(!obj(v)||typeof v.enabled!=='boolean'||!Array.isArray(v.requests))throw new Error('Cấu hình thiết bị không hợp lệ.');
 const d=v.device;
 if(d!==null&&!(obj(d)&&int(d.revision,0,4294967295)&&settings(d.settings)&&typeof d.firmwareVersion==='string'&&d.firmwareVersion.length>=5
  &&typeof d.partition==='string'&&d.partition.length>0&&typeof d.otaTrial==='boolean'&&date(d.observedAt)))throw new Error('Trạng thái thiết bị không hợp lệ.');
 for(const r of v.requests)if(!(obj(r)&&uuid(r.configId)&&int(r.revision,1,4294967295)&&settings(r.settings)&&date(r.issuedAt)
  &&CONFIG_STATES.includes(r.state)&&code(r.errorCode)&&(r.appliedRevision===null||int(r.appliedRevision,0,4294967295))
  &&(r.state!=='REJECTED'||r.errorCode!==null)))throw new Error('Yêu cầu cấu hình không hợp lệ.');
 return v as ConfigView;
}

export function parseOta(v:unknown):OtaView{
 if(!obj(v)||typeof v.enabled!=='boolean'||typeof v.signingKeyConfigured!=='boolean'||(v.runningVersion!==null&&typeof v.runningVersion!=='string')
  ||!Array.isArray(v.releases)||!Array.isArray(v.jobs))throw new Error('Trạng thái OTA không hợp lệ.');
 for(const r of v.releases)if(!(obj(r)&&typeof r.version==='string'&&VERSION.test(r.version)&&int(r.size,1024,1310720)&&typeof r.sha256==='string'
  &&/^[0-9a-f]{64}$/.test(r.sha256)&&typeof r.signature==='string'&&typeof r.url==='string'&&r.url.startsWith('https://')&&date(r.createdAt)))throw new Error('Bản firmware không hợp lệ.');
 let active=0;
 for(const j of v.jobs){
  if(!(obj(j)&&uuid(j.otaId)&&typeof j.version==='string'&&VERSION.test(j.version)&&(j.fromVersion===null||typeof j.fromVersion==='string')
   &&date(j.issuedAt)&&OTA_STATES.includes(j.state)&&(j.progress===null||int(j.progress,0,100))&&code(j.errorCode)&&date(j.updatedAt)))throw new Error('Lượt OTA không hợp lệ.');
  if(OTA_ACTIVE.includes(j.state))active++;
 }
 if(active>1)throw new Error('Nhiều lượt OTA cùng chạy: dữ liệu không nhất quán.');
 return v as OtaView;
}

export const configStateLabel:Record<ConfigState,string>={PENDING:'Đang tạo',SENT:'Đã gửi, chờ ACK',PUBLISH_UNCERTAIN:'Chưa xác nhận gửi',APPLIED:'Thiết bị đã áp dụng',REJECTED:'Thiết bị từ chối',TIMED_OUT:'Không có ACK'};
export const otaStateLabel:Record<OtaState,string>={SENT:'Đã gửi',PUBLISH_UNCERTAIN:'Chưa xác nhận gửi',RECEIVED:'Thiết bị đã nhận',DOWNLOADING:'Đang tải',REBOOTING:'Đang khởi động bản mới',
 REJECTED:'Thiết bị từ chối',FAILED:'Lỗi tải/kiểm tra',CONFIRMED:'Bản mới đã xác nhận',ROLLED_BACK:'Đã quay về bản cũ',TIMED_OUT:'Không có phản hồi'};
const errors:Record<string,string>={STALE_REVISION:'revision cũ',ACTUATORS_ACTIVE:'còn thiết bị đang chạy',HASH_MISMATCH:'sai SHA-256',BAD_SIGNATURE:'sai chữ ký',
 URL_NOT_ALLOWED:'URL không được phép',OTA_DISABLED:'thiết bị chưa có khóa OTA',TRIAL_FAILED:'bản mới không khởi động ổn định',NO_DEVICE_REPORT:'thiết bị không báo cáo'};
export const errorLabel=(e:string|null)=>e===null?'':` (${errors[e]??e})`;
