import { test,expect,type Page } from '@playwright/test';
import type { Monitoring } from '../../src/modules/iot/devices/monitoringApi';
const stamp=new Date().toISOString(),old=new Date(Date.now()-60000).toISOString();
const initial=():Monitoring=>({asOf:stamp,mqtt:{state:'CONNECTED',changedAt:stamp,lastProcessedAt:stamp},devices:[
 {deviceId:'ENV01',name:'Sensor A',kind:'SENSOR',areaId:'AREA001',areaName:'Khu A',observedAt:stamp,receivedAt:stamp,lastMessageAt:stamp,dataState:'FRESH',activity:'RECENT',temperature:25,humidity:50,soilMoisture:28,reportedState:null,safetyLockout:null,activeAlerts:1},
 {deviceId:'ENV02',name:'Sensor B',kind:'SENSOR',areaId:'AREA002',areaName:'Khu B',observedAt:null,receivedAt:null,lastMessageAt:null,dataState:'EMPTY',activity:'NEVER_SEEN',temperature:null,humidity:null,soilMoisture:null,reportedState:null,safetyLockout:null,activeAlerts:0},
 {deviceId:'PUMP01',name:'Relay Wokwi',kind:'ACTUATOR',areaId:null,areaName:null,observedAt:old,receivedAt:old,lastMessageAt:old,dataState:'STALE',activity:'SILENT',temperature:null,humidity:null,soilMoisture:null,reportedState:'ON',safetyLockout:true,activeAlerts:0}]});
async function fixtures(page:Page){
 const state={value:initial() as unknown,fail:false,gate:null as Promise<void>|null,calls:0};
 await page.route('**/*',async route=>{if(new URL(route.request().url()).origin!=='http://127.0.0.1:4179'){await route.abort();return;}await route.continue();});
 await page.route('**/api/**',async route=>{expect(route.request().method()).toBe('GET');expect(new URL(route.request().url()).pathname).toBe('/api/v1/monitoring');state.calls++;
  const value=structuredClone(state.value),gate=state.gate,fail=state.fail;
  if(gate)await gate;
  await route.fulfill({status:fail?503:200,json:value});});
 return state;
}
test('registered sensors, unseen device, alerts and relay are shown from API',async({page})=>{
 await fixtures(page);await page.goto('/');await expect(page.locator('tbody tr')).toHaveCount(3);
 await expect(page.getByRole('status')).toHaveText('Backend đã kết nối MQTT');
 await expect(page.getByText('Chưa từng nhận bản tin',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Chi tiết ENV01',exact:true}).click();
 await expect(page.getByRole('region',{name:'Chi tiết thiết bị'})).toContainText('Cảnh báo đang mở: 1');
});
test('filters by area, type and device text without fabricated devices',async({page})=>{
 await fixtures(page);await page.goto('/');await expect(page.locator('tbody tr')).toHaveCount(3);
 await page.getByLabel('Khu vực',{exact:true}).selectOption('AREA002');await expect(page.locator('tbody tr')).toHaveCount(1);await expect(page.locator('tbody')).toContainText('ENV02');
 await page.getByLabel('Khu vực',{exact:true}).selectOption('');await page.getByLabel('Loại thiết bị',{exact:true}).selectOption('ACTUATOR');await expect(page.locator('tbody tr')).toHaveCount(1);
 await page.getByLabel('Tìm thiết bị',{exact:true}).fill('ENV99');await expect(page.getByText('Chưa có thiết bị phù hợp bộ lọc.')).toBeVisible();
});
test('stale relay never shows cached ON as current state',async({page})=>{
 await fixtures(page);await page.goto('/');await page.getByRole('button',{name:'Chi tiết PUMP01',exact:true}).click();
 const detail=page.getByRole('region',{name:'Chi tiết thiết bị'});
 await expect(detail).toContainText('Trạng thái relay: Chưa xác định');await expect(detail).toContainText('Lần báo trước: ON');await expect(detail).toContainText('Khóa an toàn ở lần báo trước: Có');
});
test('disabled backend MQTT is distinct from missing sensor data',async({page})=>{
 const state=await fixtures(page);const value=initial();value.mqtt.state='DISABLED';state.value=value;await page.goto('/');
 await expect(page.getByRole('status')).toHaveText('Backend chưa bật MQTT');await expect(page.getByText('Dữ liệu mới',{exact:true})).toBeVisible();
 await expect(page.getByText('Backend chưa sẵn sàng nhận MQTT.',{exact:false})).toBeVisible();
});
test('API failure preserves cached data but clears current connection claim, then recovers',async({page})=>{
 const state=await fixtures(page);await page.goto('/');await expect(page.locator('tbody tr')).toHaveCount(3);
 state.fail=true;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();
 await expect(page.getByRole('status')).toHaveText('Không tải được trạng thái backend');await expect(page.locator('tbody tr')).toHaveCount(3);
 state.fail=false;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.getByRole('status')).toHaveText('Backend đã kết nối MQTT');
});
test('malformed responses cannot populate monitor',async({page})=>{
 const state=await fixtures(page);state.value={devices:[{deviceId:'FAKE'}]};await page.goto('/');await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('tbody tr')).toHaveCount(0);
});
test('old response cannot override refreshed connection state',async({page})=>{
 const state=await fixtures(page);let release!:()=>void;state.gate=new Promise<void>(done=>{release=done;});
 await page.goto('/');await expect.poll(()=>state.calls).toBe(1);
 state.gate=null;const value=initial();value.mqtt.state='DISCONNECTED';state.value=value;
 await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Backend mất kết nối MQTT');
 release();await expect(page.getByRole('status')).toHaveText('Backend mất kết nối MQTT');
});
