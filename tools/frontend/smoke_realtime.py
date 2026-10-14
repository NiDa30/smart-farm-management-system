"""Optional Playwright smoke using API fixtures, not live AWS telemetry."""
import json
import os
from pathlib import Path
import shutil
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright, expect

phase = 'fresh'
def reading():
    stamp = datetime.now(timezone.utc) - timedelta(seconds=90 if phase == 'stale' else 3)
    return {'id':5, 'farmId':'FARM001','receivedAt':stamp.isoformat(), 'telemetry':{
        'schemaVersion':1,'deviceId':'ENV01','bootId':'ab6cfc5e-18ff-4a01-852b-03604df6b52f',
        'sequence':15,'timestamp':stamp.isoformat(),'temperature':24,'humidity':40,
        'soilMoisture':100,'uptimeMs':64419}}
def respond(route):
    if route.request.url.endswith('/areas'):
        route.fulfill(status=200, content_type='application/json', body=json.dumps([{'id':'AREA001','name':'Khu mặc định'}]))
        return
    if route.request.url.endswith('/sensors'):
        route.fulfill(status=200, content_type='application/json', body=json.dumps([{'deviceId':'ENV01','name':'Sensor ENV01','areaId':'AREA001','sensorType':'ENVIRONMENT','latest':None if phase=='empty' else reading()}]))
        return
    if phase == 'error':
        route.fulfill(status=503, content_type='application/json', body='{}')
    elif phase == 'empty':
        route.fulfill(status=404 if route.request.url.endswith('/latest') else 200,
                      content_type='application/json', body='{}' if route.request.url.endswith('/latest') else '[]')
    elif phase == 'invalid':
        value = reading()
        value['telemetry']['humidity'] = 'bad'
        route.fulfill(status=200, content_type='application/json', body=json.dumps(value if route.request.url.endswith('/latest') else [value]))
    else:
        value = reading()
        route.fulfill(status=200, content_type='application/json', body=json.dumps(value if route.request.url.endswith('/latest') else [value,value]))

with sync_playwright() as p:
    executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    browser = p.chromium.launch(**({'executable_path': executable} if executable else {}))
    page = browser.new_page(viewport={'width':1360,'height':900})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/api/v1/**', respond)
    page.goto(os.environ.get('FRONTEND_URL', 'http://127.0.0.1:3000'))
    page.get_by_role('button', name='IoT & Tự động hóa').click()
    page.get_by_role('button', name='Sensor Realtime', exact=True).click()
    expect(page.get_by_role('status')).to_have_text('Dữ liệu mới')
    expect(page.get_by_test_id('Nhiệt độ')).to_have_text('24')
    expect(page.get_by_test_id('Độ ẩm đất')).to_have_text('100')
    expect(page.get_by_test_id('sensor-detail').locator('tbody tr')).to_have_count(1)
    for next_phase, label in [('stale','Dữ liệu đã cũ'),('error','Không kết nối được backend'),('invalid','Không kết nối được backend'),('empty','Chưa có reading'),('fresh','Dữ liệu mới')]:
        phase = next_phase
        page.get_by_role('button', name='Làm mới').click()
        expect(page.get_by_role('button', name='Làm mới')).to_be_enabled()
        expect(page.get_by_role('status')).to_have_text(label)
        if phase == 'error':
            expect(page.get_by_test_id('Nhiệt độ')).to_have_text('24')
    output = Path('.local/frontend-smoke.png')
    output.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(output), full_page=True)
    assert not errors, errors
    print('Browser PASS: fresh, stale, API error with cached value, invalid payload, empty, recovery, deduplicated history; no page errors')
    browser.close()
