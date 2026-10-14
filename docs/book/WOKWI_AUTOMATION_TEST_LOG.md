# Nhật ký thử tưới tự động V10 trên Wokwi

Đây là mẫu để người dùng ghi kết quả sau khi thực hiện, **không phải báo cáo
đã chạy**. Mọi kết quả thực tế ban đầu là “Chưa chạy”; không đánh dấu PASS từ
tests mock hoặc từ kết quả mong đợi. Tham khảo [chương 13](CHAPTER_13_AUTOMATIC_WATERING.md),
[Windows](WINDOWS_RUNBOOK.md) và [phạm vi nghiệm thu](ACCEPTANCE_STATUS.md).

## Xác nhận mới chưa đủ chi tiết

Người dùng đã báo bước bật tự động hoạt động. Chưa có mốc thời gian,
commandId hoặc log để đối chiếu từng điều kiện, nên không tự đánh dấu cả ca
1 hoặc các ca còn lại là PASS. Giữ kết quả này là user-reported một phần.

## Thông tin phiên và điều kiện đầu vào

- Ngày/giờ UTC bắt đầu và kết thúc: Chưa chạy.
- Phiên bản local/commit nền, bản báo cáo code dùng để thử: Chưa chạy.
- Môi trường Windows/Wokwi, phiên bản firmware đang dùng: Chưa chạy.
- Farm/device/actuator: FARM001 / ENV01 / PUMP01.
- bootId, sequence của cảm biến và actuator: Chưa chạy.
- Database demo Healthy, cảm biến mới, pump OFF mới, không lockout: Chưa chạy.
- Frontend/backend/gateway ở các terminal riêng; backend dùng Git Bash mới
  và `SMARTFARM_CONTROL_ENABLED=true`: Chưa chạy.

Code V10 đã có local; không pull/reset, không build firmware hoặc đổi IAM cho
bản sửa này. Chỉ thử LED mô phỏng. Đối chiếu giá trị telemetry nhận được, không
chỉ vị trí slider. Ghi thời điểm UTC hoặc kèm múi giờ rõ ràng cho từng quan sát.
Ghi commandId/run ID nếu có; nếu không thu được, ghi “Không thu được” sau khi
thử, không đoán ID. Bằng chứng chỉ gồm log/ảnh đã che thông tin riêng; không
đính kèm config, envfile, token, private key hoặc flash image.

## Ca 1 — Hai mẫu khô liên tiếp

| Trường | Nội dung |
|---|---|
| Thao tác | Đặt đất 45%, xác nhận OFF mới rồi bật quy tắc. Đổi đất xuống 28%; ghi mẫu khô thứ nhất và mẫu tiếp theo trong ≤15 giây, cùng boot, timestamp/sequence tăng |
| Kết quả mong đợi | Mẫu mới đầu đếm 1/2, chưa ON; mẫu thứ hai đủ điều kiện tạo đúng một ON 20 giây và một run. Mẫu trước enable không được tính. SENT/PUBACK chưa chứng minh LED ON; cần ACK EXECUTED SUCCESS/ON và quan sát GPIO/LED |
| Kết quả thực tế | Chưa chạy |
| Thời điểm bật rule / mẫu 1 / mẫu 2 / ON thực thi | Chưa chạy |
| commandId / run ID | Chưa chạy |
| Bằng chứng: telemetry boot/sequence, ACK, status, GPIO/serial, run history | Chưa chạy |

## Ca 2 — OFF sớm khi đất đủ ẩm

| Trường | Nội dung |
|---|---|
| Thao tác | Tạo run bằng hai mẫu khô liên tiếp. Sau khi LED ON, tăng đất lên 35% hoặc 40% trước khi hết 20 giây |
| Kết quả mong đợi | Gửi OFF sớm một lần; LED tắt. Run chỉ kết thúc khi có status OFF mới thỏa điều kiện chương 13; OFF trước ACK thực thi không đủ. Nếu chưa xác nhận OFF, run tiếp tục unresolved, chưa bắt đầu cooldown |
| Kết quả thực tế | Chưa chạy |
| Thời điểm ON / mẫu đủ ẩm / gửi OFF / ACK / status OFF / kết thúc run | Chưa chạy |
| commandId ON và OFF / run ID | Chưa chạy |
| Bằng chứng: telemetry, ACK stage/result/reportedState, status boot/sequence, GPIO, run history | Chưa chạy |

## Ca 3 — Timer 20 giây

