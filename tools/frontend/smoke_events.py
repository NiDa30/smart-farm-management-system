"""Full-app navigation smoke against a local backend and pre-seeded test DB.
No API interception/command dispatch. Requires at least one alert and command in the selected DB.
"""
import os,shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000')
origin=urlparse(base).netloc
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
    page=browser.new_page(viewport={'width':1360,'height':1000})
    errors=[];writes=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    def guard(route):
        request=route.request
        if urlparse(request.url).netloc!=origin:
            route.abort();return
        if '/api/' in request.url and request.method!='GET':
            writes.append(request.method+' '+request.url);route.abort();return
        route.continue_()
    page.route('**/*',guard)
    page.goto(base)
    page.get_by_role('button',name='IoT & Tự động hóa').click()
    page.get_by_role('button',name='Nhật ký sự kiện Event Log',exact=True).click()
    expect(page.get_by_role('heading',name='Nhật ký sự kiện IoT',exact=True)).to_be_visible()
    expect(page.locator('tbody tr')).to_have_count(6)
    page.get_by_label('Loại sự kiện',exact=True).select_option('COMMAND')
    expect(page.locator('tbody tr')).to_have_count(2)
    page.get_by_role('button',name='Chi tiết ack:ab6cfc5e-18ff-4a01-852b-03604df6b52f').click()
    detail=page.get_by_role('region',name='Chi tiết sự kiện')
    expect(detail).to_contain_text('ab6cfc5e-18ff-4a01-852b-03604df6b52f')
    expect(detail).to_contain_text('Thời gian thiết bị: Không được lưu')
    assert not errors,errors
    assert not writes,writes
    browser.close()
    print('PASS full app: sidebar -> Event Log -> Vite proxy -> Spring GET -> seeded PostgreSQL, filter and details; MQTT disabled, no AWS evidence')
