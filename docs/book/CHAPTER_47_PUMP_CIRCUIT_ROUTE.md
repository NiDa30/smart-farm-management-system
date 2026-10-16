# Chương 47 — Bơm LED gắn với đúng nhánh tưới

Ngày 16/10/2026. Sau [LED van riêng](CHAPTER_46_CIRCUIT_VALVE_LED_CONTROL.md),
V33 thêm khai báo nhánh tại board PUMP01 và thao tác bật/reset có chọn nhánh.
Đây là bước thử thủ công với Wokwi. Chưa có coordinator tự mở van, chạy bơm,
đóng van hoặc lấy công việc từ hàng chờ; A3 còn phần điều phối đó.

## Chức năng và giới hạn

Vào **IoT & Tự động hóa → Điều khiển Actuator → Cấu hình nhánh tưới →
Bơm theo nhánh <mã> (LED)**. Panel đọc điều kiện hiện tại, nhánh khai báo tại
bơm, thời gian tối đa còn trong cửa sổ mở van, nút bật có thời hạn, tắt và
reset đúng nhánh. Thứ tự thử là mở van riêng, đặt tín hiệu vị trí mô phỏng,
bật bơm ngắn, xác nhận bơm OFF rồi mới di chuyển hoặc sửa van.

PUMP01 chỉ khai báo **một nhánh cố định cho một bản firmware/boot**. Sáu
trường là circuitId/circuitRevision, zoneId/zoneRevision, controllerId/valveId.
Không đổi nhánh qua MQTT hoặc chọn một nhánh khác trên web rồi coi các tiếp
điểm cũ thuộc nhánh mới. Muốn đổi mapping cần xác nhận OFF, sửa cấu hình,
build và boot lại thiết bị. Phiên bản nhánh tăng khi đổi cả tên; phải cập
nhật khai báo tương ứng. Không bỏ kiểm tra để ép dùng revision cũ.

Hai tiếp điểm tại PUMP01 vẫn là đầu vào cục bộ độc lập của chương42. MQTT
ACK/status của board van không tự nối dây vào hai chân này. Khai báo route
chỉ giúp đối chiếu cấu hình; không chứng minh tín hiệu đến từ van cơ khí
đúng nhánh hoặc nước thực sự chảy. Không nối tải bơm/van vật lý để thử.

Phao nước cục bộ vẫn bắt buộc khi bật liên động van; flow/NVS giữ opt-in
riêng. Khai báo trạm nước/kênh trong nhánh được kiểm tra còn hợp lệ, nhưng
LOW/FLOW của trạm từ xa chưa trở thành liên động xuyên controller. Monitor
status/history/alerts và profile CIRCUIT_LED_DEMO tiếp tục là hai luồng riêng.

## Điều kiện gửi và bảo vệ thứ tự

- GET `/api/v1/irrigation-circuits/{id}/pump-proof` chỉ đọc preflight; không
  gửi lệnh, giải phóng quyền bơm hoặc làm mới đồng hồ bản tin.
- ON/RESET qua HTTP intent của PUMP01 cần UUID, boot/revision ý định mới và
  route đầy đủ khớp khai báo thiết bị, nhánh CURRENT/SIMULATOR, controller riêng.
  Status bơm và van cần cả source/receipt trong 15 giây, không tương lai quá 2 giây.
- Van đã chọn phải báo GPIO OPEN và position OPEN, không fault, đúng toàn bộ
  config snapshot. ACK OPEN phải EXECUTED, khớp boot/ordinal mà status đã thấy;
  không còn lệnh van mới hơn. ACK riêng không thay thế status.
- Mọi nhánh khác dùng PUMP01 phải có position/GPIO CLOSED mới khớp cấu hình,
  không fault và không lệnh mới hơn status. Nhánh chưa chạy, monitor-only,
  dữ liệu cũ hoặc đang OPEN đều chặn bật. Không giả sử nhánh im lặng là đóng.
- Tại bơm phải có proof OPEN. ON không được còn lockout/fault; RESET chỉ
  đặt lại khóa khi các tín hiệu đã khỏe, không bật GPIO.
