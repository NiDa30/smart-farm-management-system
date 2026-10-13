# Chương 10 — Command, ACK và timer an toàn trên Wokwi

Bản thực hành này dùng ENV01 hiện có và đầu ra logic PUMP01 trên GPIO26.
LED xanh mô phỏng đầu ra; chưa điều khiển bơm vật lý, chưa có phản hồi dòng điện
hoặc lưu lượng. Code/tests đã kiểm tra trong cloud; chưa có bằng chứng control
live qua AWS/Wokwi của người dùng. Provisioning sensor thứ hai vẫn để sau.

## Ba sự kiện khác nhau

HTTP202 nghĩa backend đã xử lý yêu cầu gửi. MQTT PUBACK nghĩa broker xác nhận
publish QoS1, không phải relay đã đổi trạng thái. ACK ở stage EXECUTED từ firmware
mới xác nhận việc áp dụng đầu ra; status mới của PUMP01 biểu thị GPIO hiện tại.
ACK ON cũ vẫn có thể nằm trong lịch sử khi timer đã đưa relay về OFF.

Màn hình Điều khiển Actuator không hiển thị ON ngay khi người dùng bấm nút.
Nó hiển thị trạng thái thiết bị từ status; sau 15 giây không có status mới thì
trở thành UNKNOWN. Giao diện sensor và các số đo vẫn hoạt động riêng.

## Luồng command

API POST /api/v1/actuators/PUMP01/commands nhận action ON/OFF/RESET_LOCKOUT.
ON cần durationSeconds integer 1..30; OFF/RESET không có duration. Server tạo
UUID và timestamps UTC, expiresAt10 giây sau issuedAt. Lưu PENDING trước khi
publish để ACK đến nhanh không bị mất do record chưa tồn tại. Publish không
retained; bảng state đổi sang SENT chỉ nếu vẫn PENDING, không ghi đè ACK đã
được worker nhận trước đó.

Sau ACK báo ON, backend yêu cầu heartbeat OFF có sequence mới hơn ACK trong
cùng bootId trước khi cho bật tiếp; trạng thái OFF cache trước ACK không đủ.
ON cần status OFF mới, không lockout và không có command unresolved. OFF có
thể gửi ngay cả khi chưa có status mới, nhưng không được gọi là đã tắt nếu
chưa có ACK/status. Command chưa ACK quá expiresAt+5 giây được đánh dấu
TIMED_OUT khi history/create được gọi, không tự gán reportedState OFF.

Nếu publish không xác nhận, ghi PUBLISH_UNCERTAIN: packet có thể đã tới thiết
bị. Không tự retry ON bằng UUID mới. ACK hợp lệ đến sau vẫn có thể cập nhật
record chưa terminal. Endpoint history có20 lệnh gần nhất; chưa có pagination.

## Firmware là lớp giới hạn cuối

MQTT callback chỉ copy command nhỏ vào queue. Arduino loop kiểm tra topic,
retain flag, UUID, schema, action, lifetime và duration trước khi đổi relay.
Command retained bị từ chối để reboot không tự thực thi một ON cũ.

RelaySafety lưu cache 32 command IDs cho đến hết lifetime. Duplicate không
chạy lại ON và không gia hạn runtime, kể cả duplicate đến sau auto-OFF.
Nếu cache đầy, ON/reset bị từ chối; OFF hợp lệ vẫn có thể đưa đầu ra về OFF.
Không cho ON mới khi đang ON để tránh các request liên tiếp kéo dài một lần bật.

Timer esp_timer one-shot được arm trước khi energize GPIO, cắt trực tiếp đầu
ra ở deadline mà không chờ vòng DHT/MQTT. Vòng loop cập nhật lại model và status.
Khi callback MQTT báo mất kết nối, đầu ra cũng bị ép OFF; nếu loop phát hiện
link mất trong khi model đang ON thì bật lockout. Khóa nằm trong RAM, reset bằng
command khi OFF; reboot khởi động OFF và xóa state RAM, không persist lockout
NVS. Không tự bật lại sau reconnect/reboot.

Mất backend không nhất thiết làm mất kết nối ESP32→AWS; trường hợp đó timer
thiết bị vẫn giới hạn1..30 giây. Độ trễ phát hiện mất mạng phụ thuộc MQTT/transport;
không tuyên bố tắt ngay đúng lúc mạng vật lý đứt. Chưa có watchdog độc lập phần
cứng hoặc điện safety interlock. MQTT QoS1 cũng không bảo đảm DB commit.

## Bật demo trên Windows

Control mặc định tắt ở cả firmware và backend. Chỉ bật cho Wokwi/LED trong
bước này. Dừng backend và simulator trước khi cập nhật:

```bash
git pull --ff-only origin feat/day1-iot-foundation
./.local/day1-venv/Scripts/python.exe tools/backend/render_telemetry_iam.py --account-id ACCOUNT_ID --with-control
notepad .local/aws/backend-control-iam-policy.json
```

