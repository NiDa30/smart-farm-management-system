import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {historyConfig,historyRun,historyStep,historySession} from './fixtures/session-history-data';
import {sessionWaterData} from './fixtures/session-water-data';
const origin='http://127.0.0.1:4189';
const second='86000000-0000-4000-8000-000000000004';
async function fixture(page:Page){
 const at=new Date(Date.now()-60000).toISOString();
 const s={calls:[] as URL[],writes:[] as string[],external:[] as string[],fail:false,wrong:false,more:false,badMore:false,stepFail:false,stepWrong:false,empty:false,oldGate:null as Promise<void>|null,stepMore:false,stepChanged:false,stepGate:null as Promise<void>|null};
 await page.route('**/*',async r=>{if(new URL(r.request().url()).origin!==origin){s.external.push(r.request().url());await r.abort();}else await r.continue();});
 await page.route('**/api/**',async r=>{
  const req=r.request(),u=new URL(req.url());if(req.method()!=='GET'){s.writes.push(req.url());await r.abort();return;}
  if(u.pathname==='/api/v1/irrigation-circuits'){await r.fulfill({json:{mode:'CONFIGURATION_ONLY',dispatchAvailable:false,valveMonitorEnabled:false,asOf:new Date().toISOString(),revision:1,circuits:[{config:historyConfig,configurationState:'CURRENT',low:{state:'MISSING',latest:null},flow:{state:'MISSING',latest:null},valveState:'NOT_CONNECTED',valveObservation:null}]}});return;}
  if(u.pathname==='/api/v1/irrigation-zones'){await r.fulfill({json:{farmId:'FARM001',asOf:at,zones:[]}});return;}
  if(u.pathname==='/api/v1/nodes'){await r.fulfill({json:{farmId:'FARM001',asOf:at,nodes:[]}});return;}
  if(u.pathname==='/api/v1/irrigation-session-history'){
   s.calls.push(u);if(s.oldGate&&u.searchParams.get('circuitId')==='PC1')await s.oldGate;
   const cursor=u.searchParams.get('cursor'),q={from:u.searchParams.get('from'),to:u.searchParams.get('to'),circuitId:u.searchParams.get('circuitId'),condition:u.searchParams.get('condition')};
   const run=historyRun(at,cursor&&!s.badMore?second:historySession);if(cursor&&!s.badMore)run.createdAt=new Date(Date.parse(at)-1000).toISOString();
   const items=s.empty||q.circuitId==='PC2'||['RECOVERY','UNFINISHED'].includes(q.condition??'')?[]:[{id:cursor&&!s.badMore?1:2,session:run,actionCount:1,unresolvedCount:0}];
   await r.fulfill({status:s.fail?503:200,json:{...q,condition:s.wrong?'BAD':q.condition,asOf:new Date().toISOString(),ceilingId:2,items,nextCursor:s.more&&!cursor&&items.length?'next':null}});return;
  }
  if(u.pathname.endsWith('/steps')){
   const id=u.pathname.split('/').at(-2)!,more=u.searchParams.has('cursor');if(s.stepGate&&id===historySession)await s.stepGate;
   const op:any=historyStep(at);op.id=2;op.operation.sessionId=s.stepWrong?second:id;
   if(more){op.id=1;op.createdAt=new Date(Date.parse(at)-1000).toISOString();op.operation={...op.operation,requestId:second,action:'FINISH',definition:{...op.operation.definition,requestId:second,action:'FINISH'},payload:null,result:null};op.command=null;}
   const run=historyRun(at,id);if(more&&s.stepChanged)run.revision++;
   await r.fulfill({status:s.stepFail?503:200,json:{session:run,asOf:new Date().toISOString(),ceilingId:2,items:[op],nextCursor:s.stepMore&&!more?'steps-next':null}});return;
  }
  await r.fulfill({status:404,json:{}});
 });return s;
}
async function open(page:Page){await page.goto('/');await page.getByRole('button',{name:'Lịch sử phiên PC1',exact:true}).click();await expect(page.getByRole('heading',{name:'Lịch sử phiên tưới',exact:true})).toBeVisible();}
async function detail(page:Page){await page.getByRole('button',{name:'Xem phiên '+historySession,exact:true}).click();await expect(page.getByRole('region',{name:'Chi tiết phiên tưới',exact:true})).toBeVisible();}
test('history opens through circuit panel and performs GETs only',async({page})=>{const s=await fixture(page);await open(page);await expect(page.getByRole('button',{name:'Xem phiên '+historySession,exact:true})).toBeVisible();expect(s.calls[0].searchParams.get('circuitId')).toBe('PC1');await detail(page);await expect(page.getByText('Bản lưu lệnh lúc đọc: EXECUTED',{exact:false})).toBeVisible();expect(s.writes).toEqual([]);expect(s.external).toEqual([]);});
test('dispatch SENT is distinct from ACK EXECUTED and no physical runtime is inferred',async({page})=>{await fixture(page);await open(page);await detail(page);await expect(page.getByText('Kết quả gọi ban đầu: SENT.',{exact:true})).toBeVisible();await expect(page.getByText('ACK sequence 2, boot',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'Xác nhận bật bơm',exact:true})).toHaveCount(0);});
test('filters reset list and details and allow another circuit empty result',async({page})=>{const s=await fixture(page);await open(page);await detail(page);await page.getByLabel('Lọc nhánh phiên',{exact:true}).fill('PC2');await page.getByRole('button',{name:'Đọc lịch sử phiên',exact:true}).click();await expect(page.getByText('Chưa có phiên theo bộ lọc.',{exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'Chi tiết phiên tưới',exact:true})).toHaveCount(0);expect(s.calls.at(-1)!.searchParams.get('circuitId')).toBe('PC2');});
test('load more retains original window and cursor without duplicates',async({page})=>{const s=await fixture(page);s.more=true;await open(page);await page.getByRole('button',{name:'Tải thêm phiên',exact:true}).click();await expect(page.getByRole('button',{name:'Xem phiên '+second,exact:true})).toBeVisible();expect(s.calls[1].searchParams.get('cursor')).toBe('next');expect(s.calls[1].searchParams.get('from')).toBe(s.calls[0].searchParams.get('from'));await expect(page.getByText('Đã tải 2 phiên.',{exact:false})).toBeVisible();});
test('invalid continuation leaves old rows visible and blocks CSV',async({page})=>{const s=await fixture(page);s.more=s.badMore=true;await open(page);await page.getByRole('button',{name:'Tải thêm phiên',exact:true}).click();await expect(page.getByRole('alert')).toContainText('không nối tiếp');await expect(page.getByRole('button',{name:'CSV phiên đã tải',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Xem phiên '+historySession,exact:true})).toBeVisible();});
test('API failure and malformed scope show errors with disabled export',async({page})=>{const s=await fixture(page);s.fail=true;await open(page);await expect(page.getByRole('alert')).toContainText('Không đọc được');s.fail=false;s.wrong=true;await page.getByRole('button',{name:'Đọc lịch sử phiên',exact:true}).click();await expect(page.getByRole('alert')).toContainText('không khớp');await expect(page.getByRole('button',{name:'CSV phiên đã tải',exact:true})).toBeDisabled();});
test('wrong-session detail cannot be displayed as a valid operation',async({page})=>{const s=await fixture(page);s.stepWrong=true;await open(page);await detail(page);await expect(page.getByRole('alert')).toContainText('Bước thuộc phiên khác');await expect(page.getByRole('button',{name:'CSV bước đã tải',exact:true})).toBeDisabled();});
test('CSV downloads include only loaded rows, separate dispatch and ledger plus read clock',async({page})=>{await fixture(page);await open(page);const [a]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'CSV phiên đã tải',exact:true}).click()]);const text=await readFile((await a.path())!,'utf8');expect(text.charCodeAt(0)).toBe(0xfeff);expect(text).toContain('requestedDurationSeconds');expect(text.split('\r\n')).toHaveLength(3);await detail(page);const [b]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'CSV bước đã tải',exact:true}).click()]);const csv=await readFile((await b.path())!,'utf8');expect(csv).toContain('"SENT","EXECUTED"');expect(csv).toContain('readAt');});
test('old delayed filter response cannot overwrite new results',async({page})=>{const s=await fixture(page);let release!:()=>void;s.oldGate=new Promise<void>(r=>release=r);await open(page);await expect.poll(()=>s.calls.length).toBe(1);await page.getByLabel('Lọc nhánh phiên',{exact:true}).fill('PC2');await page.getByRole('button',{name:'Đọc lịch sử phiên',exact:true}).click();await expect(page.getByText('Chưa có phiên theo bộ lọc.',{exact:true})).toBeVisible();release();await page.waitForTimeout(150);await expect(page.getByRole('button',{name:'Xem phiên '+historySession,exact:true})).toHaveCount(0);});
test('empty all-circuit history and invalid filter do not offer export or issue commands',async({page})=>{const s=await fixture(page);s.empty=true;await page.goto('/');await page.getByRole('button',{name:'Lịch sử mọi phiên tưới',exact:true}).click();await expect(page.getByText('Chưa có phiên theo bộ lọc.',{exact:true})).toBeVisible();expect(s.calls[0].searchParams.has('circuitId')).toBe(false);await page.getByLabel('Lọc nhánh phiên',{exact:true}).fill('bad');await expect(page.getByRole('button',{name:'Đọc lịch sử phiên',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'CSV phiên đã tải',exact:true})).toBeDisabled();expect(s.writes).toEqual([]);});

