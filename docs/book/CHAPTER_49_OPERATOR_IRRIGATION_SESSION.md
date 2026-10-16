# Chương 49 — Phiên tưới có xác nhận từng bước

Ngày16/10/2026. Sau [route tại bơm](CHAPTER_47_PUMP_CIRCUIT_ROUTE.md) và
[lịch sử](CHAPTER_48_PUMP_CIRCUIT_HISTORY.md), V35 thêm một phiên thao tác
lưu bền, giữ thứ tự van/bơm và nhận xác nhận riêng cho từng bước.

Đây là quy trình **OPERATOR_STEPS** trên LED Wokwi. Không scheduler, không
tự chuyển bước từ polling/reconnect, không tự lấy việc trong queue. Mỗi boot
PUMP01 vẫn chỉ khai báo một nhánh; chưa tự chuyển nhiều vùng hoặc dùng bơm thật.

## Màn hình và thứ tự

Vào **IoT & Tự động hóa → Điều khiển Actuator → Cấu hình nhánh tưới →
Phiên tưới có xác nhận <mã nhánh>**. Chọn bơm1–10giây, mặc định5giây.
Tạo phiên chỉ lưu cấu hình/boot và giữ chỗ quy trình, chưa gửi lệnh.

| Xác nhận của người dùng | Lệnh hoặc thao tác | Chốt trước bước kế tiếp |
| --- | --- | --- |
| Tạo phiên | Chưa gửi command | Backend/device khớp fencing/route; bơm OFF mới, không khóa/lệnh chưa rõ; mọi nhánh CLOSED mới |
| Xác nhận mở van | OPEN30s qua control V32 | ACK OPEN và status OPEN đúng boot/revisions/ordinal, vị trí độc lập và proof OPEN tại bơm |
| Xác nhận bật bơm | ON1–10s qua HTTP intent V33 | Đúng route/boot gốc, đủ cửa sổ van; không tự coi HTTP/ACK là status |
| Yêu cầu OFF trong phiên | OFF không ràng route | Status OFF mới sau lệnh, phủ mọi command và không còn pending/ownership chưa rõ |
| Xác nhận đóng van | CLOSE qua profile LED | ACK CLOSE thực thi và status vị trí/GPIO CLOSED mới đúng boot/lệnh |
| Khép phiên đã xác nhận | Chỉ cập nhật DB | OFF và CLOSED vẫn đủ mới; không phát command mới |

Giữa các bước, bấm Đọc lại hoặc chờ polling GET. Thiết bị tự tắt khi hết
runtime không tự chuyển phiên sang hoàn tất; vẫn phải yêu cầu OFF để fence
lệnh cũ, xác nhận CLOSED và khép phiên. Bản ghi CLOSED_CONFIRMED là kết
thúc quy trình với bằng chứng mô phỏng, không phải số lít hoặc bơm vật lý.

Các switch vị trí của board van và tại board bơm vẫn độc lập, không tự nối
qua MQTT. Chuyển đúng OPEN/CLOSED theo thử nghiệm ở chương46/47, trong cửa
sổ phản hồi vị trí. Không kịp hoặc thiếu proof thì ON bị chặn. Không kéo dài
van/timer hoặc bỏ kiểm tra để cố bật. NVS/flow/phao giữ chốt riêng tại thiết bị.

## Giữ một phiên và chống lệnh ngoài quy trình

V35 có irrigation_session và irrigation_session_action. Row phiên giữ toàn
config snapshot, hai boot gốc, thời gian yêu cầu, revision, phase và các UUID
lệnh. Unique index chỉ cho một phiên chưa khép trên PUMP01. Giữ chỗ này khác
bản ghi ownership ON của V24: nó bảo vệ cả giai đoạn chuẩn bị chưa có ON.
Không có lease hết hạn để tự thả khi còn trạng thái chưa rõ.

Tạo phiên dùng gate bơm rồi gate cấu hình nhánh. Khi đang giữ phiên:

- OPEN/ON/CLOSE chỉ được gửi bằng UUID của đúng bước đã giữ, đúng phase.
  ON/reset ngoài phiên, tự động ENV01, mở/đóng van từ panel khác và sửa/tạo
  nhánh/vùng liên quan bị chặn. Nút panel cũ có thể trả409; dùng phiên đang giữ.
