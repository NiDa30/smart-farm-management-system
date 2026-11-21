import { test, expect, type Page } from '@playwright/test';

const ORIGIN = 'http://127.0.0.1:4184';
const iso = () => new Date().toISOString();
const settings = { telemetrySeconds: 5, heartbeatSeconds: 10, soilWetAdc: 0, soilDryAdc: 4095, pumpMaxSeconds: 3600 };
const device = (extra: Record<string, unknown> = {}) => ({ revision: 4, settings, firmwareVersion: '1.3.0', partition: 'app0', otaTrial: false, observedAt: iso(), ...extra });
const release = (version: string) => ({ version, size: 807409, sha256: 'd41d438c379110c7f7b2c561b1f04f26c1b4549110791f8e022f48974280c13e',
  signature: 'MEUC'.padEnd(96, 'A'), url: `https://fw.s3.amazonaws.com/${version}.bin`, createdAt: iso() });
const job = (state: string, extra: Record<string, unknown> = {}) => ({ otaId: '0a7f3b2e-58c1-4d1e-a0f4-6b9e2d7c4a35', version: '1.4.0', fromVersion: '1.3.0',
  issuedAt: iso(), state, progress: null, errorCode: null, updatedAt: iso(), ...extra });

async function fixtures(page: Page) {
  const state = { config: { enabled: true, device: device(), requests: [] as unknown[] } as any,
    ota: { enabled: true, signingKeyConfigured: true, runningVersion: '1.3.0', releases: [release('1.4.0'), release('1.3.0')], jobs: [] as unknown[] } as any,
    posts: [] as { path: string; body: unknown }[], unexpected: [] as string[], status: 202 };
  await page.route('**/*', async route => {
    if (new URL(route.request().url()).origin !== ORIGIN) { state.unexpected.push(route.request().url()); await route.abort(); return; }
    await route.continue();
  });
  await page.route('**/api/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (request.method() === 'GET' && path === '/api/v1/devices/ENV01/config') return route.fulfill({ json: state.config });
    if (request.method() === 'GET' && path === '/api/v1/devices/ENV01/ota') return route.fulfill({ json: state.ota });
    if (request.method() === 'POST' && ['/api/v1/devices/ENV01/config', '/api/v1/devices/ENV01/ota/jobs'].includes(path)) {
      state.posts.push({ path, body: request.postDataJSON() });
      return route.fulfill({ status: state.status, json: {} });
    }
    state.unexpected.push(request.method() + ' ' + path); await route.abort();
  });
  return state;
}

test('shows what the device reports and sends a validated configuration', async ({ page }) => {
  const state = await fixtures(page); await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('ENV01 chạy firmware 1.3.0 (app0), cấu hình revision 4.');
  const region = page.getByRole('region', { name: 'Cấu hình từ xa' });
  await region.getByLabel('Chu kỳ gửi dữ liệu').fill('30');
  await expect(region).toContainText('Chu kỳ gửi dữ liệu 5–10 giây');
  await expect(region.getByRole('button', { name: 'Gửi cấu hình' })).toBeDisabled();
  await region.getByLabel('Chu kỳ gửi dữ liệu').fill('8');
  await region.getByLabel('ADC đất ướt').fill('900');
  await region.getByLabel('ADC đất khô').fill('1000');
  await expect(region.getByRole('button', { name: 'Gửi cấu hình' })).toBeDisabled();
  await region.getByLabel('ADC đất khô').fill('3100');
  await region.getByLabel('Giới hạn bơm mỗi lệnh').fill('600');
  await expect(region).toContainText('thiết bị: 3600');
  await region.getByRole('button', { name: 'Gửi cấu hình' }).click();
  await expect.poll(() => state.posts).toEqual([{ path: '/api/v1/devices/ENV01/config',
    body: { telemetrySeconds: 8, heartbeatSeconds: 10, soilWetAdc: 900, soilDryAdc: 3100, pumpMaxSeconds: 600 } }]);
  state.config.requests = [{ configId: '5b0d8a52-4b7e-4f4c-9d33-2a6c1e0f9b11', revision: 5, settings, issuedAt: iso(), state: 'REJECTED', errorCode: 'STALE_REVISION', appliedRevision: 4 }];
  await page.reload();
  await expect(region).toContainText('Revision 5: Thiết bị từ chối (revision cũ)');
  expect(state.unexpected).toEqual([]);
});

test('OTA: current version cannot be chosen; running job and rollback are shown', async ({ page }) => {
  const state = await fixtures(page); await page.goto('/');
  const region = page.getByRole('region', { name: 'Cập nhật firmware OTA' });
  const button = region.getByRole('button', { name: 'Cập nhật ENV01' });
  await expect(button).toBeDisabled();
  await expect(region.locator('option', { hasText: '1.3.0 (đang chạy)' })).toHaveJSProperty('disabled', true);
  await region.getByLabel('Bản firmware').selectOption('1.4.0');
  await button.click();
  await expect.poll(() => state.posts).toEqual([{ path: '/api/v1/devices/ENV01/ota/jobs', body: { version: '1.4.0' } }]);
  state.ota.jobs = [job('DOWNLOADING', { progress: 50 })];
  await page.reload();
  await expect(region).toContainText('Đang cập nhật 1.3.0 → 1.4.0: Đang tải 50%');
  await expect(region.getByRole('button', { name: 'Cập nhật ENV01' })).toHaveCount(0);
  state.ota.jobs = [job('ROLLED_BACK', { errorCode: 'TRIAL_FAILED' })];
  await page.reload();
  await expect(region).toContainText('1.3.0 → 1.4.0: Đã quay về bản cũ (bản mới không khởi động ổn định)');
  state.status = 409;
  await region.getByLabel('Bản firmware').selectOption('1.4.0');
  await region.getByRole('button', { name: 'Cập nhật ENV01' }).click();
  await expect(page.getByRole('alert')).toContainText('Thiết bị chưa sẵn sàng');
  expect(state.unexpected).toEqual([]);
});

test('no key, trial boot, disabled backend and bad data block actions', async ({ page }) => {
  const state = await fixtures(page);
  state.ota.signingKeyConfigured = false; state.config.device = device({ otaTrial: true });
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('đang khởi động thử bản mới');
  await expect(page.getByText('Backend chưa có khóa công khai OTA')).toBeVisible();
  await page.getByLabel('Bản firmware').selectOption('1.4.0');
  await expect(page.getByRole('button', { name: 'Cập nhật ENV01' })).toBeDisabled();
  state.config.enabled = false; state.config.device = device();
  await page.reload();
  await expect(page.getByRole('status')).toContainText('chỉ xem');
  await expect(page.getByRole('button', { name: 'Gửi cấu hình' })).toBeDisabled();
  state.config.device = device({ settings: { ...settings, telemetrySeconds: 60 } });
  await page.reload();
  await expect(page.getByRole('status')).toHaveText('Chưa đọc được trạng thái quản lý thiết bị từ backend.');
  expect(state.posts).toEqual([]);
});
