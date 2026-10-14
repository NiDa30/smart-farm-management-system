# Chương 25 — Lịch sử kênh nước và CSV

Ngày 14/10/2026. Sau [monitor WATER](CHAPTER_23_WATER_NODE_MONITOR.md) và
[cảnh báo nước](CHAPTER_24_WATER_ALERTS.md), thêm cách xem lại từng kênh đã
lưu. Giao diện nằm trong Sensor Realtime → Node & trạm nước, không thay trang
Lịch sử & So sánh của cảm biến môi trường.

## 1. Xem lại dữ liệu đúng kênh

Mỗi kênh WATER có nút **Lịch sử WATER01 LOW**, **Lịch sử WATER01 FLOW** hoặc mã
node/kênh tương ứng. Kênh có thể chưa từng gửi dữ liệu; lịch sử khi đó rỗng,
không tạo mẫu hoặc giá trị thay thế. Node môi trường vẫn dùng API v1 cũ.

Mặc định xem 24 giờ kết thúc theo thời điểm backend trả danh sách node khi
mở lịch sử. Từ/Đến hiển thị theo giờ máy; request chuyển sang ISO UTC. Khoảng
là **[Từ, Đến)**: gồm mốc Từ, không gồm mốc Đến, tối đa 31 ngày. Thay bộ lọc
xong bấm Áp dụng lịch sử. Đây là khoảng cố định, không polling tự mở rộng mốc
Đến; muốn xem mẫu mới hơn phải chọn lại mốc Đến và áp dụng.

Có thể lọc SIMULATOR, PHYSICAL, UNSPECIFIED và VALID/SENSOR_FAULT. Nguồn là
thiết bị khai báo, không chứng minh phần cứng/hiệu chuẩn. Khi xem Tất cả, mỗi
dòng vẫn có nhãn riêng; không gộp nguồn mô phỏng với đo vật lý để tính toán.

Bảng giữ sample ID, bootId, sequence, timestamp nguồn, giờ backend nhận, giá
trị, quality, dataSource và calibrationVersion của mẫu:

- Phao false là Không có nước, khác lỗi/null. Không suy ra phần trăm bồn.
- Flow 0 VALID là số 0 thật trong hồ sơ, khác SENSOR_FAULT/null.
- Fault hiển thị dấu — và Lỗi cảm biến, không quay về giá trị hợp lệ cũ.
- Nhiệt/áp chỉ có nếu đã khai báo và thiết bị có gửi; không giả measurement.
- Mẫu cũ vẫn đọc được dù không đủ freshness để đánh giá cảnh báo/điều khiển.

Giờ đo/nhận trong bảng là ISO gốc, giữ phần microsecond. Thời gian nhận không
thay cho thời gian đo. Bảng lịch sử không khẳng định thiết bị hiện đang online.

## 2. Phân trang

Web tải tối đa 100 dòng/trang. Trang tiếp theo thay nội dung bảng, không âm
thầm nối thành tập dữ liệu lớn. Tải lại từ đầu dùng lại khoảng/bộ lọc đã áp
dụng và lấy mốc ID mới. Nếu đang sửa bộ lọc, áp dụng trước khi xuất/phân trang.

API chỉ đọc:

```text
GET /api/v1/nodes/{nodeId}/channels/{channelId}/history
    ?from=2026-10-14T00:00:00Z&to=2026-10-15T00:00:00Z
    &dataSource=SIMULATOR&quality=VALID&limit=100
```

Response có nodeId, khai báo channel, from/to, bộ lọc đã áp dụng, snapshotId,
items và nextCursor. API cho limit 1–1000; web dùng 100. Kênh không thuộc
WATER/v2 hoặc chưa khai báo trả 404. Tham số sai trả 400.

Cursor gắn với node/channel/from/to/source/quality; trang sau phải giữ các
tham số đó, gửi thêm cursor. Sắp xếp giờ đo giảm dần rồi sample ID giảm dần
để mẫu trùng timestamp không trùng/mất dòng. Không coi thứ tự ID là thời gian
nhân quả hoặc thứ tự sequence của thiết bị.

Lượt đầu lấy mốc ID tối đa của node, trang sau giới hạn ID đó để mẫu chèn sau
không chen vào lượt đang xem, kể cả timestamp cũ. Đây không phải snapshot
transaction xuyên nhiều HTTP request: transaction đã giữ ID trước lượt đầu
nhưng commit muộn có thể vẫn xuất hiện. Không dùng API này để tuyên bố một
báo cáo kiểm toán toàn bộ dữ liệu bất biến. Muốn làm báo cáo định kỳ cần job
snapshot/export riêng, quyền và retention phù hợp.

## 3. Xuất CSV theo trang đang hiển thị

Bấm **Xuất CSV trang này**. Tệp UTF-8 có BOM để Excel đọc chữ Việt/°C. Tên gồm
mã node/kênh. CSV chứa đúng các dòng của trang hiện tại, không phải tổng toàn
bộ khoảng và không tự gọi hàng nghìn trang. Phân trang hoặc thu hẹp khoảng
trước khi xuất phần dữ liệu khác.

Các cột gồm node/channel, metric/unit, range_from/to, sample_id, observed_at,
received_at, data_source, quality, value, calibration_version, boot_id,
sequence. Boolean xuất true/false, số 0 giữ 0, fault value để rỗng với quality
SENSOR_FAULT. Số trong CSV không bị làm tròn như phần hiển thị trên web.

