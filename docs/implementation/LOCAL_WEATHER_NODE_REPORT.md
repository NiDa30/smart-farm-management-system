# Bàn giao — WEATHER monitor V37

Ngày 16/10/2026, giờ Việt Nam. Nền `79c5423`, nhánh feat/day1-iot-foundation.
[Chương 51](../book/CHAPTER_51_WEATHER_NODE.md).

## Thay đổi

- V37 mở rộng node WEATHER/v2 và metric RAIN_DETECTED/boolean,
  LIGHT_ILLUMINANCE/lux 0–200000. Không seed node/sample/actuator.
- POST /api/v1/nodes/weather dùng validation/identity transaction chung.
  Router v2 giữ source/quality/calibration và chống trùng tuple; kiểm tra
  metric theo node type. History dùng API kênh chung, không thay v1/WATER/SOIL.
- Form thời tiết hai kênh; nhãn mưa riêng trong node/history/dashboard,
  CSV weather prefix. Stale/fault/clock-skew/API error không hiện “Không mưa”.
- Sửa clock màn node: asOf cũ ở lần poll mới không reset độ mới của mẫu.
  Giữ floor server time tiến theo performance.now. Không sửa timestamp DB.
- Firmware weather-node chỉ SIMULATOR: RAIN GPIO27, LIGHT ADC1 GPIO34,
  fault độc lập GPIO14/25; không actuator/command. Native model/packet header
  giống firmware; SIM_LUX_V1 là thang dial, không physical calibration.
- Provision/prepare helper thêm WEATHER, giữ default WATER/SOIL. Mỗi node
  có cert/project riêng; policy telemetry-only; TLS/key-pair và source-hash
  refresh guards giữ nguyên. Không chạy apply/cloud operation trong đợt này.

## Kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Backend toàn bộ PostgreSQL | 525 đạt, 0 fail/error/skip, 13 mới |
| Browser node/history/zone | 37 đạt, 8 mới |
| Browser dashboard | 17 đạt, 2 mới |
| Browser nhánh/phiên/history hồi quy | 75 đạt |
| Unit node/history/weather | 19 đạt, 6 mới |
| Python weather/contracts/helpers | 9 đạt |
| Python WATER / SOIL hồi quy | 17 / 7 đạt |
| Native model/production serializer | Đạt, fixture bằng example/resource |
| ESP32 / empty LittleFS / 4 MiB merge | Đạt, endpoint rỗng, không key |
| Lint/build | Đạt, cảnh báo Vite cũ còn |
| App thật / hai CSV / source filter | Đạt, GET-only, không ngoại mạng/page error |
| V36→V37 và migrate lần hai | 15 bảng bằng nhau, lần hai no-op |
| JVM restart / GET đọc | 8 bảng bằng nhau, không command/replay |

Targeted backend đầu 25/26 đạt: test so timestamp đã truncate nhưng JDBC
round microseconds. Sửa input test sang microseconds trước khi lưu, giữ
assert exact; targeted 26 và full 525 cuối đạt. Lượt browser node đầu 36/37
đạt phát hiện bug clock reset qua poll: sửa monotonic floor, không nới TTL.
Dashboard đầu 16/17 đạt do weather fixture dùng giờ mới hơn snapshot
monitoring cũ >2 giây: giữ chốt skew, sửa fixture cùng mốc snapshot.
Node37/dashboard17/circuits75 cuối đạt. Không bỏ assertion/skip hoặc cộng
lượt targeted thành tổng mới. Backend full chạy một lượt cuối.

Native compile đầu trỏ sai cache ArduinoJson; PIO đầu thiếu core-dir nên
đụng HOME read-only. Dùng cache public đã có và PLATFORMIO_CORE_DIR đúng,
build trên project chỉ copy public ở /tmp; không xin quyền HOME hoặc tắt
TLS. Merge helper in cảnh báo “Contains private key” chung cho flash riêng;
FS kiểm chứng ở đợt này chỉ có .gitkeep, không có khóa thực.

