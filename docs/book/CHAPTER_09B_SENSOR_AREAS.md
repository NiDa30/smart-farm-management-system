# Chương 9B — Nhiều sensor theo khu vực

## Yêu cầu mở rộng

Sau khi xem được ENV01, người dùng muốn theo dõi nhiệt độ từng khu vực và thêm
sensor trên giao diện. Một khu vực có thể có nhiều sensor. Ta hiển thị reading
của từng sensor, không tự tính một giá trị đại diện cho cả khu vực khi chưa có
quy tắc tổng hợp hoặc hiệu chuẩn.

Registry gồm sensor_area (mã/tên khu vực) và sensor_device (deviceId, tên,
khu vực, loại). Bản này là một farm FARM001 và sensor môi trường cùng hợp đồng
v1 gồm nhiệt độ, độ ẩm không khí và độ ẩm đất. Chưa hỗ trợ sensor chỉ đo một
chỉ số, chỉnh sửa/chuyển khu vực/xóa sensor hoặc quản lý nhiều farm. Registry
này ở backend thật; chưa đồng bộ với danh sách khu vực mock ở các màn hình cũ.

## Giữ dữ liệu cũ khi mở rộng database

Migration V2 tạo registry và seed ENV01 vào AREA001 “Khu vực mặc định”. Bỏ
CHECK device_id='ENV01' và thêm foreign key telemetry(farmId,deviceId) đến
registry. Không sửa V1 đã chạy, không xóa bảng/volume hoặc yêu cầu tạo lại
password. Unique(deviceId,bootId,sequence) vẫn giữ chống trùng, nhưng hai sensor
có cùng bootId/sequence vẫn được lưu riêng theo deviceId.

API cho phép GET/POST areas và sensors, GET metadata theo mã và latest/history
của sensor đã đăng ký. Sensor mới có latest=null và latest endpoint trả 404 cho đến
khi nhận reading hợp lệ. Mã uppercase2–32 ký tự, bắt đầu bằng chữ; tên1–80
ký tự. Duplicate trả 409, khu vực không tồn tại/mã sai trả 400.

Danh sách sensor đọc latest bằng một SQL lateral join để tránh request/query
riêng cho từng thiết bị. UI lọc khu vực và chọn sensor; panel chi tiết được
remount theo deviceId để không giữ số đo của sensor trước trong card mới.
Polling/freshness và trạng thái mất kết nối giữ nguyên nguyên tắc chương9.

## Topic và quyền AWS

Backend subscribe `smartfarm/FARM001/+/telemetry`. Trong IAM resource,
`topicfilter/.../+/telemetry` cho phép đúng subscription có ký tự+; còn Receive
cần IAM wildcard `topic/.../*/telemetry`. Không coi+ trong ARN là IAM wildcard.
Policy runtime cũ chỉ cho exact ENV01 sẽ không đủ cho subscription mới.

MQTT payload phải có deviceId hợp lệ; backend so sánh topic với chính deviceId
và tra registry. Thiết bị chưa đăng ký hoặc topic khác farm/device bị từ chối.
Foreign key là bảo vệ thêm ở DB. Payload không quyết định khu vực: registry
quyết định. Hợp đồng telemetry.schema.json mở deviceId từ const ENV01 sang pattern,
giữ các trường/phiên bản/giới hạn số còn lại, tương thích payloadENV01 cũ.

Thêm sensor trên web **chỉ đăng ký metadata**, không tạo AWS Thing/certificate
hoặc nhập private key trong browser. Mỗi thiết bị thực phải có certificate và
IoT policy giới hạn client/topic đúng mã của nó. Provisioning script hiện vẫn
chỉ cấu hình ENV01; không chạy lại script đó để giả vờ tạo ENV02. Việc provisioning
thiết bị thứ hai sẽ là bước riêng, cần outputdir/certificate riêng và kiểm chứng.
Mỗi thiết bị kết nối/gửi tin làm tăng usage AWS; tiếp tục theo dõi Budget.

## Cập nhật Windows

Dừng backend cũ bằng Ctrl+C, giữ PostgreSQL/volume. Cập nhật code và render
policy local (thay ACCOUNT_ID bằng account thực, không cần secret):

```bash
git pull --ff-only origin feat/day1-iot-foundation
./.local/day1-venv/Scripts/python.exe tools/backend/render_telemetry_iam.py --account-id ACCOUNT_ID
notepad .local/aws/backend-telemetry-iam-policy.json
```

IAM → Users → smartfarm-dev → Permissions → SmartFarmBackendRuntime → Edit →
JSON: thay bằng file vừa render và lưu. Không thay provisioning policy, không
sửa certificate policy ENV01 để mở wildcard cho mọi thiết bị. Nếu inline policy
quota không đủ, dùng customer managed policy cùng scope; không thêm AdministratorAccess.
Policy này cho backend ingest/echo, không cấp actuator command.

Đợi IAM có hiệu lực rồi chạy:

```bash
bash tools/backend/run_backend_windows.sh
```

Migration V2 tự chạy lúc startup. Nếu bị AccessDenied ở subscribe, kiểm tra
runtime policy đã có đúng filter+ và Receive wildcard*, không xóa database để
chữa lỗi IAM. Frontend restart sau pull nếu cần; mở Sensor Realtime → Thêm khu
vực → Thêm sensor. Với sensor chưa provision, “Chưa có dữ liệu” là đúng trạng
thái. Không giả lập bằng browser publish trong luồng live.

## Kiểm chứng

Cloud: PostgreSQL thật, tests migration V1→V2 giữ reading cũ; đăng ký khu vực,
sensor, unknown-area/duplicate validation; ENV01/ENV02 giữ reading riêng;
unregistered/topic mismatch/cross-farm bị từ chối. Java suite 10 tests đạt sau
mở rộng. Node 3 tests và Python 10 tests đạt; lint/build đạt với warning baseline.

Chromium dùng API/PostgreSQL thật trong schema frontend_registry_test: tạo khu
vực và sensor qua form, pending, filter, reading riêng (fixtureSQL), switch về
ENV01 không lẫn số, duplicate error; không page errors. Dữ liệu thử được tạo
riêng, không chứng minh ENV02 đã gửi từ Wokwi/AWS. Browser freshness/error smoke
cũng được cập nhật cho registry và chạy lại đạt. Test locator phải scope vào
panelhistory vì trang nay có thêm tablesensor; chỉnh harness phù hợp, không
bỏ assertion. Cần người dùng kiểm tra migration/UI/runtime policy trên Windows
và provisioning sensor thứ hai trước khi claim multi-device live.