- OFF khẩn cấp vẫn dùng được. OFF ngoài phiên đặt stopRequested và phase
  RECOVERY_REQUIRED trước khi gửi; không cho quay lại OPEN/ON. Chỉ tắt bơm,
  không vội đóng van khi chưa có bằng chứng OFF.
- Không auto reset khóa. Nếu đã khóa, cần hoàn tất dừng an toàn và xử lý
  nguyên nhân/reset theo chương47 trước tạo lượt mới; không clear NVS/ledger.
- Không thể khép bằng ACK riêng hoặc timer hết. CLOSE phục hồi có thể dùng
  boot mới của van nếu config vẫn khớp, bơm đã OFF xác nhận; không gửi lại ON
  cho boot mới hoặc dùng proof trước reboot.

Mỗi bước lưu UUID/definition/payload trước gọi transport. Giao dịch giữ mã
commit rồi mới gọi dispatcher hiện có; không giữ gate qua network callback.
Kết quả trở về muộn chỉ cập nhật phase nếu bước vẫn sở hữu phase/UUID đó.
OFF chen giữa OPEN/ON không bị lời gọi cũ đổi lại WAIT_ON. Ordinal tại firmware
vẫn chặn command cũ đến sau OFF/CLOSE. Không đổi wire protocol hoặc cấp IAM mới.

Cùng UUID/cùng định nghĩa chỉ đọc bản lưu, không gửi lại; đổi body trả409.
Definition được so bằng record đã deserialize, không so IntNode/LongNode
của JSONB. Thiếu kết quả giữ RESERVED/UNRESOLVED và danh tính để đối chiếu.
RETURNED chỉ có nghĩa đã lưu kết quả gọi; có thể chứa PUBLISH_UNCERTAIN,
FAILED hoặc REJECTED, không tự xác nhận GPIO.

Trên web, intent chưa rõ giữ trong sessionStorage, có nút GET đối chiếu theo
mã. Không tự retry khi mở lại trang, poll,404 hoặc mất mạng. Tối đa20mã chưa
rõ; chặn bước thường khi đầy, vẫn có nút tắt khẩn độc lập. Tắt khẩn không
chờ lời gọi bước đang treo; HTTP202 của OFF vẫn chưa phải bằng chứng đã tắt.

## Restart và khôi phục

Mỗi startup backend chuyển mọi phiên chưa khép sang RECOVERY_REQUIRED,
stopRequested=true, tăng revision; RESERVED action thành UNRESOLVED. Không
publish, không replay và không tự bắt đầu lại dù bản cũ là PREPARED chưa
mở van. Phiên đã CLOSED_CONFIRMED giữ nguyên.

1. Đọc lại phiên và status, kiểm tra LED/phần mô phỏng thực tế.
2. Yêu cầu OFF trong phiên hoặc OFF khẩn; nếu MQTT chưa sẵn sàng, bản lưu
   OFF có thể FAILED, chưa xác nhận đã tắt. Sửa kết nối và chủ động gửi
   yêu cầu OFF mới nếu cần; đây là ý định mới, không phát lại ON cũ.
3. Chờ OFF phủ mọi lệnh. Nếu lệnh cũ còn pending do thiếu ACK, OFF mới sẽ
   đối chiếu/expire bản cũ theo dispatcher; không lấy hết giờ làm proof.
4. Xác nhận CLOSE, nhận ACK/status CLOSED mới rồi khép phiên. Có thể gửi
   CLOSE mới có chủ ý khi kết quả cũ chưa rõ; không tự retry trên background.
5. Nếu không lấy được bằng chứng OFF/CLOSED, phiên giữ chỗ. Chưa có API
   force-unlock để bỏ chốt; không xóa row trong DB để làm nút bật sáng lại.

## Bật thử trên Windows

Giữ firmware/certificate/policy/route của chương47; V35 không đổi firmware,
MQTT topic hoặc IAM. NVS boot khóa cần được xử lý trước khi bắt đầu: dùng
manual route panel mở van, healthy proof/reset, OFF/CLOSE và nhận CLOSED
mới; không tạo session rồi tìm cách reset bên trong nó.

