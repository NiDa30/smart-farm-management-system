# Tổng quan IoT từ dữ liệu thật

Dashboard cũ dùng mock trong AppContext: số thiết bị, pin, van, cảnh báo và
quy tắc không phản ánh PostgreSQL. Bản này chỉ dùng navigate từ context;
toàn bộ số liệu IoT lấy qua GET /api/v1/dashboard/overview cho FARM001.
Không tạo lệnh bật/tắt khi mở trang hoặc nhấn Làm mới.

## Tổng hợp các nguồn

API ghép registry/khu vực, DeviceMonitoring, alert đang mở, WateringRule state
và tám sự kiện gần nhất trong 24 giờ. Các truy vấn DB nằm trong transaction
read-only REPEATABLE_READ để tổng cảnh báo và danh sách preview không lệch
nhau do dữ liệu đổi giữa các truy vấn. Lifecycle MQTT ở bộ nhớ vẫn là bằng
chứng riêng của backend, không phải snapshot Wi-Fi thiết bị.

Các số chính gồm cảm biến đã đăng ký, cảm biến có mẫu mới trong 30 giây,
khu vực và tổng cảnh báo đang mở. Không gọi cảm biến chưa có số đo là online.
PUMP01 là relay logic cùng ESP32 ENV01, không phải sensor hoặc AWS Thing thứ
hai; không tính nó vào số cảm biến. Số đăng ký không phải số thiết bị vật lý
đã được cấp certificate hoặc đang vận hành.

Trung bình khu vực chỉ dùng các sensor có cả timestamp nguồn và thời điểm
backend ghi nhận còn mới. Mẫu quá cũ, lệch giờ hoặc thiếu dữ liệu bị loại.
Nếu không còn mẫu mới, dùng dấu — thay vì 0°C/0%. Mỗi sensor có trọng số bằng
nhau; đây là trung bình số đo hiện tại, không phải thống kê theo thời gian.

Cảnh báo preview tối đa năm dòng; tổng số đếm độc lập trên tất cả alert chưa
đóng. Khi có sáu cảnh báo, card phải hiện sáu dù preview chỉ có năm. Relay quá
15 giây hiển thị Chưa xác định, giữ ON/OFF cũ với nhãn lần báo trước. Quy tắc
vẫn yêu cầu telemetry trong 15 giây, khác ngưỡng 30 giây của tổng quan.

## Giao diện và giới hạn

Poll mỗi 5 giây, timeout 5 giây. Độ mới tự giảm theo asOf server cộng thời
gian trôi qua từ lúc gửi request, dùng performance.now() để tránh phụ thuộc
đồng hồ Windows. API lỗi giữ bản chụp cũ nhưng hiện cảnh báo; không giữ khẳng
định kết nối hiện tại và không tiếp tục hiển thị trung bình như dữ liệu mới.

Các nút chỉ đi tới Giám sát, Sensor Realtime, Cảnh báo, Điều khiển, Quy tắc
và Event Log. Điều khiển vẫn thực hiện ở màn chuyên biệt với gate an toàn,
không tạo shortcut bỏ qua ACK hoặc trạng thái thiết bị. SENT chưa là thực
thi; bảng sự kiện ghi nguồn thời gian và liên kết sang nhật ký chi tiết.

Không có dữ liệu giả cho pin, pH, công suất, van hoặc lưu lượng chưa được thu.
Không thay IAM, firmware hay schema DB. Không tự bật rule để làm đầy dashboard.

## Kiểm tra

Cloud đạt 64 backend tests không skip, trong đó ba test tổng quan kiểm tra
API composition, preview/total và GET không đổi command/rule. Bảy browser
fixtures kiểm tra card, trung bình loại mẫu cũ, relay không rõ, điều hướng,
empty/error/recovery và body sai. Chín frontend unit tests kiểm tra telemetry,
monitoring và thống kê khu vực. Lint/build đạt.

Smoke full app đi từ menu Tổng quan sang Giám sát/Cảnh báo, dùng Vite proxy,
Spring Boot và PostgreSQL test riêng. API write và request ra ngoài bị chặn;
MQTT/control=false, nên không chứng minh AWS hoặc GPIO. Nghiệm thu automation
và mạng Wokwi chưa được tự đánh dấu hoàn tất bởi các kiểm tra này.

Windows: pull bản cloud mới, restart backend/frontend, mở IoT → Tổng quan IoT.
Giữ Wokwi chạy để số đo mới xuất hiện, đối chiếu với Sensor Realtime. Khi dừng
simulation, các số đo hết hạn phải rời khỏi trung bình khu vực. Mở các màn từ
nút điều hướng để xem chi tiết. Không cần build firmware hoặc đổi IAM.
