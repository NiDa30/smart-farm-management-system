import { test, expect, type Page } from '@playwright/test';
import type {CalendarView,CalendarSettings} from '../../src/modules/iot/automation/calendarApi';
const calendarDefaults=():CalendarView=>({settings:{mode:'ANY_TIME',zone:'Asia/Ho_Chi_Minh',revision:1,windows:[]},asOf:new Date().toISOString(),withinWindow:true,windowStart:null,windowEnd:null});
const calendarView=(settings:CalendarSettings):CalendarView=>({settings,asOf:new Date().toISOString(),withinWindow:settings.mode==='ANY_TIME',windowStart:settings.mode==='ANY_TIME'?null:new Date(Date.now()+86400000).toISOString(),windowEnd:settings.mode==='ANY_TIME'?null:new Date(Date.now()+87000000).toISOString()});

type Rule = {
  enabled: boolean; lowCount: number; activeCommand: string | null;
  cooldownUntil: string | null; lastResult: string;
};
const defaults = () => ({ dryThreshold:30, wetThreshold:35, durationSeconds:20, cooldownSeconds:60, revision:1 });
const disabled = (): Rule => ({ enabled: false, lowCount: 0, activeCommand: null, cooldownUntil: null, lastResult: 'DISABLED' });
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
async function fixtures(page: Page) {
  const state = {
    calendar: calendarDefaults(),
    calendarRequests: [] as CalendarSettings[],
    calendarGate: null as Promise<void>|null,
    calendarStatus: 200,
    calendarLoseResponse: false,
    calendarInvalidResponse: false,
    rule: disabled(),
    settings: defaults(),
    settingsRequests: [] as ReturnType<typeof defaults>[],
    settingsStatus: 200,
    settingsResponse: undefined as unknown,
    malformedSettingsJson: false,
    loseSettingsResponse: false,
    settingsGate: null as Promise<void> | null,
    runs: [] as { id: number; startedAt: string; commandId: string | null; result: string }[],
    failGet: false,
    getCount: 0,
    nextGet: null as Promise<void> | null,
    putGate: null as Promise<void> | null,
    putStatus: 200,
    losePutResponse: false,
    putResponse: undefined as unknown,
    requests: [] as { enabled: boolean }[],
    unexpected: [] as string[],
  };
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1:4177') {
      state.unexpected.push(url.origin); await route.abort(); return;
    }
    await route.continue();
  });
  await page.route('**/api/**', async route => {
    const { pathname } = new URL(route.request().url());
    if (pathname === '/api/v1/automation/watering/calendar') {
      if(route.request().method()==='GET'){await route.fulfill({json:state.calendar});return;}
      const input=route.request().postDataJSON() as CalendarSettings;state.calendarRequests.push(input);
      if(state.calendarGate)await state.calendarGate;
      if(state.calendarStatus!==200){await route.fulfill({status:state.calendarStatus,json:{}});return;}
      state.calendar=calendarView({...input,revision:input.revision+1});
      if(state.calendarLoseResponse){await route.abort('connectionfailed');return;}
      await route.fulfill({json:state.calendarInvalidResponse?{}:state.calendar});return;
    }
    if (pathname === '/api/v1/automation/watering/settings') {
      if (route.request().method() === 'GET') { await route.fulfill({ json: state.settings }); return; }
      const input = route.request().postDataJSON();
      state.settingsRequests.push(input);
      if (state.settingsGate) await state.settingsGate;
      if (state.settingsStatus !== 200) { await route.fulfill({ status: state.settingsStatus, json: {} }); return; }
      if (state.malformedSettingsJson) { await route.fulfill({ status:200, contentType:'application/json', body:'{' }); return; }
      if (state.settingsResponse !== undefined) { await route.fulfill({ json:state.settingsResponse }); return; }
      state.settings = { ...input, revision: input.revision+1 };
      if (state.loseSettingsResponse) { await route.abort('connectionfailed'); return; }
      await route.fulfill({ json: state.settings }); return;
    }
    if (pathname === '/api/v1/automation/watering/runs' && route.request().method() === 'GET') {
      await route.fulfill({ json: state.runs }); return;
    }
    if (pathname !== '/api/v1/automation/watering') {
      state.unexpected.push(pathname); await route.abort(); return;
    }
    if (route.request().method() === 'GET') {
      const rule = { ...state.rule }, fail = state.failGet, gate = state.nextGet;
      state.nextGet = null; state.getCount++;
      if (gate) await gate;
      await route.fulfill({ status: fail ? 503 : 200, json: fail ? {} : rule });
    } else if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as { enabled: boolean };
      state.requests.push(body);
      if (state.putGate) await state.putGate;
      if (state.putStatus !== 200) { await route.fulfill({ status: state.putStatus, json: {} }); return; }
      if (state.putResponse !== undefined) { await route.fulfill({ json: state.putResponse }); return; }
      state.rule = { ...state.rule, enabled: body.enabled, lastResult: body.enabled ? 'WAITING_SAMPLES' : 'DISABLED' };
      if (state.losePutResponse) { await route.abort('connectionfailed'); return; }
      await route.fulfill({ json: state.rule });
    } else {
      state.unexpected.push(route.request().method()); await route.abort();
    }
  });
  return state;
}

