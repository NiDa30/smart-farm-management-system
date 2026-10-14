# Chương 20 — Lịch tưới theo tuần kết hợp độ ẩm đất

Người dùng ưu tiên các chức năng IoT dùng trong nông nghiệp trước. Đợt ngày
14/10/2026 bổ sung lịch cho quy tắc tưới đất khô ENV01 → PUMP01, tiếp nối
[cài đặt ngưỡng/thời gian](CHAPTER_17_WATERING_SETTINGS.md). Lịch là điều kiện
được phép tưới, dùng chung cơ chế command/ACK và dừng đã có.

## Ví dụ canh tác

Muốn cho phép tưới sáng thứ 2, thứ 4 và thứ 6, từ 05:30 đến 05:45 giờ Việt
Nam: chọn ba ngày, nhập giờ bắt đầu/kết thúc và lưu lịch. Sau đó chủ động bật
quy tắc tưới khi thiết bị và cảm biến đang sẵn sàng.

Trong khung đó, hai mẫu mới liên tiếp có đất dưới ngưỡng khô mới cho phép gửi
ON. Đất đã đủ ẩm sẽ không kích hoạt tưới chỉ vì đến giờ. Trong 15 phút có thể
có nhiều đợt nếu đất còn khô, mỗi đợt theo thời gian bật và khoảng nghỉ đã cấu
hình. Không hiểu khung 15 phút là yêu cầu bơm chạy liên tục 15 phút.

Bản demo tự động vẫn bật 1–30 giây/đợt, mặc định 20; nghỉ ít nhất 60 giây sau OFF
được xác nhận. Đây là GPIO26/LED Wokwi, không phải thiết kế hoàn chỉnh cho bơm
nông nghiệp vật lý. Lịch không đo lượng nước hoặc xác nhận nước đã tới cây.

## Chọn chế độ, ngày và khung giờ

Tại IoT → Quy tắc Tự động hóa có phần **Lịch tưới theo tuần**:

- **Cả ngày, theo độ ẩm**: quy tắc đã bật có thể tưới bất kỳ giờ nào khi đủ
  điều kiện. Đây là mặc định V13, giữ hành vi cũ; lưu chế độ không bật quy tắc.
- **Chỉ trong khung giờ đã chọn**: cần ít nhất một khung, tối đa tám khung.
  Mỗi khung chọn một hoặc nhiều ngày, giờ bắt đầu/kết thúc dạng HH:mm.

Múi giờ hiện cố định Asia/Ho_Chi_Minh (UTC+7), không phụ thuộc múi giờ của máy
Windows, JVM hoặc trình duyệt. Ngày tính theo ngày Việt Nam; ISO 1 là thứ 2 và
ISO 7 là Chủ nhật. Preview cho biết khung hiện tại hoặc tiếp theo và thời điểm
server đã đánh giá; không coi preview cũ là quyền điều khiển hiện tại.

Khung bắt đầu được tính vào, giờ kết thúc không được tính vào. Ví dụ Chủ nhật
23:00 → 01:00 cho phép từ Chủ nhật 23h đến thứ 2 lúc 01h, không phải tối thứ 2.
Thứ2 lúc00:30 thuộc khung đã bắt đầu Chủ nhật. Không chọn start=end vì dễ hiểu
nhầm giữa khung rỗng và cả ngày. Các khung chồng nhau bị từ chối, gồm cả chồng
sang tuần sau; hai khung sát nhau được phép.

Tắt quy tắc và chờ run cũ kết thúc mới sửa lịch. Lưu dùng revision nên tab cũ
không ghi đè tab khác. Polling không xóa bản nháp. Nếu PUT mất phản hồi, 5xx
hoặc body sai, không báo thành công/không tự retry; chọn **Tải lại lịch** để
đọc lại. Bản nháp chưa lưu chặn nút bật quy tắc.

## Backend thực thi thế nào?

Migration V13 tạo watering_calendar một singleton: mode, zone, revision và
windows JSONB. Mặc định ANY_TIME, lịch trống. Cấu hình hợp lệ được chuẩn hóa
thứ tự ngày; validation phát hiện overlap cả Chủ nhật → thứ 2. PUT chỉ cập
nhật khi revision đúng, rule disabled và active_command null.

GET/PUT `/api/v1/automation/watering/calendar` trả settings và view có asOf,
withinWindow, windowStart/windowEnd. Với ANY_TIME, bounds null vì không có
một khoảng hữu hạn cụ thể. Với TIME_WINDOWS, bounds là khung đang hoạt động
hoặc khung tiếp theo, quy về UTC khi lưu/truyền API; UI hiển thị giờ Việt Nam.

