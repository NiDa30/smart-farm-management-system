export interface PumpIntent {requestId:string;action:'ON'|'OFF'|'RESET_LOCKOUT';durationSeconds:number|null;expectedBootId:string|null;intentRevision:number;reviewedAt:string}
export interface IntentContext {revision:number;asOf:string;bootId:string|null;ready:boolean}
export interface PumpCommand {commandId:string;action:string;durationSeconds:number|null;issuedAt:string;expiresAt:string;state:string;reportedState:string|null;errorCode:string|null}
export interface PumpReceipt {request:PumpIntent;command:PumpCommand}
const uuid=(s:unknown):s is string=>typeof s==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(s);
const date=(s:unknown):s is string=>typeof s==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(s)&&Number.isFinite(Date.parse(s));
export function validContext(c:any):c is IntentContext{return !!c&&Number.isSafeInteger(c.revision)&&c.revision>0&&date(c.asOf)&&(c.bootId===null||uuid(c.bootId))&&typeof c.ready==='boolean';}
export function validIntent(r:any):r is PumpIntent{return !!r&&uuid(r.requestId)&&['ON','OFF','RESET_LOCKOUT'].includes(r.action)&&Number.isSafeInteger(r.intentRevision)&&r.intentRevision>0&&date(r.reviewedAt)&&(r.action==='OFF'?r.expectedBootId===null||uuid(r.expectedBootId):uuid(r.expectedBootId))&&(r.action==='ON'?Number.isInteger(r.durationSeconds)&&r.durationSeconds>=1&&r.durationSeconds<=3600:r.durationSeconds===null);}
const micros=(s:string)=>BigInt(Date.parse(s))*1000n+BigInt((s.match(/\.(\d+)(?:Z|[+-]\d\d:\d\d)$/)?.[1]??'').padEnd(6,'0').slice(3,6));
export function parseReceipt(v:any,expected:PumpIntent):PumpReceipt{const c=v?.command,r=v?.request;
 if(!validIntent(r)||!validIntent(expected)||r.requestId!==expected.requestId||r.action!==expected.action||r.durationSeconds!==expected.durationSeconds||r.expectedBootId!==expected.expectedBootId||r.intentRevision!==expected.intentRevision||micros(r.reviewedAt)!==micros(expected.reviewedAt)
  ||(c?.state==='EXECUTED'&&c.reportedState!==(r.action==='ON'?'ON':'OFF'))||(c?.state==='FAILED'&&(typeof c.errorCode!=='string'||!c.errorCode.length))
  ||!c||c.commandId!==r.requestId||c.action!==r.action||c.durationSeconds!==r.durationSeconds||!date(c.issuedAt)||!date(c.expiresAt)||Date.parse(c.expiresAt)-Date.parse(c.issuedAt)!==10000||!['PENDING','SENT','EXECUTED','FAILED','TIMED_OUT','PUBLISH_UNCERTAIN'].includes(c.state)||(c.reportedState!==null&&!['ON','OFF'].includes(c.reportedState))||(c.errorCode!==null&&typeof c.errorCode!=='string'))throw new Error('Phản hồi yêu cầu không khớp.');
 return v;
}
export const PENDING_KEY='smartfarm:PUMP01:http-intents:v1';
export function loadIntents():PumpIntent[]{try{const v=JSON.parse(sessionStorage.getItem(PENDING_KEY)??'[]');return Array.isArray(v)&&v.length<=20&&v.every(validIntent)&&new Set(v.map(x=>x.requestId)).size===v.length?v:[];}catch{return [];}}

export interface PumpOwnership {unresolvedCount:number;blocked:boolean;holder:{commandId:string;source:'LEGACY'|'MANUAL'|'AUTOMATION';reservedAt:string;releasable:boolean}|null}
export function validOwnership(v:any):v is PumpOwnership {return !!v&&Number.isSafeInteger(v.unresolvedCount)&&v.unresolvedCount>=0&&typeof v.blocked==='boolean'&&(v.unresolvedCount===0?v.holder===null&&!v.blocked:!!v.holder&&uuid(v.holder.commandId)&&['LEGACY','MANUAL','AUTOMATION'].includes(v.holder.source)&&date(v.holder.reservedAt)&&typeof v.holder.releasable==='boolean'&&(v.holder.releasable||v.blocked)&&(v.unresolvedCount!==1||v.blocked!==v.holder.releasable));}
