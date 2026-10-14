"""Full application smoke with real read-only API and dedicated monitoring seed DB.
Fixture assumptions: ENV01 soil28 and one open alert, PUMP01 stale ON/locked.
Never run this expecting arbitrary production/demo data to match the fixture.
"""
import os,shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');origin=urlparse(base).netloc
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
    page=browser.new_page(viewport={'width':1360,'height':1000});errors=[];writes=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    def guard(route):
        request=route.request
        if urlparse(request.url).netloc!=origin:route.abort();return
        if '/api/' in request.url and request.method!='GET':writes.append(request.url);route.abort();return
        route.continue_()
    page.route('**/*',guard);page.goto(base)
    page.get_by_role('button',name='IoT & Tự động hóa').click()
    page.get_by_role('button',name='Giám sát thiết bị',exact=True).click()
    expect(page.locator('tbody tr')).to_have_count(2)
    expect(page.get_by_role('status')).to_have_text('Backend chưa bật MQTT')
    page.get_by_role('button',name='Chi tiết ENV01',exact=True).click()
    detail=page.get_by_role('region',name='Chi tiết thiết bị')
    expect(detail).to_contain_text('Đất: 28%');expect(detail).to_contain_text('Cảnh báo đang mở: 1')
    page.get_by_label('Loại thiết bị',exact=True).select_option('ACTUATOR')
    expect(page.locator('tbody tr')).to_have_count(1)
    page.get_by_role('button',name='Chi tiết PUMP01',exact=True).click()
    expect(detail).to_contain_text('Trạng thái relay: Chưa xác định')
    expect(detail).to_contain_text('Lần báo trước: ON')
    assert not errors,errors
    assert not writes,writes
    browser.close();print('PASS monitoring full app: menu, real Vite/API/PostgreSQL, filters, alerts and stale relay; MQTT disabled')
