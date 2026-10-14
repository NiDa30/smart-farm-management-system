# Bàn giao vùng tưới / V19 — 15/10/2026 (giờ Việt Nam)

## Kết quả

Thêm registry tạo/sửa vùng, ba kênh SOIL/v2 cùng node/cùng area, source dự kiến
SIMULATOR/PHYSICAL, ngưỡng riêng và revision. Kênh độc quyền một vùng bằng unique
node/channel. Update row lock + CAS revision, đổi binding atomic; lỗi xung đột
rollback giữ cấu hình/binding cũ. V19 chỉ thêm hai bảng, không tự gán node cũ.

Khảo sát cần cả ba VALID/mới nguồn+receipt≤30s, đúng source và cùng packet.
Hai điểm dưới dry =>DRY; hai điểm≥wet =>WET; còn lại MIXED. Missing/fault/stale/
clock/source mismatch =>UNAVAILABLE; các điểm khác packet =>INCOHERENT, không
trả số đếm đa số. validUntil/UI monotonic chặn kết quả đã cũ khi polling dừng.

UI Sensor Realtime → Node & trạm nước → Vùng tưới, form create/edit, ngưỡng,
đọc lại sau lost response và revision conflict. API GET list/detail, POST/PUT
/api/v1/irrigation-zones. Không delete/disable/run/command, chưa actuator binding
hoặc coordinator; ruleENV01 độc lập. Ngưỡng zone không thay alert30/35 hiện có.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
|---|---:|
| Maven verify/PostgreSQL test riêng |176/176, skip0|
| IrrigationZonesTest trong tổng backend |9/9|
| Browser node/history/zone |29/29, skip0|
| Unit node/history/zone |17/17, skip0|
| Lint/build cuối |Đạt|
| Upgrade V18→V19 trên dữ liệu giữ lại |4packet/12readings,2alert/1ACK,command0/run0|
| Full-app/API/PostgreSQL |2POST+1PUT,majority,config/revision/binding giữ qua restart|

Lượt browser đầu28 đạt/1 timeout nhãn select; thêm aria-label tường minh, lượt
cuối29/29 đạt. Lint đầu lỗi TS nullable trong callback, guard được giữ và kiểu
được điều chỉnh; lượt lint/build cuối đạt. Đây là lỗi dev/tool/UI, không sự cố
AWS hoặc sensor live. Không dùng kết quả lượt fail để báo pass toàn bộ.

Log /tmp/zones-backend.log, zones-browser.log (lượt đầu), zones-browser-final.log,
zones-unit.log, zones-lint-final.log, zones-build-final.log, zones-upgrade.log,
zones-upgrade-counts.txt, zones-fixture.log, zones-smoke-write.log,
zones-smoke-read.log, zones-before-restart.json, zones-after-restart.json,
zones-runtime-counts.txt. Ảnh /tmp/irrigation-zones-write.png và -read.png.

Từ repo, PostgreSQL smartfarm-cloud-test đang sẵn sàng ở55439:

```bash
JAVA_HOME=/workspace/toolchains/jdk-21.0.12.1 MAVEN_USER_HOME=/workspace/.m2 \
MAVEN_OPTS='-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts' \
SMARTFARM_TEST_DB_URL='jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=telemetry_test' \
SMARTFARM_DB_USER=smartfarm_test SMARTFARM_DB_PASSWORD='' \
bash backend/mvnw -B -f backend/pom.xml -s /workspace/toolchains/maven-settings.xml \
 -Dmaven.repo.local=/workspace/.m2/repository verify

CHROMIUM_PATH=/usr/bin/chromium npm run test:nodes
node --import tsx --test src/modules/iot/zones/zoneApi.test.ts src/modules/iot/nodes/nodeApi.test.ts src/modules/iot/nodes/waterHistoryApi.test.ts
npm run lint
npm run build
```

Dừng backend do phiên này chạy trước repackage, không thay jar JVM đang dùng.
Không dùng demo5433 hoặc reset schema/volume. TestURL phải có để không skip
integration; helper Windows không có test DB không chứng minh176/176.

## Runtime và fixture

Backend8080 schema **irrigation_zones_smoke**, MQTT/control=false, Flyway cùng
schema. DB URL jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=irrigation_zones_smoke,
user smartfarm_test/password trống chỉ loopback test. JDK21 jar/truststore cũ,
frontend Vite3000 proxy8080. GET safety/nodes/zones để xác nhận readiness, không
chỉ PID/port. Các schema WATER/SOIL/flow cũ giữ lại; soil_alert_smoke nângV19.

IrrigationZonesSmokeFixture.java guard URL/flags trước Spring, từ chối seed
node/vùng đã có; chỉ ghi registry node+hai packet qua TelemetryRouter, không
chèn cấu hình vùng. Compile JDK21 -cp backend/target/classes:/tmp/water-alert-smoke-libs/*
ra /tmp. Đã chạy main WebApplicationType.NONE với env test chính xác trước khi
khởi động backend. ZONESOIL_A có0/20/80, ZONESOIL_B40/50/20, source SIMULATOR.

Browser full app write chỉ cho hai POST ZONE_A/B và PUT ZONE_A revision1 đổi
tên/ngưỡng40/45, chặn API ghi khác/external. Sau đó dừng/khởi động JVM, GET config
trước/sau so sánh bằng nhau; pha read browser không ghi. Runtime giữ2 vùng,
6 binding,2 packet/6 readings,revision A2/B1,command0/run0. Mẫu tự stale, không
reseed để giả live. Fixture source chỉ là dữ liệu local, không AWS/Wokwi.

Đọc lại trạng thái giữ lại:

```bash
python tools/frontend/smoke_irrigation_zones.py --phase read
```

Không chạy lại seed/write trên trạng thái này, không xóa dữ liệu để ép test.
Không có production HTTP ingestion debug endpoint. Firmware/Thing/cert/IAM
không đổi, không thêm dependency. Các source/calibration labels là khai báo.

Đọc [chương29](../book/CHAPTER_29_IRRIGATION_ZONES.md) cho Windows và năm ca live
**Chưa chạy**. A3 còn controller/valve/coordinator/shared pump; khảo sát một
packet khác với hai packet liên tiếp của alert/rule và chưa có hysteresis state.
