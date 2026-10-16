# Chương 48 — Lịch sử bơm theo nhánh và xuất CSV

Ngày 16/10/2026. Sau [bơm LED đúng nhánh](CHAPTER_47_PUMP_CIRCUIT_ROUTE.md),
V34 bổ sung lịch sử các bản tin PUMP01 có khai báo route và màn đọc lệnh/ACK.
Phần này giúp trả lời thiết bị đã báo gì, trong phiên khởi động nào, với
phiên bản nhánh nào; chưa tự điều phối nhiều vùng hoặc tính lượng nước.

## Mở màn hình

Vào **IoT & Tự động hóa → Điều khiển Actuator → Cấu hình nhánh tưới →
Lịch sử bơm <mã nhánh>**. Có bộ lọc 1 giờ/24 giờ/7 ngày/31 ngày, mã nhánh
và trạng thái trong mẫu: tất cả, ON, OFF, có khóa. Bỏ mã nhánh để xem các
nhánh đã có dữ liệu. Bộ lọc chỉ áp dụng sau khi bấm **Đọc lịch sử bơm**.
Trang không gửi command, reset khóa hoặc làm mới timestamp của bản tin.

Hai phần được hiển thị riêng:

| Phần | Nguồn và thời gian lọc | Có thể kết luận |
| --- | --- | --- |
| Bản tin trạng thái đã chấp nhận | Status ONLINE có route, theo giờ backend nhận | PUMP01 đã báo ON/OFF/khóa với route/boot/sequence đó |
| Lệnh có khai báo nhánh và ACK | pump_command mang circuit_route, theo issuedAt | Lệnh đã lưu, trạng thái ledger và metadata ACK hiện có lúc đọc |

HTTP202, PENDING/SENT hoặc ACK SUCCESS không tự sinh status ON. ACK có thể
đến trước/sau status; vì vậy có lệnh mà chưa có mẫu, hoặc có mẫu mà bản lưu
ACK vẫn chưa hoàn chỉnh. TIMED_OUT/lifetime hết không tự tạo OFF. GET lịch
sử không tự expire lệnh, không giải phóng quyền bơm hoặc sửa rule.

Lệnh OFF khẩn cấp không mang route. Nó không được liệt kê như lệnh chọn
nhánh trong phần thứ hai. Khi status có route báo đã thấy ordinal của OFF,
chi tiết mẫu giữ commandId để đối chiếu lịch sử PUMP01 chung. Không gán
route cho lệnh OFF từ cấu hình hiện tại rồi coi là ý định ban đầu của người gửi.
commandId trong mẫu là lệnh tương ứng ordinal, không khẳng định lệnh đó
là nguyên nhân của mọi thay đổi: TIMER_EXPIRED/OFF có thể vẫn mang ordinal ON.

## V34 lưu gì

Bảng pump_circuit_history lưu id, route sáu trường tại thời điểm nhận, boot,
sequence, source/receipt, reportedState, safetyLockout, stateReason,
lastOrdinal, commandId nếu tìm được và metadata valveInterlock/durableSafety.
Không dùng tên nhánh, trạm nước hoặc revision hiện tại để ghi đè dữ liệu cũ.
Route không phải toàn bộ snapshot cấu hình nhánh: tên/trạm/kênh nước không
được sao chép vào bảng này. Không tự tạo vùng/cấu hình để hiển thị lịch sử.

Trigger AFTER INSERT/UPDATE trên pump_status ghi trong cùng giao dịch với
bản tin đã chấp nhận. SQL upsert từ chối duplicate/out-of-order hoặc thay
route cùng boot thì không tạo lịch sử mới. UNIQUE boot/sequence ngăn ghi
trùng. Row singleton bơm tuần tự hóa ghi qua commit trước khi cấp id lịch sử,
để phân trang không bỏ sót id còn chưa commit. Không sửa decoder MQTT hoặc
firmware; tiêu chuẩn nhận status V33 vẫn giữ nguyên.

Migration **không backfill** latest cũ. Sau nâng cấp, mẫu V33 cũ vẫn trong
pump_status nhưng chưa có dòng lịch sử cho đến khi nhận status mới. Lệnh V33
đã có circuit_route vẫn đọc được trong phần lệnh nếu nằm trong khoảng giờ.
Legacy không khai báo route không bị gán nhánh để lấp chỗ trống. Không có
FK làm xóa lịch sử theo cấu hình/command; giữ tuple và commandId đã quan sát.
Chưa có chính sách tự xóa/retention của lịch sử này.

Đây là lời khai thiết bị mô phỏng, không phải chứng nhận đường nước vật lý.
observedAt là giờ thiết bị phát status; nếu mất mạng rồi nối lại, không từ
đó suy ra thời điểm GPIO thực cắt trong lúc offline. Không tính chính xác
runtime hoặc lít tưới bằng cách trừ hai mẫu có khoảng trống.

## Phân trang, chi tiết và CSV

