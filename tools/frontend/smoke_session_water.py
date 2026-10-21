"""GET-only full app check of retained synthetic station report. No reseed or commands."""
import os, shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect
base = 'http://127.0.0.1:3000'
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
    page = browser.new_page(viewport={'width':1600,'height':1200}, accept_downloads=True)
    writes, external, errors = [], [], []
    def guard(route):
        r = route.request
        if urlparse(r.url).netloc != '127.0.0.1:3000':
            external.append(r.url); route.abort(); return
        if '/api/' in r.url and r.method != 'GET':
            writes.append(r.url); route.abort(); return
        route.continue_()
    page.route('**/*', guard)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(base)
    page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click()
    page.get_by_role('button',name='Điều khiển Actuator',exact=True).click()
    page.get_by_role('button',name='Cấu hình nhánh tưới',exact=True).click()
    page.get_by_role('button',name='Lịch sử mọi phiên tưới',exact=True).click()
    page.get_by_label('Lọc nhánh phiên',exact=True).fill('SW1')
    page.get_by_role('button',name='Đọc lịch sử phiên',exact=True).click()
    page.get_by_role('button',name='Xem phiên ',exact=False).click()
    page.get_by_role('button',name='Đọc lượng nước phiên',exact=True).click()
    panel = page.get_by_role('region',name='Lượng nước theo phiên',exact=True)
    expect(panel.get_by_text('0,5 lít',exact=True)).to_be_visible()
    expect(panel).to_contain_text('chưa được phủ 5 giây')
    expect(panel).to_contain_text('Nguồn mô phỏng')
    with page.expect_download() as info:
        page.get_by_role('button',name='CSV lượng nước phiên',exact=True).click()
    text = open(info.value.path(), encoding='utf-8-sig').read()
    assert 'STATION_FLOW_NOT_BED_ALLOCATION' in text and 'uncoveredSeconds' in text and 'SIMULATOR' in text
    page.screenshot(path='/tmp/session-water-full-app.png',full_page=True)
    assert not writes and not external and not errors, (writes,external,errors)
    browser.close()
print('PASS full app history -> station estimate/partial coverage/CSV; zero API writes/external/pageerrors')
