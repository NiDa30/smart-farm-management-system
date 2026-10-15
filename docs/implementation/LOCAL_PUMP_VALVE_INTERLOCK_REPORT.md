# Bàn giao V30 — liên động van tại board bơm

15/10/2026 (Asia/Ho_Chi_Minh), feat/day1-iot-foundation.

ENV01/PUMP01 thêm FARM_VALVE_PROOF_ENABLED opt-in, mặc định0 cả config mới
và private config cũ thiếu macro. Chỉ SIMULATOR, cần phao, GPIO32 CLOSED và
GPIO33 OPEN độc lập/activeLOW. Không nối phản hồi từ GPIO bơm hoặc MQTT/ACK
của IRRIGATION. Một đường công tắc mô phỏng, chưa mang valveId/circuitId.

OPEN không CLOSED ổn định100ms trước ON/reset. UNKNOWN/CLOSED/CONFLICT chặn
bật; đang chạy mất proof/conflict hoặc sampler gap>250ms thì cắt GPIO ở
timer25ms, giữ lỗi đầu tiên. Callback không gọi mạng/Serial/allocate; loop
settle lỗi vào RelaySafety/cache sau khi đầu ra đã bị cắt. Timer/OFF/network/
flow/phao giữ hành vi; stop guard khi dừng đầu ra, không dừng nhầm lúc đang
arm ON từ trạng thái forcedOff. Restoring contacts không tự resume, reset
không bật bơm; duplicate ON không gia hạn hoặc phục hồi sau fault.
Kiểm tra thêm watcher trước cấp điện: cutoff chen lúc arm ON không được để
tiếp điểm OPEN bật đầu ra mà không còn giám sát. Ca native13 kiểm tra chốt này.

V30 thêm nullable pump_status.valve_interlock. Status có metadata khai báo
version1/true/SIMULATOR/state/fault, ACK không đổi. Backend kiểm tra shape,
kiểu/source, ON phải OPEN không lỗi/khóa, fault phải OFF/khóa; cùng boot không
được drop capability, clear fault phải báo LOCKOUT_RESET/OPEN không khóa.
Boot mới thiếu capability trở về chưa có bằng chứng. Không backfill/enable
từ flag backend. GET /api/v1/safety thêm relay.valveInterlock; không dispatch.

Web An toàn Fail-Safe & Edge có thẻ proof tại PUMP01, phân biệt mới/cũ/thiếu,
OPEN còn latch vẫn khóa. Phản hồi quá15s hoặc API lỗi không là proof hiện tại.
PumpControl và chi tiết Event Log dịch ba mã lỗi mới. Không thêm IAM/Thing/
certificate/topic, flag bật từ web hoặc cloud command mới. Guard chỉ xác minh
logic đầu vào mô phỏng; không khẳng định van cơ khí, nước hoặc đúng nhánh.
Latch RAM, chưa NVS; legacy replay qua reboot không được bổ sung bảo đảm.

| Kiểm tra lượt cuối | Kết quả |
| --- | --- |
| Backend verify toàn bộ, PostgreSQL riêng |384/384, không skip |
| PumpValveInterlockTest mới |15/15, trong384 |
| Safety browser |17/17, gồm5mới |
| Pump browser hồi quy |15/15 |
| Event Log browser hồi quy |11/11 |
| Safety frontend unit |9/9, gồm3mới |
| Native guard |13ca đạt, strict compiler |
| Native encoder / relay / flow / flow encoder hồi quy |Đạt |
| Python Day1 contracts |8/8 |
| Public firmware default / guard / guard+fence / guard+flow+fence |Đạt |
| PHYSICAL declaration |Compile từ chối đúng static_assert, expected failure |
| Restore profile hợp lệ sau negative check |Build đạt |
| Public emptyFS / flash4MiB merge |Đạt, data chỉ .gitkeep |
| Lint / production build |Đạt, warnings Vite/chunk cũ |
| V29→30 dữ liệu nhánh/queue/monitor/boot/episode/history |So từng row, nguyên vẹn |
| Actual-app native→receiver→PostgreSQL→React / restart |Đạt phần fresh proof và stored fault/detail Event Log |
| Runtime commands/run/queue |0/0/0, không MQTT/AWS/GPIO |
| Liên kết Markdown tương đối / diff --check |345 liên kết hợp lệ / đạt |

