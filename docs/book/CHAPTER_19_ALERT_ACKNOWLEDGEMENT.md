# Chương 19 — Đã xem cảnh báo không có nghĩa đã hết bất thường

Cảnh báo trước đây chỉ có điều kiện đang mở hoặc đã trở về bình thường. Trong
vận hành cần biết có người đã xem và ghi chú kiểm tra hay chưa, nhưng một lần
bấm nút không thể chứng minh đất đã đủ ẩm hoặc nhiệt độ đã giảm. Bản ngày
14/10/2026 thêm xác nhận đã xem, tách khỏi điều kiện cảm biến.

## Thao tác trên Trung tâm Cảnh báo

Mở IoT → Trung tâm Cảnh báo → **Chi tiết cảnh báo #…**. Với cảnh báo đang
hoạt động và chưa được xem, nhập ghi chú tùy chọn, tối đa 500 ký tự, rồi bấm
**Xác nhận đã xem**. Trang chỉ báo đã lưu sau khi backend trả đủ dữ liệu khớp.

Sau xác nhận, đất thấp vẫn đang cảnh báo cho tới khi có mẫu mới đạt 35%; nhiệt
độ cao vẫn chờ mẫu mới xuống 33°C. Ngưỡng mở/đóng của [chương 12](CHAPTER_12_SENSOR_ALERTS.md)
không thay đổi. Xác nhận không tác động relay, quy tắc tưới hoặc gửi email.
Tổng cảnh báo đang mở ở Dashboard/Giám sát vẫn tính cả cảnh báo đã xem.

Có hai bộ lọc độc lập: **Điều kiện** (đang cảnh báo/đã bình thường) và **Xác
nhận** (chưa xem/đã xem). Bộ lọc áp dụng trong 100 bản ghi được tải, không phải
thống kê đầy đủ toàn lịch sử. Backend ưu tiên cảnh báo đang hoạt động, rồi
chưa xem. Chi tiết đang mở vẫn giữ lại nếu bản ghi ra khỏi danh sách này.

Ghi chú đầu tiên và thời điểm xác nhận được giữ nguyên. Bản hiện tại không
sửa/xóa ghi chú đã lưu, không tự gán danh tính từ người dùng mẫu trên topbar.
Chưa có backend đăng nhập/phân quyền; xác nhận lưu thao tác local, không phải
bằng chứng nhận dạng người thực hiện.

## API và tính lặp an toàn

Migration V12 thêm acknowledged_at và acknowledgement_note vào sensor_alert.
Cảnh báo cũ có hai trường null, không backfill thời điểm giả. Dữ liệu điều kiện,
sensor_alert_state và metadata tưới V11 được giữ nguyên.

| API | Mục đích |
|---|---|
| GET /api/v1/alerts | Tối đa 100 cảnh báo với trạng thái điều kiện và xác nhận riêng |
| GET /api/v1/alerts/{id} | Đọc đúng incident, kể cả ngoài 100 bản ghi mới |
| PUT /api/v1/alerts/{id}/acknowledgement | Ghi nhận đã xem cùng note tùy chọn |

PUT khóa row trong transaction. Nếu chưa xác nhận và còn mở, lưu thời điểm
backend và ghi chú đã bỏ khoảng trắng đầu/cuối. Note trống lưu null. Gửi lại
cùng nội dung chuẩn hóa trả cùng kết quả, không đổi timestamp, kể cả khi cảm
biến đã đóng incident sau lần xác nhận đầu. Hai request đồng thời cùng ghi chú
chỉ tạo một sự kiện đã xem trong read model.

Nếu ghi chú khác với bản đầu đã lưu, trả 409; không ghi đè thao tác từ tab khác.
Nếu incident đã bình thường trước lần xác nhận đầu, trả 409. ID không tồn tại
trả 404; dữ liệu sai hoặc note dài hơn 500 ký tự trả 400. JSON note phải là
chuỗi hoặc null; không nhận số/object bằng cách ép thành chuỗi.

ACK của người xem chỉ là metadata incident. Khi cảm biến mở một incident mới
sau lần đóng, incident mới vẫn chưa được xem, không thừa hưởng ghi chú cũ.

