"""Full-app calendar smoke; dedicated calendar_smoke DB schema only.
No seed measurements/status. Backend MQTT/control must be disabled.
Run --phase save, restart backend with same schema, then --phase read.
Only one calendar PUT is allowed; never enable the rule or send commands.
"""
import argparse,os,shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
parser=argparse.ArgumentParser();parser.add_argument('--phase',choices=['save','read'],required=True)
phase=parser.parse_args().phase
base=os.environ.get('FRONTEND_URL','http://127.0.0.1:3000');origin=urlparse(base).netloc
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
    page=browser.new_page(viewport={'width':1380,'height':1200},timezone_id='America/New_York');errors=[];writes=[];forbidden=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    def guard(route):
        request=route.request;url=urlparse(request.url)
        if url.netloc!=origin:route.abort();return
        if '/api/' in url.path and request.method!='GET':
            if phase!='save' or request.method!='PUT' or url.path!='/api/v1/automation/watering/calendar':
                forbidden.append(request.url);route.abort();return
            writes.append(request.post_data_json)
        route.continue_()
    page.route('**/*',guard);page.goto(base)
    page.get_by_role('button',name='IoT & Tự động hóa',exact=True).click()
    page.get_by_role('button',name='Quy tắc Tự động hóa',exact=True).click()
    expect(page.get_by_role('status')).to_have_text('Quy tắc đang tắt')
    if phase=='save':
        page.get_by_label('Chế độ lịch tưới',exact=True).select_option('TIME_WINDOWS')
        for day in ['Thứ 3','Thứ 5','Thứ 7','Chủ nhật']:
            page.get_by_label(f'{day}, khung 1',exact=True).uncheck()
        page.get_by_label('Giờ bắt đầu khung 1',exact=True).fill('05:30')
        page.get_by_label('Giờ kết thúc khung 1',exact=True).fill('05:45')
        expect(page.get_by_role('button',name='Bật quy tắc',exact=True)).to_be_disabled()
        page.get_by_role('button',name='Lưu lịch tưới',exact=True).click()
        expect(page.get_by_text('Đã lưu lịch tưới.',exact=True)).to_be_visible()
        assert len(writes)==1,writes
    expect(page.get_by_label('Chế độ lịch tưới',exact=True)).to_have_value('TIME_WINDOWS')
    expect(page.get_by_label('Giờ bắt đầu khung 1',exact=True)).to_have_value('05:30')
    expect(page.get_by_label('Giờ kết thúc khung 1',exact=True)).to_have_value('05:45')
    for day,checked in [('Thứ 2',True),('Thứ 3',False),('Thứ 4',True),('Thứ 6',True),('Chủ nhật',False)]:
        assert page.get_by_label(f'{day}, khung 1',exact=True).is_checked()==checked
    response=page.request.get(base+'/api/v1/automation/watering/calendar');assert response.ok
    settings=response.json()['settings']
    assert settings['mode']=='TIME_WINDOWS' and settings['zone']=='Asia/Ho_Chi_Minh'
    assert settings['windows']==[{'days':[1,3,5],'startTime':'05:30','endTime':'05:45'}],settings
    assert page.request.get(base+'/api/v1/automation/watering').json()['enabled'] is False
    assert page.request.get(base+'/api/v1/monitoring').json()['mqtt']['state']=='DISABLED'
    assert page.request.get(base+'/api/v1/actuators/PUMP01/status').json()['controlEnabled'] is False
    page.get_by_role('region',name='Lịch tưới theo tuần',exact=True).screenshot(path='/tmp/irrigation-calendar.png')
    assert not errors,errors
    assert not forbidden,forbidden
    browser.close();print('PASS irrigation calendar '+phase+': full App/API/PostgreSQL, Mon/Wed/Fri 05:30-05:45 Vietnam; rule/MQTT/control disabled, no commands')
