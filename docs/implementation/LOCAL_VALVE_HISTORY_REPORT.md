# Bàn giao V29 — lịch sử van và CSV

15/10/2026 (Asia/Ho_Chi_Minh), feat/day1-iot-foundation.

Thêm circuit_valve_history để append mọi packet monitor02–99 được chấp nhận,
nguồn SIMULATOR, giữ cấu hình/phiên bản tại lúc nhận và nguyên quan sát với
giờ đo/nhận riêng. Không dựng lịch sử từ latest/status hoặc evidence V28 cũ.
Status/retired boot/episode/history cùng transaction; lỗi history rollback hết.
QoS trùng, sai identity/source/revision, stale/retained/retired boot không thêm.
ID lịch sử được cấp tuần tự tới commit bằng advisory transaction lock riêng,
để mốc phân trang không chứa khe hở giao dịch đang ghi ở backend khác.

GET /api/v1/valve-history có from/to theo receivedAt [from,to), tối đa31ngày;
lọc circuitId/valveId02–99 và condition ALL/FAULT/UNKNOWN/OPEN/CLOSED/CONFLICT,
limit1–200(default50). FAULT gồm fault vị trí hoặc DEVICE_FAULT dù công tắc
CLOSED. Cursor gắn scope/range, ceilingId giữ mốc ID, sắp nhận/id DESC. Không
HTTP packet ingress hoặc API ghi/điều khiển ở màn lịch sử. Tắt monitor vẫn đọc
được lịch sử. Chưa tích hợp demo01 hoặc retention tự động.

Đường web: Điều khiển Actuator → Cấu hình nhánh tưới → Lịch sử trạng thái van.
Chọn bộ lọc rồi bấm đọc; tải50dòng/trang, không polling làm dịch phạm vi.
Chi tiết có snapshot nhánh/vùng, source, boot/sequence và ISO gốc. CSV UTF-8
BOM chỉ gồm dòng đã tải, quote multiline và chặn formula tên nhánh. API lỗi
khác rỗng; tải thêm lỗi giữ dòng nhưng khóa CSV, cho thử lại. Phản hồi chậm cũ,
cursor không tiến, sai ceiling/identity/time/order bị từ chối. Parser giữ độ
chính xác dưới mili giây để không so nhầm các timestamp PostgreSQL.

| Kiểm tra lượt cuối | Kết quả |
| --- | --- |
| Backend verify đầy đủ, PostgreSQL riêng |369/369, không skip |
| CircuitValveHistoryTest mới |17/17, nằm trong369 |
| Browser history mới |11/11 |
| Browser nhánh cấu hình hồi quy |18/18 |
| Unit parser history frontend |3/3 |
| Lint / production build |Đạt, warnings Vite/chunk cũ |
| Native packet resource V28 → Java receiver → PostgreSQL |3mẫu, không AWS |
| Full-app React thật: navigation/filter/detail/CSV |Đạt, không API mock |
| Restart JVM trên fixture giữ lại |Mọi field config/packet/clock và mốc page giữ |
| V28→29 trên fixture cũ |Config/queue/status/boot/episode/cursor nguyên vẹn; history0 |
| Command/run/queue mới trong smoke |0/0/0 |
| Liên kết Markdown tương đối / diff --check |328 liên kết hợp lệ / đạt |

17ca backend kiểm tra duplicate/retired boot/identity/source/stale, missing
capability, DEVICE_FAULT với CLOSED, lọc tách van, biên giờ nhận, tie timestamp,
ceiling chống append mới, cursor qua scope bị từ chối, config đổi giữ snapshot,
history SQL failure rollback, GET read-only và ghi đồng thời. Ca pending giữ
transaction chưa commit với receivedAt cũ, writer khác phải chờ rồi mốc page
không thấy dòng đó: tránh chỉ kiểm tra các INSERT tuần tự. Bộ cuối chạy đầy
đủ sau bổ sung ca này; không cộng các lượt targeted/lượt368 trước vào369.

Hai lỗi kiểm tra đã xử lý: JsonNode của sequence LongNode so với IntNode có
cùng số nhưng equals khác, chuyển sang so Observation typed đầy đủ; fixture
browser cho ceiling đổi đồng thời lặp cursor nên bị từ chối đúng ở bước trước,
sửa fixture cho token cuối null để kiểm tra riêng ceiling. Không nới parser.
Fixture giờ browser dùng một clock cố định để không tạo order giả khi dựng
hai dòng. Không sửa implementation để che thất bại test.

Nâng schema circuit_valve_alert_smoke V28→29 trên testDB55439: so JSON từng
row circuit/queue/status/boot/episode/cursor trước/sau giống hệt; không backfill.
GET-only smoke V28 cũ vẫn đạt. Không tạo heartbeat mới hoặc sửa timestamp để
qua test. Schema demo5433 và fixture cũ khác không bị sửa/reset.

Runtime mới valve_history_smoke chỉ seed một lần vào schema trống. Java helper
chặn URL/flags/transport, tạo2nhánh với AWATER chung; ba packet từ encoder V28
vào VALVE04 (fault boot...0001 seq0, CLOSED boot...0002 seq0/1), VALVE05 rỗng.
Timestamp gán một lần cho từng packet mới, không sửa bản ghi cũ. Sau đó rename
ALERTC1 lên revision2, history vẫn tên/revision1. Frontend qua menu thật, xem
chi tiết/CSV, lọc FAULT còn1 và VALVE05 rỗng; restart JVM thật, so mọi field
của trang với metadata đã lưu. MQTT/control/pump-fencing/demo false, monitor
true; pump/valve commands, watering_run và irrigation_queue_request đều0.

Log tạm: /tmp/valve-history-backend-final.log, /tmp/valve-history-browser-final.log,
/tmp/valve-history-circuits-browser.log, /tmp/valve-history-unit.log,
/tmp/valve-history-lint-final.log, /tmp/valve-history-build-final.log,
/tmp/valve-history-upgrade-smoke.log, /tmp/valve-history-native-receive.log,
/tmp/valve-history-app-first.log, /tmp/valve-history-app-stored.log. Ảnh
/tmp/valve-history-app-first.png và stored.png; bằng chứng metadata
/tmp/valve-history-app-evidence.json. /tmp không đảm bảo qua tạo lại môi trường.
Helper không được reseed fixture giữ lại; stored smoke chỉ GET, không phát lệnh.

Trên Windows pull nhánh, restart backend để áp V29, giữ monitor/policy status
V27; không thêm IAM hoặc build firmware. Lịch sử cần packet mới sau upgrade.
Năm ca [chương41](../book/CHAPTER_41_VALVE_HISTORY.md) **Chưa chạy** trên Windows/
AWS/Wokwi/GPIO thật. Chưa retention: heartbeat5giây khoảng17.280dòng/ngày/van,
cần theo dõi dung lượng PostgreSQL khi mở rộng. Chưa nhiều van điều khiển,
interlock xuyên van–bơm, flow proof/coordinator hoặc dispatch queue; A3 chưa xong.
