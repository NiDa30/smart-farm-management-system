import {historyMicros} from './sessionHistoryApi';
import type {SessionRun} from './irrigationSessionApi';
import {parseVolume,type VolumeReport} from '../resources/waterVolumeApi';
export const waterUsageReasons:Record<string,string>={
 OBSERVED_INTERVALS:'Chỉ tính các khoảng đo hợp lệ',NO_ON_INTENT:'Phiên chưa lưu yêu cầu ON',ON_EVIDENCE_UNAVAILABLE:'Thiếu bước ON khớp phiên',
 NO_OFF_INTENT:'Chưa có yêu cầu OFF sau ON',INVALID_INTENT_WINDOW:'Khoảng yêu cầu không hợp lệ hoặc quá 24 giờ',
 COMMAND_EVIDENCE_UNCONFIRMED:'Chưa đủ ACK và kết quả gọi khớp ON/OFF của phiên',WATER_CHANNEL_UNAVAILABLE:'Kênh FLOW gốc không còn khai báo phù hợp',
 ESTIMATE_LIMIT_EXCEEDED:'Số mẫu hoặc giá trị vượt giới hạn tính toán',MULTIPLE_CALIBRATIONS:'Nhiều nhóm hiệu chuẩn; không cộng thành tổng',NO_VALID_INTERVALS:'Chưa có hai mẫu hợp lệ liên tiếp; không coi là 0 lít',
};
export interface SessionWaterReport {mode:'SESSION_STATION_FLOW';asOf:string;sessionId:string;circuitId:string;circuitRevision:number;zoneId:string;waterNodeId:string;flowChannelId:string;dataSource:'SIMULATOR'|'PHYSICAL';state:'ESTIMATED'|'UNAVAILABLE';reason:string;from:string|null;to:string|null;onId:string|null;offId:string|null;volume:VolumeReport|null}
const date=(x:unknown):x is string=>typeof x==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(x)&&Number.isFinite(Date.parse(x));
const uuid=(x:unknown)=>typeof x==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(x);
export function parseSessionWater(v:any,run:SessionRun):SessionWaterReport {
 const c=run.config;
 if(!v||v.mode!=='SESSION_STATION_FLOW'||!date(v.asOf)||v.sessionId!==run.sessionId||v.circuitId!==c.circuitId||v.circuitRevision!==c.revision||v.zoneId!==c.zoneId||v.waterNodeId!==c.waterNodeId||v.flowChannelId!==c.flowChannelId||v.dataSource!==c.expectedSource||v.onId!==run.onId||!(v.offId===null||uuid(v.offId))||!(v.from===null||date(v.from))||!(v.to===null||date(v.to))||!['ESTIMATED','UNAVAILABLE'].includes(v.state)||!Object.hasOwn(waterUsageReasons,v.reason))throw new Error('Báo cáo nước không khớp phiên và trạm đã lưu.');
 if(v.volume!==null){
  if(!date(v.from)||!date(v.to)||!date(v.volume.from)||!date(v.volume.to)||!uuid(v.onId)||!uuid(v.offId)||historyMicros(v.to)<=historyMicros(v.from)||historyMicros(v.to)-historyMicros(v.from)>86400000000n||historyMicros(v.volume.from)!==historyMicros(v.from)||historyMicros(v.volume.to)!==historyMicros(v.to))throw new Error('Khoảng tính nước không khớp cửa sổ yêu cầu.');
  parseVolume(v.volume,{nodeId:c.waterNodeId,channelId:c.flowChannelId,from:v.from,to:v.to,dataSource:c.expectedSource});
  if(Math.abs(v.volume.coveredSeconds+v.volume.uncoveredSeconds-Number(historyMicros(v.to)-historyMicros(v.from))/1e6)>1e-6)throw new Error('Độ phủ không khớp thời gian chính xác.');
  const reason=v.volume.estimatedLitres!==null?'OBSERVED_INTERVALS':v.volume.groups.length>1?'MULTIPLE_CALIBRATIONS':'NO_VALID_INTERVALS';
  if(v.reason!==reason||v.state!==(reason==='OBSERVED_INTERVALS'?'ESTIMATED':'UNAVAILABLE'))throw new Error('Kết quả nước mâu thuẫn với các khoảng đo.');
 }else if(v.state!=='UNAVAILABLE'||['OBSERVED_INTERVALS','MULTIPLE_CALIBRATIONS','NO_VALID_INTERVALS'].includes(v.reason))throw new Error('Thiếu dữ liệu ước tính nước.');
 return v;
}
export async function fetchSessionWater(run:SessionRun,signal:AbortSignal){
 const r=await fetch(`/api/v1/irrigation-session-history/${encodeURIComponent(run.config.circuitId)}/${encodeURIComponent(run.sessionId)}/water-usage`,{signal,cache:'no-store'});
 if(!r.ok)throw new Error('Không đọc được báo cáo nước của phiên.');return parseSessionWater(await r.json(),run);
}
export function sessionWaterCsv(r:SessionWaterReport){
 const cell=(v:unknown)=>{let s=v==null?'':String(v);if(/^[=+\-@\t\r]/.test(s.trimStart()))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const v=r.volume;
 const rows=[['scope','sessionId','circuit','circuitRevision','zone','node','channel','source','onId','firstOffId','intentFrom','intentTo','state','reason','coveredSeconds','uncoveredSeconds','estimatedStationLitres','calibrationVersion','intervals','readAt'],
 ...((v?.groups.length?v.groups:[null]).map(g=>['STATION_FLOW_NOT_BED_ALLOCATION',r.sessionId,r.circuitId,r.circuitRevision,r.zoneId,r.waterNodeId,r.flowChannelId,r.dataSource,r.onId,r.offId,r.from,r.to,r.state,r.reason,g?.coveredSeconds??v?.coveredSeconds,v?.uncoveredSeconds,g?.estimatedLitres,g?.calibrationVersion,g?.intervals??0,r.asOf]))];
 return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
