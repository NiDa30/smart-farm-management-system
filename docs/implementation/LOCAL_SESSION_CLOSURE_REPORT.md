# Bàn giao V44 — Tự khép phiên sau OFF

Ngày17/10/2026, giờ Việt Nam. Nhánh feat/day1-iot-foundation.

## Đã triển khai

Trong Phiên tưới có xác nhận, mở **Tự khép phiên sau OFF**. Bật riêng một
lần sau khi đã gửi OFF/WAIT_OFF, freeze OFF ID/revision/boot/binding. Cửa
sổ quyết định15s, worker danh định1s: chỉ sau OFF ACK đúng boot + status mới
phủ lệnh mới giữ một CLOSE; sau CLOSE ACK + CLOSED status mới mới FINISH.
COMPLETE và FINISH commit cùngtransaction. Không OPEN/ON/OFF, không tự lấy
queue/đổi route hoặc resume. Flag SESSION_CLOSURE defaultfalse, không seed.

Closure/action identity commit trước IO. Callback trước command commit từ
chối quyền pause/hết hạn/bị thay thế; evaluator thứ hai không replay identity
đã giữ. Manual action mới pause, duplicate thao tác cũ không tự ngắt. Pause
không thu hồi CLOSE đã giữ/gửi. Thiếu proof/timeout/boot đổi/uncertain cần
recovery, không retryCLOSE. Startup ngắt active record; worker cũng bị chặn
trước khi xử lý recovery ApplicationReady hoàn tất. COMPLETE cũ là lịch sử,
không chứng minh trạng thái hiện tại hoặc van vật lý.

UI giữ pending Arm/Pause qua reload, exact GET readback gồm microsecond.
Pause chưa rõ và GET vẫn active không được báo đã ngừng. Poll cũ trước
mutation bị bỏ qua; deadline tại browser chỉ yêu cầu đọc kết quả server.
Có thể quay lại phiên để OFF/recovery thủ công, không kẹt trong màn hình
đối chiếu. SessionStorage lỗi được báo, mã vẫn giữ trong memory.

## File chính

SessionClosure, SessionClosureController/Worker, IrrigationSession,
CircuitValveControl guarded callback, migrationV44; SessionClosurePanel,
sessionClosureApi và nút active/recent trong IrrigationSessionPanel.
Fixture: tools/tests/session_closure_packet_fixture.cpp,
tools/fixtures/SessionClosureSmokeFixture.java,
tools/frontend/smoke_session_closure.py.
[Chương58](../book/CHAPTER_58_POST_OFF_SESSION_CLOSURE.md) và runbook/sách/
roadmap đã cập nhật. Không sửa firmware/IAM/topic/certificate.

## Kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Final Maven verify với PostgreSQL telemetry_test | 688đạt,25mới;0fail/error/skip |
| Targeted closure/session/circuit control trước final verify | 64đạt trước thêm startup test; không cộng thêm |
| Circuit/session/history browser API fixtures | 106đạt,8mới |
| Queue browser regression | 25đạt; tổng131browser riêng biệt |
| Closure/session/queue-handoff unit parser | 17đạt,5mới |
| TypeScript lint và Vite build | Đạt; __dirname/chunk warning cũ |
| Native helper g++ -std=c++17 -Wall -Wextra -Werror | Đạt; dùng decoder/model/packet public hiện có |
| Scheduler100ms + native OFF/CLOSE/ACK/status qua fake transports/receiver/DB | COMPLETE;1OFF,1CLOSE,1FINISH,0OPEN/ON/queue |
| Flyway-only V43→V44 trên queue_handoff_smoke | 24bảng chọn không đổi; closure mới rỗng; migrate lần2 no-op |
| Full app thật GET-only tới completed closure và quay lại | Đạt trước/sau restart;0write/external/JSerror |
| Restart completed fixture | 25bảng chọn giống hệt;0command/action/closure mới |

