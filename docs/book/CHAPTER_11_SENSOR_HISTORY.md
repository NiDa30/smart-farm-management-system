# Lịch sử cảm biến và CSV

Mục tiêu: xem dữ liệu đã lưu thay vì số minh họa. Chọn sensor trong registry,
khung1h/24h và chỉ số; API trả telemetry PostgreSQL theo timestamp thiết bị.
UI kiểm tra schema/identity/range, loại duplicate ID rồi sắp xếp thời gian.
Biểu đồ không nối qua khoảng thiếu >30s. Bảng/CSV giữ đầy đủ mẫu đã tải.
Thống kê min/max/mean là trên mẫu đã tải, không phải trung bình theo thời gian.

API tối đa1000 mẫu mới nhất: 1h lấy mẫu5s thường720, 24h thường17280 nên có
thể thiếu mẫu cũ. UI cảnh báo khi đạt giới hạn. Muốn thống kê đầy đủ24h cần
pagination hoặc aggregation backend; chưa triển khai, không che giới hạn.
CSV ghi timestamp UTC, receivedAt, device/boot/sequence và ba chỉ số; UTF8 BOM
để Excel mở được. Nút bị vô hiệu khi dữ liệu rỗng/lỗi/đang tải.

Kiểm tra Windows: mở Lịch sử & So sánh, chọn ENV01/1 giờ, đối chiếu số đo
với Wokwi và xuất CSV. Chọn24 giờ xem cảnh báo nếu đạt1000 mẫu. Đổi chỉ số
chỉ đổi biểu đồ/thống kê, CSV vẫn giữ ba chỉ số. Nhấn Làm mới để lấy mẫu mới.
Chưa tự động làm mới hay xuất toàn bộ24h, không sửa cấu hình AWS.
