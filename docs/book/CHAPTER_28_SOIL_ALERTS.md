# Chương 28 — Cảnh báo đất khô và lỗi từng đầu dò

Ngày **15/10/2026, giờ Việt Nam**. Tiếp nối
[node đất ba điểm](CHAPTER_27_SOIL_MULTIPOINT.md), bổ sung cảnh báo SOIL/v2
trước khi dùng các điểm đo để quyết định tưới. Mỗi kênh và nguồn đo có hồ sơ
riêng; chưa có controller van/coordinator hoặc rule từ SOIL01.

## 1. Cảnh báo theo điểm, không lấy trung bình

Một điểm khô không bị hai điểm ướt che khuất. Hệ thống đánh giá từng kênh
SOIL_MOISTURE/% của node loại SOIL, không đọc soilMoisture của ENV01 để giả
làm ba điểm. Các cảnh báo cảm biến legacy vẫn ở tab Cảm biến môi trường;
cảnh báo WATER vẫn ở tab Trạm nước.

| Điều kiện | Mở cảnh báo | Trở về bình thường |
|---|---|---|
| DRY_SOIL | Hai mẫu VALID dưới 30% | Hai mẫu VALID từ 35% |
| SENSOR_FAULT | Hai mẫu SENSOR_FAULT/null | Hai mẫu VALID, kể cả 0% |

Hai mẫu phải thuộc hai packet mới liên tiếp, cùng bootId và nguồn, sequence
liền kề, giờ đo tăng và cách nhau tối đa 15 giây. Chỉ đánh giá mẫu không cũ
quá 30 giây; parser nhận tối đa 2 giây tương lai. Cursor dùng độ chính xác
microsecond của PostgreSQL để không coi cùng mốc thời gian là bằng chứng mới.

Ngưỡng 30/35 là **cố định cho demo**, chưa theo giống cây, đất hoặc mùa vụ.
SIM_LINEAR_V1 của potentiometer không phải hiệu chuẩn độ ẩm thể tích thật.
Không dựa riêng hai con số demo để nghiệm thu chế độ tưới nông nghiệp thật.

## 2. Hysteresis, thiếu dữ liệu và nguồn đo

Giá trị từ 30 đến dưới 35% giữ điều kiện hiện có và cắt chuỗi bằng chứng đang
chờ. Ví dụ 20→32→20% chưa đủ mở, cần thêm một mẫu dưới 30%; khi đã mở, chuỗi
35→32→35% chưa đủ đóng, cần thêm một mẫu từ 35%.

Mẫu lỗi không biến thành 0% và không tự đóng cảnh báo đất khô. Khi đang khô
mà cảm biến lỗi, hai đợt DRY_SOIL/SENSOR_FAULT có thể cùng tồn tại. Khôi phục
hai mẫu 32% chỉ đóng SENSOR_FAULT, DRY_SOIL vẫn giữ. Khôi phục hai mẫu 0% có
thể đóng lỗi và đồng thời xác nhận đất khô; đây là hai điều kiện khác nhau.

Kênh bị thiếu trong packet, sequence gap, reboot hoặc khoảng cách quá 15 giây
làm lại chuỗi. Packet vắng một kênh không làm mới kênh đó. Packet trùng, cũ,
đến sai thứ tự hoặc không hợp lệ không tạo bằng chứng mở/đóng. Không có timer
nào tự xóa đợt cảnh báo khi thiết bị im lặng. Vì vậy một đợt đang mở là hồ sơ
điều kiện chưa được xác nhận phục hồi, không phải chứng minh đầu dò đang online.

SIMULATOR, PHYSICAL, UNSPECIFIED có hồ sơ riêng. Đổi nguồn không hoàn tất
chuỗi hoặc đóng đợt nguồn cũ. Nhãn nguồn là thiết bị khai báo, không xác nhận
phần cứng/hiệu chuẩn. Phải đối chiếu Sensor Realtime và lịch sử kênh để đánh
giá dữ liệu mới.

## 3. Lưu packet và cảnh báo trong cùng transaction

Migration **V18** thêm soil_alert_cursor, soil_alert_state và soil_alert;
không sửa migration cũ, packet v2, MQTT topic hoặc AWS policy. Không quét lại
mẫu cũ để tạo cảnh báo hồi tố.

NodeInventory chỉ gọi SoilAlerts sau khi đã xác minh registry và lưu packet
SOIL cùng mọi reading hợp lệ. Cursor được khóa theo node; state và episode
cập nhật trong cùng transaction. Nếu transaction rollback thì mẫu/candidate/
alert rollback cùng nhau. Packet QoS1 trùng không chạy lại đánh giá; unique
index chỉ cho một đợt mở cho node/source/type/channel.

Mỗi episode tham chiếu sample mở/đóng trong node_sample và channel_sample,
giữ nguồn, giờ đo/nhận và giá trị bằng chứng. Giá trị mở lỗi là null; giá trị
mở đất khô có thể là 0. Dữ liệu cursor/state lưu PostgreSQL nên restart backend
không làm mất đợt hoặc ghi chú. Đây không phải NVS ở ESP32 và không resume ON.

API riêng:

- GET `/api/v1/soil-alerts`: tối đa 100 đợt, ưu tiên đang mở rồi chưa xem.
- GET `/api/v1/soil-alerts/{id}`: đọc trực tiếp theo ID, kể cả ra ngoài list100.
- PUT `/api/v1/soil-alerts/{id}/acknowledgement`: body `{"note":"..."}` hoặc
  `{"note":null}`, tối đa 500 ký tự. Body có key trùng, trường thừa hoặc kiểu
  note khác bị 400. Note được strip; trống thành null.

