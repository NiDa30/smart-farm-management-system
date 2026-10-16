# Bàn giao — phiên tưới có xác nhận từng bước V35

Ngày16/10/2026. [Chương49](../book/CHAPTER_49_OPERATOR_IRRIGATION_SESSION.md).
Mode OPERATOR_STEPS, một route tĩnh/boot, chỉ LED mô phỏng. Đây là bước giữ
quy trình có người xác nhận, chưa coordinator tự chuyển vùng hoặc dispatch queue.

## Thay đổi

- V35 irrigation_session/session_action, snapshot cấu hình và hai boot gốc,
  thời gian/revision/phase/stop flag/các UUID. Unique index một phiên chưa
  CLOSED_CONFIRMED. Không FK làm thay đổi cấu hình khi giữ lịch sử phiên.
- GET snapshot/start/find/action lookup, POST start và POST action. Start
  không gửi, chỉ giữ phiên nếu đúng profile/route/boots, pump OFF mới không
  khóa/lệnh chưa rõ, tất cả van CLOSED mới và cả transport sẵn sàng. Range
  duration1–10s; OPEN30s, ON vẫn phải vừa cửa sổ V33. Legacy demo phải tắt.
- Mỗi OPEN/ON/OFF/CLOSE/FINISH có UUID riêng và review<=10s, revision. OFF
  không bị ràng revision đã đổi, vẫn cần review mới; FINISH chỉ DB. Duplicate
  definition trả bản lưu trước kiểm tra freshness, không republish.
- Definition so typed Action sau deserialize để JSONB IntNode/LongNode
  không tạo409 sai. Lưu operation/payload và phase trước dispatch, commit
  gate rồi gọi service cũ. Kết quả callback chỉ đổi phase nếu UUID/phase
  vẫn sở hữu; OFF đến giữa OPEN/ON không bị lời gọi cũ khôi phục WAIT_ON.
- SessionGuard dưới các gate cũ chặn ON/reset/valve movement ngoài phiên,
  create/edit circuit và zone liên quan; OFF vẫn được. OFF ngoài phiên
  đánh dấu RECOVERY_REQUIRED/stopRequested trước gửi. Guard không đổi wire
  protocol, không thay phao/proof/flow/NVS tại firmware.
- CLOSE cần status OFF mới sau lệnh, phủ pending/ownership; FINISH cần ACK
  CLOSE và status CLOSED mới khớp ordinal/boot/config. CLOSE phục hồi có thể
  nhắm boot van mới; ON giữ boot gốc và không resume. Không force-unlock.
- Startup chuyển mọi active phase sang RECOVERY_REQUIRED, tăng revision,
  RESERVED action thành UNRESOLVED. Không gửi command. Phiên đã khép không đổi.
- UI mỗi nhánh có panel tạo/xác nhận từng bước, readiness, phase và20operation,
 10phiên gần nhất, pending identities sessionStorage và GET đối chiếu. Không
  tự retry/advance khi poll/reconnect. OFF khẩn có request riêng, không chờ
  network call bước đang treo; khi20pending chặn bước thường, vẫn có emergency.
  RETURNED/HTTP202/ACK không tự hiển thị GPIO đã đổi. Trạng thái cũ để Unknown.
- Flag SMARTFARM_IRRIGATION_SESSION_ENABLED mặc địnhfalse. Tắt flag không
  xóa phiên; vẫn cho bước OFF/CLOSE/FINISH nếu dispatch profiles cũ còn bật.
  Không thêm dependency, firmware, topic, certificate, IAM hoặc AWS operation.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Backend toàn bộ PostgreSQL test |497 đạt,0fail/error/skip,20mới |
| Browser khu vực nhánh |62 đạt,54cũ+8session mới |
| Browser session sau chốt giới hạn pending UI |8 đạt, không cộng lại vào62 |
| Unit parser/pending session |5 đạt |
| Lint/build cuối |Đạt, cảnh báo Vite cũ còn |
| Standalone fake-IO operator workflow |5xác nhận,4command, CLOSED_CONFIRMED đúng proof |
| JVM thật với phiên PREPARED |RECOVERY_REQUIRED/stop, không command mới |
| Full app GET-only/lookup/nhánh khác |Đạt,0write/ngoại mạng/page error |
| V34→V35 trên fixture cũ |9bảng dữ liệu bằng nhau, session/action mới0 |

