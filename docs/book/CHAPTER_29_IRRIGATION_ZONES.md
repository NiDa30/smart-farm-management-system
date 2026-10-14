# Chương 29 — Vùng tưới và ba điểm đất đại diện

Ngày **15/10/2026, giờ Việt Nam**. Tiếp nối [SOIL nhiều điểm](CHAPTER_27_SOIL_MULTIPOINT.md)
và [cảnh báo đất](CHAPTER_28_SOIL_ALERTS.md), thêm khai báo vùng và khảo sát độ
ẩm theo ba điểm. Đây là phần gán dữ liệu của A3; controller van/IRRIGATION01,
quyền sử dụng chung bơm và tưới tự động theo vùng còn sau.

## 1. Node, khu vực và vùng tưới

Khu vực (sensor_area) là phạm vi chứa thiết bị. Node SOIL là ESP32 độc lập có
nhiều kênh. Vùng tưới là một khai báo riêng trong khu vực, gán **đúng ba kênh
SOIL_MOISTURE/% trên cùng một node SOIL/v2**. Một kênh chỉ thuộc một vùng.

Ví dụ AREA001 có SOIL01 cho dãy1 và SOIL02 cho dãy2. Tạo ZONE01→SOIL01:
SOIL1/2/3, ZONE02→SOIL02:SOIL1/2/3. Các channelId giống nhau ở hai node vẫn
là hai cảm biến khác nhau; danh tính gán là cặp nodeId/channelId. API cho phép
node nhiều kênh chia nhóm ba không chồng nhau, nhưng firmware demo hiện có
đúng ba điểm, nên mỗi SOIL demo phục vụ một vùng.

Không đổi ENV01/PUMP01 thành controller IRRIGATION01 chỉ bằng khai báo vùng.
Chưa có binding van, pump lease, run theo vùng hoặc hàng đợi tranh bơm.
Quy tắc ENV01→PUMP01 hiện có hoạt động độc lập; tạo/sửa vùng không tắt, sửa
hoặc dùng vùng để chặn rule cũ.

## 2. Khảo sát tức thời, cần đủ cả ba điểm

Mỗi vùng lưu nguồn dự kiến SIMULATOR hoặc PHYSICAL và hai ngưỡng. Mặc định
khô30%, đủ ẩm35%. Số nguyên dry trong0–95, wet trong5–100 và wet≥dry+5.
Đây là ngưỡng khảo sát ở màn vùng; cảnh báo đất chương28 vẫn dùng30/35 cố định.

| Trạng thái | Điều kiện |
|---|---|
| UNAVAILABLE | Một điểm thiếu, lỗi, cũ, lệch giờ hoặc khác nguồn dự kiến |
| INCOHERENT | Ba điểm đều mới/hợp lệ nhưng không thuộc cùng một packet |
| DRY | Đủ dữ liệu, ít nhất2/3 giá trị dưới ngưỡng khô |
| WET | Đủ dữ liệu, ít nhất2/3 giá trị đạt ngưỡng đủ ẩm |
| MIXED | Đủ dữ liệu nhưng chưa có đa số khô/đủ ẩm |

“Mới” cần cả giờ đo và giờ nhận chưa quá30 giây, không quá2 giây tương lai.
Cả ba phải VALID, số0–100 và đúng nguồn vùng. Cùng packet nghĩa là cùng bootId,
sequence, observedAt và receivedAt. Một packet mới chỉ có SOIL1 không làm mới
SOIL2/3; cũng không dùng ba giá trị mới từ ba packet khác nhau để suy ra đa số.

0% VALID được giữ nguyên; SENSOR_FAULT/null hiển thị —. Raw value/source/
calibration/timestamp vẫn được trình bày khi khảo sát bị chặn. Nguồn PHYSICAL
và tên phiên bản hiệu chuẩn là thiết bị khai báo, không chứng minh kiểm định
phần cứng hoặc cảm biến đã lắp đúng.

