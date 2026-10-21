export interface VolumeQuery {nodeId:string;channelId:string;from:string;to:string;dataSource:'SIMULATOR'|'PHYSICAL'|'UNSPECIFIED'}
export interface VolumeReport extends VolumeQuery {method:'TRAPEZOID_V1';maxGapSeconds:15;packetCount:number;sourcePacketCount:number;acceptedIntervals:number;excluded:Record<string,number>;coveredSeconds:number;uncoveredSeconds:number;estimatedLitres:number|null;groups:{calibrationVersion:string|null;intervals:number;coveredSeconds:number;estimatedLitres:number}[]}
export const exclusionLabels:Record<string,string>={SOURCE_CHANGE:'Mẫu khác nguồn đã chọn',MISSING_CHANNEL:'Packet thiếu kênh FLOW',SENSOR_FAULT:'Lỗi/giá trị FLOW không hợp lệ',CLOCK_SKEW:'Giờ nguồn đi trước giờ nhận hơn 2 giây',RECEIPT_DELAY:'Mẫu đến trễ hơn 30 giây',BOOT_CHANGE:'Đổi lần khởi động',SEQUENCE_GAP:'Sequence không liên tiếp',CALIBRATION_CHANGE:'Đổi phiên bản hiệu chuẩn',TIME_GAP:'Khoảng đo bằng 0 hoặc hơn 15 giây'};
const nonnegative=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const integer=(v:unknown):v is number=>nonnegative(v)&&Number.isSafeInteger(v);
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const near=(a:number,b:number)=>Math.abs(a-b)<=Math.max(1e-6,Math.abs(b)*1e-10);
const micros=(s:string)=>BigInt(Date.parse(s))*1000n+BigInt((s.match(/\.(\d+)(?:Z|[+-]\d\d:\d\d)$/)?.[1]??'').padEnd(6,'0').slice(3,6));
export function parseVolume(value:unknown,q:VolumeQuery):VolumeReport {
 if(!date(q.from)||!date(q.to))throw new Error('Khoảng giờ tính nước không hợp lệ.');
 const v=value as VolumeReport,duration=Number(micros(q.to)-micros(q.from))/1e6;
 if(!v||v.nodeId!==q.nodeId||v.channelId!==q.channelId||v.dataSource!==q.dataSource||!date(v.from)||!date(v.to)||micros(v.from)!==micros(q.from)||micros(v.to)!==micros(q.to)
  ||v.method!=='TRAPEZOID_V1'||v.maxGapSeconds!==15||!integer(v.packetCount)||v.packetCount>25000||!integer(v.sourcePacketCount)||v.sourcePacketCount>v.packetCount
  ||!integer(v.acceptedIntervals)||v.acceptedIntervals>Math.max(0,v.packetCount-1)||!v.excluded||typeof v.excluded!=='object'||Array.isArray(v.excluded)
  ||!Object.entries(v.excluded).every(([k,n])=>Object.hasOwn(exclusionLabels,k)&&integer(n)&&n>0)
  ||!nonnegative(v.coveredSeconds)||!nonnegative(v.uncoveredSeconds)||!near(v.coveredSeconds+v.uncoveredSeconds,duration)
  ||!Array.isArray(v.groups)||v.groups.length>v.acceptedIntervals)throw new Error('Phản hồi lượng nước không hợp lệ.');
 let intervals=0,covered=0;const versions=new Set<string|null>();
 for(const g of v.groups){if(!g||!(g.calibrationVersion===null||typeof g.calibrationVersion==='string'&&!!g.calibrationVersion.trim()&&g.calibrationVersion.length<=40)||versions.has(g.calibrationVersion)
  ||!integer(g.intervals)||g.intervals===0||!nonnegative(g.coveredSeconds)||g.coveredSeconds===0||g.coveredSeconds>g.intervals*15||!nonnegative(g.estimatedLitres))throw new Error('Nhóm hiệu chuẩn không hợp lệ.');
  versions.add(g.calibrationVersion);intervals+=g.intervals;covered+=g.coveredSeconds;
 }
 if(intervals!==v.acceptedIntervals||!near(covered,v.coveredSeconds)||v.acceptedIntervals+Object.values(v.excluded).reduce((sum,n)=>sum+n,0)!==Math.max(0,v.packetCount-1)
  ||(v.groups.length===1?!nonnegative(v.estimatedLitres)||!near(v.estimatedLitres,v.groups[0].estimatedLitres):v.estimatedLitres!==null))throw new Error('Tổng và độ phủ không khớp.');
 return v;
}
export function volumeUrl(q:VolumeQuery){const params=new URLSearchParams({from:q.from,to:q.to,dataSource:q.dataSource});return `/api/v1/nodes/${encodeURIComponent(q.nodeId)}/channels/${encodeURIComponent(q.channelId)}/water-volume?${params}`;}
export function sameVolumeScope(a:VolumeQuery,b:VolumeQuery){return date(a.from)&&date(a.to)&&date(b.from)&&date(b.to)&&a.nodeId===b.nodeId&&a.channelId===b.channelId&&micros(a.from)===micros(b.from)&&micros(a.to)===micros(b.to)&&a.dataSource===b.dataSource;}
