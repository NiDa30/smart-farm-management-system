# Chương 26 — Bảo vệ thiếu lưu lượng tại bộ điều khiển

Ngày **15/10/2026, giờ Việt Nam**. Tiếp nối [trạm nước](CHAPTER_23_WATER_NODE_MONITOR.md)
và [history/CSV](CHAPTER_25_WATER_HISTORY.md). Đợt này thêm bảo vệ flow cục bộ
bật theo cấu hình riêng trên ESP32 ENV01 đang điều khiển PUMP01. Chưa phải
nghiệm thu bơm thật hoặc liên kết WATER01 với mọi controller.

## 1. Vì sao đặt bảo vệ ngay ở controller?

WATER01 theo dõi LOW/HIGH/FLOW qua telemetry riêng, nhưng network/backend có
thể chậm hoặc mất. ESP32 điều khiển bơm cần tự giám sát đầu vào quan trọng và
cắt GPIO mà không đợi lệnh OFF từ cloud. Ở prototype này, controller ENV01 có
**FLOW GPIO25 riêng**, phao GPIO27 và relay GPIO26. Không subscribe telemetry
WATER01 để giả đầu vào cục bộ; không đổi tên WATER01 thành ENV01.

Các xung clock trên sơ đồ Wokwi là tín hiệu điều khiển được, không phải nước
vật lý hay phản hồi tiếp điểm relay. Cùng mã PUMP01 và certificate ENV01 hiện
có, không cần tạo thêm IAM role, Thing hoặc policy chỉ để thử guard này.

## 2. Chu trình bảo vệ

Mặc định guard **tắt**, kể cả config.local.h cũ thiếu các macro mới. Pull code
không tự tuyên bố thiết bị đang được bảo vệ. Khi bật đúng cấu hình:

1. Boot GPIO OFF như trước, phao cạn vẫn khóa. ON mới được chấp nhận mới bắt
   đầu giám sát flow; gói ON trùng không gia hạn runtime hoặc thời gian mồi.
2. Bỏ qua thiếu dòng trong thời gian mồi, mặc định 5000 ms. Cửa sổ cuối thời
   gian mồi được bỏ toàn bộ; chỉ cửa sổ hoàn chỉnh sau đó tính low-flow.
3. Đếm rising edge bằng ISR, gom theo cửa sổ ít nhất 1000 ms. Rate dùng thời
   gian thực của cửa sổ, không giả định timer đúng tuyệt đối.
4. Hai cửa sổ liên tiếp có rate dưới minimumLpm làm GPIO OFF và khóa, reason
   FLOW_LOW. Một cửa sổ đủ flow làm lại chuỗi. Demo minimum=1 L/min.
5. Counter overflow, rate vượt maximumHz, cửa sổ kéo dài quá 2500 ms hoặc cấu
   hình không hợp lệ làm OFF/khóa với FLOW_SENSOR_FAULT. Lỗi tín hiệu không
   được bỏ qua chỉ vì đang mồi.

Rate = pulses × 60000 / elapsed_ms / pulses_per_litre. Clock 45 Hz với hệ số
450 cho khoảng 6 L/min. Đây là hệ số demo. Với callback đúng nhịp, mất xung
ngay từ ON thường ngắt khoảng 7 giây: 5 giây mồi + 2 cửa sổ 1 giây. Jitter có
thể làm muộn hơn; không coi con số 7 giây là thời hạn phần cứng đã nghiệm thu.

Timer flow gọi mỗi 250 ms ở ESP timer task, không nằm trong Arduino loop.
Callback không publish, đọc file, allocate JSON hoặc in Serial; nó giữ khóa
ngắn, đọc xung, đánh giá model và ép GPIO OFF. Loop sau đó cập nhật RelaySafety,
lý do/ACK/status. GPIO output gate kiểm tra cả forcedOff và latch flow. Timer
hạn ON cũ vẫn được arm trước khi cấp điện, không bị thay bằng MQTT hay flow.

Đây là hai software timer trong ESP32, không phải mạch cắt độc lập hoặc chứng
nhận chống mọi lỗi CPU/OS/tiếp điểm. Dừng GPIO không chứng minh bơm thật dừng.