Pull và restart backend, giữ PostgreSQL volume để Flyway áp V35. Tại terminal
**Git Bash** mới từ gốc repo, cùng cấu hình đã dùng ở chương47:

```bash
export SMARTFARM_IRRIGATION_SESSION_ENABLED=true
export SMARTFARM_CONTROL_ENABLED=true
export SMARTFARM_PUMP_FENCING_ENABLED=true
export SMARTFARM_PUMP_CIRCUIT_ROUTE_REQUIRED=true
export SMARTFARM_IRRIGATION_CIRCUIT_DEMO_ENABLED=true
export SMARTFARM_IRRIGATION_DEMO_ENABLED=false
bash tools/backend/run_backend_windows.sh
```

Script này dùng AWS thật trên máy bạn, chỉ chạy sau khi chuẩn bị quyền/board.
Cần mọi nhánh dùng PUMP01 báo CLOSED mới; controller riêng, source SIMULATOR,
khớp route/revisions và cả transport bơm/van đã sẵn sàng. Không tạo nhánh ví dụ
vào DB để bắt đầu. Flag phiên mặc định false; tắt flag không xóa phiên giữ
chỗ, vẫn cho thực hiện các bước dừng khi profile điều khiển cũ còn bật.

Thử5giây, xác nhận từng nút theo bảng. Khi mở van, chuyển switch độc lập của
van và bơm sang OPEN đúng thời hạn; sau OFF xác nhận mới CLOSE và chuyển
switch van về CLOSED. Không nối tải bơm/van thật. Kết thúc ở OFF/CLOSED,
khép phiên, dừng simulators/gateway khi không dùng và theo dõi Budget.

API chính:

```text
GET  /api/v1/irrigation-circuits/{id}/session
POST /api/v1/irrigation-circuits/{id}/session
GET  /api/v1/irrigation-circuits/{id}/session/{sessionId}
POST /api/v1/irrigation-circuits/{id}/session/{sessionId}/actions
GET  /api/v1/irrigation-circuits/{id}/session/actions/{requestId}
```

Start cần UUID, revisions nhánh/vùng, hai boot, duration1–10 và reviewedAt.
Action cần UUID mới, OPEN/ON/OFF/CLOSE/FINISH, expectedRevision, reviewedAt.
Review tối đa10giây, tương lai tối đa2giây. OFF vẫn cho qua revision đã đổi,
nhưng không dùng review cũ. GET không chuyển bước hoặc làm tươi bản tin.

## Bằng chứng

497backend không skip (20mới),62browser nhánh (8mới),5unit parser/pending,
lint/build đạt. Fixture riêng có5xác nhận tường minh,4command trên transport
synthetic, một phiên CLOSED_CONFIRMED và một PREPARED để thử restart. Native
OPEN/ON dùng model có sẵn; OFF/CLOSE callback synthetic vào receiver thật.
Không gọi AWS/GPIO, millis timer native tiến nhanh. JVM restart thật chuyển
PREPARED→RECOVERY, không command mới;9bảng điều khiển/history giữ nguyên.
V34→V35 giữ9bảng, không tự tạo phiên/action. Full app GET-only xác nhận
recovery, phiên đã khép, GET đối chiếu và loại trừ nhánh khác.
[Bàn giao](../implementation/LOCAL_IRRIGATION_SESSION_REPORT.md).

| Ca Windows/AWS/Wokwi thực tế | Kết quả |
| --- | --- |
| Tạo phiên và5xác nhận, ON ngắn, OFF/CLOSED đủ mới | Chưa chạy |
| Thiếu proof/ACK hoặc hết cửa sổ van: không ON | Chưa chạy |
| OFF chen khi gửi OPEN/ON; lệnh đến muộn không bật lại | Chưa chạy |
| Mất phản hồi HTTP, reload và GET đối chiếu không gửi lại | Chưa chạy |
| Restart backend/board giữa phiên; dừng phục hồi, không resume | Chưa chạy |
| Hai người/hai nhánh cùng thao tác; chỉ một phiên giữ quy trình | Chưa chạy |

Đây là điều phối có người xác nhận. Còn coordinator tự chuyển bước/chuyển
route nhiều vùng, interlock/flow xuyên controller, queue dispatch và nghiệm
thu thực địa; chưa hoàn tất A3.