Targeted đầu58 có1fail do test cấm mọi lời gọi mock nhưng snapshot được
phép đọc connected; sửa assertion chỉ cấm publish. Hai duplicate-action
errors do JsonNode numeric type sau JSONB khác mapper LongNode; sửa so bằng
typed record, không bỏ idempotence. Targeted16, mở rộng20 và toàn bộ497
cuối đạt. Full browser62 đạt; thay guard UI khi20pending rồi chạy lại8ca
session/lint/build, giữ kết quả54luồng cũ không dùng điều kiện đó. Không cộng
các lượt. Unit5khôngskip. Không build lại firmware không đổi hoặc gửi AWS.

## Fixture và runtime

Schema riêng irrigation_session_smoke trên smartfarm-cloud-test,
loopback55439 DB/user smartfarm_test; giữ demo5433/volumes và schema/baseline
cũ. Helper IrrigationSessionSmokeFixture có schema/flags/no-real-transport
guard, setup/exercise từ chối reseed/replay, evidence/packet CREATE_NEW.
Không chạy helper lại để làm tươi UI: startup cũng có thể tăng revision phiên.

PC1/PC2, PZONE1/2, IRRIGATION18/19, VALVE18/19, PWATER. Public native packet
program chương47 tái sử dụng cho initial/OPEN/ON; synthetic OFF/CLOSE
callbacks tạo ACK/status qua receiver thật. Không GPIO thực; timer native
logical millis tiến nhanh. Helper xác nhận5bước tường minh qua service,4
command(2pump/2valve),5operationRETURNED, một CLOSED_CONFIRMED revision10.
Đợi thực2,1s cho close fence rồi tạo phiên thứ hai PREPARED, chưa gửi command.
History bơm4sample riêng; không rule run/queue dispatch. Đó là test fixture,
không backend worker tự gọi bước kế tiếp.

Evidence /tmp/irrigation-session-evidence.json, packet files cùng prefix
chỉ synthetic đã hết hạn, không publish/replay. Trước/sau JVM restart9bảng
control/history bằng nhau: /tmp/irrigation-session-before-restart.json và
-after-restart.json. Phiên thứ hai thay PREPARED→RECOVERY_REQUIRED,
stopRequested=true, revision1→2; phiên đã khép và5operation giữ nguyên.
Không tuyên bố toàn bộ DB byte-identical: startup pause rule/invalidate
HTTP intent và cập nhật phiên active đúng thiết kế. Recovered view tại
/tmp/irrigation-session-recovered-view.json. Current active fixture không
được tự OFF/FINISH/xóa để mở nút; chỉ đọc trong cloud.

Nâng fixture cũ pump_history_smoke V34→V35 giữ9bảng tại
/tmp/irrigation-session-v34-before.json,-v34-after.json; các table phiên mới
rỗng, không tự tạo session hoặc backfill.

Backend8080: /tmp/run-irrigation-session-backend.sh, PID
/tmp/irrigation-session-backend.pid, log /tmp/irrigation-session-backend.log,
starter /tmp/start-irrigation-session-backend.py. Kiểm tra /proc/PID/cmdline
đúng JAR/schema trước dừng. MQTT=false, không transport thật; control/fence/
route/circuit/session=true, monitor/legacy=false. Vite3000 giữ như trước.
Starter đợi log của PID mới và GET preflight; sau startup còn kiểm tra API
session active RECOVERY/không OPEN/ON, recent CLOSED giữ nguyên, command count.

```bash
CHROMIUM_PATH=/usr/bin/chromium python3 tools/frontend/smoke_irrigation_session.py
```

Smoke chỉ GET actualmenu/phiên recovery/recentclosed/operationlookup/loại
trừ PC2; không bấm action. /tmp/irrigation-session-full-app.log và .png.
Logs -backend-final.log,-browser-final.log,-browser-capacity.log,-unit.log,
-lint-last.log,-build-last.log,-fixture-setup.log,-fixture-exercise.log,
-v34-upgrade.log. Public native model trước không bị build/copy private PEM.

## Giới hạn và nghiệm thu

Sáu ca Windows/AWS/Wokwi chương49 Chưa chạy. Chưa physical valve/pump path,
GPIO timing hoặc NVS retention. Restart backend không tự gửi OFF: thiết bị
vẫn giữ timer/guard cục bộ, operator phải dừng và đối chiếu; không quảng cáo
đó là coordinator unattended. Không auto reset, chuyển route/multi-zone,
flow proof xuyên controller hoặc queue dispatch. Chưa hoàn tất A3.

516 liên kết tương đối đã kiểm tra,0đích thiếu; git diff --check đạt.
