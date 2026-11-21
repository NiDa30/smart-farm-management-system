import { test, expect, type Page } from '@playwright/test';
import { data } from './fixtures/liveviews/data';

const ORIGIN = 'http://127.0.0.1:4185';
const now = () => new Date().toISOString();
const definition = { conditions: { op: 'ALL', items: [{ type: 'SENSOR', nodeId: 'ENV01', channelId: 'TEMP', comparator: 'GT', value: 32, forSeconds: 120 },
  { type: 'TIME', start: '08:00', end: '17:00', days: [1, 2, 3, 4, 5, 6, 7] }] },
  actions: [{ type: 'ACTUATOR', actuatorId: 'FAN01', action: 'ON', durationSeconds: 900 }], cooldownSeconds: 1800, maxRunsPerDay: 6, manualHoldSeconds: 900 };
const rule = { id: 7, name: 'Quạt khi nóng', enabled: true, revision: 2, definition, targets: ['FAN01'], updatedAt: now(), lastEvaluatedAt: now(),
  lastOutcome: 'TRUE', lastSkip: 'COOLDOWN', lastFiredAt: now(), runsToday: 2 };

async function fixtures(page: Page, options: { conflict?: boolean } = {}) {
  const base = data() as Record<string, unknown>;
  const state = { rules: [rule] as unknown[], writes: [] as { method: string; path: string; body: unknown }[], unexpected: [] as string[] };
  await page.route('**/*', async route => {
    if (new URL(route.request().url()).origin !== ORIGIN) { state.unexpected.push(route.request().url()); await route.abort(); return; }
    await route.continue();
  });
  await page.route('**/api/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname; const method = request.method();
    if (method === 'GET' && path === '/api/v1/automation/rules')
      return route.fulfill({ json: { enabled: true, wateringRule: { name: 'Tưới theo độ ẩm đất', enabled: true, targets: ['PUMP01'] }, rules: state.rules } });
    if (method === 'GET' && path === '/api/v1/automation/rules/runs')
      return route.fulfill({ json: [{ id: 3, ruleId: 7, ruleName: 'Quạt khi nóng', ruleRevision: 2, firedAt: now(), result: 'FIRED', detail: 'FAN01 ON 900s', commandIds: ['5b1c3f52-2d5e-4c1e-9d0e-1f1a2b3c4d5e'], sequenceId: null }] });
    if (method === 'GET' && path in base) return route.fulfill({ json: base[path] });
    if (method !== 'GET' && path.startsWith('/api/v1/automation/rules')) {
      const body = request.postData() ? request.postDataJSON() : null; state.writes.push({ method, path, body });
      if (path.endsWith('/simulation')) return route.fulfill({ json: { hours: body.hours, from: now(), to: now(), stepSeconds: 60, trueMinutes: 42, falseMinutes: 1300, unknownMinutes: 98, fires: [now(), now()], truncated: false } });
      if (options.conflict && path.endsWith('/enabled')) return route.fulfill({ status: 409, json: { status: 409, message: 'FAN01 đã được quy tắc "Khác" điều khiển' } });
      if (method === 'POST') { state.rules = [...state.rules, { ...rule, id: 8, name: body.name, enabled: false, revision: 1, definition: body.definition, lastOutcome: null, lastSkip: null, runsToday: 0 }]; return route.fulfill({ status: 201, json: {} }); }
      return route.fulfill({ json: {} });
    }
    state.unexpected.push(method + ' ' + path); await route.abort();
  });
  return state;
}

test('rule list shows last outcome, skip reason, runs today and the built-in watering rule', async ({ page }) => {
  const state = await fixtures(page); await page.goto('/#rules'); await page.reload();
  const row = page.getByRole('row', { name: 'Quy tắc Quạt khi nóng' });
  await expect(row).toContainText('Đúng · không chạy: đang nghỉ');
  await expect(row).toContainText('2/6');
  await expect(row).toContainText('FAN01');
  await expect(page.getByRole('table')).toContainText('Tưới theo độ ẩm đất');
  await expect(page.getByRole('region', { name: 'Lịch sử chạy quy tắc' })).toContainText('đã gửi lệnh');
  expect(state.writes).toEqual([]); expect(state.unexpected).toEqual([]);
});

