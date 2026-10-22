# Bàn giao V46 — Điều phối tự động một phiên mô phỏng

Ngày 22/10/2026, nhánh feat/day1-iot-foundation.
[Chương 61](../book/CHAPTER_61_SINGLE_IRRIGATION_CYCLE.md).

## Phạm vi

Một quyền duyệt rõ ràng cho phiên PREPARED: OPEN → chờ proof → ON có thời
hạn → OFF → chờ OFF ACK/status → CLOSE → chờ CLOSED ACK/status → FINISH.
Không đổi route, auto handoff, lấy lượt sau hoặc tự chạy theo lịch. Lịch
V45 vẫn chỉ tạo queue. Mặc định `SMARTFARM_IRRIGATION_CYCLE_ENABLED=false`.
SIMULATOR, duration1–10s, original config/boot, control/fence/route/session
profile và mọi gate hiện có giữ nguyên. Chưa đổi firmware/IAM/certificate.

V46 thêm một bảng, không seed quyền. Arm và năm UUID commit trước IO;
deadline30s, OPEN30s, waitOPEN10s, waitON5s, worker250ms. stopAt lưu trước
ON IO; không là thời gian bắt đầu vật lý. Một OFF khi tới cutoff/mấtproof/
ON uncertainty; quá deadline sau ON chỉ cho OFF, không CLOSE muộn. ON ACK
và status mới cần cho RUNNING; OFF EXECUTED/OFF đúng boot + covering status
mới cùng canClose trước CLOSE. FINISH+COMPLETE atomic, đòi CLOSE proof.
ON chưa xác nhận vẫn chặn idle/CLOSE, không nới điều kiện để hoàn tất.

Khóa dispatch→circuit chung, reserve action trước guarded command commit;
recheck identity/phase/binding/deadline/cutoff. *_RESERVED không replay.
Shared OFF claim/latch với LOW/FLOW/mưa và manual; nếu bên khác thắng thì
cycle ngắt, không auto CLOSE. Manual step mới pause cycle/closure, duplicate
action cũ không pause. Không cho arm closure khi cycle active và ngược lại.
Restart active cycle INTERRUPTED, session recovery; startup-ready chặn quyền
cũ trước recovery. Không auto OFF/resume/replay khi backend khởi động.

Pause chỉ ngừng bước sau, không OFF/thu hồi packet. Emergency OFF độc lập
trên UI dù ARM/PAUSE unknown. Pending body qua reload, GET đối chiếu exact
definition/revision/microsecond; không tự POST lại hoặc coi active là đã
pause. COMPLETE là khép an toàn, không phải bằng chứng tưới thành công.
Backend/network ngừng vẫn cần timer/interlock tại board.

## File chính

IrrigationCycle/Controller/Worker, migrationV46/application flag;
IrrigationSession actor/guard/startup/manual interception và SessionClosure
mutual exclusion. IrrigationCyclePanel/irrigationCycleApi cùng navigation
trong IrrigationSessionPanel. Tests IrrigationCycleTest, parser và tám
browser fixtures trong irrigation-session.browser.spec.ts. Native retained
model tools/tests/irrigation_cycle_model.cpp; actual scheduler/DB fixture
tools/fixtures/IrrigationCycleSmokeFixture.java và GET-only full-app smoke
tools/frontend/smoke_irrigation_cycle.py.

## Kiểm thử đã hoàn tất

| Kiểm tra | Kết quả |
| --- | --- |
| Final Maven verify / PostgreSQL telemetry_test | 765 đạt;34 mới;0fail/error/skip |
| Targeted session/closure/cycle trước hai race test cuối | 77 đạt; nằm trong final, không cộng thêm |
| Circuit/session browser API fixtures | 120 đạt;8 mới |
| Queue browser regression | 25 đạt; tổng145 browser riêng biệt |
| Cycle/session/closure parser | 16 đạt;6 mới;0skip |
| TypeScript lint / Vite build | Đạt; chunk-size warning còn tồn tại |
| Native C++ helper -Wall -Wextra -Werror | Đạt |
| Scheduler thật → native models → real receivers → DB | COMPLETE;4commands/5actions/0queue |
| V45→V46 Flyway-only trên schema lịch cũ | 55data tables nguyên vẹn; bảng cycle rỗng; lần2 no-op |
| Full app GET-only / restart | Đạt; chi tiết bên dưới |

