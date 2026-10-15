# Chương 36 — Quyền sử dụng bơm giữa thủ công và tự động

15/10/2026, giờ Việt Nam. Tiếp [HTTP intent V23](CHAPTER_35_PUMP_HTTP_INTENT.md).
Phần này phục vụ PUMP01 trong profile bảo vệ V22 đã bật cả backend/firmware.
Hàng chờ nhiều vùng vẫn PREVIEW_ONLY; chưa nối van và bơm thành coordinator.

## Vấn đề cần giải quyết

Khóa `synchronized` chỉ có tác dụng trong một JVM. Một backend có thể đang
xử lý quyết định tưới cũ trong khi backend khác đã nhận thao tác thủ công.
Timeout command cũng không chứng minh GPIO đã OFF. Nếu chỉ nhìn 20 command
gần nhất hoặc số giây đã trôi qua để cấp lượt mới, ta có thể bỏ quên lượt cũ.

V24 lưu quyền sử dụng ngay trên command bật. Việc kiểm tra quyền, giữ chỗ,
pause quy tắc hoặc lưu liên kết run dùng cùng giao dịch PostgreSQL và khóa
`pump_dispatch_gate`. Giao dịch commit trước khi gọi transport. MQTT ordinal
V22 vẫn chặn thứ tự gói tin đến thiết bị; HTTP revision/UUID V23 vẫn chặn
yêu cầu đến muộn và phát lại do mất phản hồi.

## Dữ liệu và phạm vi bảo vệ

Migration `V24__pump_ownership.sql` thêm:

| Trường | Ý nghĩa |
| --- | --- |
| `pump_command.control_source` | MANUAL, AUTOMATION, hoặc LEGACY cho dữ liệu cũ |
| `owner_command_id` | Command bật mà một lệnh OFF tự động muốn dừng |
| `owner_released_at` | Thời điểm khép quyền của command ON, không phải thời điểm GPIO tắt |
| `watering_rule.execution_epoch` | Phiên quyết định của quy tắc, thay đổi khi bật/tắt, manual hold, restart hoặc lưu settings |

Một command ON có ordinal và chưa có `owner_released_at` là lượt giữ quyền
chưa khép. Phải xét toàn bộ bảng. Các lệnh ON cũ có ordinal cũng được giữ lại
để đối chiếu; migration không tự đánh dấu đã xong và không xóa run/command.
Lệnh cũ không có ordinal thuộc luồng legacy; không suy ra nó đã được bảo vệ.

Chỉ profile `SMARTFARM_PUMP_FENCING_ENABLED=true` áp dụng điều phối này.
Mặc định legacy giữ nguyên. V24 không đổi firmware, MQTT payload, topic,
client, certificate, policy hay IAM. Khi cập nhật phải restart toàn bộ các
backend dùng cùng database; không chạy lẫn binary cũ rồi coi mọi dispatcher
đã tuân theo quy tắc V24.

Đây là quyền theo command, **không phải lease tự hết hạn**. Không có nút
ép giải phóng chỉ dựa vào thời gian. Cũng chưa có quyền sở hữu từ queue,
xác thực người điều khiển hoặc leader election cho scheduler nhiều backend.

## Điều kiện chuyển quyền

Một lượt chỉ có thể được khép khi có status mới từ thiết bị:

- OFF, có metadata fence V22, không có latch yêu cầu reboot.
- Cả source time và received time còn mới trong 15 giây, không vượt quá
  tương lai 2 giây; status sau thời điểm command bật được cấp.
- Cùng boot thì ordinal đã bao phủ command bật. Boot mới có thể chứng minh
  OFF của phiên mới vì ON cũ đã gắn targetBootId, không được thực thi ở boot mới.
- Không còn command pending/sent/uncertain; không còn ordinal của boot hiện
  tại mà thiết bị chưa báo đã thấy, kể cả OFF từng lưu khi MQTT offline.
- Nếu đã có ACK ON trong cùng boot, sequence status phải mới hơn ACK đó.

ACK OFF riêng lẻ, timer hết hạn, command TIMED_OUT, mất mạng và restart backend
đều không đủ. Nếu MQTT offline, OFF vẫn lưu FAILED/MQTT_UNAVAILABLE và tăng
phiên ý định; chưa có bằng chứng thiết bị đã tắt. Người dùng có thể gửi OFF
mới khi kết nối phục hồi; hệ thống không tự gửi lại ON.

GET status chỉ tính `releasable`, không ghi `owner_released_at`. Dispatcher
khép quyền đủ bằng chứng và cấp lượt mới trong cùng giao dịch. Nếu trạng
thái thay đổi giữa lần đọc web và lần gửi, backend kiểm tra lại.

## Thủ công và quy tắc không giành cùng lượt

Command thủ công mới trong protected profile pause quy tắc và tăng epoch
trong giao dịch giữ command, kể cả OFF dự phòng qua endpoint `/commands`.
Replay đúng UUID đã lưu chỉ đọc receipt, không pause hoặc đổi epoch thêm.

ON tự động có `control_source=AUTOMATION`. Ngay trước commit, quy tắc kiểm tra
lại enabled, chưa có active run, execution epoch, settings/calendar revision,
mẫu sensor còn mới và đúng boot/sequence đã đánh giá, đất còn khô và lịch
hiện tại cho phép. Liên kết `active_command` và `watering_run` commit cùng
claim; crash sau đó không tạo khoảng trống giữa command và tracking.

