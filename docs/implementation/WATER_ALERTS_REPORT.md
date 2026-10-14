# Bàn giao — Cảnh báo trạm nước V16

Ngày 14/10/2026, tiếp nối firmware WATER monitor. Chức năng mới ở
**Trung tâm Cảnh báo → Trạm nước**; đọc [chương 24](../book/CHAPTER_24_WATER_ALERTS.md)
cho quy trình Windows và ma trận AWS/Wokwi còn chờ.

## Hành vi

- Mở/hết LOW_WATER, INCONSISTENT_FLOATS hoặc SENSOR_FAULT theo từng kênh.
  Tank dùng LOW/HIGH WATER_PRESENT cùng packet hợp lệ. Firmware hiện gửi
  bất nhất thành fault/null nên sẽ hiện lỗi LOW/HIGH, không đoán giá trị thô.
- Hai packet fresh liên tiếp theo node/source/boot/sequence, thời gian tăng
  ở độ chính xác ms, không quá 15 giây giữa mẫu. Mẫu cũ trên 30 giây, duplicate,
  reorder, missing channel hoặc gap không hoàn tất chuỗi điều kiện.
- Fault/missing không xóa LOW_WATER. Flow 0 VALID không báo mất dòng. Nguồn
  khác không clear đợt cũ; thay đổi nguồn làm lại chuỗi xác nhận.
- V16 có cursor, candidate/active state và episode. NodeInventory lưu packet,
  channel và đánh giá cùng transaction; cursor khóa theo node, unique index
  chặn trùng đợt. FK giữ bằng chứng sample/giờ đo/giờ nhận mở và hết.
- API water-alerts riêng, top 100 ưu tiên active/unseen. GET chi tiết vẫn dùng
  khi ngoài danh sách. ACK đầu tiên giữ nguyên; cùng note retry được, khác
  note hoặc đợt đã hết chưa xem trả 409. API strict note/null, tối đa 500 ký tự.
- UI dùng chung form ghi chú, kiểm tra immutable identity/source/opening
  evidence khi ACK. Mất phản hồi không tự retry; readback rõ ràng. List cũ
  không ghi đè ACK mới; API lỗi/nguồn invalid khóa lưu, giữ nháp; text note
  không được render thành HTML. Nút đổi nhóm bị khóa khi đang thao tác.

Không dispatch command, sửa firmware/certificate hoặc bật dịch vụ AWS. Tổng
quan, Event Log và Safety vẫn theo read model trước V16, chưa cộng water alerts.
Chưa có water history/CSV, lưu lượng tích lũy, no-flow cutoff/grace/calibration,
email, auth/role hoặc NVS. Cảnh báo không chứng minh quyền khởi động bơm.

Lần smoke cleared đầu đã qua assertion chức năng nhưng timeout ở chụp ảnh
trong lúc build đang chạy. Helper dùng chế độ animations disabled cho artifact,
không bỏ assertion hoặc đổi kết quả nghiệp vụ; chạy lại phase cleared sau khi
build xong và restart jar cuối. Không quy lỗi này cho AWS hay mất dữ liệu.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
|---|---|
| Maven verify, PostgreSQL test riêng | 132 pass, 0 fail/error/skip |
| Trong đó WaterAlertsTest | 13 pass |
| Browser alerts API fixtures | 17 pass: 9 môi trường cũ + 8 nước |
| Unit frontend waterAlertApi | 4 pass |
| TypeScript lint / Vite build | Đạt, cảnh báo Vite cũ |
| Migration V15→V16 | Giữ 2 packet/6 channel, command/run=0, không backfill đợt |

Các log ở /tmp/water-alerts-backend-final.log, water-alerts-browser-final.log,
water-alerts-unit.log, water-alerts-lint.log, water-alerts-build.log. Không gọi
đây là toàn bộ E2E AWS. Firmware không đổi nên không rebuild ESP32 trong đợt này.

