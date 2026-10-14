"""Full-app dashboard smoke with real API and a dedicated seeded test schema.
Seed: ENV01 temp25/soil28, one active alert; PUMP01 stale ON. MQTT disabled.
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
    page.get_by_role('button',name='Tổng quan IoT',exact=True).click()
    expect(page.get_by_role('heading',name='Tổng quan IoT',exact=True)).to_be_visible()
    expect(page.get_by_text('MQTT backend chưa bật',exact=True)).to_be_visible()
    expect(page.get_by_role('article',name='Cảm biến đã đăng ký',exact=True)).to_contain_text('1')
    expect(page.get_by_role('article',name='Cảnh báo đang mở',exact=True)).to_contain_text('1')
    expect(page.get_by_role('region',name='Relay PUMP01',exact=True)).to_contain_text('Trạng thái: Chưa xác định')
    page.get_by_role('button',name='Mở giám sát',exact=True).click()
    expect(page.get_by_role('heading',name='Giám sát thiết bị',exact=True)).to_be_visible()
    page.get_by_role('button',name='Tổng quan IoT',exact=True).click()
    page.get_by_role('button',name='Mở cảnh báo',exact=True).click()
    expect(page.get_by_role('heading',name='Cảnh báo cảm biến',exact=True)).to_be_visible()
    assert not errors,errors
    assert not writes,writes
    browser.close();print('PASS dashboard full app: menu -> overview -> monitoring/alerts, real API/PostgreSQL; MQTT/control disabled, no AWS')
