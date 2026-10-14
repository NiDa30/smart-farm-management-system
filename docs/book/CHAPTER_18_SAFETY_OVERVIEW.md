# Chương 18 — Quan sát an toàn từ dữ liệu thật

Trước đợt ngày 14/10/2026, trang An toàn Fail-Safe & Edge hiển thị quy tắc
bảo vệ và gateway mẫu. Nút OTA chỉ tăng phần trăm theo timer rồi báo hoàn tất.
Điều đó không phải bằng chứng firmware được nâng cấp hoặc bơm được bảo vệ.
Bản mới thay toàn bộ phần mẫu trên trang này bằng quan sát backend/PostgreSQL.
Các trang ngoài phạm vi này, kể cả shell/topbar chung, vẫn có phần prototype.

## Người vận hành xem được gì?

Mở IoT & Tự động hóa → **An toàn Fail-Safe & Edge**. Trang chỉ đọc FARM001,
ENV01 và PUMP01, tự tải mỗi ba giây và có nút Làm mới.

- Kết nối MQTT của backend và khả năng kết nối kênh gửi lệnh, tách riêng với
  cờ cho phép điều khiển. Không suy ra thiết bị online vật lý từ những cờ này.
- Relay ON/OFF và khóa an toàn hiện tại chỉ khi bản tin mới trong 15 giây.
  Bản cũ vẫn hiện để đối chiếu, có thời điểm nguồn, nhận và lý do thiết bị báo.
- Số đo đất ENV01 dùng cửa sổ 15 giây như rule tưới. Đây khác ngưỡng 30 giây
  trên màn giám sát cảm biến; không thay đổi điều kiện an toàn ở backend.
- Quy tắc đang bật/tắt, kết quả đã lưu, số mẫu khô, cấu hình V11, commandId
  của run đang theo dõi và deadline nghỉ đã ghi nhận.
- Tổng mọi lệnh PENDING/SENT/PUBLISH_UNCERTAIN, số đã qua expiresAt + 5 giây,
  cùng mười lệnh cần đối chiếu gần nhất. Tổng không bị giới hạn bởi danh sách.
- Năm mươi thay đổi relay mới nhất: lý do như TIMER_EXPIRED, CONNECTION_LOST,
  BOOT hoặc lý do chưa có ở dữ liệu cũ. Các nút dưới cùng chỉ mở màn liên quan.

Không có nút OTA giả lập, reset khóa hoặc gửi ON/OFF tại đây. Muốn điều khiển,
mở trang Actuator hiện có để theo dõi ACK và trạng thái mới. Đọc trang không
phải là thủ tục đặt lại khóa hay xác nhận hệ thống đã an toàn.

## Vì sao cần giữ “Chưa xác định”?

Giả sử bản cuối báo ON và có khóa, nhưng đã cũ một phút. Không có bản mới thì
không biết relay hiện ON hay OFF, cũng không thể coi khóa đã được gỡ. Trang
hiển thị trạng thái/khóa hiện tại **Chưa xác định**, còn ON/khóa cũ nằm trong
phần bản báo đã lưu. Thiếu hoàn toàn status cũng không được coi là OFF.

Frontend dùng thời gian server cộng thời gian trôi đơn điệu từ lúc bắt đầu
request. Cả timestamp nguồn và nhận phải mới; polling thành công không làm một
mẫu cũ trở thành mới. API lỗi giữ bản ghi để xem nhưng bỏ khẳng định kết nối,
relay, khóa và enabled hiện tại. Snapshot kết nối quá mười giây không còn được
coi là mới. Response cũ không ghi đè response của lần Làm mới tiếp theo.

Một bản CONNECTION_LOST có thể chỉ đến backend sau khi kết nối trở lại.
Không tìm thấy bản đó không chứng minh chưa mất mạng. Lý do COMMAND_OFF chỉ
là thiết bị đã nhận lệnh tắt; không tự kết luận người dùng hay rule đã gửi.
Giờ nhận của history là thời điểm backend ghi thay đổi, không đo độ trễ mạng
hoặc cung cấp thêm timestamp thiết bị không gửi.