test('mặc định tắt; nút bị khóa cho tới khi API xác nhận trạng thái', async ({ page }) => {
  const api = await fixtures(page), gate = deferred(); api.nextGet = gate.promise;
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Chưa xác định');
  await expect(page.getByRole('button', { name: 'Bật quy tắc' })).toBeDisabled();
  gate.resolve();
  await expect(page.getByRole('status')).toHaveText('Quy tắc đang tắt');
  await expect(page.getByRole('button', { name: 'Bật quy tắc' })).toBeEnabled();
  await expect(page.getByText('Chưa có lần chạy.')).toBeVisible();
  expect(api.requests).toEqual([]); expect(api.unexpected).toEqual([]);
});

test('bật và tắt chỉ đổi trạng thái sau phản hồi API, không optimistic success', async ({ page }) => {
  const api = await fixtures(page);
  await page.goto('/');
  for (const enabled of [true, false]) {
    const gate = deferred(); api.putGate = gate.promise;
    const before = enabled ? 'tắt' : 'bật', after = enabled ? 'bật' : 'tắt';
    await page.getByRole('button', { name: enabled ? 'Bật quy tắc' : 'Tắt quy tắc' }).click();
    await expect.poll(() => api.requests.length).toBe(enabled ? 1 : 2);
    await expect(page.getByRole('status')).toHaveText(`Quy tắc đang ${before}`);
    await expect(page.getByRole('button', { name: /^(Bật|Tắt) quy tắc$/ })).toBeDisabled();
    gate.resolve();
    await expect(page.getByRole('status')).toHaveText(`Quy tắc đang ${after}`);
    await expect(page.getByRole('button', { name: /^(Bật|Tắt) quy tắc$/ })).toBeEnabled();
  }
  expect(api.requests).toEqual([{ enabled: true }, { enabled: false }]);
  expect(api.unexpected).toEqual([]);
});

for (const [reason, label] of [
  ['SAFETY_LOCKOUT', 'Bị chặn bởi khóa an toàn'],
  ['DEVICE_NOT_READY', 'Thiết bị chưa sẵn sàng'],
  ['COMMAND_PENDING', 'Đang chờ kết quả lệnh trước'],
  ['COMMAND_UNCONFIRMED', 'Chưa xác nhận lệnh, đã tạm dừng'],
  ['STOP_UNCONFIRMED', 'Chưa xác nhận tắt; kiểm tra Điều khiển Actuator'],
]) {
  test(`hiển thị tiếng Việt cho ${reason} và lịch sử lần chạy`, async ({ page }) => {
    const api = await fixtures(page);
    api.rule = { ...disabled(), enabled: reason === 'SAFETY_LOCKOUT', activeCommand: 'fixture-command-01', lastResult: reason };
    api.runs = [{ id: 1, startedAt: '2026-10-14T00:00:00Z', commandId: 'fixture-command-01', result: reason }];
    await page.goto('/');
    await expect(page.getByText(`Lệnh đang theo dõi: fixture-command-01`)).toBeVisible();
    await expect(page.getByText(label, { exact: false })).toHaveCount(2);
    expect(api.requests).toEqual([]); expect(api.unexpected).toEqual([]);
  });
}

