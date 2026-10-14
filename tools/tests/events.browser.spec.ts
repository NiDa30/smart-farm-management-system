import { test,expect,type Page } from '@playwright/test';
import type { IoTEvent } from '../../src/modules/iot/events/eventApi';
const at=new Date(Date.now()-10000).toISOString();
const event=(id='command:ab6cfc5e-18ff-4a01-852b-03604df6b52f'):IoTEvent=>({id,eventAt:at,sourceAt:null,recordedAt:at,category:'COMMAND',type:'COMMAND_CREATED',deviceId:'PUMP01',action:'ON',state:'SENT',reason:null,value:null,commandId:'ab6cfc5e-18ff-4a01-852b-03604df6b52f',runId:7});
async function fixtures(page:Page){
 const state={items:[event()],nextCursor:null as string|null,fail:false,invalid:false,requests:[] as URL[],gate:null as Promise<void>|null};
 await page.route('**/*',async route=>{
   if(new URL(route.request().url()).origin!=='http://127.0.0.1:4178'){await route.abort();return;}
   await route.continue();
 });
 await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url());
   expect(route.request().method()).toBe('GET');expect(url.pathname).toBe('/api/v1/events');state.requests.push(url);
   const items=[...state.items],nextCursor=state.nextCursor,gate=state.gate,fail=state.fail,invalid=state.invalid;
   if(gate)await gate;
   await route.fulfill({status:fail?503:200,json:invalid?{}:{items,nextCursor,from:url.searchParams.get('from'),to:url.searchParams.get('to')}});
 });
 return state;
}
test('shows real event data, SENT is not execution, and details use stored links/times',async({page})=>{
 await fixtures(page);await page.goto('/');
 await expect(page.getByText('Đã gửi, chờ ACK',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:/Chi tiết command:/}).click();
 const details=page.getByRole('region',{name:'Chi tiết sự kiện'});
 await expect(details).toContainText('Run ID: 7');await expect(details).toContainText('Thời gian thiết bị: Không được lưu');
 await expect(details).toContainText('ab6cfc5e-18ff-4a01-852b-03604df6b52f');
});
test('filters device, category and time window in API requests',async({page})=>{
 const state=await fixtures(page);await page.goto('/');await expect(page.getByText('Đã gửi, chờ ACK',{exact:true})).toBeVisible();
 await page.getByLabel('Loại sự kiện',{exact:true}).selectOption('ALERT');
 await page.getByLabel('Mã thiết bị',{exact:true}).fill('ENV01');
 await page.getByLabel('Khoảng thời gian',{exact:true}).selectOption('1');
 await expect.poll(()=>state.requests.at(-1)?.searchParams.get('deviceId')).toBe('ENV01');
 await expect.poll(()=>state.requests.at(-1)?.searchParams.get('category')).toBe('ALERT');
 const query=state.requests.at(-1)!.searchParams;
 expect(Date.parse(query.get('to')!)-Date.parse(query.get('from')!)).toBe(3600000);
});
test('pagination keeps fixed range and avoids duplicate IDs',async({page})=>{
 const state=await fixtures(page);state.nextCursor='next-page';await page.goto('/');
 await expect(page.getByRole('button',{name:'Tải thêm'})).toBeVisible();
 const first=state.requests[0].searchParams;
 state.items=[event(),{...event('device:1'),category:'DEVICE',type:'DEVICE_STATE',action:null,state:'OFF',reason:'TIMER_EXPIRED',commandId:null,runId:null}];state.nextCursor=null;
 await page.getByRole('button',{name:'Tải thêm'}).click();
 await expect(page.locator('tbody tr')).toHaveCount(2);
 const last=state.requests.at(-1)!.searchParams;expect(last.get('cursor')).toBe('next-page');expect(last.get('from')).toBe(first.get('from'));expect(last.get('to')).toBe(first.get('to'));
 await expect(page.getByRole('button',{name:'Tải thêm'})).toHaveCount(0);
});
test('empty and backend failure are distinct and refresh recovers',async({page})=>{
 const state=await fixtures(page);state.items=[];await page.goto('/');
 await expect(page.getByText('Chưa có sự kiện trong bộ lọc này.')).toBeVisible();
 state.fail=true;await page.getByRole('button',{name:'Làm mới'}).click();await expect(page.getByRole('alert')).toBeVisible();
 state.fail=false;state.items=[event()];await page.getByRole('button',{name:'Làm mới'}).click();
 await expect(page.locator('tbody tr')).toHaveCount(1);await expect(page.getByRole('alert')).toHaveCount(0);
});
test('rejects malformed API response rather than displaying it',async({page})=>{
 const state=await fixtures(page);state.invalid=true;await page.goto('/');await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('tbody tr')).toHaveCount(0);
});
test('failed pagination preserves data and supports retry',async({page})=>{
 const state=await fixtures(page);state.nextCursor='next-page';await page.goto('/');await expect(page.locator('tbody tr')).toHaveCount(1);
 state.fail=true;await page.getByRole('button',{name:'Tải thêm'}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('tbody tr')).toHaveCount(1);
 state.fail=false;state.items=[event('command:other')];state.nextCursor=null;await page.getByRole('button',{name:'Tải thêm'}).click();await expect(page.locator('tbody tr')).toHaveCount(2);
});
test('a delayed response for old filters cannot replace current results',async({page})=>{
 const state=await fixtures(page);let release!:()=>void;
 state.gate=new Promise<void>(done=>{release=done;});
 await page.goto('/');await expect.poll(()=>state.requests.length).toBe(1);
 state.gate=null;
 state.items=[{...event('alert-open:1'),category:'ALERT',type:'ALERT_OPENED',deviceId:'ENV01',state:'OPEN',sourceAt:at,recordedAt:null,action:null,reason:'LOW_SOIL',value:28,commandId:null,runId:null}];
 await page.getByLabel('Loại sự kiện',{exact:true}).selectOption('ALERT');
 await expect(page.getByText('Phát sinh cảnh báo',{exact:true})).toBeVisible();
 release();
 await expect(page.locator('tbody tr')).toHaveCount(1);
 await expect(page.getByText('Đã gửi, chờ ACK',{exact:true})).toHaveCount(0);
});
