import {parseChannelReading,type ChannelReading,type NodeChannel} from './nodeApi';
export type HistorySource='SIMULATOR'|'PHYSICAL'|'UNSPECIFIED';
export type HistoryQuality='VALID'|'SENSOR_FAULT';
export interface HistoryQuery {from:string;to:string;dataSource:HistorySource|null;quality:HistoryQuality|null;limit:number;cursor:string|null}
export interface HistoryItem extends ChannelReading {sampleId:number;dataSource:HistorySource}
export interface HistoryPage {nodeId:string;channel:Omit<NodeChannel,'latest'>;from:string;to:string;dataSource:HistorySource|null;quality:HistoryQuality|null;snapshotId:number;items:HistoryItem[];nextCursor:string|null}
const safeId=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0;
// Preserve micro/nanoseconds when checking backend order; Date alone loses them.
function instantNs(value:string):bigint {
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))throw new Error('Thời gian lịch sử không hợp lệ.');
 const fraction=value.match(/\.(\d+)(?:Z|[+-]\d\d:\d\d)$/)?.[1]??'';
 return BigInt(Date.parse(value))*1000000n+BigInt(fraction.padEnd(9,'0').slice(3));
}
export function parseWaterHistory(value:unknown,nodeId:string,channel:NodeChannel,query:HistoryQuery):HistoryPage {
 const p=value as HistoryPage;
 if(!p||p.nodeId!==nodeId||!p.channel||p.channel.channelId!==channel.channelId||p.channel.metric!==channel.metric||p.channel.unit!==channel.unit
  ||p.channel.calibrationVersion!==channel.calibrationVersion||instantNs(p.from)!==instantNs(query.from)||instantNs(p.to)!==instantNs(query.to)
  ||p.dataSource!==query.dataSource||p.quality!==query.quality||!Number.isSafeInteger(p.snapshotId)||p.snapshotId<0
  ||!Array.isArray(p.items)||p.items.length>query.limit||!(p.nextCursor===null||typeof p.nextCursor==='string'&&/^[A-Za-z0-9_-]{1,2048}$/.test(p.nextCursor))
  ||p.nextCursor!==null&&(p.nextCursor===query.cursor||p.items.length!==query.limit))throw new Error('Phản hồi lịch sử không khớp kênh hoặc bộ lọc.');
 const start=instantNs(p.from),end=instantNs(p.to);const seen=new Set<number>();let previous:HistoryItem|undefined;
 if(start>=end||end-start>31n*86400n*1000000000n)throw new Error('Khoảng thời gian lịch sử không hợp lệ.');
 for(const row of p.items){
  parseChannelReading(row,channel.metric);
  const at=instantNs(row.observedAt);
  if(!safeId(row.sampleId)||row.sampleId>p.snapshotId||seen.has(row.sampleId)||!['SIMULATOR','PHYSICAL','UNSPECIFIED'].includes(row.dataSource)
   ||at<start||at>=end||p.dataSource!==null&&row.dataSource!==p.dataSource||p.quality!==null&&row.quality!==p.quality
   ||previous&&(at>instantNs(previous.observedAt)||at===instantNs(previous.observedAt)&&row.sampleId>=previous.sampleId))throw new Error('Mẫu lịch sử không hợp lệ hoặc sai thứ tự.');
  seen.add(row.sampleId);previous=row;
 }
 return p;
}
export function historyUrl(nodeId:string,channelId:string,q:HistoryQuery){
 const params=new URLSearchParams({from:q.from,to:q.to,limit:String(q.limit)});
 if(q.dataSource)params.set('dataSource',q.dataSource);if(q.quality)params.set('quality',q.quality);if(q.cursor)params.set('cursor',q.cursor);
 return `/api/v1/nodes/${encodeURIComponent(nodeId)}/channels/${encodeURIComponent(channelId)}/history?${params}`;
}
function cell(value:string|number|boolean|null):string {
 if(value===null)return '""';if(typeof value!=='string')return String(value);
 // Quotes alone do not stop spreadsheet formulas in declared calibration text.
 const safe=/^\s*[=+\-@]/.test(value)||/^[\t\r\n]/.test(value)?"'"+value:value;
 return '"'+safe.replaceAll('"','""')+'"';
}
export function waterHistoryCsv(page:HistoryPage):string {
 const rows:(string|number|boolean|null)[][]=[['node_id','channel_id','metric','unit','range_from','range_to','sample_id','observed_at','received_at','data_source','quality','value','calibration_version','boot_id','sequence']];
 for(const r of page.items)rows.push([page.nodeId,page.channel.channelId,page.channel.metric,page.channel.unit,page.from,page.to,r.sampleId,r.observedAt,r.receivedAt,r.dataSource,r.quality,r.value,r.calibrationVersion,r.bootId,r.sequence]);
 return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
export function localTimeInput(iso:string){const d=new Date(iso);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,19);}
