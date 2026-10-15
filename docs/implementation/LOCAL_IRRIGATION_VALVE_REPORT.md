# Bàn giao controller van mô phỏng — 15/10/2026 (giờ Việt Nam)

## Kết quả và phạm vi

IRRIGATION01/VALVE01 riêng, một zone nguồn SIMULATOR; V20 binding/command/status,
API GET snapshot/GET command ID/PUT binding/POST commands, row-lock+revision,
tracking commit trước publish và idempotency UUID. OPEN1–30s cần CLOSED15s,
đúng boot/zone/revision, status theo kịp toàn bộ command. HTTP requestedAt/fence
CLOSEserver+2s chặn OPEN đến muộn; device ordinal chặn MQTT cũ/duplicate. ACK
không đổi status, terminal verdict đầu được giữ. Publish uncertain được ghi,
không replay hoặc retry OPEN. Backend flag riêng mặc địnhfalse.

Firmware/sơ đồ riêng LEDGPIO26, defaultdisabled/SIMULATOR1, same-zone/time/boot/
ordinal/strictJSON, QoS1 nonretained. ESP timer25ms đóng theo deadline/mất link
được phát hiện, không resume. Chờ SUBACK mới báo demo sẵn sàng. Không physical
valve/pump/feedback/NVS/coordinator. Main inventory không có controller tổng
quát; IDs reserved tránh hijack ENV/WATER/SOIL. Helper mới chỉ render policy,
không provisioning/AWS operation. Source PUMP01/ENV firmware giữ nguyên.

UI Điều khiển Actuator→Mở controller van mô phỏng, binding source/version,
OPEN/CLOSE, ACK/status riêng, expiry monotonic, GET ID sau lost response. CLOSE
còn khi OPEN uncertain; không tự kết luận thực thi từ SENT. Body/view thiếu/
API lỗi/stale/binding changed chặn OPEN, old state có nhãn. Config mới cần
restart backend và frontend. [Chương32](../book/CHAPTER_32_IRRIGATION_VALVE_DEMO.md)
và [hợp đồng](../../contracts/irrigation/v1/README.md) có hướng dẫn Windows.

## Kiểm tra đã chạy

- Backend212/212 skip0, irrigation17 + disabled1. Toàn bộ suite chạy lại sau
  HTTP fence, request boot và lookup endpoint. Lượt trước209 pass; lượt đầu
  compile test helperstatus che matcher, đã sửa reportStatus.
- Browser cuối9/9; trước8/8 rồi9/9, lượt kiểm tra tiếp8 pass/1 fail expiry.
  UI sửa đồng hồ không lùi khi polling cùng asOf, rerun9/9; giữ assertion và
  timeout. GPIO cũng chưa xác định khi ledger mới hơn status. Unitfrontend2/2; Python policy3 + WATER17 +SOIL7.
- Native -stdc++11 -Wall -Wextra -Werror đạt. Ban đầu misleading-indentation,
  đã sửa code, không nới compiler. Native encoder cùng header firmware →Java
  receiver local, không MQTT/ESP GPIO.
- Public ESP32 default0/opt-in1 cuối, buildfs empty .gitkeep, merge4MiB đạt.
  Temp /tmp/smartfarm-irrigation-build không endpoint/cert/key; cuối config
  opt-in1 vẫn publicblank, không deploy được. Không đọc private userconfig.
- Lint/build đạt. Full-app Pump→valve→Pump GET-only và cờ đềufalse đạt sau
  sửa driver Python exact=False (lượt đầu NameError). Chưa AWS/Wokwi/GPIO thật.
- Upgrade retained agriculture_overview_smoke V19→V20 giữ4packet/12readings/
  zone1/soil-open2/water-open1/pumpcommand0/run0; không bind/dispatch tự động.
  Checksum V20 đã chốt; trước đó chỉ dựng lại feature tables/constraints mới
  tạo trong disposable telemetry_test khi sửa migration chưa phát hành.

239 liên kết Markdown nội bộ không thiếu đích; git diff --check đạt.

Log /tmp/irrigation-backend.log (compile fail), backend-final.log (209),
backend-fence.log, backend-final2.log (212), backend-verified.log (212 cuối), browser.log, browser-final.log,
browser-final2.log (9), browser-final3.log (8pass/1fail expiry), browser-final4.log (9 cuối), unit.log, lint-final.log, build-final.log, python.log,
water-regression.log, soil-regression.log, pio-default-final.log,
pio-enabled-final.log, fs.log, merge-final.log, fixture.log, runtime.log,
smoke-app-first.log (driver fail), smoke-app-final.log, upgrade.log,
upgrade-before.txt/upgrade-after.txt. Ảnh /tmp/irrigation-demo-full-app.png.

