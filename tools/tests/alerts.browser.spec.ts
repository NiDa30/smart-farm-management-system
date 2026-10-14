import {test,expect,type Page} from '@playwright/test';
import type {SensorAlert} from '../../src/modules/iot/alerts/alertApi';
const initial=():SensorAlert=>({id:1,deviceId:'ENV01',type:'LOW_SOIL',openedAt:new Date().toISOString(),openedValue:28,clearedAt:null,clearedValue:null,acknowledgedAt:null,acknowledgementNote:null});
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return {promise,resolve};}
async function fixtures(page:Page){
 const state={alert:initial(),listVisible:true,failList:false,listGate:null as Promise<void>|null,listCalls:0,putGate:null as Promise<void>|null,putStatus:200,loseResponse:false,invalidResponse:false,puts:[] as unknown[],unexpected:[] as string[],detailCalls:0};
 await page.route('**/*',async route=>{if(new URL(route.request().url()).origin!=='http://127.0.0.1:4182'){state.unexpected.push(route.request().url());await route.abort();return;}await route.continue();});
 await page.route('**/api/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path==='/api/v1/alerts'&&request.method()==='GET'){
   state.listCalls++;const value=state.listVisible?[structuredClone(state.alert)]:[],fail=state.failList,gate=state.listGate;state.listGate=null;
   if(gate)await gate;await route.fulfill({status:fail?503:200,json:value});return;
  }
  if(path==='/api/v1/alerts/1'&&request.method()==='GET'){state.detailCalls++;await route.fulfill({json:state.alert});return;}
  if(path==='/api/v1/alerts/1/acknowledgement'&&request.method()==='PUT'){
   const input=request.postDataJSON();state.puts.push(input);if(state.putGate)await state.putGate;
   if(state.putStatus!==200){await route.fulfill({status:state.putStatus,json:{}});return;}
   state.alert={...state.alert,acknowledgedAt:new Date().toISOString(),acknowledgementNote:input.note||null};
   if(state.loseResponse){await route.abort('connectionfailed');return;}
   await route.fulfill({json:state.invalidResponse?{}:state.alert});return;
  }
  state.unexpected.push(request.method()+' '+path);await route.abort();
 });return state;
}
const detail=(page:Page)=>page.getByRole('region',{name:'Xác nhận cảnh báo',exact:true});
async function open(page:Page){await page.goto('/');await page.getByRole('button',{name:'Chi tiết cảnh báo #1',exact:true}).click();}

test('acknowledgement saves note only after response, leaves alert active and supports independent filters',async({page})=>{
 const api=await fixtures(page);await open(page);
 await page.getByLabel('Ghi chú khi xác nhận',{exact:true}).fill('  Đã kiểm tra sensor  ');
 const gate=deferred();api.putGate=gate.promise;
 await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();
 await expect.poll(()=>api.puts.length).toBe(1);await expect(page.getByText('Đã lưu xác nhận đã xem.',{exact:true})).toHaveCount(0);
 gate.resolve();await expect(page.getByText('Đã lưu xác nhận đã xem.',{exact:true})).toBeVisible();
 await expect(detail(page)).toContainText('Điều kiện cảm biến: Đang cảnh báo');
 await expect(detail(page)).toContainText('Ghi chú đã lưu: Đã kiểm tra sensor');
 await page.getByLabel('Xác nhận',{exact:true}).selectOption('seen');await expect(page.getByRole('article')).toHaveCount(1);
 await page.getByLabel('Điều kiện',{exact:true}).selectOption('cleared');await expect(page.getByRole('article')).toHaveCount(0);
 expect(api.puts).toEqual([{note:'Đã kiểm tra sensor'}]);expect(api.unexpected).toEqual([]);
});

