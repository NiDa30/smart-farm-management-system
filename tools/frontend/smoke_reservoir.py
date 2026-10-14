"""GET-only full-app check using the dedicated reservoir_smoke SQL fixture.
Seed OFF/locked/WATER_LOW status, no commands, MQTT/control disabled.
This checks UI/API/DB, never simulates the float electrically or calls AWS.
"""
import os
import shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

base = os.environ.get('FRONTEND_URL', 'http://127.0.0.1:3000')
origin = urlparse(base).netloc
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
    page = browser.new_page(viewport={'width': 1380, 'height': 1100})
    errors, writes = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def guard(route):
        request = route.request
        if urlparse(request.url).netloc != origin:
            route.abort()
            return
        if '/api/' in request.url and request.method != 'GET':
            writes.append(request.url)
            route.abort()
            return
        route.continue_()

    page.route('**/*', guard)
    safety = page.request.get(base + '/api/v1/safety').json()
    assert safety['mqtt']['state'] == 'DISABLED'
    assert safety['controlEnabled'] is False
    assert safety['relay']['stateReason'] == 'WATER_LOW'
    assert safety['relay']['safetyLockout'] is True
    assert safety['queue']['unresolved'] == 0
    page.goto(base)
    page.get_by_role('button', name='IoT & Tự động hóa', exact=True).click()
    page.get_by_role('button', name='An toàn Fail-Safe & Edge', exact=True).click()
    relay = page.get_by_role('region', name='Relay và khóa an toàn', exact=True)
    expect(relay).to_contain_text('Bồn cạn nước hoặc đứt dây phao')
    expect(page.get_by_role('region', name='Lịch sử relay')).to_contain_text('Bồn cạn nước hoặc đứt dây phao')
    page.get_by_role('button', name='Mở Điều khiển Actuator', exact=True).click()
    expect(page.get_by_role('heading', name='Điều khiển PUMP01', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Bật đèn', exact=True)).to_be_disabled()
    expect(page.get_by_text('Bồn cạn nước hoặc đứt dây phao', exact=True)).to_be_visible()
    page.screenshot(path='/tmp/reservoir-smoke.png', full_page=True)
    assert not writes, writes
    assert not errors, errors
    browser.close()
    print('PASS reservoir: full app -> real API/PostgreSQL WATER_LOW history; GET only, MQTT/control disabled')
