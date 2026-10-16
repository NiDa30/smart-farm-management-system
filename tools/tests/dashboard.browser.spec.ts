import { test,expect,type Page } from '@playwright/test';
import type { Overview } from '../../src/modules/iot/dashboard/overviewApi';
const at=new Date().toISOString(),old=new Date(Date.now()-60000).toISOString();
const initial=():Overview=>({agriculture:{inventory:{farmId:'FARM001',asOf:at,nodes:[]},zones:{farmId:'FARM001',asOf:at,zones:[]},waterActiveCount:0,soilActiveCount:0,recentChannelAlerts:[]},monitoring:{asOf:at,mqtt:{state:'CONNECTED',changedAt:at,lastProcessedAt:at},devices:[
 {deviceId:'ENV01',name:'Sensor A',kind:'SENSOR',areaId:'AREA001',areaName:'Khu A',observedAt:at,receivedAt:at,lastMessageAt:at,dataState:'FRESH',activity:'RECENT',temperature:25,humidity:50,soilMoisture:28,reportedState:null,safetyLockout:null,activeAlerts:1},
 {deviceId:'ENV02',name:'Sensor B',kind:'SENSOR',areaId:'AREA001',areaName:'Khu A',observedAt:old,receivedAt:old,lastMessageAt:old,dataState:'STALE',activity:'SILENT',temperature:79,humidity:99,soilMoisture:90,reportedState:null,safetyLockout:null,activeAlerts:0},
 {deviceId:'PUMP01',name:'Relay',kind:'ACTUATOR',areaId:null,areaName:null,observedAt:old,receivedAt:old,lastMessageAt:old,dataState:'STALE',activity:'SILENT',temperature:null,humidity:null,soilMoisture:null,reportedState:'ON',safetyLockout:true,activeAlerts:0}]},
 areas:[{id:'AREA001',name:'Khu A'},{id:'AREA002',name:'Khu B'}],activeAlertCount:6,
 recentActiveAlerts:[{id:1,deviceId:'ENV01',type:'LOW_SOIL',openedAt:at,openedValue:28,clearedAt:null,clearedValue:null}],
 rule:{enabled:false,lowCount:0,activeCommand:null,cooldownUntil:null,lastResult:'RESTART_PAUSED'},
 recentEvents:[{id:'command:a',eventAt:at,sourceAt:null,recordedAt:at,category:'COMMAND',type:'COMMAND_CREATED',deviceId:'PUMP01',action:'ON',state:'SENT',reason:null,value:null,commandId:null,runId:null}]});
