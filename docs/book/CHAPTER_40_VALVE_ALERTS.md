# Chương 40 — Cảnh báo lỗi van và controller theo nhánh

15/10/2026 (Asia/Ho_Chi_Minh), migration V28, sau giám sát V27.

## Từ trạng thái gần nhất đến một đợt lỗi

[Chương39](CHAPTER_39_CIRCUIT_VALVE_MONITOR.md) lưu trạng thái riêng của từng
van giám sát. Nếu chỉ nhìn mẫu cuối, người vận hành khó biết lỗi đã phát sinh
khi nào, đã có người xem chưa và mẫu nào chứng minh phục hồi. V28 bổ sung
đợt cảnh báo bền vững, giữ bản chụp nhánh và bằng chứng lúc mở/đóng.

Trên web vào **IoT & Tự động hóa → Trung tâm Cảnh báo → Van theo nhánh**.
Mỗi thẻ có controller/van, vùng, phiên bản nhánh, giờ thiết bị đo, giờ backend
ghi nhận, boot/sequence, loại lỗi và ghi chú đã xem. Bộ lọc đang lỗi/đã phục
hồi và chưa xem/đã xem chỉ áp dụng cho tối đa100 đợt đã tải; ưu tiên đang lỗi,
rồi chưa xem, rồi ID mới. Polling mỗi5giây. Chi tiết đang mở vẫn đối chiếu
được bằng ID nếu đợt ra khỏi danh sách100.

Phạm vi hiện tại là **SIMULATOR, monitor-only, controller/van02–99** đã cấu
hình hợp lệ. Chưa gom fault demo01 vào luồng này. Không thêm thiết bị trên
simulator, quyền AWS, firmware, email, lệnh reset hoặc điều khiển van/bơm.

| Điều kiện | Mở đợt | Bằng chứng để đóng |
| --- | --- | --- |
| POSITION_FAULT | Một mẫu mới có positionFeedback.fault | Hai mẫu mới liên tiếp có CLOSED độc lập, không fault và không DEVICE_FAULT |
| DEVICE_FAULT | Một mẫu mới có reason DEVICE_FAULT | Hai mẫu mới liên tiếp không DEVICE_FAULT/POSITION_FAULT và không fault vị trí |

Thiết bị đã debounce/giữ lỗi trước khi gửi; backend không đợi thêm hai mẫu
lỗi để mở đợt. DEVICE_FAULT phục hồi không bắt buộc có capability vị trí:
chỉ kết thúc điều kiện lỗi controller đã báo, không chứng minh van sẵn sàng.
GPIO tắt, ACK lệnh, nhãn đã xem hoặc dữ liệu mất không thay cho CLOSED.

## Thế nào là hai mẫu phục hồi

Mẫu phải đi qua receiver V27: đúng topic/controller/van/nhánh/vùng/phiên bản,
không retained, nguồn SIMULATOR, monitorOnly true, demoEnabled false,
GPIO CLOSED, ordinal0. Cửa sổ nhận vẫn dưới15giây và tối đa2giây tương lai.
Mẫu trùng, boot đã nghỉ hoặc dữ liệu sai bị từ chối, không làm mới bằng chứng.

Hai mẫu phục hồi cùng boot, sequence tăng đúng1, observedAt tăng nghiêm ngặt;
khoảng cách cả giờ đo lẫn giờ nhận không quá15giây. Đổi boot, nhảy sequence,
thiếu phản hồi CLOSED, có lỗi hoặc khoảng cách quá dài đều ngắt chuỗi.
Restart backend xóa đếm phục hồi dở, cần hai mẫu mới sau restart. Đợt lỗi,
bằng chứng và ghi chú đã lưu vẫn nguyên vẹn.

Fault vị trí của firmware giám sát được giữ trong boot. Sửa công tắc, rồi
reboot board với đầu vào đúng mới tạo boot khỏe mới; chỉ gạt công tắc về đúng
không tự xóa latch. Không cần hoặc có lệnh reset từ màn cảnh báo.

Không có bộ quét tự tạo cảnh báo mất mạng ở V28. Mất packet giữ đợt đang lỗi,
không tự đóng và không tạo đợt OFFLINE mới. Muốn xem độ mới hiện tại, đọc thẻ
quan sát trong **Điều khiển Actuator → Cấu hình nhánh tưới**. Lịch sử điều kiện
ở trung tâm cảnh báo có thể cũ, không phải chứng nhận trạng thái vật lý hiện tại.

## Cấu hình thay đổi và ghi chú đầu tiên

Đợt lưu cấu hình đúng lúc phát sinh. Sửa nhánh/vùng khiến đợt cũ có ngữ cảnh
CONFIG_CHANGED; packet phiên bản mới không được đóng hoặc chuyển đích đợt cũ.
Tắt monitor hiển thị MONITOR_DISABLED và giữ lịch sử. Bản này chưa có thao tác
đóng thủ công đợt thuộc cấu hình cũ; người vận hành đối chiếu và ghi chú đã xem.

**Xác nhận đã xem** chỉ lưu thời gian backend và ghi chú tối đa500ký tự,
không đóng điều kiện lỗi. Ghi chú đầu tiên bất biến. Gửi lại cùng ghi chú là
idempotent, kể cả sau phục hồi; gửi ghi chú khác trả409. Nếu chưa ai xác nhận
mà điều kiện đã phục hồi, không cho tạo xác nhận đầu tiên. Chưa lưu danh tính
operator hoặc xác thực người dùng cho hành động này.

