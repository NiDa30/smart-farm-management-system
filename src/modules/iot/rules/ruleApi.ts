// General automation rules (backend /api/v1/automation/rules). The builder edits the same JSON
// definition the backend validates; the client checks the same limits first so most mistakes
// are explained before saving, but the backend stays the authority.
export type Comparator='GT'|'GTE'|'LT'|'LTE'|'EQ';
export interface SensorCond {type:'SENSOR';nodeId:string;channelId:string;comparator:Comparator;value:number|boolean;forSeconds:number}
export interface TimeCond {type:'TIME';start:string;end:string;days:number[]}
export interface StateCond {type:'ACTUATOR_STATE';actuatorId:string;state:'ON'|'OFF'}
export type Leaf=SensorCond|TimeCond|StateCond;
export interface Group {op:'ALL'|'ANY';items:(Leaf|Group)[]}
export interface ActuatorAction {type:'ACTUATOR';actuatorId:string;action:'ON'|'OFF';durationSeconds?:number}
export interface ZoneAction {type:'ZONE_SEQUENCE';zones:{valveId:string;pumpSeconds:number}[]}
export type Action=ActuatorAction|ZoneAction;
export interface Definition {conditions:Group;actions:Action[];cooldownSeconds:number;maxRunsPerDay:number;manualHoldSeconds:number}
export interface Rule {id:number;name:string;enabled:boolean;revision:number;definition:Definition;targets:string[];updatedAt:string;lastEvaluatedAt:string|null;
 lastOutcome:'TRUE'|'FALSE'|'UNKNOWN'|null;lastSkip:string|null;lastFiredAt:string|null;runsToday:number}
export interface RulesView {enabled:boolean;wateringRule:{name:string;enabled:boolean;targets:string[]};rules:Rule[]}
export interface Run {id:number;ruleId:number;ruleName:string;ruleRevision:number;firedAt:string;result:'FIRED'|'PARTIAL'|'FAILED';detail:string;commandIds:string[];sequenceId:number|null}
export interface Simulation {hours:number;from:string;to:string;stepSeconds:number;trueMinutes:number;falseMinutes:number;unknownMinutes:number;fires:string[];truncated:boolean}
/** What the builder can offer: registered channels and actuators. */
export interface Catalog {channels:{nodeId:string;channelId:string;metric:string}[];actuators:{actuatorId:string;actuatorType:string;maxSeconds:number}[]}

const obj=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const date=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const count=(v:unknown)=>Number.isInteger(v)&&(v as number)>=0;
const isGroup=(n:Leaf|Group):n is Group=>'op' in n;

export function parseRules(v:unknown):RulesView{
 if(!obj(v)||typeof v.enabled!=='boolean'||!obj(v.wateringRule)||typeof v.wateringRule.enabled!=='boolean'||!Array.isArray(v.rules))throw new Error('Danh sách quy tắc không hợp lệ.');
 for(const r of v.rules)if(!(obj(r)&&Number.isInteger(r.id)&&typeof r.name==='string'&&typeof r.enabled==='boolean'&&count(r.revision)&&obj(r.definition)
  &&Array.isArray(r.targets)&&date(r.updatedAt)&&(r.lastOutcome===null||['TRUE','FALSE','UNKNOWN'].includes(r.lastOutcome))&&count(r.runsToday)))throw new Error('Quy tắc không hợp lệ.');
 return v as RulesView;
}
export function parseRuns(v:unknown):Run[]{
 if(!Array.isArray(v)||!v.every(r=>obj(r)&&Number.isInteger(r.id)&&date(r.firedAt)&&['FIRED','PARTIAL','FAILED'].includes(r.result)&&typeof r.detail==='string'&&Array.isArray(r.commandIds)))
  throw new Error('Lịch sử quy tắc không hợp lệ.');
 return v as Run[];
}
export function parseSimulation(v:unknown):Simulation{
 if(!obj(v)||![v.hours,v.trueMinutes,v.falseMinutes,v.unknownMinutes].every(count)||!Array.isArray(v.fires)||!v.fires.every(date)||typeof v.truncated!=='boolean')
  throw new Error('Kết quả mô phỏng không hợp lệ.');
 return v as Simulation;
}

export function leaves(g:Group):number{return g.items.reduce((n,i)=>n+(isGroup(i)?leaves(i):1),0);}
function depth(g:Group):number{return 1+Math.max(0,...g.items.map(i=>isGroup(i)?depth(i):0));}
export function longestAction(d:Definition):number{
 return Math.max(0,...d.actions.map(a=>a.type==='ACTUATOR'?(a.durationSeconds??0):a.zones.reduce((s,z)=>s+z.pumpSeconds+60,0)));
}

