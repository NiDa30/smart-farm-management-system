# Quy tắc tưới tự động đầu tiên

**Cập nhật V11:** bốn giá trị 30/35/20/60 trong chương này là mặc định của
bản V10. Nay có thể sửa trên giao diện theo [chương 17](CHAPTER_17_WATERING_SETTINGS.md).
Thời hạn bảo thủ khi thiếu ACK là `expiresAt + durationSeconds`, không luôn
cố định issuedAt + 30 giây. Các bằng chứng cũ dưới đây giữ theo phiên bản đã thử.


**Bản bàn giao V10, cập nhật tài liệu 14/10/2026:** nội dung dưới đây dựa trên
[báo cáo code local](../implementation/LOCAL_CODEX_REPORT.md), không suy luận
từ code đang sửa. Dấu nhận diện báo cáo đã dùng được ghi trong
[báo cáo tài liệu](../implementation/LOCAL_DOCS_REPORT.md).
Quy tắc tưới tự động chưa nghiệm thu đầy đủ trên AWS/Wokwi thật. Xem
[trạng thái bằng chứng](ACCEPTANCE_STATUS.md) và
[terminal Windows](WINDOWS_RUNBOOK.md).

Người dùng đã xác nhận cảnh báo đất thấp và nhiệt độ cao mở/đóng đúng ngưỡng.
Cảnh báo và tưới tự động là hai chức năng độc lập; kết quả của cảnh báo không
thay thế nghiệm thu lệnh tưới. Restart simulator làm mất trạng thái RAM;
lưu NVS chưa làm.

## Audit local ngày 14/10/2026

Theo báo cáo bàn giao, kiểm tra Windows dùng transport giả lập và PostgreSQL
test riêng: **41 test backend và 3 test telemetry frontend đạt**, không
skip; frontend lint/build đạt. Ba test frontend thuộc `telemetryApi.test.ts`,
không phải browser/E2E automation. Chưa có browser/E2E automation mới.
Phần theo dõi runtime được bổ sung vào báo cáo trong lúc biên tập ghi backend
đã áp dụng V10 và API rule tắt, nhưng chưa bật rule hoặc gửi ON/OFF. Lượt helper
sau đó chỉ chạy 4 test đạt, 37 skip; khác lượt audit 41/41 nêu trên. Không coi
khởi động backend thành công là nghiệm thu tưới thật.
Người dùng đã xác nhận
monitoring, manual control, sensor history và alerts; **automation AWS/Wokwi
thật chưa được nghiệm thu**. Không suy ra kết quả live từ những test này.

Migration V10 bổ sung boot/sequence của mẫu cuối. Scheduler xét các mẫu chưa
xử lý theo thứ tự thời gian, kể cả mẫu ướt nằm giữa hai lượt tick. Hai mẫu khô
phải mới, cùng boot, timestamp tăng, sequence tăng và cách nhau ≤15 giây.
Hai mẫu khô phải thực sự liên tiếp: mẫu ướt xen giữa reset count. Ví dụ
28% → 40% → 28% chỉ để lại một mẫu khô, dù cả ba đến giữa hai lượt tick.
Boot đổi làm đếm lại; mẫu trùng/sai thứ tự không tăng đếm. Mẫu ngay trước khi
bật quy tắc là mốc, không tính thành mẫu khô đầu tiên. Không dùng hai mẫu cũ
đã có lúc bật quy tắc để bật relay ngay.

SENT là trạng thái gửi lệnh; PUBACK là xác nhận ở lớp MQTT từ broker. Cả hai
khác với ACK xác nhận thực thi trên thiết bị. ACK phải EXECUTED SUCCESS và
reportedState đúng action. Để kết thúc lần chạy, status OFF phải mới và cùng
boot có sequence lớn hơn ACK thực thi ON hoặc OFF. Status OFF trước ACK
không đủ, dù đến backend sau khi gửi lệnh. Nếu thiếu ACK, cần status OFF có
thời điểm nguồn sau expiresAt + runtime của ON: với rule này là mốc
issuedAt + 30 giây. Đây là mốc bảo thủ cho lệnh ON có thể đến sát hạn TTL,
không phải thay runtime GPIO từ 20 thành 30 giây. Không có status OFF mới thì
không kết thúc run hoặc bắt đầu cooldown chỉ dựa vào thời gian đã trôi qua.

