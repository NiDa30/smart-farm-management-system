# Bàn giao — lịch sử bơm theo nhánh V34

Ngày16/10/2026. [Chương48](../book/CHAPTER_48_PUMP_CIRCUIT_HISTORY.md).
Bổ sung truy vết sau route tĩnh V33. Chỉ đọc lịch sử, không coordinator
hoặc dispatch queue; không thay firmware, MQTT contract, dependency hoặc quyền AWS.

## Đã triển khai

- V34 pump_circuit_history và trigger AFTER trên pump_status trong cùng
  giao dịch accepted report. Lưu route sáu trường, boot/sequence, source/
  receipt, ON/OFF/khóa/reason, last ordinal, commandId tương ứng nếu có,
  local proof và durable metadata. UNIQUE boot/sequence không ghi trùng;
  singleton row lock giữ thứ tự cấp id qua commit cho pagination ceiling.
- Không backfill latest cũ, không gán route cho legacy. Không FK làm xóa
  history khi thay cấu hình/command. Không retention/xóa tự động.
- PumpCircuitHistory/Controller: GET /api/v1/pump-circuit-history,
  receivedAt range [from,to) <=31ngày, circuitId/condition, limit1–200,
  scoped cursor/ceiling, order timestamp+id. Điều kiện ALL/ON/OFF/LOCKED.
- GET .../commands đọc bounded route-bearing pump_command theo issuedAt,
  route/boot/ordinal/duration/lifetime/state/error và ACK nhận lúc/boot/sequence,
  hasMore. Ledger là snapshot lúc đọc, không immutable audit mọi thay đổi.
  GET không expire lệnh, làm mới timestamp, đổi quyền bơm hoặc publish.
- OFF khẩn cấp không mang route nên không đưa vào danh sách như lệnh đã
  chọn nhánh. Status route có thể liên kết commandId của OFF theo ordinal;
  không suy ra route ý định OFF hoặc nguyên nhân cắt từ current config.
- UI nút Lịch sử bơm mỗi nhánh, range/circuit/status, đọc chủ động, detail
  nguồn/clock/revision/boot/proof/NVS và hai CSV riêng status/lệnh. UI50mẫu/
  trang, ledger tối đa50 có thông báo thu hẹp khi hasMore. CSV chỉ đã tải,
  UTF-8 BOM/CRLF, quote/escape và chống spreadsheet formula ở errorCode.
- Parser giữ microsecond, kiểm tra route/proof/fault/NVS/ordinal, trạng thái
  flow fault, ACK metadata, bounds/filter/page order/ceiling. Old response
  không ghi đè filter mới; API lỗi giữ dữ liệu cũ nhưng chặn export. Safety
  export hai validator hiện có để tái sử dụng, không đổi ngữ nghĩa chúng.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Backend toàn bộ PostgreSQL test |477 đạt,0fail/error/skip,16mới |
| Browser nhánh toàn bộ |54 đạt,44cũ+10history mới |
| Browser history sau siết parser flow/ACK |10 đạt; không cộng lại vào54 |
| Unit history/safety cuối |20 đạt,7history mới+13safety hồi quy |
| Lint/production build cuối |Đạt; Vite config/chunk warnings cũ còn |
| Native receiver→DB→API/history/ledger |3status khác1ACK, PC2 rỗng |
| Full app/detail/hai CSV từ API thật |Đạt, GET-only/0ngoại mạng/0command |
| Upgrade V33→V34 fixture cũ |8bảng dữ liệu bằng nhau, history mới0 |
| Restart JVM fixture mới |9bảng bằng nhau, không replay/duplicate/refresh clock |

Targeted đầu38 (16mới+22route) có1fail vì test so Instant nanosecond với
PostgreSQL làm tròn microsecond. Chuẩn hóa fixture trước gửi; không sửa
bằng chứng đã lưu hoặc bỏ assertion. Targeted16 rồi full477 đạt. Browser
full54/units19 đầu đạt, rà soát parser bổ sung chặn flow fault không locked
OFF và ACK gắn trạng thái SENT; thêm1unit và chạy targeted10browser/20unit,
lint/build cuối đạt. Không cộng các lượt test thành tổng giả. Các44browser
khác giữ kết quả full54 trước vì những luồng đó không dùng parser mới.