Đây là **khảo sát một packet hiện tại**, không phải state machine hysteresis
hay bằng chứng “hai packet liên tiếp” của cảnh báo/quy tắc. Một điểm0, một
điểm20, một điểm80 với ngưỡng30/35 cho DRY2/3; hai điểm40/50 và một điểm20
cho WET2/3. Không có lệnh ON/OFF được phát từ kết quả này.

Backend trả asOf và validUntil. UI dùng thời gian server cộng elapsed monotonic,
không phụ thuộc giờ máy Windows để giữ kết quả mới. Khi hết validUntil, kể cả
đang mở form và polling dừng, UI bỏ kết luận đa số, báo dữ liệu cũ. API lỗi cũng
khóa kết luận mới và thao tác mở/sửa cấu hình, giữ dữ liệu cũ có nhãn rõ ràng.

## 3. Cấu hình, phiên bản và gán kênh độc quyền

Migration **V19** thêm irrigation_zone và irrigation_zone_channel; không đổi
packet, node registry, alert hoặc AWS policy. Không tự tạo vùng từ các node
đã có. API:

- GET `/api/v1/irrigation-zones`: farmId/asOf/zones, mỗi view có config/asOf/
  points/assessment. Snapshot đọc REPEATABLE_READ.
- GET `/{zoneId}`: view theo mã, 404 nếu chưa có.
- POST: zoneId/name/areaId/soilNodeId/channelIds/expectedSource/dryThreshold/
  wetThreshold; revision ban đầu1, không nhận revision trong body tạo.
- PUT `/{zoneId}`: cùng các trường và revision đang đọc; thành công tăng1.

Mọi ID dùng quy tắc uppercase hiện có; tên1–80 ký tự. Node phải là SOIL/v2,
cùng khu vực đã khai báo và có đủ ba kênh đúng metric/unit. JSON key trùng,
field thừa, kiểu sai hoặc payload vượt giới hạn bị400. Mã vùng hoặc kênh đã
dùng/phiên bản cũ trả409. Không có API xóa/disable/điều khiển vùng ở bản này.

PUT khóa row vùng và kiểm tra revision trước thay đổi. Đổi node/kênh xóa các
binding cũ rồi cập nhật và gán mới trong **một transaction**. Nếu kênh mới đang
thuộc vùng khác, toàn bộ thao tác rollback, giữ cả node cũ, revision và ba
binding. Unique(node_id,channel_id) chặn hai vùng nhận cùng kênh; FK bảo vệ
node/kênh đang được gán. Đây là độc quyền dữ liệu, chưa phải quyền giữ bơm.

Form giữ bản nháp khi409 và buộc **Đọc cấu hình mới nhất** trước khi sửa tiếp.
Nếu mất phản hồi hoặc body không khớp, **Đối chiếu vùng** dùng GET, không tự
POST/PUT lại. Phản hồi lưu phải khớp toàn bộ config và revision dự kiến. Form
không nhận kết quả lưu thành công chỉ từ HTTP200 với nội dung khác.

## 4. Chạy trên Windows

Git Bash tại gốc repo:

```bash
git pull --ff-only origin feat/day1-iot-foundation
```

Giữ PostgreSQL Healthy. Restart backend để Flyway chạy V19, giữ db.env và cấu
hình đã có. Khi chỉ thử registry/khảo sát, tắt rule cũ trên web trước rồi dùng
terminal backend riêng:

```bash
SMARTFARM_CONTROL_ENABLED=false bash tools/backend/run_backend_windows.sh
```

Terminal frontend riêng chạy `npm run dev`. Mở **IoT & Tự động hóa → Sensor
Realtime → Node & trạm nước → Vùng tưới**:

1. Chọn **Thêm vùng tưới**, nhập ZONE01/tên dãy/khu vực.
2. Chọn SOIL01 và đúng ba SOIL1/2/3 chưa thuộc vùng khác.
3. Chọn **Mô phỏng** cho Wokwi; đặt ngưỡng, lưu.
4. Quan sát từng điểm và kết luận vùng khi có packet mới hợp lệ. Chưa có mẫu
   thì cấu hình vẫn lưu, khảo sát báo chưa đủ dữ liệu.
