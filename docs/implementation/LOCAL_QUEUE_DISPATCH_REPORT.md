# Bàn giao — Tự nhận lượt mới theo một route, V47/V48

Ngày22/10/2026, nhánh feat/day1-iot-foundation.
[Chương62](../book/CHAPTER_62_FUTURE_QUEUE_DISPATCH.md).

## Phạm vi

Opt-in `SMARTFARM_IRRIGATION_QUEUE_DISPATCH_ENABLED=false` mặc định, cần
handoff/cycle/session/control/fence/route/circuit profile. UI riêng trong
hàng chờ, explicit duyệt snapshot đầy đủ và boot hiện tại. Chỉ request có
ticket sau watermark lúc bật, đúng FIFO/current route/SIMULATOR/TTL5phút/
duration1–10s mới được handoff+arm. Lịch V45 có thể tạo request mới nhưng
không cấp quyền dispatch. Không tự xét nhu cầu tưới theo đất hoặc đổi route.

Khóa pump→queue→circuit→dispatch, gọi handoff/start/cycle arm hiện có và link
trong cùngtransaction, chưa IO. Rollback link lỗi không để lại nửa phiên.
Unique request/session/arm; cycle worker chỉ IO sau commit, giữ guard cũ.
Chờ cycle COMPLETE/CLOSED_CONFIRMED/DURATION_REACHED và readiness mới, kể
cả close fence2s, mới nhận tiếp. Không nới guard để chạy nhanh hơn.

Defaultfalse; restart tắt quyền, không catchup/resume. Snapshot/boot đổi,
manual command/session takeover, gap>30s/clockback hoặc cycle ngắt/dừng sớm
ngừng quyền. NEW QUEUED tạm chưa đủ proof/admission vẫn có thể được xét
lại trong TTL; FIFO đầu cũ/khác route/hết hạn chặn, không skip tự động.
Queue maintenance hiện có có thể expire/invalidate theo chính sách cũ.

Ngừng nhận không OFF/pause cycle/cancel queue. POST stop riêng tăng revision
kể cả đã disabled, chặn enable cũ tới muộn; stopId gần nhất đối chiếu không
ngắt quyền mới. UI generation chặn late enable response, pending qua reload,
exact GET body/revision/microsecond; explicit discard chỉ khi disabled ở
revision mới hơn pending. OFF vẫn nằm ở cycle riêng. Không đọc secrets,
gửi AWS/MQTT thật, sửa firmware/IAM/topic hoặc merge main.

## File chính

IrrigationQueueDispatch/Controller/Worker; V47 state/link, V48 last_stop_id;
application flag, package-visible IrrigationCycle.available. Không đổi
handoff/queue/session dispatch contracts. QueueDispatchPanel/queueDispatchApi,
navigation và mô tả phân biệt rehearsal/dispatch trong QueuePanel/Handoff.
CyclePanel có backLabel tùy chọn để quay đúng màn hình gọi.
IrrigationQueueDispatchTest, queue parser/browser tests; native smoke
IrrigationQueueDispatchSmokeFixture.java và smoke_queue_dispatch.py.

## Kết quả kiểm thử

| Kiểm tra | Kết quả |
| --- | --- |
| Final Maven verify/PostgreSQL telemetry_test | 795 đạt;30 mới;0fail/error/skip |
| Targeted dispatch/handoff/cycle trước ca profile cuối | 83 đạt; thuộc final, không cộng thêm |
| Queue browser API fixtures | 34 đạt;9 mới |
| Circuit/session browser regression | 120 đạt; tổng154 browser riêng biệt |
| Dispatch/queue/handoff parser | 18 đạt;6 mới;0skip |
| TypeScript lint / Vite build | Đạt; chunk-size warning còn tồn tại |
| Real queue+cycle schedulers/native retained models/real receivers/DB | Một link, COMPLETE;4commands/5actions; foreign next head blocked |
| V46→V48 Flyway-only trên schema cycle cũ | 56data tables nguyên vẹn;2bảng mới; lần2 no-op |
| Full app GET-only / restart | Đối chiếu bên dưới |

30 test mới: flags/default/read-only/explicit review/revision/clock/boot/
physical rejection, future watermark/FIFO/head route/TTL/duration/config,
atomic rollback/race, active/failed/early-stop/complete next cycle, manual
takeover, disable vs active cycle, startup/gap/backclock, stop superseding
pending enable và duplicate latest stop identity. HTTP GET/PUT/POST giữ đúng
phạm vi. Các gate nước/mưa/flow và cycle proof có hồi quy trong full suite.

