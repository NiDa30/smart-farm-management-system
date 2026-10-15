# Bàn giao quyền sử dụng bơm V24

15/10/2026, giờ Việt Nam. PUMP01 protected profile, tiếp HTTP V23.

Đã thêm claim bền vững trên command ON, source MANUAL/AUTOMATION/LEGACY,
owner-parent cho OFF tự động, release timestamp và execution_epoch của rule.
Claim + manual hold hoặc run tracking commit cùng giao dịch gate PostgreSQL,
trước transport. OFF thủ công ưu tiên; OFF tự động phải thuộc run còn giữ quyền.
Worker quyết định cũ bị chặn bằng epoch/settings/calendar/sample khi reserve.
Chỉ khép quyền sau status OFF mới bao phủ command; timer/ACK/timeout/restart
không tự nhả quyền. GET chỉ đọc khả năng khép, không ghi release timestamp.

UI **Điều khiển Actuator → Quyền sử dụng bơm** hiển thị nguồn và lý do chặn;
không coi claim/receipt là bằng chứng GPIO hoặc dòng nước. Khi control tắt,
các nút dispatch vẫn bị vô hiệu hóa. Protected profile mặc định chưa bật;
legacy không có ownership. Không đổi firmware/wire/IAM/cert/topic/client.
Pull rồi restart backend/frontend; V22 đã bật hai phía thì không flash lại
chỉ vì V24. Cần cập nhật toàn bộ binary backend dùng chung DB.

| Kiểm tra | Kết quả |
| --- | --- |
| Backend đầy đủ, PostgreSQL riêng | **286/286**, 24 mới, không skip |
| Browser pump, API fixtures | **15/15**, 4 mới |
| Parser unit | **5/5**, 1 mới |
| Lint/build | Đạt; cảnh báo Vite cũ |
| V23→24 | Giữ command uncertain, active reference/run, source LEGACY |
| Full-app thực tế + restart JVM | Claim giữ nguyên, intent revision tăng, GET-only UI |
| AWS/Wokwi/GPIO mới | Chưa chạy; sáu ca Windows còn chờ |

Test mới bao gồm hai instance tranh một owner, callback rollback, tracking
commit trước transport, rule thực tế có ON/OFF, owner ngoài20, ACK/status,
offline OFF, startup/timeout, uncertain/replay, old automatic OFF không dừng
manual owner mới, rule stale sau manual OFF+reenable, mẫu đổi ướt trước reserve.
LEGACY chỉ được gửi OFF tự động khi có cả watering_run và active reference;
không có provenance thì từ chối. Migration không tự đóng hoặc phân loại lại
ledger cũ. Các trường hợp này có regression test.

Lượt full đầu lỗi `too many clients already`: cached Spring contexts giữ các
Hikari pool mặc định10. Đã giới hạn riêng cấu hình test max4/min-idle1, giữ
test concurrency và mọi assertion. Lượt sau đạt284, sau rà soát tương thích
run cũ thêm2ca và lượt full cuối đạt286, không skip. Không reset schema hoặc
tăng pool production để vượt test.

Runtime cloud: backend8080 schema **pump_owner_smoke**, Vite3000, container
smartfarm-cloud-test loopback55439 DB/user smartfarm_test. MQTT/control/valve-demo
false, fencing metadata true. Có1native status cũ tự stale,1ON receipt từ
capture-only transport luôn ném lỗi cục bộ (không mở socket), source MANUAL,
claim chưa khép; state ban đầu PUBLISH_UNCERTAIN, GET commands hết hạn thành
TIMED_OUT. UUID fixture92000000-0000-4000-8000-000000000001. Run/queue/valvecommand0.
Không reseed hoặc refresh timestamp để làm dữ liệu trông ready. Harness kiểm
tra runtime không có CommandTransport trước khi tạo instance capture-only.

`tools/frontend/smoke_pump_ownership.py` kiểm tra app thật, claim qua navigation
actuator→queue→actuator, tất cả dispatch disabled và không có API write/external
traffic. Chạy trước/sau restart tiến trình thật, owner giữ nguyên, revision
tăng. Không dùng mock response để thay backend trong smoke này. DBdemo5433,
volumes và retained fixture schemas khác giữ nguyên; migration upgrade test
tạo/xóa duy nhất schema ngẫu nhiên trong DB test riêng.

File chính: PumpOwnership, PumpCommandFencing, WateringRule, migration V24,
PumpControl/pumpIntentApi, PumpOwnershipTest, pool config test, fixtures/smoke.
Log `/tmp/pump-ownership-backend-final-verified.log`, `pump-ownership-browser.log`,
`pump-ownership-unit-final.log`, `pump-ownership-lint-final.log`,
`pump-ownership-build.log`, `pump-ownership-fixture.log`,
`pump-ownership-runtime-restart.log`, `pump-ownership-smoke-before.log`,
`pump-ownership-smoke-after.log`; ảnh `pump-ownership-full-app.png`.
Artifact /tmp không push và không đảm bảo được restore ở môi trường mới.

Sách: [chương36](../book/CHAPTER_36_PUMP_OWNERSHIP.md), runbook/nhật ký/lỗi/nghiệm thu.
Queue vẫn PREVIEW_ONLY, rule vẫn ENV01, chưa gắn owner vào queue hoặc sequencing
van–bơm. Chưa lease hết hạn/HA scheduler/auth operator/NVS/hardware feedback.
Sáu ca Windows/Wokwi mới ghi Chưa chạy. Không gọi đây là coordinator A3 hoàn tất.