CSV quote/escape chuỗi và bảo vệ văn bản hiệu chuẩn bắt đầu bằng dấu có thể
được spreadsheet hiểu là công thức. Số âm kiểu numeric, ví dụ nhiệt -2.5,
vẫn giữ numeric. Phiên bản hiệu chuẩn trong mỗi dòng là của mẫu, không lấy
version hiện tại của registry thay cho dữ liệu quá khứ.

Nếu API lỗi, sai node/kênh/nguồn hoặc bộ lọc chưa áp dụng, xuất/phân trang tạm
khóa. Bảng cũ còn hiển thị có nhãn chưa xác nhận lượt mới. Phản hồi cũ đến muộn
không được thay bảng của bộ lọc mới. Mẫu sai kiểu, trùng ID, sai thứ tự, ngoài
khoảng hoặc vượt mốc phân trang bị từ chối thay vì xuất lẫn dữ liệu.

**Chưa tính tổng lít hoặc tiền nước.** Tích phân lưu lượng cần chu kỳ lấy mẫu,
hiệu chuẩn, xử lý mất mẫu/khởi động lại, ranh giới job và tách nguồn rõ ràng.
Không nhân số L/min cuối cùng với thời gian bật relay để gọi đó là lượng đo.

## 4. Sử dụng trên Windows

Từ gốc repo trong Git Bash:

```bash
git pull --ff-only origin feat/day1-iot-foundation
```

Restart backend bằng cấu hình/database đang dùng. Đợt này không thêm migration
sau V16 và không đổi firmware; không cần tạo lại database/certificate hoặc
flash simulator chỉ để xem lịch sử. Giữ frontend và gateway ở terminal riêng.
Nếu chỉ đọc dữ liệu đã lưu, có thể dừng simulator; không cần mở lại MQTT test
client. Dữ liệu mới vẫn cần WATER đã triển khai theo chương 23.

```bash
SMARTFARM_CONTROL_ENABLED=false bash tools/backend/run_backend_windows.sh
```

Mở Sensor Realtime → Node & trạm nước → Lịch sử của kênh cần xem. Kiểm tra giờ
máy khi nhập range, nguồn và quality trước xuất. Giao diện demo chưa có phân
quyền, chưa mở cho Internet để vận hành thật.

## 5. Lỗi và bằng chứng

Trong kiểm thử đã gặp Playwright không nhận chuỗi datetime-local có giây 00
ở một thao tác fill; dùng dạng phút đúng với native input. Việc này cũng làm
lộ lỗi so sánh chuỗi phút/giây khiến UI cứ coi bộ lọc đã đổi sau Apply. Đã sửa
so sánh bằng thời điểm thực và thêm ca browser dùng input dạng phút.

Backend kiểm tra PostgreSQL cho 9 ca mới; toàn bộ Maven verify **141 test**
đạt, không skip. **18 browser node/history**, **12 unit node/history**, lint/build
đạt. CSV được tải thực trong browser fixture, kiểm tra số dòng/nguồn/0/fault.

Smoke ứng dụng đầy đủ dùng các packet WATERALARM đã lưu trong schema test
water_alert_smoke từ đợt V16: jar mới đọc 4 mẫu/kênh, lọc PHYSICAL rỗng rồi
SIMULATOR/VALID, tải CSV LOW/FLOW đúng ID/value. Chỉ GET API, MQTT/control tắt;
command/run vẫn bằng 0. Đây là dữ liệu fixture local đã đi qua router ở đợt
trước, chưa phải nghiệm thu AWS/Wokwi mới. Xem [báo cáo](../implementation/WATER_HISTORY_REPORT.md).

| Nghiệm thu trên máy người dùng | Trạng thái đợt này |
|---|---|
| WATER gửi mới qua AWS, lịch sử thấy đúng kênh/source | Chưa chạy |
| Chỉnh phao/flow, lịch sử giữ thay đổi và fault/null | Chưa chạy |
| Tắt simulator, khởi động backend lại, đọc lịch sử cũ | Chưa chạy |
| CSV trên Excel Windows đúng Unicode, giờ, boolean và số 0 | Chưa chạy |

Phần no-flow pump cutoff/grace, bảo vệ cục bộ, tổng lượng nước, nhiều van/zone
và NVS vẫn là bước sau. Lịch sử/cảnh báo nước không cấp quyền khởi động bơm.


Bổ sung sau mốc này: [chương 26](CHAPTER_26_LOCAL_FLOW_GUARD.md) có prototype
flow guard cục bộ opt-in trên ENV01, chưa nghiệm thu live hoặc binding WATER01.
Các đoạn cutoff chưa làm phía trên mô tả mốc history trước bổ sung này.

## Bổ sung 15/10/2026 — ước tính FLOW riêng

[Chương31](CHAPTER_31_WATER_VOLUME.md) thêm phép tích phân lịch sử với source/
boot/seq/calibration/quality/receipt/gap và coverage. Raw history/CSV giữ nguyên;
phần “chưa tính tổng lượng nước” phía trên là trạng thái ở mốc chương25. Màn
Tiêu thụ Nước & Điện hiển thị ước tính đoạn hợp lệ, không công tơ/bill/thực địa.
