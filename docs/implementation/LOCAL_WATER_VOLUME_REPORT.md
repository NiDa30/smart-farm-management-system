# Bàn giao ước tính lượng nước FLOW — 15/10/2026 (giờ Việt Nam)

## Thay đổi

API read-only `/api/v1/nodes/{nodeId}/channels/{channelId}/water-volume` và màn
Tiêu thụ Nước & Điện thay các tổng mẫu bằng phép tính TRAPEZOID_V1 trên FLOW
L/min lịch sử. Chọn source/range/kênh cụ thể, giữ0, unknown khi không đủ đoạn,
coverage/uncovered và đếm lý do loại. Tách calibration, nhiều nhóm không có tổng.

Cặp liên tiếp trong toàn bộ node_sample, LEFT JOIN giữ packet thiếu FLOW;
không lọc nguồn/quality trước rồi bridge qua dữ liệu mất. Same source/boot,
sequence+1/calibration,0<gap≤15s, VALID finite≥0, source≤receipt+2s,
receipt≤source+30s. Không ngoại suy hai mép [from,to), tối đa24h,25.000 packet;
422 khi vượt cap/numeric range. Không trả tổng truncated, không ghi dữ liệu.

UI lấy WATER/FLOW registry thật; đổi scope/loading/error thì ẩn kết quả trước,
request cũ không override mới. Dateinput rỗng được guard; so scope bằng instant
vì Java không giữ .000Z của JS. Tab Điện ghi chưa có đo, bỏ kWh/cost/leak mock.
Không đổi schemaV19, firmware/IAM/provision, ENV01 rule/command. Lịch sử kênh
nước có hướng dẫn sang màn tiêu thụ, vẫn hiển thị raw samples như cũ.

## Kiểm tra đã chạy

| Phạm vi | Kết quả |
|---|---:|
| Full Maven verify/PostgreSQL test riêng |194/194, skip0|
| WaterVolumeTest trong tổng backend |15/15|
| Browser volume fixtures cuối |16/16, skip0|
| Unit parser/scope/URL cuối |5/5|
| Lint/build |Đạt|
| Full-app thật/API/PostgreSQL |GET-only, retained AGWATER0, range/coverage/source/Điện đạt|

Browser đầu14/14, thêm canonical timestamp15/15, rồi metadata refresh16/16 cuối; unit đầu4/4,
sau thêm scope chuẩn hóa cuối5/5. Không test fail hoặc skip. Không chạy ESP
build vì firmware không đổi; không gọi AWS/Wokwi hay đọc private config/keys.

Từ root repo với smartfarm-cloud-test55439 riêng, không dùng demo5433:

```bash
JAVA_HOME=/workspace/toolchains/jdk-21.0.12.1 MAVEN_USER_HOME=/workspace/.m2 \
MAVEN_OPTS='-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts' \
SMARTFARM_TEST_DB_URL='jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=telemetry_test' \
SMARTFARM_DB_USER=smartfarm_test SMARTFARM_DB_PASSWORD='' \
bash backend/mvnw -B -f backend/pom.xml -s /workspace/toolchains/maven-settings.xml \
 -Dmaven.repo.local=/workspace/.m2/repository verify
CHROMIUM_PATH=/usr/bin/chromium npm run test:volume
node --import tsx --test src/modules/iot/resources/waterVolumeApi.test.ts
npm run lint
npm run build
```

Dừng đúng owned JVM trước Maven repackage. Runtime cuối giữ **agriculture_overview_smoke**
như chương30; backend jar8080 và Vite3000, testPostgreSQL55439. Lệnh startup:

```bash
SMARTFARM_DB_URL='jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=agriculture_overview_smoke' \
SMARTFARM_DB_USER=smartfarm_test SMARTFARM_DB_PASSWORD='' \
SMARTFARM_MQTT_ENABLED=false SMARTFARM_CONTROL_ENABLED=false \
/workspace/toolchains/jdk-21.0.12.1/bin/java -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts \
 -jar backend/target/smart-farm-backend-0.1.0-SNAPSHOT.jar \
 --spring.flyway.schemas=agriculture_overview_smoke --spring.flyway.default-schema=agriculture_overview_smoke
```

Không tạo container/schema/fixture hoặc seed mới. Giữ AGWATER hai packetFLOW0
SIMULATOR, delta1s; AGSOIL/AGZONE/alerts cũ. Tất cả4packet/12reading/1zone/
3binding/soil-open2/water-open1/soilACK1,command0/run0 giữ nguyên. Dữ liệu
lịch sử không cần mới hiện tại, chỉ cần range đúng; không sửa timestamp/seed.

```bash
python tools/frontend/smoke_water_volume.py
```

Script guard localhost3000+safety DISABLED/controlfalse+đúng AGWATER fixture;
tự lấy range5s từ timestamp lưu, browser timezone VN.0lít/1s phủ20%, thiếu4s;
PHYSICAL không có đoạn, tab Điện chưa có dữ liệu. Chặn writes/external, không
có API ingestion thử được thêm vào production. Read-only smoke không chứng
minh AWS/Wokwi, GPIO hoặc độ chính xác cảm biến thật.

175 liên kết nội bộ không thiếu đích, git diff --check đạt.

Logs /tmp/water-volume-{backend,browser,browser-final,unit,unit-final,lint-final,
build,runtime,smoke-app}.log; ảnh /tmp/water-volume-full-app.png. Backend kiểm
cả nonzero variable flow, subsecond, cap25001 và overflow; full-app giữ nguyên
fixture0 để kiểm unknown khác0 và không gọi đó là phép đo nonzero live.

## Bàn giao

[Chương31](../book/CHAPTER_31_WATER_VOLUME.md) và Windows runbook đã cập nhật.
Pull/restart cả backend/frontend; UI mới cần API mới. Chưa nghiệm thu5ca
Windows/AWS/Wokwi, chưa cumulative pulse counter, m³ chuẩn đo lường, kWh,
chi phí, chia nước cho cây/zone hoặc suy rò rỉ. Controller/valve/coordinator A3
vẫn chưa làm; tính lịch sử này không cấp quyền bơm hoặc thay rule ENV01.
Các màn analytics có mock khác không nằm trong phạm vi lượt này.
