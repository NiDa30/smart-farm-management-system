# Bàn giao — project Wokwi giám sát theo nhánh

[Chương44](../book/CHAPTER_44_CIRCUIT_MONITOR_PACKAGE.md), sau V31; không migration mới.

Thêm GET `/api/v1/irrigation-circuits/{id}/monitor-package` với accountId12
chữ số, expectedRevision và expectedZoneRevision. Region cố định
ap-southeast-1. Chỉ mapping CURRENT/SIMULATOR và controller/van02–99 riêng;
shared controller/client, stale mapping, identity/source/declaration sai bị
chặn. REPEATABLE_READ snapshot, không mutate DB/provision/publish.

Maven nhúng allowlist chín file firmware công khai vào JAR. Service dựng ZIP15
file: full project không credentials, config monitor1/demo0/feedback1 đúng
nhánh/revision, diagram nhãn đúng van, hai narrow policy, manifest SHA-256
và README Windows. Không đọc repository runtime, private config/PEM/.local/
.aws; không dùng SDK. GPIO giữ OFF, không command subscription/ACK.

UI mới trong Cấu hình nhánh tưới: Account ID chỉ ở state, nút tải từng hàng,
chặn thiếu account/ID legacy/source physical/shared client/stale. Response
phải khớp header identity/revision, MIME/ZIP signature/size; đổi mapping hoặc
API lỗi khi đang tải thì không tải bản cũ. Không tự retry, không thêm thư viện.

## Kết quả cuối

| Kiểm tra | Kết quả |
| --- | --- |
| Backend toàn bộ với PostgreSQL riêng |416 đạt,0 fail/error/skip;18 mới |
| Browser fixture nhánh / queue |26 /16 đạt |
| Unit frontend exporter |6 đạt |
| Python policy / Day1 contract |5 /12 đạt trong venv dự án |
| Lint / build |Đạt; cảnh báo Vite có sẵn |
| JAR allowlist / ZIP / hash / Python policy parity |Đạt |
| Full-app menu → hai download ZIP thực |Đạt, GET-only, account test123456789012 |
| Hai firmware project cuối lấy từ ZIP |Build đạt, controller06/07, valve06/07 |
| Native packet từ config/include xuất ra → receiver/PostgreSQL/React |Đạt; van06 CLOSED, van07 chưa có packet |
| Monitor+demo1 |Từ chối đúng static_assert; restored profile đạt |
| EmptyFS/merge4MiB |Đạt, chỉ .gitkeep; không private config/PEM |
| Restart JVM + xuất lại |Giữ source/receipt/history; stale UI; policy/source/config hash ổn định |
| NVS V31 compatibility |Stored smoke đạt, relay/journal/clocks/history cũ không đổi |

Firmware monitor: RAM46,396/327,680; Flash819,885/1,310,720 byte trên hai
board cấu hình thử. Build public không có endpoint/certificate; không thể
dùng ảnh đó như firmware đã provision. Không kiểm tra GPIO/AWS/Wokwi thật.

## Lỗi và cách sửa

- Hai case test đầu dùng node_type/telemetry_version và metric không hợp lệ
  theo DB: đổi fixture sang WATER/v2 và WATER_PRESSURE. Không sửa constraint
  hoặc validation ứng dụng để làm test qua.
- Stored smoke đầu fail vì Map.of serialize key không ổn định giữa JVM,
  checksum hai policy đổi. Sort map keys trước serialize, thêm test và chạy
  lại full backend. Giữ gói lỗi trong /tmp/circuit-monitor-packages, xuất
  baseline cuối vào /tmp/circuit-monitor-packages-final; không sửa đồng hồ
  hoặc phát lại observation. Chỉ generatedAt/README timestamp được thay khi
  re-export; core hash phải khớp.
- Lượt readiness sau restart bắt nhầm HTTP200 từ listener cũ trước khi nó
  đóng, nên stored smoke gặp502 lúc JVM mới chưa sẵn sàng. Đợi đúng PID mới,
  log Started và API chức năng trước khi kiểm tra; không bỏ assertion hoặc
  đổi dữ liệu. Log lỗi ban đầu được giữ riêng với kết quả cuối.

## Runtime và bằng chứng giữ lại

Backend8080 schema circuit_package_smoke, Vite3000; DB test localhost55439,
không chạm DB demo5433/volume. Hai nhánh PKC1/PKC2 dùng PKWATER, hai vùng
PKZONE1/2, controller06/07 và valve06/07. Native boot
86000000-0000-4000-8000-000000000001 sequence0 của van06 được nhận một lần;
van07 không có packet. Commands/run/queue của fixture0. Source/receipt giữ
trong /tmp/circuit-package-observation-evidence.json; không refresh/reseed.

Startup `/tmp/run-circuit-package-backend.sh`, PID
`/tmp/circuit-package-backend.pid`, log `/tmp/circuit-package-backend-restart.log`.
Kiểm tra PID/cmdline/schema trước khi dừng. GET-only stored smoke:

```bash
CHROMIUM_PATH=/usr/bin/chromium python3 tools/frontend/smoke_circuit_monitor_package.py --phase stored --artifact-dir /tmp/circuit-monitor-packages-final
```

Stored smoke giữ artifact restart đầu tiên, các lần sau kiểm tra download
tạm mới của trình duyệt và giữ file cũ; không overwrite hoặc xóa evidence.
Chỉ setup và receive one-shot qua helper có guard schema/flags; không gọi
chúng cho lần kiểm tra thông thường. File /tmp và process cần được kiểm tra
lại khi khôi phục môi trường; draft startup không tự publish snapshot.

## Còn chờ

Năm ca live ở chương44 đều Chưa chạy. Download không tự tạo Thing/certificate,
gán policy, đăng ký node thực hoặc chạy simulator. Chỉ hỗ trợ monitor board
riêng02–99/SIMULATOR/Singapore, chưa điều khiển nhiều van/PUMP01, coordinator,
multi-output board hoặc dispatch queue. Không đánh dấu A3 hoàn tất.