test('builder validates, simulates without commands, and saves an AND/OR rule disabled', async ({ page }) => {
  const state = await fixtures(page); await page.goto('/#rules'); await page.reload();
  await page.getByRole('button', { name: 'Quy tắc mới' }).click();
  const save = page.getByRole('button', { name: /Lưu/ });
  await expect(save).toBeDisabled();
  await page.getByLabel('Tên quy tắc').fill('Phun sương');
  await page.getByRole('button', { name: '+ Cảm biến' }).click();
  await page.getByLabel('Điều kiện 1.1 ngưỡng').fill('33');
  await page.getByRole('button', { name: '+ Nhóm con' }).click();
  await expect(page.getByText('Nhóm điều kiện đang rỗng.')).toBeVisible();
  await page.getByRole('button', { name: '+ Khung giờ' }).first().click();
  await page.getByRole('button', { name: '+ Bật/tắt thiết bị' }).click();
  await page.getByLabel('Hành động 1 thiết bị').selectOption('FAN01');
  await page.getByLabel('Hành động 1 giây').fill('600');
  await expect(save).toBeEnabled();
  await page.getByRole('button', { name: 'Mô phỏng' }).click();
  await expect(page.getByRole('region', { name: 'Kết quả mô phỏng' })).toContainText('quy tắc sẽ chạy 2 lần');
  await save.click();
  await expect(page.getByRole('row', { name: 'Quy tắc Phun sương' })).toContainText('chưa đánh giá');
  const post = state.writes.find(w => w.method === 'POST' && w.path === '/api/v1/automation/rules')!;
  const body = post.body as { name: string; definition: { conditions: { op: string; items: unknown[] }; actions: unknown[] } };
  expect(body.name).toBe('Phun sương');
  expect(body.definition.conditions.items[0]).toMatchObject({ type: 'SENSOR', nodeId: 'ENV01', channelId: 'TEMP', comparator: 'GT', value: 33 });
  expect(body.definition.conditions.items[1]).toMatchObject({ op: 'ANY', items: [{ type: 'TIME' }] });
  expect(body.definition.actions).toEqual([{ type: 'ACTUATOR', actuatorId: 'FAN01', action: 'ON', durationSeconds: 600 }]);
  expect(state.writes.find(w => w.path.endsWith('/simulation'))!.body).toMatchObject({ hours: 24 });
  expect(state.unexpected).toEqual([]);
});

test('enabling a conflicting rule shows the backend reason', async ({ page }) => {
  const state = await fixtures(page, { conflict: true }); await page.goto('/#rules'); await page.reload();
  await page.getByLabel('Bật Quạt khi nóng').click();
  await expect(page.getByRole('alert')).toContainText('Xung đột: FAN01 đã được quy tắc "Khác" điều khiển');
  await expect(page.getByLabel('Bật Quạt khi nóng')).toBeChecked();
  expect(state.writes).toEqual([{ method: 'PUT', path: '/api/v1/automation/rules/7/enabled', body: { enabled: false } }]);
});

test('water-level sensor offers only present/empty values', async ({ page }) => {
  await fixtures(page); await page.goto('/#rules'); await page.reload();
  await page.getByRole('button', { name: 'Quy tắc mới' }).click();
  await page.getByRole('button', { name: '+ Cảm biến' }).click();
  await page.getByLabel('Điều kiện 1.1 kênh').selectOption('WATER01/LOW');
  await expect(page.getByLabel('Điều kiện 1.1 so sánh')).toHaveCount(0);
  await expect(page.getByLabel('Điều kiện 1.1 giá trị')).toHaveValue('true');
});
