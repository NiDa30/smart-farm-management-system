# Bàn giao tổng quan nông nghiệp — 15/10/2026 (giờ Việt Nam)

## Kết quả

Tổng quan IoT thêm inventory WATER/SOIL, từng kênh/nguồn/độ mới, mức bồn,
khảo sát vùng và preview5 cảnh báo đất+nước. Card cộng cả môi trường/nước/đất,
bao gồm episode đã xem nhưng chưa đóng; SQL count độc lập list100/preview5.
Field activeAlertCount cũ giữ nghĩa sensor_alert, agriculture additive.

IoTOverview read-only RR dùng NodeInventory một lần, IrrigationZones.survey
cùng inventory/asOf. UI parse cấu trúc/danh tính kênh/family/source/count,
monotonic expiry, lỗi API chặn khẳng định hiện tại; không gửi command/rule.
No migration: V19 giữ nguyên. Không đổi firmware/contract MQTT/IAM/helper AWS.

## Kiểm tra

| Kiểm tra | Đã đạt |
|---|---:|
| Backend Maven verify/test DB riêng |179/179, skip0|
| IoTOverviewTest trong tổng backend |6/6|
| Browser dashboard, API fixtures |15/15, skip0|
| Frontend unit dashboard |6/6|
| npm lint/build |Đạt|
| Full-app thật + PostgreSQL, receive fixture local |Fresh và stale, GET-only navigation đạt|

Không gọi browser fixtures là E2E AWS. Không chạy lại firmware vì không đổi.
Các log /tmp/ag-dashboard-{backend,browser,unit,lint-final,build,fixture,runtime,
smoke-fresh,smoke-stale}.log; screenshot /tmp/agriculture-overview-{fresh,stale}.png.
Build có cảnh báo __dirname/chunk Vite cũ, không lỗi compile. Setup vô tình mở
Vite thứ hai tự chuyển3001; đã dừng đúng tiến trình đó, giữ Vite3000 hiện có.
162 liên kết nội bộ không thiếu đích, git diff --check đạt. Không có lượt test fail. Không đụng PostgreSQL demo5433 hoặc các schema cũ.

```bash
# Từ root repo; dừng JVM do mình chạy trước Maven repackage.
JAVA_HOME=/workspace/toolchains/jdk-21.0.12.1 MAVEN_USER_HOME=/workspace/.m2 \
MAVEN_OPTS='-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts' \
SMARTFARM_TEST_DB_URL='jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=telemetry_test' \
SMARTFARM_DB_USER=smartfarm_test SMARTFARM_DB_PASSWORD='' \
bash backend/mvnw -B -f backend/pom.xml -s /workspace/toolchains/maven-settings.xml \
 -Dmaven.repo.local=/workspace/.m2/repository verify
CHROMIUM_PATH=/usr/bin/chromium npm run test:dashboard
node --import tsx --test src/modules/iot/dashboard/overviewApi.test.ts src/modules/iot/dashboard/agricultureApi.test.ts
npm run lint
npm run build
```

## Runtime cloud và fixture

Backend8080 cuối dùng schema **agriculture_overview_smoke**, không phải
irrigation_zones_smoke cũ. Docker smartfarm-cloud-test55439 loopback,
user/DB smartfarm_test, password trống chỉ test service. Vite3000 proxy8080.

```bash
SMARTFARM_DB_URL='jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=agriculture_overview_smoke' \
SMARTFARM_DB_USER=smartfarm_test SMARTFARM_DB_PASSWORD='' \
SMARTFARM_MQTT_ENABLED=false SMARTFARM_CONTROL_ENABLED=false \
/workspace/toolchains/jdk-21.0.12.1/bin/java -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts \
 -jar backend/target/smart-farm-backend-0.1.0-SNAPSHOT.jar \
 --spring.flyway.schemas=agriculture_overview_smoke --spring.flyway.default-schema=agriculture_overview_smoke
```

GET safety phải HTTP200/mqtt DISABLED/controlEnabled false. GET overview phải
agriculture có AGSOIL/AGWATER, một AGZONE, đất2/nước1 episode mở/1 đất ACK;
mẫu tự stale, không seed lại. `python tools/frontend/smoke_agriculture_overview.py
--phase stale` là GET-only đọc lại full-app với guard origin localhost3000.
Pha fresh đã đạt lúc vừa seed; không tái tạo dữ liệu để cho nó đạt lần nữa.

Fixture `tools/fixtures/AgricultureOverviewSmokeFixture.java` guard exact test
URL và flags trước Spring, từ chối khi có node/vùng/lệnh/run; đăng ký node,
packet v2 qua router, tạo vùng bằng service, ACK bằng service. Compile JDK21
với classpath `backend/target/classes:/tmp/water-alert-smoke-libs/*`, output /tmp,
run WebApplicationType.NONE với env chính xác như runtime (classpath thêm /tmp).
Đã chạy thành công trên schema trống. Hiện đã seed: **không chạy lại hoặc xóa DB**.
Giữ4 packet/12 reading/1 zone/3 bindings, soil_open2/water_open1/ACK1/command0/run0.
Không thêm endpoint ingest/debug vào ứng dụng production để làm fixture.

## Bàn giao Windows và giới hạn

Pull/restart cả backend/frontend. Mở IoT & Tự động hóa → Tổng quan IoT.
Không reflash/provision vì thay màn tổng quan. Nếu chỉ registry chưa có mẫu,
UI báo chưa có dữ liệu. Không tự tạo/cấp certificate cho node từ dashboard.
[Sách chương30](../book/CHAPTER_30_AGRICULTURE_OVERVIEW.md) có5 ca live chưa chạy.

EventLog/Safety/header/DeviceMonitoring chưa hợp nhất WATER/SOIL alerts; chỉ
màn Tổng quan có phép cộng mới. Survey không dispatch; rule ENV01 độc lập.
Không có controller/valve/coordinator, NVS hoặc soil-driven rule mới. Snapshot
trả toàn bộ node/vùng chưa pagination/load-test. Không đọc private config/keys,
không gọi AWS/Wokwi hoặc gửi lệnh thật. Không suy từ fixture ra nghiệm thu vật lý.
