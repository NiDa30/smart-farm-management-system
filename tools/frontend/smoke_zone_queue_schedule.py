"""GET-only full app journey over the retained scheduler fixture. Never save or run a queue item."""
import os,shutil,json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
base='http://127.0.0.1:3000'
evidence=json.loads(Path('/tmp/zone-schedule-evidence.json').read_text())
request=evidence['observed']['occurrences'][0]['requestId']
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
    page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click()
    page.get_by_role('button',name='Sensor Realtime',exact=True).click()
    page.get_by_role('button',name='Node & trạm nước',exact=True).click()
    page.get_by_role('button',name='Vùng tưới',exact=True).click()
    page.get_by_role('button',name='Lịch tưới SCZONE',exact=True).click()
    expect(page.get_by_role('heading',name='Lịch tưới theo vùng SCZONE',exact=True)).to_be_visible()
    expect(page.get_by_label('Bật lịch tạo lượt chờ',exact=True)).not_to_be_checked()
    expect(page.get_by_text('Mã lượt chờ: '+request,exact=False)).to_be_visible()
    expect(page.get_by_text('Backend lập lịch: Đang tắt cấu hình',exact=False)).to_be_visible()
    page.screenshot(path='/tmp/zone-schedule-full-app.png',full_page=True)
    page.get_by_role('button',name='Mở hàng chờ tưới',exact=True).click()
    expect(page.get_by_text(request,exact=False).first).to_be_visible()
    assert not writes and not external and not errors,(writes,external,errors)
    browser.close()
print('PASS full app zone schedule -> retained linked queue item; zero writes/external/pageerrors')
