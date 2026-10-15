# Chương 32 — Controller riêng cho một van mô phỏng

Ngày **15/10/2026, giờ Việt Nam**. Đây là bước đầu controller A3 sau SOIL,
vùng tưới và [ước tính nước](CHAPTER_31_WATER_VOLUME.md): **IRRIGATION01 /
VALVE01** trên ESP32 riêng. GPIO26 điều khiển LED xanh, chưa gắn bơm hoặc van
thật. Không đổi tên/firmware/certificate ENV01/PUMP01. Tất cả flags mặc định
tắt; bài này chưa hoàn thành coordinator, tưới tự động theo vùng hoặc bốn dãy.

## 1. Danh tính và binding

Controller là danh tính MQTT vật lý IRRIGATION01; VALVE01 là đầu ra logic.
Backend V20 có bảng binding singleton, command ledger và status. Đây là demo
cố định riêng, chưa thêm nodeType IRRIGATION vào inventory ENV/WATER/SOIL hay
chứng minh fleet enrollment tổng quát. Hai ID được dành riêng bằng CHECK;
monitor helper cũng từ chối dùng chúng. Nếu DB trước đó đã dùng hai ID này
cho sensor/monitor, migration báo xung đột; không tự đổi hoặc xóa thiết bị cũ.

Binding chọn một zone SOIL nguồn SIMULATOR, lưu zoneRevision và revision của
binding. Lần đầu có thể lưu khi chưa có controller online vì chưa phát lệnh.
Đổi/xác nhận lại cần GPIO CLOSED mới và status đã theo kịp mọi lệnh của boot.
Firmware phải đặt cùng zoneId; bind sai có thể sửa khi controller báo CLOSED.
Sửa ngưỡng/source/revision zone làm khóa OPEN mới đến khi xác nhận binding
hợp lệ. Không tự hủy một lệnh manual đã chấp nhận chỉ vì chỉnh zone.

Không kiểm đất khô để mở manual LED, không dùng survey2/3 làm quyền bật bơm.
Không giữ quyền bơm chung hoặc ngăn rule PUMP01; rule ENV01 vẫn độc lập.

## 2. Chặn lệnh trùng, đến muộn và nhầm lần khởi động

Mỗi HTTP request có UUID, bindingRevision, requestedAt và boot dự kiến cho
OPEN. Backend khóa row binding và kiểm trạng thái CLOSED mới nguồn+receipt
15s, clock không quá2s tương lai, source SIMULATOR, đúng zone/revision và mọi
lệnh cùng boot đã được status lastOrdinal phản ánh. Query không giới hạn20.

Tracking được commit trước publish. Sau publish mới đổi PENDING→SENT nếu ACK
chưa tới. Khi publish không rõ kết quả, giữ PUBLISH_UNCERTAIN. Cùng requestId
không phát lần nữa; GET ID đọc được cả ngoài preview20. SENT/PENDING/uncertain
không tự thành EXECUTED vì hết timeout. Chỉ ACK hợp lệ ghi terminal verdict;
trạng thái GPIO hiện tại đọc từ status riêng. Không replay command khi restart. UI giữ GPIO chưa xác định khi đang gửi,
kết quả HTTP chưa rõ hoặc ledger còn ordinal mới hơn status; không dùng
CLOSED cũ để khẳng định trạng thái sau một lệnh mới.

Hai lớp chặn CLOSE→OPEN muộn:

1. HTTP OPEN có requestedAt trong10s quá khứ/2s tương lai. CLOSE lưu mốc chặn
   serverNow+2s trong cùng transaction; OPEN yêu cầu trước/đúng mốc bị từ chối,
   kể cả nó đến backend sau CLOSE. OPEN mới chờ hết mốc và trạng thái phù hợp.
2. MQTT command có ordinal tăng đơn điệu trong ledger. Firmware nhớ ordinal
   cao nhất trong RAM; CLOSE mới chặn OPEN cũ tới muộn. Duplicate không kéo
   dài timer. OPEN target boot UUID ngẫu nhiên hiện tại, nên reboot không làm
   sống lại lệnh cũ; CLOSE được phép đóng qua boot thay đổi.

Ledger có20 dòng preview; user không cần tự gửi lại khi HTTP lỗi. UI giữ ID,
cho GET đối chiếu;404 chưa đủ kết luận request cũ không thể tới sau. CLOSE
vẫn dùng được khi OPEN chưa rõ. API và thiết bị đều có gate riêng; frontend
không thay thế kiểm tra backend/firmware. Đây chưa phải API auth/RBAC đa người dùng.

## 3. GPIO đóng độc lập luồng MQTT