- ON giới hạn 1–30 giây và phải nằm trong thời gian van còn mở. Backend
  lấy issuedAt OPEN + duration − 2 giây làm mốc đóng sớm, rồi giới hạn
  expiresAt của lệnh bơm để còn runtime + 2 giây dự phòng. Lifetime có thể
  ngắn hơn 10 giây. Không còn cửa sổ thì từ chối; không kéo dài timer van.
  Đây là kiểm tra thời gian của mô hình, không thay liên động cắt tại bơm.
- Backend giữ gate bơm rồi gate cấu hình nhánh trước khi lưu reservation.
  Cấm thêm/sửa cấu hình nhánh, sửa vùng liên quan và gửi OPEN/CLOSE mới khi
  lượt bơm theo nhánh chưa có OFF mới phủ tất cả lệnh. **Gửi OFF bơm trước**.
  Timer hết, ACK riêng, lỗi publish hoặc restart backend không tự giải phóng.
- Firmware kiểm tra route trước nhận ordinal và áp relay; sai/thiếu route
  không bật/reset. OFF không mang route, vẫn được gửi khi thiếu proof,
  trạng thái cũ, đang giữ bơm hoặc transport chưa sẵn sàng. Nếu MQTT offline,
  bản lưu OFF có thể FAILED/MQTT_UNAVAILABLE; không gọi đó là đã tắt.
- V33 chỉ thêm pump_command.circuit_route JSONB, giữ nguyên hàng cũ unbound.
  Device status thêm valveInterlock.route, không được mất/đổi trong cùng
  boot. ON status phải khớp route của lệnh đã lưu. Boot mới không mượn proof cũ.
- Cùng UUID/cùng route chỉ đối chiếu bản lưu; đổi revision/mã dưới UUID cũ
  trả409. Mất phản hồi giữ intent trong sessionStorage để GET theo UUID,
  không tự retry, publish hoặc resume. UI không coi HTTP202/ACK là status mới.

Khi thiết bị khai báo route, ON/RESET chung và rule ENV01 cũ bị chặn ngay cả
khi flag yêu cầu route phía backend đang false. Trang PUMP01 chung hiển thị
hướng dẫn chọn nhánh, vẫn có OFF. Không bật rule tự động ENV01 để chạy profile này.
Không có topic, certificate hoặc IAM role mới cho route tại PUMP01; dùng luồng
fenced pump hiện có. Quyền /demo/ của board van vẫn cần chương46, không được
lấy policy monitor status-only làm quyền mở van.

## Chuẩn bị trên Windows

Giữ các terminal frontend, backend, gateway và Wokwi riêng. Các lệnh dưới
đây là **Git Bash**, chạy từ gốc repo; script backend sẽ dùng AWS thật trên
máy bạn. Không gửi key, PEM, config.local.h hoặc ảnh flash vào chat/Git.

1. Dừng rule ENV01, yêu cầu OFF và xác nhận GPIO/status mới. Pull nhánh và
   giữ volume DB. Chuẩn bị board van control theo chương46. Tất cả nhánh
   khai báo dùng PUMP01 cần CLOSED mới; không tạo nhánh ví dụ vào DB thật.
2. Trong **firmware/esp32/config/config.local.h** riêng của ENV01/PUMP01,
   sửa các define hiện có, không thêm bản trùng. Thay toàn bộ mã/revision
   ví dụ bằng dữ liệu nhánh hiện tại trên web:

```cpp
#define FARM_CONTROL_ENABLED 1
#define FARM_WATER_INTERLOCK_ENABLED 1
#define FARM_PUMP_FENCING_ENABLED 1
#define FARM_VALVE_PROOF_ENABLED 1
#define FARM_VALVE_PROOF_SIMULATOR 1
#define FARM_PUMP_CIRCUIT_ROUTE_ENABLED 1
#define FARM_PUMP_ROUTE_CIRCUIT_ID "CIRCUIT08"
#define FARM_PUMP_ROUTE_CIRCUIT_REVISION 1
#define FARM_PUMP_ROUTE_ZONE_ID "ZONE08"
#define FARM_PUMP_ROUTE_ZONE_REVISION 1
#define FARM_PUMP_ROUTE_CONTROLLER_ID "IRRIGATION08"
#define FARM_PUMP_ROUTE_VALVE_ID "VALVE08"
```

Route flag mặc định 0, kể cả config riêng cũ thiếu macro. Compiler chặn
route1 với fence0/proof0/simulator0. NVS có thể giữ 1 nếu đã thiết lập theo
chương43; boot OFF/khóa, cần reset mới. Chân GPIO32=CLOSED, GPIO33=OPEN tại
bơm và board van là các switch **riêng trên từng board**; không suy ra vị
trí từ đèn. Không thay endpoint, certificate hoặc private key khi đổi flag.