ACK lưu lần đầu bằng row lock. Gửi lại cùng note trả cùng xác nhận, không đổi
thời gian. Note khác trả 409. Đợt đã đóng mà chưa xem không được ACK; đợt đã
ACK rồi đóng vẫn giữ note và cho đọc lại cùng xác nhận. ACK không đóng điều
kiện, không reset khóa, không gửi lệnh tưới hoặc email. Bản này chưa ghi danh
tính người xác nhận, edit/unack hoặc thêm Event Log cho soil ACK.

## 4. Chạy trên Windows

Từ Git Bash tại gốc repo:

```bash
git pull --ff-only origin feat/day1-iot-foundation
```

Giữ PostgreSQL Healthy. Dừng backend cũ rồi khởi động trong terminal Git Bash
riêng; giữ profile AWS và db.env đã cấu hình. Khi chỉ kiểm tra cảnh báo, dùng:

```bash
SMARTFARM_CONTROL_ENABLED=false bash tools/backend/run_backend_windows.sh
```

Backend chạy Flyway V18, không xóa volume/schema hoặc sửa checksum. Terminal
frontend riêng chạy `npm run dev`. Vào **IoT & Tự động hóa → Trung tâm Cảnh báo
→ Đất nhiều điểm**. Lọc điều kiện, nguồn và đã xem độc lập. List là 100 đợt
đã tải, chưa phải tổng toàn bộ lịch sử. Header/Overview/Device Monitoring/
Safety/Event Log chưa hợp nhất soil alerts.

Nếu SOIL01 đang phát packet v2 đúng registry, không cần provision lại,
đổi certificate, thêm IAM role hoặc sửa/nạp lại firmware chỉ để có cảnh báo.
Nếu SOIL01 chưa chạy live, làm theo chương27 để chuẩn bị project riêng. Chỉ
khai báo trên web chưa có dữ liệu thì chưa có đợt cảnh báo.

Xác nhận ghi chú sau phản hồi thành công. Nếu timeout/mất phản hồi/409, dùng
**Đối chiếu trạng thái**; UI không tự gửi PUT lại. Nếu API lỗi, giá trị cũ còn
hiển thị kèm lỗi và khóa ACK. Note có nội dung HTML được hiển thị như văn bản;
list cũ trả chậm không được ghi đè kết quả ACK mới.

## 5. Kịch bản Wokwi còn chờ

Các ca dưới đây **chưa chạy AWS/Wokwi thật trong đợt này**. Dùng sơ đồ SOIL01
riêng, không dùng núm ADC trên board ENV01 rồi chờ cảnh báo SOIL.

| Ca | Thao tác / kết quả cần quan sát | Thực tế |
|---|---|---|
| Khô một điểm | SOIL1≈20%, SOIL2≈60%, SOIL3≈70%; hai packet mới → chỉ SOIL1 khô | Chưa chạy |
| Hysteresis | Khi đã khô, đặt SOIL1≈32% giữ đợt; hai mẫu ≥35% mới đóng | Chưa chạy |
| Fault riêng | FAULT3 trái → hai packet lỗi SOIL3; hai điểm kia vẫn đo | Chưa chạy |
| Mất gateway | Đang khô rồi ngắt gateway; dữ liệu stale, đợt không tự hết | Chưa chạy |
| Đã xem | Ghi chú/xác nhận, đợt vẫn mở; refresh/restart backend giữ note | Chưa chạy |
| Phục hồi | Hai mẫu đủ ẩm/VALID đúng nguồn → đợt đóng, note cũ vẫn giữ | Chưa chạy |

Firmware SOIL lấy mẫu 5 giây; khi đang chạy liên tục, thường cần khoảng
5–10 giây cộng độ trễ MQTT/polling cho hai mẫu. Đây không phải SLA thời gian
thực. Ghi bootId/sequence, giờ đo/nhận, sampleId và episodeId; không chỉ đếm
hai lần reload trang. Không lưu key, token hoặc PEM trong sách/ảnh.

## 6. Bằng chứng cloud

- **167 backend tests**, gồm 15 SoilAlertsTest: ngưỡng/0/null, hysteresis,
  thứ tự/gap/reboot/nguồn, transaction rollback, ACK/concurrency, strict body.
- **24 browser alerts**, gồm 7 ca SOIL và hồi quy WATER/legacy; **11 unit
  frontend** cho ba parser. Không skip. Lint/build đạt, chỉ warning Vite cũ.
- Nâng cấp V17→V18 trong soil_node_smoke giữ ba packet/bảy readings, command0/
  run0 và API soil-alerts rỗng: không hồi tố.
- Fixture local đi qua router/backend thật trong soil_alert_smoke, MQTT/control
  tắt. SOILWARN có hai packet tạo đất khô SOIL1=0 và lỗi SOIL3=null; UI full app
  ACK đúng note cho SOIL1, restart backend vẫn giữ. Hai packet phục hồi mới
  đóng cả hai, SOIL1 giữ ACK/note, SOIL3 chưa được ACK. Sau cùng bốn packet/
  12 readings, hai episode đã đóng, command0/run0.

Không sửa firmware hoặc gọi AWS trong lượt cảnh báo; không lặp Pio build từ
chương27 để tính thành bằng chứng mới. Chỉ dùng PostgreSQL test loopback55439,
không chạm demo5433. Các ca Wokwi ở mục5 vẫn chưa nghiệm thu.

Chi tiết lệnh/log trong [báo cáo bàn giao](../implementation/LOCAL_SOIL_ALERTS_REPORT.md).
