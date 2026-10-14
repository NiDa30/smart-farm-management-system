# Chương 21 — Relay tưới và phao cạn nước trên simulator

Ngày 14/10/2026, người dùng chưa thấy thiết bị thay đổi sau khi bổ sung lịch
tưới. Lịch V13 là tính năng backend/web; không tự thêm phần cứng vào Wokwi.
Đợt này cập nhật sơ đồ và firmware nông nghiệp, dùng lại ESP32 ENV01,
PUMP01 và các topic AWS hiện có. Không cần tạo Thing, certificate hoặc IAM mới.

## Các thiết bị trong sơ đồ

Mở `firmware/esp32/diagram.json` trong VS Code trước khi Start Simulator.
Thư mục `wokwi/` ở gốc là ví dụ HiveMQ cũ, không chạy firmware AWS mới.

| Thiết bị | Chân / ý nghĩa | Thao tác |
|---|---|---|
| ESP32 ENV01 | Kết nối Wi-Fi/AWS và xử lý cục bộ | Boot luôn OFF |
| DHT22 | GPIO15, nhiệt độ / độ ẩm không khí | Bấm cảm biến để đổi giá trị |
| Núm độ ẩm đất | GPIO34, ADC thấp=ướt, cao=khô | Xoay núm để thử quy tắc |
| Relay PUMP01 | IN GPIO26, tải qua COM–NO | Điều khiển từ web |
| LED tải | Điện trở 220Ω qua tiếp điểm NO | Quan sát mô phỏng tải bơm |
| Công tắc phao | Chân giữa 2→GPIO27; chân trái 1→GND | Trái=có nước; phải=cạn |

Chân 3 của công tắc không nối. GPIO27 INPUT_PULLUP: đóng về GND là có nước;
mạch hở hoặc mất dây là cạn. Không đo phần trăm nước, lít/phút hay điện năng.
Relay module dùng `transistor=pnp` theo mô tả Operation của Wokwi để HIGH
nối COM–NO, với `FARM_RELAY_OFF_LEVEL LOW`. Cần xác nhận cực tính bằng ca thử
boot/OFF/ON bên dưới; build cloud không mô phỏng tiếp điểm.

