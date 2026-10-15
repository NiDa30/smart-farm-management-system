# Chương 41 — Lịch sử bản tin van và CSV

15/10/2026 (Asia/Ho_Chi_Minh), migration V29, sau cảnh báo V28.

## Câu hỏi mà trạng thái cuối không trả lời

Thẻ nhánh chỉ cho biết quan sát gần nhất; đợt cảnh báo giữ bằng chứng mở và
phục hồi. Người vận hành còn cần xem các bản tin nằm giữa hai mốc đó để đối
chiếu boot, sequence, vị trí công tắc và thời điểm backend nhận. V29 bổ sung
lịch sử của **van02–99 chỉ giám sát, nguồn SIMULATOR**. Demo01 vẫn dùng luồng
cũ, chưa có trong lịch sử này. Chưa điều phối van–bơm hoặc phát command mới.

Trên web: **IoT & Tự động hóa → Điều khiển Actuator → Cấu hình nhánh tưới →
Lịch sử trạng thái van**. Mỗi dòng có giờ nhận, giờ đo, nhánh/phiên bản, van,
vị trí độc lập và mã lỗi/lý do. Chi tiết thêm tên cấu hình lúc nhận, vùng/
revision, controller, nguồn, boot/sequence, giờ ISO gốc và GPIO trong mẫu.
Giờ hiển thị dùng Asia/Ho_Chi_Minh; CSV giữ ISO gốc để đối chiếu.

Một dòng là bản tin được nhận, không phải một lần chuyển trạng thái. Nhiều
dòng CLOSED liên tiếp không chứng minh có nhiều lần đóng van. GPIO tắt không
thay cho công tắc CLOSED, và cả hai không chứng minh có nước tới cây.

## Lọc và đọc theo từng trang

Chọn 1giờ,24giờ,7ngày hoặc31ngày; nhập mã nhánh/mã van nếu cần. Chọn **Có lỗi**
để xem POSITION_FAULT hoặc DEVICE_FAULT, kể cả DEVICE_FAULT với công tắc đang
CLOSED. Bộ lọc vị trí vẫn đọc phản hồi độc lập: CLOSED, OPEN, UNKNOWN hoặc
CONFLICT. Một bản tin có thể vừa thuộc CLOSED vừa có lỗi controller.

Đổi lựa chọn chưa gửi yêu cầu; bấm **Đọc lịch sử van** để áp dụng. Dòng mô tả
bên dưới luôn ghi bộ lọc đã áp dụng. Khoảng giờ dùng **receivedAt của backend**,
bao gồm đầu, không gồm cuối. observedAt của thiết bị hiển thị riêng. Không
dùng độ trễ truyền mạng để dịch giờ đo thành giờ nhận.

Web tải50dòng/trang; API cho1–200. **Tải thêm mẫu van** giữ khoảng giờ, bộ lọc
và mốc ID lớn nhất của lần đọc đầu. Bản tin mới đến sau không chen vào các
trang đang đọc; bấm Đọc lại từ đầu mới thấy chúng. Sắp giờ nhận giảm dần,
cùng giờ thì ID giảm dần. Cursor gắn với bộ lọc và khoảng giờ; đổi phạm vi
không được dùng cursor cũ. Khoảng tối đa31ngày là giới hạn truy vấn, không
phải cam kết đã lưu đủ31ngày.

API lỗi khác với không có mẫu. Lỗi tải thêm giữ dòng đã đọc, báo chưa đầy đủ
và khóa xuất CSV cho đến khi thử lại thành công. Yêu cầu bộ lọc cũ trả chậm
không ghi đè kết quả mới. Không polling tự động làm dịch phạm vi phân trang.

## Xuất dữ liệu và bảo toàn cấu hình lịch sử

**Xuất CSV đã tải** chỉ xuất các dòng hiện đã tải, không gọi thêm API để lấy
toàn bộ tháng. File UTF-8 có BOM, gồm ID, nhánh/tên/revision, vùng/revision,
controller/van, source, monitorOnly, giờ đo/nhận, boot/sequence, GPIO, vị trí,
fault và reason. Chuỗi có dấu phẩy, dấu nháy hoặc xuống dòng được quote;
tên bắt đầu bằng công thức bảng tính được thêm dấu nháy đơn để tránh thực thi.

Mỗi dòng giữ cấu hình đúng lúc nhận. Đổi tên nhánh hoặc revision sau đó không
đổi các dòng cũ; chúng không bị ghép vào cấu hình hiện tại để trông như mới.
Không lấy dữ liệu của VALVE02 cho VALVE03. Mẫu không có capability vị trí là
UNKNOWN, không được điền CLOSED từ GPIO. Web kiểm tra thời gian với độ chính
xác dưới mili giây khi xác minh thứ tự và biên truy vấn PostgreSQL.