5. **Sửa vùng** để đổi tên/ngưỡng/node/kênh, đọc revision và lưu. Nếu dùng
   SOIL02 cho vùng2, chuẩn bị danh tính/certificate/project riêng theo chương27.

Chức năng này chỉ cần restart backend/frontend; không cần nạp lại firmware,
tạo Thing/cert hoặc thêm role chỉ để lưu vùng. Node SOIL chưa chạy MQTT vẫn
cần quy trình chương27 trước khi có dữ liệu live. Các ngưỡng demo cần đánh giá
lại theo cây/đất và hiệu chuẩn thực trước khi thiết kế rule tự động.

## 5. Bằng chứng kiểm tra và lỗi đã sửa

**176 backend tests** (9 ca vùng), **29 browser node/history/zone** (7 ca vùng),
**17 unit frontend** (4 ca vùng), lint/build đạt, không skip. Backend kiểm tra
cùng packet/source/fault/stale/clock, majority/mixed/0, rebind rollback và hai
người sửa cùng revision chỉ một người thành công. Browser kiểm tra save chưa rõ/
GET readback, conflict giữ draft, API lỗi, sai count/source và hết freshness khi
form đang mở. Các fixture API không thay cho kết quả full-app dưới đây.

- V18→V19 trên soil_alert_smoke giữ4 packet/12 readings,2 alert đã đóng/1 ACK,
  command0/run0; không tự tạo vùng.
- Toàn app/API/PostgreSQL test irrigation_zones_smoke: helper nhận hai packet
  SOIL từ fixture local, UI POST hai vùng và PUT vùngA đổi tên/ngưỡng40/45.
  Khi mẫu còn mới, vùngA DRY2/3 và vùngB WET2/3. Restart JVM và so sánh toàn bộ
  config/revision/binding trước/sau bằng nhau; browser GET-only đọc lại đạt.
- Sau cùng có2 vùng/6 binding,2 packet/6 readings, revisionA2/B1, command0/run0.
  MQTT/control tắt, không AWS/Wokwi live hoặc đầu ra vật lý mới. Không sửa hay
  build lại ESP32 trong lượt backend/UI này.

Lỗi lint đầu tiên: TypeScript mất narrowing của validUntil nullable trong
callback. Giữ guard kiểm tra date trước rồi áp dụng kiểu đã được guard để
Date.parse không nhận null; lint/build sau sửa đạt.

Browser tạo vùng ban đầu timeout ở locator label của select. Snapshot có node,
không phải backend thiếu node; nhãn lồng option không khớp getByLabel exact.
Đã thêm aria-label rõ ràng cho ba select, chạy lại toàn bộ29 ca đạt. Không tăng
timeout hoặc bỏ assertion để vượt lỗi.

## 6. Ca Windows/AWS/Wokwi còn chờ

| Ca | Kết quả thực tế |
|---|---|
| SOIL01 live, ba điểm cùng packet cho DRY/WET/MIXED đúng vùng | Chưa chạy |
| Ngắt gateway, vùng hết freshness và không giữ kết luận mới | Chưa chạy |
| Fault một điểm, source mismatch hoặc packet một phần chặn đa số | Chưa chạy |
| SOIL02 riêng cho vùng2, dữ liệu không lẫn vùng1 | Chưa chạy |
| Sửa cùng revision từ hai tab và restart backend giữ cấu hình | Chưa chạy |

Chi tiết [báo cáo vùng](../implementation/LOCAL_IRRIGATION_ZONES_REPORT.md).
Bước A3 còn lại: controller một dãy, binding van/pump thực sự, coordinator và
bằng chứng timer/stop/flow/ACK/status trước khi tưới nhiều vùng.
