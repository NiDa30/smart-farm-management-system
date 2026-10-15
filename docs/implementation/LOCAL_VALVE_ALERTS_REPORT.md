# Bàn giao V28 — đợt lỗi van và controller

15/10/2026 (Asia/Ho_Chi_Minh), feat/day1-iot-foundation.

Sau monitor V27, thêm đợt POSITION_FAULT/DEVICE_FAULT cho đúng van02–99 ở
nhánh SIMULATOR. Một packet mới hợp lệ mở lỗi; hai packet khỏe mới liên tiếp
cùng boot/sequence+1, giờ đo tăng và gap đo/nhận <=15giây mới phục hồi. Lỗi vị
trí cần CLOSED độc lập không fault; DEVICE_FAULT chỉ kết thúc điều kiện thiết
bị đã báo, không chứng minh van sẵn sàng. Mất packet/UNKNOWN/ACK/config mới
không đóng đợt cũ. Restart ngắt đếm khỏe dở nhưng giữ lịch sử và ghi chú.

V28 thêm bảng đợt và cursor, không backfill dữ liệu V27 cũ; receiver lưu
status/boot/episode cùng transaction. Snapshot nhánh và bằng chứng mở bất
biến. Mapping đổi ghi CONFIG_CHANGED, monitor tắt ghi MONITOR_DISABLED; chưa
có thao tác đóng thủ công đợt cấu hình cũ. Chưa quét episode OFFLINE hoặc gom
fault demo01. Không sửa firmware, IAM, command/run/claim hay dispatch queue.

GET /api/v1/valve-alerts tải100đợt ưu tiên active/unseen/ID; GET /{id} đối
chiếu ngoài danh sách. PUT /{id}/acknowledgement nhận đúng note string/null,
<=500ký tự. First-note immutable; retry cùng note idempotent, note khác409,
first ACK sau phục hồi409. Chưa operator identity. Web tab **Van theo nhánh**
có lọc/chi tiết/bằng chứng, polling5giây, giữ draft khi xung đột/mất phản hồi,
GET đối chiếu không tự PUT lại. API đọc lỗi khóa xác nhận. Thời gian xác nhận
của component dùng chung được cố định Asia/Ho_Chi_Minh để khớp lịch sử.

Event Log thêm VALVE_ALERT_OPENED/CLEARED/ACKNOWLEDGED, category ALERT, device
là mã van. Mở/phục hồi dùng sourceAt giờ đo, eventAt/recordedAt giờ nhận;
đã xem chỉ giờ backend, sourceAt null. commandId/runId null; không coi note
là ACK lệnh. Cursor phân trang chấp nhận ba prefix valve-*.

| Kiểm tra lượt cuối | Kết quả |
| --- | --- |
| Backend verify toàn bộ, PostgreSQL riêng |352/352, không skip |
| Bộ mới CircuitValveAlertsTest |19/19, nằm trong352 |
| Browser tab van |13/13 |
| Browser cảnh báo môi trường/nước/đất hồi quy |24/24 |
| Browser Event Log |11/11 |
| Lint / production build |Đạt; warning Vite/chunk có sẵn |
| Native encoder dùng ValveFeedback/ValveMonitor |Compile strict đạt; JSON resource khớp byte |
| Full-app native→Java→PostgreSQL→React, ACK thật qua UI |Đạt, không API mock |
| Restart JVM lúc lỗi đã xem, rồi hai mẫu phục hồi |Metadata/note giữ; đóng đúng mẫu thứ hai |
| Restart lần nữa sau phục hồi |Đợt đã đóng và ba event giữ nguyên |
| V27→28 trên schema giữ lại |2nhánh/3queue/status/boot nguyên vẹn; không backfill |
| Lệnh/run/queue mới trong smoke |0/0/0, không AWS |
| Liên kết Markdown tương đối / diff --check |317 liên kết hợp lệ / đạt |

Backend tests gồm mất chuỗi do boot/gap/restart/capability, hai van độc lập,
DEVICE_FAULT, note race/idempotency, SQL failure rollback cả status/boot/cursor,
102đợt để GET ngoài100vẫn đọc được và phân trang Event Log. Các test malformed
HTTP không nới validation. Bộ cuối chạy toàn bộ backend một lần sau khi thêm
19ca; không cộng lượt targeted trước vào số352. Browser van và cảnh báo cũ
chạy lại sau sửa timezone chung; không chạy lại firmware vì code không đổi.

Runtime dùng schema mới circuit_valve_alert_smoke trên smartfarm-cloud-test
loopback55439, MQTT/control/pump-fencing/valve-demo false, monitor true.
Fixture Java chặn URL/flags/transport, chỉ seed vào schema trống, không reset.
Packet C++ giữ hợp đồng thật; helper gán timestamp một lần cho từng packet mới
để kiểm tra freshness, không sửa timestamp dữ liệu cũ. Fault SWITCH_CONFLICT
boot...0001 seq0 → xác nhận qua React → restart JVM → CLOSED boot...0002 seq0/1
→ phục hồi → restart lần nữa. Bằng chứng mở/note/time đối chiếu nguyên vẹn,
ba Event Log đúng source/receipt time; pump/valve commands, watering runs và
queue đều0. Không tải .local secrets hoặc gửi AWS/MQTT.

Schema V27 irrigation_circuit_smoke được nâng trước đó; so JSON từng row
cấu hình, ba queue, status/boot trước/sau giống hệt, cảnh báo rỗng. GET-only
smoke cũ vẫn thấy VALVE02 stale và VALVE03 chưa kết nối, không đổi metadata.
Hai query snapshot thử đầu sai tên bảng/cột bị từ chối, sửa query chỉ đọc;
không reset/refresh dữ liệu. Không đụng demo5433 hoặc schema fixture khác.
Xem screenshot phát hiện giờ note theo timezone máy khác thẻ lịch sử; sửa
component dùng chung sang giờ Việt Nam và chạy lại browser/lint/build.

Log tạm: /tmp/valve-alert-full-backend.log, /tmp/valve-alert-browser-final.log,
/tmp/valve-alert-legacy-browser-final.log, /tmp/valve-alert-events-browser.log,
/tmp/valve-alert-lint-final.log, /tmp/valve-alert-build-final.log,
/tmp/valve-alert-native-fault.log, /tmp/valve-alert-native-recovery.log,
/tmp/valve-alert-upgrade-smoke.log, /tmp/valve-alert-app-open.log,
/tmp/valve-alert-app-stored.log, /tmp/valve-alert-app-recovered.log,
/tmp/valve-alert-app-final-restart.log; ảnh /tmp/valve-alert-app-{phase}.png.
Các artifact /tmp không đảm bảo tồn tại qua lần tạo môi trường mới.

Trên Windows pull nhánh rồi restart backend để Flyway áp V28, giữ cờ monitor
V27 và policy status đang dùng. Không xóa volume hoặc chạy helper cloud seed
trên DB cá nhân. Mở Trung tâm Cảnh báo → Van theo nhánh; fault cần packet mới.
Sáu ca [chương40](../book/CHAPTER_40_VALVE_ALERTS.md) **Chưa chạy** trên Windows/
AWS/Wokwi/GPIO thật. Chưa điều khiển van02+, nhiều đầu ra/board, interlock
xuyên van–bơm, flow proof, coordinator hoặc dispatch queue; A3 chưa hoàn tất.