Trong triển khai test có lỗi compile thiếu throws Exception, đã sửa fixture.
Ca TTL ban đầu sửa expires trước enqueued vi phạm CHECK; chỉnh cả enqueued
cho đúng hình dạng lượt cũ. Ca nhận tiếp ban đầu gặp SESSION_VALVES_NOT_READY
do close fence2s đúng thiết kế; test xác nhận bị chặn rồi dịch chốt trong DB
test để kiểm tra bước sau, không bỏ guard production hoặc sleep để che lỗi.
Rà soát bổ sung kiểm tra route-required ngay khi duyệt quyền, tránh hiển
thị đủ điều kiện dù cycle sau đó sẽ bị chặn. Test thiếu profile tái hiện
và final795 đạt sau chỉnh sửa; native run route=true trước chỉnh sửa này
được giữ, không chạy lại hoặc thay bằng chứng.
Browser helper ban đầu gọi nhầm tên fixture mapping; sửa fixture, final34
đã chạy sau đó. Các lượt lỗi không được tính vào số đạt.

## Native scheduler và runtime

Docker smartfarm-cloud-test loopback55439; suite chỉ telemetry_test, không
chạy hai Maven suite đồng thời. Demo5433/volume và mọi schema cũ giữ lại.
Fixture mới queue_dispatch_smoke tạo một lần qua service thật: PWATER,
PSOIL1/2,PZONE1/2,PC1/2,IRRIGATION18/19,VALVE18/19. Hai worker100ms chạy
wall clock, fake transport; dùng binary native model đã kiểm tra ở V46,
không sửa C++ hoặc build firmware mới. ACK/status từ model đi qua receivers
thật, không chèn kết quả command để fixture pass.

Enable trước khi enqueue: lượt PC1 mới chạy5s tới COMPLETE, đúng2pump/
2valve commands và5actions. PC2 đứng đầu tiếp theo giữ QUEUED với lý do
HEAD_ROUTE_MISMATCH; không có link/lệnh thứ hai. Sau đó fixture ngừng nhận
bằng stop riêng, giữ queue/link/cycle và evidence. Không rerun/reseed/replay
hoặc freshen. Feedback model là input giả, không GPIO, network outage,
flash/NVS hoặc firmware periodic-loop/hardware acceptance.

Flyway-only irrigation_cycle_smoke V46→V48, giữ56data tables; chỉ Flyway
history đổi, thêm state disabled/link rỗng; migrate lần2 no-op. Preview8080/
Vite3000 dùng queue_dispatch_smoke, mọi MQTT/control/fence/route/session/
closure/cycle/handoff/stop/demo/monitor/schedule/dispatch flags=false, queue
maintenance=false. Retained queued item không được coi là còn TTL sau này.
/tmp/start-queue-dispatch-backend.py chỉ startup, không seeder.

Full-app đi từ hàng chờ → quyền disabled → linked COMPLETE → quay lại hai
màn đạt,0APIwrite/external/pageerror. GET-only giữ59/59tables. Restart thật
giữ58/59tables; watering_rule chỉ execution_epoch+1, vẫn disabled/
RESTART_PAUSED. Policy/link/queue/cycle/session/commands/actions/history
không đổi và UI đọc đúng liên kết, không tạo lượt/lệnh mới.
JAR cuối sau bổ sung chốt profile cũng được khởi động và kiểm tra GET/full
app lại:58bảng giữ nguyên so với restart trước, rule chỉ epoch7→8/disabled.
Giữ thêm -latest-startup.json và -full-app-latest.log, không ghi đè baseline.

Artifacts /tmp/queue-dispatch-evidence.json, -fixture.log, -backend-final2.log,
-targeted-final.log, -browser-final2.log, -circuits-browser.log, -units.log,
-lint-latest.log, -build-latest.log, -upgrade.log, -v46-before.json,
-v48-after.json, -before-read.json, -after-read.json, -after-restart.json,
-full-app.log, -full-app-after-restart.log, -full-app.png và bốn public
/tmp/queue-dispatch-{pump,valve}-{action}.json. Artifacts chưa xác nhận
restoration trong task mới; không lấy các output cũ làm bằng chứng live.

## Windows và phạm vi còn lại

Git Bash backend thêm ba flag HANDOFF/CYCLE/QUEUE_DISPATCH như chương62,
giữ profile LED theo nhánh; restart áp V47/V48. UI bật quyền trước giờ lịch
hoặc trước khi tạo lượt mới. Hủy/xử lý head cũ thủ công; không bật lại để
adopt hàng cũ. Ngừng nhận không OFF phiên đã tạo. Sáu ca Windows/AWS/Wokwi
**Chưa chạy**. Chưa multi-route firmware/coordinator, volume-stop, tự quyết
định nhu cầu theo đất hoặc physical actuator/flow safety acceptance.

698 liên kết Markdown tương đối đều có đích; git diff --check đạt. Đã lưu
start_skill bổ sung startup/readiness/schema mới, giữ các trường cấu hình
khác; draft status=saved/requires_publish=true. Review/Save rồi Publish
trong Environment settings mới áp dụng snapshot. Chưa xác nhận restoration
trong task mới; review không chặn phần triển khai đã kiểm tra tại đây.
