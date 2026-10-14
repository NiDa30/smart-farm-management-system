# Chương 30 — Tổng quan node đất, trạm nước và vùng tưới

Ngày **15/10/2026, giờ Việt Nam**. Tiếp nối [vùng tưới](CHAPTER_29_IRRIGATION_ZONES.md),
đưa dữ liệu đã lưu của WATER/SOIL lên màn Tổng quan IoT. Trước đó tổng quan
chỉ đếm sensor_alert của môi trường: cảnh báo đất/nước có thể đang mở trong
Trung tâm Cảnh báo trong khi card tổng quan vẫn bằng0. Giờ card cộng cả ba
nhóm, giữ nguồn và phạm vi dữ liệu rõ ràng.

## 1. Một snapshot đọc, ba loại cảnh báo

GET `/api/v1/dashboard/overview` giữ các trường cũ và thêm `agriculture`:

- `inventory`: farmId/asOf/nodes từ NodeInventory, bao gồm ENV/WATER/SOIL.
- `zones`: farmId/asOf/zones, cấu hình và khảo sát từ chương29.
- `waterActiveCount`, `soilActiveCount`: tất cả episode chưa đóng.
- `recentChannelAlerts`: tối đa5 episode đất/nước đang mở, xếp theo giờ phát
  sinh giảm dần, family rồi ID để thứ tự xác định khi trùng giờ.

Preview có id/family/nodeId/type/channelId/dataSource/openedAt/acknowledgedAt;
family WATER hoặc SOIL là một phần danh tính. Hai bảng có thể cùng id=1.
Phao LOW_WATER/INCONSISTENT_FLOATS có channelId=null vì đánh giá cặp phao;
SENSOR_FAULT và DRY_SOIL có kênh cụ thể. Preview không kèm giá trị hiện tại
hoặc ghi chú; mở Trung tâm Cảnh báo để xem bằng chứng/chi tiết.

`activeAlertCount` cũ vẫn chỉ đếm cảnh báo môi trường, giữ tương thích API.
Card mới cộng nó với waterActiveCount và soilActiveCount. Tổng được đếm SQL
độc lập, không lấy độ dài list100 hoặc preview5. ACK chỉ là đã xem; một episode
đã ACK hoặc có mẫu cũ vẫn được đếm cho tới khi có bằng chứng đóng.

Các truy vấn DB nằm trong REPEATABLE_READ, read-only. Inventory và khảo sát
vùng dùng **cùng inventory và cùng asOf**, tránh query lại node và đánh giá
vùng ở một mốc khác. Lifecycle MQTT ở bộ nhớ vẫn không phải snapshot Wi-Fi
của thiết bị. GET không gửi lệnh, expire command, pause rule hoặc tự tạo vùng.
Không thêm migration; schema hiện tại vẫn V19. Không đổi telemetry/IAM/firmware.

## 2. Đọc giao diện

IoT & Tự động hóa → **Tổng quan IoT** có khối “Node đất, trạm nước và vùng tưới”.
Mỗi node hiển thị khu vực, số kênh có dữ liệu mới/tổng số kênh, raw value,
quality/freshness và nguồn từng kênh. Giá trị0% hoặc0L/min là dữ liệu hợp lệ;
fault/null là —. Partial packet không làm mới các kênh thiếu. Mới cần cả giờ
nguồn và nhận chưa quá30 giây, không vượt quá2 giây tương lai và quality VALID.

WATER có chẩn đoán LOW/HIGH dùng quy tắc monitor hiện có. Node có3/3 kênh
mới không đồng nghĩa online hoặc đủ điều kiện chạy bơm. SIMULATOR/PHYSICAL/
UNSPECIFIED là thiết bị khai báo; có thể khác giữa các kênh/episode. Không
trộn các nguồn thành một trung bình đất chung.

Khảo sát vùng tái sử dụng điều kiện cả ba điểm, source/coherence và ngưỡng
của chương29. Chỉ hiện số2/3 khi khảo sát còn hiệu lực. UI dùng server asOf
cộng performance elapsed; khi hết validUntil, tự bỏ kết luận đa số trước lần
poll tiếp theo. API lỗi giữ bằng chứng cũ có nhãn, ẩn tổng cảnh báo hiện tại
bằng — và không khẳng định độ mới/mức bồn/đa số vùng. Phục hồi API thì đọc lại.

