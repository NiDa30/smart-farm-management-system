import {test,expect,type Page} from '@playwright/test';
import type {FarmNode,NodesSnapshot} from '../../src/modules/iot/nodes/nodeApi';
function water():FarmNode{return {nodeId:'WATER01',name:'Trạm nước',areaId:'AREA001',nodeType:'WATER',telemetryVersion:2,actuators:[],channels:[
 {channelId:'LOW',metric:'WATER_PRESENT',unit:'boolean',calibrationVersion:null,latest:{value:false,quality:'VALID',observedAt:new Date().toISOString(),receivedAt:new Date().toISOString(),bootId:'31000000-0000-4000-8000-000000000001',sequence:1,calibrationVersion:null}},
 {channelId:'FLOW',metric:'FLOW_RATE',unit:'L/min',calibrationVersion:'FLOW-V1',latest:null}]};}
async function fixture(page:Page){
 const state={snapshot:{farmId:'FARM001',asOf:new Date().toISOString(),nodes:[water()]} as NodesSnapshot,fail:false,posts:[] as any[],status:201,unknown:false,detail:null as FarmNode|null,unexpected:[] as string[]};
 await page.route('**/*',async route=>{if(new URL(route.request().url()).origin!=='http://127.0.0.1:4183'){state.unexpected.push(route.request().url());await route.abort();return;}await route.continue();});
 await page.route('**/api/**',async route=>{const r=route.request(),path=new URL(r.url()).pathname;
  if(r.method()==='GET'&&path==='/api/v1/areas'){await route.fulfill({json:[{id:'AREA001',name:'Vườn dừa'}]});return;}
  if(r.method()==='GET'&&path==='/api/v1/nodes'){await route.fulfill({status:state.fail?503:200,json:state.snapshot});return;}
  if(r.method()==='GET'&&path.startsWith('/api/v1/nodes/')){await route.fulfill({status:state.detail?200:404,json:state.detail??{}});return;}
  if(r.method()==='POST'&&path==='/api/v1/nodes'){const body=r.postDataJSON();state.posts.push(body);const n={...body,nodeType:'WATER',telemetryVersion:2,actuators:[],channels:body.channels.map((c:any)=>({...c,latest:null}))} as FarmNode;state.detail=n;
   if(state.unknown){await route.abort('failed');return;}if(state.status===201)state.snapshot.nodes.push(n);await route.fulfill({status:state.status,json:state.status===201?n:{}});return;}
  state.unexpected.push(r.method()+' '+path);await route.abort();
 });return state;
}
async function open(page:Page){await page.getByRole('button',{name:'Khai báo trạm nước',exact:true}).click();await page.getByLabel('Mã node',{exact:true}).fill('WATER02');await page.getByLabel('Tên trạm',{exact:true}).fill('Bồn tưới');}
test('binary false, missing flow and physical binding are honest',async({page})=>{
 const state=await fixture(page);await page.goto('/');
 await expect(page.getByRole('article',{name:'WATER01 LOW'})).toContainText('Không có nước');
 await expect(page.getByRole('article',{name:'WATER01 FLOW'})).toContainText('Chưa có dữ liệu');
 await expect(page.getByRole('region',{name:'Node WATER01'})).toContainText('Chưa có actuator được gán');
 expect(state.posts).toHaveLength(0);expect(state.unexpected).toEqual([]);
});
test('create declaration carries channel types/units, no provisioning or commands',async({page})=>{
 const state=await fixture(page);await page.goto('/');await open(page);await page.getByLabel('Phiên bản hiệu chuẩn flow (nếu có)').fill('CAL-2');await page.getByLabel('Thêm kênh nhiệt độ nước').check();await page.getByRole('button',{name:'Lưu khai báo',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Đã khai báo WATER02');expect(state.posts).toHaveLength(1);expect(state.posts[0].channels).toHaveLength(4);expect(state.posts[0].channels[2]).toEqual({channelId:'FLOW',metric:'FLOW_RATE',unit:'L/min',calibrationVersion:'CAL-2'});expect(state.unexpected).toEqual([]);
});
test('uncertain create blocks retry and reads back same candidate',async({page})=>{
 const state=await fixture(page);state.unknown=true;await page.goto('/');await open(page);await page.getByRole('button',{name:'Lưu khai báo',exact:true}).click();
 await expect(page.getByRole('button',{name:'Kiểm tra khai báo',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Lưu khai báo',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Kiểm tra khai báo',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã đối chiếu khai báo WATER02');expect(state.posts).toHaveLength(1);
});
test('conflict preserves draft and does not overwrite',async({page})=>{
 const state=await fixture(page);state.status=409;await page.goto('/');await open(page);await page.getByRole('button',{name:'Lưu khai báo',exact:true}).click();await expect(page.getByRole('alert')).toContainText('đã tồn tại');await expect(page.getByLabel('Tên trạm',{exact:true})).toHaveValue('Bồn tưới');expect(state.posts).toHaveLength(1);
});
test('stale and fault never turn into an available-water claim',async({page})=>{
 const state=await fixture(page);const r=state.snapshot.nodes[0].channels[0].latest!;r.quality='SENSOR_FAULT';r.value=null;r.observedAt=new Date(Date.now()-60000).toISOString();await page.goto('/');
 const c=page.getByRole('article',{name:'WATER01 LOW'});await expect(c).toContainText('Dữ liệu cũ');await expect(c).toContainText('Mẫu đã lưu báo lỗi cảm biến');await expect(c).not.toContainText('Có nước');
});
test('outage keeps historical values visibly unavailable, then recovers',async({page})=>{
 const state=await fixture(page);await page.goto('/');await expect(page.getByRole('article',{name:'WATER01 LOW'})).toContainText('Dữ liệu mới');state.fail=true;await page.getByRole('button',{name:'Làm mới node'}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('article',{name:'WATER01 LOW'})).toContainText('Chưa xác nhận dữ liệu mới');state.fail=false;await page.getByRole('button',{name:'Làm mới node'}).click();await expect(page.getByRole('alert')).toHaveCount(0);
});
test('bad response cannot populate node inventory',async({page})=>{
 const state=await fixture(page);(state.snapshot.nodes[0].channels[0].latest as any).value=0;await page.goto('/');await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('region',{name:'Node WATER01'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Khai báo trạm nước',exact:true})).toBeDisabled();
});
