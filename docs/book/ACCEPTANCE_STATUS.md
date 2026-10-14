# Trạng thái bằng chứng và nghiệm thu — 14/10/2026

Trang này phân biệt xác nhận của người dùng, kiểm tra giả lập và phần còn chờ.
Nguồn là [nhật ký](BUILD_JOURNAL.md), [sổ lỗi](TROUBLESHOOTING.md) và xác nhận
trực tiếp của người dùng trong nhiệm vụ rà soát tài liệu. Không kiểm tra AWS,
Wokwi hoặc code đang được agent khác sửa trong phiên biên tập này.

Cập nhật theo [bản bàn giao code V10](../implementation/LOCAL_CODEX_REPORT.md):
**41 test backend và 3 test telemetry frontend đạt**, không skip; lint/build đạt.
Ba test frontend là `telemetryApi.test.ts`; **chưa có browser/E2E automation
mới và chưa nghiệm thu AWS/Wokwi thật**. Dấu nhận diện báo cáo đã dùng nằm trong
[báo cáo tài liệu](../implementation/LOCAL_DOCS_REPORT.md).

Phần theo dõi runtime mới ghi backend đã áp dụng V10, API rule tắt nhưng chưa
bật rule/gửi ON/OFF. Helper chạy 4 test đạt, 37 skip, khác lượt audit 41/41
không skip. Chưa có telemetry/status mới hoặc GPIO để nghiệm thu tưới;
mẫu nhật ký giữ “Chưa chạy” cho tất cả các ca.

| Hạng mục | Bằng chứng đã có | Giới hạn / việc còn chờ |
|---|---|---|
| Provisioning và MQTT | Nhật ký ghi người dùng cung cấp kết quả provisioning, probe CONNECT/LWT, serial telemetry/PUBACK và backend nhận dữ liệu | Từng mốc chỉ chứng minh phép thử tương ứng; không phải nghiệm thu toàn bộ AWS/Wokwi |
| PostgreSQL/API và Sensor Realtime | Response API live và xác nhận chạy thành công của người dùng đã ghi trong chương 8–9 | Chưa có xác nhận riêng cho mọi tình huống stale/outage/recovery, chống trùng và giữ dữ liệu sau restart |
| Điều khiển thủ công, timer, lịch sử trạng thái | Nhật ký ghi xác nhận của người dùng; có serial `RELAY_OFF reason=CONNECTION_LOST` | Chưa chứng minh runtime 60 phút, bơm vật lý hoặc toàn bộ phục hồi mạng |
| Lịch sử cảm biến | Người dùng xác nhận trang hoạt động | CSV live và phạm vi dữ liệu xuất vẫn cần xác nhận riêng |
| Cảnh báo đất thấp / nhiệt độ cao | Người dùng xác nhận mở và đóng đúng ngưỡng: đất `<30%` / `>=35%`; nhiệt độ `>35°C` / `<=33°C` | Xác nhận này không nghiệm thu quy tắc tưới hoặc mọi tình huống restart/mất dữ liệu |
| Quy tắc tưới tự động | Bản bàn giao V10 ghi tests với transport giả lập và PostgreSQL test | **Chưa nghiệm thu đầy đủ trên AWS/Wokwi thật**; chưa có browser/E2E automation mới |
| NVS và phục hồi mạng | Restart simulation từng cần thiết khi gateway restart không phục hồi phiên | **NVS chưa làm**; restart mất RAM, không phải bằng chứng reconnect thành công |

Tests với MQTT mock, API fixture, dữ liệu SQL thử hoặc native safety assertions
chỉ xác nhận hành vi trong môi trường kiểm tra. PostgreSQL thật trong tests
không biến MQTT giả lập thành kết nối AWS thật. PUBACK không chứng minh GPIO
đã thực thi hoặc transaction database đã commit; GPIO cũng không chứng minh
bơm vật lý đã chạy.

Các mục “chờ người dùng” trong nhật ký là trạng thái tại thời điểm ghi. Khi
có xác nhận mới, đối chiếu bảng này; giữ mục cũ để hiểu lịch sử. Phần audit
automation ngày 14/10 đã được đối chiếu với báo cáo bàn giao V10. Chỉ cập nhật
từ báo cáo đó; không suy luận thêm từ working tree đang được agent khác sửa.

Để nghiệm thu automation sau khi code được bàn giao, cần ghi lại phiên bản,
môi trường, giá trị cảm biến theo thời gian, commandId, ACK thực thi, status mới,
GPIO và run history. Đối chiếu riêng ca đất khô, đất đủ ẩm/tắt sớm, cutoff,
khoảng nghỉ, thao tác thủ công, thiếu ACK và restart. Kịch bản này là danh sách
cần xác nhận, không phải kết quả đã đạt.
Ghi kết quả vào [mẫu nhật ký Wokwi](WOKWI_AUTOMATION_TEST_LOG.md); các ca hiện
đều là “Chưa chạy”.