test('hiển thị thời điểm cooldown do API cung cấp', async ({ page }) => {
  const api = await fixtures(page);
  api.rule = { ...disabled(), enabled: true, lastResult: 'COOLDOWN', cooldownUntil: '2099-10-14T00:01:00Z' };
  await page.goto('/');
  await expect(page.getByText(/Đang nghỉ sau OFF xác nhận/)).toBeVisible();
  await expect(page.getByText(/Nghỉ đến:.*2099/)).toBeVisible();
  expect(api.requests).toEqual([]); expect(api.unexpected).toEqual([]);
});

test('lỗi GET rồi phục hồi xóa thông báo lỗi cũ', async ({ page }) => {
  const api = await fixtures(page); api.failGet = true;
  await page.goto('/');
  await expect(page.getByRole('alert')).toHaveText('Không tải được quy tắc. Kiểm tra backend.');
  await expect(page.getByRole('button', { name: /^(Bật|Tắt) quy tắc$/ })).toBeDisabled();
  api.failGet = false;
  await expect(page.getByRole('status')).toHaveText('Quy tắc đang tắt');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^(Bật|Tắt) quy tắc$/ })).toBeEnabled();
  expect(api.unexpected).toEqual([]);
});

test('PUT bị từ chối không bị polling thành công che lỗi; thử lại thành công xóa lỗi', async ({ page }) => {
  const api = await fixtures(page); api.putStatus = 409;
  await page.goto('/');
  await page.getByRole('button', { name: 'Bật quy tắc' }).click();
  await expect(page.getByRole('alert')).toContainText('Cần cảm biến mới');
  const count = api.getCount;
  await expect.poll(() => api.getCount).toBeGreaterThan(count);
  await expect(page.getByRole('alert')).toContainText('Cần cảm biến mới');
  await expect(page.getByRole('status')).toHaveText('Quy tắc đang tắt');
  api.putStatus = 200;
  await page.getByRole('button', { name: 'Bật quy tắc' }).click();
  await expect(page.getByRole('status')).toHaveText('Quy tắc đang bật');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(api.unexpected).toEqual([]);
});

test('GET cũ lỗi trong lúc PUT đang chờ không ghi đè trạng thái mới', async ({ page }) => {
  const api = await fixtures(page);
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Quy tắc đang tắt');
  const stale = deferred(), put = deferred(), count = api.getCount;
  api.failGet = true; api.nextGet = stale.promise;
  await expect.poll(() => api.getCount).toBeGreaterThan(count);
  api.failGet = false; api.putGate = put.promise;
  await page.getByRole('button', { name: 'Bật quy tắc' }).click();
  await expect.poll(() => api.requests.length).toBe(1);
  stale.resolve();
  await expect(page.getByRole('status')).toHaveText('Quy tắc đang tắt');
  await expect(page.getByRole('alert')).toHaveCount(0);
  put.resolve();
  await expect(page.getByRole('status')).toHaveText('Quy tắc đang bật');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(api.unexpected).toEqual([]);
});

test('HTTP 200 có body sai không được coi là xác nhận bật', async ({ page }) => {
  const api = await fixtures(page); api.putResponse = {};
  await page.goto('/');
  await page.getByRole('button', { name: 'Bật quy tắc' }).click();
  await expect(page.getByRole('alert')).toContainText('Phản hồi quy tắc không hợp lệ');
  await expect(page.getByRole('status')).toHaveText('Quy tắc đang tắt');
  expect(api.unexpected).toEqual([]);
});

test('mất phản hồi PUT rồi GET xác nhận thay đổi thì xóa lỗi chưa xác nhận', async ({ page }) => {
  const api = await fixtures(page);
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Quy tắc đang tắt');
  const gate = deferred(); api.nextGet = gate.promise; api.losePutResponse = true;
  await page.getByRole('button', { name: 'Bật quy tắc' }).click();
  await expect(page.getByRole('alert')).toHaveText('Chưa xác nhận thay đổi quy tắc. Kiểm tra lại trạng thái.');
  await expect(page.getByRole('status')).toHaveText('Quy tắc đang tắt');
  gate.resolve();
  await expect(page.getByRole('status')).toHaveText('Quy tắc đang bật');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(api.requests).toEqual([{ enabled: true }]);
  expect(api.unexpected).toEqual([]);
});

