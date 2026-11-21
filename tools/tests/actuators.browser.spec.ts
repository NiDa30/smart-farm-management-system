import { test, expect, type Page } from '@playwright/test';

const ORIGIN = 'http://127.0.0.1:4183';
const iso = (offset = 0) => new Date(Date.now() + offset).toISOString();
function actuator(id: string, type: string, extra: Record<string, unknown> = {}) {
  const zone = type === 'VALVE' ? `Zone ${id.slice(-1)}` : null;
  const max = type === 'VALVE' ? 3600 : type === 'MIST' ? 600 : 14400;
  return { actuatorId: id, actuatorType: type, zoneName: zone, maxSeconds: max, reportedState: 'OFF', safetyLockout: false,
    stateReason: 'BOOT', fresh: true, observedAt: iso(), ...extra };
}
function overview(enabled = true) {
  return { enabled, actuators: [actuator('VALVE01', 'VALVE'), actuator('VALVE02', 'VALVE'), actuator('VALVE03', 'VALVE'),
    actuator('FAN01', 'FAN'), actuator('LIGHT01', 'LIGHT', { reportedState: 'UNKNOWN', fresh: false, observedAt: iso(-60000), stateReason: 'COMMAND_ON' }),
    actuator('MIST01', 'MIST', { safetyLockout: true, stateReason: 'WATER_LOW' })] };
}
const running = () => ({ id: 7, state: 'RUNNING', createdAt: iso(), finishedAt: null, result: null, currentStep: 2, steps: [
  { stepNo: 1, valveId: 'VALVE01', zoneName: 'Zone 1', pumpSeconds: 120, phase: 'DONE', phaseStartedAt: iso(), result: 'OK' },
  { stepNo: 2, valveId: 'VALVE03', zoneName: 'Zone 3', pumpSeconds: 120, phase: 'WATERING', phaseStartedAt: iso(), result: null }] });

async function fixtures(page: Page) {
  const state = { overview: overview() as unknown, commands: [] as unknown[], sequence: { enabled: true, current: null, recent: [] } as any,
    posts: [] as { path: string; body: unknown }[], unexpected: [] as string[], postStatus: 202 };
  await page.route('**/*', async route => {
    if (new URL(route.request().url()).origin !== ORIGIN) { state.unexpected.push(route.request().url()); await route.abort(); return; }
    await route.continue();
  });
  await page.route('**/api/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (request.method() === 'GET' && path === '/api/v1/actuators') return route.fulfill({ json: state.overview });
    if (request.method() === 'GET' && path === '/api/v1/actuators/v3/commands') return route.fulfill({ json: state.commands });
    if (request.method() === 'GET' && path === '/api/v1/automation/zone-sequence') return route.fulfill({ json: state.sequence });
    if (request.method() === 'POST' && (/^\/api\/v1\/actuators\/v3\/[A-Z0-9]+\/commands$/.test(path) || path.startsWith('/api/v1/automation/zone-sequence'))) {
      state.posts.push({ path, body: request.postDataJSON() });
      return route.fulfill({ status: state.postStatus, json: state.postStatus === 202 ? (path.includes('zone-sequence') ? state.sequence : {}) : { message: 'busy' } });
    }
    state.unexpected.push(request.method() + ' ' + path); await route.abort();
  });
  return state;
}

test('shows device-reported state; stale is unknown, locked needs reset, nothing sent on load', async ({ page }) => {
  const state = await fixtures(page); await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Điều khiển actuator đang bật.');
  const fan = page.getByRole('article', { name: 'FAN01' });
  await expect(fan).toContainText('Trạng thái: OFF · Khóa: Không');
  await expect(fan.getByRole('button', { name: 'Bật FAN01' })).toBeEnabled();
  const light = page.getByRole('article', { name: 'LIGHT01' });
  await expect(light).toContainText('Trạng thái: Chưa xác định · Khóa: Chưa xác định');
  await expect(light.getByRole('button', { name: 'Bật LIGHT01' })).toBeDisabled();
  await expect(light.getByRole('button', { name: 'Tắt LIGHT01' })).toBeEnabled(); // OFF is always offered
  const mist = page.getByRole('article', { name: 'MIST01' });
  await expect(mist).toContainText('Lý do: Cạn nước');
  await expect(mist.getByRole('button', { name: 'Bật MIST01' })).toBeDisabled();
  await expect(mist.getByRole('button', { name: 'Mở khóa MIST01' })).toBeEnabled();
  await expect(page.getByRole('article', { name: 'VALVE01' })).toContainText('Van zone · Zone 1');
  expect(state.posts).toEqual([]); expect(state.unexpected).toEqual([]);
});

