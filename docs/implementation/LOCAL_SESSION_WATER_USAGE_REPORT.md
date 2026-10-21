# Bàn giao — Báo cáo nước theo phiên tưới

Ngày 21/10/2026, nhánh feat/day1-iot-foundation. Không có migration mới;
schema vẫn V44. [Chương 59](../book/CHAPTER_59_SESSION_WATER_USAGE.md).

## Hành vi đã triển khai

Lịch sử phiên → chọn phiên → Đọc lượng nước phiên, đọc lại và CSV. GET mới
`/api/v1/irrigation-session-history/{circuitId}/{sessionId}/water-usage`
đọc nhất quán REPEATABLE_READ, không dispatch/readiness/sửa trạng thái.

Freeze mapping từ config_snapshot của phiên, lấy server ON intent đến OFF
intent đầu tiên sau ON; không dùng OFF retry, FINISH hoặc duration để kéo
dài cửa sổ. Chỉ tính khi kết quả gọi RETURNED và ledger payload khớp, ACK
EXECUTED đúng ON/OFF/boot có sequence/receipt. OFF đầu thất bại hoặc khác
boot thì unavailable dù lần OFF sau thành công. Không có mẫu là unknown;
0 chỉ từ khoảng đo hợp lệ bằng 0. Nhóm hiệu chuẩn giữ riêng, tổng null nếu
khác nhóm. Có độ phủ, khoảng bị loại và giờ đọc; không ngoại suy hoặc cộng
bù. Báo cáo là FLOW tại trạm trong cửa sổ ý định, chưa phải số lít tới luống,
thời gian chạy thật hoặc số liệu đủ để dừng bơm theo thể tích.

Giữ nguyên giới hạn/thuật toán WaterVolume; read-only domain rejection không
đánh dấu rollback khi được report tổng hợp thành lý do unavailable. SQL/
hạ tầng hỏng vẫn lỗi, không bị che. UI đối chiếu scope tới microsecond,
không giữ số lít cũ khi API lỗi, đổi phiên hủy response cũ. Shared volume
parser cũng giữ precision microsecond và chịu được ô ngày đang trống.
CSV có nhãn STATION_FLOW_NOT_BED_ALLOCATION, IDs, nguồn, nhóm và asOf.

## File chính

SessionWaterUsage, IrrigationSessionHistoryController và package-private
history.command dùng lại đối chiếu payload. SessionWaterPanel/sessionWaterApi
được gắn vào IrrigationSessionHistoryPanel. WaterVolume chỉ đổi transaction
handling cho domain rejection, không đổi công thức. Fixture Java và full-app
Python có trong tools/fixtures và tools/frontend; không thay firmware/IAM/
certificate, không tạo endpoint điều khiển mới.

## Bằng chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Final Maven verify, PostgreSQL telemetry_test | 705 đạt; 17 mới, 0 fail/error/skip |
| Targeted usage/history/volume | 47 đạt; nằm trong 705, không cộng thêm |
| Circuit/session/history browser fixtures | 112 đạt, 6 mới |
| Shared volume browser regression | 16 đạt; tổng 128 browser riêng biệt |
| Usage/history/volume parser units | 26 đạt; 9 usage mới + 2 scope regression mới |
| TypeScript lint / Vite build | Đạt; __dirname/chunk warning cũ |
| Synthetic stored history → real service/DB/full app/CSV | 0,5 L, 5 s covered, 5 s uncovered; 0 transport/API write/external/JSerror |
| Hai lần đọc / restart JVM trên schema riêng | Đọc: 53 bảng giống hệt. Restart: 52 bảng giống hệt, watering_rule epoch +1 do startup pause cũ; 0 lệnh/history mới |

Backend mới gồm first OFF/failed OFF retry, frozen historical config, thiếu
ON/OFF, identity bị tái dùng, unresolved call, ACK chưa có/sai boot/thiếu
receipt, cửa sổ invalid/24h, no-sample vs measured zero, lỗi/nguồn/hiệu chuẩn,
kênh bị xóa, numeric limit, recovery history, HTTP scope và read-only.

Lượt targeted đầu phát hiện UnexpectedRollback khi bắt domain 404 từ
WaterVolume; sửa noRollbackFor cho read-only ResponseStatusException, thêm
ca 422 rồi targeted/final verify đạt. Lượt browser đầu có lỗi harness copy
state ở ca late response; sửa shared fixture state, final 112 đạt. Precision
change phát hiện blank-date render crash ở shared volume regression; sửa
validate date trước BigInt, thêm test và final 16 đạt. Không bỏ assertion,
không sửa số liệu để tính pass. Các lượt thất bại không được cộng vào số đạt.

## Runtime và artifacts

Dùng container smartfarm-cloud-test loopback55439; demo5433/container/volume
và mọi schema cũ giữ nguyên. New schema session_water_usage_smoke được seed
một lần bằng **lịch sử tổng hợp SQL**, không native firmware, broker, gateway
hoặc GPIO. Có một session CLOSED_CONFIRMED, hai session actions và hai pump
ledger ON/OFF tổng hợp, hai mẫu FLOW/reading; không có publish hoặc lệnh thật.
Không rerun/reseed/freshen fixture để cải thiện số liệu.

App8080/Vite3000 dùng schema này, mọi cờ MQTT/control/fence/route/session/
closure/handoff/stop/demo/monitor false, queue maintenance tắt. Không có active
session để startup recovery đổi revision. Helper /tmp/start-session-water-backend.py
chỉ khởi động app; seeder tools/fixtures/SessionWaterUsageSmokeFixture.java
phải được giữ riêng, không gọi trong startup. Logs/evidence là artifact cloud,
chưa xác nhận restoration ở task mới.

/tmp/session-water-evidence.json, -fixture.log, -backend-final.log,
-browser-final.log, -volume-browser-final.log, -units.log, -lint.log,
-build.log, -full-app.log, -full-app-after-restart.log; snapshot
session-water-before-read.json, -after-read.json, -after-restart.json;
screenshot session-water-full-app.png. Snapshot sau đọc giống hệt 53 bảng. Sau restart 52 bảng giống hệt; bảng
watering_rule chỉ tăng execution_epoch từ 3 lên 4 theo startup pause có sẵn,
vẫn disabled/RESTART_PAUSED. Không sửa fixture để xóa thay đổi này; session/
command/sample/Flyway V44 giữ nguyên.

## Windows và phần còn lại

Pull nhánh và restart backend bằng tools/backend/run_backend_windows.sh với
profile hiện có; chạy frontend terminal riêng. Không cần bật cờ mới hoặc
provision thiết bị cho API báo cáo. Vào lịch sử phiên để đọc lượng nước.
Năm ca AWS/Wokwi trong chương59 **Chưa chạy**. Tại trạm chung không được
cộng các phiên thành phân bổ nước từng vùng; chưa daily rollup, ngân sách
lít, volume stop, coordinator toàn chu kỳ/multi-route/auto queue hoặc physical
acceptance. Không đọc secrets và không gửi MQTT/AWS thật; không merge main.

Đã kiểm tra 659 liên kết Markdown tương đối, không thiếu đích; diff --check
đạt. Đã lưu bổ sung startup/readiness/runtime và cách giữ fixture vào
start_skill của cloud-environment-onboarding:setup; không đổi các trường
cấu hình khác. Draft đã saved, requires_publish=true: Review/Save rồi Publish
trong Environment settings nếu muốn áp dụng snapshot; chưa kiểm chứng
khởi phục ở task mới. Terminal/service đang chạy không thay thế publication.
