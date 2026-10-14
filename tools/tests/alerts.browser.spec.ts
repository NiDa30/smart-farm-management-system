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
