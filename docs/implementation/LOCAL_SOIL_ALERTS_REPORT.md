# Bàn giao cảnh báo SOIL — 15/10/2026 (giờ Việt Nam)

## Kết quả

Thêm cảnh báo đất khô/lỗi theo từng kênh SOIL và nguồn. DRY_SOIL mở dưới30%,
đóng từ35%; SENSOR_FAULT mở bằng null/lỗi, đóng bằng mẫu VALID kể cả0. Cần hai
packet fresh≤30s, cùng boot/source, seq liền, giờ đo tăng, gap≤15s. Hysteresis
band/fault/missing giữ điều kiện nhưng reset pending streak. Không tự đóng
khi im lặng. Không điều khiển van/bơm từ SOIL, chưa IRRIGATION/coordinator.

- V18 thêm cursor/state/episodes riêng, có unique active/FK sample/channel.
  Không đổi packet v2, firmware, MQTT/AWS policy hoặc chạy migration hồi tố.
- NodeInventory gọi SoilAlerts trong transaction lưu packet SOIL. Duplicate
  không đánh giá lại; cursor row lock, rollback mẫu và state cùng nhau.
- GET soil-alerts/list100/detailID, PUT ACK strict byte-body/note≤500. First-note
  idempotent/409 khác note/409 đã đóng chưa xem; không actor/edit/unack/email.
- UI Trung tâm Cảnh báo → Đất nhiều điểm. Nguồn/điều kiện/đã xem riêng, bằng
  chứng0/null/giá trị phục hồi. WaterAlertCenter và SoilAlertCenter dùng chung
  ChannelAlertCenter để giữ polling/ACK/readback, parser từng nhóm riêng.
- Overview/header/Device Monitoring/Safety/EventLog chưa tổng hợp soil alerts;
  rule hiện tại vẫn ENV01. Source/calibration tự khai báo, ngưỡng demo cố định.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
|---|---:|
| Maven verify/PostgreSQL test riêng | 167/167, skip0 |
| SoilAlertsTest trong tổng backend | 15/15 |
| Browser cảnh báo (legacy/WATER/SOIL) | 24/24, skip0 |
| Unit parser ba nhóm cảnh báo | 11/11, skip0 |
| Lint/build | Đạt |
| V17→V18 giữ dữ liệu SOIL cũ | 3 packet/7 readings, soil-alert0, command0/run0 |
| Toàn app/API/PostgreSQL | ACK → restart → đọc → packet phục hồi → closed giữ note |

Log /tmp/soil-alert-backend.log, soil-alert-browser.log, soil-alert-unit.log,
soil-alert-lint.log, soil-alert-build.log, soil-alert-upgrade.log,
soil-alert-upgrade-counts.txt, soil-alert-fixture-seed.log,
soil-alert-fixture-clear.log, soil-alert-smoke-ack.log,
soil-alert-smoke-read.log, soil-alert-smoke-cleared.log.
Ảnh /tmp/soil-alert-{ack,read,cleared}.png chỉ là UI trên fixture local.

Chạy từ gốc repo, PostgreSQL smartfarm-cloud-test đang ở loopback55439:

```bash
JAVA_HOME=/workspace/toolchains/jdk-21.0.12.1 MAVEN_USER_HOME=/workspace/.m2 \
MAVEN_OPTS='-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts' \
SMARTFARM_TEST_DB_URL='jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=telemetry_test' \
SMARTFARM_DB_USER=smartfarm_test SMARTFARM_DB_PASSWORD='' \
bash backend/mvnw -B -f backend/pom.xml -s /workspace/toolchains/maven-settings.xml \
 -Dmaven.repo.local=/workspace/.m2/repository verify

CHROMIUM_PATH=/usr/bin/chromium npm run test:alerts
node --import tsx --test src/modules/iot/alerts/soilAlertApi.test.ts src/modules/iot/alerts/waterAlertApi.test.ts src/modules/iot/alerts/alertApi.test.ts
npm run lint
npm run build
```

Không dùng demo smartfarm-mvp-postgres-1/5433 cho tests, không reset schema/
volume. Dừng backend cloud do phiên này chạy trước khi Maven repackage; không
thay jar lúc JVM đang dùng. Helper Windows thiếu testURL có thể skip integration,
không gọi lượt đó 167/167. Không thêm dependency hoặc cần AWS credential mới.

## Runtime và fixture cloud

Runtime cuối backend8080 schema **soil_alert_smoke**, frontend Vite3000.
SMARTFARM_DB_URL=jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=soil_alert_smoke,
user smartfarm_test/password trống chỉ test loopback, MQTT/control=false,
Flyway schemas/default-schema cùng soil_alert_smoke. JDK21 jar với truststore
/etc/ssl/certs/java/cacerts. Kiểm tra readiness bằng HTTP safety/nodes/alerts,
không chỉ PID/port.

SoilAlertSmokeFixture.java chỉ chấp nhận URL schema test chính xác, hai flags
false trước Spring; seed từ chối SOILWARN đã có, clear yêu cầu đúng hai packet/
hai đợt mở, không xóa hoặc reseed dữ liệu. Compile:

```bash
/workspace/toolchains/jdk-21.0.12.1/bin/javac \
 -cp 'backend/target/classes:/tmp/water-alert-smoke-libs/*' -d /tmp \
 tools/fixtures/SoilAlertSmokeFixture.java
```

Đã chạy fixture seed/clear ở WebApplicationType.NONE bằng các env runtime
chính xác bên trên. Hai packet seed đi qua TelemetryRouter tạo DRY_SOIL SOIL1
và SENSOR_FAULT SOIL3. Browser full-app chỉ được một PUT ACK đúng episode/node/
source/note đã biết; pha read/cleared GET-only, chặn external requests.
Đã restart JVM giữa ACK và đọc; ghi chú và trạng thái xác nhận vẫn đọc được. Sau clear có
4 node_sample, 12 channel_sample, 2 soil_alert đã đóng, chỉ đợt khô được ACK,
command0/run0. Runtime giữ fixture đó, mẫu tự stale; không reseed làm giả live.

Có thể đọc lại mà không ghi:

```bash
python tools/frontend/smoke_soil_alerts.py --phase cleared
```

ack/seed/clear là các pha đã dùng trên test schema; không chạy lại để ép trạng
thái hoặc áp dụng lên backend của người dùng. Không có HTTP ingestion test-only
trong production controller. Các schema soil_node_smoke/flow_guard_smoke và
WATER cũ giữ nguyên, riêng soil_node_smoke đã nâng lênV18 để kiểm tra bảo toàn.

## Windows / sách / còn chờ

[Chương28](../book/CHAPTER_28_SOIL_ALERTS.md) có pull/restart V18, vị trí tab,
ngữ nghĩa bằng chứng và sáu ca Wokwi **Chưa chạy**. Không cần nạp lại firmware
SOIL01 hoặc provision lại nếu node v2 đã phát đúng. Nếu chưa có SOIL live,
[chương27](../book/CHAPTER_27_SOIL_MULTIPOINT.md) vẫn là hướng dẫn chuẩn bị.

Đợt này không có AWS/Wokwi thật mới hoặc nghiệm thu sensor/pump vật lý. Giữ
ngưỡng30/35 là demo; soil calibration, zone/valve/shared-pump coordinator còn
sau. Sách cập nhật đồng thời, không gộp các test fixture với chứng cứ live.

Kiểm tra 151 liên kết local trong các Markdown thay đổi: không thiếu đích;
`git diff --check` đạt.
