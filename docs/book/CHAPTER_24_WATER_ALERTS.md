# Chương 24 — Cảnh báo trạm nước và xác nhận đã xem

Ngày 14/10/2026. Tiếp nối [trạm nước độc lập](CHAPTER_23_WATER_NODE_MONITOR.md).
Đợt này thêm cảnh báo giám sát được lưu trong PostgreSQL, có nguồn dữ liệu và
tham chiếu packet. Không thêm lệnh điều khiển bơm, email hoặc dịch vụ AWS mới.

## 1. Điều kiện cảnh báo

Trong **Trung tâm Cảnh báo**, chọn nhóm **Trạm nước**. Nhóm cảm biến môi trường
vẫn dùng API và lịch sử cũ, không đổi mã hay diễn giải độ ẩm/nhiệt độ.

| Điều kiện | Mở | Hết điều kiện |
|---|---|---|
| Nước dưới phao LOW | LOW=false, HIGH=false, cả hai VALID trong cùng packet | LOW=true với HIGH hợp lệ, không bất nhất |
| Hai phao bất nhất | LOW=false, HIGH=true, cả hai VALID | Hai phao VALID và kết hợp nhất quán |
| Lỗi cảm biến từng kênh | quality=SENSOR_FAULT, value=null | Kênh đó báo VALID |

Hai quy tắc mức bồn chỉ áp dụng khi khai báo có kênh **LOW/HIGH** với metric
WATER_PRESENT. Nếu dùng tên khác, backend không tự đoán vị trí phao.
Lỗi từng kênh áp dụng cho các kênh nước đã khai báo, bao gồm FLOW/nhiệt/áp
nếu firmware có gửi. Không tạo nhiệt/áp hoặc lỗi giả khi kênh đó vắng mặt.

Firmware WATER hiện nhận ra tổ hợp phao bất nhất ở thiết bị và gửi hai kênh
SENSOR_FAULT/null. Vì giá trị thô không được gửi, Trung tâm sẽ mở **lỗi LOW và
lỗi HIGH**, không tự khẳng định nguyên nhân. Loại Hai phao bất nhất dành cho
packet còn gửi hai giá trị VALID nhưng không nhất quán. Không thay đổi firmware
hoặc schema v2 chỉ để suy đoán nguyên nhân từ null.

**FLOW=0 với quality VALID không phải cảnh báo mất dòng.** Muốn phát hiện
bơm không tạo lưu lượng cần liên kết bơm đang chạy, thời gian mồi, hiệu chuẩn
và bảo vệ cục bộ. Phần đó vẫn chưa làm. Cảnh báo LOW không chứng minh lượng
nước còn lại, phần trăm bồn hoặc quyền an toàn để khởi động PUMP01.

## 2. Hai mẫu liên tiếp và dữ liệu thiếu

Mở và hết mỗi điều kiện đều cần hai packet:

- Được parser/registry chấp nhận và lưu mới; bản QoS trùng không tính lần hai.
- Timestamp không quá 30 giây so với backend, không vượt dung sai tương lai
  2 giây của parser. Timestamp phải tăng, so sánh ở độ chính xác millisecond.
- Cùng bootId, sequence tăng đúng 1 và khoảng cách thời gian đo tối đa 15 giây.
- Cùng dataSource. Mất một kênh cần đánh giá, đổi boot/source, thiếu sequence
  hoặc khoảng cách quá dài làm lại chuỗi xác nhận từ mẫu đầu tiên.

Ví dụ LOW khô/HIGH khô ở seq 10 chỉ tạo ứng viên. Seq 11 vẫn khô, cùng boot,
nguồn và thời gian phù hợp mới mở đợt. Sau đó hai mẫu LOW có nước mới hết.
Hai mẫu SENSOR_FAULT không xóa cảnh báo LOW đang mở. Mất mạng không có mẫu
mới để đánh giá, nên không tự xóa cảnh báo; xem độ mới tại Sensor Realtime.

Packet lịch sử, đến sai thứ tự hoặc cùng timestamp có thể được lưu như trước
nhưng không đổi cảnh báo. Việc lưu packet/kênh và cập nhật điều kiện nằm trong
cùng transaction. Cursor theo node được khóa để các lượt nhận đồng thời không
mở nhiều đợt. Không đọc toàn bộ lịch sử để tạo lại cảnh báo sau nâng cấp.

## 3. Nguồn và bằng chứng

Mỗi đợt có node, loại, kênh (nếu có), dataSource, mẫu mở/hết, giờ đo và giờ
backend nhận mẫu. Nhãn PHYSICAL chỉ là thiết bị khai báo, không chứng minh
phần cứng đã được hiệu chuẩn. SIMULATOR/PHYSICAL/UNSPECIFIED giữ đợt riêng.
Đổi nguồn không đóng cảnh báo nguồn cũ; cần mẫu bình thường cùng nguồn để hết.

Ví dụ đợt mô phỏng cũ còn mở sau khi đổi sang vật lý là lịch sử điều kiện chưa
có bằng chứng hết, không có nghĩa nước vật lý đang cạn. Bộ lọc Nguồn giúp xem
đúng nhóm. Không xóa hồ sơ cũ hoặc đổi nhãn mô phỏng thành vật lý.

V16 thêm water_alert_cursor/state/alert, không sửa bảng cảnh báo môi trường.
Mẫu và trạng thái điều kiện được lưu nên restart backend không mất đợt hoặc
xác nhận đã xem. Chuỗi đang chờ vẫn phải đáp ứng thời gian/boot/sequence;
restart không tự tạo mẫu, lệnh ON hoặc giả dữ liệu mới.

API riêng:

