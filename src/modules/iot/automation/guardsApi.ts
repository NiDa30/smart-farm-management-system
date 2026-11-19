export interface WateringGuards {
  minAirTemperature:number|null;maxAirTemperature:number|null;maxAirHumidity:number|null;
  waterNode:string|null;waterChannel:string|null;maxRunsPerDay:number|null;revision:number;
}
const code=(v:unknown)=>typeof v==='string'&&/^[A-Z][A-Z0-9_-]{1,31}$/.test(v);
const range=(v:unknown,min:number,max:number)=>v===null||typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;

/** Same bounds as the backend's RuleGuards.validate; null means "not checked". */
export function validGuards(value:unknown):value is WateringGuards {
  const g=value as WateringGuards;
  return !!g&&typeof g==='object'&&range(g.minAirTemperature,-40,80)&&range(g.maxAirTemperature,-40,80)
    &&(g.minAirTemperature===null||g.maxAirTemperature===null||g.minAirTemperature<g.maxAirTemperature)
    &&range(g.maxAirHumidity,1,100)&&(g.waterNode===null)===(g.waterChannel===null)
    &&(g.waterNode===null||code(g.waterNode)&&code(g.waterChannel))
    &&(g.maxRunsPerDay===null||Number.isSafeInteger(g.maxRunsPerDay)&&g.maxRunsPerDay>=1&&g.maxRunsPerDay<=200)
    &&Number.isSafeInteger(g.revision)&&g.revision>=1;
}
export function sameGuards(a:WateringGuards,b:WateringGuards):boolean {
  return a.minAirTemperature===b.minAirTemperature&&a.maxAirTemperature===b.maxAirTemperature&&a.maxAirHumidity===b.maxAirHumidity
    &&a.waterNode===b.waterNode&&a.waterChannel===b.waterChannel&&a.maxRunsPerDay===b.maxRunsPerDay;
}
/** Empty text means "not checked"; anything else must be a number (integer where required). */
export function parseOptional(text:string,integer=false):number|null|undefined {
  const t=text.trim().replace(',','.');
  if(t==='')return null;
  if(!/^-?\d+(\.\d+)?$/.test(t))return undefined;
  const n=Number(t);
  return integer&&!Number.isInteger(n)?undefined:n;
}
export function guardSummary(g:WateringGuards):string[] {
  const out:string[]=[];
  if(g.minAirTemperature!==null||g.maxAirTemperature!==null)
    out.push(`Nhiệt độ không khí ${g.minAirTemperature!==null?`từ ${g.minAirTemperature}°C`:''}${g.minAirTemperature!==null&&g.maxAirTemperature!==null?' ':''}${g.maxAirTemperature!==null?`đến ${g.maxAirTemperature}°C`:''}`);
  if(g.maxAirHumidity!==null)out.push(`Độ ẩm không khí dưới ${g.maxAirHumidity}%`);
  if(g.waterNode!==null)out.push(`Phao ${g.waterNode}/${g.waterChannel} báo có nước trong 15 giây gần nhất`);
  if(g.maxRunsPerDay!==null)out.push(`Tối đa ${g.maxRunsPerDay} lượt mỗi ngày (giờ Việt Nam)`);
  return out;
}
export const guardResultLabels:Record<string,string>={
  DAILY_LIMIT_REACHED:'Đã đủ số lượt tưới trong ngày',
  AIR_TEMPERATURE_OUT_OF_RANGE:'Nhiệt độ không khí ngoài khoảng cho phép',
  AIR_HUMIDITY_HIGH:'Độ ẩm không khí cao, chưa tưới',
  WATER_NOT_CONFIRMED:'Phao chưa xác nhận có nước, chưa tưới',
};

export interface SimulationEvent {at:string;type:'START'|'STOP'|'BLOCKED';reason:string|null;soilMoisture:number|null}
export interface SimulationResult {
  from:string;to:string;samples:number;runs:number;pumpSeconds:number;earlyStops:number;timerStops:number;
  blocked:Record<string,number>;runsPerDay:Record<string,number>;waterGuardAssumed:boolean;eventsTruncated:boolean;events:SimulationEvent[];
}
const date=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const count=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0;
const counts=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.values(v as object).every(count);
export function parseSimulation(value:unknown):SimulationResult {
  const r=value as SimulationResult;
  if(!r||!date(r.from)||!date(r.to)||Date.parse(r.from)>=Date.parse(r.to)||![r.samples,r.runs,r.pumpSeconds,r.earlyStops,r.timerStops].every(count)
    ||r.earlyStops+r.timerStops>r.runs||!counts(r.blocked)||!counts(r.runsPerDay)||typeof r.waterGuardAssumed!=='boolean'||typeof r.eventsTruncated!=='boolean'
    ||!Array.isArray(r.events)||r.events.length>200||!r.events.every(e=>e&&date(e.at)&&['START','STOP','BLOCKED'].includes(e.type)
      &&(e.reason===null||typeof e.reason==='string')&&(e.soilMoisture===null||typeof e.soilMoisture==='number')))
    throw new Error('Kết quả mô phỏng không hợp lệ.');
  return r;
}
export const stopReasonLabels:Record<string,string>={TIMER:'Hết thời gian bật',SOIL_WET:'Đất đạt ngưỡng tắt sớm',OUTSIDE_SCHEDULE:'Ra ngoài khung giờ',...guardResultLabels};