Firmware riêng tại firmware/irrigation-node, diagram LED26/330Ω/GND. Bật tối
đa1–30s; yêu cầu mới khi đang OPEN trả BUSY và không gia hạn. ESP software
timer kiểm mỗi25ms, đóng khi hết hạn hoặc mất kết nối được phát hiện, kể cả
loop đang bận network/JSON. Subscribe command thành công mới báo demo sẵn sàng.
Queue lỗi/full hoặc timer lỗi làm đầu ra CLOSED và khóa demo đến reboot.

Mất Internet không có thời gian phát hiện tức thì: Wi-Fi event/MQTT keepalive
và lỗi transport quyết định lúc phát hiện. Timer task không phải watchdog phần
cứng hoặc bảo vệ van/bơm được chứng nhận. Không NVS, không giữ OPEN/latch qua
reboot; boot và reconnect không tự bật. Output polarity cố định LOW=CLOSED.

Status/ACK ghi dataSource SIMULATOR, feedbackState UNKNOWN. ACK chỉ báo GPIO
firmware áp dụng, không chứng minh van cơ khí đã mở hoặc có nước. ACK muộn
không ghi đè status mới hơn. Command retained/fragmented/escaped/duplicate-key
bị loại. Không subscribe hoặc publish PUMP01 từ project này. Hợp đồng đầy đủ
ở [valve v1](../../contracts/irrigation/v1/README.md).

## 4. Chạy trên Windows

Giữ PostgreSQL, key và config đang có; pull branch và restart backend để
Flyway V20 chạy. Backend/frontend/gateway ở các terminal riêng như
[runbook](WINDOWS_RUNBOOK.md). UI: **Điều khiển Actuator → Mở controller van
mô phỏng**. Tạo vùng nguồn SIMULATOR trước nếu chưa có; chọn vùng và Lưu binding.

Tạo **Thing IRRIGATION01** và certificate riêng trong AWS IoT Singapore, không
copy PEM ENV/WATER/SOIL. Helper mới chỉ render policy, không provision:

```bash
./.local/day1-venv/Scripts/python.exe tools/aws/render_irrigation_policies.py \
  --region ap-southeast-1 --account-id ACCOUNT_ID
```

Thay ACCOUNT_ID bằng tài khoản của bạn. Output có hai object: devicePolicy
cho IoT policy gắn certificate IRRIGATION01; backendAdditionalIdentityPolicy
là IAM inline policy bổ sung cho user/role backend. Chỉ lấy **object bên trong**
tương ứng khi dán AWS editor, không dán toàn bộ wrapper. Giữ permissions cũ;
không thay policy PUMP01 hoặc gán AdministratorAccess. Backend additions chỉ
publish VALVE01/command, subscribe/receive VALVE01/status+ack; quyền connect
backend đã có ở cấu hình cũ. Device policy connect IRRIGATION01 và chỉ ba
leaf VALVE01 cần thiết, không wildcard/retained publish.

Trong Console: certificate ACTIVE, attach Thing IRRIGATION01 và IoT device
policy vừa tạo. Tải cert/private key một lần vào thư mục local riêng; không gửi
key vào chat hoặc commit. Sao chép config.example.h → config.local.h (ignored)
ở firmware/irrigation-node/config; đặt endpoint IoT ATS đầy đủ, zoneId đúng
binding, IRRIGATION_DEMO_ENABLED1, IRRIGATION_SIMULATOR1. Không dùng ID ENV01
hay certificate đã dùng cho board khác. Chỉ chuẩn bị filesystem sau khi tạo
quyền thư mục private bằng helper hiện có, như các chương trước:

```bash
./.local/day1-venv/Scripts/python.exe -c 'import runpy; from pathlib import Path; m=runpy.run_path("tools/aws/provision_day1.py"); m["prepare_private_directory"](Path("firmware/irrigation-node/data").resolve())'
```

Đặt đúng device.pem.crt, private.pem.key của IRRIGATION01 và AmazonRootCA1.pem
(trust store Amazon chính thức) trong data/. Không copy một thư mục data có
key board cũ. Build/buildfs/merge bằng cùng core-dir PlatformIO:

```bash
./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir firmware/irrigation-node
./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir firmware/irrigation-node -t buildfs
./.local/day1-venv/Scripts/python.exe tools/wokwi/merge_flash.py --project-dir firmware/irrigation-node
```

Mở đúng diagram firmware/irrigation-node/diagram.json với VS Code Wokwi và
license/gateway đã có. Flash merged chứa key, chỉ giữ local, không upload lên
project công khai. config.local.h có precedence, chỉnh example không sửa
private config đã tồn tại. Đồng hồ NTP cần đúng; không nới expiry để giấu lỗi.

Backend chỉ opt-in sau khi IAM bổ sung và đúng simulator đã sẵn sàng:

