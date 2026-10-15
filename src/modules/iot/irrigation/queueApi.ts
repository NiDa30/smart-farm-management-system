import {parseCircuit,type CircuitConfig} from './circuitApi';
import {validZone,type ZoneConfig} from '../zones/zoneApi';
export type QueueState='QUEUED'|'REHEARSING'|'REHEARSED'|'CANCELLED'|'EXPIRED'|'INVALIDATED'|'INTERRUPTED';
export interface QueueItem {requestId:string;ticket:number;zoneId:string;zoneRevision:number;zoneSnapshot:ZoneConfig;circuitSnapshot?:CircuitConfig|null;durationSeconds:number;requestedAt:string;enqueuedAt:string;expiresAt:string;state:QueueState;startedAt:string|null;plannedEndAt:string|null;finishedAt:string|null;reason:string}
export interface QueueSnapshot {mode:'PREVIEW_ONLY';asOf:string;revision:number;capacity:50;waitTtlSeconds:300;active:QueueItem|null;waiting:QueueItem[];history:QueueItem[]}
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const positive=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0;
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const reasons:Record<QueueState,string[]>={QUEUED:['WAITING'],REHEARSING:['PREVIEW_STARTED'],REHEARSED:['PREVIEW_FINISHED'],CANCELLED:['USER_CANCELLED'],EXPIRED:['WAIT_EXPIRED'],INVALIDATED:['ZONE_CHANGED','CIRCUIT_CHANGED'],INTERRUPTED:['ZONE_CHANGED','CIRCUIT_CHANGED','BACKEND_RESTARTED']};
export function parseQueueItem(value:unknown):QueueItem {
 if(!object(value))throw new Error('Yêu cầu hàng chờ không hợp lệ.');const v=value as QueueItem;
 if(!uuid(v.requestId)||!positive(v.ticket)||!validZone(v.zoneSnapshot)||v.zoneSnapshot.expectedSource!=='SIMULATOR'||v.zoneId!==v.zoneSnapshot.zoneId||v.zoneRevision!==v.zoneSnapshot.revision
  ||!positive(v.durationSeconds)||v.durationSeconds>30||!date(v.requestedAt)||!date(v.enqueuedAt)||!date(v.expiresAt)||Math.abs(Date.parse(v.expiresAt)-Date.parse(v.enqueuedAt)-300000)>1
  ||!Object.hasOwn(reasons,v.state)||!reasons[v.state].includes(v.reason))throw new Error('Dữ liệu hàng chờ không khớp.');
 if(v.circuitSnapshot!=null){const c=parseCircuit(v.circuitSnapshot);if(c.zoneId!==v.zoneId||c.zoneRevision!==v.zoneRevision||c.expectedSource!==v.zoneSnapshot.expectedSource)throw new Error('Bản chụp nhánh không khớp vùng.');}
 const started=v.startedAt!==null,finished=!['QUEUED','REHEARSING'].includes(v.state);
 if(started!==date(v.startedAt)||started!==date(v.plannedEndAt)||finished!==date(v.finishedAt)||!finished&&v.finishedAt!==null
  ||!started&&v.plannedEndAt!==null||v.state==='QUEUED'&&started||['REHEARSING','REHEARSED','INTERRUPTED'].includes(v.state)&&!started
  ||started&&Math.abs(Date.parse(v.plannedEndAt!)-Date.parse(v.startedAt!)-v.durationSeconds*1000)>1
  ||started&&Date.parse(v.startedAt!)<Date.parse(v.enqueuedAt)||finished&&Date.parse(v.finishedAt!)<Date.parse(v.enqueuedAt)
  ||v.state==='REHEARSED'&&Date.parse(v.finishedAt!)<Date.parse(v.plannedEndAt!))throw new Error('Mốc thời gian diễn tập không hợp lệ.');
 return v;
}
export function parseQueue(value:unknown):QueueSnapshot {
 if(!object(value)||value.mode!=='PREVIEW_ONLY'||!date(value.asOf)||!positive(value.revision)||value.capacity!==50||value.waitTtlSeconds!==300||!Array.isArray(value.waiting)||!Array.isArray(value.history))throw new Error('Phản hồi hàng chờ không hợp lệ.');
 const active=value.active===null?null:parseQueueItem(value.active),waiting=value.waiting.map(parseQueueItem),history=value.history.map(parseQueueItem);
 if(active&&active.state!=='REHEARSING'||waiting.some(v=>v.state!=='QUEUED')||history.some(v=>['QUEUED','REHEARSING'].includes(v.state))||waiting.length+(active?1:0)>50||history.length>20
  ||waiting.some((v,i)=>i>0&&v.ticket<=waiting[i-1].ticket)||history.some((v,i)=>i>0&&v.ticket>=history[i-1].ticket))throw new Error('Thứ tự hàng chờ không hợp lệ.');
 const all=[...(active?[active]:[]),...waiting,...history];if(new Set(all.map(v=>v.requestId)).size!==all.length||new Set(all.map(v=>v.ticket)).size!==all.length)throw new Error('Yêu cầu hàng chờ bị trùng.');
 return {...value,active,waiting,history} as QueueSnapshot;
}
export const queueLabels:Record<QueueState,string>={QUEUED:'Đang chờ',REHEARSING:'Đang diễn tập',REHEARSED:'Đã diễn tập',CANCELLED:'Đã hủy',EXPIRED:'Hết hạn chờ',INVALIDATED:'Cấu hình đã đổi',INTERRUPTED:'Diễn tập bị gián đoạn'};
