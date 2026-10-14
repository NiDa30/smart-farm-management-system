# Chương 22 — Node vật lý, kênh cảm biến và hợp đồng nước v2

> Chương này ghi mốc A1. Sau đó đã có [A2 WATER monitor](CHAPTER_23_WATER_NODE_MONITOR.md)
> và V15 provenance; các câu “chưa có firmware” bên dưới là giới hạn tại mốc A1.
> AWS/Wokwi live mới và pump no-flow protection vẫn chưa được nghiệm thu.


Ngày 14/10/2026, triển khai nền A1 từ [ý tưởng 18 nhóm thiết bị](../plan/AGRICULTURAL_IOT_DEVICE_ROADMAP.md).
Đợt này có code, API, giao diện và kiểm tra cloud; chưa có WATER01 chạy AWS
hay firmware trạm nước độc lập. Không thay sơ đồ Wokwi ở chương21.

## Bài toán một board, nhiều nhiệm vụ

ENV01 hiện là một ESP32 đọc DHT22 và ADC đất, đồng thời điều khiển actuator
logic PUMP01. Nếu coi mỗi đầu đo hoặc PUMP01 đều là một ESP32, inventory sẽ
đếm sai thiết bị và provisioning dễ dùng chung khóa hoặc sai topic.

V14 bổ sung:

| Đối tượng | Ví dụ | Trách nhiệm |
|---|---|---|
| Node vật lý được khai báo | ENV01 / WATER01 | Danh tính client và khu vực, loại node/hợp đồng |
| Kênh cảm biến của node | ENV01/AIR_TEMP; WATER01/LOW | Metric, đơn vị, phiên bản hiệu chuẩn, reading riêng |
| Actuator được gán | PUMP01 thuộc ENV01 | Mapping điều khiển cũ PUMP_V1, không cấp quyền ON từ registry |

Migration tạo iot_node, iot_channel, iot_actuator_binding, node_sample và
channel_sample. Backfill sensor_device thành ENVIRONMENT/v1, ba kênh AIR_TEMP,
AIR_HUMIDITY, SOIL; mapping PUMP01→ENV01. Không copy telemetry v1 sang bảng v2:
GET node chiếu reading v1 hiện có, giữ API/lịch sử/alert/rule cũ.

Đăng ký sensor môi trường bằng API cũ vẫn dùng được: trigger tạo node và ba
kênh trong cùng transaction. Mã trùng node nước bị409 và rollback cả sensor,
không để một nửa registry thành công. Xóa legacy sensor qua DB có cascade
mapping; hiện không cung cấp API xóa node/channel hay sửa calibration.

## Thử trên Windows

Giữ quy trình chạy demo và private config. Tại gốc repository, Git Bash:

```bash
git pull --ff-only origin feat/day1-iot-foundation
```

Dừng backend cũ bằng Ctrl+C, kiểm tra PostgreSQL demo Healthy, chạy trong
Git Bash mới để không mang biến DB test từ terminal khác:

```bash
SMARTFARM_CONTROL_ENABLED=true bash tools/backend/run_backend_windows.sh
```

Flyway áp dụng V14 trên database demo hiện có. Không xóa volume hoặc sửa
checksum migration cũ. Giữ frontend đang chạy hoặc khởi động `npm run dev`,
refresh trang sau pull. Đợt A1 không yêu cầu rebuild firmware, đổi endpoint,
certificate hoặc IAM để xem registry; gửi từ node AWS mới là bước riêng.

Vào **IoT & Tự động hóa → Sensor Realtime → Node & trạm nước**. Bạn sẽ thấy
ENV01, ba kênh và actuator PUMP01. Reading được chiếu từ DB, không tạo reading
mới hoặc kết luận thiết bị online từ registry. Bấm **Về sensor môi trường**
để dùng danh sách và lịch sử v1 cũ.

Bấm **Khai báo trạm nước**, nhập mã như WATER01, tên, khu vực; tùy chọn phiên
bản hiệu chuẩn flow và kênh nhiệt nước. Form khai báo LOW, HIGH, FLOW; thêm
WATER_TEMP nếu chọn. Chưa có measurement thì hiển thị —/Chưa có dữ liệu.
Không có dữ liệu nước trên diagram chỉ vì bạn đã tạo bản ghi này.

Phiên bản hiệu chuẩn là thông tin người vận hành khai báo, không phải chứng
nhận cảm biến đã hiệu chuẩn. Để trống sẽ lưu null và hiển thị chưa khai báo;
không tự gán một mã làm bằng chứng đo chính xác.

POST thiếu phản hồi,5 xx hoặc body sai sẽ giữ bản nháp và chặn gửi lại. Chọn
**Kiểm tra khai báo** để GET theo mã: toàn bộ tên/khu vực/kênh phải khớp mới
xác nhận thành công.409 giữ bản nháp, không ghi đè node khác. Polling không
xóa bản nháp; request cũ sau refresh/unmount không được cập nhật màn hình.