```bash
export SMARTFARM_IRRIGATION_DEMO_ENABLED=true
bash tools/backend/run_backend_windows.sh
```

Giữ cấu hình AWS/profile/database cũ. Cờ mới độc lập SMARTFARM_CONTROL_ENABLED;
không cần bật PUMP01 để thử van. Đợi status cùng vùng, demo bật và GPIO CLOSED
mới; bấm mở5s, theo dõi ACK/status và LED riêng. Đóng không khẳng định bơm đã
dừng vì controller này không điều khiển bơm. Nếu IAM/simulator chưa chuẩn bị,
để cờ false và chỉ xem màn/khai báo binding, không suy là đã có thiết bị live.

## 5. Bằng chứng cloud và lỗi đã gặp

| Kiểm tra | Kết quả |
|---|---:|
| Backend verify/PostgreSQL riêng |212/212, skip0|
| Trong đó irrigation + disabled flag |17+1|
| Browser API fixtures cuối |9/9|
| Unit frontend |2/2|
| Python policy/reserved IDs + WATER/SOIL regression |3+17+7 đạt|
| Native model/parser/packet, -Wall -Wextra -Werror |Đạt|
| ESP32 public build mặc định và opt-in + buildfs + merge4MiB |Đạt|
| Lint/build |Đạt, cảnh báo Vite cũ còn|
| Full-app/API/PostgreSQL |Pump→valve→pump, chỉ GET, dispatch tắt|

Lượt backend đầu lỗi compile helper test status che tên matcher status(), đổi
helper thành reportStatus. Native đầu -Werror báo misleading-indentation, tách
dòng giữ nguyên cảnh báo nghiêm ngặt. Sau đó209 pass; bổ sung HTTP close fence/
request boot và flag-off test rồi212 pass. V20 lúc phát triển được sửa trước
bàn giao; chỉ các bảng/constraint/history V20 mới tạo của schema telemetry_test
được dựng lại để validate checksum, không reset demo hoặc fixture dữ liệu cũ.

Smoke full-app đầu lỗi NameError vì viết tùy chọn Playwright Python theo cú
pháp JS; sửa exact=False rồi chạy lại đạt. Đây là lỗi driver/test, không lỗi
AWS hoặc GPIO. Browser8 pass trước thêm zone-version, cuối9 pass. Lượt browser sau đó8 đạt/1 fail ở ca expiry: tick1s và polling bản chụp cùng
asOf có thể kéo dài khẳng định mới. UI nay giữ mốc server+monotonic không lùi
qua polling; test dùng đồng hồ mô phỏng kiểm bản chụp lặp, cuối9/9 đạt. Không
tăng timeout hoặc bỏ assertion. Parser native cũng kiểm JSON nối thêm ở cuối.
Không gọi lượt fail là pass hoặc gán fixture local thành nghiệm thu live.

Native encoder phát status BOOT/SIMULATOR/UNKNOWN→Java receive→PostgreSQL
schema irrigation_demo_smoke; timestamp được cập nhật để qua gate freshness.
Có một zone/binding revision2, status CLOSED/lastOrdinal0, không valve command,
pump command/run0. Full-app cờMQTT/control/demo false, chỉ đọc và điều hướng.
V19→V20 trên agriculture_overview_smoke giữ4packet/12reading/1zone/soil-open2/
water-open1/pumpcommand0/run0, không tự bind controller. Không seed lại để làm
mẫu mới. Xem [bàn giao](../implementation/LOCAL_IRRIGATION_VALVE_REPORT.md).

## 6. Các ca live còn phải thử

| Windows/AWS/Wokwi mới | Trạng thái |
|---|---|
| Hai cờ opt-in, cert/policy riêng, đúngzone,5s OPEN→ACK→LED→timer CLOSED |Chưa chạy|
| CLOSE sớm và MQTT OPEN cũ/duplicate không bật lại hoặc gia hạn |Chưa chạy|
| HTTP OPEN chậm tới sau CLOSE bị chặn; request sai boot bị từ chối |Chưa chạy|
| Tắt gateway khi OPEN, đo thời gian phát hiện/đóng; reconnect không tự mở |Chưa chạy|
| Reboot simulator, OPEN cũ không tác động, status mới là CLOSED |Chưa chạy|
| Backend restart giữa lệnh, không replay; đổi zone/revision khóa OPEN |Chưa chạy|

Chưa position switch, flow nhánh, valve driver/điện, fail-close cơ khí, pump lease,
trình tự thủy lực, soil-driven rule, NVS hoặc triển khai4dãy. Không nối tải thật
để nghiệm thu dựa trên ACK/LED prototype. Các phần này là mốc A3 tiếp theo.