test('draft survives polling and 500-character note limit is enforced',async({page})=>{
 const api=await fixtures(page);await open(page);
 const input=page.getByLabel('Ghi chú khi xác nhận',{exact:true});await input.fill('Draft note');
 const calls=api.listCalls;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect.poll(()=>api.listCalls).toBeGreaterThan(calls);
 await expect(input).toHaveValue('Draft note');await expect(input).toHaveAttribute('maxlength','500');expect(api.puts).toEqual([]);
});

test('lost response never auto retries and detail remains available outside latest hundred',async({page})=>{
 const api=await fixtures(page);api.loseResponse=true;await open(page);
 await page.getByLabel('Ghi chú khi xác nhận',{exact:true}).fill('Observed');
 await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();
 await expect(detail(page).getByRole('alert')).toContainText('Đối chiếu trạng thái');
 api.listVisible=false;await page.getByRole('button',{name:'Làm mới',exact:true}).click();
 await expect(page.getByRole('article')).toHaveCount(0);await expect(detail(page)).toBeVisible();
 await detail(page).getByRole('button',{name:'Đối chiếu trạng thái',exact:true}).click();
 await expect(detail(page).getByRole('alert')).toHaveCount(0);await expect(detail(page)).toContainText('Ghi chú đã lưu: Observed');
 expect(api.puts).toHaveLength(1);expect(api.detailCalls).toBe(1);
});

test('another tab wins; stored note not overwritten and unsaved draft stays visible',async({page})=>{
 const api=await fixtures(page);api.putStatus=409;await open(page);
 await page.getByLabel('Ghi chú khi xác nhận',{exact:true}).fill('My draft');
 api.alert={...api.alert,acknowledgedAt:new Date().toISOString(),acknowledgementNote:'Other operator note'};
 await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();await expect(detail(page).getByRole('alert')).toContainText('phiên khác');
 await detail(page).getByRole('button',{name:'Đối chiếu trạng thái',exact:true}).click();
 await expect(detail(page)).toContainText('Ghi chú đã lưu: Other operator note');await expect(detail(page)).toContainText('Bản nháp: My draft');
 expect(api.puts).toHaveLength(1);
});

test('telemetry clears while acknowledging; cannot invent acknowledgement or close outcome',async({page})=>{
 const api=await fixtures(page);api.putStatus=409;await open(page);
 api.alert={...api.alert,clearedAt:new Date().toISOString(),clearedValue:40};
 await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();
 await detail(page).getByRole('button',{name:'Đối chiếu trạng thái',exact:true}).click();
 await expect(detail(page)).toContainText('Điều kiện cảm biến: Đã trở về bình thường');
 await expect(detail(page)).toContainText('Xác nhận đã xem: Chưa xem');
 await expect(detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true})).toHaveCount(0);
});

for(const mode of ['bad-body','server-error'])test(`uncertain save ${mode} requires readback before another write`,async({page})=>{
 const api=await fixtures(page);api.invalidResponse=mode==='bad-body';api.putStatus=mode==='server-error'?503:200;
 await open(page);await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();
 await expect(detail(page).getByRole('alert')).toBeVisible();await expect(page.getByText('Đã lưu xác nhận đã xem.',{exact:true})).toHaveCount(0);
 // A server failure may leave the form open; it must be blocked until explicit readback.
 const button=detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true});
 if(await button.count())await expect(button).toBeDisabled();expect(api.puts).toHaveLength(1);
});

test('API outage blocks writes, recovery preserves draft and safe rendering of note text',async({page})=>{
 const api=await fixtures(page);await open(page);const note='<img src=x onerror="window.bad=true">';
 await page.getByLabel('Ghi chú khi xác nhận',{exact:true}).fill(note);
 api.failList=true;await page.getByRole('button',{name:'Làm mới',exact:true}).click();
 await expect(detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true})).toBeDisabled();
 api.failList=false;await page.getByRole('button',{name:'Làm mới',exact:true}).click();
 await expect(detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true})).toBeEnabled();
 await expect(page.getByLabel('Ghi chú khi xác nhận',{exact:true})).toHaveValue(note);
 await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();
 await expect(detail(page)).toContainText('Ghi chú đã lưu: '+note);await expect(detail(page).locator('img')).toHaveCount(0);expect(api.unexpected).toEqual([]);
});