test('manual ON sends minutes as seconds within the cap; pending blocks a second ON', async ({ page }) => {
  const state = await fixtures(page); await page.goto('/');
  const fan = page.getByRole('article', { name: 'FAN01' });
  await fan.getByLabel('Thời gian FAN01').fill('3');
  await fan.getByRole('button', { name: 'Bật FAN01' }).click();
  await expect.poll(() => state.posts).toEqual([{ path: '/api/v1/actuators/v3/FAN01/commands', body: { action: 'ON', durationSeconds: 180 } }]);
  state.commands = [{ commandId: '6f1c2e1a-8d43-4c55-9b0e-7f6a5e3d2c10', actuatorId: 'FAN01', action: 'ON', durationSeconds: 180, issuedAt: iso(), expiresAt: iso(10000),
    state: 'SENT', reportedState: null, errorCode: null, source: 'MANUAL' }];
  await page.getByRole('article', { name: 'MIST01' }).getByRole('button', { name: 'Tắt MIST01' }).click(); // triggers a refresh
  await expect(fan).toContainText('Còn lệnh chờ ACK.');
  await expect(fan.getByRole('button', { name: 'Bật FAN01' })).toBeDisabled();
  const valve = page.getByRole('article', { name: 'VALVE01' });
  await valve.getByLabel('Thời gian VALVE01').fill('61'); // above the 60 min valve cap
  await expect(valve.getByRole('button', { name: 'Bật VALVE01' })).toBeDisabled();
  await valve.getByLabel('Thời gian VALVE01').fill('60');
  await expect(valve.getByRole('button', { name: 'Bật VALVE01' })).toBeEnabled();
  state.postStatus = 409;
  await page.getByRole('article', { name: 'VALVE02' }).getByRole('button', { name: 'Bật VALVE02' }).click();
  await expect(page.getByRole('alert')).toContainText('Thiết bị chưa sẵn sàng');
  expect(state.unexpected).toEqual([]);
});

test('zone sequence posts the selected zones in order and can be cancelled', async ({ page }) => {
  const state = await fixtures(page); await page.goto('/');
  const region = page.getByRole('region', { name: 'Tưới lần lượt theo zone' });
  await region.getByRole('button', { name: 'Bắt đầu tưới theo zone' }).click();
  await expect(page.getByRole('alert')).toHaveText('Chọn ít nhất một zone.');
  await region.getByLabel('Chọn Zone 1').check();
  await region.getByLabel('Phút bơm Zone 1').fill('2');
  await region.getByLabel('Chọn Zone 3').check();
  await region.getByLabel('Phút bơm Zone 3').fill('2.5');
  await region.getByRole('button', { name: 'Bắt đầu tưới theo zone' }).click();
  await expect.poll(() => state.posts.at(-1)).toEqual({ path: '/api/v1/automation/zone-sequence',
    body: { zones: [{ valveId: 'VALVE01', pumpSeconds: 120 }, { valveId: 'VALVE03', pumpSeconds: 150 }] } });
  state.sequence = { enabled: true, current: running(), recent: [running()] };
  await page.reload();
  await expect(region).toContainText('Lượt #7 đang chạy');
  await expect(region).toContainText('2. Zone 3 (VALVE03) · bơm 2 phút · Đang tưới');
  await expect(page.getByRole('article', { name: 'FAN01' }).getByRole('button', { name: 'Bật FAN01' })).toBeDisabled();
  await region.getByRole('button', { name: 'Dừng lượt tưới' }).click();
  await expect.poll(() => state.posts.at(-1)?.path).toBe('/api/v1/automation/zone-sequence/cancel');
  state.sequence = { enabled: true, current: null, recent: [{ ...running(), state: 'ABORTED', finishedAt: iso(), result: 'PUMP_STOPPED WATER_LOW',
    steps: [running().steps[0], { ...running().steps[1], phase: 'FAILED', result: 'PUMP_STOPPED WATER_LOW' }] }] };
  await page.reload();
  await expect(region).toContainText('#7 · Đã dừng · Bơm dừng bất thường (WATER_LOW) · VALVE01: Xong, VALVE03: Lỗi');
  expect(state.unexpected).toEqual([]);
});

test('disabled backend is view-only and a malformed response is never shown as state', async ({ page }) => {
  const state = await fixtures(page); state.overview = overview(false); state.sequence = { enabled: false, current: null, recent: [] };
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Backend chưa bật điều khiển actuator; chỉ xem.');
  await expect(page.getByRole('button', { name: 'Bật FAN01' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Tắt FAN01' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Bắt đầu tưới theo zone' })).toBeDisabled();
  const bad = overview(); (bad.actuators[3] as any).reportedState = 'OFF'; (bad.actuators[3] as any).fresh = false;
  state.overview = bad; await page.reload();
  await expect(page.getByRole('status')).toHaveText('Chưa đọc được trạng thái actuator từ backend.');
  await expect(page.getByRole('article')).toHaveCount(0);
  expect(state.posts).toEqual([]);
});
