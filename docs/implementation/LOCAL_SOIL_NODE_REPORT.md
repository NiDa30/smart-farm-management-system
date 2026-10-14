# Bàn giao SOIL nhiều điểm — 15/10/2026 (giờ Việt Nam)

## Kết quả

A3 bước đầu: một SOIL node/v2 có nhiều kênh SOIL_MOISTURE/%, UI và firmware
mô phỏng ba điểm SOIL1/SOIL2/SOIL3. Có POST `/api/v1/nodes/soil`, snapshot
cùng registry, history/filter/cursor/CSV theo từng điểm. Migration V17 mở rộng
constraint SOIL, không thay schemaVersion nước/ENV và không đổi PUMP01.

Chưa có IRRIGATION01/valve command/coordinator/soil-rule, soil alerts, NVS,
phần cứng soil đã hiệu chuẩn hoặc nghiệm thu AWS/Wokwi/GPIO thật mới. Rule
hiện tại vẫn dùng ENV01. Ba điểm cùng khu vực của node, chưa có zone riêng.

## File chính

- Backend: NodeInventory/NodeController, TelemetryRouter, WaterTelemetry
  (entry parse nước vẫn strict; parseChannels dùng envelope chung), WaterHistory.
- V17__soil_nodes.sql; SoilNodeTest (8 ca), soil-firmware-packet.json từ native
  encoder thật SoilPacket.h; schema/mẫu riêng trong contracts/iot/v2.
- nodeApi, WaterNodesPanel, WaterHistoryPanel; form ba kênh đất, source và
  calibration riêng, đọc đối chiếu khi create không rõ kết quả. Giữ nhãn nút
  vào màn hình Node & trạm nước để không thay đường điều hướng hiện có.
- firmware/soil-node: ADC1 34/35/32, fault switches 27/14/25, SIMULATOR-only,
  lấy mẫu 5 giây, không command output. Giữ fault=null, 0/100 hợp lệ.
- Helper WATER được thêm `--node-type SOIL`, mặc định WATER giữ nguyên.
  `.local/aws/NODE` manifest có loại; `.local/soil-nodes/NODE` project độc lập.
  Không tự sửa Thing/manifest loại khác, không tạo lại cert khi request chưa rõ.
  .gitignore thêm private config/data/.pio cho source SOIL.
- SoilNodeSmokeFixture.java (schema cố định/disabled flags trước Spring),
  smoke_soil_node.py GET-only; cập nhật nhãn quay lại trong smoke nước cũ.

## Kiểm tra đã chạy trên cloud

| Kiểm tra | Kết quả | Phạm vi |
|---|---:|---|
| Backend Maven verify | 152/152, skip0 | PostgreSQL test riêng; gồm 8 ca SOIL |
| Browser node/history | 22/22, skip0 | API fixtures, gồm 4 ca SOIL |
| Unit node/history frontend | 13/13, skip0 | Parser/freshness/CSV |
| Python WATER hồi quy | 17/17 | SDK/file mocks, contract/sơ đồ |
| Python SOIL | 7/7 | SDK/file mocks, nguồn/project, sơ đồ, JSON Schema |
| Native C++ | 1 executable đạt | Mapping/reverse/saturation/fault/config và encoder production |
| ESP32 SOIL firmware | SUCCESS | Public config, endpoint rỗng, project /tmp |
| buildfs/merge flash | SUCCESS, 4 MiB, FS 0x290000 | FS chỉ .gitkeep, không PEM/key |
| TypeScript lint / Vite build | Đạt | Còn warning __dirname/chunk cũ |
| V16→V17 | Đạt | flow_guard_smoke giữ OFF/FLOW_SENSOR_FAULT, history2, command0 |
| Toàn app/API/PostgreSQL | Đạt | Navigation, điểm độc lập, history/source/CSV, không API ghi |

Các test Python provisioning dùng FakeIoT/Session. Dòng “Monitor ... provisioned”
trong stdout test là **mock**, không phải bằng chứng AWS đã được tạo.
Native JSON được backend test cập nhật timestamp để kiểm tra nhận dữ liệu;
không giả làm packet live trên AWS. Browser API fixtures cũng tách với smoke
thật chạy backend/PostgreSQL bên dưới.