Để chạy lại backend dùng các biến test đã có trong môi trường cloud, database
smartfarm_test cổng 55439 và schema telemetry_test; không dùng database demo.
Browser: `CHROMIUM_PATH=/usr/bin/chromium npm run test:alerts`.
Unit: `node --import tsx --test src/modules/iot/alerts/waterAlertApi.test.ts`.

## Smoke toàn ứng dụng và process restart

Schema riêng **water_alert_smoke** trong PostgreSQL test 55439, MQTT/control
false. Không reset schema demo, không đọc `.local` hoặc credentials.

1. Jar mới nâng water_a2_smoke từ V15 lên V16 giữ WATER01, 2 packet/6 channel,
   source cũ; API water-alerts rỗng, command/run=0. Sau đó dùng schema mới riêng.
2. tools/fixtures/WaterAlertSmokeFixtures.java chạy Spring local với guard URL
   chính xác và MQTT/control=false. Mode open khai báo WATERALARM rồi gọi
   parser/router/store/evaluator thật với hai packet SIMULATOR LOW=false,
   HIGH=false, FLOW=0 (seq1/2, cùng boot). Không đi qua MQTT/AWS.
3. tools/frontend/smoke_water_alerts.py --phase ack đi qua menu app → Trung tâm
   Cảnh báo → Trạm nước, đọc API thật, PUT đúng một ghi chú. Đợt vẫn mở và đã xem.
4. Dừng đúng process backend do nhiệm vụ tạo, chạy lại jar với cùng schema;
   --phase read xác nhận ID/nguồn/ghi chú/đợt mở còn nguyên.
5. Fixture mode clear gửi seq3/4 LOW=true, HIGH=false cùng nguồn. Hai mẫu hợp lệ
   đóng điều kiện, giữ ACK. --phase cleared kiểm tra React/API thực.

Fixture Java dùng timestamp nguồn mới, khoảng cách 250 ms để kiểm tra quy tắc
parser/SQL, không phải chu kỳ firmware hoặc flow vật lý. Các phase browser
không mock API; guard chặn network ngoài origin và mọi write ngoài một ACK
được khai báo. Ảnh /tmp/water-alert-{ack,read,cleared}.png là artifact cloud.
Log /tmp/water-alert-smoke-{open,ack,read,clear,cleared}.log. Counts sau smoke:
4 node_sample / 12 channel_sample, 1 episode đã xem và đã hết, command/run=0.

Tái lập fixture chỉ trên schema test cố định, dừng nếu dữ liệu đã có thay vì
xóa dữ liệu. Lấy các BOOT-INF/lib/*.jar từ jar build vào /tmp/water-alert-smoke-libs,
biên dịch helper vào /tmp:

```bash
/workspace/toolchains/jdk-21.0.12.1/bin/javac \
  -cp 'backend/target/classes:/tmp/water-alert-smoke-libs/*' \
  -d /tmp tools/fixtures/WaterAlertSmokeFixtures.java
export SMARTFARM_DB_URL='jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=water_alert_smoke'
export SMARTFARM_DB_USER=smartfarm_test
export SMARTFARM_DB_PASSWORD=''
export SMARTFARM_MQTT_ENABLED=false
export SMARTFARM_CONTROL_ENABLED=false
/workspace/toolchains/jdk-21.0.12.1/bin/java \
  -cp '/tmp:backend/target/classes:/tmp/water-alert-smoke-libs/*' \
  WaterAlertSmokeFixtures open
```

Mode open ghi fixture nên không chạy lại trên schema đã có WATERALARM. Read
browser là bước readiness không ghi. Mode clear chỉ dùng một lần sau open;
không gọi helper này trên database của người dùng. Chưa có AWS/Wokwi live mới,
phần cứng thật hoặc bơm đa vùng. Ma trận thực tế ở chương 24 còn **Chưa chạy**.