## Mất phản hồi và hai tab

Mất kết nối sau PUT có thể xảy ra sau khi DB đã lưu. Giao diện không tự gửi
lại và không suy thành công từ HTTP 200 có body sai. Nó giữ ghi chú đang soạn,
báo chưa xác nhận và yêu cầu **Đối chiếu trạng thái**, dùng GET theo ID.

Sau GET, bản lưu server được hiển thị; nếu tab khác đã ghi chú khác, bản nháp
chưa lưu vẫn hiện để người vận hành đối chiếu. Khi API danh sách lỗi, thao tác
xác nhận bị khóa. Polling không ghi đè bản nháp và response cũ không được làm
mất kết quả vừa lưu. Chi tiết độc lập với giới hạn 100 để không mất chỗ đối
chiếu khi thứ tự ưu tiên thay đổi sau xác nhận.

Nếu người vận hành chủ động đóng chi tiết, bản nháp tại trình duyệt sẽ mất;
metadata đã lưu trong DB vẫn còn. Không gọi bản nháp là nhật ký đã được lưu.

## Nhật ký sự kiện và Dashboard

Event Log thêm ALERT_ACKNOWLEDGED, hiển thị **Xác nhận đã xem cảnh báo** với
trạng thái Đã xem cảnh báo. Timestamp là thời điểm backend đã lưu; sourceAt
null vì không có timestamp thiết bị cho thao tác người xem. Không tạo liên
kết commandId/runId giả và không đưa note vào reason của Event Log.

Sự kiện này khác COMMAND_ACK — ACK thực thi do thiết bị gửi cho lệnh relay.
Dashboard nhận được loại sự kiện mới nhưng tổng đang mở vẫn dựa cleared_at.
Event Log vẫn là read model từ bảng nguồn, chưa phải kho audit bất biến.

## Lỗi gặp khi triển khai

Kiểm tra backend ban đầu phát hiện note dạng số 123 vẫn được Jackson ép sang
chuỗi, dù ứng dụng đã tắt scalar coercion. DTO mới kiểm tra trực tiếp kiểu JSON
của trường note, vẫn giữ record để từ chối thuộc tính không biết. Không thay
ObjectMapper chung để tránh ảnh hưởng các API hiện có. Toàn bộ 88 tests sau
sửa đã đạt, không bỏ assertion hoặc bỏ qua ca lỗi.

Kiểm tra browser đầu còn trượt ở label select có cả nội dung option và selector
Dashboard kỳ vọng sai thứ tự câu. Thêm aria-label rõ ràng cho hai bộ lọc và
sửa selector theo giao diện thật; chạy lại đủ các suites bị ảnh hưởng.

## Bằng chứng và cập nhật Windows

Cloud đạt 88 backend tests không skip, gồm 10 ca xác nhận mới; 9 browser cảnh
báo, 8 Event Log và 8 Dashboard; 17 unit frontend, lint/build đạt. Có thử
concurrency, idempotency, giữ ngưỡng/hysteresis, metadata sau clear/tái phát,
đọc ngoài 100 bản ghi và migration V11 → V12 không bịa dữ liệu cũ.

Smoke App thật → proxy → Spring Boot → PostgreSQL test lưu note, giữ incident
đang mở và tổng hai cảnh báo, hiện sự kiện người xem trong Dashboard/Event Log.
Sau restart backend, timestamp/note/cleared_at giữ nguyên. MQTT/control tắt,
không có lệnh AWS hoặc GPIO. Xem [báo cáo bàn giao](../implementation/ALERT_ACKNOWLEDGEMENT_REPORT.md).

Trên Windows, dừng backend cũ, pull feature branch, mở Git Bash mới tại gốc
repo và chạy helper backend như trước. Flyway tự thêm V12 vào DB demo hiện có;
không xóa volume. Refresh web rồi thử xác nhận một cảnh báo đang mở, kiểm tra
nó vẫn đang cảnh báo, xem Event Log và đổi số đo Wokwi để kiểm tra đóng theo
ngưỡng. Không cần đổi IAM, certificate hoặc build firmware. Phép thử Windows/
Wokwi với bản này còn chờ người dùng; kết quả cloud không thay nghiệm thu đó.