Log /tmp/weather-backend-targeted.log, -backend-final.log,
-browser-nodes-final.log, -browser-dashboard-final.log, -browser-circuits.log,
-unit.log, -python.log, -water-regression.log, -soil-regression.log,
-firmware-build.log, -firmware-fs.log, -firmware-merge.log, -lint-final.log,
-build.log. Hai log browser không suffix final giữ lượt lỗi đã chẩn đoán.

## Fixture và runtime

Schema **weather_node_smoke** riêng trên smartfarm-cloud-test, loopback55439,
DB/user smartfarm_test. Suite vẫn telemetry_test; không sửa demo5433/volumes
hay reset schema cũ. Fixture WeatherNodeSmokeFixture có guard schema/flags,
refuse reseed/evidence CREATE_NEW. Source native weather_packet_test.cpp
phát 5 packet từ WeatherPacket.h; router lưu 5 node_sample, 10 channel_sample.
Mưa false/true, lux zero/max, fault/null và phục hồi được kiểm tra; 0 command/run.
Không refresh timestamp hay replay fixture để làm dữ liệu mới.

`/tmp/weather-node-evidence.json` giữ node cuối + RAIN/LIGHT history;
`/tmp/weather-node-native-packets.jsonl` là packet synthetic đã ghi nhận.
`/tmp/weather-node-before-restart.json`, -after-restart.json và -after-reads.json
đối chiếu 8 bảng dữ liệu. Không tuyên bố toàn DB byte-identical: startup
vẫn có thể invalidate intent/epoch riêng. `/tmp/weather-v36-before.json`,
-v37-after.json đối chiếu 15 bảng trong irrigation_session_smoke trước/sau
Flyway-only, không Spring lifecycle; -v36-upgrade.log ghi no-op lần hai.

Backend 8080: /tmp/run-weather-node-backend.sh, starter
/tmp/start-weather-node-backend.py, PID/log /tmp/weather-node-backend.*.
Tất cả MQTT/control/fence/route/session/demo/monitor flags false. Trước kill
PID phải kiểm tra cmdline chứa JAR **và weather_node_smoke**. Startup functional
GET node đã đạt; đừng chạy script backend Windows dùng AWS thật trong cloud.

GET-only app readiness:

```bash
CHROMIUM_PATH=/usr/bin/chromium python3 tools/frontend/smoke_weather_node.py
```

Script đi menu thật, giữ mẫu cũ Unknown, chọn khoảng quanh evidence cho hai
history, kiểm tra CSV/raw clocks/sequence và PHYSICAL rỗng. Không reseed,
API write hoặc ngoại mạng. Log /tmp/weather-node-full-app.log và
-full-app-restart.log, PNG inventory, CSV -history-RAIN.csv/-history-LIGHT.csv.
Không dùng việc mở trang làm mới nguồn cảm biến.

Build public /tmp/smartfarm-weather-build dùng chỉ platformio/src/include/
config.example/data.gitkeep được liệt kê, blank endpoint. Native g++ include
cache /tmp/smartfarm-soil-build/.pio/libdeps/esp32dev/ArduinoJson/src.
PIO dùng PLATFORMIO_CORE_DIR=/workspace/.platformio và project Python venv;
không đọc repo private config/data/.local/.aws/PEM hoặc flash đã provision.

## Còn chờ

Năm ca Windows/AWS/Wokwi chương 51 **Chưa chạy**. Không có weather gate,
forecast, rainfall mm, physical lux/rain calibration hoặc actuator mới.
A3 coordinator nhiều nhánh/flow-proof/queue dispatch và A4 weather decision
vẫn mở. Nguồn PHYSICAL do packet khai báo, chưa chứng minh thiết bị thật.

Kiểm tra 572 liên kết tương đối trong tài liệu project/contracts: không thiếu đích; `git diff --check` đạt. Không tính cache dependency.