- Status API giới hạn 1–200 dòng/request, UI dùng 50. Khoảng giờ nửa mở
  `[from,to)` theo receivedAt, tối đa31ngày. Trang sau giữ cùng bộ lọc,
  khoảng giờ và ceilingId của trang đầu; bản tin đến sau cần đọc lại từ đầu.
- Thứ tự receivedAt giảm dần, rồi id giảm dần; giữ độ chính xác microsecond.
  Token cursor không dùng lại cho nhánh/điều kiện/khoảng giờ khác. Màn hình
  chặn phản hồi sai nhánh, sai metadata hoặc thứ tự; lỗi không biến thành rỗng.
- **Xem bản tin** hiện route/revisions, controller/valve, boot/sequence,
  hai timestamp gốc, ordinal, commandId, local proof/fault và NVS được báo.
  Không lấy trạng thái lịch sử làm readiness hiện tại.
- Phần lệnh hiển thị tối đa50lệnh mới nhất trong khoảng đã chọn. `hasMore`
  báo còn dòng; thu hẹp khoảng giờ hoặc chọn một nhánh. Phần này không có
  cursor tải toàn bộ; bộ lọc ON/OFF/khóa chỉ lọc status, không lọc ledger.
- Có **CSV trạng thái đã tải** và **CSV lệnh đã tải** riêng. Chỉ xuất các
  dòng đang tải; không tự tải toàn bộ. Giữ timestamp gốc, route/revisions,
  boot/ordinal; CSV lệnh phân biệt reportedStateInAck với reportedState của
  status. Không có cột nước thực cấp hoặc thời gian chạy được suy diễn.
- CSV dùng UTF-8 BOM/CRLF, quote/escape các ô và trung hòa đầu ô công thức
  spreadsheet, kể cả errorCode. Nếu API đang lỗi hoặc tải, xuất bị chặn.
  Lượt tải cũ không ghi đè bộ lọc mới khi phản hồi đến muộn.

API đọc:

```text
GET /api/v1/pump-circuit-history?from=ISO&to=ISO&circuitId=CODE&condition=ALL&limit=50
GET /api/v1/pump-circuit-history?...&cursor=TOKEN
GET /api/v1/pump-circuit-history/commands?from=ISO&to=ISO&circuitId=CODE&limit=50
```

circuitId tùy chọn. condition là ALL/ON/OFF/LOCKED. Query nhánh cũ không còn
trong cấu hình vẫn có thể đọc lịch sử đã lưu, không tự remap dữ liệu.

## Tiếp tục trên Windows

1. Giữ dữ liệu PostgreSQL, pull nhánh và restart backend bằng terminal Git
   Bash/runbook đã dùng ở chương47. Flyway áp V34, không xóa volume hoặc
   chạy lại provisioning chỉ để có lịch sử. Không cần IAM/certificate/topic mới.
2. Giữ các opt-in và firmware route theo chương47. Mở màn lịch sử: dữ liệu
   cũ có thể chưa có status history dù phần lệnh đã hiện dữ liệu V33.
3. Chỉ sau khi các điều kiện thử LED đã sẵn sàng, thực hiện ca bật ngắn của
   chương47. Đợi status mới, chọn 1giờ/đúng nhánh và bấm Đọc lịch sử bơm.
4. Đối chiếu ACK với commandId/boot/ordinal và status riêng. Mở chi tiết,
   tải hai CSV; không dùng chúng thay xác nhận GPIO/đường nước thực tế.
5. Kết thúc thử ở bơm OFF xác nhận, rồi đóng van. Chỉ đọc lịch sử không
   bật lại thiết bị; có thể dừng simulators/gateway khi không thử nữa.

## Bằng chứng và nghiệm thu

477 backend đạt, không skip (16 test mới); 54 browser nhánh đạt (10 mới);
20 unit history/safety đạt (7 mới +13 hồi quy); lint/build đạt. Không thay
firmware, dependency hoặc hợp đồng MQTT. Native fixture hiện có đi qua
receiver thật/DB và ghi3status riêng, ACK chỉ nằm ledger; millis model tiến
nhanh, không phải GPIO thật. Full app GET-only/CSV và restart giữ dữ liệu.
V33→V34 giữ8bảng cũ, history mới rỗng, không hồi tố.
[Bàn giao](../implementation/LOCAL_PUMP_CIRCUIT_HISTORY_REPORT.md).

| Ca Windows/AWS/Wokwi thực tế | Kết quả |
| --- | --- |
| Nâng V33→V34 giữ mẫu/lệnh cũ, history không tự xuất hiện | Chưa chạy |
| Bật LED ngắn đúng nhánh, lệnh/ACK và status ON/OFF hiển thị riêng | Chưa chạy |
| Hai nhánh/revision khác, filter và CSV giữ đúng nguồn/mapping | Chưa chạy |
| Mất gateway, trạng thái sau reconnect không được diễn giải thành thời điểm cắt offline | Chưa chạy |
| Restart backend giữ history/clock/ledger, không tạo trùng hoặc replay ON | Chưa chạy |

Còn coordinator nhiều nhánh, flow proof xuyên controller và dispatch queue.
Phần lịch sử này không tự cấp thêm năng lực vận hành cho các profile hiện có.
