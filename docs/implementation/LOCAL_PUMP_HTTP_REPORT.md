# Bàn giao HTTP intent PUMP01 V23

15/10/2026, giờ Việt Nam. Tiếp MQTT V22: UUID idempotency cho request đã lưu,
review version/boot/deadline, startup invalidation, lookup ngoài20 và manual
hold chỉ cho reservation mới. Chỉ profile fencing opt-in; legacy mặc định
không có HTTP fence. Queue chưa dispatch, ownership/coordinator còn sau.

Thao tác vẫn Điều khiển Actuator. Pull/restart backend/frontend để V23 cùng
UI mới; không IAM/cert/firmware mới (dùng V22 đã opt-in hai phía). Web tự dùng
/requests, lưu UUID trước POST vào sessionStorage, GET đối chiếu sau mất
response/reload. Không tự gửi lại. Khi404 vẫn giữ chưa rõ; OFF mới đã lưu chặn
ý định ON/RESET cũ và khép đối chiếu trên web, không khẳng định GPIO OFF.

| Kiểm tra | Kết quả |
| --- | --- |
| Backend full, PostgreSQL riêng |262/262 skip0;15HTTP mới |
| Browser pump |11/11 |
| Unit parser |4/4 |
| Lint/build |Đạt, cảnh báo Vite cũ |
| Full app/native status + offline OFF, restart process thật |Đạt |
| V22→23 giữ fixture queue4record/revision/counts |Đạt |
| Firmware/wire changes |Không; dùng bằng chứng V22 |
| Windows/AWS/Wokwi thật |6ca Chưa chạy |

Xem [chương35](../book/CHAPTER_35_PUMP_HTTP_INTENT.md) cho API/Windows và phạm vi.
File chính: PumpCommandFencing/PumpController/WateringRule, V23,
PumpControl/pumpIntentApi, test15backend/11browser/4unit, fixture/smoke/sách.
Old endpoint /commands trong protected mode chặn manual ON/RESET; OFF dự
phòng vẫn có. Trusted automation dùng dispatcher nội bộ, không giả HTTP.

OFF khi biết MQTT offline vẫn lưu FAILED/MQTT_UNAVAILABLE và tăng phiên ý
định. Đây là thay đổi có chủ ý so với V22; test cũ đã cập nhật đúng hành vi.
HTTP receipt202 không phải MQTT ACK hay GPIO. Replay bản đã lưu không đòi
control/MQTT và không chạy callback/manual hold; không phát lại lệnh.

Runtime cloud8080 schema pump_http_smoke, Vite3000, PGsmartfarm-cloud-test55439.
Control/MQTT/valve-demo false, fencingtrue. Native status0 cũ tự thànhUNKNOWN;
1OFF fixture failed/MQTT_UNAVAILABLE, run/queue/valvecommand0. Harness chỉ tạo
record offline bằng service test local và kiểm tra không có CommandTransport;
runtime không bật control. Không reseed. UI GET-only đối chiếu; API client
smoke replay đúngUUID đã có, không reservation mới hoặc MQTT. Restart thật
đã tăngintentRevision và giữ bản lưu. Queue fixture4lượt được bảo toàn qua
migration; DBdemo5433 và các schema khác không reset.

Logs /tmp: pump-http-backend-full.log, pump-http-browser-verified.log,
pump-http-unit-verified.log, pump-http-lint-verified.log,
pump-http-build-verified.log, pump-http-fixture.log, pump-http-upgrade.log,
pump-http-runtime-restart.log; ảnh pump-http-full-app.png. Artifact /tmp
không push. Chương sách ghi matcher bị shadow, checkedException test, kỳ
vọng body OFF cũ và lỗi độ chính xác Date.parse đã sửa.

Bước tiếp: lease/chủ sở hữu bơm và loại trừ manual/rule, rồi sequencing nhiều
van với feedback/interlock. Không suy ra đã có coordinator thật từ HTTP fence.
