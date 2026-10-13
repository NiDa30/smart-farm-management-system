"""Playwright UI control tests with intercepted API fixtures; no commands reach AWS."""
import json
import os
import shutil
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright, expect

mode='disabled'
posted=[]
history=[]
def route_api(route):
    stamp=datetime.now(timezone.utc)-timedelta(seconds=20 if mode=='stale' else 1)
    if route.request.method=='POST':
        value=route.request.post_data_json
        posted.append(value)
        history.append({'commandId':'ab6cfc5e-18ff-4a01-852b-03604df6b52f','action':value['action'],
            'durationSeconds':value.get('durationSeconds'),'issuedAt':stamp.isoformat(),'state':'SENT','reportedState':None,'errorCode':None})
        route.fulfill(status=202,content_type='application/json',body=json.dumps(history[-1]))
    elif route.request.url.endswith('/history'):
        route.fulfill(status=200,content_type='application/json',body=json.dumps([{'id':1,'observedAt':stamp.isoformat(),'reportedState':'OFF','safetyLockout':False,'changeType':'FIRST_STATUS','stateReason':'TIMER_EXPIRED'}]))
    elif route.request.url.endswith('/status'):
        value={'deviceId':'PUMP01','reportedState':'ON' if mode=='on' else 'OFF','safetyLockout':mode=='locked',
            'fresh':mode!='stale','controlEnabled':mode!='disabled','observedAt':stamp.isoformat()}
        route.fulfill(status=200,content_type='application/json',body=json.dumps(value))
    else:
        route.fulfill(status=200,content_type='application/json',body=json.dumps(history))
with sync_playwright() as p:
    executable=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    browser=p.chromium.launch(**({'executable_path':executable} if executable else {}))
    page=browser.new_page(viewport={'width':1360,'height':900})
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.route('**/api/v1/actuators/PUMP01/**',route_api)
    page.goto(os.environ.get('FRONTEND_URL','http://127.0.0.1:3000'))
    page.get_by_role('button',name='IoT & Tự động hóa').click()
    page.get_by_role('button',name='Điều khiển Actuator',exact=True).click()
    on=page.get_by_role('button',name='Bật đèn',exact=True)
    expect(on).to_be_disabled()
    mode='ready'
    page.get_by_role('button',name='Làm mới trạng thái').click()
    expect(page.get_by_text('Trạng thái đầu tiên',exact=True)).to_be_visible()
    expect(page.get_by_text('Hết thời gian hẹn',exact=True)).to_be_visible()
    expect(on).to_be_enabled()
    page.get_by_label('Thời gian hẹn tắt').fill('3601')
    expect(on).to_be_disabled()
    page.get_by_label('Thời gian hẹn tắt').fill('3')
    page.get_by_role('switch',name='Công tắc từ xa').click()
    expect(page.get_by_role('status')).to_have_text('Đang tắt') # no optimistic GPIO state
    expect(page.get_by_text('Đã gửi, chờ ACK',exact=True)).to_be_visible()
    expect(on).to_be_disabled()
    assert posted==[{'action':'ON','durationSeconds':3}],posted
    mode='on'; history[0]['state']='EXECUTED'; history[0]['reportedState']='ON'
    page.get_by_role('button',name='Làm mới trạng thái').click()
    expect(page.get_by_role('status')).to_have_text('Đang bật')
    expect(page.get_by_role('switch')).to_be_checked()
    page.get_by_role('switch').click()
    assert posted[-1]=={'action':'OFF'},posted
    mode='locked'
    page.get_by_role('button',name='Làm mới trạng thái').click()
    expect(page.get_by_role('status')).to_have_text('Đang tắt')
    expect(on).to_be_disabled()
    expect(page.get_by_role('button',name='Reset khóa')).to_be_enabled()
    mode='stale'
    page.get_by_role('button',name='Làm mới trạng thái').click()
    expect(page.get_by_role('status')).to_have_text('Chưa xác định')
    expect(on).to_be_disabled()
    history.clear(); mode='ready'
    page.get_by_role('button',name='Làm mới trạng thái').click()
    expect(on).to_be_enabled()
    page.get_by_label('Đơn vị thời gian').select_option('minutes')
    page.get_by_label('Thời gian hẹn tắt').fill('2')
    on.click()
    assert posted[-1]=={'action':'ON','durationSeconds':120},posted
    history.clear()
    page.get_by_role('button',name='Làm mới trạng thái').click()
    expect(on).to_be_enabled()
    page.get_by_label('Tự tắt sau thời gian cài đặt').uncheck()
    page.get_by_role('switch').click()
    assert posted[-1]=={'action':'ON','durationSeconds':3600},posted
    assert not errors,errors
    print('PASS fixture UI: disabled mode, duration bounds, SENT is not execution, ACK/status, lockout and stale gates; no AWS publish')
    browser.close()