Card số cảm biến và trung bình môi trường vẫn ENV/v1, không tính PUMP01 là
sensor hoặc cộng ba probe SOIL thành ba ESP32. Event Log trên trang được ghi
phạm vi cảm biến môi trường/PUMP01, chưa hợp nhất episode WATER/SOIL vào Event Log, Safety,
DeviceMonitoring hoặc chỉ báo header toàn ứng dụng. Rule ENV01/PUMP01 vẫn
độc lập, vùng chưa có van/controller/coordinator hoặc tự tưới từ SOIL.

## 3. Kiểm tra đã thực hiện

| Phạm vi | Kết quả |
|---|---:|
| Maven verify/PostgreSQL test riêng |179/179, skip0|
| IoTOverviewTest, nằm trong tổng backend |6/6, gồm3 ca nông nghiệp mới|
| Browser dashboard API fixtures |15/15, skip0, gồm7 ca mới|
| Unit thống kê môi trường và nông nghiệp |6/6|
| Lint/build |Đạt; cảnh báo Vite __dirname/chunk cũ còn|
| Full-app/API/PostgreSQL, GET-only |Pha fresh và stale đạt|

Backend kiểm105 cảnh báo đất +7 nước, vượt list100, ACK vẫn mở và mẫu cũ
vẫn được đếm; preview5 không giảm tổng. Cùng ID khác family không bị gộp.
Episode đã đóng bị loại. Survey dùng mốc inventory, giữ số0 và điểm thiếu;
GET không đổi command/rule. Browser kiểm tổng118 (6 môi trường +112 đất/nước),
nguồn, ACK, expiry tại chỗ trước poll, lỗi/phục hồi và body sai.

Full-app dùng schema `agriculture_overview_smoke` trên PostgreSQL loopback
55439 riêng, MQTT/control=false. Fixture Java đăng ký AGSOIL/AGWATER, mỗi node
hai packet qua TelemetryRouter; AGSOIL0/20/80 và AGWATER LOW=false/HIGH=false/
FLOW=0, source SIMULATOR. Tạo AGZONE ba điểm, ACK một cảnh báo đất. Snapshot
có2 đất mở/1 nước mở, card3, vẫn giữ nguồn và0. Mở được Trung tâm Cảnh báo →
Đất nhiều điểm, Sensor Realtime → Node & trạm nước → Vùng tưới qua menu thật.
Khi mẫu tự cũ, khảo sát không còn đa số nhưng3 cảnh báo vẫn mở.

Fixture giữ4 packet/12 readings/1 zone/3 bindings/1 ACK, command0/run0.
Không seed lại để giả dữ liệu đang live. Script browser chỉ GET và chặn external/
API ghi. Đây là receive fixture local, không phải AWS/Wokwi/GPIO thật.

Trong lượt setup, đã có Vite3000 nhưng một lần mở thêm Vite tự chuyển3001.
Kiểm tra port/readiness, dừng đúng tiến trình vừa tạo và dùng lại3000; không
đổi proxy hoặc kết luận lỗi backend. Không có lỗi chức năng/test thất bại trong
lượt này. Log và cách lặp lại ở [báo cáo](../implementation/LOCAL_AGRICULTURE_OVERVIEW_REPORT.md).

## 4. Thử trên Windows — chưa chạy

Pull branch hiện tại; restart backend và frontend bằng các terminal riêng như
[runbook](WINDOWS_RUNBOOK.md). Không xóa volume/cert hoặc provision lại chỉ
vì thay tổng quan. Backend cũ chưa có agriculture sẽ bị UI báo response lỗi;
restart đúng phiên bản cả hai phía thay vì tự thêm dữ liệu giả.

| Ca nghiệm thu Windows/AWS/Wokwi | Trạng thái |
|---|---|
| ENV01, SOIL và WATER đang phát: đối chiếu card/Trung tâm Cảnh báo |Chưa chạy|
| Đất0, fault/null, hai nguồn và một kênh thiếu: giữ nguồn/độ mới riêng |Chưa chạy|
| AG/zone thực có ba điểm mới cùng packet: kết luận; dừng phát → tự cũ |Chưa chạy|
| ACK cảnh báo đang mở: tổng không giảm; mẫu hồi phục đủ điều kiện → giảm |Chưa chạy|
| Dừng backend rồi khởi động: bản cũ có nhãn, mất khẳng định hiện tại, phục hồi |Chưa chạy|

Chưa nghiệm thu khả năng tải lớn; snapshot inventory/zones hiện trả toàn bộ,
không phân trang. Controller/van và quyền dùng chung bơm vẫn là phần tiếp của A3.
