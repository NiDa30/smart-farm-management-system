# Bàn giao — bơm LED gắn nhánh cố định, V33

Ngày 16/10/2026. [Chương47](../book/CHAPTER_47_PUMP_CIRCUIT_ROUTE.md).
Nối bước điều khiển van V32 với khai báo nhánh tại proof cục bộ PUMP01;
chỉ thử thủ công SIMULATOR, mọi opt-in mới mặc định tắt.

## Thay đổi

- PumpCircuitRoute: route sáu trường và kiểm tra nhánh/zone/config hiện tại,
  fresh local proof, remote OPEN position + ACK đúng command và các nhánh
  khác CLOSED. Không lấy monitor packet hoặc ACK riêng làm position mới.
- PumpCommandFencing/PumpService: HttpIntent và commandFence.route, V33
  pump_command.circuit_route, so sánh idempotence toàn tuple. Route capability
  không mất/đổi trong một boot; ON status phải khớp command đã lưu. Generic
  ON/reset và automatic ENV01 không được vượt qua route thiết bị khai báo.
- GET /irrigation-circuits/{id}/pump-proof chỉ đọc; trả reason/max/runtime
  và HTTP context. Profile cũ không có local proof trả diagnostic, không500.
- Bound ON1–30s, expiresAt rút ngắn để nằm trong cửa sổ OPEN của van với
  margin hai clock. Thiếu thời gian từ chối trước reservation, không kéo
  timer van. RESET đúng route không energize. Emergency OFF luôn không route;
  offline OFF vẫn ghi ledger FAILED, chưa xác nhận thực thi.
- Pump gate→circuit gate trước reservation. Cấm OPEN/CLOSE hoặc tạo/sửa
  nhánh, sửa vùng liên quan khi chưa có OFF phủ lệnh. Không dùng timeout,
  restart hoặc ACK riêng để giải phóng. Các thao tác gate nhánh chỉ đọc
  ownership, không lock pump ngược thứ tự. Không auto coordinator/queue.
- Firmware public thêm PumpCircuitRoute.h, decoder strict/duplicate keys,
  revision/type/IDs và30s, check trước ordinal/relay. Status thêm route dưới
  valveInterlock. Config static theo boot, compile guard fence/proof/simulator;
  giữ độc lập local contacts/reservoir/flow/timer/optional NVS. OFF legacy còn.
- UI có panel bơm theo nhánh, preflight clock giảm window theo thời gian,
  ON/OFF/reset và GET reconcile UUID; sessionStorage giữ intent chưa rõ,
  không tự replay. Generic ON/reset chặn khi route-required hoặc có route;
  Safety hiển thị route là cấu hình mô phỏng. HTTP202 không được hiển thị
  như LED ON hay proof đường nước thật.
- Không đổi topic/cert/role PUMP01, không apply AWS hoặc mở rộng policy.
  Board van vẫn cần profile/policy /demo/ riêng chương46; CLI monitor chỉ monitor.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Backend toàn bộ, PostgreSQL riêng | 461 đạt,0 fail/error/skip;22 mới |
| Browser nhánh |44 đạt =35 cũ +9 mới |
| Browser PUMP01 |17 đạt =15 cũ +2 mới |
| Unit intent/safety |20 đạt =17 cũ +3 mới |
| Python hợp đồng pump/fence |10 đạt =6 cũ +4 mới |
| Native route/fence/journal/local proof |4 chương trình đạt; gnu++11 route/packet/fence, warnings-as-errors |
| Public firmware legacy/bound/bound+NVS |Cả3 build đạt |
| Route1/fence0 |Compiler từ chối đúng; restore/build đạt |
| Empty filesystem + flash merge |Đạt,4MiB, chỉ .gitkeep, không PEM/key |
| Lint/production build |Đạt; cảnh báo Vite config/chunk có sẵn |
| Native valves→OPEN/ACK→pump route→ON/ACK/timer OFF→DB |Đạt, transport giả, millis logical |
| Full app menu, chọn nhánh, route khác, stale data |Đạt, GET-only,0 ngoại mạng/POST |
| V32→V33 trên fixture cũ |8 bảng dữ liệu giữ nguyên, không route backfill |
| Restart fixture bơm |8 bảng giữ nguyên, không replay hoặc refresh source/receipt|