```text
GET /api/v1/water-alerts
GET /api/v1/water-alerts/{id}
PUT /api/v1/water-alerts/{id}/acknowledgement
{"note":"Đã kiểm tra phao"}
```

Danh sách tối đa 100 đợt, ưu tiên đang mở rồi chưa xem, mới nhất theo ID trong
nhóm. Bộ lọc điều kiện/đã xem/nguồn chạy trên danh sách đã tải, không phải thống
kê toàn bộ lịch sử. Chi tiết theo ID vẫn đọc được khi ra khỏi 100 đợt gần nhất.
Tổng quan IoT, Event Log và Safety hiện vẫn dùng read model cũ; đợt này chưa
hợp nhất cảnh báo nước vào các thống kê đó. Xem đúng nhóm Trạm nước để đối chiếu.

## 4. Xác nhận đã xem

Mở Chi tiết cảnh báo nước, nhập ghi chú không bắt buộc, tối đa 500 ký tự, rồi
Xác nhận đã xem. Backend giữ ghi chú/thời điểm đầu tiên. Retry cùng nội dung
là idempotent; ghi chú khác trả xung đột, không ghi đè. Đợt đã hết mà chưa xem
không được xác nhận ngược thời điểm. Đợt đã xem rồi hết vẫn giữ metadata cũ.
Đợt tái phát có ID mới và chưa xem.

Giao diện chỉ báo thành công sau phản hồi đúng ID, node, loại, nguồn và bằng
chứng mở đợt. Nếu mất phản hồi hoặc server lỗi, không tự gửi lại: dùng Đối chiếu
trạng thái. Phản hồi cũ không ghi đè kết quả xác nhận mới. API lỗi hoặc dữ liệu
không hợp lệ khóa thao tác lưu, giữ bản nháp. Ghi chú hiển thị như văn bản.

Xác nhận chỉ là metadata đã xem, không đóng cảnh báo, không reset khóa hoặc
tắt rule/relay. Chưa có đăng nhập nên chưa ghi danh tính người xác nhận. API
vẫn phục vụ demo local, không mở công khai để vận hành thật.

## 5. Thử trên Windows

Tại gốc repo bằng Git Bash:

```bash
git pull --ff-only origin feat/day1-iot-foundation
```

Dừng backend cũ bằng Ctrl+C tại terminal của nó, giữ PostgreSQL đang Healthy,
rồi chạy lại cùng cấu hình đang dùng để áp dụng V16. Không tạo lại db.env,
reset Docker volume hoặc đổi database để chữa migration.

```bash
SMARTFARM_CONTROL_ENABLED=false bash tools/backend/run_backend_windows.sh
```

Giữ frontend/gateway ở terminal riêng. WATER01 cần hoàn thành quy trình riêng
ở chương 23, được backend nhận telemetry v2. Đợt này không đổi firmware, vì
vậy không cần flash lại chỉ để có Trung tâm Cảnh báo nước.

Trong simulator WATER, LOW/HIGH trái là có nước, phải là khô:

| Ca thử | Thao tác/mong đợi | Nghiệm thu AWS/Wokwi đợt này |
|---|---|---|
| Mở cảnh báo | Hai phao phải, chờ ít nhất hai packet mới và một lượt polling; LOW_WATER xuất hiện | Chưa chạy |
| Xác nhận | Ghi chú, lưu; điều kiện vẫn mở, đã xem riêng | Chưa chạy |
| Hết điều kiện | LOW trái/HIGH phải, hai packet mới; đợt cũ hết nhưng giữ ghi chú | Chưa chạy |
| Lỗi phao | LOW phải/HIGH trái: firmware phát fault/null; hai đợt lỗi LOW/HIGH sau hai packet | Chưa chạy |
| Flow 0 | Gate flow phải; 0 L/min VALID không tạo cảnh báo mất dòng | Chưa chạy |
| Mất mạng | Tắt gateway; dữ liệu cũ nhưng đợt đang mở không tự hết | Chưa chạy |
| Restart backend | Hồ sơ/ghi chú còn nguyên, không có lệnh bơm từ cảnh báo | Chưa chạy |

Ở chu kỳ 5 giây, thường cần khoảng 10–15 giây kể từ chỉnh công tắc, tùy thời
điểm lấy mẫu và polling. Kiểm tra timestamp/boot/sequence và source thay vì
bấm lại liên tục. Nếu chưa có cảnh báo, đối chiếu Node & trạm nước có mẫu mới,
log telemetry backend, registry/channels, migration V16; không thêm quyền
AdministratorAccess hoặc tạo lại certificate để chữa lỗi UI.

## 6. Bằng chứng đã chạy trong cloud

132 test backend không skip, gồm 13 test cảnh báo nước qua PostgreSQL; 17 ca
browser (9 môi trường cũ + 8 nước), 4 unit frontend nước, lint/build đạt.
Đã nâng schema có 2 packet/6 channel từ V15 lên V16 giữ nguyên mẫu, command/run
bằng 0 và không backfill cảnh báo.

Smoke toàn ứng dụng dùng schema test riêng water_alert_smoke, MQTT/control tắt.
Fixture gọi parser/router/store/evaluator thật bằng packet v2 mô phỏng trong
process local; không gửi MQTT hay AWS. Sau đó React đọc API thật, lưu ghi chú,
restart process backend, đọc lại và nhận hai mẫu bình thường để hết đợt.
Xem bằng chứng và lệnh tái lập trong [báo cáo](../implementation/WATER_ALERTS_REPORT.md).
Các kiểm tra này chưa thay cho nghiệm thu AWS/Wokwi hoặc phần cứng thật.