Tham khảo [relay Wokwi](https://docs.wokwi.com/parts/wokwi-relay-module) và
[công tắc Wokwi](https://docs.wokwi.com/parts/wokwi-slide-switch). Tài liệu
relay có bảng thuộc tính và đoạn Operation mô tả cực tính không nhất quán;
chưa coi cực tính tiếp điểm là đã nghiệm thu trước khi quan sát LED ở Wokwi.
Không nối bơm/điện lưới thật theo sơ đồ demo này.

## Cập nhật trên Windows

Tắt quy tắc tưới trên web, xác nhận OFF, Stop Simulator. Tại gốc repository,
Git Bash:

```bash
git pull --ff-only origin feat/day1-iot-foundation
```

Mở file riêng `firmware/esp32/config/config.local.h`. **Giữ endpoint, Wi-Fi
và các cài đặt riêng đang dùng**, bổ sung/sửa từng macro để mỗi tên chỉ có
một định nghĩa:

```cpp
#define FARM_CONTROL_ENABLED 1
#define FARM_RELAY_OFF_LEVEL LOW
#define FARM_WATER_INTERLOCK_ENABLED 1
#define FARM_WATER_LEVEL_PIN 27
```

File local cũ thiếu flag sẽ giữ interlock tắt để không làm hỏng sơ đồ trước.
Serial sẽ ghi `Water interlock disabled...`; phải bật flag và rebuild để phao
có tác dụng. File example mới bật flag phao nhưng control vẫn mặc định tắt.
Không chép đè file local bằng example vì sẽ mất endpoint riêng.

Build và ghép ảnh, tại gốc repository:

```bash
./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir firmware/esp32
./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir firmware/esp32 -t buildfs
./.local/day1-venv/Scripts/python.exe tools/wokwi/merge_flash.py
```

Dừng nếu một lệnh lỗi, xử lý rồi mới chạy lệnh kế tiếp. Buildfs dùng các PEM
đã provision trong `firmware/esp32/data/`; không hiển thị hoặc gửi nội dung.
Ảnh `.pio/build/esp32dev/wokwi-private/flash.bin` chứa khóa, giữ riêng trên
máy. `firmware/esp32/wokwi.toml` đã trỏ ảnh này. Chỉ build firmware.bin mà
không ghép lại flash.bin sẽ khiến Wokwi vẫn chạy chương trình cũ.

Restart backend bằng Git Bash mới sau khi PostgreSQL demo Healthy:

```bash
SMARTFARM_CONTROL_ENABLED=true bash tools/backend/run_backend_windows.sh
```

Giữ frontend và gateway ở terminal riêng như [Windows runbook](WINDOWS_RUNBOOK.md).
Mở đúng sơ đồ mới rồi chạy simulator. Serial cần có:

```text
SmartFarm starting; relay OFF
Wokwi relay control enabled
Water interlock enabled: GPIO27 closed=water, open=dry
```

Sau đó chờ Wi-Fi/NTP, MQTT connected và PUBACK. Quy tắc tự động giữ tắt trong
lần thử phao thủ công. Nếu startup LED đã sáng hoặc bấm ON lại làm LED tắt,
dừng simulator và đối chiếu relay/cực tính trước khi thử tiếp; chưa đánh dấu đạt.

## Luồng bảo vệ cạn nước

Firmware đọc phao ở đầu vòng lặp trước công việc network/sample và trước khi
áp dụng command. Cạn → OFF, hủy timer/active command, khóa RelaySafety,
`stateReason=WATER_LOW`. GPIO output còn kiểm tra trực tiếp đầu vào phao.
Cơ chế không chờ backend gửi OFF. Đây là kiểm tra trong vòng lặp, không phải
cam kết thời gian ngắt cứng hoặc bảo vệ công nghiệp được chứng nhận.

ON và RESET_LOCKOUT bị từ chối với ACK FAILED/WATER_LOW khi đang cạn, kể cả
commandId từng ON/RESET thành công trước lúc cạn. Kết quả từ chối cũng được
cache: duplicate RESET/ON đã bị từ chối lúc cạn không được thực thi khi có nước. OFF vẫn cho phép. Có nước
trở lại chỉ báo `WATER_RESTORED; reset lockout required`, không tự bật hoặc xóa
khóa. Sau reset thành công, phải gửi ON mới; ON cũ không tự phát lại.

Backend chấp nhận WATER_LOW trong status, lưu vào lịch sử hiện có; không cần
migration mới. Điều khiển Actuator, An toàn Fail-Safe & Edge và Event Log có
lý do tiếng Việt “Bồn cạn nước hoặc đứt dây phao”. Backend chặn ON khi status
fresh báo lockout. Reset trên web là một yêu cầu: firmware quyết định từ chối
nếu vẫn cạn. Lý do đã lưu không phải phép đo mức nước hiện tại khi status cũ.

Phao chưa được đưa thành cảnh báo riêng trong Trung tâm Cảnh báo, chưa có
email/push. NVS chưa làm: restart mất latch RAM; nếu phao vẫn cạn thì boot đọc
lại và khóa, nếu đã có nước thì không giữ lịch sử khóa cạn qua reboot. Boot vẫn
OFF và backend không tự bật lại quy tắc sau restart.

## Nhật ký nghiệm thu thực tế

Các ca dưới đây **chưa chạy trên Windows/AWS/Wokwi trong đợt cloud này**.
Ghi timestamp, ảnh LED, serial, commandId và status/ACK sau khi thử.

| Ca | Kết quả mong đợi | Thực tế |
|---|---|---|
| Phao trái, boot | LED tải OFF; status OFF; không tự ON | Chưa chạy |
| Phao trái, ON 10 giây | ACK SUCCESS/ON; LED qua NO sáng, timer tự OFF | Chưa chạy |
| ON rồi chuyển phao phải | LED tắt; WATER_LOW; status OFF/locked | Chưa chạy |
| Đang cạn, reset | ACK FAILED/WATER_LOW; vẫn khóa; OFF vẫn được | Chưa chạy |
| Trở về trái | Không tự ON, chưa tự mở khóa | Chưa chạy |
| Trái + reset + ON mới | Reset SUCCESS/OFF; ON mới bật; timer vẫn hoạt động | Chưa chạy |
| Boot khi phao phải | OFF/locked trước kết nối AWS | Chưa chạy |
| Rút dây phao khi ON | Như cạn, không dùng reading giả | Chưa chạy |
| Đất khô nhưng phao khóa | Quy tắc không gửi ON khi status khóa fresh | Chưa chạy |

Cloud đã build ESP32 control=1/phao=1 và legacy thiếu flag mới; kiểm tra ba ca
sơ đồ tĩnh và native RelaySafety, ingestion
SQL/backend và browser API fixtures. Đó không phải bằng chứng tiếp điểm relay,
phao vật lý, GPIO live hay lượng nước đến cây.

Smoke toàn app dùng API/PostgreSQL thật trong schema test `reservoir_smoke`,
MQTT/control tắt, status WATER_LOW được seed SQL, đã đọc lý do trên Safety và
Control; command0/run0 giữ nguyên. Không gọi đó là phao gửi dữ liệu thật.