## API chỉ đọc và không thay đổi lệnh khi quan sát

`GET /api/v1/safety` trả asOf, MQTT, cờ điều khiển/kênh gửi, sensor, relay,
rule, settings, queue, recentProblems và stateHistory. DB snapshot dùng
transaction read-only REPEATABLE_READ để đọc nhất quán các bảng liên quan.
Lifecycle MQTT là quan sát runtime riêng, không thuộc transaction PostgreSQL.

Điểm dễ sai: phương thức `PumpService.commands()` hiện có tác dụng expire
lệnh quá hạn. Trang an toàn **không gọi nó**. Thay vào đó SELECT thống kê và
đọc lệnh cần đối chiếu trực tiếp, không chuyển SENT thành TIMED_OUT, không
pause/enable rule và không tự thử lại ON/OFF. Đếm quá hạn là mô tả dữ liệu,
không phải xác nhận GPIO đã tắt.

API mới không sửa logic điều khiển/tưới, firmware, IAM hoặc migration. Nó không
quét tài nguyên AWS và không truy cập gateway/flash. Cấu hình thời gian tưới
đọc từ V11 của [chương 17](CHAPTER_17_WATERING_SETTINGS.md), không tự gán lại
mặc định. Trạng thái UI không thay thế việc API control kiểm tra lại khi gửi lệnh.

## Những bảo vệ chưa thể khẳng định

Mã firmware có boot OFF, timer cục bộ, OFF khi mất kết nối và khóa an toàn.
Trang không xác minh phiên bản firmware đang nạp hoặc GPIO có thực sự đổi.
Không có sensor lưu lượng/mực nước, không tuyên bố chống chạy khô đã hoạt động,
không OTA hay NVS khôi phục ON. GPIO26 đang dùng LED Wokwi, không phải bằng
chứng bơm vật lý đưa nước ra ruộng.

Đây vẫn là ứng dụng local một farm; chưa bổ sung đăng nhập/phân quyền,
backend nhiều instance hoặc nhật ký bất biến. Không coi màn hình mới là chứng
nhận an toàn để dùng với bơm thực tế.

## Kiểm tra đã thực hiện

Cloud đạt 78 backend tests không skip, gồm sáu ca API/DB mới; chín browser
fixtures safety; 14 frontend unit tests; lint/build đạt. Kiểm tra gồm dữ liệu
trống, bản cũ/khóa, lệnh nằm ngoài 20 dòng, giới hạn preview, lỗi API/phục hồi,
response sai/thứ tự, freshness 15 giây, navigation chỉ GET và không có nút OTA.

Smoke đi qua menu App thật → Vite proxy → Spring Boot → PostgreSQL test trong
schema safety_smoke, MQTT/control tắt. Có bản mất kết nối cũ, ON chưa rõ kết quả,
OFF thất bại và run STOP_UNCONFIRMED. Sau khi xem trang, DB vẫn giữ nguyên
PUBLISH_UNCERTAIN, active command và kết quả run. Đi tiếp sang Event Log đạt.
Đây là dữ liệu seed thử, không phải kết quả sự cố AWS/Wokwi thực tế.

## Cập nhật Windows và kiểm tra live

Dừng backend cũ, pull feature branch như các đợt trước. Mở Git Bash mới, tránh
biến DB test, rồi khởi động helper backend với cờ điều khiển demo đã dùng. Giữ
frontend/gateway ở terminal riêng. Không cần migration mới sau V11, đổi IAM
hoặc build firmware cho trang này. Xem [Windows runbook](WINDOWS_RUNBOOK.md).

Mở trang an toàn, đối chiếu status và lý do với trang Actuator. Khi mẫu cũ,
kiểm tra trạng thái hiện tại chuyển Chưa xác định. Nếu thử mất gateway với LED,
ghi serial, commandId, status sau reconnect và history; không reset simulator
rồi coi đó là bằng chứng giữ RAM/NVS. Kịch bản này còn chờ người dùng chạy.
Chi tiết phạm vi và kết quả nằm trong [bàn giao](../implementation/SAFETY_OVERVIEW_REPORT.md).
