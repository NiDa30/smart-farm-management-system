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
  if(r.method()==='POST'&&['/api/v1/nodes','/api/v1/nodes/soil','/api/v1/nodes/weather'].includes(path)){const body=r.postDataJSON();state.posts.push(body);const n={...body,nodeType:path.endsWith('/soil')?'SOIL':path.endsWith('/weather')?'WEATHER':'WATER',telemetryVersion:2,actuators:[],channels:body.channels.map((c:any)=>({...c,latest:null}))} as FarmNode;state.detail=n;
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

test('coherent simulator floats show level, source and no pump permission',async({page})=>{
 const state=await fixture(page),n=state.snapshot.nodes[0],r=n.channels[0].latest!;
 r.dataSource='SIMULATOR';r.value=true;
 n.channels.push({...n.channels[0],channelId:'HIGH',latest:{...r,value:false}});
 await page.goto('/');
 await expect(page.getByLabel('Mức bồn WATER01')).toContainText('Có nước ở LOW, chưa đạt HIGH');
 await expect(page.getByRole('article',{name:'WATER01 LOW'})).toContainText('Mô phỏng (thiết bị khai báo)');
 await expect(page.getByLabel('Mức bồn WATER01')).toContainText('không phải quyền bật bơm');expect(state.posts).toHaveLength(0);
});
test('floats from different samples cannot imply tank ready',async({page})=>{
 const state=await fixture(page),n=state.snapshot.nodes[0],r=n.channels[0].latest!;
 n.channels.push({...n.channels[0],channelId:'HIGH',latest:{...r,value:true,sequence:r.sequence+1}});
 await page.goto('/');await expect(page.getByLabel('Mức bồn WATER01')).toContainText('Chưa xác định mức bồn');
});

function gate(){let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r;});return {promise,resolve};}
async function historyFixture(page:Page){
 const inventory=await fixture(page);
 const api={inventory,calls:[] as URL[],fail:false,bad:false,paged:false,delay:null as Promise<void>|null};
 await page.route('**/api/v1/nodes/*/channels/*/history?**',async route=>{
  const url=new URL(route.request().url());api.calls.push(url);const q=url.searchParams;
  const channelId=url.pathname.split('/')[6],channel=inventory.snapshot.nodes[0].channels.find(c=>c.channelId===channelId)!;
  const delayed=api.delay;api.delay=null;const bad=api.bad,fail=api.fail;
  const source=q.get('dataSource')??'SIMULATOR',quality=q.get('quality'),next=!!q.get('cursor');
  const size=api.paged?(next?1:100):3;
  const rows=Array.from({length:size},(_,i)=>({sampleId:(next?100:200)-i,value:quality==='SENSOR_FAULT'||(!quality&&!api.paged&&i===0)?null:channelId==='RAIN'?i===2:channelId==='LOW'?false:i===2?6:0,
   quality:quality??(!api.paged&&i===0?'SENSOR_FAULT':'VALID'),observedAt:new Date(Date.parse(q.get('to')!)-(next?10000:5000)-i).toISOString(),receivedAt:new Date().toISOString(),
   bootId:'37000000-0000-4000-8000-000000000001',sequence:(next?100:200)-i,calibrationVersion:channel.calibrationVersion,dataSource:source}));
  const response={nodeId:bad?'OTHER01':url.pathname.split('/')[4],channel:{...channel,latest:undefined},from:q.get('from'),to:q.get('to'),dataSource:q.get('dataSource'),quality:q.get('quality'),snapshotId:200,items:rows,nextCursor:api.paged&&!next?'NEXT':null};
  if(delayed)await delayed;await route.fulfill({status:fail?503:200,json:response});
 });return api;
}
async function openHistory(page:Page,channel='FLOW'){await page.goto('/');await page.getByRole('button',{name:`Lịch sử WATER01 ${channel}`,exact:true}).click();await expect(page.getByRole('region',{name:'Lịch sử kênh nước',exact:true})).toBeVisible();}

