import { test, expect, type Page } from '@playwright/test';

type Rule = {
  enabled: boolean; lowCount: number; activeCommand: string | null;
  cooldownUntil: string | null; lastResult: string;
};
const disabled = (): Rule => ({ enabled: false, lowCount: 0, activeCommand: null, cooldownUntil: null, lastResult: 'DISABLED' });
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
async function fixtures(page: Page) {
  const state = {
    rule: disabled(),
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
    await expect(page.getByRole('button')).toBeDisabled();
    gate.resolve();
    await expect(page.getByRole('status')).toHaveText(`Quy tắc đang ${after}`);
    await expect(page.getByRole('button')).toBeEnabled();
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
  await expect(page.getByText(/Đang nghỉ ít nhất 60 giây sau OFF xác nhận/)).toBeVisible();
  await expect(page.getByText(/Nghỉ đến:.*2099/)).toBeVisible();
  expect(api.requests).toEqual([]); expect(api.unexpected).toEqual([]);
});

test('lỗi GET rồi phục hồi xóa thông báo lỗi cũ', async ({ page }) => {
  const api = await fixtures(page); api.failGet = true;
  await page.goto('/');
  await expect(page.getByRole('alert')).toHaveText('Không tải được quy tắc. Kiểm tra backend.');
  await expect(page.getByRole('button')).toBeDisabled();
  api.failGet = false;
  await expect(page.getByRole('status')).toHaveText('Quy tắc đang tắt');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button')).toBeEnabled();
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
