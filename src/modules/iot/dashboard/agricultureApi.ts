import {parseNodes,channelFreshness,type NodesSnapshot,type FarmNode} from '../nodes/nodeApi';
import {parseZones,type ZoneSnapshot} from '../zones/zoneApi';
export interface ChannelAlert {id:number;family:'WATER'|'SOIL';nodeId:string;type:'LOW_WATER'|'INCONSISTENT_FLOATS'|'DRY_SOIL'|'SENSOR_FAULT';channelId:string|null;dataSource:'SIMULATOR'|'PHYSICAL'|'UNSPECIFIED';openedAt:string;acknowledgedAt:string|null}
export interface Agriculture {inventory:NodesSnapshot;zones:ZoneSnapshot;waterActiveCount:number;soilActiveCount:number;recentChannelAlerts:ChannelAlert[]}
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
export function parseAgriculture(value:unknown):Agriculture {
 const a=value as Agriculture;if(!a)throw new Error('Thiếu tổng quan nông nghiệp.');
 const inventory=parseNodes(a.inventory),zones=parseZones(a.zones);
 if(inventory.asOf!==zones.asOf||![a.waterActiveCount,a.soilActiveCount].every(n=>Number.isSafeInteger(n)&&n>=0)
  ||!Number.isSafeInteger(a.waterActiveCount+a.soilActiveCount)||!Array.isArray(a.recentChannelAlerts)||a.recentChannelAlerts.length>5)throw new Error('Tổng quan nông nghiệp không hợp lệ.');
 for(const z of zones.zones){const n=inventory.nodes.find(n=>n.nodeId===z.config.soilNodeId&&n.nodeType==='SOIL'&&n.areaId===z.config.areaId);
  if(!n||z.config.channelIds.some(id=>!n.channels.some(c=>c.channelId===id&&c.metric==='SOIL_MOISTURE')))throw new Error('Vùng không khớp node.');
 }
 const ids=new Set<string>();
 for(const r of a.recentChannelAlerts){
  const n=inventory.nodes.find(n=>n.nodeId===r?.nodeId&&n.nodeType===r?.family),key=`${r?.family}:${r?.id}`;
  if(!r||!n||!Number.isSafeInteger(r.id)||r.id<1||ids.has(key)||!['SIMULATOR','PHYSICAL','UNSPECIFIED'].includes(r.dataSource)
   ||!date(r.openedAt)||!(r.acknowledgedAt===null||date(r.acknowledgedAt))
   ||!(r.family==='SOIL'?['DRY_SOIL','SENSOR_FAULT'].includes(r.type):['LOW_WATER','INCONSISTENT_FLOATS','SENSOR_FAULT'].includes(r.type))
   ||(r.family==='SOIL'||r.type==='SENSOR_FAULT'? !n.channels.some(c=>c.channelId===r.channelId):r.channelId!==null))throw new Error('Cảnh báo không khớp node/kênh.');
  ids.add(key);
 }
 for(const family of ['WATER','SOIL'] as const)if(a.recentChannelAlerts.filter(r=>r.family===family).length>(family==='WATER'?a.waterActiveCount:a.soilActiveCount))throw new Error('Số cảnh báo không khớp.');
 return a;
}
/** A fresh node requires every declared channel to be fresh and valid; partial packets do not refresh missing channels. */
export function nodeSummary(n:FarmNode,now:number){
 const states=n.channels.map(c=>channelFreshness(c.latest,now));
 const fresh=states.filter(s=>s==='FRESH').length;
 return {fresh,total:states.length,complete:fresh===states.length};
}