## Tái lập kiểm tra cloud

Repo /workspace/smart-farm-management-system. Reuse JDK21/Maven settings/
truststore, PostgreSQL smartfarm-cloud-test55439 loopback riêng, user/DB
smartfarm_test/password trống chỉ test. Không dùng/reset demo5433, schema cũ
hoặc volume. Dừng JVM do mình chạy trước Maven repackage.

```bash
JAVA_HOME=/workspace/toolchains/jdk-21.0.12.1 MAVEN_USER_HOME=/workspace/.m2 \
MAVEN_OPTS='-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts' \
SMARTFARM_TEST_DB_URL='jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=telemetry_test' \
SMARTFARM_DB_USER=smartfarm_test SMARTFARM_DB_PASSWORD='' \
bash backend/mvnw -B -f backend/pom.xml -s /workspace/toolchains/maven-settings.xml \
 -Dmaven.repo.local=/workspace/.m2/repository verify
CHROMIUM_PATH=/usr/bin/chromium npm run test:valve
node --import tsx --test src/modules/iot/irrigation/valveApi.test.ts
PYTHONPATH=/tmp/control-pio python -m unittest discover -s tools/tests -p 'test_irrigation*.py' -v
npm run lint
npm run build
```

Native compile tools/tests/valve_model_test.cpp với include firmware/irrigation-node/include
và ArduinoJson cache /tmp/smartfarm-soil-build/.pio/libdeps/esp32dev/ArduinoJson/src.
Cùng flags cho valve_packet_fixture.cpp ra /tmp/valve-packet-fixture, output
/tmp/valve-native-status.json. Pio dùng PYTHONPATH=/tmp/control-pio,
PLATFORMIO_CORE_DIR=/workspace/.platformio, project /tmp/smartfarm-irrigation-build;
không copy config.local/data/cert riêng từ user. FS/merge public test không
chứng minh key hợp lệ hoặc MQTT/GPIO hoạt động.

## Runtime cuối và dữ liệu giữ lại

Backend8080 chuyển sang **irrigation_demo_smoke**; Vite3000 proxy8080 giữ lại.

```bash
SMARTFARM_DB_URL='jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=irrigation_demo_smoke' \
SMARTFARM_DB_USER=smartfarm_test SMARTFARM_DB_PASSWORD='' \
SMARTFARM_MQTT_ENABLED=false SMARTFARM_CONTROL_ENABLED=false SMARTFARM_IRRIGATION_DEMO_ENABLED=false \
/workspace/toolchains/jdk-21.0.12.1/bin/java -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts \
 -jar backend/target/smart-farm-backend-0.1.0-SNAPSHOT.jar \
 --spring.flyway.schemas=irrigation_demo_smoke --spring.flyway.default-schema=irrigation_demo_smoke
```

Readiness GET /api/v1/irrigation-demo: controller IRRIGATION01/VALVE01,
demoEnabled/connected/readyToOpen false, binding ZONE01/zoneRev1/revision2,
latest CLOSED/BOOT/lastOrdinal0, commandsempty. AsOf mới không làm latest mới;
status sẽ tựstale, không seed lại để làm live. GET /safety MQTTDISABLED,
controlfalse. python tools/frontend/smoke_irrigation_demo.py là GET-only.

IrrigationDemoSmokeFixture.java kiểm exact URL/schema và cả3flagsfalse trước
Spring, từ chối zone/status/command đã có. Đã compile JDK21 -cp
backend/target/classes:/tmp/water-alert-smoke-libs/* ra/tmp, chạy WebApplicationType.NONE
với URL trên, classpath thêm/tmp, đối số/tmp/valve-native-status.json. Nó tạo
VALVESOIL3channels, ZONE01/binding, đọc native packet và chỉnh timestamp cho
freshness gate. Không commandtransport hoặc debugHTTP được thêm để seed.
Hiện đã seed: không chạy lại/xóa dữ liệu. Các schema trước giữ lại, riêng
agriculture_overview_smoke đã nângV20, counts trước/sau bằng nhau.

## Chưa nghiệm thu

Sáu ca Windows/AWS/Wokwi trong chương32 đều Chưa chạy. Người dùng phải tạo
Thing/cert/policy riêng, cấu hình private đúngzone, buildfs/merge, cờ hai phía,
subscribe backend IAM rồi thử. Helper render không làm các bước provisioning.
Chưa GPIO/van/bơm vật lý, hydraulic sequencing, pump lease/coordinator, soil
rule, flow nhánh, feedback position, NVS hoặc fleet enrollment chung. Không
báo A3 hoàn tất hoặc status GPIOCLOSED là van cơ khí đã đóng.
