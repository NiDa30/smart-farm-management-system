# Bàn giao V43 — Chuyển hàng chờ sang phiên có xác nhận

Ngày17/10/2026, giờ Việt Nam. Nhánh feat/day1-iot-foundation.

## Đã triển khai

Điều khiển Actuator → Mở hàng chờ tưới diễn tập → **Chuẩn bị phiên từ lượt
đầu hàng**. GET review không tạo gì. POST xác nhận tạo đúng một PREPARED,
liên kết UUID với queue và chuyển lượt thành HANDED_OFF. Chưa có OPEN/ON hoặc
bất kỳ command nào. Sau đó mở đúng phiên và tự xác nhận từng bước.

Flag SMARTFARM_IRRIGATION_QUEUE_HANDOFF_ENABLED defaultfalse, không seed.
Chỉ FIFO head, chưa hết TTL5phút, full snapshot vùng/nhánh còn đúng, đúng
boot và profile/session/proof mới được chuyển. Duration1–10s phải giữ nguyên
và vượt FLOW grace nếu có; preview11–30s bị từ chối, không clamping.
LOW/mưa hiện có vẫn kiểm tra, các chốt ON/supervisor giữ nguyên.

Queue/session/link/manual hold cùngtransaction, khóa pump→queue→circuit→zone.
Sai definition hoặc dùng lại sessionID ngoài queue bị chặn. Exact duplicate
trả cùng liên kết/trạng thái phiên hiện tại, kể cả sau restart. Rollback,
cancel race, session/profile khác và idempotence đã kiểm tra. Không auto
OPEN/ON/CLOSE/FINISH/next, không tự đổi route. HANDED_OFF chỉ là kết thúc
lượt kế hoạch, chưa chứng minh đã tưới. Queue cancel sau handoff không OFF;
web hướng mở phiên để xử lý, không báo hủy thành công phiên đó.

Client giữ pending body/sessionUUID qua reload bằng sessionStorage, exact
readback gồm queueRevision và microsecond reviewedAt; không POST lại hoặc
tạo UUID thay thế. Readiness cũ/lỗi API/saiID/TTL không giữ quyền chuẩn bị.
Poll trước mutation bị generation guard bỏ qua. Nếu storage lỗi, giữ mã
trong memory và báo hạn chế qua reload, server unique link vẫn ngăn tạo trùng.

## File chính

- Backend: IrrigationQueueHandoff, IrrigationQueueHandoffController,
  IrrigationQueue và V43__queue_session_handoff.sql.
- Frontend: QueueHandoffPanel, queueHandoffApi, queueApi,
  IrrigationQueuePanel; back label riêng trong IrrigationSessionPanel.
- Fixture: tools/fixtures/QueueHandoffSmokeFixture.java và
  tools/frontend/smoke_queue_handoff.py.
- [Chương57](../book/CHAPTER_57_QUEUE_SESSION_HANDOFF.md), runbook, journal,
  troubleshooting, acceptance và roadmap đã cập nhật.

## Kiểm tra thực thi

| Kiểm tra | Kết quả |
| --- | --- |
| Backend Maven verify, PostgreSQL schema telemetry_test | 663đạt,20mới;0fail/error/skip |
| Targeted queue/handoff trước full verify | 37đạt; nằm trong663, không cộng thêm |
| Queue browser API fixtures | 25đạt,9mới;0fail/skip |
| Circuit/session/history browser regression | 98đạt; tổng123browser riêng biệt |
| Session browser sau đổi back label | 8đạt; recheck, không cộng vào123 |
| Queue/session/handoff unit parser | 17đạt,7mới;0fail/skip |
| TypeScript lint và Vite build | Đạt; cảnh báo __dirname/chunk lớn cũ |
| Native initial observations → queue → PREPARED → PostgreSQL | Một link/session, next QUEUED;0command/action/run |
| Upgrade Flyway-only V42→V43 trên flow_stop_verified_smoke | 23bảng chọn không đổi, link mới rỗng; migrate lần2 no-op |
| Full app thật GET-only, trước/sau restart | Queue→handoff→recovery session→back;0write/external/JSerror |
| Snapshot24bảng trước/sau restart | 23không đổi; session RECOVERY chỉ revision+1, không command/link/action mới |