Không cộng các lượt test targeted/full với nhau. Targeted đầu53 có2 lỗi
fixture timestamp: đổi issuedAt mà giữ expiresAt làm vi phạm CHECK lifetime;
sửa cả hai, không đổi constraint. Lượt full đầu460 đạt; rà soát thấy preflight
với legacy status NULL proof có thể500, sửa diagnostic và thêm test hồi quy.
Full cuối là số trong bảng. Native fixture đầu bị warning indentation, tách
statement và giữ -Werror. Negative-build assertion đầu dùng sai chuỗi log;
đọc compiler error thật, khôi phục public config và build lại. Không dùng
lượt lỗi làm bằng chứng đạt, không chạy lại suite ngoài phạm vi sau khi đạt.

## Fixture và runtime cloud

Schema riêng pump_route_smoke trên smartfarm-cloud-test/loopback55439,
DB/user smartfarm_test, không chạm PostgreSQL demo5433 hoặc volume. Giữ
circuit_control_smoke và các schema/baseline trước. Hai nhánh PC1/PC2,
vùng PZONE1/2, board IRRIGATION18/19, VALVE18/19, trạm PWATER. Helper
PumpCircuitRouteSmokeFixture có guard schema/flags/no-real-transport và
CREATE_NEW evidence/command; từ chối reseed/exercise lại, không refresh
source/receipt để hiển thị mới. Hai native initial CLOSED, VALVE18 OPEN30s
đã ACK; command bơm ON5s exact PC1 route; native ON ACK/status rồi timer OFF
sequence3. Runtime5s là millis mô hình tiến nhanh, không phải GPIO chạy5s.
PC2 không có command; không rule run hoặc queue dispatch. Bằng chứng gốc
/tmp/pump-route-evidence.json; command files chỉ là gói synthetic đã hết hạn,
không publish/replay. Valve18 OPEN trong mẫu cũ không được coi còn mở hiện tại.

Backend8080 script /tmp/run-pump-route-backend.sh, PID
/tmp/pump-route-backend.pid, log /tmp/pump-route-backend.log; starter
/tmp/start-pump-route-backend.py đợi log của PID mới và GET chức năng.
MQTT=false, không có CommandTransport/CircuitValveTransport thật; dù profile
control=true, API không cho ON/reset. Monitor/legacy demo=false. Vite3000
như trước. Trước dừng PID phải kiểm tra /proc/PID/cmdline đúng JAR/schema.
Không khởi chạy lại helper exercise hoặc làm tươi dữ liệu đã giữ.

```bash
CHROMIUM_PATH=/usr/bin/chromium python3 tools/frontend/smoke_pump_circuit_route.py
```

Smoke trên chỉ đọc, kiểm tra receipt/mapping/source/receipt với evidence,
không gửi OFF/ON hoặc packets. /tmp/pump-route-before-restart.json và
-after-restart.json so8bảng; startup chỉ invalidate HTTP intent/pause rule,
không replay. /tmp/pump-route-v32-before-upgrade.json và -after-upgrade.json
so8bảng fixture cũ, bằng nhau. Artifact public build trong
/tmp/pump-route-build-legacy,bound,durable; không đọc data/config riêng của repo.

Log: /tmp/pump-route-backend-final2.log, -browser.log, -pump-browser-final.log,
-api-unit-final.log, -contracts-final.log, -fixture-setup.log,
-fixture-exercise.log, -full-app.log, -v32-upgrade.log và -pio-*.log.
Generic thông báo merge_flash nói có key, nhưng filesystem ở build cloud
này được tạo rỗng chỉ .gitkeep; không dùng ảnh đó thay private flash Windows.

## Còn lại

Sáu ca Windows/AWS/Wokwi trong chương47 đều Chưa chạy. Chưa kiểm chứng GPIO,
NVS retention hoặc đường nước thật. Mỗi boot bơm chỉ khai báo một nhánh,
không chuyển route hoặc tự phối hợp nhiều van. Chưa coordinator, flow proof
xuyên controller, tự mở/đóng theo queue hoặc nghiệm thu A3 hoàn chỉnh. Monitor
history/alerts chưa nhận control latest làm backfill. Không xoá ledger,
recovery hoặc NVS để bỏ chốt khi thiếu trạng thái.

Kiểm tra 484 liên kết tương đối trong docs/ và hai README backend/firmware: không thiếu đích; git diff --check đạt.

Bản pump cuối: boot `89000000-0000-4000-8000-000000000001`, sequence `3`, source `2026-10-16T01:49:20.636543+00:00`, receipt `2026-10-16T01:49:20.644254+00:00`. Cả hai clock giữ nguyên sau restart.