Dùng JSON vừa render tạo **customer managed policy** trong IAM → Policies →
Create policy, đặt tên SmartFarmBackendControl, rồi attach vào smartfarm-dev.
Cách này tránh quota inline policy đã gặp ở các chương trước. Policy giới hạn
Connect backend client, telemetry FARM001, PUMP01 command/status/ACK và echo;
không cấp AdministratorAccess. Không xóa provisioning hoặc runtime policy cũ
để làm bước này. Không sửa device certificate policy sang wildcard toàn hệ thống.
ENV01 device policy đã có publish PUMP01 ACK/status và subscribe command.

Trong ignored firmware/esp32/config/config.local.h, thêm:

```cpp
#define FARM_CONTROL_ENABLED 1
```

Giữ deviceIdENV01, farmIdFARM001, endpoint và Wi-Fi đang hoạt động. Flag chỉ có
tác dụng cho đúng ENV01/FARM001; đầu ra mới trong diagram là LED GPIO26.
Build firmware rồi merge image dùng LittleFS đã có:

```bash
./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir firmware/esp32 -j 2
./.local/day1-venv/Scripts/python.exe tools/wokwi/merge_flash.py
```

Không cần tạo lại certificate hoặc buildfs nếu certificate chưa đổi. Khi merge
trên Linux với custom PLATFORMIO_CORE_DIR, dùng --core-dir tương ứng. Giữ image
riêng tư vì vẫn chứa private key. Wokwi config mới có private gateway thì giữ
chạy gateway. Chạy simulator, xem log Relay control enabled và MQTT connected.

Sau khi IAM có hiệu lực và database healthy:

```bash
SMARTFARM_CONTROL_ENABLED=true bash tools/backend/run_backend_windows.sh
```

Terminal khác chạy npm run dev, mở IoT → Điều khiển Actuator. Đợi status OFF
mới và control enabled. Chọn3 giây, bấm Bật có thời hạn; quan sát LED, ACK và
status. LED phải tự tắt. Không chạy probe/backend thứ hai cùng client ID.

Nếu cần quay về chỉ đọc telemetry, dừng backend và chạy lại không có flag
SMARTFARM_CONTROL_ENABLED; mặc định false không subscribe các topic control
và không cho POST command. Tắt flag firmware về0 rồi rebuild/merge nếu muốn
vô hiệu hóa control trên thiết bị; giữ dữ liệu/certificate hiện có.

## Kiểm chứng đã thực hiện

Cloud: firmware PlatformIO ESP32 compile thành công, bao gồm variant flag1.
Một mirror toolchain/framework bị proxy403 nhưng mirror thay thế tải/cài được;
TLS verification không bị tắt. Native C++ assertions kiểm tra auto-OFF,
duplicate không gia hạn/restart, expired/duration quá giới hạn, disconnect
lockout/reset, millis wrap và OFF khi dedup cache đầy.

16 Java tests đạt trên PostgreSQL thật, gồm schema migration và các tests cũ.
Các tests control dùng transport mock, không gọi AWS: ACK trước publish
completion, unknown publish delivery, timeout, fresh-OFF/lockout gates và
correlation ID. Lint/build đạt, browser fixture test kiểm tra flag disabled,
input31 giây bị chặn, SENT không hiển thị ON, status/ACK, lockout và stale.
HTTP status qua proxy thật ở mode disabled trả UNKNOWN/controlEnabled=false.

Tests và compile không chứng minh GPIO runtime hoặc broker permissions live.
Cần người dùng chạy trên Wokwi để ghi evidence: ON3 giây → ACK → autoOFF;
OFF trước deadline; lệnh trùng không kéo dài; gateway outage → OFF/lockout nếu
được phát hiện khi đang ON; reconnect không tự bật; reset chỉ khi OFF. Sau đó
mới đánh dấu gate control live đạt. Safety event v1/SAFETY_TRIP chưa được publish
và lưu ở bước này; heartbeat/status và command history hiện là evidence chính.

## CLOCK_SKEW trong Wokwi

Nếu COMMAND_TIME có age âm, đồng hồ ESP32 đang chậm hơn issuedAt. Ví dụ
age=-9 giải thích vì sao ON bị từ chối và LED vẫn OFF. Đồng bộ Windows time,
khởi động lại Wokwi; firmware mới yêu cầu NTP cập nhật mỗi 15 giây.
Để thử mô phỏng, đặt trong config/config.local.h (sau include config.example.h):

```cpp
#undef FARM_WOKWI_CLOCK_TOLERANCE_SECONDS
#define FARM_WOKWI_CLOCK_TOLERANCE_SECONDS 10
```

Build lại firmware, merge lại private flash rồi restart simulation. Mặc định
vẫn 2 giây; dung sai 10 chỉ áp dụng SSID Wokwi-GUEST. Expiry kiểm tra theo
clock thiết bị nên clock chậm vẫn tạo bất định về độ mới của lệnh; không dùng
cách này cho bơm thật. Nếu lệch quá 10 giây vẫn từ chối, cần sửa nguồn giờ.
Thử ON 3 giây một lần: yêu cầu ACK SUCCESS, LED sáng rồi tự tắt. Chưa có
kết quả live xác nhận bản sửa này.