test('water history distinguishes fault/null and valid zero without changing source',async({page})=>{
 const api=await historyFixture(page);await openHistory(page);const table=page.getByRole('table',{name:'Mẫu lịch sử kênh nước'});
 await expect(table).toContainText('Lỗi cảm biến');await expect(table).toContainText('0 L/min');await expect(table).toContainText('Mô phỏng (thiết bị khai báo)');await expect(table).toContainText('FLOW-V1');
 expect(api.inventory.posts).toEqual([]);expect(api.inventory.unexpected).toEqual([]);
});
test('water history shows false as no water, not missing',async({page})=>{
 await historyFixture(page);await openHistory(page,'LOW');await expect(page.getByRole('table')).toContainText('Không có nước');
});
test('changed water filters block CSV until applied and request correct source and quality',async({page})=>{
 const api=await historyFixture(page);await openHistory(page);await expect(page.getByRole('button',{name:'Xuất CSV trang này'})).toBeEnabled();
 await page.getByLabel('Nguồn lịch sử').selectOption('PHYSICAL');await page.getByLabel('Chất lượng lịch sử').selectOption('SENSOR_FAULT');await expect(page.getByRole('button',{name:'Xuất CSV trang này'})).toBeDisabled();
 await page.getByRole('button',{name:'Áp dụng lịch sử'}).click();await expect(page.getByRole('table')).toContainText('Phần cứng (thiết bị khai báo)');
 expect(api.calls.at(-1)?.searchParams.get('dataSource')).toBe('PHYSICAL');expect(api.calls.at(-1)?.searchParams.get('quality')).toBe('SENSOR_FAULT');
});
test('water history paginates without appending hidden rows or exporting more than displayed',async({page})=>{
 const api=await historyFixture(page);api.paged=true;await openHistory(page);await expect(page.getByRole('table').getByRole('row')).toHaveCount(101);
 await page.getByRole('button',{name:'Trang tiếp theo',exact:true}).click();await expect(page.getByRole('table').getByRole('row')).toHaveCount(2);
 expect(api.calls.at(-1)?.searchParams.get('cursor')).toBe('NEXT');await expect(page.getByRole('button',{name:'Trang tiếp theo',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Tải lại từ đầu',exact:true}).click();await expect(page.getByRole('table').getByRole('row')).toHaveCount(101);
});
test('water CSV download includes current page metadata, raw zero, fault and source',async({page})=>{
 const api=await historyFixture(page);await openHistory(page);await expect(page.getByRole('button',{name:'Xuất CSV trang này'})).toBeEnabled();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất CSV trang này'}).click();const file=await download;
 expect(file.suggestedFilename()).toBe('water-history-WATER01-FLOW.csv');
 const stream=await file.createReadStream();let csv='';for await(const chunk of stream!)csv+=chunk.toString('utf8');
 expect(csv).toContain('SIMULATOR');expect(csv).toContain('SENSOR_FAULT');expect(csv).toContain(',0,');expect(csv.split('\r\n')).toHaveLength(5);expect(api.inventory.posts).toEqual([]);
});
test('water history API outage or wrong identity disables export and recovers',async({page})=>{
 const api=await historyFixture(page);await openHistory(page);await expect(page.getByRole('button',{name:'Xuất CSV trang này'})).toBeEnabled();
 for(const key of ['fail','bad'] as const){api[key]=true;await page.getByRole('button',{name:'Áp dụng lịch sử'}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('button',{name:'Xuất CSV trang này'})).toBeDisabled();api[key]=false;await page.getByRole('button',{name:'Áp dụng lịch sử'}).click();await expect(page.getByRole('alert')).toHaveCount(0);}
});
test('late water history response cannot replace a newer filter result',async({page})=>{
 const api=await historyFixture(page);await openHistory(page);await expect(page.getByRole('table')).toBeVisible();const delayed=gate();api.delay=delayed.promise;
 await page.getByRole('button',{name:'Áp dụng lịch sử'}).click();await expect.poll(()=>api.calls.length).toBe(2);
 await page.getByLabel('Nguồn lịch sử').selectOption('PHYSICAL');await page.getByRole('button',{name:'Áp dụng lịch sử'}).click();await expect(page.getByRole('table')).toContainText('Phần cứng (thiết bị khai báo)');
 delayed.resolve();await expect(page.getByRole('table')).not.toContainText('Mô phỏng (thiết bị khai báo)');
});
test('invalid water range is rejected locally and returning resumes node view',async({page})=>{
 const api=await historyFixture(page);await openHistory(page);await expect(page.getByRole('table')).toBeVisible();const calls=api.calls.length;
 await page.getByLabel('Lịch sử từ',{exact:true}).fill('2020-01-01T00:00');await page.getByRole('button',{name:'Áp dụng lịch sử'}).click();await expect(page.getByRole('alert')).toContainText('tối đa 31 ngày');expect(api.calls).toHaveLength(calls);
 await page.getByRole('button',{name:'Quay lại danh sách node',exact:true}).click();await expect(page.getByRole('button',{name:'Khai báo trạm nước',exact:true})).toBeVisible();
});

test('water minute-only input does not remain dirty after applying equivalent time',async({page})=>{
 await historyFixture(page);await openHistory(page);await expect(page.getByRole('table')).toBeVisible();
 const input=page.getByLabel('Lịch sử từ',{exact:true});const minute=(await input.inputValue()).slice(0,16);
 await input.fill(minute);await page.getByRole('button',{name:'Áp dụng lịch sử'}).click();
 await expect(page.getByRole('button',{name:'Xuất CSV trang này'})).toBeEnabled();await expect(page.getByText('Bộ lọc đã đổi; áp dụng để xem kết quả và xuất CSV tương ứng.',{exact:true})).toHaveCount(0);
});

function soil():FarmNode {
 const current=new Date().toISOString();
 return {nodeId:'SOIL01',name:'Đất dãy 1',areaId:'AREA001',nodeType:'SOIL',telemetryVersion:2,actuators:[],channels:[0,100,null].map((value,i)=>({
  channelId:`SOIL${i+1}`,metric:'SOIL_MOISTURE',unit:'%',calibrationVersion:'SIM_LINEAR_V1',latest:{value,quality:value===null?'SENSOR_FAULT':'VALID',observedAt:current,receivedAt:current,bootId:'41000000-0000-4000-8000-000000000001',sequence:1,calibrationVersion:'SIM_LINEAR_V1',dataSource:'SIMULATOR'}}))};
}
test('soil points keep independent zero, saturated and fault values',async({page})=>{
 const state=await fixture(page);state.snapshot.nodes=[soil()];await page.goto('/');
 await expect(page.getByRole('article',{name:'SOIL01 SOIL1',exact:true})).toContainText('0 %');
 await expect(page.getByRole('article',{name:'SOIL01 SOIL2',exact:true})).toContainText('100 %');
 const fault=page.getByRole('article',{name:'SOIL01 SOIL3',exact:true});await expect(fault).toContainText('—');await expect(fault).toContainText('Cảm biến báo lỗi');
 await expect(page.getByLabel('Mức bồn SOIL01')).toHaveCount(0);expect(state.posts).toEqual([]);expect(state.unexpected).toEqual([]);
});
test('soil registration posts three simulator calibration identities and reconciles uncertain result',async({page})=>{
 const state=await fixture(page);state.unknown=true;await page.goto('/');await page.getByRole('button',{name:'Khai báo node đất',exact:true}).click();
 await page.getByLabel('Mã node',{exact:true}).fill('SOIL02');await page.getByLabel('Tên node đất',{exact:true}).fill('Dãy số 2');
 await page.getByRole('button',{name:'Lưu khai báo',exact:true}).click();await expect(page.getByRole('button',{name:'Lưu khai báo',exact:true})).toBeDisabled();
 expect(state.posts).toHaveLength(1);expect(state.posts[0].channels.map((c:any)=>[c.channelId,c.metric,c.calibrationVersion])).toEqual(['SOIL1','SOIL2','SOIL3'].map(id=>[id,'SOIL_MOISTURE','SIM_LINEAR_V1']));
 await page.getByRole('button',{name:'Kiểm tra khai báo',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã đối chiếu khai báo SOIL02');expect(state.posts).toHaveLength(1);expect(state.unexpected).toEqual([]);
});
test('fresh soil point does not refresh old adjacent point; API outage blocks history',async({page})=>{
 const state=await fixture(page);state.snapshot.nodes=[soil()];state.snapshot.nodes[0].channels[1].latest!.observedAt=new Date(Date.now()-60000).toISOString();await page.goto('/');
 await expect(page.getByRole('article',{name:'SOIL01 SOIL1',exact:true})).toContainText('Dữ liệu mới');await expect(page.getByRole('article',{name:'SOIL01 SOIL2',exact:true})).toContainText('Dữ liệu cũ');
 state.fail=true;await page.getByRole('button',{name:'Làm mới node'}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('button',{name:'Lịch sử SOIL01 SOIL1',exact:true})).toBeDisabled();
});
test('soil history supports scoped filters and CSV with soil filename and no actuator calls',async({page})=>{
 const api=await historyFixture(page);api.inventory.snapshot.nodes=[soil()];await page.goto('/');await page.getByRole('button',{name:'Lịch sử SOIL01 SOIL1',exact:true}).click();
 await expect(page.getByRole('region',{name:'Lịch sử kênh đất',exact:true})).toBeVisible();await expect(page.getByRole('table')).toContainText('0 %');await expect(page.getByRole('table')).toContainText('Lỗi cảm biến');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất CSV trang này'}).click();expect((await download).suggestedFilename()).toBe('soil-history-SOIL01-SOIL1.csv');
 await page.getByLabel('Chất lượng lịch sử').selectOption('SENSOR_FAULT');await expect(page.getByRole('button',{name:'Xuất CSV trang này'})).toBeDisabled();await page.getByRole('button',{name:'Áp dụng lịch sử'}).click();await expect(page.getByRole('button',{name:'Xuất CSV trang này'})).toBeEnabled();
 expect(api.calls.at(-1)?.searchParams.get('quality')).toBe('SENSOR_FAULT');expect(api.inventory.posts).toEqual([]);expect(api.inventory.unexpected).toEqual([]);
});

import type {ZoneConfig,ZoneView,ZoneSnapshot} from '../../src/modules/iot/zones/zoneApi';
function zoneConfig():ZoneConfig{return {zoneId:'ZONE01',name:'Dãy rau 1',areaId:'AREA001',soilNodeId:'SOIL01',channelIds:['SOIL1','SOIL2','SOIL3'],expectedSource:'SIMULATOR',dryThreshold:30,wetThreshold:35,revision:1};}
function zoneView(config=zoneConfig()):ZoneView{
 const at=new Date().toISOString();return {config,asOf:at,points:[0,20,80].map((value,i)=>({channelId:config.channelIds[i],state:'FRESH',latest:{value,quality:'VALID',observedAt:at,receivedAt:at,bootId:'44000000-0000-4000-8000-000000000001',sequence:1,calibrationVersion:'SIM_LINEAR_V1',dataSource:config.expectedSource}})),assessment:{state:'DRY',dryCount:2,wetCount:1,validUntil:new Date(Date.parse(at)+30000).toISOString()}};
}
async function zoneFixture(page:Page){
 const inventory=await fixture(page);inventory.snapshot.nodes=[soil()];
 const initial=zoneView(),state={inventory,snapshot:{farmId:'FARM001',asOf:initial.asOf,zones:[initial]} as ZoneSnapshot,fail:false,corrupt:false,lost:false,conflict:false,detail:initial,posts:[] as any[],puts:[] as any[],calls:0};
 await page.route('**/api/v1/irrigation-zones**',async route=>{const r=route.request();
  if(r.method()==='GET'){
   state.calls++;const body=r.url().endsWith('/irrigation-zones')?structuredClone(state.snapshot):structuredClone(state.detail);
   if(state.corrupt&&'zones' in body&&body.zones.length)body.zones[0].assessment.dryCount=3;
   await route.fulfill({status:state.fail?503:200,json:body});return;
  }
  if(r.method()==='POST'||r.method()==='PUT'){
   const body=r.postDataJSON();(r.method()==='POST'?state.posts:state.puts).push(body);
   if(state.conflict){await route.fulfill({status:409,json:{}});return;}
   const saved=zoneView({...body,revision:r.method()==='POST'?1:body.revision+1});state.detail=saved;state.snapshot={farmId:'FARM001',asOf:saved.asOf,zones:[saved]};
   if(state.lost){await route.abort('failed');return;}await route.fulfill({status:r.method()==='POST'?201:200,json:saved});return;
  }state.inventory.unexpected.push(r.method()+' '+r.url());await route.abort();
 });return state;
}
async function openZones(page:Page){await page.goto('/');await page.getByRole('button',{name:'Vùng tưới',exact:true}).click();await expect(page.getByRole('region',{name:'Quản lý vùng tưới',exact:true})).toBeVisible();}
test('zones show majority from three independent points and no actuator writes',async({page})=>{
 const api=await zoneFixture(page);await openZones(page);await expect(page.getByLabel('Khảo sát ZONE01',{exact:true})).toContainText('2/3 khô');await expect(page.getByLabel('ZONE01 SOIL1',{exact:true})).toContainText('0%');
 expect(api.posts).toEqual([]);expect(api.puts).toEqual([]);expect(api.inventory.unexpected).toEqual([]);
});
test('zone create binds exactly three points and sends no revision in POST',async({page})=>{
 const api=await zoneFixture(page);api.snapshot.zones=[];await openZones(page);await page.getByRole('button',{name:'Thêm vùng tưới',exact:true}).click();
 await page.getByLabel('Mã vùng',{exact:true}).fill('ZONE02');await page.getByLabel('Tên vùng',{exact:true}).fill('Dãy2');await page.getByLabel('Node đất của vùng',{exact:true}).selectOption('SOIL01');
 for(const id of ['SOIL1','SOIL2','SOIL3'])await page.getByRole('checkbox',{name:id,exact:true}).check();
 await page.getByRole('button',{name:'Lưu vùng',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu vùng ZONE02');
 expect(api.posts).toHaveLength(1);expect(api.posts[0].revision).toBeUndefined();expect(api.posts[0].channelIds).toEqual(['SOIL1','SOIL2','SOIL3']);expect(api.inventory.unexpected).toEqual([]);
});
test('zone save with lost response requires GET readback without another PUT',async({page})=>{
 const api=await zoneFixture(page);api.lost=true;await openZones(page);await page.getByRole('button',{name:'Sửa vùng ZONE01',exact:true}).click();await page.getByLabel('Tên vùng',{exact:true}).fill('Tên mới');
 await page.getByRole('button',{name:'Lưu vùng',exact:true}).click();await expect(page.getByRole('button',{name:'Lưu vùng',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Đối chiếu vùng',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Đã đối chiếu vùng ZONE01');expect(api.puts).toHaveLength(1);expect(api.puts[0].revision).toBe(1);
});
test('zone version conflict preserves draft until explicit load of current config',async({page})=>{
 const api=await zoneFixture(page);api.conflict=true;await openZones(page);await page.getByRole('button',{name:'Sửa vùng ZONE01',exact:true}).click();await page.getByLabel('Tên vùng',{exact:true}).fill('Draft name');
 await page.getByRole('button',{name:'Lưu vùng',exact:true}).click();await expect(page.getByLabel('Tên vùng',{exact:true})).toHaveValue('Draft name');await expect(page.getByRole('button',{name:'Lưu vùng',exact:true})).toBeDisabled();
 api.detail=zoneView({...zoneConfig(),name:'Other editor',revision:2});await page.getByRole('button',{name:'Đọc cấu hình mới nhất',exact:true}).click();await expect(page.getByLabel('Tên vùng',{exact:true})).toHaveValue('Other editor');expect(api.puts).toHaveLength(1);
});
test('zone consensus expires while config form pauses polling',async({page})=>{
 await page.clock.install();const api=await zoneFixture(page);await openZones(page);await expect(page.getByLabel('Khảo sát ZONE01',{exact:true})).toContainText('2/3 khô');await page.getByRole('button',{name:'Sửa vùng ZONE01',exact:true}).click();
 const calls=api.calls;await page.clock.fastForward(31000);await expect(page.getByLabel('Khảo sát ZONE01',{exact:true})).toContainText('Dữ liệu khảo sát đã cũ');expect(api.calls).toBe(calls);expect(api.puts).toEqual([]);
});
test('zone API outage and false counts cannot keep a fresh survey claim',async({page})=>{
 const api=await zoneFixture(page);await openZones(page);
 for(const field of ['fail','corrupt'] as const){api[field]=true;await page.getByRole('button',{name:'Làm mới vùng',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByLabel('Khảo sát ZONE01',{exact:true})).toContainText('Chưa đủ dữ liệu');await expect(page.getByRole('button',{name:'Sửa vùng ZONE01',exact:true})).toBeDisabled();api[field]=false;await page.getByRole('button',{name:'Làm mới vùng',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);}
 expect(api.posts).toEqual([]);expect(api.puts).toEqual([]);
});
test('zone mixed packet and wrong source remain unavailable for majority counts',async({page})=>{
 const api=await zoneFixture(page);const v=api.snapshot.zones[0];v.points[1].latest!.sequence=2;v.assessment={state:'INCOHERENT',dryCount:null,wetCount:null,validUntil:null};await openZones(page);await expect(page.getByLabel('Khảo sát ZONE01',{exact:true})).toContainText('chưa thuộc cùng một mẫu');
 v.points[1].latest!.sequence=1;v.points[2].state='SOURCE_MISMATCH';v.points[2].latest!.dataSource='PHYSICAL';v.assessment={state:'UNAVAILABLE',dryCount:null,wetCount:null,validUntil:null};await page.getByRole('button',{name:'Làm mới vùng',exact:true}).click();await expect(page.getByLabel('ZONE01 SOIL3',{exact:true})).toContainText('Nguồn khác cấu hình vùng');await expect(page.getByLabel('Khảo sát ZONE01',{exact:true})).not.toContainText('/3');
});

function weatherNode():FarmNode {const at=new Date().toISOString();return {nodeId:'WEATHER01',name:'Mưa và ánh sáng',areaId:'AREA001',nodeType:'WEATHER',telemetryVersion:2,actuators:[],channels:[{channelId:'RAIN',metric:'RAIN_DETECTED',unit:'boolean',calibrationVersion:null,latest:{value:false,quality:'VALID',observedAt:at,receivedAt:at,bootId:'85000000-0000-4000-8000-000000000001',sequence:1,calibrationVersion:null,dataSource:'SIMULATOR'}},{channelId:'LIGHT',metric:'LIGHT_ILLUMINANCE',unit:'lux',calibrationVersion:'SIM_LUX_V1',latest:null}]};}
test('weather separates no rain, missing light and simulation source without pump calls',async({page})=>{const s=await fixture(page);s.snapshot.nodes=[weatherNode()];await page.goto('/');await expect(page.getByRole('article',{name:'WEATHER01 RAIN'})).toContainText('Không mưa');await expect(page.getByRole('article',{name:'WEATHER01 RAIN'})).not.toContainText('Không có nước');await expect(page.getByRole('article',{name:'WEATHER01 LIGHT'})).toContainText('Chưa có dữ liệu');expect(s.posts).toEqual([]);expect(s.unexpected).toEqual([]);});
test('weather declaration posts only fixed rain and simulated lux channels',async({page})=>{const s=await fixture(page);await page.goto('/');await page.getByRole('button',{name:'Khai báo node thời tiết',exact:true}).click();await page.getByLabel('Mã node',{exact:true}).fill('WEATHER02');await page.getByLabel('Tên node thời tiết',{exact:true}).fill('Thời tiết dãy A');await page.getByRole('button',{name:'Lưu khai báo',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã khai báo WEATHER02');expect(s.posts).toHaveLength(1);expect(s.posts[0].channels).toEqual([{channelId:'RAIN',metric:'RAIN_DETECTED',unit:'boolean',calibrationVersion:null},{channelId:'LIGHT',metric:'LIGHT_ILLUMINANCE',unit:'lux',calibrationVersion:'SIM_LUX_V1'}]);expect(s.unexpected).toEqual([]);});
test('weather uncertain create is reconciled without repeating POST',async({page})=>{const s=await fixture(page);s.unknown=true;await page.goto('/');await page.getByRole('button',{name:'Khai báo node thời tiết',exact:true}).click();await page.getByLabel('Mã node',{exact:true}).fill('WEATHER02');await page.getByLabel('Tên node thời tiết',{exact:true}).fill('Thời tiết');await page.getByRole('button',{name:'Lưu khai báo',exact:true}).click();await expect(page.getByRole('button',{name:'Lưu khai báo',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Kiểm tra khai báo',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã đối chiếu khai báo WEATHER02');expect(s.posts).toHaveLength(1);});
test('stale no-rain and fresh rain fault never claim current dry weather',async({page})=>{const s=await fixture(page),n=weatherNode();n.channels[0].latest!.observedAt=new Date(Date.now()-60000).toISOString();s.snapshot.nodes=[n];await page.goto('/');const c=page.getByRole('article',{name:'WEATHER01 RAIN'});await expect(c).toContainText('Chưa xác định');await expect(c).not.toContainText('Không mưa');n.channels[0].latest={...n.channels[0].latest!,observedAt:new Date().toISOString(),receivedAt:new Date().toISOString(),quality:'SENSOR_FAULT',value:null};await page.getByRole('button',{name:'Làm mới node'}).click();await expect(c).toContainText('Cảm biến báo lỗi');await expect(c).not.toContainText('Không mưa');});
test('clock aging and API failure invalidate no-rain claim then fresh reading recovers',async({page})=>{await page.clock.install();const s=await fixture(page),n=weatherNode();s.snapshot.nodes=[n];await page.goto('/');const c=page.getByRole('article',{name:'WEATHER01 RAIN'});await expect(c).toContainText('Không mưa');await page.clock.runFor(31000);await expect(c).toContainText('Chưa xác định');s.fail=true;await page.getByRole('button',{name:'Làm mới node'}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(c).not.toContainText('Không mưa');s.fail=false;s.snapshot.asOf=await page.evaluate(()=>new Date().toISOString());n.channels[0].latest!.observedAt=n.channels[0].latest!.receivedAt=s.snapshot.asOf;n.channels[0].latest!.value=true;await page.getByRole('button',{name:'Làm mới node'}).click();await expect(c).toContainText('Có mưa');});
test('numeric rain cannot populate weather inventory',async({page})=>{const s=await fixture(page),n=weatherNode();n.channels[0].latest!.value=0;s.snapshot.nodes=[n];await page.goto('/');await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('region',{name:'Node WEATHER01'})).toHaveCount(0);});
test('weather history keeps boolean/fault labels and exports its own CSV',async({page})=>{const a=await historyFixture(page);a.inventory.snapshot.nodes=[weatherNode()];await page.goto('/');await page.getByRole('button',{name:'Lịch sử WEATHER01 RAIN',exact:true}).click();await expect(page.getByRole('region',{name:'Lịch sử kênh thời tiết',exact:true})).toBeVisible();await expect(page.getByRole('table')).toContainText('Không mưa');await expect(page.getByRole('table')).toContainText('Có mưa');await expect(page.getByRole('table')).toContainText('Lỗi cảm biến');const download=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất CSV trang này',exact:true}).click();expect((await download).suggestedFilename()).toBe('weather-history-WEATHER01-RAIN.csv');expect(a.inventory.posts).toEqual([]);expect(a.inventory.unexpected).toEqual([]);});
test('weather lux history treats zero as valid and keeps SIM_LUX_V1',async({page})=>{const a=await historyFixture(page);a.inventory.snapshot.nodes=[weatherNode()];await page.goto('/');await page.getByRole('button',{name:'Lịch sử WEATHER01 LIGHT',exact:true}).click();await expect(page.getByRole('table')).toContainText('0 lux');await expect(page.getByRole('table')).toContainText('SIM_LUX_V1');expect(a.inventory.posts).toEqual([]);});

import type {RainView} from '../../src/modules/iot/zones/rainGateApi';
async function rainFixture(page:Page){
 const api=await zoneFixture(page);api.inventory.snapshot.nodes.push({nodeId:'WEATHER01',name:'Trạm mưa',areaId:'AREA001',nodeType:'WEATHER',telemetryVersion:2,actuators:[],channels:[{channelId:'RAIN',metric:'RAIN_DETECTED',unit:'boolean',calibrationVersion:null,latest:null},{channelId:'LIGHT',metric:'LIGHT_ILLUMINANCE',unit:'lux',calibrationVersion:'LUX1',latest:null}]});
 const state={api,view:{zoneId:'ZONE01',zoneRevision:1,areaId:'AREA001',zoneSource:'SIMULATOR',asOf:new Date().toISOString(),policy:null,state:'NOT_CONFIGURED',allowed:true,validUntil:null,sample:null} as RainView,lost:false,fail:false,reject:false,puts:[] as any[]};
 await page.route('**/api/v1/irrigation-zones/ZONE01/weather',async route=>{const r=route.request();if(r.method()==='GET'){await route.fulfill({status:state.fail?503:200,json:state.view});return;}
  if(r.method()==='PUT'){const q=r.postDataJSON();state.puts.push(q);if(state.reject){await route.fulfill({status:409,json:{}});return;}const {expectedRevision,...body}=q;state.view={...state.view,policy:{...body,zoneId:'ZONE01',revision:expectedRevision+1},state:q.enabled?'MISSING':'DISABLED',allowed:!q.enabled,validUntil:null,sample:null};if(state.lost){await route.abort();return;}await route.fulfill({json:state.view.policy});return;}api.inventory.unexpected.push(r.method());await route.abort();});return state;
}
function dryRain(state:Awaited<ReturnType<typeof rainFixture>>,secondsOld=0){const at=new Date(Date.now()-secondsOld*1000).toISOString();state.view={...state.view,asOf:new Date().toISOString(),policy:{zoneId:'ZONE01',revision:1,zoneRevision:1,nodeId:'WEATHER01',channelId:'RAIN',expectedSource:'SIMULATOR',calibrationVersion:null,enabled:true},state:'DRY',allowed:true,validUntil:new Date(Date.parse(at)+30000).toISOString(),sample:{value:false,quality:'VALID',observedAt:at,receivedAt:at,bootId:'44000000-0000-4000-8000-000000000001',sequence:1,dataSource:'SIMULATOR',calibrationVersion:null}};}
async function openRain(page:Page){await openZones(page);await page.getByRole('button',{name:'Chốt mưa ZONE01',exact:true}).click();await expect(page.getByRole('region',{name:'Chốt mưa ZONE01',exact:true})).toBeVisible();}
async function enableRain(page:Page){await page.getByLabel('Bật chốt mưa cho vùng',{exact:true}).check();await page.getByLabel('Node mưa',{exact:true}).selectOption('WEATHER01');}
test('rain gate starts unconfigured and sends no commands or config writes',async({page})=>{const s=await rainFixture(page);await openRain(page);await expect(page.getByLabel('Kết quả chốt mưa')).toHaveText('Chưa cấu hình chốt mưa');await expect(page.getByRole('button',{name:'Lưu chốt mưa',exact:true})).toBeDisabled();expect(s.puts).toEqual([]);expect(s.api.inventory.unexpected).toEqual([]);});
test('rain config binds rain channel and exact revisions, never light',async({page})=>{const s=await rainFixture(page);await openRain(page);await enableRain(page);await expect(page.getByLabel('Kênh mưa',{exact:true})).toHaveValue('RAIN');await expect(page.getByLabel('Kênh mưa',{exact:true}).getByRole('option',{name:'LIGHT',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Lưu chốt mưa',exact:true}).click();await expect(page.getByLabel('Kết quả chốt mưa')).toHaveText('Chưa có mẫu mưa');expect(s.puts).toEqual([{expectedRevision:0,zoneRevision:1,nodeId:'WEATHER01',channelId:'RAIN',expectedSource:'SIMULATOR',calibrationVersion:null,enabled:true,stopOnRain:false}]);expect(s.api.inventory.unexpected).toEqual([]);});
test('lost rain save reconciles by GET without another PUT',async({page})=>{const s=await rainFixture(page);s.lost=true;await openRain(page);await enableRain(page);await page.getByRole('button',{name:'Lưu chốt mưa',exact:true}).click();await expect(page.getByRole('button',{name:'Lưu chốt mưa',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Đối chiếu chốt mưa',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã đối chiếu đúng cấu hình');expect(s.puts).toHaveLength(1);});
test('uncertain rain save with different readback keeps edits and retry blocked',async({page})=>{const s=await rainFixture(page);s.lost=true;await openRain(page);await enableRain(page);await page.getByRole('button',{name:'Lưu chốt mưa',exact:true}).click();await expect(page.getByRole('button',{name:'Đối chiếu chốt mưa',exact:true})).toBeVisible();s.view.policy!.revision=3;await page.getByRole('button',{name:'Đối chiếu chốt mưa',exact:true}).click();await expect(page.getByRole('status')).toContainText('cấu hình hiện tại khác');await expect(page.getByLabel('Node mưa',{exact:true})).toBeDisabled();expect(s.puts).toHaveLength(1);});
test('rain revision conflict requires explicit reread',async({page})=>{const s=await rainFixture(page);s.reject=true;await openRain(page);await enableRain(page);await page.getByRole('button',{name:'Lưu chốt mưa',exact:true}).click();await expect(page.getByRole('status')).toContainText('Chưa lưu');await expect(page.getByRole('button',{name:'Lưu chốt mưa',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Đọc cấu hình chốt mưa mới nhất',exact:true}).click();await expect(page.getByLabel('Bật chốt mưa cho vùng',{exact:true})).not.toBeChecked();expect(s.puts).toHaveLength(1);});
test('dry rain gate expires despite unchanged successful polling and unsaved edits',async({page})=>{await page.clock.install();const s=await rainFixture(page);dryRain(s,25);await openRain(page);await expect(page.getByLabel('Kết quả chốt mưa')).toContainText('Không mưa');await page.getByLabel('Bật chốt mưa cho vùng',{exact:true}).uncheck();await page.clock.runFor(6000);await expect(page.getByLabel('Kết quả chốt mưa')).toHaveText('Mẫu mưa đã cũ');await expect(page.getByLabel('Bật chốt mưa cho vùng',{exact:true})).not.toBeChecked();expect(s.puts).toEqual([]);});
test('failed rain API hides permission and recovers without sending commands',async({page})=>{const s=await rainFixture(page);dryRain(s);await openRain(page);await expect(page.getByLabel('Kết quả chốt mưa')).toContainText('Không mưa');s.fail=true;await page.getByRole('button',{name:'Làm mới chốt mưa',exact:true}).click();await expect(page.getByLabel('Kết quả chốt mưa')).toHaveText('Chưa xác nhận dữ liệu mới');s.fail=false;await page.getByRole('button',{name:'Làm mới chốt mưa',exact:true}).click();await expect(page.getByLabel('Kết quả chốt mưa')).toContainText('Không mưa');expect(s.puts).toEqual([]);expect(s.api.inventory.unexpected).toEqual([]);});
test('rain true and sensor fault never show dry admission',async({page})=>{const s=await rainFixture(page);dryRain(s);s.view.sample!.value=true;s.view.state='RAIN';s.view.allowed=false;await openRain(page);await expect(page.getByLabel('Kết quả chốt mưa')).toContainText('Có mưa');s.view.sample!.value=null;s.view.sample!.quality='SENSOR_FAULT';s.view.state='SENSOR_FAULT';s.view.validUntil=null;await page.getByRole('button',{name:'Làm mới chốt mưa',exact:true}).click();await expect(page.getByLabel('Kết quả chốt mưa')).toHaveText('Cảm biến mưa báo lỗi');expect(s.puts).toEqual([]);});

async function stopFixture(page:Page){const s=await rainFixture(page);const state={s,fail:false,wrong:false,worker:true,items:[] as any[]};await page.route('**/api/v1/irrigation-zones/ZONE01/weather/stops',async route=>{if(route.request().method()!=='GET'){s.api.inventory.unexpected.push('Stop write');await route.abort();return;}await route.fulfill({status:state.fail?503:200,json:{zoneId:state.wrong?'OTHER':'ZONE01',asOf:new Date().toISOString(),workerEnabled:state.worker,items:state.items}});});return state;}
function stopItem(s:Awaited<ReturnType<typeof rainFixture>>){dryRain(s);s.view.state='RAIN';s.view.allowed=false;s.view.sample!.value=true;s.view.policy!.stopOnRain=true;return {sessionId:'44000000-0000-4000-8000-000000000001',requestId:'44000000-0000-4000-8000-000000000002',circuitId:'CIRCUIT01',createdAt:new Date().toISOString(),evidence:structuredClone(s.view),operationState:'RETURNED',commandState:'SENT',errorCode:null};}
test('weather stop is explicit opt-in and disabled without rain admission',async({page})=>{const s=await rainFixture(page);await openRain(page);await expect(page.getByLabel('Yêu cầu OFF khi thời tiết không cho phép trong phiên tưới',{exact:true})).toBeDisabled();await enableRain(page);await expect(page.getByLabel('Yêu cầu OFF khi thời tiết không cho phép trong phiên tưới',{exact:true})).not.toBeChecked();await page.getByLabel('Yêu cầu OFF khi thời tiết không cho phép trong phiên tưới',{exact:true}).check();await page.getByRole('button',{name:'Lưu chốt mưa',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu chốt mưa');expect(s.puts[0].stopOnRain).toBe(true);});
test('disabling admission clears stop mode in same policy save',async({page})=>{const s=await rainFixture(page);stopItem(s);await openRain(page);await page.getByLabel('Bật chốt mưa cho vùng',{exact:true}).uncheck();await expect(page.getByLabel('Yêu cầu OFF khi thời tiết không cho phép trong phiên tưới',{exact:true})).not.toBeChecked();await page.getByRole('button',{name:'Lưu chốt mưa',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu chốt mưa');expect(s.puts[0].stopOnRain).toBe(false);expect(s.puts[0].enabled).toBe(false);});
test('stop history shows evidence and returned call without claiming physical OFF',async({page})=>{const a=await stopFixture(page);a.items=[stopItem(a.s)];await openRain(page);await page.getByRole('button',{name:'Lịch sử dừng do thời tiết',exact:true}).click();await expect(page.getByRole('region',{name:'Lịch sử dừng thời tiết ZONE01',exact:true})).toBeVisible();await expect(page.getByRole('article')).toContainText('CIRCUIT01');await expect(page.getByRole('article')).toContainText('SENT');await expect(page.getByRole('article')).toContainText('WEATHER01/RAIN');await expect(page.getByRole('article')).not.toContainText('Đã tắt');await page.getByRole('button',{name:'Quay lại chốt mưa',exact:true}).click();expect(a.s.puts).toEqual([]);expect(a.s.api.inventory.unexpected).toEqual([]);});
test('weather stop shows MQTT failure separately from operation returned',async({page})=>{const a=await stopFixture(page);a.items=[{...stopItem(a.s),commandState:'FAILED',errorCode:'MQTT_UNAVAILABLE'}];await openRain(page);await page.getByRole('button',{name:'Lịch sử dừng do thời tiết',exact:true}).click();await expect(page.getByRole('article')).toContainText('FAILED · MQTT_UNAVAILABLE');await expect(page.getByRole('article')).toContainText('cần kiểm tra trạng thái thiết bị');expect(a.s.puts).toEqual([]);});
test('weather stop unresolved entry has no retry button or command writes',async({page})=>{const a=await stopFixture(page);a.items=[{...stopItem(a.s),operationState:'UNRESOLVED',commandState:'PUBLISH_UNCERTAIN'}];await openRain(page);await page.getByRole('button',{name:'Lịch sử dừng do thời tiết',exact:true}).click();await expect(page.getByRole('article')).toContainText('Kết quả chưa rõ');await expect(page.getByRole('article')).toContainText('PUBLISH_UNCERTAIN');await expect(page.getByRole('button',{name:'Gửi lại',exact:true})).toHaveCount(0);expect(a.s.puts).toEqual([]);});
test('weather stop API failure and wrong zone hide fresh backend mode until recovery',async({page})=>{const a=await stopFixture(page);a.worker=false;await openRain(page);await page.getByRole('button',{name:'Lịch sử dừng do thời tiết',exact:true}).click();await expect(page.getByLabel('Chế độ giám sát thời tiết')).toHaveText('Backend chưa bật chế độ giám sát thời tiết');a.fail=true;await page.getByRole('button',{name:'Đọc lịch sử dừng thời tiết',exact:true}).click();await expect(page.getByLabel('Chế độ giám sát thời tiết')).toHaveText('Chưa xác nhận cấu hình backend mới');a.fail=false;a.wrong=true;await page.getByRole('button',{name:'Đọc lịch sử dừng thời tiết',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();a.wrong=false;a.worker=true;await page.getByRole('button',{name:'Đọc lịch sử dừng thời tiết',exact:true}).click();await expect(page.getByLabel('Chế độ giám sát thời tiết')).toHaveText('Backend đã bật chế độ giám sát thời tiết');expect(a.s.api.inventory.unexpected).toEqual([]);});

// Schedule plans generate queue entries only; all device/control endpoints remain forbidden.
async function scheduleFixture(page:Page){
 const z=await zoneFixture(page),config={circuitId:'PC1',name:'Nhánh lịch',zoneId:'ZONE01',zoneRevision:1,controllerId:'IRRIGATION18',valveId:'VALVE18',pumpId:'PUMP01',waterNodeId:'WATER01',lowChannelId:'LOW',flowChannelId:'FLOW',expectedSource:'SIMULATOR',revision:1};
 const state={view:{mode:'SCHEDULE_TO_QUEUE',zoneId:'ZONE01',asOf:new Date().toISOString(),workerEnabled:true,lastTickAt:null,lastTickResult:'DISABLED',zoneRevision:1,circuit:config,configurationState:'NO_PLAN',plan:null,nextDueAt:null,occurrences:[]} as any,puts:[] as any[],lost:false,conflict:false,fail:false,wrong:false,ignore:false,z};
 await page.route('**/queue-schedule',async route=>{
  const r=route.request();if(r.method()==='GET'){const body=structuredClone(state.view);body.asOf=new Date().toISOString();if(state.wrong)body.zoneId='OTHER';await route.fulfill({status:state.fail?503:200,json:body});return;}
  if(r.method()!=='PUT'){z.inventory.unexpected.push(r.method()+' '+r.url());await route.abort();return;}
  const body=r.postDataJSON();state.puts.push(body);if(state.conflict){await route.fulfill({status:409,json:{}});return;}
  if(!state.ignore)Object.assign(state.view,{configurationState:'CURRENT',plan:{revision:body.revision+1,definition:body,zoneSnapshot:zoneConfig(),circuitSnapshot:config,updatedAt:new Date().toISOString()},nextDueAt:body.enabled?new Date(Date.now()+86400000).toISOString():null});
  if(state.lost){await route.abort('failed');return;}await route.fulfill({json:{...state.view,asOf:new Date().toISOString()}});
 });return state;
}
async function openSchedule(page:Page){await openZones(page);await page.getByRole('button',{name:'Lịch tưới ZONE01',exact:true}).click();await expect(page.getByRole('heading',{name:'Lịch tưới theo vùng ZONE01',exact:true})).toBeVisible();await expect(page.getByLabel('Thời lượng lịch',{exact:true})).toBeEnabled();}
test('schedule opens from zone without writing and defaults obey disabled backend',async({page})=>{const s=await scheduleFixture(page);s.view.workerEnabled=false;await openSchedule(page);await expect(page.getByLabel('Bật lịch tạo lượt chờ',{exact:true})).toBeDisabled();await expect(page.getByText('Chưa có lần đến lịch được ghi nhận.',{exact:false})).toBeVisible();expect(s.puts).toHaveLength(0);expect(s.z.inventory.unexpected).toEqual([]);});
test('schedule saves reviewed weekday time and duration without creating a device command',async({page})=>{const s=await scheduleFixture(page);await openSchedule(page);await page.getByLabel('Bật lịch tạo lượt chờ',{exact:true}).check();await page.getByLabel('Thời lượng lịch',{exact:true}).fill('7');await page.getByLabel('Giờ lịch 1',{exact:true}).fill('07:30');await page.getByRole('button',{name:'Lưu lịch vùng',exact:true}).click();await expect(page.getByText('Đã lưu lịch tạo lượt chờ.',{exact:false})).toBeVisible();expect(s.puts).toHaveLength(1);expect(s.puts[0]).toMatchObject({revision:0,enabled:true,circuitId:'PC1',zoneRevision:1,durationSeconds:7,timezone:'Asia/Ho_Chi_Minh',slots:[{days:[1,2,3,4,5,6,7],time:'07:30'}]});expect(s.z.inventory.unexpected).toEqual([]);});
test('schedule duplicate time is rejected before PUT',async({page})=>{const s=await scheduleFixture(page);await openSchedule(page);await page.getByRole('button',{name:'Thêm giờ',exact:true}).click();await page.getByLabel('Giờ lịch 2',{exact:true}).fill('06:00');await page.getByRole('button',{name:'Lưu lịch vùng',exact:true}).click();await expect(page.getByRole('alert')).toContainText('bị trùng');expect(s.puts).toHaveLength(0);});
test('schedule revision conflict keeps one request and never retries automatically',async({page})=>{const s=await scheduleFixture(page);s.conflict=true;await openSchedule(page);await page.getByRole('button',{name:'Lưu lịch vùng',exact:true}).click();await expect(page.getByRole('alert')).toContainText('đã đổi');expect(s.puts).toHaveLength(1);await page.getByRole('button',{name:'Đọc đối chiếu lịch',exact:true}).click();expect(s.puts).toHaveLength(1);});
test('schedule lost save survives reload and exact GET readback does not repeat PUT',async({page})=>{const s=await scheduleFixture(page);s.lost=true;await openSchedule(page);await page.getByLabel('Bật lịch tạo lượt chờ',{exact:true}).check();await page.getByRole('button',{name:'Lưu lịch vùng',exact:true}).click();await expect(page.getByText('Ý định lưu chưa được đối chiếu.',{exact:false})).toBeVisible();await page.reload();await page.getByRole('button',{name:'Vùng tưới',exact:true}).click();await page.getByRole('button',{name:'Lịch tưới ZONE01',exact:true}).click();await expect(page.getByText('Đã đối chiếu lịch đã lưu.',{exact:true})).toBeVisible();expect(s.puts).toHaveLength(1);});
test('schedule unresolved old revision stays blocked until explicit read and discard',async({page})=>{const s=await scheduleFixture(page);s.lost=s.ignore=true;await openSchedule(page);await page.getByRole('button',{name:'Lưu lịch vùng',exact:true}).click();await expect(page.getByRole('button',{name:'Lưu lịch vùng',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Đọc đối chiếu lịch',exact:true}).click();await expect(page.getByRole('button',{name:'Lưu lịch vùng',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Bỏ ý định chờ và đọc bản hiện tại',exact:true}).click();await expect(page.getByRole('button',{name:'Lưu lịch vùng',exact:true})).toBeEnabled();expect(s.puts).toHaveLength(1);});
test('schedule wrong scope or outage cannot leave an editable stale plan',async({page})=>{const s=await scheduleFixture(page);await openSchedule(page);s.wrong=true;await page.getByRole('button',{name:'Đọc đối chiếu lịch',exact:true}).click();await expect(page.getByRole('alert')).toContainText('không khớp');await expect(page.getByRole('button',{name:'Lưu lịch vùng',exact:true})).toBeDisabled();s.wrong=false;s.fail=true;await page.getByRole('button',{name:'Đọc đối chiếu lịch',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Không đọc được');});
test('schedule occurrence shows skipped condition separately from a queued item',async({page})=>{const s=await scheduleFixture(page);const at=new Date(Date.now()-60000).toISOString(),definition={revision:0,enabled:true,zoneRevision:1,circuitId:'PC1',circuitRevision:1,durationSeconds:5,timezone:'Asia/Ho_Chi_Minh',slots:[{days:[1],time:'06:00'}],reviewedAt:at};s.view.occurrences=[{dueAt:at,scheduleRevision:1,definition,state:'SKIPPED',reason:'QUEUE_FULL',requestId:null,evaluatedAt:at}];await openSchedule(page);await expect(page.getByRole('region',{name:'Các lần đến lịch',exact:true})).toContainText('hàng chờ đã đầy');expect(s.puts).toHaveLength(0);});