Log lần chạy: /tmp/soil-backend.log, soil-browser.log, soil-unit.log,
soil-water-regression.log, soil-tools-final.log, soil-firmware-final.log,
soil-buildfs.log, soil-merge-final.log, soil-lint.log, soil-build.log,
soil-fixture.log, soil-smoke-app.log, soil-upgrade-runtime.log.
Artifacts ảnh/CSV chỉ ở /tmp, không commit private flash hoặc dữ liệu cert.

Cloud dùng smartfarm-cloud-test, port55439, db/user smartfarm_test; không sửa
container smartfarm-mvp-postgres-1/port5433 của demo. Backend test schema
telemetry_test; runtime cuối **soil_node_smoke** có 3 node_sample,
7 channel_sample, command0/run0. Mẫu SOIL2 cũ, SOIL1/SOIL3 mới hơn ở thời điểm
seed; sau 30 giây cả ba sẽ stale, không reseed để giả còn live.

## Lệnh kiểm tra cloud có thể chạy lại

Từ gốc repo, cùng PostgreSQL test riêng đang sẵn sàng:

```bash
JAVA_HOME=/workspace/toolchains/jdk-21.0.12.1 MAVEN_USER_HOME=/workspace/.m2 \
MAVEN_OPTS='-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts' \
SMARTFARM_TEST_DB_URL='jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=telemetry_test' \
SMARTFARM_DB_USER=smartfarm_test SMARTFARM_DB_PASSWORD='' \
bash backend/mvnw -B -f backend/pom.xml -s /workspace/toolchains/maven-settings.xml \
  -Dmaven.repo.local=/workspace/.m2/repository verify

CHROMIUM_PATH=/usr/bin/chromium npm run test:nodes
node --import tsx --test src/modules/iot/nodes/nodeApi.test.ts src/modules/iot/nodes/waterHistoryApi.test.ts
PYTHONPATH=/tmp/control-pio python -m unittest discover -s tools/tests -p 'test_soil*.py' -v
PYTHONPATH=/tmp/control-pio python -m unittest discover -s tools/tests -p 'test_water*.py' -v
npm run lint
npm run build
```

Dừng backend cloud do chính phiên này chạy trước Maven repackage; không thay
jar trong lúc JVM dùng nó. Tests full cần SMARTFARM_TEST_DB_URL; helper Windows
không cấu hình test DB có thể skip integration, không gọi kết quả đó 152/152.

Runtime cuối: JDK21 chạy jar với SMARTFARM_DB_URL dùng schema soil_node_smoke,
SMARTFARM_MQTT_ENABLED=false, SMARTFARM_CONTROL_ENABLED=false và Flyway schemas
cùng soil_node_smoke. Frontend Vite3000 proxy8080. Smoke giữ dữ liệu đã seed,
không gửi HTTP ingestion hoặc gọi provisioning AWS; chạy
`python tools/frontend/smoke_soil_node.py` để đọc lại. Fixture seed không tự
chạy lại trên schema đã có SOIL01; không xóa dữ liệu để chạy lại.

## Windows và sách

Đọc [chương 27](../book/CHAPTER_27_SOIL_MULTIPOINT.md): pull/restart V17,
khai báo SOIL01 ba SIM_LINEAR_V1, render policy riêng, cấu hình quyền đúng,
chạy --apply khi sẵn sàng, chuẩn bị project rồi build/buildfs/merge. Chưa có
AWS operation trong phiên cloud này. Local dùng profile smartfarm đã có;
không gửi access key/key PEM lên chat/Git.

Sáu ca AWS/Wokwi ở chương 27 đều **Chưa chạy**. Muốn thấy phần cứng mới phải mở
`.local/soil-nodes/SOIL01/diagram.json` sau chuẩn bị, không refresh sơ đồ ENV01.
Chỉ tiếp tục coordinator van sau khi định nghĩa quyền dùng chung bơm, binding
zone/sensor, timeout/ACK/status/fail-safe; không dùng trung bình ba điểm để
phát ON vào hệ thống hiện tại.
