import {parseCircuit,parseObservation,type CircuitConfig,type ValveObservation} from './circuitApi';
export type ValveCondition='ALL'|'FAULT'|'UNKNOWN'|'OPEN'|'CLOSED'|'CONFLICT';
export interface ValveHistoryQuery {from:string;to:string;circuitId:string;valveId:string;condition:ValveCondition}
export interface ValveHistorySample {id:number;circuitSnapshot:CircuitConfig;observation:ValveObservation}
export interface ValveHistoryPage {from:string;to:string;circuitId:string|null;valveId:string|null;condition:ValveCondition;ceilingId:number;items:ValveHistorySample[];nextCursor:string|null}
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
function instantNs(v:string){if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?(?:Z|[+-]\d\d:\d\d)$/.test(v)||!date(v))throw new Error('Thời gian lịch sử không hợp lệ.');const fraction=v.match(/\.(\d+)(?:Z|[+-]\d\d:\d\d)$/)?.[1]??'';return BigInt(Date.parse(v))*1000000n+BigInt(fraction.padEnd(9,'0').slice(3));}
export const valveConditions:Record<ValveCondition,string>={ALL:'Tất cả',FAULT:'Có lỗi',UNKNOWN:'Chưa xác định vị trí',OPEN:'Phản hồi mở',CLOSED:'Phản hồi đóng',CONFLICT:'Hai công tắc mâu thuẫn'};
export function historyFault(o:ValveObservation){return o.reason==='DEVICE_FAULT'||o.positionFeedback?.fault!=null;}
export function parseValveHistory(v:any,q:ValveHistoryQuery):ValveHistoryPage {
 if(!v||typeof v!=='object'||!date(v.from)||!date(v.to)||Date.parse(v.from)!==Date.parse(q.from)||Date.parse(v.to)!==Date.parse(q.to)||v.circuitId!==(q.circuitId||null)||v.valveId!==(q.valveId||null)||v.condition!==q.condition||!Number.isSafeInteger(v.ceilingId)||v.ceilingId<0||!Array.isArray(v.items)||v.items.length>200||!(v.nextCursor===null||typeof v.nextCursor==='string'&&v.nextCursor.length>0&&v.nextCursor.length<=512))throw new Error('Lịch sử van không hợp lệ.');
 if(instantNs(v.from)!==instantNs(q.from)||instantNs(v.to)!==instantNs(q.to)||instantNs(v.from)>=instantNs(v.to)||instantNs(v.to)-instantNs(v.from)>31n*86400n*1000000000n)throw new Error('Khoảng giờ lịch sử không khớp.');
 const ids=new Set<number>();let previous:ValveHistorySample|null=null;const items=v.items.map((x:any)=>{
  if(!x||!Number.isSafeInteger(x.id)||x.id<1||x.id>v.ceilingId||ids.has(x.id))throw new Error('Trùng hoặc sai mẫu lịch sử.');ids.add(x.id);
  const c=parseCircuit(x.circuitSnapshot),o=parseObservation(x.observation),state=o.positionFeedback?.state??'UNKNOWN';
  const at=instantNs(o.receivedAt);if(c.expectedSource!=='SIMULATOR'||c.circuitId!==o.circuitId||c.revision!==o.circuitRevision||c.zoneId!==o.zoneId||c.zoneRevision!==o.zoneRevision||c.valveId!==o.actuatorId||c.controllerId!==o.controllerId||q.circuitId&&c.circuitId!==q.circuitId||q.valveId&&o.actuatorId!==q.valveId||at<instantNs(q.from)||at>=instantNs(q.to)||q.condition==='FAULT'&&!historyFault(o)||!['ALL','FAULT'].includes(q.condition)&&state!==q.condition||previous&&(at>instantNs(previous.observation.receivedAt)||at===instantNs(previous.observation.receivedAt)&&x.id>=previous.id))throw new Error('Bằng chứng lịch sử không khớp bộ lọc hoặc thứ tự.');
  previous={id:x.id,circuitSnapshot:c,observation:o};return previous;
 });
 if(v.nextCursor!==null&&!items.length)throw new Error('Phân trang lịch sử không hợp lệ.');return {...v,items};
}
export async function fetchValveHistory(q:ValveHistoryQuery,cursor:string|null,signal:AbortSignal){
 const params=new URLSearchParams({from:q.from,to:q.to,condition:q.condition,limit:'50'});if(q.circuitId)params.set('circuitId',q.circuitId);if(q.valveId)params.set('valveId',q.valveId);if(cursor)params.set('cursor',cursor);
 const r=await fetch('/api/v1/valve-history?'+params,{signal,cache:'no-store'});if(!r.ok)throw new Error('Không đọc được lịch sử van. Kiểm tra bộ lọc hoặc thử lại.');const page=parseValveHistory(await r.json(),q);if(page.nextCursor!==null&&page.nextCursor===cursor)throw new Error('Cursor lịch sử không tiến.');return page;
}
export function valveHistoryCsv(items:ValveHistorySample[]){
 const cell=(v:unknown)=>{let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const headers=['id','circuitId','circuitName','circuitRevision','zoneId','zoneRevision','controllerId','valveId','dataSource','monitorOnly','observedAt','receivedAt','bootId','sequence','gpioState','positionState','positionFault','reason'];
 const rows=items.map(x=>{const c=x.circuitSnapshot,o=x.observation;return [x.id,c.circuitId,c.name,c.revision,c.zoneId,c.zoneRevision,c.controllerId,c.valveId,o.dataSource,o.monitorOnly,o.observedAt,o.receivedAt,o.bootId,o.sequence,o.gpioState,o.positionFeedback?.state??'UNKNOWN',o.positionFeedback?.fault,o.reason];});
 return '\uFEFF'+[headers,...rows].map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';
}