test('old delayed list cannot erase acknowledged result',async({page})=>{
 const api=await fixtures(page);await open(page);const stale=deferred();api.listGate=stale.promise;const calls=api.listCalls;
 await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect.poll(()=>api.listCalls).toBeGreaterThan(calls);
 await page.getByLabel('Ghi chú khi xác nhận',{exact:true}).fill('Fresh note');
 await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();
 await expect(detail(page)).toContainText('Ghi chú đã lưu: Fresh note');stale.resolve();
 await expect(detail(page)).toContainText('Ghi chú đã lưu: Fresh note');expect(api.puts).toHaveLength(1);
});

// Separate API collection; fixtures never publish MQTT or contact AWS.
const waterInitial=()=>({id:1,nodeId:'WATER01',type:'LOW_WATER',channelId:null,dataSource:'SIMULATOR',openedSampleId:20,
 openedAt:new Date().toISOString(),openedReceivedAt:new Date().toISOString(),clearedSampleId:null,clearedAt:null,clearedReceivedAt:null,
 acknowledgedAt:null as string|null,acknowledgementNote:null as string|null});
async function waterFixtures(page:Page){
 const state={alert:waterInitial(),failList:false,invalidList:false,loseResponse:false,putStatus:200,invalidResponse:false,wrongIdentity:false,puts:[] as unknown[],unexpected:[] as string[],listGate:null as Promise<void>|null,calls:0};
 await page.route('**/*',async route=>{if(new URL(route.request().url()).origin!=='http://127.0.0.1:4182'){state.unexpected.push(route.request().url());await route.abort();return;}await route.continue();});
 await page.route('**/api/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname,method=request.method();
  if(path==='/api/v1/alerts'&&method==='GET'){await route.fulfill({json:[]});return;}
  if(path==='/api/v1/water-alerts'&&method==='GET'){
   state.calls++;const snapshot=structuredClone(state.alert),gate=state.listGate;state.listGate=null;if(gate)await gate;
   await route.fulfill({status:state.failList?503:200,json:state.invalidList?[{...snapshot,dataSource:'REAL'}]:[snapshot]});return;
  }
  if(path==='/api/v1/water-alerts/1'&&method==='GET'){await route.fulfill({json:state.alert});return;}
  if(path==='/api/v1/water-alerts/1/acknowledgement'&&method==='PUT'){
   const input=request.postDataJSON();state.puts.push(input);
   if(state.putStatus!==200){await route.fulfill({status:state.putStatus,json:{}});return;}
   state.alert={...state.alert,acknowledgedAt:new Date().toISOString(),acknowledgementNote:input.note||null};
   if(state.loseResponse){await route.abort('connectionfailed');return;}
   await route.fulfill({json:state.invalidResponse?{}:state.wrongIdentity?{...state.alert,nodeId:'WATER02'}:state.alert});return;
  }
  state.unexpected.push(method+' '+path);await route.abort();
 });return state;
}
async function waterOpen(page:Page){await page.goto('/');await page.getByRole('button',{name:'Trạm nước',exact:true}).click();await page.getByRole('button',{name:'Chi tiết cảnh báo nước #1',exact:true}).click();}

