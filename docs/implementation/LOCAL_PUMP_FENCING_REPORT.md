# Bàn giao PUMP01 MQTT boot/ordinal V22

15/10/2026, giờ Việt Nam. Đã thêm opt-in chống MQTT ON cũ sau OFF/reboot,
reservation DB và kiểm tra ACK/status; mặc định legacy giữ nguyên. Chưa nối
queue hoặc cấp quyền sở hữu chung cho coordinator. HTTP ON đến muộn vẫn có
thể được cấp ordinal mới; HTTP identity/fence phải làm trước dispatch queue.

Đường vào vẫn **Điều khiển Actuator**; có thông tin profile backend/thiết bị,
chặn ON/reset khi lệch mode hoặc cần reboot sau emergency legacy OFF.

Bật thử Wokwi: private config FARM_PUMP_FENCING_ENABLED1 và control1; rebuild
app/FS/merge, reboot. Backend SMARTFARM_PUMP_FENCING_ENABLED=true và controltrue,
restart để V22 migrate. Giữ DB/cert/IAM, không tự bật các cờ trên máy người dùng.
Chi tiết [chương34](../book/CHAPTER_34_PUMP_COMMAND_FENCING.md), [wire contract](../../contracts/iot/v1/PUMP_COMMAND_FENCING.md).

| Kiểm tra cuối | Kết quả |
| --- | --- |
| Backend toàn bộ/PostgreSQL riêng | 247/247, không skip |
| PumpFencingTest | 17, thuộc tổng247 |
| Legacy interop bổ sung | 1, thuộc tổng247 |
| Browser pump/fixture API | 6/6 |
| Browser queue hồi quy | 12/12 |
| Python contracts (v1/water/fencing) | 17/17 |
| Native fenced parser/model và RelaySafety cũ | Đạt, stdc++11/Werror |
| ESP32 public default/opt-in, buildfs/merge | Đạt; không PEM/endpoint |
| Lint/build | Đạt, cảnh báo Vite cũ |
| Full app PostgreSQL/native status, process restart | Đạt; GET-only, control/MQTT tắt |
| V21→22 giữ queue fixture | Đạt;4records/revision/command0/run0 giữ nguyên |
| AWS/Wokwi/GPIO mới | Không chạy;6ca Windows Chưa chạy |

File chính: PumpCommandFencing.java/PumpService.java, V22, application.yml,
PumpCommandFence.h/FencedPumpPacket.h/main.cpp/config.example.h; PumpControl
metadata UI; v1 schemas với metadata tùy chọn; tests/fixture/runbook/sách.
Không đổi clientENV01/topic/IAM/certificate hoặc wiring diagram.

Runtime cloud: backend8080 schema pump_fence_smoke, Vite3000, isolated Postgres
smartfarm-cloud-test55439. Fencing profiletrue, control/MQTT/valve-demofalse;
pump_status native0, không làm mới timestamp sau seed. Pump_command,
watering_run, irrigation_queue_request, irrigation_demo_command đều0. Do chưa
có telemetry live, trạng thái relay tự cũ thành UNKNOWN là đúng. Không reseed.
Old irrigation_queue_smoke chỉ nâng V22, dữ liệu4lượt giữ nguyên; demo DB5433
không reset. Readiness script tools/frontend/smoke_pump_fence.py chỉ GET,
đã chạy trước và sau restart backend thật, không AWS/GPIO.

Log /tmp: pump-fence-backend-final.log, pump-fence-browser2.log,
pump-fence-contracts.log, pump-fence-queue-regression.log,
pump-fence-pio-default.log, pump-fence-pio-enabled-final.log,
pump-fence-fs.log, pump-fence-merge.log, pump-fence-fixture.log,
pump-fence-upgrade.log, pump-fence-runtime-restart.log, pump-fence-lint-final.log,
pump-fence-build.log. Ảnh /tmp/pump-fence-full-app.png. Các artifact /tmp chưa
push; helper merge báo generic có key nhưng build này chỉ data.gitkeep.

Đã ghi các lỗi/cách sửa vào sách: MemberProxy non-copyable, generator rỗng do
không fail-fast, ACK fixture sai causal sequence, checked Exception Mockito,
selector cũ và test zero-ordinal ON cần đúng kỳ vọng reject. Không nớiassert,
skip hoặc xóa schema để chạy qua.

Còn trước coordinator thật: HTTP idempotency/expected boot/intent fence; lease
và loại trừ manual/rule cũ; nhiều valve/zone binding, sequencing/feedback,
interlock nước/flow, publish uncertainty/recovery và nghiệm thu fault thật.
