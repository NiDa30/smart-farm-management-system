"""Full-app acknowledgement smoke using dedicated alert_smoke test DB only.
Seed two open ENV01 incidents (LOW_SOIL/HIGH_TEMPERATURE), no commands/runs.
Run --phase save; restart backend with same schema; run --phase read.
MQTT/control must be disabled. This sends only the one acknowledgement PUT.
"""
import argparse,os,shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['save','read'],required=True)
phase=parser.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');origin=urlparse(base).netloc
note='Đã kiểm tra cảm biến mô phỏng.'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
    page=browser.new_page(viewport={'width':1360,'height':1100});errors=[];writes=[];forbidden=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    def guard(route):
        request=route.request;path=urlparse(request.url)
        if path.netloc!=origin:route.abort();return
        if '/api/' in path.path and request.method!='GET':
            if phase!='save' or request.method!='PUT' or not path.path.startswith('/api/v1/alerts/') or not path.path.endswith('/acknowledgement'):
                forbidden.append(request.url);route.abort();return
            writes.append(request.post_data_json)
        route.continue_()
    page.route('**/*',guard);page.goto(base)
    page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click()
    page.get_by_role('button',name='Trung tâm Cảnh báo',exact=True).click()
    expect(page.get_by_role('heading',name='Cảnh báo cảm biến',exact=True)).to_be_visible()
    response=page.request.get(base+'/api/v1/alerts');assert response.ok
    alert=next(a for a in response.json() if a['type']=='LOW_SOIL' and a['clearedAt'] is None)
    page.get_by_role('button',name=f"Chi tiết cảnh báo #{alert['id']}",exact=True).click()
    details=page.get_by_role('region',name='Xác nhận cảnh báo',exact=True)
    if phase=='save':
        page.get_by_label('Ghi chú khi xác nhận',exact=True).fill(note)
        details.get_by_role('button',name='Xác nhận đã xem',exact=True).click()
        expect(page.get_by_text('Đã lưu xác nhận đã xem.',exact=True)).to_be_visible()
        assert writes==[{'note':note}],writes
    expect(details).to_contain_text('Ghi chú đã lưu: '+note)
    expect(details).to_contain_text('Điều kiện cảm biến: Đang cảnh báo')
    page.get_by_role('button',name='Tổng quan IoT',exact=True).click()
    expect(page.get_by_role('article',name='Cảnh báo đang mở',exact=True)).to_contain_text('2')
    expect(page.get_by_text('Xác nhận đã xem cảnh báo',exact=False)).to_be_visible()
    page.get_by_role('button',name='Nhật ký sự kiện Event Log',exact=True).click()
    expect(page.get_by_text('Xác nhận đã xem cảnh báo',exact=True)).to_be_visible()
    expect(page.get_by_text('Đã xem cảnh báo',exact=True)).to_be_visible()
    page.screenshot(path='/tmp/alert-ack-event.png',full_page=True)
    assert not errors,errors
    assert not forbidden,forbidden
    browser.close();print('PASS acknowledgement '+phase+': full app/API/PostgreSQL, alert remains OPEN, dashboard count2, human acknowledgement event; no MQTT/control')