test('water alerts show declared simulation, packet evidence and independent source filters',async({page})=>{
 const api=await waterFixtures(page);await waterOpen(page);
 await expect(page.getByRole('article')).toContainText('Mô phỏng (thiết bị khai báo)');await expect(page.getByRole('article')).toContainText('Mẫu #20');
 await page.getByLabel('Nguồn cảnh báo nước').selectOption('PHYSICAL');await expect(page.getByRole('article')).toHaveCount(0);
 await page.getByLabel('Nguồn cảnh báo nước').selectOption('SIMULATOR');await expect(page.getByRole('article')).toHaveCount(1);
 const note='<img src=x onerror="bad()">';await page.getByLabel('Ghi chú khi xác nhận',{exact:true}).fill(note);
 await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();
 await expect(detail(page)).toContainText('Ghi chú đã lưu: '+note);await expect(detail(page).locator('img')).toHaveCount(0);
 await expect(detail(page)).toContainText('Điều kiện cảm biến: Đang cảnh báo');expect(api.puts).toEqual([{note}]);expect(api.unexpected).toEqual([]);
});
test('water lost acknowledgment response requires readback and never retries automatically',async({page})=>{
 const api=await waterFixtures(page);api.loseResponse=true;await waterOpen(page);
 await page.getByLabel('Ghi chú khi xác nhận',{exact:true}).fill('Inspect floats');await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();
 await expect(detail(page).getByRole('alert')).toContainText('Đối chiếu trạng thái');
 await detail(page).getByRole('button',{name:'Đối chiếu trạng thái',exact:true}).click();
 await expect(detail(page)).toContainText('Ghi chú đã lưu: Inspect floats');expect(api.puts).toHaveLength(1);
});
test('water outage or invalid provenance blocks acknowledgment and recovery preserves draft',async({page})=>{
 const api=await waterFixtures(page);await waterOpen(page);await page.getByLabel('Ghi chú khi xác nhận',{exact:true}).fill('Draft');
 for(const key of ['failList','invalidList'] as const){
  api[key]=true;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true})).toBeDisabled();
  api[key]=false;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true})).toBeEnabled();
 }
 await expect(page.getByLabel('Ghi chú khi xác nhận',{exact:true})).toHaveValue('Draft');expect(api.puts).toEqual([]);
});
test('water cleared concurrently cannot invent acknowledgment',async({page})=>{
 const api=await waterFixtures(page);api.putStatus=409;await waterOpen(page);
 Object.assign(api.alert,{clearedSampleId:21,clearedAt:new Date().toISOString(),clearedReceivedAt:new Date().toISOString()});
 await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();await expect(detail(page).getByRole('alert')).toContainText('Đối chiếu');
 await detail(page).getByRole('button',{name:'Đối chiếu trạng thái',exact:true}).click();
 await expect(detail(page)).toContainText('Điều kiện cảm biến: Đã trở về bình thường');await expect(detail(page)).toContainText('Xác nhận đã xem: Chưa xem');expect(api.puts).toHaveLength(1);
});
test('water delayed old list cannot erase an acknowledged note',async({page})=>{
 const api=await waterFixtures(page);await waterOpen(page);const gate=deferred();api.listGate=gate.promise;const calls=api.calls;
 await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect.poll(()=>api.calls).toBeGreaterThan(calls);
 await page.getByLabel('Ghi chú khi xác nhận',{exact:true}).fill('Fresh');await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();
 await expect(detail(page)).toContainText('Ghi chú đã lưu: Fresh');gate.resolve();await expect(detail(page)).toContainText('Ghi chú đã lưu: Fresh');expect(api.puts).toHaveLength(1);
});
for(const mode of ['bad-body','server-error'])test(`water uncertain save ${mode} requires explicit readback`,async({page})=>{
 const api=await waterFixtures(page);api.invalidResponse=mode==='bad-body';api.putStatus=mode==='server-error'?503:200;
 await waterOpen(page);await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();await expect(detail(page).getByRole('alert')).toBeVisible();
 await expect(page.getByText('Đã lưu xác nhận đã xem.',{exact:true})).toHaveCount(0);expect(api.puts).toHaveLength(1);
});

test('water acknowledgment with same ID but another node is not accepted as success',async({page})=>{
 const api=await waterFixtures(page);api.wrongIdentity=true;await waterOpen(page);
 await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();
 await expect(detail(page).getByRole('alert')).toContainText('không khớp');await expect(page.getByText('Đã lưu xác nhận đã xem.',{exact:true})).toHaveCount(0);
 expect(api.puts).toHaveLength(1);
});