Một worker cũ không được dùng quyết định trước manual OFF rồi dispatch sau
khi người dùng bật lại quy tắc. Các cập nhật streak/waiting cũng có epoch;
cập nhật kết quả/finish/stop có command ID để không ghi đè lượt mới.

OFF tự động phải chỉ rõ command bật của mình, vẫn là claim chưa khép và còn
được `watering_rule.active_command` tham chiếu. Vì vậy lượt tự động cũ không
được tắt một lượt thủ công mới. Lệnh OFF thủ công vẫn ưu tiên và không phải
xin quyền của lượt tự động.

Run từ V23 được giữ nhãn LEGACY. Nếu có cả `watering_run` và active reference,
dispatcher cho phép đường OFF tự động để dừng run cũ; không cho resume ON.
Nhãn LEGACY đơn lẻ không đủ để giả làm lượt tự động. Startup vẫn pause quy tắc,
giữ tracking chưa rõ và không tự giải phóng quyền.

## Trên giao diện

Vào **IoT & Tự động hóa → Điều khiển Actuator**. Panel **Quyền sử dụng bơm**
hiển thị nguồn giữ quyền và lý do chưa chuyển được. Khi còn bị chặn, ON/reset
bị vô hiệu hóa dù status gần nhất đang OFF; nút gửi OFF vẫn theo cờ điều khiển.
Khi có bằng chứng OFF đủ, panel nói quyền cũ sẽ được khép ở giao dịch tiếp theo.

Không đổi màu công tắc thành ON chỉ vì có claim. Status, ACK và claim có ý
nghĩa khác nhau; cũng chưa chứng minh dòng nước hoặc bơm vật lý đang chạy.
Metadata quyền không hợp lệ làm UI từ chối trạng thái mới và khóa ON/reset.

## Bằng chứng cloud và cách tái hiện

Xem [báo cáo bàn giao V24](../implementation/LOCAL_PUMP_OWNERSHIP_REPORT.md).
Test PostgreSQL dùng DB riêng loopback55439, không dùng demo5433.

Ca mới bao gồm tranh chấp giữa hai service instance, pause/claim commit trước
transport, callback rollback, OFF không cần giành quyền, duplicate không đổi
epoch, lệnh tắt cũ không dừng chủ mới, ACK/status/ordinal, timeout/restart,
owner ngoài 20 dòng, sample đổi thành ướt trước reserve, run cũ qua migration
và rule thực tế đi qua ON → OFF có tracking cùng owner.

Full-app dùng schema riêng `pump_owner_smoke`. Harness chỉ nạp status công
khai và transport **capture-only** cục bộ luôn ném lỗi, không mở socket. Nó
kiểm tra app không có CommandTransport thật trước khi tạo đúng một receipt
ON/uncertain và claim MANUAL. Runtime MQTT/control/valve-demo đều false.
Sau timeout claim vẫn bị chặn. Không reseed để làm dữ liệu trông mới hơn.

Smoke web GET-only đi từ actuator sang queue rồi quay lại; sau restart JVM
vẫn còn claim. API/fixture không phải nghiệm thu AWS/Wokwi/GPIO. Firmware/wire
không đổi nên không tạo thêm bằng chứng firmware live trong đợt này.

## Lỗi đã gặp khi kiểm tra

Lượt full backend đầu tiên lỗi PostgreSQL `too many clients already` khi
các Spring test context giữ nhiều Hikari pool mặc định 10 kết nối. Bộ test
mới tạo thêm context có spy cho ca stale worker. Sửa tại cấu hình **test**:
maximum-pool-size=4, minimum-idle=1. Không tăng giới hạn production, không xóa
schema để làm test qua, không skip hoặc bỏ assertion. Chạy lại đầy đủ để xác
nhận cả race hai kết nối và Flyway còn hoạt động.

Khi rà soát còn bổ sung điều kiện tương thích run LEGACY có provenance, để
upgrade không vô tình chặn đường OFF tự động của run đang dở. Không sửa nội
dung migration V24 đã áp dụng trong test; xử lý bằng guard dispatcher và test.

## Sáu ca Windows/Wokwi còn chờ

Pull nhánh rồi restart backend/frontend theo [Windows runbook](WINDOWS_RUNBOOK.md).
Nếu trước đó đã opt-in V22 cả hai phía, không cần build lại firmware vì V24.
Thử trên LED Wokwi; ghi commandId, status/ACK và thời điểm cho từng ca.

| Ca | Kỳ vọng | Thực tế |
| --- | --- | --- |
| ON thủ công | MANUAL claim và rule pause; receipt chưa phải GPIO ON | Chưa chạy |
| Tưới tự động hai mẫu khô | AUTOMATION claim, active run cùng commandId | Chưa chạy |
| OFF thủ công khi tự động đang chạy | Rule pause, OFF vẫn được nhận; chờ status OFF | Chưa chạy |
| ACK OFF đến trước status | Chưa cấp lượt mới chỉ vì ACK | Chưa chạy |
| Restart backend/mất MQTT giữa run | Claim chưa khép; không tự replay ON/nhả quyền | Chưa chạy |
| Status OFF mới rồi chuyển sang thủ công | Claim cũ khép trong giao dịch; lượt cũ không tắt lượt mới | Chưa chạy |

Bước tiếp theo của A3 là sequencing van–bơm với feedback/interlock và cơ chế
gắn lượt queue vào owner. Chưa có mã dispatch queue hoặc tưới từ SOIL trong V24.
