import { test,expect,type Page } from '@playwright/test';
import { safetyFixture } from './safety.fixture';
async function fixtures(page:Page){
 const state={value:safetyFixture() as unknown,fail:false,gate:null as Promise<void>|null,calls:0,unexpected:[] as string[]};
 await page.route('**/*',async route=>{if(new URL(route.request().url()).origin!=='http://127.0.0.1:4181'){state.unexpected.push(route.request().url());await route.abort();return;}await route.continue();});
 await page.route('**/api/**',async route=>{
  const request=route.request();
  if(request.method()!=='GET'||new URL(request.url()).pathname!=='/api/v1/safety'){state.unexpected.push(request.method()+' '+request.url());await route.abort();return;}
  state.calls++;const value=structuredClone(state.value),gate=state.gate,fail=state.fail;
  if(gate)await gate;
  await route.fulfill({status:fail?503:200,json:value});
 });return state;
}
test('real observations and settings, GET only; mock OTA controls removed',async({page})=>{
 const state=await fixtures(page);await page.goto('/');
 await expect(page.getByRole('status')).toHaveText('Backend đã kết nối MQTT');
 const relay=page.getByRole('region',{name:'Relay và khóa an toàn'});
 await expect(relay).toContainText('Trạng thái hiện tại: OFF');await expect(relay).toContainText('Khóa an toàn hiện tại: Thiết bị báo không khóa');
 await expect(page.getByRole('region',{name:'Quy tắc và lệnh đang theo dõi'})).toContainText('Cài đặt v3: dưới 25% / tắt từ 40% · bật 12s · nghỉ 120s');
 await expect(page.getByText('Chưa có lịch sử relay.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:/OTA|nâng cấp|Đặt lại khóa/i})).toHaveCount(0);
 expect(state.unexpected).toEqual([]);
});
test('stale ON/lockout is history, never a current unlocked or OFF claim',async({page})=>{
 const state=await fixtures(page),value=safetyFixture(),old=new Date(Date.now()-60000).toISOString();
 value.relay={observedAt:old,receivedAt:old,reportedState:'ON',safetyLockout:true,stateReason:'CONNECTION_LOST'};
 value.stateHistory=[{id:2,observedAt:old,receivedAt:value.asOf,reportedState:'OFF',safetyLockout:true,changeType:'STATE_CHANGED',stateReason:'CONNECTION_LOST'},
 {id:1,observedAt:old,receivedAt:old,reportedState:'OFF',safetyLockout:false,changeType:'STATE_CHANGED',stateReason:null}];
 state.value=value;await page.goto('/');
 const relay=page.getByRole('region',{name:'Relay và khóa an toàn'});
 await expect(relay).toContainText('Trạng thái hiện tại: Chưa xác định');await expect(relay).toContainText('Khóa an toàn hiện tại: Chưa xác định');
 await expect(relay).toContainText('Bản báo đã lưu: ON · Khóa: Có');
 const history=page.getByRole('region',{name:'Lịch sử relay'});
 await expect(history).toContainText('Mất kết nối');await expect(history).toContainText('Lý do chưa được ghi nhận');
});
test('no relay or sensor does not imply safe OFF and no lockout',async({page})=>{
 const state=await fixtures(page),value=safetyFixture();value.sensor=null;value.relay=null;value.mqtt.state='DISABLED';value.controlEnabled=false;value.controlTransportConnected=false;state.value=value;
 await page.goto('/');await expect(page.getByRole('status')).toHaveText('Backend chưa bật MQTT');
 await expect(page.getByText('Chưa nhận trạng thái relay; không suy ra OFF hoặc không khóa.',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Điều kiện quan sát'})).toContainText('Độ ẩm đất đã lưu: —');
 await expect(page.getByRole('region',{name:'Điều kiện quan sát'})).toContainText('Chế độ điều khiển: Chưa bật trên backend');
});
test('unresolved totals independent from preview; uncertain ON has no false success',async({page})=>{
 const state=await fixtures(page),value=safetyFixture();value.queue={unresolved:25,overdue:22};value.rule.lastResult='STOP_UNCONFIRMED';value.rule.activeCommand='11111111-1111-4111-8111-111111111111';
 value.recentProblems=[{commandId:value.rule.activeCommand,action:'ON',issuedAt:value.asOf,expiresAt:value.asOf,state:'PUBLISH_UNCERTAIN',errorCode:null},
 {commandId:'22222222-2222-4222-8222-222222222222',action:'OFF',issuedAt:value.asOf,expiresAt:value.asOf,state:'FAILED',errorCode:'CLOCK_SKEW'}];state.value=value;
 await page.goto('/');
 await expect(page.getByRole('region',{name:'Quy tắc và lệnh đang theo dõi'})).toContainText('Lệnh chưa rõ kết quả đã lưu: 25 · Đã quá hạn đối chiếu: 22');
 await expect(page.getByRole('region',{name:'Quy tắc và lệnh đang theo dõi'})).toContainText('Chưa xác nhận tắt');
 await expect(page.getByRole('region',{name:'Lệnh cần đối chiếu'}).getByRole('article')).toHaveCount(2);
 await expect(page.getByText('ON · Chưa xác nhận publish',{exact:true})).toBeVisible();
 await expect(page.getByText('Mã lỗi thiết bị: CLOCK_SKEW',{exact:true})).toBeVisible();expect(state.unexpected).toEqual([]);
});
test('API outage removes current claims, preserves evidence and recovers',async({page})=>{
 const state=await fixtures(page);await page.goto('/');await expect(page.getByRole('status')).toHaveText('Backend đã kết nối MQTT');
 state.fail=true;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();
 await expect(page.getByRole('status')).toHaveText('Chưa xác định kết nối backend');
 await expect(page.getByRole('region',{name:'Relay và khóa an toàn'})).toContainText('Trạng thái hiện tại: Chưa xác định');
 await expect(page.getByRole('region',{name:'Relay và khóa an toàn'})).toContainText('Bản báo đã lưu: OFF');
 state.fail=false;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);
 await expect(page.getByRole('status')).toHaveText('Backend đã kết nối MQTT');expect(state.unexpected).toEqual([]);
});
test('cached source values expire even without new response, using 15s for sensor',async({page})=>{
 const state=await fixtures(page),value=safetyFixture(),old=new Date(Date.now()-14000).toISOString();
 value.sensor!.observedAt=old;value.sensor!.receivedAt=old;value.relay!.observedAt=old;value.relay!.receivedAt=old;state.value=value;
 await page.goto('/');
 await expect(page.getByRole('region',{name:'Relay và khóa an toàn'})).toContainText('Trạng thái hiện tại: OFF');
 let release!:()=>void;state.gate=new Promise<void>(done=>{release=done;});
 await expect(page.getByRole('region',{name:'Relay và khóa an toàn'})).toContainText('Trạng thái hiện tại: Chưa xác định');
 await expect(page.getByRole('region',{name:'Điều kiện quan sát'})).toContainText('ENV01: Dữ liệu đã cũ');release();
});
test('older response cannot override refreshed backend state',async({page})=>{
 const state=await fixtures(page);let release!:()=>void;state.gate=new Promise<void>(done=>{release=done;});
 await page.goto('/');await expect.poll(()=>state.calls).toBe(1);
 state.gate=null;const value=safetyFixture();value.mqtt.state='DISCONNECTED';value.controlTransportConnected=false;state.value=value;
 await page.getByRole('button',{name:'Làm mới',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Backend mất kết nối MQTT');
 release();await expect(page.getByRole('status')).toHaveText('Backend mất kết nối MQTT');
});
test('invalid payload cannot populate safety state',async({page})=>{
 const state=await fixtures(page),value=safetyFixture();value.queue.overdue=1;state.value=value;
 await page.goto('/');await expect(page.getByRole('alert')).toBeVisible();
 await expect(page.getByRole('region',{name:'Relay và khóa an toàn'})).toHaveCount(0);
});
test('navigation opens related screens without control writes',async({page})=>{
 const state=await fixtures(page);await page.goto('/');
 for(const [name,route] of [['Mở Điều khiển Actuator','/iot/control'],['Mở Quy tắc Tự động hóa','/iot/automation'],['Mở Nhật ký sự kiện','/iot/events']]){
  await page.getByRole('button',{name,exact:true}).click();await expect(page.locator('body')).toHaveAttribute('data-navigation',route);
 }
 expect(state.unexpected).toEqual([]);
});

test('dry reservoir shows device lockout and history without sending commands',async({page})=>{
 const state=await fixtures(page),value=safetyFixture();
 value.relay!.stateReason='WATER_LOW';value.relay!.safetyLockout=true;
 value.stateHistory=[{id:5,observedAt:value.asOf,receivedAt:value.asOf,reportedState:'OFF',safetyLockout:true,changeType:'STATE_CHANGED',stateReason:'WATER_LOW'}];
 state.value=value;await page.goto('/');
 const relay=page.getByRole('region',{name:'Relay và khóa an toàn'});
 await expect(relay).toContainText('Trạng thái hiện tại: OFF');
 await expect(relay).toContainText('Bồn cạn nước hoặc đứt dây phao');
 await expect(page.getByRole('region',{name:'Lịch sử relay'})).toContainText('Bồn cạn nước hoặc đứt dây phao');
 expect(state.unexpected).toEqual([]);
});

for(const [reason,label] of [['FLOW_LOW','Thiếu lưu lượng tại bộ điều khiển'],['FLOW_SENSOR_FAULT','Tín hiệu lưu lượng tại bộ điều khiển lỗi']])test(`local ${reason} is reported locked OFF without sending commands`,async({page})=>{
 const state=await fixtures(page),v=safetyFixture();v.relay!.stateReason=reason;v.relay!.safetyLockout=true;
 v.stateHistory=[{id:7,observedAt:v.asOf,receivedAt:v.asOf,reportedState:'OFF',safetyLockout:true,changeType:'STATE_CHANGED',stateReason:reason}];state.value=v;
 await page.goto('/');const relay=page.getByRole('region',{name:'Relay và khóa an toàn'});
 await expect(relay).toContainText('Trạng thái hiện tại: OFF');await expect(relay).toContainText(label);await expect(relay).toContainText('Thiết bị báo đang khóa');
 await expect(page.getByRole('region',{name:'Lịch sử relay'})).toContainText(label);expect(state.unexpected).toEqual([]);
});

test('legacy firmware has no invented valve proof',async({page})=>{const s=await fixtures(page);await page.goto('/');await expect(page.getByRole('region',{name:'Liên động van tại bơm'})).toContainText('Chưa có bằng chứng thiết bị báo hỗ trợ liên động van');expect(s.unexpected).toEqual([]);});
test('fresh open contacts are a simulator report, not a claim of pump or remote valve safety',async({page})=>{const s=await fixtures(page),v:any=safetyFixture();v.relay.valveInterlock={version:1,enabled:true,dataSource:'SIMULATOR',state:'OPEN',fault:null};s.value=v;await page.goto('/');const proof=page.getByRole('region',{name:'Liên động van tại bơm'});await expect(proof).toContainText('Thiết bị báo có phản hồi OPEN');await expect(proof).toContainText('Mô phỏng');await expect(proof).toContainText('Không lấy phản hồi từ GPIO bơm');expect(s.unexpected).toEqual([]);});
test('restored open contacts with a latched fault remain locked',async({page})=>{const s=await fixtures(page),v:any=safetyFixture();v.relay.safetyLockout=true;v.relay.stateReason='VALVE_PROOF_LOST';v.relay.valveInterlock={version:1,enabled:true,dataSource:'SIMULATOR',state:'OPEN',fault:'VALVE_PROOF_LOST'};s.value=v;await page.goto('/');const proof=page.getByRole('region',{name:'Liên động van tại bơm'});await expect(proof).toContainText('Thiết bị báo đã khóa do liên động van');await expect(proof).toContainText('Mất phản hồi van mở');await expect(proof).not.toContainText('Thiết bị báo có phản hồi OPEN');expect(s.unexpected).toEqual([]);});
test('stale contact evidence is stored history, with no current proof claim',async({page})=>{const s=await fixtures(page),v:any=safetyFixture(),old=new Date(Date.now()-20000).toISOString();v.relay.observedAt=old;v.relay.receivedAt=old;v.relay.valveInterlock={version:1,enabled:true,dataSource:'SIMULATOR',state:'OPEN',fault:null};s.value=v;await page.goto('/');const proof=page.getByRole('region',{name:'Liên động van tại bơm'});await expect(proof).toContainText('Bằng chứng hiện tại: Chưa xác định');await expect(proof).toContainText('Bản báo đã lưu: OPEN');expect(s.unexpected).toEqual([]);});
test('contradictory ON with closed proof is rejected, not displayed as protection',async({page})=>{const s=await fixtures(page),v:any=safetyFixture();v.relay.reportedState='ON';v.relay.valveInterlock={version:1,enabled:true,dataSource:'SIMULATOR',state:'CLOSED',fault:null};s.value=v;await page.goto('/');await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByText('Thiết bị báo có phản hồi OPEN',{exact:true})).toHaveCount(0);});