const soilInitial=()=>({id:1,nodeId:'SOIL01',channelId:'SOIL1',type:'DRY_SOIL',dataSource:'SIMULATOR',openedSampleId:30,
 openedAt:new Date().toISOString(),openedReceivedAt:new Date().toISOString(),openedValue:0,clearedSampleId:null as number|null,clearedAt:null as string|null,
 clearedReceivedAt:null as string|null,clearedValue:null as number|null,acknowledgedAt:null as string|null,acknowledgementNote:null as string|null});
async function soilFixtures(page:Page){
 const state={alert:soilInitial(),failList:false,invalidList:false,listVisible:true,loseResponse:false,wrongChannel:false,putStatus:200,putGate:null as Promise<void>|null,
  listGate:null as Promise<void>|null,calls:0,puts:[] as any[],unexpected:[] as string[],detailCalls:0};
 await page.route('**/*',async route=>{if(new URL(route.request().url()).origin!=='http://127.0.0.1:4182'){state.unexpected.push(route.request().url());await route.abort();return;}await route.continue();});
 await page.route('**/api/**',async route=>{const r=route.request(),path=new URL(r.url()).pathname;
  if(r.method()==='GET'&&path==='/api/v1/alerts'){await route.fulfill({json:[]});return;}
  if(r.method()==='GET'&&path==='/api/v1/soil-alerts'){
   state.calls++;const response=state.listVisible?[{...structuredClone(state.alert),...(state.invalidList?{openedValue:100}:{})}]:[],fail=state.failList,gate=state.listGate;state.listGate=null;
   if(gate)await gate;await route.fulfill({status:fail?503:200,json:response});return;
  }
  if(r.method()==='GET'&&path==='/api/v1/soil-alerts/1'){state.detailCalls++;await route.fulfill({json:state.alert});return;}
  if(r.method()==='PUT'&&path==='/api/v1/soil-alerts/1/acknowledgement'){
   const input=r.postDataJSON();state.puts.push(input);if(state.putGate)await state.putGate;
   if(state.putStatus!==200){await route.fulfill({status:state.putStatus,json:{}});return;}
   Object.assign(state.alert,{acknowledgedAt:new Date().toISOString(),acknowledgementNote:input.note||null});
   if(state.loseResponse){await route.abort('connectionfailed');return;}
   await route.fulfill({json:state.wrongChannel?{...state.alert,channelId:'SOIL2'}:state.alert});return;
  }
  state.unexpected.push(r.method()+' '+path);await route.abort();
 });return state;
}
async function soilOpen(page:Page){await page.goto('/');await page.getByRole('button',{name:'Đất nhiều điểm',exact:true}).click();await page.getByRole('button',{name:'Chi tiết cảnh báo đất #1',exact:true}).click();}
test('soil alerts show independent point, zero evidence, source and safely saved note',async({page})=>{
 const api=await soilFixtures(page);await soilOpen(page);await expect(page.getByRole('article')).toContainText('SOIL01 · SOIL1 · Đất khô');await expect(page.getByRole('article')).toContainText('Giá trị lúc phát sinh: 0%');
 await page.getByLabel('Nguồn cảnh báo đất').selectOption('PHYSICAL');await expect(page.getByRole('article')).toHaveCount(0);await page.getByLabel('Nguồn cảnh báo đất').selectOption('SIMULATOR');
 const note='<img src=x onerror="bad()">';await page.getByLabel('Ghi chú khi xác nhận',{exact:true}).fill(note);await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();
 await expect(detail(page)).toContainText('Ghi chú đã lưu: '+note);await expect(detail(page).locator('img')).toHaveCount(0);await expect(detail(page)).toContainText('Điều kiện cảm biến: Đang cảnh báo');expect(api.puts).toEqual([{note}]);expect(api.unexpected).toEqual([]);
});
test('soil lost acknowledgment response reads the exact episode without automatic retry',async({page})=>{
 const api=await soilFixtures(page);api.loseResponse=true;await soilOpen(page);await page.getByLabel('Ghi chú khi xác nhận',{exact:true}).fill('Checked point1');
 await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();await expect(detail(page).getByRole('alert')).toContainText('Đối chiếu');
 await detail(page).getByRole('button',{name:'Đối chiếu trạng thái',exact:true}).click();await expect(detail(page)).toContainText('Ghi chú đã lưu: Checked point1');expect(api.puts).toHaveLength(1);expect(api.detailCalls).toBe(1);
});
test('soil API outage or bad threshold evidence blocks ACK and preserves draft on recovery',async({page})=>{
 const api=await soilFixtures(page);await soilOpen(page);await page.getByLabel('Ghi chú khi xác nhận',{exact:true}).fill('Draft soil');
 for(const key of ['failList','invalidList'] as const){api[key]=true;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true})).toBeDisabled();api[key]=false;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true})).toBeEnabled();}
 await expect(page.getByLabel('Ghi chú khi xác nhận',{exact:true})).toHaveValue('Draft soil');expect(api.puts).toEqual([]);
});
test('soil readback with another point and same alert ID is refused',async({page})=>{
 const api=await soilFixtures(page);api.wrongChannel=true;await soilOpen(page);await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();
 await expect(detail(page).getByRole('alert')).toContainText('không khớp');await expect(page.getByText('Đã lưu xác nhận đã xem.',{exact:true})).toHaveCount(0);expect(api.puts).toHaveLength(1);
});
test('soil clear during confirmation remains unseen after readback',async({page})=>{
 const api=await soilFixtures(page);api.putStatus=409;await soilOpen(page);Object.assign(api.alert,{clearedSampleId:31,clearedAt:new Date().toISOString(),clearedReceivedAt:new Date().toISOString(),clearedValue:35});
 await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();await expect(detail(page).getByRole('alert')).toBeVisible();await detail(page).getByRole('button',{name:'Đối chiếu trạng thái',exact:true}).click();
 await expect(detail(page)).toContainText('Điều kiện cảm biến: Đã trở về bình thường');await expect(detail(page)).toContainText('Xác nhận đã xem: Chưa xem');expect(api.puts).toHaveLength(1);
});
test('soil delayed old list cannot overwrite ACK and tabs cannot interrupt pending save',async({page})=>{
 const api=await soilFixtures(page);await soilOpen(page);const old=deferred();api.listGate=old.promise;const calls=api.calls;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect.poll(()=>api.calls).toBeGreaterThan(calls);
 const save=deferred();api.putGate=save.promise;await page.getByLabel('Ghi chú khi xác nhận',{exact:true}).fill('Latest soil');await detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true}).click();
 await expect(page.getByRole('button',{name:'Trạm nước',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Cảm biến môi trường',exact:true})).toBeDisabled();
 save.resolve();await expect(detail(page)).toContainText('Ghi chú đã lưu: Latest soil');old.resolve();await expect(detail(page)).toContainText('Ghi chú đã lưu: Latest soil');expect(api.puts).toHaveLength(1);
});
test('soil fault displays null as an error and clears with numeric zero without becoming a dry episode',async({page})=>{
 const api=await soilFixtures(page);Object.assign(api.alert,{type:'SENSOR_FAULT',channelId:'SOIL3',openedValue:null,clearedSampleId:31,clearedAt:new Date().toISOString(),clearedReceivedAt:new Date().toISOString(),clearedValue:0});await soilOpen(page);
 await expect(page.getByRole('article')).toContainText('SOIL3 · Lỗi cảm biến đất');await expect(page.getByRole('article')).toContainText('Giá trị lúc phát sinh: Lỗi cảm biến');await expect(page.getByRole('article')).toContainText('Lúc hết điều kiện: 0%');
 await expect(detail(page).getByRole('button',{name:'Xác nhận đã xem',exact:true})).toHaveCount(0);expect(api.puts).toEqual([]);
});