Kết quả publish ON chưa rõ vẫn giữ commandId trong rule/history, tạm dừng
và thử OFF đúng một lần. OFF thất bại/chưa ACK không giải phóng run ngay;
người vận hành phải theo dõi trạng thái. Restart giữ run đang theo dõi, luôn
tắt enabled, kể cả khi MQTT tắt; không replay ON. Startup không tự gửi lệnh.
Nếu MQTT tắt thì scheduler không reconcile cho tới khi backend chạy với MQTT.

Trang quy tắc phân biệt chờ mẫu mới, đất chưa thấp, đang nghỉ, lệnh đang chờ,
thiết bị chưa sẵn sàng, khóa an toàn và ACK thực thi ON. Lịch sử run vẫn gắn
commandId; trạng thái GPIO hiện tại phải xem bản tin thiết bị mới trong Actuator.
Kịch bản kiểm tra thật và lệnh Windows có trong
[báo cáo local](../implementation/LOCAL_CODEX_REPORT.md).

MVP có một quy tắc cố định cho ENV01 → PUMP01, mặc định tắt. Chỉ bật quy tắc
khi cảm biến có dữ liệu mới trong 15 giây, thiết bị báo OFF mới, không khóa
an toàn và backend đã bật điều khiển. Hai mẫu mới liên tiếp có độ ẩm đất dưới 30%,
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

Code V10 đã nằm local; không cần pull/checkout/reset. Không cần build firmware
hoặc đổi IAM cho bản sửa V10. Dừng backend cũ bằng Ctrl+C và mở **Git Bash mới**
cho backend demo để tránh kế thừa biến database test. Không dùng terminal từng
chạy tests với DB cổng 55439/schema `telemetry_test` để khởi động demo. Từ gốc
repository, khi database demo Healthy, chạy:

```bash
SMARTFARM_CONTROL_ENABLED=true bash tools/backend/run_backend_windows.sh
```

Helper dùng cấu hình riêng đã có; không in hoặc gửi nội dung cấu hình. Flyway
áp dụng V10 khi backend khởi động. Giữ frontend/backend/gateway ở ba terminal
riêng, giữ Wokwi chạy. Restart backend phải để quy tắc tắt; nếu có run cũ,
chờ OFF mới được xác nhận trước khi bật lại. Chỉnh đất khoảng 45%, kiểm tra
pump OFF mới và không khóa, rồi bật quy tắc trong Quy tắc Tự động hóa.

Giảm đất xuống 28%. Chờ hai mẫu (telemetry mỗi 5 giây) và lượt đánh giá
quy tắc (mỗi 2 giây). Kết quả mong đợi là LED bật; kiểm tra ACK
EXECUTED SUCCESS với reportedState=ON ở Điều khiển Actuator.
Tăng đất lên 40% trước khi hết 20 giây để thử tắt sớm. Giữ đất ở 28% trong
lần khác để kiểm tra timer 20 giây và khoảng nghỉ 60 giây.

Thử tắt thủ công để xác nhận quy tắc tạm dừng. Tắt quy tắc sau demo. Các
kiểm tra local dùng transport giả lập; chưa thay thế nghiệm thu AWS/Wokwi thật.
Ghi từng ca vào [nhật ký thử Wokwi](WOKWI_AUTOMATION_TEST_LOG.md), hiện tất cả
kết quả thực tế là “Chưa chạy”. Tắt quy tắc và xác nhận GPIO OFF sau demo;
không dùng `docker compose down -v` vì lệnh đó xóa volume database.

Cảnh báo ngưỡng và quy tắc độc lập: việc đóng hoặc đọc cảnh báo không gửi
lệnh điều khiển. Lưu NVS và phục hồi kết nối Wokwi vẫn là công việc sau.