Backend tests gồm OFF ACK đơn lẻ/status cũ/sai ACK boot, CLOSED ACK chưa có
status, chưa OFF/profile tắt/stale body, one-shot duplicate, pause, manual
OFF/CLOSE, external OFF, expiry, reboot, hai evaluator, late CLOSE sau pause,
pause trong publish, missing transport, uncertainty, restart trước/sau CLOSE
và scheduler trước startup-ready. Không chạy hai backend suite chồng schema.
Sau khi bổ sung startup guard đã chạy lại toàn bộ688; lượt687 trước đó không
được cộng thêm. Native initial harness thất bại vì dùng cờ route-check của
ON cho OFF; sửa helper sang exemption OFF đúng hợp đồng, không đổi guard
production. Schema/artifact lỗi được giữ; không reseed/tẩy lỗi để tính pass.

## Runtime và bằng chứng giữ lại

Docker test loopback55439/schema telemetry_test, demo volume5433 giữ nguyên.
Fixture đạt session_closure_verified_smoke, chỉ khởi tạo một lần. Schema
session_closure_smoke của harness lỗi và /tmp/closure-pump-OFF.json giữ lại,
không dùng làm runtime hay bằng chứng pass. Không refresh timestamp history.

Native initial pump/valve status và decoder/model OFF/CLOSE tạo packet qua
receiver thật; fake transport không đi broker. Đã có1session CLOSED_CONFIRMED,
1closure COMPLETE,1pump OFF,1circuit CLOSE,3session actions OFF/CLOSE/FINISH;
0ON/OPEN/queue/watering_run. Scheduler100ms chỉ trong fixture, không xem là
firmware/AWS/Wokwi mới hoặc cam kết độ trễ.

Main app8080/Vite3000 giữ MQTT/control/fence/route/circuit/session/closure/
queue-handoff/rain-stop/water-stop/flow-stop/legacy/monitor=false; queue
maintenance tắt. Sau restart completed session và closure không thay đổi,
25bảng chọn đối chiếu nguyên vẹn. Restart unfinished arm được kiểm chứng
bằng backend tests, không tráo kết quả completed fixture thành live recovery.

Log /tmp: session-closure-backend-final.log, session-closure-targeted-final.log,
session-closure-browser.log, session-closure-queue-browser.log,
session-closure-units.log, session-closure-lint.log, session-closure-build.log,
session-closure-fixture-verified.log, session-closure-v43-upgrade.log,
session-closure-full-app.log, session-closure-full-app-after-restart.log.
JSON: session-closure-evidence.json, session-closure-v43-before.json,
session-closure-v44-after.json, session-closure-before-restart.json,
session-closure-after-restart.json; ảnh session-closure-full-app.png. Đây là
artifact cloud, chưa xác nhận restoration task mới.

## Windows / nghiệm thu còn lại

Giữ DB/volume/private files. Pull nhánh, dừng backend cũ, thêm trong Git Bash
backend profile LED route/session đang dùng, legacy demo=false:

```bash
export SMARTFARM_IRRIGATION_SESSION_CLOSURE_ENABLED=true
bash tools/backend/run_backend_windows.sh
```

Cần control/fence/route/circuit/session đúng profile. Không phải bật flag là
tự CLOSE; người dùng duyệt một lần sau OFF. Bật rồi đặt position feedback
độc lập phù hợp sau CLOSE, đợi ACK/status; không tự coi LED/HTTP là van cơ
khí. Hết15s/uncertain/restart hoặc manual intervention thì recovery; không
bật lại định nghĩa cũ. Pause không thu hồi lệnh đã giữ/gửi.

Sáu ca live ở chương58 **Chưa chạy**. Chưa coordinator toàn chu kỳ/
multi-route/auto queue hoặc physical acceptance. Không đọc secrets/config
private và không gửi lệnh AWS/MQTT/GPIO thật. Không merge main.

Kiểm tra627liên kết Markdown tương đối không thiếu đích; git diff --check đạt.
Đã lưu hướng dẫn runtime V44 vào start_skill của environment draft, giữ cấu
hình khác. Review/Save rồi Publish trong Environment settings để áp dụng;
chưa xác nhận restoration task mới.
