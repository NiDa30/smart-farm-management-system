# Bàn giao V45 — Lịch theo vùng tạo lượt chờ

Ngày 22/10/2026, nhánh feat/day1-iot-foundation.
[Chương 60](../book/CHAPTER_60_ZONE_QUEUE_SCHEDULE.md).

## Phạm vi đã triển khai

Từ Sensor Realtime → Node & trạm nước → Vùng tưới → Lịch tưới từng vùng.
Chọn tối đa 8 dòng giờ/tuần theo Asia/Ho_Chi_Minh, thời lượng yêu cầu 1–10s,
bật/tắt và lưu theo revision. Đến giờ chỉ tạo một queue request dùng hàng
chờ hiện có, không session/handoff, OPEN/ON/OFF/CLOSE hoặc đổi route.
Cần người dùng duyệt lượt đầu sang phiên; chốt cảm biến/van/nước/mưa/flow
của phiên giữ nguyên. Scheduler không yêu cầu đất khô để lập lượt.

Backend flag SMARTFARM_IRRIGATION_QUEUE_SCHEDULE_ENABLED defaultfalse. Mỗi
start reset cursor hiện tại rồi mới ready; lỡ vòng >30s skip cả khoảng,
không tạo bù. Đồng hồ lùi không lùi cursor. Không lưu occurrence cho từng
mốc trong downtime; state STARTUP_SKIPPED/GAP_SKIPPED mô tả việc bỏ qua.
Save sau mốc đến giờ không backfill. Snapshot binding vùng/nhánh phải khớp
đầy đủ; thay đổi ghi CONFIG_CHANGED. Vùng đang chờ/diễn tập hoặc capacity50
thì ghi skip, không retry slot đó. TTL5phút/FIFO giữ như queue cũ.

Locks queue→circuit→schedule state; occurrence(unique zone/due), queue UUID,
snapshots và cursor cùngtransaction. Lỗi sau queue insert rollback cả lượt,
occurrence và cursor. Nhiều evaluator chỉ commit một lượt. Tắt lịch ngăn
lượt mới, không hủy request cũ hoặc tắt bơm; thao tác tương ứng ở hàng chờ/
phiên riêng. Lịch cũ và occurrence giữ definition/revision tại lúc đánh giá.

API GET/PUT /api/v1/irrigation-zones/{zone}/queue-schedule. GET chỉ đọc;
PUT revision0 cho create, profile/mapping SIMULATOR hiện tại để enable,
review timestamp mới. Disable vẫn được phép khi mapping đổi. Có status
worker config/cursor, next planned time và 20 occurrence gần nhất, chưa
lịch sử toàn bộ edits hoặc retention. nextDue không là hứa dispatch và
lastTick không là heartbeat bảo đảm worker còn sống.

UI đọc mới trước PUT để lấy reviewedAt, không tự đổi revision/mapping của
form. Lost/invalid response giữ exactbody vào sessionStorage; reload chỉ
GET đối chiếu revision+1/normalized definition/microsecond time. Unknown
không tự gửi lại hoặc unlock Save chỉ vì GET còn bản cũ. Bỏ pending là bỏ
ý định browser, không rollback server. API lỗi/sai zone không cho lưu bằng
snapshot cũ; storage lỗi cảnh báo giới hạn qua reload.

## File chính

ZoneQueueSchedule/Controller/Worker, migrationV45 và application flag;
IrrigationQueue chỉ mở package-visible helper zoneConfig, không đổi enqueue
contract. queueScheduleApi/ZoneQueueSchedulePanel và nút trong ZonesPanel.
Tests ZoneQueueScheduleTest và fixtures trong nodes.browser.spec.ts.
Standalone tools/fixtures/ZoneQueueScheduleSmokeFixture.java dùng scheduler
thật; tools/frontend/smoke_zone_queue_schedule.py chỉ GET, không thực thi.
Không sửa firmware/IAM/certificate/topic hoặc private config.

## Kiểm thử đã hoàn tất

| Kiểm tra | Kết quả |
| --- | --- |
| Final Maven verify / PostgreSQL telemetry_test | 731 đạt, 26 mới;0fail/error/skip |
| Targeted queue/schedule trước thêm scheduler registration case | 42 đạt; thuộc final, không cộng thêm |
| Node/zone browser API fixtures | 59 đạt,8 mới |
| Queue browser regression | 25 đạt; tổng84 browser riêng biệt |
| Schedule/zone parser | 12 đạt,8 schedule mới |
| TypeScript lint / Vite build | Đạt; __dirname/chunk warning cũ |
| Scheduler thật theo wall clock + isolated PostgreSQL | Đúng1occurrence/link/QUEUED item,0command/session/run |
| V44→V45 Flyway-only trên schema water report cũ | 52data tables giữ nguyên; thêm3bảng, không plan/event; migrate lần2 no-op |
| Full-app GET-only zone→schedule→linked queue | Đạt;0APIwrite/external/pageerror |
| GET và restart app | Đối chiếu riêng như phần bằng chứng bên dưới |