async function fixtures(page:Page){
 const state={value:initial() as unknown,fail:false,gate:null as Promise<void>|null,calls:0};
 await page.route('**/*',async route=>{if(new URL(route.request().url()).origin!=='http://127.0.0.1:4180'){await route.abort();return;}await route.continue();});
 await page.route('**/api/**',async route=>{expect(route.request().method()).toBe('GET');expect(new URL(route.request().url()).pathname).toBe('/api/v1/dashboard/overview');state.calls++;
  const value=structuredClone(state.value),fail=state.fail,gate=state.gate;if(gate)await gate;
  await route.fulfill({status:fail?503:200,json:value});});
 return state;
}
test('counts registered sensors separately from relay and excludes stale averages',async({page})=>{
 await fixtures(page);await page.goto('/');
 await expect(page.getByRole('article',{name:'Cảm biến đã đăng ký',exact:true})).toContainText('2');
 await expect(page.getByRole('article',{name:'Cảm biến có dữ liệu mới',exact:true})).toContainText('1');
 const area=page.getByRole('article',{name:'Khu vực Khu A',exact:true});await expect(area).toContainText('Nhiệt độ: 25 °C');await expect(area).toContainText('Đất: 28%');
 await expect(page.getByRole('article',{name:'Khu vực Khu B',exact:true})).toContainText('Chưa gán cảm biến');
});
test('stale relay stays unknown and event SENT is not execution',async({page})=>{
 await fixtures(page);await page.goto('/');const relay=page.getByRole('region',{name:'Relay PUMP01',exact:true});
 await expect(relay).toContainText('Trạng thái: Chưa xác định');await expect(relay).toContainText('Lần báo trước: ON');
 await expect(page.getByText('Đã gửi, chờ ACK',{exact:false})).toBeVisible();
 await expect(page.getByText('Quy tắc đang tắt',{exact:true})).toBeVisible();
});
test('active alert total is not the preview row count',async({page})=>{
 await fixtures(page);await page.goto('/');await expect(page.getByRole('article',{name:'Cảnh báo đang mở',exact:true})).toContainText('6');await expect(page.getByText('Đang hiển thị 1/6 cảnh báo đang mở.')).toBeVisible();
});
test('navigation buttons select real module routes and never dispatch',async({page})=>{
 await fixtures(page);await page.goto('/');await page.getByRole('button',{name:'Mở điều khiển',exact:true}).click();await expect(page.locator('body')).toHaveAttribute('data-navigation','/iot/control');
 await page.getByRole('button',{name:'Mở quy tắc',exact:true}).click();await expect(page.locator('body')).toHaveAttribute('data-navigation','/iot/automation');
 await page.getByRole('button',{name:'Mở nhật ký sự kiện',exact:true}).click();await expect(page.locator('body')).toHaveAttribute('data-navigation','/iot/events');
});
test('empty registry uses no mock sensors or zero environmental measurements',async({page})=>{
 const state=await fixtures(page);const value=initial();value.monitoring.devices=[];value.areas=[];value.recentActiveAlerts=[];value.activeAlertCount=0;value.recentEvents=[];state.value=value;
 await page.goto('/');await expect(page.getByText('Chưa có khu vực.',{exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'Relay PUMP01',exact:true})).toContainText('Trạng thái: Chưa xác định');
});
test('error preserves snapshot without current-state claims and recovers',async({page})=>{
 const state=await fixtures(page);await page.goto('/');await expect(page.getByText('MQTT backend đã kết nối',{exact:true})).toBeVisible();state.fail=true;
 await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByText('Chưa xác định kết nối backend',{exact:true})).toBeVisible();
 await expect(page.getByRole('article',{name:'Cảm biến có dữ liệu mới',exact:true})).toContainText('—');
 state.fail=false;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);
});
test('invalid response shows an error instead of mock metrics',async({page})=>{
 const state=await fixtures(page);state.value={monitoring:{devices:[]}};await page.goto('/');await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('article',{name:'Cảm biến đã đăng ký',exact:true})).toHaveCount(0);
});
test('acknowledged alert remains in active total and acknowledgement event has human label',async({page})=>{
 const state=await fixtures(page),value=initial();
 value.recentEvents=[{id:'alert-seen:1',eventAt:at,sourceAt:null,recordedAt:at,category:'ALERT',type:'ALERT_ACKNOWLEDGED',deviceId:'ENV01',action:null,state:'ACKNOWLEDGED',reason:'LOW_SOIL',value:null,commandId:null,runId:null}];
 state.value=value;await page.goto('/');
 await expect(page.getByRole('article',{name:'Cảnh báo đang mở',exact:true})).toContainText('6');
 await expect(page.getByText(/ENV01 · Xác nhận đã xem cảnh báo · Đã xem cảnh báo/)).toBeVisible();
 await expect(page.getByText('Đã xem cảnh báo',{exact:false})).toBeVisible();
});
function agricultural(){
 const v=initial(),bootId='47000000-0000-4000-8000-000000000001';
 const reading=(value:number|boolean|null,quality:'VALID'|'SENSOR_FAULT'='VALID')=>({value,quality,observedAt:at,receivedAt:at,bootId,sequence:1,calibrationVersion:null,dataSource:'SIMULATOR' as const});
 const soil={nodeId:'SOIL01',name:'Đất dãy A',areaId:'AREA001',nodeType:'SOIL' as const,telemetryVersion:2 as const,actuators:[],channels:[0,20,80].map((value,i)=>({channelId:`SOIL${i+1}`,metric:'SOIL_MOISTURE' as const,unit:'%',calibrationVersion:null,latest:reading(value)}))};
 const water={nodeId:'WATER01',name:'Bồn A',areaId:'AREA001',nodeType:'WATER' as const,telemetryVersion:2 as const,actuators:[],channels:[{channelId:'LOW',metric:'WATER_PRESENT' as const,unit:'boolean',calibrationVersion:null,latest:reading(false)},{channelId:'HIGH',metric:'WATER_PRESENT' as const,unit:'boolean',calibrationVersion:null,latest:reading(false)},{channelId:'FLOW',metric:'FLOW_RATE' as const,unit:'L/min',calibrationVersion:null,latest:reading(null,'SENSOR_FAULT')}]};
 v.agriculture.inventory.nodes=[soil,water];v.agriculture.soilActiveCount=105;v.agriculture.waterActiveCount=7;
 v.agriculture.recentChannelAlerts=[{id:1,family:'SOIL',nodeId:'SOIL01',channelId:'SOIL1',type:'DRY_SOIL',dataSource:'SIMULATOR',openedAt:at,acknowledgedAt:at},{id:1,family:'WATER',nodeId:'WATER01',channelId:null,type:'LOW_WATER',dataSource:'PHYSICAL',openedAt:at,acknowledgedAt:null}];
 v.agriculture.zones.zones=[{config:{zoneId:'ZONE01',name:'Vùng A',areaId:'AREA001',soilNodeId:'SOIL01',channelIds:['SOIL1','SOIL2','SOIL3'],expectedSource:'SIMULATOR',dryThreshold:30,wetThreshold:35,revision:1},asOf:at,points:soil.channels.map(c=>({channelId:c.channelId,state:'FRESH',latest:c.latest})),assessment:{state:'DRY',dryCount:2,wetCount:1,validUntil:new Date(Date.parse(at)+30000).toISOString()}}];
 return v;
}
test('agricultural totals include all families beyond the preview and retain source and acknowledgement',async({page})=>{
 const state=await fixtures(page);state.value=agricultural();await page.goto('/');
 await expect(page.getByRole('article',{name:'Cảnh báo đang mở',exact:true})).toContainText('118');
 const alerts=page.getByRole('region',{name:'Cảnh báo đất và nước',exact:true});await expect(alerts).toContainText('Hiển thị 2/112');await expect(alerts).toContainText('Đã xem, vẫn đang mở');await expect(alerts).toContainText('Phần cứng (thiết bị khai báo)');
 await expect(page.getByRole('article',{name:'Node SOIL01',exact:true})).toContainText('SOIL1 · Độ ẩm đất: 0 %');
 await expect(page.getByRole('article',{name:'Node WATER01',exact:true})).toContainText('2/3 kênh có dữ liệu mới');
 await expect(page.getByRole('region',{name:'Khảo sát vùng tưới',exact:true})).toContainText('2/3 điểm khô');
});
test('zone majority and channel freshness expire locally before the next poll',async({page})=>{
 await page.clock.install({time:new Date(at)});const state=await fixtures(page),v=agricultural();
 for(const c of v.agriculture.inventory.nodes[0].channels){c.latest!.observedAt=new Date(Date.parse(at)-28000).toISOString();c.latest!.receivedAt=c.latest!.observedAt;}
 const z=v.agriculture.zones.zones[0];z.assessment.validUntil=new Date(Date.parse(at)+2000).toISOString();state.value=v;
 await page.goto('/');const zone=page.getByRole('region',{name:'Khảo sát vùng tưới',exact:true});await expect(zone).toContainText('2/3 điểm khô');await page.clock.runFor(3100);
 await expect(zone).toContainText('Dữ liệu khảo sát đã cũ');await expect(zone).not.toContainText('2/3 điểm khô');await expect(page.getByRole('article',{name:'Node SOIL01',exact:true})).toContainText('0/3 kênh có dữ liệu mới');await expect(page.getByRole('alert')).toHaveCount(0);
});
test('API failure hides agricultural current counts and surveys but retains labelled old evidence',async({page})=>{
 const state=await fixtures(page);state.value=agricultural();await page.goto('/');await expect(page.getByText('Đa số điểm đất đang khô',{exact:false})).toBeVisible();state.fail=true;await page.getByRole('button',{name:'Làm mới',exact:true}).click();
 await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('article',{name:'Cảnh báo đang mở',exact:true})).toContainText('—');await expect(page.getByRole('region',{name:'Khảo sát vùng tưới',exact:true})).not.toContainText('2/3 điểm khô');await expect(page.getByRole('article',{name:'Node SOIL01',exact:true})).toContainText('Bản chụp cũ, chưa xác nhận hiện tại');
 state.fail=false;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.getByRole('article',{name:'Cảnh báo đang mở',exact:true})).toContainText('118');
});
for(const mutation of ['missing','negative','duplicate','unknownNode'] as const)test(`reject malformed agriculture ${mutation}`,async({page})=>{
 const state=await fixtures(page),v=agricultural();
 if(mutation==='missing')delete (v as Partial<Overview>).agriculture;
 if(mutation==='negative')v.agriculture.soilActiveCount=-1;
 if(mutation==='duplicate')v.agriculture.recentChannelAlerts.push(v.agriculture.recentChannelAlerts[0]);
 if(mutation==='unknownNode')v.agriculture.recentChannelAlerts[0].nodeId='UNKNOWN';
 state.value=v;await page.goto('/');await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('article',{name:'Cảnh báo đang mở',exact:true})).toHaveCount(0);
});

