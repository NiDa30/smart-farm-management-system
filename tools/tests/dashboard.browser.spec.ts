import { test,expect,type Page } from '@playwright/test';
import type { Overview } from '../../src/modules/iot/dashboard/overviewApi';
const at=new Date().toISOString(),old=new Date(Date.now()-60000).toISOString();
const initial=():Overview=>({monitoring:{asOf:at,mqtt:{state:'CONNECTED',changedAt:at,lastProcessedAt:at},devices:[
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