Backend tests bao phủ default/disabled, startup-ready, real scheduler đăng
ký riêng, next weekly/midnight/Vietnam time, exact30s/gap/backward, missed
startup/save-after-due, same slot idempotence/race2evaluators, atomic rollback,
config snapshot drift/revision/source/physical, full/waiting queue, disable
không cancel, revision/review/duplicate slots/invalid bounds, HTTP/read-only.

Rà soát phát hiện worker cần @EnableScheduling riêng khi MQTT và queue
maintenance cùng tắt; đã thêm và kiểm chứng thực thi thật. Ca registration
ban đầu kiểm tra trực tiếp ScheduledMethodRunnable sai với Spring6.2 vì
Task bọc OutcomeTrackingRunnable. Sửa assertion kiểm tra đúng task identity,
không bỏ test; actual wall-clock fixture kiểm chứng worker thật sự chạy.
Final731 đã chạy sau sửa này; lượt730 trước và lượt731 thất bại không được
cộng hoặc dùng làm bằng chứng pass.

## Fixture, runtime và giới hạn

Dùng Docker smartfarm-cloud-test loopback55439; demo5433/volume và schema cũ
giữ lại. Test suite chỉ telemetry_test, không chạy hai Maven suite đồng thời.
Schema zone_queue_schedule_smoke được tạo một lần: SCSOIL với3kênh, SCWATER
LOW/FLOW, SCZONE/SCC1/IRRIGATION82/VALVE82. Đăng ký bằng service thật; không
có telemetry hoặc transport. Flag lịch=true chỉ trong helper, worker100ms,
đợi phút thật kế tiếp, không dùng clock test để tạo pass. Due2026-10-22
14:22:00Z =21:22giờ Việt Nam; đúng một QUEUED request, occurrence và link.
Sau đó lưu tắt plan (v2), giữ request và evidence. Không rerun/reseed/freshen.
Không suy ra MQTT/GPIO/Wokwi hoặc phần cứng đã được nghiệm thu.

Runtime app8080/Vite3000 dùng schema này. Mọi MQTT/control/fence/route/
session/closure/handoff/stop/demo/monitor và queue-schedule=false; queue
maintenance=false để giữ fixture. Không tự expire lượt cũ; UI phải đối
chiếu TTL, không coi QUEUED lịch sử là còn thực thi được. Các schema cũ
được giữ; session_water_usage_smoke chỉ Flyway-only V44→V45, không spring
startup hoặc reseed. Retained helper /tmp/start-zone-schedule-backend.py
chỉ khởi động app, không được gọi seeder trong startup.

Artifacts /tmp/zone-schedule-evidence.json, -fixture.log, -backend-final.log,
-browser.log, -queue-browser.log, -units.log, -lint.log, -build.log,
-upgrade.log, -v44-before.json, -v45-after.json, -full-app.log,
-full-app-settled.log, -full-app-after-restart.log, -full-app.png. Cloud
artifact chưa xác nhận restoration task mới. Các mốc runtime không được
làm mới để cải thiện bằng chứng.

## Windows và việc còn lại

Restart backend bằng Git Bash profile cũ, thêm
`export SMARTFARM_IRRIGATION_QUEUE_SCHEDULE_ENABLED=true` trước
`bash tools/backend/run_backend_windows.sh`; frontend terminal riêng.
Không cần bật MQTT hoặc control để chỉ lập lượt. Flyway45 thêm bảng, không
seed lịch. Enable từng vùng qua UI; muốn dừng lượt mới lưu disable lịch.
Các request đã lập vẫn cần cancel riêng, phiên đang chạy vẫn cần OFF riêng.

Sáu ca Windows/AWS/Wokwi trong chương60 **Chưa chạy**. Chưa tưới theo lịch
hoàn toàn tự động, full-cycle coordinator/multi-route/queue dispatch, volume
stop hoặc physical actuator/flow acceptance. Không gửi lệnh AWS/MQTT thật,
không đọc secrets, không merge main.

Đối chiếu toàn bộ 56 bảng (gồm Flyway) trước/sau GET-only giống hệt; snapshot
sau startup đã ổn định được giữ riêng, không thay baseline ban đầu. Restart
thật giữ nguyên 55 bảng; watering_rule chỉ execution_epoch3→4 theo cơ chế
startup pause cũ, vẫn disabled/RESTART_PAUSED. Không tạo queue/occurrence/
command/session hoặc sửa lịch sử. Full-app sau restart vẫn đọc đúng link.
Các file -before-read.json/-after-read.json, -settled-before-read.json/
-settled-after-read.json và -after-restart.json giữ nguyên để kiểm tra lại.

672 liên kết Markdown tương đối không thiếu đích; git diff --check đạt.
Đã lưu hướng dẫn runtime/startup/readiness mới vào start_skill của
cloud-environment-onboarding:setup, giữ các trường cấu hình khác. Draft
saved/requires_publish=true; Review/Save rồi Publish trong Environment
settings để áp dụng snapshot. Chưa xác nhận restoration ở task mới.
