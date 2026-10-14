export const metrics={AIR_TEMPERATURE:'°C',AIR_HUMIDITY:'%RH',SOIL_MOISTURE:'%',WATER_PRESENT:'boolean',FLOW_RATE:'L/min',WATER_TEMPERATURE:'°C',WATER_PRESSURE:'kPa'} as const;
export type Metric=keyof typeof metrics;
export interface ChannelReading {value:number|boolean|null;quality:'VALID'|'SENSOR_FAULT';observedAt:string;receivedAt:string;bootId:string;sequence:number;calibrationVersion:string|null;dataSource?:'UNSPECIFIED'|'SIMULATOR'|'PHYSICAL'}
export interface NodeChannel {channelId:string;metric:Metric;unit:string;calibrationVersion:string|null;latest:ChannelReading|null}
export interface FarmNode {nodeId:string;name:string;areaId:string;nodeType:'ENVIRONMENT'|'WATER'|'SOIL';telemetryVersion:1|2;channels:NodeChannel[];actuators:{actuatorId:string;actuatorType:'PUMP';commandContract:'PUMP_V1'}[]}
export interface NodesSnapshot {farmId:'FARM001';asOf:string;nodes:FarmNode[]}
export interface WaterDeclaration {nodeType?:'WATER'|'SOIL';nodeId:string;name:string;areaId:string;channels:Omit<NodeChannel,'latest'>[]}
const obj=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const code=(v:unknown):v is string=>typeof v==='string'&&/^[A-Z][A-Z0-9_-]{1,31}$/.test(v);
const date=(v:unknown):v is string=>typeof v==='string'&&/(Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const calibration=(v:unknown)=>v===null||typeof v==='string'&&v.trim().length>0&&v.length<=40;
export function parseChannelReading(value:unknown,metric:Metric):ChannelReading {
 const r=value;
 if(!obj(r)||(r.dataSource!==undefined&&!['UNSPECIFIED','SIMULATOR','PHYSICAL'].includes(r.dataSource))||!date(r.observedAt)||!date(r.receivedAt)||typeof r.bootId!=='string'||!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(r.bootId)||!Number.isSafeInteger(r.sequence)||r.sequence<0||!calibration(r.calibrationVersion))throw new Error('Reading không hợp lệ.');
 if(r.quality==='SENSOR_FAULT'){if(r.value!==null)throw new Error('Reading lỗi phải rỗng.');}
 else if(r.quality==='VALID'){
  if(metric==='WATER_PRESENT'){if(typeof r.value!=='boolean')throw new Error('Phao cần giá trị boolean.');}
  else if(typeof r.value!=='number'||!Number.isFinite(r.value)
   ||(['FLOW_RATE','WATER_PRESSURE','AIR_HUMIDITY','SOIL_MOISTURE'].includes(metric)&&r.value<0)
   ||(['AIR_HUMIDITY','SOIL_MOISTURE'].includes(metric)&&r.value>100)
   ||(metric==='AIR_TEMPERATURE'&&(r.value < -40||r.value>80))
   ||(metric==='WATER_TEMPERATURE'&&(r.value < -55||r.value>125)))throw new Error('Giá trị ngoài phạm vi.');
 }else throw new Error('Quality không hợp lệ.');
 return r as ChannelReading;
}
export function parseNode(v:unknown):FarmNode {
 if(!obj(v)||!code(v.nodeId)||!code(v.areaId)||typeof v.name!=='string'||!v.name.trim()||v.name.length>80
 ||!((v.nodeType==='ENVIRONMENT'&&v.telemetryVersion===1)||(['WATER','SOIL'].includes(v.nodeType)&&v.telemetryVersion===2))
 ||!Array.isArray(v.channels)||!v.channels.length||v.channels.length>8||!Array.isArray(v.actuators))throw new Error('Khai báo node không hợp lệ.');
 const ids=new Set<string>();
 for(const c of v.channels){
  if(!obj(c)||!code(c.channelId)||ids.has(c.channelId)||typeof c.metric!=='string'||!Object.hasOwn(metrics,c.metric)||c.unit!==metrics[c.metric as Metric]||!calibration(c.calibrationVersion))throw new Error('Kênh cảm biến không hợp lệ.');
  ids.add(c.channelId);
  if(!(v.nodeType==='SOIL'?c.metric==='SOIL_MOISTURE':v.nodeType==='WATER'?['WATER_PRESENT','FLOW_RATE','WATER_TEMPERATURE','WATER_PRESSURE'].includes(c.metric):['AIR_TEMPERATURE','AIR_HUMIDITY','SOIL_MOISTURE'].includes(c.metric)))throw new Error('Loại kênh không khớp node.');
  const r=c.latest;
  if(r!==null){
   parseChannelReading(r,c.metric as Metric);
  }
 }
 if(!v.actuators.every((a:unknown)=>obj(a)&&code(a.actuatorId)&&a.actuatorType==='PUMP'&&a.commandContract==='PUMP_V1')||new Set(v.actuators.map((a:any)=>a.actuatorId)).size!==v.actuators.length)throw new Error('Actuator không hợp lệ.');
 return v as FarmNode;
}
export function parseNodes(v:unknown):NodesSnapshot {
 if(!obj(v)||v.farmId!=='FARM001'||!date(v.asOf)||!Array.isArray(v.nodes))throw new Error('Danh sách node không hợp lệ.');
 const nodes=v.nodes.map(parseNode);if(new Set(nodes.map(n=>n.nodeId)).size!==nodes.length)throw new Error('Trùng node.');
 return {...v,nodes} as NodesSnapshot;
}
export function channelFreshness(r:ChannelReading|null,serverNow:number){
 if(!r)return 'EMPTY';const source=Date.parse(r.observedAt),received=Date.parse(r.receivedAt);
 if(source>serverNow+2000||received>serverNow+2000)return 'CLOCK_SKEW';
 if(serverNow-source>=30000||serverNow-received>=30000)return 'STALE';
 return r.quality==='SENSOR_FAULT'?'SENSOR_FAULT':'FRESH';
}
export class NodeSaveError extends Error {constructor(message:string,readonly uncertain:boolean){super(message);}}
export async function createWaterNode(input:WaterDeclaration,signal:AbortSignal):Promise<FarmNode>{
 let r:Response;
 try{const {nodeType,...body}=input;r=await fetch(nodeType==='SOIL'?'/api/v1/nodes/soil':'/api/v1/nodes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});}
 catch{throw new NodeSaveError('Chưa rõ kết quả lưu. Kiểm tra khai báo trước khi gửi lại.',true);}
 if(r.status===400||r.status===409)throw new NodeSaveError(r.status===409?'Mã node/actuator đã tồn tại.':'Khai báo không hợp lệ hoặc khu vực không còn tồn tại.',false);
 try{if(r.status!==201)throw new Error();const n=parseNode(await r.json());if(!matchesDeclaration(n,input))throw new Error();return n;}
 catch{throw new NodeSaveError('Chưa xác nhận kết quả lưu. Kiểm tra khai báo theo mã.',true);}
}
export function matchesDeclaration(n:FarmNode,d:WaterDeclaration){return n.nodeId===d.nodeId&&n.name===d.name&&n.areaId===d.areaId&&n.nodeType===(d.nodeType??'WATER')
 &&n.channels.length===d.channels.length&&d.channels.every(c=>n.channels.some(x=>x.channelId===c.channelId&&x.metric===c.metric&&x.unit===c.unit&&x.calibrationVersion===c.calibrationVersion));}
export const metricLabels:Record<Metric,string>={AIR_TEMPERATURE:'Nhiệt độ không khí',AIR_HUMIDITY:'Độ ẩm không khí',SOIL_MOISTURE:'Độ ẩm đất',WATER_PRESENT:'Phao có nước',FLOW_RATE:'Lưu lượng',WATER_TEMPERATURE:'Nhiệt độ nước',WATER_PRESSURE:'Áp suất nước'};

export function tankState(node:FarmNode,serverNow:number){
 const low=node.channels.find(c=>c.channelId==='LOW'&&c.metric==='WATER_PRESENT')?.latest;
 const high=node.channels.find(c=>c.channelId==='HIGH'&&c.metric==='WATER_PRESENT')?.latest;
 if(!low||!high)return 'UNKNOWN';
 const a=channelFreshness(low,serverNow),b=channelFreshness(high,serverNow);
 if(['STALE','CLOCK_SKEW'].includes(a)||['STALE','CLOCK_SKEW'].includes(b))return 'UNKNOWN';
 if(low.bootId!==high.bootId||low.sequence!==high.sequence||low.observedAt!==high.observedAt
  ||(low.dataSource??'UNSPECIFIED')!==(high.dataSource??'UNSPECIFIED'))return 'UNKNOWN';
 if(a==='SENSOR_FAULT'||b==='SENSOR_FAULT'||typeof low.value!=='boolean'||typeof high.value!=='boolean')return 'SENSOR_FAULT';
 if(!low.value&&high.value)return 'SENSOR_FAULT';
 return low.value?(high.value?'FULL':'MID'):'EMPTY';
}
export const tankLabels={UNKNOWN:'Chưa xác định mức bồn',SENSOR_FAULT:'Tín hiệu phao lỗi hoặc không nhất quán',FULL:'Nước đạt phao HIGH',MID:'Có nước ở LOW, chưa đạt HIGH',EMPTY:'Không có nước tại phao LOW/HIGH'};
export const sourceLabels={UNSPECIFIED:'Chưa khai báo nguồn đo',SIMULATOR:'Mô phỏng (thiết bị khai báo)',PHYSICAL:'Phần cứng (thiết bị khai báo)'};
