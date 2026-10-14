# Trạng thái bằng chứng và nghiệm thu — 14/10/2026

Trang này phân biệt xác nhận của người dùng, kiểm tra giả lập và phần còn chờ.
Nguồn là [nhật ký](BUILD_JOURNAL.md), [sổ lỗi](TROUBLESHOOTING.md) và xác nhận
trực tiếp của người dùng trong nhiệm vụ rà soát tài liệu. Không kiểm tra AWS,
Wokwi hoặc code đang được agent khác sửa trong phiên biên tập này.

Bản local chốt tại commit `3d8bcd9` ghi 47 kiểm tra backend và 13 browser
fixtures automation đạt, không skip. Cloud tiếp quản đã chạy lại nền đó cùng
5 kiểm tra Event Log mới: 52 backend tests đạt trong đợt trước, 13 browser fixtures
quy tắc và 7 browser fixtures nhật ký đạt, 3 test telemetry đạt.

Đợt giám sát tiếp theo đạt **61 backend tests**, 7 browser fixtures giám sát
và 6 frontend unit tests, không skip; lint/build đạt. Smoke toàn app giám sát
qua API/DB thật với MQTT tắt đạt.

Cloud còn chạy smoke trên ứng dụng thật: menu → Vite proxy → Spring Boot →
PostgreSQL trong schema test riêng; MQTT/control tắt. Đây là bằng chứng tích
hợp API/UI Event Log, không phải bằng chứng AWS hoặc GPIO.

Đợt cài đặt tưới V11 đạt **72 backend tests**, 24 browser fixtures quy tắc,
11 frontend unit tests và lint/build, không skip. Smoke UI/API/PostgreSQL test
đã lưu cấu hình và đọc lại sau restart backend; MQTT/control tắt. Ngưỡng mới
trên Windows/AWS/Wokwi vẫn cần xác nhận, không thay bằng chứng V10.

Đợt trang an toàn đạt **78 backend tests**, 9 browser fixtures safety, 14 unit
frontend và lint/build, không skip. Smoke App/API/PostgreSQL chỉ GET và đối chiếu
DB giữ nguyên lệnh/run đạt. Không có kiểm chứng GPIO hay sự cố AWS/Wokwi live mới.

Đợt xác nhận đã xem V12 đạt **88 backend tests**, 9 browser cảnh báo, 8 Event
Log và 8 Dashboard, 17 unit frontend và lint/build. Smoke lưu/đọc sau restart
trên App/API/PostgreSQL giữ timestamp/note/điều kiện active đạt; MQTT/control
tắt. Không có phép thử AWS/Wokwi live mới trong đợt metadata này.

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
| Giám sát thiết bị | API/UI đọc registry, số đo, status, cảnh báo và lifecycle MQTT backend; cloud unit/integration/browser/smoke đạt | Chưa subscribe heartbeat mọi sensor; không chứng minh online/offline vật lý. Windows/AWS live còn chờ |
| Tổng quan IoT | Snapshot registry/monitoring/alert/rule/events thật; cloud 64 backend, 7 dashboard browser và 9 unit frontend đạt; full-app smoke đạt | MQTT/control tắt trong cloud; chưa nghiệm thu Windows/AWS live cho dashboard |
| Cài đặt tưới V11 | API phiên bản, giới hạn, khóa sửa khi active, snapshot run; backend/browser và smoke lưu/đọc sau restart đạt | Một rule, một backend process; không cấu hình ngưỡng alert; chưa nghiệm thu ngưỡng mới trên AWS/Wokwi |
| An toàn Fail-Safe & Edge | API/UI chỉ đọc, bản cũ/current tách biệt, queue toàn bộ và reason/history thật; cloud integration/browser/smoke đạt | Không xác minh firmware thực nạp, GPIO, dry-run, OTA, NVS; chưa thử live Windows/AWS |
| Xác nhận đã xem cảnh báo V12 | ACK/note idempotent riêng condition, Event Log người xem, row-lock/concurrency/migration/browser và restart smoke đạt | Chưa actor/auth, edit/unack/email; list100, GET theo ID; Windows/Wokwi mới chưa thử |
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
