# Trạng thái bằng chứng và nghiệm thu — 14/10/2026

Trang này phân biệt xác nhận của người dùng, kiểm tra giả lập và phần còn chờ.
Nguồn là [nhật ký](BUILD_JOURNAL.md), [sổ lỗi](TROUBLESHOOTING.md) và xác nhận
trực tiếp của người dùng trong nhiệm vụ rà soát tài liệu. Không kiểm tra AWS,
Wokwi hoặc code đang được agent khác sửa trong phiên biên tập này.

Bản local chốt tại commit `3d8bcd9` ghi 47 kiểm tra backend và 13 browser
fixtures automation đạt, không skip. Cloud tiếp quản đã chạy lại nền đó cùng
5 kiểm tra Event Log mới: **52 backend tests đạt**, 13 browser fixtures
quy tắc và 7 browser fixtures nhật ký đạt, 3 test telemetry đạt.

Cloud còn chạy smoke trên ứng dụng thật: menu → Vite proxy → Spring Boot →
PostgreSQL trong schema test riêng; MQTT/control tắt. Đây là bằng chứng tích
hợp API/UI Event Log, không phải bằng chứng AWS hoặc GPIO.

Người dùng đã nói “đã hoạt động” sau bước đất khô bật tự động; ghi nhận là
user-reported một phần, chưa có timestamp/commandId/ACK/sequence để nghiệm thu
trọn sáu ca. OFF sớm, cooldown, timer và restart giữa run vẫn chờ xác nhận.
Lượt helper cũ 4 đạt/37 skip là lịch sử, không thay kết quả kiểm tra cuối.

| Hạng mục | Bằng chứng đã có | Giới hạn / việc còn chờ |
|---|---|---|
| Provisioning và MQTT | Nhật ký ghi người dùng cung cấp kết quả provisioning, probe CONNECT/LWT, serial telemetry/PUBACK và backend nhận dữ liệu | Từng mốc chỉ chứng minh phép thử tương ứng; không phải nghiệm thu toàn bộ AWS/Wokwi |
| PostgreSQL/API và Sensor Realtime | Response API live và xác nhận chạy thành công của người dùng đã ghi trong chương 8–9 | Chưa có xác nhận riêng cho mọi tình huống stale/outage/recovery, chống trùng và giữ dữ liệu sau restart |
| Điều khiển thủ công, timer, lịch sử trạng thái | Nhật ký ghi xác nhận của người dùng; có serial `RELAY_OFF reason=CONNECTION_LOST` | Chưa chứng minh runtime 60 phút, bơm vật lý hoặc toàn bộ phục hồi mạng |
| Lịch sử cảm biến | Người dùng xác nhận trang hoạt động | CSV live và phạm vi dữ liệu xuất vẫn cần xác nhận riêng |
| Cảnh báo đất thấp / nhiệt độ cao | Người dùng xác nhận mở và đóng đúng ngưỡng: đất `<30%` / `>=35%`; nhiệt độ `>35°C` / `<=33°C` | Xác nhận này không nghiệm thu quy tắc tưới hoặc mọi tình huống restart/mất dữ liệu |
| Quy tắc tưới tự động | Tests transport giả lập/PostgreSQL và 13 browser fixtures đạt; người dùng xác nhận bước bật tự động hoạt động | **Chưa nghiệm thu đầy đủ AWS/Wokwi** cho OFF sớm, cooldown, timer và restart giữa run |
| Nhật ký sự kiện | API/UI, 5 backend tests, 7 browser fixtures và smoke toàn ứng dụng với PostgreSQL test đạt | Chưa kiểm tra Event Log trên dữ liệu Windows/AWS của người dùng; không phải immutable audit log |
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
Ghi kết quả vào [mẫu nhật ký Wokwi](WOKWI_AUTOMATION_TEST_LOG.md); các ca chưa có bằng chứng chi tiết vẫn để “Chưa chạy”.
