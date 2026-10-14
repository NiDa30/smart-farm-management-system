import {test,expect,type Page} from '@playwright/test';
const at=new Date(Math.floor(Date.now()/1000)*1000).toISOString();
const node={nodeId:'WATER01',name:'Bồn A',areaId:'AREA001',nodeType:'WATER',telemetryVersion:2,actuators:[],channels:[{channelId:'FLOW',metric:'FLOW_RATE',unit:'L/min',calibrationVersion:'F1',latest:null},{channelId:'LOW',metric:'WATER_PRESENT',unit:'boolean',calibrationVersion:null,latest:null}]};
function report(url:URL){return {nodeId:'WATER01',channelId:'FLOW',from:url.searchParams.get('from')!,to:url.searchParams.get('to')!,dataSource:url.searchParams.get('dataSource')!,method:'TRAPEZOID_V1',maxGapSeconds:15,packetCount:4,sourcePacketCount:4,acceptedIntervals:2,excluded:{TIME_GAP:1},coveredSeconds:10,uncoveredSeconds:(Date.parse(url.searchParams.get('to')!)-Date.parse(url.searchParams.get('from')!))/1000-10,estimatedLitres:1,groups:[{calibrationVersion:'F1',intervals:2,coveredSeconds:10,estimatedLitres:1}]};}
async function fixtures(page:Page){
 const state={nodes:[node],fail:0,transform:(v:ReturnType<typeof report>)=>v as unknown,gate:null as Promise<void>|null,calls:0};
 await page.route('**/*',async route=>{if(new URL(route.request().url()).origin!=='http://127.0.0.1:4185'){await route.abort();return;}await route.continue();});
 await page.route('**/api/**',async route=>{
  expect(route.request().method()).toBe('GET');const url=new URL(route.request().url());
  if(url.pathname==='/api/v1/nodes'){await route.fulfill({json:{farmId:'FARM001',asOf:at,nodes:state.nodes}});return;}
  expect(url.pathname).toBe('/api/v1/nodes/WATER01/channels/FLOW/water-volume');state.calls++;
  const body=state.transform(report(url)),status=state.fail||200,gate=state.gate;if(gate)await gate;
  await route.fulfill({status,json:body});
 });return state;
}
const result=(page:Page)=>page.getByRole('region',{name:'Kết quả lượng nước',exact:true});
test('shows partial volume, source, coverage and exclusion instead of fake water totals or energy',async({page})=>{
 await fixtures(page);await page.goto('/');await expect(result(page)).toContainText('Ước tính trong các đoạn hợp lệ: 1 lít');await expect(result(page)).toContainText('Độ phủ: 10 giây');await expect(result(page)).toContainText('Mô phỏng (thiết bị khai báo)');await expect(result(page)).toContainText('Khoảng đo bằng 0 hoặc hơn 15 giây: 1');
 await page.getByRole('button',{name:'Điện',exact:true}).click();await expect(page.getByRole('heading',{name:'Chưa có dữ liệu đo điện',exact:true})).toBeVisible();await expect(result(page)).toHaveCount(0);
});
test('zero measured flow is not missing data',async({page})=>{
 const s=await fixtures(page);s.transform=v=>({...v,estimatedLitres:0,groups:[{...v.groups[0],estimatedLitres:0}]});await page.goto('/');await expect(result(page)).toContainText('Ước tính trong các đoạn hợp lệ: 0 lít');
});
test('no valid intervals reports unknown and zero coverage rather than zero litres',async({page})=>{
 const s=await fixtures(page);s.transform=v=>({...v,packetCount:0,sourcePacketCount:0,acceptedIntervals:0,excluded:{},coveredSeconds:0,uncoveredSeconds:3600,estimatedLitres:null,groups:[]});await page.goto('/');await expect(result(page)).toContainText('Chưa đủ khoảng đo hợp lệ');await expect(result(page)).not.toContainText('0 lít');
});
test('multiple calibration groups remain separate without a combined total',async({page})=>{
 const s=await fixtures(page);s.transform=v=>({...v,estimatedLitres:null,groups:[{calibrationVersion:'F1',intervals:1,coveredSeconds:5,estimatedLitres:.5},{calibrationVersion:null,intervals:1,coveredSeconds:5,estimatedLitres:1}]});await page.goto('/');await expect(result(page)).toContainText('Nhiều phiên bản hiệu chuẩn; không cộng tổng');await expect(result(page)).toContainText('Hiệu chuẩn chưa khai báo: 1 lít');
});
test('editing filters hides old results until applying the corresponding source',async({page})=>{
 await fixtures(page);await page.goto('/');await expect(result(page)).toBeVisible();await page.getByLabel('Nguồn lượng nước',{exact:true}).selectOption('PHYSICAL');await expect(result(page)).toHaveCount(0);await expect(page.getByText('Bộ lọc đã đổi; tính lại để xem kết quả tương ứng.')).toBeVisible();await page.getByRole('button',{name:'Tính lượng nước',exact:true}).click();await expect(result(page)).toContainText('Phần cứng (thiết bị khai báo)');
});
test('clearing datetime inputs never crashes and reversed range is rejected',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await fixtures(page);await page.goto('/');await expect(result(page)).toBeVisible();const from=page.getByLabel('Lượng nước từ',{exact:true}),to=page.getByLabel('Lượng nước đến',{exact:true});const end=await to.inputValue();await from.fill('');await expect(result(page)).toHaveCount(0);await from.fill(end);await page.getByRole('button',{name:'Tính lượng nước',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Chọn khoảng tăng dần');expect(errors).toEqual([]);
});
test('API error hides old results and an explicit retry recovers',async({page})=>{
 const s=await fixtures(page);await page.goto('/');await expect(result(page)).toBeVisible();s.fail=422;await page.getByRole('button',{name:'Tính lượng nước',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Chọn khoảng ngắn hơn');await expect(result(page)).toHaveCount(0);s.fail=0;await page.getByRole('button',{name:'Tính lượng nước',exact:true}).click();await expect(result(page)).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
});
test('slow old request cannot overwrite a newer selected-source result',async({page})=>{
 const s=await fixtures(page);await page.goto('/');await expect(result(page)).toBeVisible();let release!:()=>void;s.gate=new Promise<void>(resolve=>{release=resolve;});await page.getByRole('button',{name:'Tính lượng nước',exact:true}).click();await expect.poll(()=>s.calls).toBe(2);s.gate=null;await page.getByLabel('Nguồn lượng nước',{exact:true}).selectOption('PHYSICAL');await page.getByRole('button',{name:'Tính lượng nước',exact:true}).click();await expect(result(page)).toContainText('Phần cứng (thiết bị khai báo)');release();await expect(result(page)).toContainText('Phần cứng (thiết bị khai báo)');
});
for(const malformed of ['source','coverage','negative','total','reason'] as const)test(`invalid report ${malformed} fails without a false volume`,async({page})=>{
 const s=await fixtures(page);s.transform=v=>malformed==='source'?{...v,dataSource:'PHYSICAL'}:malformed==='coverage'?{...v,coveredSeconds:4000}:malformed==='negative'?{...v,estimatedLitres:-1}:malformed==='total'?{...v,acceptedIntervals:1}:{...v,excluded:{UNKNOWN:1}};await page.goto('/');await expect(page.getByRole('alert')).toBeVisible();await expect(result(page)).toHaveCount(0);
});
test('empty registry requires a flow-capable water node and does not invent counters',async({page})=>{
 const s=await fixtures(page);s.nodes=[];await page.goto('/');await expect(page.getByText('Chưa có node WATER khai báo kênh FLOW_RATE.',{exact:false})).toBeVisible();await expect(result(page)).toHaveCount(0);expect(s.calls).toBe(0);
});
test('canonical server timestamps without milliseconds still show the applied result',async({page})=>{
 const s=await fixtures(page);s.transform=v=>({...v,from:v.from.replace('.000Z','Z'),to:v.to.replace('.000Z','Z')});await page.goto('/');await expect(result(page)).toContainText('Ước tính trong các đoạn hợp lệ: 1 lít');
});
test('registry refresh removing and restoring flow nodes clears the report and remains usable',async({page})=>{
 const s=await fixtures(page);await page.goto('/');await expect(result(page)).toBeVisible();s.nodes=[];await page.getByRole('button',{name:'Tải lại node FLOW',exact:true}).click();await expect(page.getByText('Chưa có node WATER khai báo kênh FLOW_RATE.',{exact:false})).toBeVisible();await expect(result(page)).toHaveCount(0);await expect(page.getByRole('button',{name:'Tải lại node FLOW',exact:true})).toBeEnabled();s.nodes=[node];await page.getByRole('button',{name:'Tải lại node FLOW',exact:true}).click();await expect(result(page)).toBeVisible();
});