test('sửa cài đặt giữ bản nháp qua polling, lưu có phiên bản rồi mới cho bật', async ({ page }) => {
  const api=await fixtures(page);
  await page.goto('/');
  const duration=page.getByLabel('Thời gian bật tự động (giây)');
  await expect(duration).toHaveValue('20');
  await duration.fill('12');
  await page.getByLabel('Khoảng nghỉ sau OFF (giây)').fill('120');
  await expect(page.getByRole('button',{name:'Bật quy tắc'})).toBeDisabled();
  const count=api.getCount; await expect.poll(()=>api.getCount).toBeGreaterThan(count);
  await expect(duration).toHaveValue('12');
  const gate=deferred();api.settingsGate=gate.promise;
  await page.getByRole('button',{name:'Lưu cài đặt',exact:true}).click();
  await expect.poll(()=>api.settingsRequests.length).toBe(1);
  await expect(page.getByText('Đã lưu cài đặt.',{exact:true})).toHaveCount(0);
  gate.resolve();
  await expect(page.getByText('Đã lưu cài đặt.',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Bật quy tắc'})).toBeEnabled();
  await expect(page.getByText(/Hai mẫu mới.*bật tối đa 12 giây.*Nghỉ 120 giây/)).toBeVisible();
  expect(api.settingsRequests).toEqual([{...defaults(),durationSeconds:12,cooldownSeconds:120}]);
  expect(api.unexpected).toEqual([]);
});

for (const active of [false,true]) test(`khóa sửa khi ${active?'run chưa xác nhận OFF':'quy tắc đang bật'}`,async({page})=>{
  const api=await fixtures(page);
  api.rule={...disabled(),enabled:!active,activeCommand:active?'unresolved':null};
  await page.goto('/');
  await expect(page.getByLabel('Thời gian bật tự động (giây)')).toBeDisabled();
  await expect(page.getByRole('button',{name:'Lưu cài đặt',exact:true})).toBeDisabled();
  expect(api.settingsRequests).toEqual([]);
});

test('khoảng ngưỡng và thời gian không hợp lệ không gửi PUT',async({page})=>{
  const api=await fixtures(page);
  await page.goto('/');
  await page.getByLabel('Ngưỡng đất khô (%)',{exact:true}).fill('34');
  await expect(page.getByRole('button',{name:'Lưu cài đặt',exact:true})).toBeDisabled();
  await page.getByLabel('Ngưỡng tắt sớm (%)',{exact:true}).fill('40');
  await page.getByLabel('Thời gian bật tự động (giây)').fill('31');
  await expect(page.getByRole('button',{name:'Lưu cài đặt',exact:true})).toBeDisabled();
  await page.getByLabel('Thời gian bật tự động (giây)').fill('10.5');
  await expect(page.getByRole('button',{name:'Lưu cài đặt',exact:true})).toBeDisabled();
  expect(api.settingsRequests).toEqual([]);
});

test('xung đột hai tab giữ bản nháp và chỉ tải lại khi người dùng yêu cầu',async({page})=>{
  const api=await fixtures(page);
  await page.goto('/');
  await page.getByLabel('Thời gian bật tự động (giây)').fill('12');
  api.settings={...defaults(),durationSeconds:15,revision:2};
  await expect(page.getByRole('alert')).toContainText('Cài đặt đã thay đổi ở phiên khác');
  await expect(page.getByLabel('Thời gian bật tự động (giây)')).toHaveValue('12');
  await expect(page.getByRole('button',{name:'Lưu cài đặt',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Tải lại cài đặt (bỏ thay đổi)',exact:true}).click();
  await expect(page.getByLabel('Thời gian bật tự động (giây)')).toHaveValue('15');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Bật quy tắc'})).toBeEnabled();
  expect(api.settingsRequests).toEqual([]);
});

test('409 không bị polling che lỗi, không coi là lưu thành công',async({page})=>{
  const api=await fixtures(page);api.settingsStatus=409;
  await page.goto('/');
  await page.getByLabel('Thời gian bật tự động (giây)').fill('12');
  await page.getByRole('button',{name:'Lưu cài đặt',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Không lưu được');
  const count=api.getCount;await expect.poll(()=>api.getCount).toBeGreaterThan(count);
  await expect(page.getByRole('alert')).toContainText('Không lưu được');
  await expect(page.getByLabel('Thời gian bật tự động (giây)')).toHaveValue('12');
  expect(api.settingsRequests).toHaveLength(1);
});

test('mất phản hồi lưu không tự gửi lại; tải lại đối chiếu cài đặt đã lưu',async({page})=>{
  const api=await fixtures(page);api.loseSettingsResponse=true;
  await page.goto('/');
  await page.getByLabel('Thời gian bật tự động (giây)').fill('12');
  await page.getByRole('button',{name:'Lưu cài đặt',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Chưa xác nhận cài đặt'})).toBeVisible();
  const count=api.getCount;await expect.poll(()=>api.getCount).toBeGreaterThan(count);
  await expect(page.getByRole('button',{name:'Lưu cài đặt',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Bật quy tắc'})).toBeDisabled();
  await page.getByRole('button',{name:'Tải lại cài đặt (bỏ thay đổi)',exact:true}).click();
  await expect(page.getByLabel('Thời gian bật tự động (giây)')).toHaveValue('12');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Bật quy tắc'})).toBeEnabled();
  expect(api.settingsRequests).toHaveLength(1);
});

test('lịch sử giữ cấu hình cũ, không gán mặc định cho run trước V11',async({page})=>{
  const api=await fixtures(page);
  api.runs=[{id:1,startedAt:'2026-10-14T00:00:00Z',commandId:'old-command',result:'REPORTED_OFF'},
    {...{id:2,startedAt:'2026-10-14T00:01:00Z',commandId:'new-command',result:'REPORTED_OFF'},dryThreshold:25,wetThreshold:40,durationSeconds:10,cooldownSeconds:120,settingsRevision:3} as typeof api.runs[number]];
  await page.goto('/');
  await expect(page.getByText('Cài đặt chưa được lưu cho lần chạy cũ.')).toBeVisible();
  await expect(page.getByText('Cài đặt v3: dưới 25% / tắt từ 40% · bật 10s · nghỉ 120s')).toBeVisible();
});

for (const response of ['invalid-body','broken-json','server-error']) test(`không lặp PUT khi kết quả lưu chưa xác định: ${response}`,async({page})=>{
  const api=await fixtures(page);
  if (response==='invalid-body') api.settingsResponse={};
  if (response==='broken-json') api.malformedSettingsJson=true;
  if (response==='server-error') api.settingsStatus=503;
  await page.goto('/');
  await page.getByLabel('Thời gian bật tự động (giây)').fill('12');
  await page.getByRole('button',{name:'Lưu cài đặt',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Đã lưu cài đặt.',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Lưu cài đặt',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Bật quy tắc'})).toBeDisabled();
  expect(api.settingsRequests).toHaveLength(1);
});


test('lịch tưới chọn thứ/giờ, lưu chờ xác nhận và không tự bật quy tắc',async({page})=>{
 const api=await fixtures(page);await page.goto('/');
 await page.getByLabel('Chế độ lịch tưới',{exact:true}).selectOption('TIME_WINDOWS');
 for(const day of ['Thứ 3','Thứ 5','Thứ 7','Chủ nhật'])await page.getByLabel(`${day}, khung 1`,{exact:true}).uncheck();
 await page.getByLabel('Giờ bắt đầu khung 1',{exact:true}).fill('05:30');
 await page.getByLabel('Giờ kết thúc khung 1',{exact:true}).fill('05:45');
 await expect(page.getByRole('button',{name:'Bật quy tắc',exact:true})).toBeDisabled();
 const count=api.getCount;await expect.poll(()=>api.getCount).toBeGreaterThan(count);
 await expect(page.getByLabel('Giờ bắt đầu khung 1',{exact:true})).toHaveValue('05:30');
 const gate=deferred();api.calendarGate=gate.promise;
 await page.getByRole('button',{name:'Lưu lịch tưới',exact:true}).click();
 await expect.poll(()=>api.calendarRequests.length).toBe(1);await expect(page.getByText('Đã lưu lịch tưới.',{exact:true})).toHaveCount(0);
 gate.resolve();await expect(page.getByText('Đã lưu lịch tưới.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Bật quy tắc',exact:true})).toBeEnabled();
 expect(api.calendarRequests[0]).toEqual({mode:'TIME_WINDOWS',zone:'Asia/Ho_Chi_Minh',revision:1,windows:[{days:[1,3,5],startTime:'05:30',endTime:'05:45'}]});
 expect(api.requests).toEqual([]);expect(api.unexpected).toEqual([]);
});

test('khung qua nửa đêm được ghi rõ, lịch chồng sang ngày sau không gửi PUT',async({page})=>{
 const api=await fixtures(page);await page.goto('/');
 await page.getByRole('button',{name:'Thêm khung giờ',exact:true}).click();
 await page.getByLabel('Giờ bắt đầu khung 1',{exact:true}).fill('23:00');
 await page.getByLabel('Giờ kết thúc khung 1',{exact:true}).fill('01:00');
 await expect(page.getByText('Qua nửa đêm; ngày được chọn là ngày bắt đầu khung.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Thêm khung giờ',exact:true}).click();
 await page.getByLabel('Giờ bắt đầu khung 2',{exact:true}).fill('00:30');
 await page.getByLabel('Giờ kết thúc khung 2',{exact:true}).fill('02:00');
 await expect(page.getByRole('button',{name:'Lưu lịch tưới',exact:true})).toBeDisabled();
 await page.getByLabel('Giờ bắt đầu khung 2',{exact:true}).fill('01:00');
 await expect(page.getByRole('button',{name:'Lưu lịch tưới',exact:true})).toBeEnabled();expect(api.calendarRequests).toEqual([]);
});

for(const active of [false,true])test(`lịch không sửa khi ${active?'run chưa kết thúc':'quy tắc đang bật'}`,async({page})=>{
 const api=await fixtures(page);api.rule={...disabled(),enabled:!active,activeCommand:active?'active-command':null,lastResult:'OUTSIDE_SCHEDULE'};
 await page.goto('/');await expect(page.getByLabel('Chế độ lịch tưới',{exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Lưu lịch tưới',exact:true})).toBeDisabled();
 await expect(page.getByText('Đang ngoài khung giờ tưới',{exact:false})).toBeVisible();expect(api.calendarRequests).toEqual([]);
});

test('lịch hai tab xung đột giữ bản nháp, tải lại mới nhận lịch server',async({page})=>{
 const api=await fixtures(page);await page.goto('/');await page.getByRole('button',{name:'Thêm khung giờ',exact:true}).click();
 await page.getByLabel('Giờ bắt đầu khung 1',{exact:true}).fill('05:30');
 api.calendar=calendarView({mode:'TIME_WINDOWS',zone:'Asia/Ho_Chi_Minh',revision:2,windows:[{days:[1,2,3],startTime:'07:00',endTime:'07:30'}]});
 await expect(page.getByRole('alert')).toContainText('Lịch đã thay đổi ở phiên khác');
 await expect(page.getByLabel('Giờ bắt đầu khung 1',{exact:true})).toHaveValue('05:30');
 await expect(page.getByRole('button',{name:'Lưu lịch tưới',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Tải lại lịch (bỏ thay đổi)',exact:true}).click();
 await expect(page.getByLabel('Giờ bắt đầu khung 1',{exact:true})).toHaveValue('07:00');await expect(page.getByRole('alert')).toHaveCount(0);
 expect(api.calendarRequests).toEqual([]);
});

for(const failure of ['lost','invalid','server'])test(`lưu lịch chưa rõ kết quả ${failure}: không tự gửi lại`,async({page})=>{
 const api=await fixtures(page);api.calendarLoseResponse=failure==='lost';api.calendarInvalidResponse=failure==='invalid';api.calendarStatus=failure==='server'?503:200;
 await page.goto('/');await page.getByRole('button',{name:'Thêm khung giờ',exact:true}).click();
 await page.getByRole('button',{name:'Lưu lịch tưới',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:/lịch|Phản hồi/})).not.toHaveCount(0);
 await expect(page.getByRole('button',{name:'Lưu lịch tưới',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Bật quy tắc',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Tải lại lịch (bỏ thay đổi)',exact:true}).click();
 await expect(page.getByRole('alert')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Bật quy tắc',exact:true})).toBeEnabled();expect(api.calendarRequests).toHaveLength(1);
});

test('cả ngày được ghi rõ và run cũ không bị gán lịch mặc định',async({page})=>{
 const api=await fixtures(page);api.runs=[{id:1,startedAt:'2026-10-14T00:00:00Z',commandId:'old-run',result:'REPORTED_OFF'}];
 await page.goto('/');await expect(page.getByText('Cả ngày: quy tắc đã bật có thể tưới bất kỳ giờ nào nếu đất khô và đủ điều kiện.',{exact:true})).toBeVisible();
 await expect(page.getByText('Lịch chưa được ghi cho lần chạy cũ.',{exact:true})).toBeVisible();
 expect(api.calendarRequests).toEqual([]);
});