test('agriculture overview labels weather rain independently of water floats',async({page})=>{const s=await fixtures(page),v=agricultural();v.agriculture.inventory.nodes.push({nodeId:'WEATHER01',name:'Trạm thời tiết',areaId:'AREA001',nodeType:'WEATHER',telemetryVersion:2,actuators:[],channels:[{channelId:'RAIN',metric:'RAIN_DETECTED',unit:'boolean',calibrationVersion:null,latest:{value:false,quality:'VALID',observedAt:at,receivedAt:at,bootId:'85000000-0000-4000-8000-000000000001',sequence:1,calibrationVersion:null,dataSource:'SIMULATOR'}}]} as any);s.value=v;await page.goto('/');const card=page.getByRole('article',{name:'Node WEATHER01',exact:true});await expect(card).toContainText('Node thời tiết');await expect(card).toContainText('Không mưa');await expect(card).not.toContainText('Không có nước');});
test('agriculture stale weather cannot imply no rain',async({page})=>{const s=await fixtures(page),v=agricultural(),old=new Date(Date.now()-60000).toISOString();v.agriculture.inventory.nodes.push({nodeId:'WEATHER01',name:'Thời tiết',areaId:'AREA001',nodeType:'WEATHER',telemetryVersion:2,actuators:[],channels:[{channelId:'RAIN',metric:'RAIN_DETECTED',unit:'boolean',calibrationVersion:null,latest:{value:false,quality:'VALID',observedAt:old,receivedAt:old,bootId:'85000000-0000-4000-8000-000000000001',sequence:1,calibrationVersion:null,dataSource:'SIMULATOR'}}]} as any);s.value=v;await page.goto('/');const card=page.getByRole('article',{name:'Node WEATHER01',exact:true});await expect(card).toContainText('Chưa xác định');await expect(card).not.toContainText('Không mưa');});
