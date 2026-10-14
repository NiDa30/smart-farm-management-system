"""Full-app settings smoke. Only run against a dedicated test DB, MQTT/control disabled.

Phase save writes 25/40/12/120 and checks a second browser load.
Restart backend with the same test DB, then phase read verifies persistence.
No command/rule toggle is allowed. Does not claim AWS/GPIO acceptance.
"""
import argparse,os,shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['save','read'],required=True)
phase=parser.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');origin=urlparse(base).netloc
expected={'dryThreshold':25,'wetThreshold':40,'durationSeconds':12,'cooldownSeconds':120}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
    page=browser.new_page(viewport={'width':1280,'height':1100});errors=[];writes=[];forbidden=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    def guard(route):
        request=route.request;url=urlparse(request.url)
        if url.netloc!=origin:route.abort();return
        if '/api/' in url.path and request.method!='GET':
            if phase!='save' or request.method!='PUT' or url.path!='/api/v1/automation/watering/settings':
                forbidden.append(request.url);route.abort();return
            writes.append(request.post_data_json)
        route.continue_()
    page.route('**/*',guard)
    def open_settings():
        page.goto(base)
        page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click()
        page.get_by_role('button',name='Quy tắc Tự động hóa',exact=True).click()
        expect(page.get_by_role('status')).to_have_text('Quy tắc đang tắt')
    open_settings()
    if phase=='save':
        for label,value in [('Ngưỡng đất khô (%)',25),('Ngưỡng tắt sớm (%)',40),('Thời gian bật tự động (giây)',12),('Khoảng nghỉ sau OFF (giây)',120)]:
            page.get_by_label(label,exact=True).fill(str(value))
        expect(page.get_by_role('button',name='Bật quy tắc',exact=True)).to_be_disabled()
        page.get_by_role('button',name='Lưu cài đặt',exact=True).click()
        expect(page.get_by_text('Đã lưu cài đặt.',exact=True)).to_be_visible()
        assert len(writes)==1,writes
        open_settings()
    for label,value in [('Ngưỡng đất khô (%)','25'),('Ngưỡng tắt sớm (%)','40'),('Thời gian bật tự động (giây)','12'),('Khoảng nghỉ sau OFF (giây)','120')]:
        expect(page.get_by_label(label,exact=True)).to_have_value(value)
    result=page.request.get(base+'/api/v1/automation/watering/settings');assert result.ok
    actual=result.json();assert all(actual[k]==v for k,v in expected.items()),actual
    assert not forbidden,forbidden
    assert not errors,errors
    browser.close()
    print('PASS settings full-app '+phase+': menu/proxy/API/PostgreSQL, rule remains OFF; no MQTT/AWS commands')