/** Same rules as the backend parser; returns the first problem in Vietnamese, or null. */
export function definitionError(d:Definition,c:Catalog):string|null{
 const n=leaves(d.conditions);
 if(n<1||n>8)return 'Cần 1–8 điều kiện.';
 if(depth(d.conditions)>2)return 'Chỉ lồng nhóm điều kiện một cấp.';
 const check=(g:Group):string|null=>{
  if(!g.items.length)return 'Nhóm điều kiện đang rỗng.';
  for(const i of g.items){
   if(isGroup(i)){const e=check(i);if(e)return e;continue;}
   if(i.type==='SENSOR'){
    const ch=c.channels.find(x=>x.nodeId===i.nodeId&&x.channelId===i.channelId);
    if(!ch)return 'Chọn kênh cảm biến.';
    if(ch.metric==='WATER_PRESENT'?(i.comparator!=='EQ'||typeof i.value!=='boolean'):(i.comparator==='EQ'||typeof i.value!=='number'||!Number.isFinite(i.value)))return `Phép so sánh không hợp với kênh ${i.nodeId}/${i.channelId}.`;
    if(!Number.isInteger(i.forSeconds)||i.forSeconds<0||i.forSeconds>3600)return 'Thời gian giữ 0–3600 giây.';
   }else if(i.type==='TIME'){
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(i.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(i.end)||i.start===i.end)return 'Khung giờ HH:MM, giờ bắt đầu khác giờ kết thúc.';
    if(!i.days.length||i.days.some(x=>!Number.isInteger(x)||x<1||x>7))return 'Chọn ít nhất một ngày.';
   }else if(!c.actuators.some(a=>a.actuatorId===i.actuatorId)&&i.actuatorId!=='PUMP01')return 'Chọn thiết bị cho điều kiện trạng thái.';
  }
  return null;
 };
 const e=check(d.conditions);if(e)return e;
 if(!d.actions.length||d.actions.length>4)return 'Cần 1–4 hành động.';
 const used=new Set<string>();
 for(let k=0;k<d.actions.length;k++){
  const a=d.actions[k];
  if(a.type==='ACTUATOR'){
   const act=c.actuators.find(x=>x.actuatorId===a.actuatorId);
   if(!act)return 'Hành động chỉ dùng van, quạt, đèn, phun sương (bơm chỉ qua tưới theo zone).';
   if(used.has(a.actuatorId))return `Thiết bị ${a.actuatorId} xuất hiện hai lần.`;used.add(a.actuatorId);
   if(a.action==='ON'&&(!Number.isInteger(a.durationSeconds)||a.durationSeconds!<1||a.durationSeconds!>act.maxSeconds))return `Thời gian bật ${a.actuatorId} 1–${act.maxSeconds} giây.`;
   if(a.action==='OFF'&&a.durationSeconds!==undefined)return 'Lệnh tắt không có thời gian.';
  }else{
   if(k!==d.actions.length-1)return 'Tưới theo zone phải là hành động cuối.';
   if(!a.zones.length||a.zones.length>4)return 'Tưới theo zone cần 1–4 zone.';
   for(const z of a.zones){
    if(!c.actuators.some(x=>x.actuatorId===z.valveId&&x.actuatorType==='VALVE'))return 'Chọn van zone.';
    if(used.has(z.valveId))return `Van ${z.valveId} xuất hiện hai lần.`;used.add(z.valveId);
    if(!Number.isInteger(z.pumpSeconds)||z.pumpSeconds<1||z.pumpSeconds>1800)return 'Thời gian bơm mỗi zone 1–1800 giây.';
   }
  }
 }
 if(!Number.isInteger(d.cooldownSeconds)||d.cooldownSeconds<60||d.cooldownSeconds>86400)return 'Thời gian nghỉ 1 phút – 24 giờ.';
 if(d.cooldownSeconds<longestAction(d))return `Thời gian nghỉ phải ≥ hành động dài nhất (${Math.ceil(longestAction(d)/60)} phút) để các lượt không chồng nhau.`;
 if(!Number.isInteger(d.maxRunsPerDay)||d.maxRunsPerDay<1||d.maxRunsPerDay>48)return 'Số lần mỗi ngày 1–48.';
 if(!Number.isInteger(d.manualHoldSeconds)||d.manualHoldSeconds<0||d.manualHoldSeconds>7200)return 'Tạm dừng sau điều khiển tay 0–120 phút.';
 return null;
}

export function blankDefinition():Definition{
 return {conditions:{op:'ALL',items:[]},actions:[],cooldownSeconds:1800,maxRunsPerDay:6,manualHoldSeconds:600};
}
export const outcomeLabel={TRUE:'Đúng',FALSE:'Sai',UNKNOWN:'Chưa đủ dữ liệu'} as const;
export const skipLabel:Record<string,string>={COOLDOWN:'đang nghỉ',MAX_RUNS_TODAY:'đã đủ số lần hôm nay',ZONE_SEQUENCE_RUNNING:'đang tưới theo zone',MANUAL_HOLD:'vừa điều khiển tay',EVALUATION_ERROR:'lỗi đánh giá'};
export const comparatorLabel:Record<Comparator,string>={GT:'>',GTE:'≥',LT:'<',LTE:'≤',EQ:'='};

export async function send(url:string,method:'POST'|'PUT'|'DELETE',body?:unknown){
 const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 if(!response.ok){
  let message='';try{message=(await response.json())?.message??'';}catch{/* no body */}
  throw new Error(response.status===409?`Xung đột: ${message||'thiết bị đã được quy tắc khác điều khiển'}`
   :response.status===400?`Không hợp lệ: ${message}`:response.status===403?'Backend chưa bật điều khiển actuator.':'Không lưu được, thử lại.');
 }
 return response.status===204?null:response.json();
}
