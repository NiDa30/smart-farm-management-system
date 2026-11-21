import { test, expect, type Page } from '@playwright/test';

const ORIGIN = 'http://127.0.0.1:4185';
import { data } from './fixtures/liveviews/data';

async function fixtures(page: Page) {
  const state = { data: data(), writes: [] as { method: string; path: string; body: unknown }[], unexpected: [] as string[] };
  await page.route('**/*', async route => {
    if (new URL(route.request().url()).origin !== ORIGIN) { state.unexpected.push(route.request().url()); await route.abort(); return; }
    await route.continue();
  });
  await page.route('**/api/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (request.method() === 'GET' && path in state.data) return route.fulfill({ json: state.data[path] });
    if (request.method() === 'PUT' && /^\/api\/v1\/iot\/actuators\/[A-Z0-9]+\/rated-power$/.test(path)) {
      state.writes.push({ method: 'PUT', path, body: request.postDataJSON() }); return route.fulfill({ json: {} });
    }
    state.unexpected.push(request.method() + ' ' + path); await route.abort();
  });
  return state;
}

test('topology shows broker, node links and actuator states from reports only', async ({ page }) => {
  const state = await fixtures(page); await page.goto('/#topology');
  await expect(page.getByLabel('MQTT broker')).toContainText('Backend đang kết nối MQTT');
  const env = page.getByRole('listitem', { name: 'Node ENV01' });
  await expect(env).toContainText('Đang gửi dữ liệu');
  await expect(env).toContainText('PUMP01: ON');
  await expect(env).toContainText('FAN01: chưa xác định');
  const water = page.getByRole('listitem', { name: 'Node WATER01' });
  await expect(water).toContainText('Im lặng > 30 giây');
  await expect(water).toContainText('chưa có dữ liệu mới');
  expect(state.writes).toEqual([]); expect(state.unexpected).toEqual([]);
});

test('digital twin: per-area sensors, stale marked, zones and running sequence', async ({ page }) => {
  const state = await fixtures(page); await page.goto('/#twin');
  await expect(page.getByRole('region', { name: 'Khu Khu A' })).toContainText('28.4°C');
  await expect(page.getByRole('region', { name: 'Khu Khu B' })).toContainText('dữ liệu cũ hoặc chưa có');
  const irrigation = page.getByRole('region', { name: 'Hệ thống tưới' });
  await expect(irrigation).toContainText('Bơm PUMP01: ON');
  await expect(irrigation.getByRole('listitem', { name: 'Zone Zone 1' })).toContainText('VALVE01: ON');
  await expect(irrigation).toContainText('bước 1/1 · Đang tưới');
  await expect(page.getByRole('region', { name: 'Vi khí hậu' })).toContainText('Quạt FAN01: chưa xác định');
  await expect(page.getByRole('region', { name: 'Vi khí hậu' })).toContainText('Phun sương MIST01: OFF · khóa');
  expect(state.unexpected).toEqual([]);
});

test('edge status: firmware, trial boot, OTA in flight, only open health alerts', async ({ page }) => {
  const state = await fixtures(page); await page.goto('/#edge');
  const env = page.getByRole('region', { name: 'ENV01' });
  await expect(env).toContainText('Firmware 1.4.0 · phân vùng app1 · đang khởi động thử bản mới');
  await expect(env).toContainText('Cấu hình revision 6');
  await expect(env).toContainText('Đang OTA 1.3.0 → 1.4.0');
  const alerts = page.getByRole('region', { name: 'Cảnh báo sức khỏe' });
  await expect(alerts.getByRole('listitem')).toHaveCount(1);
  await expect(alerts).toContainText('WATER01');
  expect(state.unexpected).toEqual([]);
});

test('energy: estimate wording, unrated devices, rated power saved via PUT', async ({ page }) => {
  const state = await fixtures(page); await page.goto('/#energy');
  await expect(page.getByRole('status')).toHaveText('Tổng ước tính: 0.1 kWh');
  await expect(page.getByRole('row', { name: 'PUMP01' })).toContainText('chưa khai báo công suất');
  await expect(page.getByRole('row', { name: 'FAN01' })).toContainText('30 phút');
  await page.getByLabel('Công suất PUMP01').fill('0');
  await page.getByRole('row', { name: 'PUMP01' }).getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByRole('alert')).toContainText('1–20000 W');
  expect(state.writes).toEqual([]);
  await page.getByLabel('Công suất PUMP01').fill('370');
  await page.getByRole('row', { name: 'PUMP01' }).getByRole('button', { name: 'Lưu' }).click();
  await expect.poll(() => state.writes).toEqual([{ method: 'PUT', path: '/api/v1/iot/actuators/PUMP01/rated-power', body: { ratedWatts: 370 } }]);
  expect(state.unexpected).toEqual([]);
});

test('analytics: command success rate, automation and alert counts, runtime', async ({ page }) => {
  const state = await fixtures(page); await page.goto('/#analytics');
  await expect(page.getByRole('region', { name: 'Lệnh bơm PUMP01' })).toContainText('4 lệnh · thành công 75%');
  await expect(page.getByRole('region', { name: 'Lệnh bơm PUMP01' })).toContainText('NO_VALVE_OPEN ×1');
  await expect(page.getByRole('region', { name: 'Lệnh actuator (van, quạt, đèn, phun sương)' })).toContainText('thành công —');
  await expect(page.getByRole('region', { name: 'Tự động hóa' })).toContainText('Lượt tưới theo độ ẩm: 5 · tưới theo zone hoàn tất 2, dừng 1');
  await expect(page.getByRole('region', { name: 'Thời gian chạy' })).toContainText('PUMP01: 1 giờ 30 phút');
  expect(state.unexpected).toEqual([]);
});

test('water page uses the real station and alert panels; bad data is never shown', async ({ page }) => {
  const state = await fixtures(page); await page.goto('/#water');
  await expect(page.getByRole('heading', { name: 'Giám sát nước' })).toBeVisible();
  await expect(page.getByText('Trạm bồn').first()).toBeVisible();
  expect(state.unexpected).toEqual([]);
  (state.data['/api/v1/iot/energy'] as any).method = 'METER';
  await page.goto('/#energy');
  await page.reload();
  await expect(page.getByRole('status')).toHaveText('Chưa đọc được dữ liệu điện năng.');
  await expect(page.getByRole('row')).toHaveCount(0);
});