Hai phiên cùng xác nhận không ghi đè nhau. Mất phản hồi HTTP làm kết quả chưa
rõ: web giữ bản nháp, khóa gửi lại tự động, cho GET **Đối chiếu trạng thái**.
Nếu API đọc lỗi thì dữ liệu được ghi là có thể cũ và tạm khóa ghi xác nhận.
Polling cũ không được ghi đè phản hồi thao tác mới.

## Storage, API và Event Log

V28 thêm circuit_valve_alert_cursor và circuit_valve_alert, không sửa bảng
command/queue/claim. Status và thay đổi đợt lỗi cùng transaction: nếu lưu đợt
lỗi thất bại, quan sát và boot cũng rollback. Không tạo đợt từ mẫu cũ đã có
trước migration; đợi packet mới được chấp nhận. Đợt đang mở duy nhất theo
nhánh/phiên bản/loại lỗi. Sửa cấu hình giữ lịch sử; chưa có API xóa nhánh.

| API | Tác dụng |
| --- | --- |
| GET /api/v1/valve-alerts | Danh sách tối đa100 |
| GET /api/v1/valve-alerts/{id} | Đối chiếu cả đợt ngoài danh sách |
| PUT /api/v1/valve-alerts/{id}/acknowledgement | Body đúng {"note":"ghi chú"} hoặc {"note":null} |

Body thừa trường, key lặp, kiểu sai, JSON nối thêm, ghi chú quá dài đều bị
từ chối. Không có HTTP endpoint tạo packet hoặc bật van từ cảnh báo.

Trong **Nhật ký sự kiện Event Log**, ba loại VALVE_ALERT_OPENED,
VALVE_ALERT_CLEARED, VALVE_ALERT_ACKNOWLEDGED thuộc nhóm ALERT, gắn mã van.
Mở/phục hồi dùng giờ nhận làm eventAt/recordedAt, giờ đo làm sourceAt.
Đã xem dùng giờ server, sourceAt null vì không có thời gian thiết bị.
Không bịa commandId/runId hoặc coi đã xem là ACK thiết bị. Cursor phân trang
nhận các ID valve-open/valve-clear/valve-seen, không lẫn đợt cảm biến cũ.

## Bằng chứng cloud

352 backend đạt, không skip, gồm19ca mới: mở/phục hồi, gap/boot/restart,
thiếu capability, tách van, cấu hình đổi, monitor tắt, hai xác nhận đồng thời,
rollback atomic, lookup ngoài100đợt và packet native.13browser cảnh báo van,
24browser cảnh báo cũ,11browser Event Log, lint/build đạt. Bộ kiểm tra dùng
PostgreSQL riêng55439, không phải database demo5433.

Encoder C++ dùng ValveFeedback/ValveMonitor hiện hữu sinh ba packet: fault
SWITCH_CONFLICT rồi hai mẫu CLOSED trong boot mới. Java fixture đặt timestamp
một lần cho mỗi mẫu mới để đi qua receiver thật, không sửa thời gian bản ghi
cũ. Full-app React→HTTP→PostgreSQL kiểm tra mở đợt, ghi chú qua web, restart
JVM thật giữ metadata, phục hồi sau hai mẫu và ba Event Log; không mock API.
MQTT/control/valve-demo đều false, monitor true; command/run/queue mới đều0.
Nâng cấp schema V27 giữ nguyên hai nhánh, ba queue records, status và boot;
không backfill cảnh báo từ quan sát cũ. Không reseed dữ liệu cũ để làm mới proof.

## Sáu ca Windows/AWS/Wokwi còn chờ

Pull nhánh rồi restart backend để Flyway áp V28; không xóa volume PostgreSQL.
Giữ cấu hình giám sát V27, monitor true, MQTT/policy status đang hoạt động.
V28 không cần build firmware hoặc cấp thêm IAM. Nếu chưa có board giám sát
riêng thì thực hiện chương39 trước; không giả packet bằng tay để gọi là live.

| Ca | Kỳ vọng | Thực tế |
| --- | --- | --- |
| Hai công tắc CLOSED/OPEN cùng active, qua debounce | Đúng van có POSITION_FAULT/SWITCH_CONFLICT; van khác không bị gán lỗi | Chưa chạy |
| Xác nhận đã xem khi còn lỗi | Ghi chú giữ, điều kiện vẫn lỗi, GPIO không đổi | Chưa chạy |
| Dừng gateway khi còn lỗi | Đợt không tự đóng; thẻ quan sát thành cũ | Chưa chạy |
| Sửa đầu vào, reboot với CLOSED và chờ hai status mới | Một mẫu chưa đóng, mẫu thứ hai đúng chuỗi mới đóng; bằng chứng mở giữ | Chưa chạy |
| Restart backend sau một mẫu khỏe | Không dùng chuỗi dở; cần hai mẫu sau restart; ghi chú không mất | Chưa chạy |
| Hai tab ghi chú khác nhau, hoặc sửa revision nhánh | Không ghi đè ghi chú đầu; cấu hình cũ không bị packet mới đóng nhầm | Chưa chạy |

Khi nghiệm thu ghi ID đợt/van, revision, boot/sequence, giờ đo/nhận và ảnh
Event Log; che thông tin riêng. Đây là ca mới chưa nghiệm thu AWS/Wokwi/GPIO.
Chưa command van02+, interlock xuyên van–bơm, flow proof hoặc dispatch queue;
coordinator A3 vẫn chưa hoàn tất.

[Bàn giao V28](../implementation/LOCAL_VALVE_ALERTS_REPORT.md).