| Trường | Nội dung |
|---|---|
| Thao tác | Sau khi hết cooldown, tạo run mới và giữ đất 28% suốt lần chạy; giữ simulator/gateway/backend chạy |
| Kết quả mong đợi | Firmware tự OFF khoảng 20 giây tính từ thực thi ON, không tính từ SENT/PUBACK. Ghi thời lượng quan sát; run chờ status OFF mới trước khi kết thúc. Mốc thiếu ACK issuedAt+30 giây không đổi runtime GPIO 20 giây |
| Kết quả thực tế | Chưa chạy |
| Thời điểm thực thi ON / GPIO OFF / backend xác nhận OFF; thời lượng đo | Chưa chạy |
| commandId / run ID | Chưa chạy |
| Bằng chứng: ACK ON, serial/GPIO, status mới và run history | Chưa chạy |

## Ca 4 — Cooldown 60 giây

| Trường | Nội dung |
|---|---|
| Thao tác | Sau ca OFF được xác nhận, giữ hoặc đưa đất về 28%, giữ quy tắc bật; quan sát hết khoảng nghỉ và mẫu đủ điều kiện tiếp theo |
| Kết quả mong đợi | Không ON trong ít nhất 60 giây từ lúc backend xác nhận OFF. UI báo đang nghỉ. Sau nghỉ, hai mẫu fresh đủ điều kiện có thể tạo run tiếp; không yêu cầu ON đúng giây thứ 60 |
| Kết quả thực tế | Chưa chạy |
| Thời điểm backend xác nhận OFF / hết nghỉ / ON tiếp; khoảng cách đo | Chưa chạy |
| commandId / run ID trước và sau khoảng nghỉ | Chưa chạy |
| Bằng chứng: UI cooldown, telemetry, command/run history, ACK/status | Chưa chạy |

## Ca 5 — Manual hold: tắt thủ công giữa run

| Trường | Nội dung |
|---|---|
| Thao tác | Trong run đang ON, gửi OFF từ Điều khiển Actuator; giữ đất thấp và quan sát sau OFF |
| Kết quả mong đợi | Quy tắc tạm dừng trước dispatch thủ công; LED OFF và có bằng chứng trạng thái mới. Không tự ON tiếp dù đất vẫn thấp; muốn thử lại phải bật rule chủ động sau khi đủ điều kiện |
| Kết quả thực tế | Chưa chạy |
| Thời điểm thao tác / pause / ACK OFF / status OFF | Chưa chạy |
| commandId tự động và thủ công / run ID | Chưa chạy |
| Bằng chứng: UI rule tắt, command/ACK/status, GPIO, run history | Chưa chạy |

## Ca 6 — Restart backend giữa run

| Trường | Nội dung |
|---|---|
| Thao tác | Khi LED ON, Ctrl+C backend rồi chạy lại trong Git Bash mới theo runbook; giữ simulator/gateway/frontend chạy, không restart simulator |
| Kết quả mong đợi | Rule tắt sau startup, không tự bật lại hoặc replay ON; active run vẫn được theo dõi. Timer thiết bị tiếp tục đến cutoff; OFF mới đủ điều kiện mới kết thúc run và bắt đầu cooldown. Thiếu bằng chứng OFF thì giữ unresolved, không bật rule lại |
| Kết quả thực tế | Chưa chạy |
| Thời điểm ON / dừng backend / startup / GPIO OFF / nhận status OFF | Chưa chạy |
| commandId trước và sau restart / run ID đang theo dõi | Chưa chạy |
| Bằng chứng: startup, UI disabled, boot/sequence thiết bị, command/run history, GPIO/status | Chưa chạy |

## Ca bổ sung — Mẫu ướt xen giữa

| Trường | Nội dung |
|---|---|
| Thao tác | Sau enable ở 45%, tạo chuỗi mẫu thực nhận 28% → 40% → 28% và ghi từng timestamp/sequence; không inject telemetry giả vào AWS live |
| Kết quả mong đợi | Mẫu 40% reset count; mẫu 28% cuối chỉ là 1/2, chưa ON. Ca cả ba mẫu giữa một tick đã có test local; thao tác slider live không bảo đảm tái hiện cùng lịch tick |
| Kết quả thực tế | Chưa chạy |
| Thời điểm và sequence của ba mẫu | Chưa chạy |
| commandId / run ID nếu có | Chưa chạy |
| Bằng chứng: ba telemetry thực nhận, count/UI và command history | Chưa chạy |

## Kết thúc phiên

- Tắt quy tắc và xác nhận GPIO OFF: Chưa chạy.
- Các ca chưa thu đủ bằng chứng / vấn đề cần theo dõi: Chưa chạy.
- Kết luận nghiệm thu của người dùng sau khi chạy: Chưa chạy.

Không dùng `docker compose down -v`; dừng mà giữ volume theo runbook. Nếu
restart simulator, ghi thành boot mới: RAM mất, NVS chưa làm, không coi đó là
ca restart backend hoặc bằng chứng reconnect không reboot. Nếu publish không
rõ kết quả, không tự thử lại ON; giữ rule tạm dừng và kiểm tra trạng thái.