Native encoder sinh4frame healthy OFF → ON → mất proof/OFF khóa → reset/OFF.
Backend tests nhận cả4, kiểm tra malformed/legacy/sticky/dedup/reorder/reset/
newboot/ON contradiction/fence metadata. Runtime chỉ nhận frame0 rồi frame2,
không giả command hoặc tạo ledger ON. Helper chặn đúng schema local mới
pump_valve_proof_smoke trên testDB55439, các cờ MQTT/control/pump-fence/demo/
monitor false, không có CommandTransport. Mỗi packet mới gán timestamp một
lần; helper từ chối phát lại hoặc refresh. Không đọc .local/PEM/privateconfig.

Full-app fresh proof đã qua GET-only menu Safety. Fault fresh thẻ/UI assertions
đạt và lưu bằng chứng, nhưng lượt script fail ở cuối do tìm reason trong bảng
Event Log thay vì Chi tiết. Giữ nguyên frame2/source/receipt, sửa selector,
restart JVM và chạy stored smoke hoàn chỉnh đạt: mẫu cũ không claim current,
metadata/history giữ từng field, đúng reason trong device event detail.
Không xóa evidence hay reseed để có lượt fresh mới. Không gọi script fault
ban đầu là pass toàn bộ. UI mock tests17ca riêng đã kiểm tra fresh/latch/stale.

Public PlatformIO project /tmp/smartfarm-pump-valve-proof-build chỉ copy source,
headers, config.example và .gitkeep; không config.local/endpoint/cert. Profile
guard+flow+fence cuối dùng RAM49.116/327.680, flash838.033/1.310.720bytes. Merge helper
có warning chứa key theo tên quy trình private, nhưng đã kiểm tra input test
chỉ .gitkeep và image4MiB; không có key được nạp vào artifact public này.

Log tạm: /tmp/valve-proof-backend-final.log, /tmp/valve-proof-safety-browser.log,
/tmp/valve-proof-pump-browser.log, /tmp/valve-proof-events-browser.log,
/tmp/valve-proof-safety-unit.log, /tmp/valve-proof-contracts.log,
/tmp/valve-proof-default-build.log, /tmp/valve-proof-enabled-build.log,
/tmp/valve-proof-fenced-build.log, /tmp/valve-proof-reject-physical-build.log,
/tmp/valve-proof-all-guards-build.log,
/tmp/valve-proof-restored-build.log, /tmp/valve-proof-fs-build.log,
/tmp/valve-proof-merge.log, /tmp/valve-proof-upgrade-smoke.log,
/tmp/valve-proof-native-fresh.log, /tmp/valve-proof-native-fault.log,
/tmp/valve-proof-app-fresh.log, /tmp/valve-proof-app-fault.log (selector fail),
/tmp/valve-proof-app-stored.log. Ảnh /tmp/pump-valve-proof-{phase}.png,
metadata /tmp/pump-valve-proof-fault-evidence.json. /tmp không đảm bảo qua
tạo môi trường mới; stored smoke chỉ GET, không reseed nguồn cũ.

Windows phải pull/backend restart cho V30 và opt-in/rebuild app/FS/merge/boot
firmware để có guard. Không chỉ pull web rồi coi có bảo vệ edge. Sáu ca
[chương42](../book/CHAPTER_42_LOCAL_VALVE_PUMP_INTERLOCK.md) **Chưa chạy** trên
Windows/AWS/Wokwi/GPIO. Chưa ánh xạ proof theo nhánh, điều khiển nhiều van,
interlock xuyên controller, flow proof thực địa, NVS/coordinator/dispatch queue.
A3 chưa hoàn tất; không đụng demo5433 hoặc các schema fixture cũ khác.
