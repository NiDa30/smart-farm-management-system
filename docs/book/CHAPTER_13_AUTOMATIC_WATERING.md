# Quy tắc tưới tự động đầu tiên

MVP có một quy tắc cố định cho ENV01 → PUMP01, mặc định tắt. Chỉ bật quy tắc
khi cảm biến có dữ liệu mới trong 15 giây, thiết bị báo OFF mới, không khóa
an toàn và backend đã bật điều khiển. Hai mẫu mới có độ ẩm đất dưới 30%,
cách nhau không quá 15 giây, sẽ gửi lệnh ON trong 20 giây. Mẫu trùng hoặc
có timestamp cũ không tăng bộ đếm.

Nếu đất đạt 35%, hoặc dữ liệu/status trở nên cũ trong lần chạy, backend gửi
lệnh OFF sớm. Sau khi nhận trạng thái OFF mới, quy tắc nghỉ 60 giây trước
lần tiếp theo. Nếu đất vẫn khô và quy tắc vẫn bật, nó có thể chạy lại sau
khoảng nghỉ đó. Cần tắt quy tắc khi kết thúc demo.

Mỗi lần chạy theo dõi commandId trong PostgreSQL. SENT chỉ có nghĩa đã gửi,
chưa xác nhận thực thi. Nếu không xác nhận được lệnh ON, quy tắc tạm dừng,
không tự gửi lại ON. Lệnh dừng được thử một lần, rồi chờ trạng thái OFF mới.
Nếu chưa xác nhận dừng, người vận hành cần kiểm tra Điều khiển Actuator;
firmware vẫn có timer tự tắt 20 giây. GPIO không chứng minh bơm vật lý chạy.

Điều khiển thủ công qua API tạm dừng quy tắc trước khi gửi lệnh. Khởi động
lại backend cũng tạm dừng, không tự tiếp tục ON. Lệnh đang chạy trên thiết
bị có thể vẫn chạy đến cutoff của nó. Bản này chỉ hỗ trợ một backend process,
chưa có điều phối giữa nhiều instance hoặc điều chỉnh ngưỡng bằng giao diện.

## Thử trên Windows và Wokwi

Pull nhánh và restart backend để chạy migration V9. Giữ gateway, Wokwi và
frontend chạy. Chỉnh đất khoảng 45%, kiểm tra pump OFF và không khóa, rồi
bật quy tắc trong Quy tắc Tự động hóa.

Giảm đất xuống 28%. Chờ hai mẫu (telemetry mỗi 5 giây) và lượt đánh giá
quy tắc (mỗi 2 giây). LED phải bật; kiểm tra ACK SUCCESS ở Điều khiển Actuator.
Tăng đất lên 40% trước khi hết 20 giây để thử tắt sớm. Giữ đất ở 28% trong
lần khác để kiểm tra timer 20 giây và khoảng nghỉ 60 giây.

Thử tắt thủ công để xác nhận quy tắc tạm dừng. Tắt quy tắc sau demo. Các
kiểm tra cloud dùng transport giả lập; chưa thay thế nghiệm thu AWS/Wokwi thật.

Cảnh báo ngưỡng và quy tắc độc lập: việc đóng hoặc đọc cảnh báo không gửi
lệnh điều khiển. Lưu NVS và phục hồi kết nối Wokwi vẫn là công việc sau.
