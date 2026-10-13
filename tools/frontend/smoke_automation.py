"""Automation UI fixtures; no MQTT dispatch."""
import json,shutil
from playwright.sync_api import sync_playwright,expect
state={'enabled':False,'lowCount':0,'activeCommand':None,'cooldownUntil':None,'lastResult':'DISABLED'}
changes=[]
def handler(route):
    if route.request.method=='PUT':
        value=route.request.post_data_json;changes.append(value);state['enabled']=value['enabled']
    value=[] if route.request.url.endswith('/runs') else state
    route.fulfill(status=200,content_type='application/json',body=json.dumps(value))
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which('chromium'))
    page=browser.new_page();page.route('**/api/v1/automation/watering**',handler)
    page.goto('http://127.0.0.1:3000')
    page.get_by_role('button',name='IoT & Tự động hóa').click()
    page.get_by_role('button',name='Quy tắc Tự động hóa',exact=True).click()
    expect(page.get_by_role('status')).to_have_text('Quy tắc đang tắt')
    page.get_by_role('button',name='Bật quy tắc',exact=True).click()
    expect(page.get_by_role('status')).to_have_text('Quy tắc đang bật')
    page.get_by_role('button',name='Tắt quy tắc',exact=True).click()
    expect(page.get_by_role('status')).to_have_text('Quy tắc đang tắt')
    assert changes==[{'enabled':True},{'enabled':False}],changes
    browser.close();print('PASS automation: initial disabled, enable/disable API and confirmed status; fixtures only')
