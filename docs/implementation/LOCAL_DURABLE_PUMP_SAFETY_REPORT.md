# Bàn giao V31 — nhật ký khóa PUMP01 qua reboot

15/10/2026, feat/day1-iot-foundation. [Chương43](../book/CHAPTER_43_DURABLE_PUMP_SAFETY.md).

Opt-in `FARM_PUMP_DURABLE_SAFETY_ENABLED`, mặc định0 và fallback0 cho config
cũ; compiler yêu cầu pump fencing1. NVS riêng sf-pump-safety/journal, record
32bit, commit/readback trước ON. Mọi boot khóa OFF, cả khi record cũ CLEAN;
không lưu/khôi phục lệnh hoặc timer. Không auto erase NVS hay disable guard.

RelaySafety thêm remainingMillis để thời gian ghi flash không gia hạn timer
độc lập. Sau ghi kiểm tra lại lifetime/monotonic trước cấp điện. GPIO OFF
trước complete/lock/reset writes; flash ở loop, không trong callback/ISR hay
mutex. IO/readback thất bại giữ OFF/khóa; chỉ reset mới, đúng boot và đủ
guard mới thử ghi CLEAN. Lỗi cũ qua reboot quy về RESTART_LOCKOUT, không giữ
chính xác nguyên nhân ban đầu trong NVS. Nhật ký không thay khóa fence RAM.

Status thêm durableSafety, backend V31 JSONB nullable, nhận shape/fence và
tương quan output/lock/reason. Same boot không drop cap hoặc xóa lock qua
READY/OFF thường; reset report hợp lệ mới bỏ lock. Boot mới thiếu capability
được coi unknown. ACK giữ nguyên. API Safety/React đọc mới/cũ/thiếu riêng;
Control và Event Log dịch hai reason mới. JSON Schema đồng bộ cả metadata
van V30 trước đó còn thiếu, cùng12 test contract.

## Kiểm tra đã chạy

| Phạm vi | Kết quả |
| --- | --- |
| Backend toàn bộ, PostgreSQL test riêng | 398 đạt,0 fail/error/skip;14 test mới |
| Safety / Event Log / Pump browser fixtures | 22 /13 /15 đạt |
| Frontend safety parser unit | 12 đạt |
| Python contract, Python venv dự án | 12 đạt |
| Native journal C++17 strict | 17 nhóm,19 biến thể đạt |
| RelaySafety / FlowInterlock / ValveProofInterlock | Đạt; valve13 ca |
| Public firmware default / NVS+fence / tất cả guard | Đạt |
| NVS thiếu fence | Từ chối đúng static_assert; build khôi phục đạt |
| EmptyFS, public merged flash4MiB | Đạt; chỉ .gitkeep, không PEM/config local |
| Lint / production build | Đạt; cảnh báo Vite __dirname/chunk đã có |
| Native memory report→receiver/PostgreSQL→full React/menu/Event Log | Boot mới + fault mới đạt, GET-only |
| Restart JVM, stored fault/clocks/history | Giữ nguyên, hiển thị cũ, không refresh fixture |
| Nâng V30→31 trên schema pump_valve_proof_smoke |37 bảng giữ dữ liệu, trừ execution_epoch tăng1 theo startup cũ; NVS null |

Firmware all-guards: RAM49,188/327,680; Flash842,381/1,310,720 byte.
`tools/tests/pump_safety_journal_packets.cpp` tạo static resource, đối chiếu
với decoder/schema; model dùng memory store, không phải flash thật.
Fixture one-shot `PumpDurableSafetySmokeFixture` có guard DB loopback riêng,
MQTT/control/demo false, không transport. Không đọc secrets hoặc gọi AWS.

## Runtime giữ lại trong cloud

Backend8080 schema pump_durable_safety_smoke, Vite3000, Docker test loopback
55439; không chạm DB demo5433. Hai frame boot85000000-0000-4000-8000-000000000001,
seq0/1, đều OFF/khóa. Packet sau STORAGE_FAULT, source/receipt lưu một lần.
Chỉ GET-only stored smoke được chạy lại; không re-seed để làm fresh. Các
command/run/queue của fixture0. Runtime và evidence chỉ là dữ liệu local.

Các log `/tmp/durable-safety-*`, script startup
`/tmp/run-pump-durable-safety-backend.sh`, PID
`/tmp/pump-durable-safety-backend.pid`, evidence
`/tmp/pump-durable-safety-fault-evidence.json`. Kiểm tra PID/cmdline/schema
trước khi dừng, không assume process sống qua publish hoặc phiên mới.

## Lỗi trong lượt và xử lý

- So sánh API V30 tuyệt đối fail vì relay có thêm durableSafety:null. Chỉ
  chuẩn hóa trường mới null; không bỏ clocks/proof/history hoặc sửa evidence.
- So sánh tất cả row fail ở execution_epoch của rule. Đối chiếu startup code
  xác nhận tăng1 đúng thiết kế, kiểm tra chính xác ngoại lệ này; không bỏ bảng.
- Python hệ thống thiếu format checker RFC3339, test timestamp không reject.
  Dùng Python venv đã có rfc3339-validator từ requirements;12 ca cuối đạt.
  Không sửa test để chấp nhận timestamp sai hoặc bỏ kiểm tra format.

## Chưa nghiệm thu

Sáu ca Windows/AWS/Wokwi/ESP32 ở chương43 đều Chưa chạy. Chưa chứng minh
Preferences/NVS retention, torn-write/brownout, GPIO timing hoặc hardware
electrical protection. Boot luôn khóa ngay cả simulator nạp lại flash, nên
chỉ nhìn LED OFF sau reset không đủ kết luận đã lưu NVS. Tính năng không
resume ON, không coordinator/dispatch nhiều van và không hoàn tất A3.

Người dùng pull, restart backend/frontend, opt-in hai macro đúng một lần,
bật backend fence tương ứng rồi build app/FS/merge ở máy Windows theo sách.
Không copy public cloud flash thiếu endpoint/cert vào demo có khóa riêng.
