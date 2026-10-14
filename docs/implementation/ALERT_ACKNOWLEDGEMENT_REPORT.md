# Bàn giao xác nhận đã xem cảnh báo — 14/10/2026

Nền 1138a75, feature branch. Thêm xác nhận đã xem cùng ghi chú, độc lập với điều
kiện cảm biến. Không sửa firmware/IAM/control/rule hoặc ngưỡng cảnh báo. Không
đọc secrets, chạy provisioning, gửi AWS command/email hoặc dùng actor giả từ
AppContext/topbar. Chưa có backend authentication; metadata không chứng minh
người nào thao tác.

## File và hành vi

- V12__alert_acknowledgement.sql thêm acknowledged_at và note nullable <=500,
  note chỉ tồn tại nếu có timestamp. Không backfill metadata cũ.
- SensorAlerts.Alert thêm hai trường; mapAlert dùng chung với IoTOverview.
  List100 ưu tiên active rồi unseen, GET theo ID không bị giới hạn danh sách.
- PUT /api/v1/alerts/{id}/acknowledgement body {note}: khóa row, trim note,
  chỉ xác nhận mới khi còn active. Retry cùng note giữ first timestamp/note,
  kể cả sau clear; note khác409. Missing404, invalid400. Transaction bảo vệ
  tranh chấp với tab khác và cập nhật clear từ telemetry.
- SensorAlertController dùng JsonNode cho trường note bên trong request record
  để không nhận numeric-to-string coercion; unknown properties vẫn bị từ chối.
- EventLog thêm alert-seen:<id>, ALERT_ACKNOWLEDGED/ACKNOWLEDGED, thời gian backend,
  sourceAt/commandId/runId null. Prefix cursor mới được validate. Không đưa note
  hoặc actor giả vào event. UI Event Log và Dashboard hiển thị nhãn người xem.
- AlertAcknowledgement/alertApi/IoTAlertCenter: chi tiết độc lập list100, note
  500 ký tự, filter điều kiện/xác nhận riêng, khóa khi mất API/đang lưu, giữ draft.
  Response PUT phải đúng id, thời điểm ACK và note đã gửi mới báo thành công.
  Unknown response/5xx/body sai không tự retry; cần GET theo ID đối chiếu.
  Response cũ không rollback kết quả PUT. Bản khác ghi trước không bị overwrite.
- Không có edit/unack/delete note. Clear/recur do mẫu cảm biến như trước; incident
  mới chưa được ACK. Dashboard/monitoring active counts không giảm vì ACK.
- Thêm test:alerts port4182, không dependency/lockfile mới. Chương19 và hồ sơ
  nhật ký/runbook/acceptance/chương12 được cập nhật; không sửa báo cáo lịch sử.

## Kết quả cuối

| Kiểm tra | Kết quả |
|---|---|
| Maven verify toàn bộ backend | 88/88, failure/error/skip=0 |
| AlertAcknowledgementTest trong tổng trên | 10 API/DB/concurrency/migration cases |
| npm run test:alerts | 9/9 Chromium API fixtures |
| npm run test:events | 8/8, có nhãn ACK người xem khác ACK thiết bị |
| npm run test:dashboard | 8/8, count active không đổi và chấp nhận event mới |
| Node alert/safety/settings/overview/monitoring/telemetry | 17/17, không skip |
| npm run lint/build | Đạt |
| smoke_alert_acknowledgement.py save/read sau restart | Đạt App/menu/proxy/API/PostgreSQL thật, không MQTT/control |
| Đối chiếu SQL trước/sau restart | Timestamp/note/cleared_at giống hệt; LOW_SOIL vẫn active |
| git diff --check và liên kết tài liệu | Đạt |

Tests API: ACK không clear hoặc giảm active count; retry cùng payload; khác note
409; clear trước ACK409/missing404/invalid400; blank note; hysteresis/tái phát
mới; hai request đồng thời; cursor event ACK/open; GET ngoài100 + reader mới;
V11 → V12 giữ incident và cấu hình tưới. Các tests transport/firmware trước đó
nằm trong regression backend nhưng không biến đợt này thành phép thử AWS live.

Browser: save chờ response; draft qua polling/limit; lost response + detail ra
khỏi list; tab khác; clear khi đang thao tác; bad body/5xx; API lỗi/phục hồi và
note hiển thị text chống HTML execution; stale GET không rollback PUT. Không
thêm suite browser control/automation vì source của chúng không đổi.

Lỗi ban đầu: numeric note123 trả200 do String coercion; đã sửa kiểm tra kiểu
JSON, rerun88 đạt. Hai browser assertions ban đầu không khớp label/ordertext;
thêm aria-label và sửa selector theo DOM thật, rerun cả suites liên quan đạt.
Không skip/giảm assertion để che thất bại. Cảnh báo Vite __dirname/bundle lớn
vẫn còn, không làm fail build.

Môi trường: JDK21/Maven wrapper, PostgreSQL smartfarm-cloud-test loopback55439,
user/database smartfarm_test. Integration telemetry_test; smoke alert_smoke;
không chạm DB demo5433. Smoke seed hai incident ENV01 active LOW_SOIL28 và
HIGH_TEMPERATURE36; note mô phỏng, không dữ liệu AWS thật. Backend8080 và
Vite3000, MQTT/control=false. Guard chỉ cho một PUT acknowledgement trong save,
phase read chỉ GET. Không pageerror hoặc command dispatch. Timestamp/note/clear
được SQL so sánh sau restart; chưa thử DB process restart hoặc Windows live.

Lệnh mới: `CHROMIUM_PATH=/usr/bin/chromium npm run test:alerts`.
Smoke có seed assumptions trong docstring; không chạy trên demo tùy ý.

## Windows

1. Dừng backend; `git pull --ff-only origin feat/day1-iot-foundation`.
2. Mở Git Bash mới, giữ database demo, tránh biến DB test.
3. Chạy backend với chế độ demo đã dùng:
   `SMARTFARM_CONTROL_ENABLED=true bash tools/backend/run_backend_windows.sh`.
4. Flyway tự thêm V12, không xóa volume. Refresh frontend → Trung tâm Cảnh báo
   → Chi tiết → ghi chú tùy chọn → Xác nhận đã xem. Cảnh báo vẫn đang active.
5. Xem Event Log, refresh/restart đối chiếu metadata. Nếu PUT mất response,
   chọn Đối chiếu trạng thái trước; không tự gửi lại để đoán kết quả.
6. Chỉ số cảm biến trở về ngưỡng mới đóng incident. Lần bất thường sau tạo
   incident mới chưa xem. Không cần đổi IAM hoặc build firmware.

Ghi chú đầu tiên được giữ nguyên, không có thao tác sửa/xóa hoặc gán actor.
List/filter chỉ100; detail GET ngoài100 để đối chiếu. Chưa auth/tenant scope
hoàn chỉnh, email, immutable audit hoặc AWS/Wokwi nghiệm thu mới. Cấu hình
cloud start_skill cập nhật API/tests/V12 ở dạng draft, chưa publish môi trường.