## Storage và tính nguyên vẹn

V29 thêm circuit_valve_history. Receiver V27 chỉ append sau khi đã chấp nhận
topic/identity/source/circuit/zone revision, thời gian, sequence, boot và fault
theo hợp đồng cũ. Status, retired boot, đợt cảnh báo và lịch sử cùng transaction;
lỗi INSERT history rollback tất cả. Unique(valve_id,boot_id,sequence) bảo vệ
thêm; bản tin QoS trùng hoặc bị từ chối không tạo dòng và không đổi giờ nhận.
Ghi lịch sử tuần tự lúc cấp ID cho đến commit để mốc phân trang không chứa
khe hở do giao dịch ID thấp còn chưa commit. Khóa chỉ giữ trong transaction
ghi DB, không qua MQTT hoặc HTTP. Chưa benchmark tải nhiều backend/node.

GET /api/v1/valve-history yêu cầu from/to; có circuitId, valveId, condition,
limit và cursor tùy chọn. Mặc định condition ALL, limit50. Không có HTTP
ingress tạo packet hoặc POST/PUT điều khiển từ màn lịch sử.

Migration không tự dựng lịch sử từ latest status hoặc từ bằng chứng cảnh báo
cũ. Nâng cấp xong cần **bản tin mới hợp lệ**. Vì vậy lịch sử rỗng sau nâng cấp
có thể đúng dù thẻ nhánh còn hiện mẫu cũ. Tắt monitor dừng nhận mới nhưng vẫn
đọc được các dòng đã lưu.

Hiện lưu mọi heartbeat hợp lệ, chưa có retention tự động. Với heartbeat5giây,
một van liên tục gửi khoảng17.280dòng/ngày; dữ liệu và index PostgreSQL sẽ
tăng theo số van/thời gian. Cần theo dõi dung lượng trước khi chạy dài hạn.
Không tự xóa dữ liệu hoặc tạo dịch vụ AWS mới trong đợt này. Chưa có API xóa
nhánh; xóa trực tiếp nhánh ở DB sẽ cascade lịch sử theo FK hiện tại.

## Bằng chứng và ca thực địa còn chờ

369backend đạt, không skip, gồm17ca history mới;11browser history,
18browser nhánh hồi quy,3unit parser, lint/build đạt. Kiểm tra snapshot
phân trang, tie-break ID, clock precision, retry, CSV và fault độc lập GPIO.
Native packet fixture dùng encoder đã có ở V28; không sửa firmware.

Full-app cloud dùng PostgreSQL riêng55439, MQTT/control/demo false, monitor
true. Ba packet native đi qua receiver thật, lịch sử giữ revision1 sau khi
nhánh được đổi tên/revision2. React mở qua menu thật, lọc fault/van không có
dữ liệu, xuất CSV và xem chi tiết; restart JVM giữ nguyên mọi trường. Nâng
V28→29 giữ cấu hình/queue/status/boot/episode/cursor, history rỗng đúng thiết
kế; không mock API, phát command, refresh mẫu cũ hoặc sửa DB demo5433.

Trên Windows pull nhánh, restart backend để Flyway áp V29; giữ cấu hình
monitor V27 và policy status đang dùng. Không cần build firmware hoặc thêm
IAM cho màn lịch sử. Không xóa volume PostgreSQL để áp migration.

| Ca | Kỳ vọng | Thực tế |
| --- | --- | --- |
| Board02 gửi nhiều heartbeat | Thêm dòng đúng van, boot/sequence tăng, hai giờ riêng | Chưa chạy |
| Gây fault công tắc rồi sửa/reboot | Có lỗi và các mẫu mới, không điền CLOSED giả | Chưa chạy |
| Dừng gateway hoặc gửi trùng | Không tạo bản tin lịch sử thay cho dữ liệu mất/trùng | Chưa chạy |
| Sửa revision nhánh và cập nhật board | Dòng cũ giữ cấu hình; chỉ boot/packet đúng revision mới được nhận | Chưa chạy |
| Xuất CSV và restart backend Windows | CSV chỉ dòng đã tải; dữ liệu đã lưu không mất | Chưa chạy |

Các ca AWS/Wokwi/GPIO mới chưa nghiệm thu thật. Chưa coordinator, command
nhiều van, local interlock xuyên van–bơm, flow proof hoặc dispatch queue; A3
chưa hoàn tất. [Bàn giao V29](../implementation/LOCAL_VALVE_HISTORY_REPORT.md).