34 test backend bao phủ review/default/PREPARED/scope/HTTP/read-only,
one-shot duplicate, OPEN/ON/OFF/CLOSED ACK/status, wrongboot/otherbranch,
deadline/proof timeout/binding/proofloss/unknown IO, pause/manual/external
OFF/duplicate cũ, startup/pre-ready, competing evaluators, guarded lateOPEN/
lateON, shared supervisor OFF race và closure exclusion. Test đầu có lỗi
compile lambda biến bị gán lại, sửa fixture. Hai ca CLOSE uncertainty/ACK
đơn lẻ lúc đầu thiếu ON ACK nên idle guard chặn đúng; sửa setup test để
cấp proof ON, không sửa guard sản phẩm. Final765 chạy sau tất cả chỉnh sửa.

## Bằng chứng runtime

Docker smartfarm-cloud-test loopback55439, dedicated telemetry_test cho
suite, không chạy hai Maven suite đồng thời. Demo5433/volume và schema cũ
được giữ. Flyway-only trên zone_queue_schedule_smoke giữ nguyên55data tables,
chỉ thêm bảng irrigation_session_cycle rỗng và history migration; lần2 no-op.

Schema irrigation_cycle_smoke mới, fixture tạo một lần qua services thật:
PWATER,PSOIL1/2,PZONE1/2,PC1/2,IRRIGATION18/19,VALVE18/19. MQTT=false, không
có realtransport bean; fake connectivity và ba process native giữ state.
Command JSON đi qua decoders/fence/RelaySafety/ValveMonitor production;
ACK/status vào receivers thật. Scheduler100ms chạy theo thời gian thật,
phiên5s kết thúc COMPLETE/CLOSED_CONFIRMED, stopReason DURATION_REACHED.
Đúng ON/OFF và OPEN/CLOSE; năm actions gồm FINISH;0queue hoặc lượt tiếp.
Feedback trong helper theo state model, không là wiring/GPIO thật. Không
kiểm thử firmware periodic timer loop, flash/NVS hoặc mất mạng vật lý.

Giữ /tmp/irrigation-cycle-evidence.json, -fixture.log, -backend-final.log,
-browser.log, -queue-browser.log, -units.log, -lint.log, -build.log,
-upgrade.log, -v45-before.json, -v46-after.json, -before-read.json,
-after-read.json, -after-restart.json, -full-app.log,
-full-app-after-restart.log, -full-app.png và bốn /tmp/cycle-*.json public
payloads. Không rerun seeder, replay payload hoặc freshen evidence.

Preview runtime8080/Vite3000 dùng schema irrigation_cycle_smoke, mọi MQTT/
control/fence/route/session/closure/cycle/handoff/stop/demo/monitor/schedule
flags=false, queue maintenance=false. /tmp/start-irrigation-cycle-backend.py
chỉ startup, không seed. Full-app navigation tới COMPLETE, immutable IDs,
không rearm, quay về phiên đạt;0APIwrite/external/pageerror. GET-only giữ
nguyên57/57tables. Restart thật giữ56/57tables; watering_rule chỉ epoch6→7
theo startup pause cũ, vẫn disabled/RESTART_PAUSED. Cycle/session/commands/
actions/history không đổi, GET/UI vẫn COMPLETE; không phát sinh lệnh mới.
Artifacts hiện ở cloud, chưa xác nhận restoration trong task mới.

## Windows và việc còn lại

Giữ profile session/LED theo nhánh hiện có, thêm
`export SMARTFARM_IRRIGATION_CYCLE_ENABLED=true` trước
`bash tools/backend/run_backend_windows.sh`; frontend terminal riêng.
Arm từ phiên PREPARED, không tự tiếp tục phiên cũ. Không cần flag closure.
Nếu dừng/tạm ngừng cần OFF thì dùng nút riêng và chờ proof; đừng suy từ
HTTP hoặc countdown. Sáu ca live chương61 **Chưa chạy**. Chưa nghiệm thu
AWS/Wokwi/GPIO thật, coordinator nhiều route, auto queue dispatch hoặc
volume-stop/physical actuator/flow safety.

Không đọc secrets/private data, không gửi AWS/MQTT thật, không merge main.

685 liên kết Markdown tương đối không thiếu đích; git diff --check đạt.
Đã lưu start_skill qua cloud-environment-onboarding:setup, giữ nguyên các
trường khác; status=saved/requires_publish=true. Review/Save rồi Publish
trong Environment settings mới áp dụng snapshot. Chưa xác nhận restoration
ở task mới; việc review cấu hình không chặn phần triển khai đã kiểm thử.
