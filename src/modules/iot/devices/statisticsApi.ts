export interface DeviceStatistics {
  deviceId:string;nodeType:'ENVIRONMENT'|'WATER';samples:number;expectedSamples:number;completeness:number;
  gaps:number;maxGapSeconds:number;reboots:number;spikes:number|null;latestUptimeMs:number|null;
}
export interface StatisticsReport {
  from:string;to:string;hours:number;cadenceSeconds:number;gapSeconds:number;spikeTemperature:number;spikeSoilMoisture:number;devices:DeviceStatistics[];
}
const date=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const count=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0;
const positive=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>0;
export function parseStatistics(value:unknown):StatisticsReport {
  const r=value as StatisticsReport;
  if(!r||!date(r.from)||!date(r.to)||Date.parse(r.from)>=Date.parse(r.to)||!Number.isSafeInteger(r.hours)||r.hours<1||r.hours>24
    ||!positive(r.cadenceSeconds)||!positive(r.gapSeconds)||!positive(r.spikeTemperature)||!positive(r.spikeSoilMoisture)||!Array.isArray(r.devices)
    ||!r.devices.every(d=>d&&typeof d.deviceId==='string'&&/^[A-Z][A-Z0-9_-]{1,31}$/.test(d.deviceId)&&['ENVIRONMENT','WATER'].includes(d.nodeType)
      &&count(d.samples)&&count(d.expectedSamples)&&d.expectedSamples>0&&typeof d.completeness==='number'&&d.completeness>=0&&d.completeness<=1
      &&count(d.gaps)&&typeof d.maxGapSeconds==='number'&&d.maxGapSeconds>=0&&count(d.reboots)
      &&(d.nodeType==='ENVIRONMENT'?count(d.spikes):d.spikes===null)&&(d.latestUptimeMs===null||count(d.latestUptimeMs))
      &&(d.samples>0||d.latestUptimeMs===null))
    ||new Set(r.devices.map(d=>d.deviceId)).size!==r.devices.length)throw new Error('Phản hồi thống kê thiết bị không hợp lệ.');
  return r;
}
export function uptimeLabel(ms:number|null):string {
  if(ms===null)return '—';
  const minutes=Math.floor(ms/60000),days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60);
  return days>0?`${days} ngày ${hours} giờ`:hours>0?`${hours} giờ ${minutes%60} phút`:`${minutes} phút`;
}
/** A device with under 90 % of expected samples deserves a look; under 50 % is a problem. */
export function completenessTone(c:number):'good'|'warn'|'bad' {return c>=0.9?'good':c>=0.5?'warn':'bad';}