Không build lại firmware không đổi hoặc chạy AWS. Native binary public của
chương47 được tái sử dụng với source không đổi, không coi đó là test GPIO/NVS.

## Fixture và runtime

Schema mới pump_history_smoke trên smartfarm-cloud-test, DB/user
smartfarm_test, loopback55439. Giữ demo5433/container/volume và mọi schema
cũ. PumpCircuitHistorySmokeFixture có guard schema/flags/no-real-transport,
setup/exercise không reseed/replay, evidence/command CREATE_NEW. Dùng cùng
public native decoder/model chương47: hai board VALVE18/19 CLOSED, van18
OPEN30s/ACK, bơm ON5s route PC1/ACK, status ON và timer OFF. Logical millis
nhanh, không phải đèn thật chạy5s. History3status: sequence0/2/3, OFF/ON/OFF;
ACK sequence1 chỉ ở ledger, không sinh row. PC2 không command/history.
Không rule run/queue dispatch/monitor backfill.

Evidence /tmp/pump-history-evidence.json gồm history với range gốc, ledger,
receipt, valve/pump rows. Giữ source/receipt/route/sequence đó, không làm tươi
cho UI. /tmp/pump-history-v33-before.json và -after.json so8bảng schema
pump_route_smoke khi nâng V33→V34; history mới rỗng. Lệnh V33 cũ vẫn đọc được
riêng, không biến thành mẫu. /tmp/pump-history-before-restart.json và
-after-restart.json so9bảng gồm history; startup chỉ invalidates HTTP intent/
pause rule theo thiết kế cũ. Không xuất bản lại packets từ artifact cũ.

Backend8080 hiện dùng /tmp/run-pump-history-backend.sh, PID
/tmp/pump-history-backend.pid, log /tmp/pump-history-backend.log, starter
/tmp/start-pump-history-backend.py. Kiểm tra /proc/PID/cmdline đúng JAR/schema
trước dừng, không assume PID còn sau restore. Vite3000 giữ như trước.
MQTT=false, control/fence/route-required/circuit-demo=true, monitor/legacy
false. Không có CommandTransport hoặc CircuitValveTransport thật nên ON/
reset readiness=false. Không dùng Windows AWS startup script ở cloud.

```bash
CHROMIUM_PATH=/usr/bin/chromium python3 tools/frontend/smoke_pump_circuit_history.py
```

Smoke trên chỉ GET: API history/ledger bằng evidence, full menu/chọn nhánh,
3bản tin, chi tiết clocks/boot, hai CSV, PC2 rỗng, không POST/ngoại mạng/page
error. /tmp/pump-history-full-app.png, -full-app.log, -full-app-restart.log.
Các log /tmp/pump-history-backend-final.log, -browser.log,
-browser-final.log, -unit-final.log, -lint-final2.log, -build-final.log,
-fixture-setup.log, -fixture-exercise.log, -v33-upgrade.log.

## Cần nghiệm thu tiếp

Năm ca Windows/AWS/Wokwi trong chương48 đều Chưa chạy. Chưa có bằng chứng
GPIO, đường nước hoặc NVS retention. Không suy ra runtime, lít nước hoặc
thời điểm cắt offline từ các mẫu sau reconnect. Không tự chuyển route,
phối hợp van/bơm, chạy queue hoặc hoàn tất A3. OFF route-free vẫn cần xem
commandId/ledger PUMP01 chung, không giả gán scope. Chưa full append-only
audit của mọi cập nhật command/ACK; phần lệnh là bản lưu tại lúc đọc.

Kiểm tra 500 liên kết Markdown tương đối: không thiếu đích; git diff --check đạt.