WateringRule vẫn là bên duy nhất tự phát ON, dùng cùng khóa với manual hold,
configure và sửa lịch. Không có một scheduler khác tranh relay với rule đất
khô. Tick ngoài khung reset đếm và báo OUTSIDE_SCHEDULE; mỗi mẫu nguồn cũng
phải nằm trong khung mới được tính. Mẫu trước giờ bắt đầu không được ghép
thành hai mẫu trong giờ. Khi chờ mẫu trong khung, UI không báo sai rằng đất
chưa khô. Trước dispatch kiểm tra thời gian lại để tránh dùng kết quả tick cũ
ở sát biên; snapshot run dùng khung đánh giá ngay trước gửi.

Khi active run ra ngoài mọi khung cho phép, backend yêu cầu OFF bằng đường dừng
hiện có, chỉ thử dừng một lần và tiếp tục chờ ACK/status OFF có quan hệ đúng.
Không coi publish thành công là đã ngắt GPIO. Nếu hai khung liền nhau thì vẫn
đang được phép, không tạo khoảng cấm giả ở điểm nối.

Backend kiểm tra theo nhịp khoảng 2 giây và còn độ trễ mạng. Kết thúc khung là
điều kiện yêu cầu dừng, không cam kết GPIO tắt đúng từng giây. Timer cục bộ của
firmware vẫn là lớp ngắt độc lập như trước. Không thay TTL, lockout hoặc xác
nhận thực thi để đáp ứng giao diện lịch.

## Giữ lịch và lưu dấu vết

Lịch được lưu PostgreSQL và giữ sau restart. Quy tắc vẫn tạm dừng sau restart,
phải chủ động bật lại; không tự replay ON hoặc tưới bù một khung đã bỏ lỡ.
Backend phải tiếp tục chạy, kết nối hoạt động và thiết bị báo đủ điều kiện để
thực hiện lịch. Đây chưa phải lịch độc lập chạy trên ESP32 khi máy chủ tắt.

Manual ON/OFF vẫn đi qua manual hold và kiểm tra của API điều khiển. Lịch chỉ
giới hạn tự động; không giả rằng đã khóa mọi thao tác thủ công ngoài giờ.
Nếu run cũ chưa kết thúc thì vẫn cần đối chiếu trạng thái như trước.

Run mới lưu calendar_revision/mode và bounds khung đã dùng cùng snapshot ngưỡng,
commit trước publish. Run trước V13 để metadata lịch null, không gán mặc định
hiện tại cho lịch sử. Không sửa metadata run cũ khi chỉnh lịch mới.

## Kiểm tra và lỗi gặp

Cloud cuối đợt:103 backend tests không skip (thêm 6 unit lịch và 9 integration),
33 browser fixtures automation,20 unit frontend; lint/build đạt. Kiểm tra biên
múi giờ, overnight/tuần, overlap/adjacent, nguồn ngoài khung, OFF một lần/chờ
status, metadata trước publish, edit guards, manual hold và V12 → V13.

Một ca integration điều khiển biên thời gian ban đầu dùng static mock quá rộng,
làm các helper validation trả mặc định. Đó là lỗi fixture, không phải lỗi lịch
thực tế. Fixture cuối chỉ giả phép evaluate, còn validation gọi mã thật; giữ
nguyên assertion và chạy lại toàn bộ103 đạt. Rà soát còn sửa nhãn khi mẫu khô
cũ nằm trước khung: báo chờ mẫu trong khung thay vì báo đất chưa thấp.

Smoke App/menu/proxy/Spring/PostgreSQL thật đã lưu thứ 2/4/6 05:30–05:45,
đọc lại sau restart và so sánh cấu hình không đổi. Trình duyệt dùng timezone
New York vẫn hiển thị preview giờ Việt Nam. MQTT/control/rule đều tắt, không
có pump command. Đây không phải bằng chứng LED tưới theo lịch trên AWS/Wokwi
live; cần chạy riêng trên máy người dùng. Xem [bàn giao](../implementation/IRRIGATION_CALENDAR_REPORT.md).

## Thử trên Windows và hướng phát triển nông nghiệp

Sau pull và restart backend, Flyway tự thêm V13, giữ DB demo. Không cần đổi
IAM/certificate/firmware. Xem [Windows runbook](WINDOWS_RUNBOOK.md). Ban đầu để
rule tắt, lưu lịch, refresh và kiểm tra giờ/ngày. Khi demo với LED, tạo khung
bao quanh giờ hiện tại, đất đủ ẩm trước, bật rule có chủ đích rồi giảm đất.
Ghi mẫu/commandId/ACK/status/run; thử hết khung và xác nhận OFF. Tắt rule cuối
phiên. Không thay giờ hệ thống để ép thử vì ảnh hưởng TTL/NTP/TLS.

Các bước nông nghiệp tiếp theo có thể là ngưỡng theo cây/giai đoạn do người
vận hành khai báo, nhật ký tưới từ dữ liệu command/run thật, và điều khiển quạt/
phun sương khi có actuator tương ứng. Đo nước/điện cần thiết bị đo; không suy
m³/kWh từ LED hoặc dựng số mẫu. Các mục này là hướng tiếp theo, chưa triển khai
trong V13. Việc mở rộng nhiều thiết bị vẫn theo ưu tiên đã thống nhất sau.
