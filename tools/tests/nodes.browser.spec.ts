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
  const rows=Array.from({length:size},(_,i)=>({sampleId:(next?100:200)-i,value:quality==='SENSOR_FAULT'||(!quality&&!api.paged&&i===0)?null:channelId==='LOW'?false:i===2?6:0,
   quality:quality??(!api.paged&&i===0?'SENSOR_FAULT':'VALID'),observedAt:new Date(Date.parse(q.get('to')!)-(next?10000:5000)-i).toISOString(),receivedAt:new Date().toISOString(),
   bootId:'37000000-0000-4000-8000-000000000001',sequence:(next?100:200)-i,calibrationVersion:channel.calibrationVersion,dataSource:source}));
  const response={nodeId:bad?'WATER02':'WATER01',channel:{...channel,latest:undefined},from:q.get('from'),to:q.get('to'),dataSource:q.get('dataSource'),quality:q.get('quality'),snapshotId:200,items:rows,nextCursor:api.paged&&!next?'NEXT':null};
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
 await page.getByRole('button',{name:'Quay lại Node & trạm nước',exact:true}).click();await expect(page.getByRole('button',{name:'Khai báo trạm nước',exact:true})).toBeVisible();
});

test('water minute-only input does not remain dirty after applying equivalent time',async({page})=>{
 await historyFixture(page);await openHistory(page);await expect(page.getByRole('table')).toBeVisible();
 const input=page.getByLabel('Lịch sử từ',{exact:true});const minute=(await input.inputValue()).slice(0,16);
 await input.fill(minute);await page.getByRole('button',{name:'Áp dụng lịch sử'}).click();
 await expect(page.getByRole('button',{name:'Xuất CSV trang này'})).toBeEnabled();await expect(page.getByText('Bộ lọc đã đổi; áp dụng để xem kết quả và xuất CSV tương ứng.',{exact:true})).toHaveCount(0);
});
