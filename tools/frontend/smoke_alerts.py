"""Alert UI test fixtures: no AWS and no automatic actuation."""
import json, shutil
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright,expect
mode='ready'
def route_api(route):
    if mode=='error': route.fulfill(status=503,body='unavailable'); return
    stamp=datetime.now(timezone.utc).isoformat()
    value=[] if mode=='empty' else [
        {'id':1,'deviceId':'ENV01','type':'LOW_SOIL','openedAt':stamp,'openedValue':28,'clearedAt':None,'clearedValue':None},
        {'id':2,'deviceId':'ENV01','type':'HIGH_TEMPERATURE','openedAt':stamp,'openedValue':36,'clearedAt':stamp,'clearedValue':33}]
    route.fulfill(status=200,content_type='application/json',body=json.dumps(value))
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which('chromium'))
    page=browser.new_page()
    page.route('**/api/v1/alerts',route_api)
    page.goto('http://127.0.0.1:3000')
    page.get_by_role('button',name='IoT & Tự động hóa').click()
    page.get_by_role('button',name='Trung tâm Cảnh báo',exact=True).click()
    expect(page.locator('article')).to_have_count(2)
    page.get_by_label('Lọc').select_option('active')
    expect(page.locator('article')).to_have_count(1)
    expect(page.locator('article')).to_contain_text('Độ ẩm đất thấp')
    page.get_by_label('Lọc').select_option('cleared')
    expect(page.locator('article')).to_contain_text('Nhiệt độ cao')
    mode='empty'; page.get_by_role('button',name='Làm mới').click()
    expect(page.get_by_text('Chưa có cảnh báo trong bộ lọc này.')).to_be_visible()
    mode='error'; page.get_by_role('button',name='Làm mới').click()
    expect(page.get_by_role('alert')).to_be_visible()
    browser.close()
    print('PASS alerts: active/cleared, filter, empty and error; fixtures only')
