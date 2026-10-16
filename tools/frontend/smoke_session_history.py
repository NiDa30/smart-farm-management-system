"""GET-only full-app check against retained V35 synthetic evidence, never seeds or dispatches."""
import json
import os
import shutil
from pathlib import Path
from urllib.parse import urlencode, urlparse
from datetime import datetime, timedelta, timezone
from playwright.sync_api import sync_playwright, expect

base = 'http://127.0.0.1:3000'
evidence = json.loads(Path('/tmp/irrigation-session-evidence.json').read_text())
completed = evidence['completed']
created = datetime.fromisoformat(completed['createdAt'].replace('Z', '+00:00'))
query = urlencode({'from': (created-timedelta(seconds=10)).isoformat(),
                   'to': datetime.now(timezone.utc).isoformat(), 'circuitId': 'PC1', 'condition': 'ALL'})

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
    page = browser.new_page(viewport={'width': 1600, 'height': 1200}, accept_downloads=True)
    writes, external, errors = [], [], []

    def guard(route):
        request = route.request
        if urlparse(request.url).netloc != '127.0.0.1:3000':
            external.append(request.url); route.abort(); return
        if '/api/' in request.url and request.method != 'GET':
            writes.append(request.url); route.abort(); return
        route.continue_()

    page.route('**/*', guard)
    page.on('pageerror', lambda error: errors.append(str(error)))

    def get(path):
        response = page.request.get(base+path)
        assert response.ok, (path, response.status)
        return response.json()

    listed = get('/api/v1/irrigation-session-history?'+query)
    assert len(listed['items']) == 2
    closed = next(x for x in listed['items'] if x['session']['sessionId'] == completed['sessionId'])
    assert closed['session'] == completed and closed['actionCount'] == 5
    detail = get('/api/v1/irrigation-session-history/PC1/'+completed['sessionId']+'/steps')
    assert detail['session'] == completed and len(detail['items']) == 5
    assert {x['operation']['action'] for x in detail['items']} == {'OPEN', 'ON', 'OFF', 'CLOSE', 'FINISH'}
    assert all(x['command'] is None for x in detail['items'] if x['operation']['action'] == 'FINISH')
    wrong = page.request.get(base+'/api/v1/irrigation-session-history/PC2/'+completed['sessionId']+'/steps')
    assert wrong.status == 404

    page.goto(base)
    page.get_by_role('button', name='IoT & Tự động hóa', exact=True).click()
    page.get_by_role('button', name='Điều khiển Actuator', exact=True).click()
    page.get_by_role('button', name='Cấu hình nhánh tưới', exact=True).click()
    page.get_by_role('button', name='Lịch sử phiên PC1', exact=True).click()
    page.get_by_label('Khoảng lịch sử phiên', exact=True).select_option('744')
    page.get_by_role('button', name='Đọc lịch sử phiên', exact=True).click()
    expect(page.get_by_role('button', name='Xem phiên '+completed['sessionId'], exact=True)).to_be_visible()
    with page.expect_download() as download:
        page.get_by_role('button', name='CSV phiên đã tải', exact=True).click()
    csv = Path(download.value.path()).read_text(encoding='utf-8-sig')
    assert completed['sessionId'] in csv and 'requestedDurationSeconds' in csv
    page.get_by_role('button', name='Xem phiên '+completed['sessionId'], exact=True).click()
    expect(page.get_by_text('Đã tải 5 bước, mới nhất trước.', exact=False)).to_be_visible()
    expect(page.get_by_role('alert')).to_have_count(0)
    with page.expect_download() as download:
        page.get_by_role('button', name='CSV bước đã tải', exact=True).click()
    csv = Path(download.value.path()).read_text(encoding='utf-8-sig')
    assert 'dispatchResultState' in csv and 'ledgerStateAtRead' in csv
    assert all(completed[key] in csv for key in ('openId', 'onId', 'offId', 'closeId'))
    page.screenshot(path='/tmp/session-history-full-app.png', full_page=True)
    page.get_by_label('Lọc nhánh phiên', exact=True).fill('PC2')
    page.get_by_role('button', name='Đọc lịch sử phiên', exact=True).click()
    expect(page.get_by_text('Chưa có phiên theo bộ lọc.', exact=True)).to_be_visible()
    expect(page.get_by_role('region', name='Chi tiết phiên tưới', exact=True)).to_have_count(0)
    assert not writes and not external and not errors, (writes, external, errors)
    browser.close()
print('PASS actual menu/session history/detail/two CSVs/wrong circuit; GET only, no external requests or page errors')