3. Build và merge ảnh flash của đúng project bơm, sau khi đã có data riêng:

```bash
./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir firmware/esp32
./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir firmware/esp32 --target buildfs
./.local/day1-venv/Scripts/python.exe tools/wokwi/merge_flash.py
```

Chỉ chạy simulator từ project bơm đã build; board van dùng project riêng
và certificate/client riêng. Không chạy hai simulator có cùng ENV01 client ID.
Không dùng ảnh flash public rỗng của cloud để kết nối AWS.

4. Restart terminal backend với các flag sau; giữ PostgreSQL/profile đã cài:

```bash
export SMARTFARM_CONTROL_ENABLED=true
export SMARTFARM_PUMP_FENCING_ENABLED=true
export SMARTFARM_PUMP_CIRCUIT_ROUTE_REQUIRED=true
export SMARTFARM_IRRIGATION_CIRCUIT_DEMO_ENABLED=true
export SMARTFARM_IRRIGATION_DEMO_ENABLED=false
bash tools/backend/run_backend_windows.sh
```

5. Đợi hai board gửi status mới. Các nhánh khác CLOSED; mở LED van đã chọn
   30 giây, chuyển switch của van sang OPEN trước timeout vị trí. Đặt
   tiếp điểm đúng tại bơm sang OPEN, đợi debounce. Mở panel bơm của **cùng
   nhánh**, đọc điều kiện, reset nếu đang khóa rồi đọc lại. Bật bơm 5 giây
   trong cửa sổ còn đủ. Quan sát LED, ACK riêng và status ON/OFF mới.
6. Yêu cầu OFF bơm, chờ status OFF phủ tất cả ordinal rồi mới đóng van và
   chuyển switch van về CLOSED. Không tự chạy tiếp sau reconnect/restart.
   Kết thúc thử ở OFF, dừng simulators/gateway khi không dùng, theo dõi Budget.

Nếu hết cửa sổ van trước khi kịp bật bơm, đừng tăng thời gian bơm hoặc bỏ
fence. Giữ bơm OFF, đóng van, nhận CLOSED mới rồi thực hiện lượt thử mới.
Nếu chỉ có monitor board hoặc còn nhánh không có feedback, panel sẽ chặn.

## Kiểm chứng và nghiệm thu

Cloud: 461 test backend đạt, không skip (22 mới); 44 browser nhánh + 17
browser PUMP01 đạt; 20 unit parser intent/safety và 10 test hợp đồng đạt.
Native decoder/route, fence, journal và local proof đạt; firmware public
legacy/bound/bound+NVS build đạt, profile sai bị compiler chặn. Lint/build đạt.
Fixture riêng đi từ hai van CLOSED → OPEN/ACK đúng nhánh → lệnh bơm → native
ON/ACK/timer OFF → receiver/PostgreSQL; logical millis tiến nhanh, không phải
thời gian chạy GPIO. Full app chỉ GET và giữ source/receipt sau restart.
Xem [bàn giao](../implementation/LOCAL_PUMP_CIRCUIT_ROUTE_REPORT.md).

| Ca tại máy Windows/AWS/Wokwi | Kết quả |
| --- | --- |
| Đúng profile, route/boot/revisions; mở van30s, bơm5s và timer OFF | Chưa chạy |
| Chọn nhánh khác hoặc revision cũ, ON/reset chung bị chặn | Chưa chạy |
| Nhánh khác OPEN/mất status hoặc thiếu ACK OPEN, không có ON | Chưa chạy |
| Mất proof/gateway khi đang bật, GPIO OFF/khóa, không tự resume | Chưa chạy |
| OFF bơm trước CLOSE; không đổi cấu hình khi bơm chưa xác nhận OFF | Chưa chạy |
| Restart backend hoặc board giữa run, không replay ON; kiểm tra NVS riêng | Chưa chạy |

Theo dõi các status mới có route và đối chiếu bản lưu lệnh/ACK tại
[chương48](CHAPTER_48_PUMP_CIRCUIT_HISTORY.md). Chỉ có history từ V34, không
nhập lại latest V33 cũ hoặc suy ra số nước đã tưới.