test('step pagination includes earlier confirmations without replay',async({page})=>{const s=await fixture(page);s.stepMore=true;await open(page);await detail(page);await page.getByRole('button',{name:'Tải thêm bước',exact:true}).click();await expect(page.getByText('Đã tải 2 bước, mới nhất trước.',{exact:false})).toBeVisible();await expect(page.getByText('Bước kết thúc không phát lệnh.',{exact:true})).toBeVisible();expect(s.writes).toEqual([]);});
test('changing session revision while paging requires a new detail read',async({page})=>{const s=await fixture(page);s.stepMore=s.stepChanged=true;await open(page);await detail(page);await page.getByRole('button',{name:'Tải thêm bước',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Phiên đã đổi');await expect(page.getByRole('button',{name:'CSV bước đã tải',exact:true})).toBeDisabled();});
test('late detail cannot replace a subsequently selected session',async({page})=>{const s=await fixture(page);s.more=true;let release!:()=>void;s.stepGate=new Promise<void>(r=>release=r);await open(page);await page.getByRole('button',{name:'Tải thêm phiên',exact:true}).click();await detail(page);await page.getByRole('button',{name:'Xem phiên '+second,exact:true}).click();await expect(page.getByRole('region',{name:'Chi tiết phiên tưới',exact:true}).getByRole('heading',{name:'Phiên '+second,exact:true})).toBeVisible();await expect(page.getByText('Bản lưu lệnh lúc đọc: EXECUTED',{exact:false})).toBeVisible();release();await page.waitForTimeout(150);await expect(page.getByRole('region',{name:'Chi tiết phiên tưới',exact:true}).getByRole('heading',{name:'Phiên '+second,exact:true})).toBeVisible();});

async function waterFixture(page:Page,edit:(r:any)=>void=()=>{}){
 const s=await fixture(page);let fail=false,gate:Promise<void>|null=null;
 await page.route('**/water-usage',async r=>{
  const id=new URL(r.request().url()).pathname.split('/').at(-2)!,data=sessionWaterData(new Date(Date.now()-60000).toISOString(),id);edit(data);
  if(gate&&id===historySession)await gate;
  await r.fulfill({status:fail?503:200,json:data});
 });
 return Object.assign(s,{setFail:(value:boolean)=>fail=value,setGate:(value:Promise<void>)=>gate=value});
}
async function water(page:Page){await page.getByRole('button',{name:'Đọc lượng nước phiên',exact:true}).click();}
test('water report is on demand, scoped to stored station with coverage and no control writes',async({page})=>{
 const s=await waterFixture(page);await open(page);await detail(page);await expect(page.getByText('0,5 lít',{exact:true})).toHaveCount(0);await water(page);
 const panel=page.getByRole('region',{name:'Lượng nước theo phiên',exact:true});await expect(panel.getByText('0,5 lít',{exact:true})).toBeVisible();await expect(panel).toContainText('chưa được phủ 5 giây');await expect(panel).toContainText('Nguồn mô phỏng');await expect(panel).toContainText('Chưa xác nhận thời gian bơm thực chạy');expect(s.writes).toEqual([]);expect(s.external).toEqual([]);
});
test('water CSV carries station scope, identities and uncovered seconds',async({page})=>{
 await waterFixture(page);await open(page);await detail(page);await water(page);await expect(page.getByRole('button',{name:'CSV lượng nước phiên',exact:true})).toBeEnabled();
 const [file]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'CSV lượng nước phiên',exact:true}).click()]);const csv=await readFile((await file.path())!,'utf8');expect(csv).toContain('STATION_FLOW_NOT_BED_ALLOCATION');expect(csv).toContain('uncoveredSeconds');expect(csv).toContain(historySession);expect(csv).toContain('SIMULATOR');expect(csv.split('\r\n')).toHaveLength(3);
});
test('unconfirmed command water report is unknown rather than zero litres',async({page})=>{
 await waterFixture(page,r=>{r.state='UNAVAILABLE';r.reason='COMMAND_EVIDENCE_UNCONFIRMED';r.volume=null;});await open(page);await detail(page);await water(page);
 await expect(page.getByRole('region',{name:'Lượng nước theo phiên',exact:true})).toContainText('Chưa đủ ACK');await expect(page.getByText('Chưa xác định',{exact:true})).toBeVisible();await expect(page.getByText('0 lít',{exact:true})).toHaveCount(0);
});
test('wrong station or broken coverage is rejected with export disabled',async({page})=>{
 await waterFixture(page,r=>r.waterNodeId='OTHER');await open(page);await detail(page);await water(page);await expect(page.getByRole('alert')).toContainText('không khớp');await expect(page.getByRole('button',{name:'CSV lượng nước phiên',exact:true})).toBeDisabled();
});
test('water API recovery clears the old error and obtains a fresh report',async({page})=>{
 const s=await waterFixture(page);s.setFail(true);await open(page);await detail(page);await water(page);await expect(page.getByRole('alert')).toContainText('Không đọc được báo cáo');s.setFail(false);await page.getByRole('button',{name:'Đọc lại lượng nước',exact:true}).click();await expect(page.getByText('0,5 lít',{exact:true})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
});
test('late water response cannot overwrite the next selected session',async({page})=>{
 const s=await waterFixture(page);s.more=true;let release!:()=>void;s.setGate(new Promise<void>(r=>release=r));await open(page);await page.getByRole('button',{name:'Tải thêm phiên',exact:true}).click();await detail(page);await water(page);
 await page.getByRole('button',{name:'Xem phiên '+second,exact:true}).click();await water(page);await expect(page.getByText('0,5 lít',{exact:true})).toBeVisible();release();await page.waitForTimeout(150);await expect(page.getByRole('heading',{name:'Phiên '+second,exact:true})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
});