Không chạy đồng thời hai bộ backend trên telemetry_test. Lượt compile
ban đầu thiếu throws trong test helper đã sửa; lỗi GET dùng FOR SHARE trong
transaction read-only đã tách sang query đọc thường. Các lượt lỗi không được
tính pass. Smoke locator trùng active/recent ban đầu đã được chọn đúng phần tử
rồi chạy lại đạt. Không tắt assertion hoặc skip để đạt.

## Runtime và bằng chứng

Docker test loopback55439, schema test telemetry_test; volume demo5433 giữ
nguyên. Fixture mới queue_handoff_smoke chứa2queue request (1HANDED_OFF,
1QUEUED),1handoff,1unfinished session;0pump/circuit command/session action/
watering_run. Khởi tạo một lần; không reseed hoặc refresh timestamp để giả
live. Native pump/valve/WaterPacket ban đầu qua receiver thật, fake transports
chỉ báo connectivity; nếu publish sẽ throw AssertionError. Không có broker
hoặc GPIO thật, không tính thành một lượt firmware/Wokwi mới.

Runtime UI dùng schema đó, tất cả MQTT/control/fence/route/circuit/session/
legacy/monitor/rain-stop/water-stop/flow-stop/queue-handoff=false. Queue
maintenance tắt riêng để giữ nguyên lịch sử/TTL, không làm mới dữ liệu cũ.
Startup chuyển session sang RECOVERY_REQUIRED, giữ link/request cũ. Sau
restart24bảng chọn:23giống hệt, session chỉ tăng revision để vô hiệu review cũ.

Logs /tmp: queue-handoff-backend-full.log, queue-handoff-targeted.log,
queue-handoff-browser-final.log, queue-handoff-circuits.log,
queue-handoff-session-browser-final.log, queue-handoff-units.log,
queue-handoff-lint-final.log, queue-handoff-build-final.log,
queue-handoff-fixture.log, queue-handoff-v42-upgrade.log,
queue-handoff-full-app.log, queue-handoff-full-app-after-restart.log.
Evidence: queue-handoff-evidence.json, queue-handoff-v42-before.json,
queue-handoff-v43-after.json, queue-handoff-before-restart.json,
queue-handoff-after-restart.json; ảnh queue-handoff-full-app.png. Đây là
artifact runtime cloud, chưa xác nhận restoration sang task mới.

## Windows / nghiệm thu tiếp theo

Giữ DB/volume/private files. Pull nhánh, dừng backend cũ, trong Git Bash
backend profile LED route/session đang dùng, legacy demo=false, thêm:

```bash
export SMARTFARM_IRRIGATION_QUEUE_HANDOFF_ENABLED=true
bash tools/backend/run_backend_windows.sh
```

Cần các flag control/fence/route/circuit/session đã bật đúng; lệnh trên chỉ
thêm handoff. Khép phiên cũ và xác nhận bơm OFF/van CLOSED mới. Lập lượt có
nhánh/thời hạn1–10s, chọn đúnghead, đọc điều kiện rồi chuẩn bị. Mở phiên,
không coi PREPARED là bơm đang chạy; từng bước vẫn cần xác nhận mới.

Sáu ca AWS/Wokwi ở chương57 **Chưa chạy**. Chưa auto dispatch/coordinator
multi-route/route switching hoặc physical acceptance, không hoàn tấtA3.
Không đọc .local/.aws/config.local.h/key, không thay IAM/cert/firmware,
không gửi lệnh AWS/MQTT thật. Không merge main hoặc thay dữ liệu demo.

Kiểm tra614liên kết Markdown tương đối không thiếu đích; git diff --check đạt.
Đã lưu hướng dẫn runtime V43 vào start_skill của environment draft, giữ các
cấu hình khác. Review/Save rồi Publish trong Environment settings để áp dụng;
runtime hiện tại đã kiểm tra, restoration task mới chưa xác nhận.