## 3. Khóa và phục hồi

Khi flow lỗi, xung trở lại không tự ON hoặc xóa khóa. OFF thủ công cũng không
xóa latch. Sau kiểm tra nguyên nhân, gửi **Reset khóa** mới khi OFF và phao có
nước; ACK/status mới phải xác nhận không khóa. Reset chỉ chuẩn bị một lần thử
mới, không chứng minh đường nước/cảm biến đã tốt. ON mới mới có thời gian mồi.

Gói RESET cũ đã thành công trước lỗi không được dùng để xóa khóa mới. Gói ON
cũ không khởi động lại. Nếu cấu hình vẫn không hợp lệ, reset vẫn bị lỗi/khóa.
Mất mạng/phao cạn/timer ON kết thúc tiếp tục dùng hành vi cũ. Nếu nhiều nguyên
nhân trùng thời điểm, hồ sơ có thể chỉ ghi trạng thái cuối; không suy ra thứ
tự chính xác mọi sự kiện từ một reason.

NVS chưa làm: reboot mất latch RAM, nhưng boot vẫn OFF, không replay job/ON.
Reboot không phải cách xác nhận đã sửa lỗi hoặc khôi phục lần tưới cũ.

## 4. Bật trên máy Windows — chỉ Wokwi trước

Tắt rule và xác nhận demo OFF trước thay firmware. Pull, restart backend/UI
mới trước khi chạy firmware mới để parser nhận hai reason mới. Không có
migration sau V16 trong đợt này.

```bash
git pull --ff-only origin feat/day1-iot-foundation
```

Giữ PostgreSQL Healthy và chạy backend mới ở terminal riêng, dùng profile
đã cấu hình; không gửi access key vào chat:

```bash
SMARTFARM_CONTROL_ENABLED=true bash tools/backend/run_backend_windows.sh
```

Mở **firmware/esp32/config/config.local.h** trên máy bạn. Giữ nguyên endpoint,
Wi-Fi, ID và thông tin đang có. Sửa hoặc thêm từng define, mỗi macro chỉ có
một định nghĩa; đừng ghi đè toàn bộ config bằng đoạn ví dụ:

```cpp
#define FARM_CONTROL_ENABLED 1
#define FARM_WATER_INTERLOCK_ENABLED 1
#define FARM_WATER_LEVEL_PIN 27
#define FARM_FLOW_INTERLOCK_ENABLED 1
#define FARM_FLOW_PIN 25
#define FARM_FLOW_SIMULATOR 1
#define FARM_FLOW_PULSES_PER_LITRE 450.0
#define FARM_FLOW_MINIMUM_LPM 1.0
#define FARM_FLOW_MAXIMUM_HZ 2000.0
#define FARM_FLOW_GRACE_MS 5000
#define FARM_FLOW_CALIBRATION_VERSION ""
```

Adapter hiện giới hạn FLOW pin25 riêng và yêu cầu phao interlock bật; pin
trùng hoặc thiếu phao sẽ lỗi compile. Grace chỉ 1000–30000 ms, factor/min/max
phải hữu hạn/dương và phù hợp nhau. PHYSICAL mode (SIMULATOR=0) cần version
hiệu chuẩn không rỗng; tên version tự nó không chứng minh đã hiệu chuẩn hoặc
đầu vào đúng điện áp. Chưa hướng dẫn nối tải bơm thật ở bước prototype này.

Build từng lệnh tại gốc repo bằng Git Bash, dừng nếu lệnh trước lỗi:

```bash
./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir firmware/esp32
./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir firmware/esp32 -t buildfs
./.local/day1-venv/Scripts/python.exe tools/wokwi/merge_flash.py
```

Giữ data/PEM hiện có; không copy certificate WATER01 sang ENV01, không cần
tạo lại cert để chữa guard. Flash.bin chứa private key nên chỉ giữ local.
Chạy diagram **firmware/esp32/diagram.json** với flash.bin vừa merge và gateway
riêng đang chạy. Root legacy wokwi/diagram.json không có thiết bị mới này.

## 5. Công tắc nào trên simulator?

