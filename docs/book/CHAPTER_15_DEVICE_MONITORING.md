# Giám sát thiết bị từ dữ liệu thật

Trang Giám sát thiết bị trước đây hiển thị danh sách giả lập, pin, firmware,
OTA và cấu hình chưa có backend thật. Bản này chỉ hiển thị thông tin có bằng
chứng: cảm biến đã đăng ký, khu vực, số đo, cảnh báo mở, trạng thái relay và
kết nối MQTT của backend. Không có nút OTA hoặc thay cấu hình giả.

## Ba thông tin phải tách riêng

1. **Kết nối backend với AWS MQTT** lấy từ lifecycle SDK: đang kết nối,
   đã kết nối, ngắt kết nối hoặc MQTT chưa bật. Đây không phải Wi-Fi của ESP32.
2. **Độ mới số đo/trạng thái** xét cả timestamp thiết bị và lúc backend ghi
   nhận mẫu đó. Cảm biến dùng 30 giây như Sensor Realtime; relay dùng 15 giây.
   Quy tắc tưới vẫn có giới hạn riêng 15 giây, không được nới thành 30 giây.
3. **Hoạt động nhận bản tin đã lưu** xét thời điểm nhận gần nhất. Một mẫu cũ
   đến muộn có thể tạo hoạt động nhận, nhưng không biến số đo cũ thành mới.

Không nhận được mẫu trong 30 giây có nhiều nguyên nhân: thiết bị mất mạng,
ngừng gửi, backend mất kết nối, queue/DB gặp lỗi. Trang không gán OFFLINE chắc
chắn chỉ từ im lặng. IAM hiện chưa subscribe heartbeat/LWT của mọi sensor;
không tự thêm quyền hoặc ghi sự kiện mất mạng bằng suy đoán.

## API và thời gian

`GET /api/v1/monitoring` chỉ đọc, trả `asOf`, `mqtt` và `devices`.
Mỗi sensor có khu vực, số đo mới nhất theo timestamp nguồn, receivedAt của
mẫu đó và lastMessageAt là MAX(received_at) của các mẫu đã lưu. Pump lấy status
đã lưu; chưa có status thì trả null, không mặc định OFF. Cảnh báo mở không tự
đóng khi mất dữ liệu. Không cần migration mới.

API phân loại FRESH/STALE/EMPTY/CLOCK_SKEW và RECENT/SILENT/NEVER_SEEN.
UI không gọi RECENT là thiết bị chắc chắn online. Thời gian lệch tương lai quá
2 giây được đánh dấu. lastProcessedAt của MQTT là lúc worker xử lý bản tin
hợp lệ, không phải timestamp nguồn hoặc thời điểm packet đến network stack.

UI dùng asOf của server cộng thời gian trôi qua kể từ lúc gửi request
(theo performance.now(), tính dư độ trễ một cách bảo thủ), tránh
phụ thuộc đồng hồ Windows để đánh giá freshness. Poll mỗi 5 giây, timeout
5 giây. Khi GET thất bại, giữ số cũ nhưng hiện lỗi; không gọi đó là mất mạng
thiết bị. Relay quá hạn hoặc API lỗi hiển thị Chưa xác định; ON/OFF lần trước
chỉ được ghi rõ là lịch sử.

## Kiểm tra và sử dụng

Cloud đạt 61 backend tests không skip (thêm test lifecycle và dữ liệu muộn),
7 browser fixtures giám sát, 6 frontend unit tests (monitoring và telemetry),
lint/build. Smoke toàn app đi qua menu → Vite proxy → Spring → PostgreSQL test
riêng đạt. MQTT/control tắt trong cloud smoke, không chứng minh AWS hoặc GPIO.

Windows: cập nhật branch, restart backend và frontend, mở IoT → Giám sát
thiết bị. Giữ Wokwi chạy để xem thời gian nhận đổi, mở ENV01 xem số đo/cảnh báo,
mở PUMP01 xem status. Lọc theo khu vực hoặc loại thiết bị. Khi ngừng simulator,
chờ các nhãn dữ liệu cũ; không coi đó là bằng chứng thiết bị mất nguồn. Nếu
backend tắt, trang phải báo không tải được trạng thái, không gán OFFLINE.

Không cần sửa IAM hoặc build firmware. Phần heartbeat/LWT cho mọi thiết bị,
cảnh báo offline có bằng chứng, NVS và phục hồi mạng vẫn là công việc tiếp theo.
