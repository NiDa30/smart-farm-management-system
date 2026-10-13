"""Read-only history UI fixtures; no AWS operations."""
import json, shutil
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright, expect
mode='ready'
requests=[]
def handler(route):
    path=route.request.url
    if '/areas' in path: value=[{'id':'AREA001','name':'Khu A'}]
    elif '/sensors' in path: value=[{'deviceId':'ENV01','name':'Sensor A','areaId':'AREA001','sensorType':'ENVIRONMENT','latest':None}]
    else:
        requests.append(path)
        if mode=='error':
            route.fulfill(status=503,body='unavailable'); return
        value=[]
        if mode=='ready':
            for i in range(3):
                stamp=(datetime.now(timezone.utc)-timedelta(seconds=30-i*5)).isoformat()
                value.append({'id':i+1,'farmId':'FARM001','receivedAt':stamp,'telemetry':{'schemaVersion':1,'deviceId':'ENV01','bootId':'ab6cfc5e-18ff-4a01-852b-03604df6b52f','sequence':i,'timestamp':stamp,'temperature':24+i,'humidity':40,'soilMoisture':55,'uptimeMs':i*5000}})
    route.fulfill(status=200,content_type='application/json',body=json.dumps(value))
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which('chromium'))
    page=browser.new_page()
    page.route('**/api/v1/**',handler)
    page.goto('http://127.0.0.1:3000')
    page.get_by_role('button',name='IoT & Tự động hóa').click()
    page.get_by_role('button',name='Lịch sử & So sánh',exact=True).click()
    expect(page.get_by_role('img',name='Biểu đồ Nhiệt độ (°C)',exact=True)).to_be_visible()
    expect(page.get_by_text('3 mẫu',exact=False)).to_be_visible()
    assert 'from=' in requests[-1] and 'limit=1000' in requests[-1]
    with page.expect_download() as info: page.get_by_role('button',name='Xuất CSV').click()
    download=info.value
    assert download.suggested_filename=='ENV01-1h.csv'
    text=open(download.path(),encoding='utf-8-sig').read()
    assert 'temperature,humidity,soilMoisture' in text and len(text.splitlines())==4
    mode='empty'
    page.get_by_label('Khoảng thời gian').select_option('24')
    expect(page.get_by_text('Chưa có dữ liệu trong khoảng đã chọn.')).to_be_visible()
    expect(page.get_by_role('button',name='Xuất CSV')).to_be_disabled()
    mode='error'
    page.get_by_role('button',name='Làm mới',exact=True).click()
    expect(page.get_by_role('alert')).to_be_visible()
    expect(page.get_by_role('img')).to_have_count(0)
    browser.close()
    print('PASS history: real API shape, range query, chart, CSV, empty and failed response; fixtures only')