- Phao water_float GPIO27: trái=có nước, phải=cạn. Bắt đầu với có nước.
- FLOW mới pump_flow_gate GPIO25: trái=clock 45 Hz, phải=GND/không xung.
- Đèn tải qua relay NO vẫn GPIO26. Không bypass relay bằng dây mới.

Serial phải có FLOW_GUARD enabled source=SIMULATOR. Nếu thấy disabled, config
local chưa opt-in hoặc đang chạy flash cũ. Chỉ sửa config.example.h không có
tác dụng khi config.local.h tồn tại. Diagnostic có watching/sampled/lpm/fault;
rate đã lưu không là đo hiện tại khi watching=0, không biến nó thành telemetry
vật lý hoặc tổng lít đã tưới.

| Ca nghiệm thu local | Mong đợi | Đợt cloud |
|---|---|---|
| Gate trái, ON 20s | Có xung ~6 L/min, không flow lock; timer tắt bình thường | Chưa chạy Wokwi |
| Gate phải từ trước ON 20s | Sau mồi + hai cửa sổ thấp, LED OFF, FLOW_LOW, khóa | Chưa chạy Wokwi |
| Đang ON ổn rồi ngắt gate | Hai cửa sổ thấp sau giai đoạn mồi → OFF/khóa | Chưa chạy Wokwi |
| Gate trái trở lại sau lỗi | Không tự ON; cần reset mới rồi ON mới | Chưa chạy Wokwi |
| Chỉ ON 2s, gate phải | Timer OFF trước hết mồi, không tạo flow fault do run đã dừng | Chưa chạy Wokwi |
| Clock 5000 Hz | FLOW_SENSOR_FAULT vì vượt max, kể cả trong mồi | Chưa chạy Wokwi |
| Phao cạn khi flow vẫn có xung | WATER_LOW OFF/khóa vẫn ưu tiên | Chưa chạy Wokwi |
| Mất gateway | Cơ chế mất kết nối cũ OFF/khóa, không auto resume | Chưa chạy Wokwi |
| Reboot khi lỗi | Boot OFF; latch RAM cũ không được coi là còn lưu | Chưa chạy Wokwi |

## 6. Xem lý do trên web

Điều khiển Actuator → Lịch sử trạng thái thiết bị, Safety → Lịch sử relay và
Event Log sẽ dịch FLOW_LOW/FLOW_SENSOR_FAULT. Backend chỉ chấp nhận hai reason
đó nếu reportedState=OFF và safetyLockout=true. Trạng thái quá hạn vẫn UNKNOWN;
lý do được giữ như hồ sơ. Không tự reset hoặc gửi lệnh từ trang Safety/Event.

Status hiện chưa chứa bằng chứng cấu hình bật guard, source hoặc calibration
của flow input controller. Reason là thiết bị tự báo, không chứng minh flow
physical hoặc guard đang bật trước khi lỗi. Đối chiếu config/Serial và ma trận
thử. WATER01/FLOW history là kênh riêng, chưa liên kết với số xung guard này.

## 7. Bằng chứng cloud

144 test backend không skip; 12 browser Safety, 10 browser Event Log, 6 unit Safety; 8 Python contract
và 4 wiring tests đạt. Native FlowInterlock, RelaySafety và encoder status đạt;
packet dùng cùng encoder firmware qua schema và backend/parser/SQL. Firmware
ESP32 build cả opt-in và legacy thiếu macro flow; không dùng endpoint/PEM thật.
Lint/build đạt. Chưa thực thi ESP timer/ISR trên Wokwi hoặc phần cứng thật.

Smoke ứng dụng dùng receive fixture vào schema test flow_guard_smoke, MQTT/
control=false, không gửi command. Safety → Control → Event Log đọc API/DB thật
với hai reason và khóa OFF; command/run=0. Đây không là test transport MQTT,
điện relay hoặc hiệu chuẩn. Xem [báo cáo](../implementation/LOCAL_FLOW_GUARD_REPORT.md).
A2 chưa hoàn tất toàn bộ; WATER binding, nhiều zone, số lít, NVS và phần cứng
vẫn cần các bước riêng.