## API và đường nhận dữ liệu

- GET `/api/v1/nodes`: farmId/asOf + node/kênh/actuator + latest mỗi kênh.
- GET `/api/v1/nodes/{id}`: khai báo và reading của một node,404 khi chưa có.
- POST `/api/v1/nodes`: tạo WATER/v2 và 1–8 kênh nước trong một transaction.
  Chưa có API cấp certificate, bind actuator mới hoặc gửi command tổng quát.

POST là khai báo local. Hệ thống chưa có enrollment verification/fleet
provisioning. Private key ENV01 không được copy cho WATER01; firmware riêng,
Thing/certificate/policy có scope và xác nhận kết nối phải làm trong mốc sau.
Backend đã subscribe `smartfarm/FARM001/+/telemetry`; quyền IAM đang dùng cũng
cần cho phép nhận topic mới, wildcard subscription không tự cấp quyền AWS.
Không gửi access key/private key trong chat hoặc body khai báo.

TelemetryRouter đọc schemaVersion:1 đi luồng TelemetryStorage cũ;2 đi parser
nước, xác minh node/topic/kênh/metric/unit/calibration rồi lưu. Không expose
HTTP ingestion hoặc nút browser phát telemetry giả lên AWS.

Xem [schema v2](../../contracts/iot/v2/water-telemetry.schema.json),
[ví dụ](../../contracts/iot/v2/examples/water-telemetry.json) và
[quy tắc hợp đồng](../../contracts/iot/v2/README.md). Bốn metric nước:

| Metric | Đơn vị | Kiểu giá trị VALID |
|---|---|---|
| WATER_PRESENT | boolean | true/false; có nước tại vị trí phao |
| FLOW_RATE | L/min | Số hữu hạn >=0 |
| WATER_TEMPERATURE | °C | Số -55..125 |
| WATER_PRESSURE | kPa | Số hữu hạn >=0 |

V2 không yêu cầu temperature/humidity/soilMoisture của v1. SENSOR_FAULT phải
có value=null. Omit một kênh nghĩa là không có mẫu mới cho kênh đó, không
đồng nghĩa0/false. Không coercion chuỗi thành số/boolean, không metric sai
đơn vị, duplicate JSON key/channel, ID sai, thời gian tương lai>2 s hay payload
trên 4096 bytes. Sequence/uptime là integer không âm trong giới hạn safe-JS.

Chấp nhận packet lịch sử, lưu idempotent theo nodeId/bootId/sequence. Packet
trùng không refresh receivedAt; packet chứa một kênh sai không lưu phần còn
lại. Latest lấy theo observedAt,sequence,id; mỗi kênh có timestamp nguồn và
receivedAt riêng. Không suy ra thứ tự reboot chỉ từ sequence hoặc clock tie.

## Hiển thị dữ liệu và giới hạn an toàn

UI dùng asOf backend + thời gian trôi đơn điệu ở browser để đánh giá 30 s,
không phụ thuộc đồng hồ Windows để biến dữ liệu cũ thành mới. Nguồn và thời
gian nhận đều phải còn mới. Lệch giờ/lỗi API được đánh dấu riêng. Latest fault
không bị giấu bằng reading tốt cũ. Phao false, flow0, reading=null và chưa có
mẫu khác nhau; các giá trị đã cũ chỉ là bằng chứng lịch sử.

Các reading nước này **chưa điều khiển PUMP01**, chưa sinh cảnh báo riêng,
chưa tính phần trăm bồn/lít tiêu thụ hoặc lỗi hai phao bất khả thi. Liên động
cạn vẫn là GPIO27 cục bộ ở chương21. A2 sẽ bổ sung firmware và quy tắc nước
sau khi có ngữ nghĩa/hiệu chuẩn/fault tests; không dùng telemetry fresh như
bằng chứng contactor hoặc nước vật lý đã chạy.

## Bằng chứng của đợt này

- 116 backend tests đạt,0 fail/error/skip: thêm4 parser unit và8 integration/SQL/API;
  các kiểm tra v1, rule, migration nâng cấp vẫn chạy.
- 7 browser API fixtures node và 4 unit frontend đạt;3 Python contract v2 đạt.
- Lint/build đạt, giữ các warning Vite đã biết.
- Smoke toàn app qua menu → Sensor Realtime → Node → API/PostgreSQL test:
  lưu WATERDEMO, restart backend, đọc lại khai báo; MQTT/control tắt.
- SQL fixture sau restart thêm LOW=false, HIGH=fault/null, FLOW=0 với nguồn
  đã cũ; UI hiển thị đúng. Không giả là node nước đã gửi MQTT. Command/run
  trước/sau đều0. Không thử AWS, Wokwi hay GPIO mới.

Xem [báo cáo bàn giao](../implementation/NODE_CHANNELS_REPORT.md) để tái lập
smoke trong DB test riêng và biết phần cần triển khai tiếp.
