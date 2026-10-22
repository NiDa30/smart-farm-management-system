"""GET-only journey over retained native-model cycle, never arms or replays a step."""
import json,os,shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base='http://127.0.0.1:3000';evidence=json.loads(Path('/tmp/irrigation-cycle-evidence.json').read_text());sid=evidence['session']['sessionId']
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
    page=browser.new_page(viewport={'width':1600,'height':1200});writes=[];external=[];errors=[]
    def guard(route):
        r=route.request
        if urlparse(r.url).netloc!='127.0.0.1:3000':external.append(r.url);route.abort();return
        if '/api/' in r.url and r.method!='GET':writes.append(r.url);route.abort();return
        route.continue_()
    page.route('**/*',guard);page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base)
    page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click();page.get_by_role('button',name='Điều khiển Actuator',exact=True).click();page.get_by_role('button',name='Cấu hình nhánh tưới',exact=True).click()
    page.get_by_role('button',name='Phiên tưới có xác nhận PC1',exact=True).click();page.get_by_role('button',name='Xem chu trình '+sid,exact=True).click()
    expect(page.get_by_label('Trạng thái chu trình')).to_have_text('Đã khép phiên với OFF/CLOSED xác nhận')
    expect(page.get_by_text('OPEN '+evidence['cycle']['cycle']['openId'],exact=False)).to_be_visible()
    expect(page.get_by_role('button',name='Duyệt chạy một phiên',exact=True)).to_be_disabled()
    expect(page.get_by_role('button',name='Yêu cầu OFF khẩn PUMP01',exact=True)).to_be_enabled()
    page.screenshot(path='/tmp/irrigation-cycle-full-app.png',full_page=True)
    page.get_by_role('button',name='Quay lại phiên tưới',exact=True).click();expect(page.get_by_role('heading',name='Phiên tưới PC1 có xác nhận',exact=True)).to_be_visible()
    assert not writes and not external and not errors,(writes,external,errors)
    browser.close()
print('PASS full app completed cycle/immutable IDs/no rearm/back navigation; zero API writes/external/pageerrors')
