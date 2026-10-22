# SMART FARM MVP CHECKLIST

Kế hoạch gốc: [ONE_WEEK_SMART_FARM_MVP_PLAN.md](./ONE_WEEK_SMART_FARM_MVP_PLAN.md).

Ngày lập: 11/10/2026. **Day 1 đã bắt đầu; MVP chưa đạt live AWS gate.** Local checks được ghi trong [DAY_1_EVIDENCE.md](./DAY_1_EVIDENCE.md). Các ô chỉ xác nhận sau khi có evidence; không đánh dấu dựa trên UI mock. Ghi người thực hiện, Git SHA, thời điểm, command/measurement/run IDs và kết quả test vào bảng evidence cuối file. `[ ]` nghĩa là chưa nghiệm thu; optional chưa làm không chặn baseline.

## Audit và scope freeze — DAY 1

- [ ] Đội triển khai xác nhận audit HEAD và khác biệt UI/code với đặc tả.
- [ ] Xác nhận hai kỹ sư A backend/AWS, B firmware/frontend và ngân sách ≥84 giờ công.
- [ ] Nếu chỉ một người hoặc AWS chưa sẵn, điều chỉnh deadline/scope bằng quyết định rõ.
- [ ] Freeze FARM001, ENV01 sensor, PUMP01 actuator, một ESP32 controller ENV01.
- [ ] Freeze topics/schema v1, mapping mock IDs → device IDs canonical.
- [ ] Freeze telemetry5s, stale15s, offline30s, timeout10s.
- [ ] Freeze low30/high35, normal runtime20s, hard cap30s, cooldown60s.
- [x] Fix lỗi TypeScript `SensorRealtime.tsx:179`, `npm run lint` pass.
- [ ] Pin Node/JVM/SDK/firmware dependencies sau connectivity proof; ghi workaround peer dependencies.
- [ ] Không mở backlog ERP/analytics/OTA khi gate IoT chưa đạt.

## AWS setup và connectivity — G1

- [ ] AWS account, region, scope quyền provisioning và budget sandbox được xác nhận.
- [ ] Lấy Data-ATS endpoint thật từ AWS; không đoán endpoint.
- [ ] AWS IoT Thing ENV01.
- [ ] Certificate X.509 ACTIVE.
- [ ] Certificate attach Thing đúng.
- [ ] IoT Policy least privilege attach principal đúng.
- [ ] Connect chỉ client ENV01; Publish chỉ telemetry/status/ACK/event được cấp.
- [ ] Subscribe/Receive chỉ PUMP01 command topic.
- [ ] Cross-farm/topic không được phép bị deny.
- [ ] Device certificate không được publish command.
- [ ] Backend IAM role/principal riêng với runtime permissions scope FARM001.
- [ ] Backend Java SDK v2 WSS443 SigV4/native CRT kết nối được trên host demo.
- [ ] Credential refresh/expiry và proxy/network route đã kiểm tra, không tắt TLS verify.
- [ ] AWS MQTT Test Client nhận firmware telemetry mỗi5s trong5 phút.
- [ ] ESP32/Wokwi TLS connection thật được chứng minh; không dùng laptop publisher thay thiết bị.
- [ ] Cert/private key provision private; không public Wokwi/project link/binary chứa key.
- [ ] Host/port allowlist và runtime prerequisites được ghi runbook.

## Hardware và firmware — G2

- [ ] ESP32 DevKit được flash hoặc Wokwi private project chạy firmware tương đương.
- [ ] DHT22 đọc được temperature/humidity, không publish NaN.
- [ ] Soil sensor thật hoặc potentiometer Wokwi có nhãn virtual input.
- [ ] Soil ADC1 calibration dry/wet→% kiểm chứng hướng và threshold.
- [ ] Relay và LED/mini pump điện áp thấp có wiring/polarity đúng.
- [ ] Boot/reset luôn GPIO OFF trước kết nối mạng.
- [ ] Firmware source authoritative trong `firmware/esp32`, pin/config profiles rõ.
- [ ] Firmware build noninteractive với phiên bản đã pin.
- [ ] Wi-Fi + SNTP sync trước TLS và chấp nhận ON.
- [ ] MQTT TLS root CA/hostname/client certificate verification bật.
- [ ] Client/device ID stable ENV01; bootId mới khi reboot.
- [ ] Telemetry ba metrics, UTC timestamp, sequence, schemaVersion mỗi5s.
- [ ] QoS1 publish thực sự hỗ trợ bởi MQTT library, không gắn nhãn sai cho PubSubClient QoS0.
- [ ] Heartbeat/status, LWT controller, PUMP01 reported status.
- [ ] Wi-Fi/MQTT reconnect bounded backoff, subscribe trước báo online.
- [ ] Safety task độc lập, reconnect không chặn timer GPIO.
- [ ] Local cap30s đã test ngay ngày2, không chờ ngày6 mới viết nền safety.

## Backend, database và API — G3

- [ ] Spring Boot Java21 modular monolith build và startup (Day1 bootstrap build/native probe pass; complete startup/services chờ Day3).
- [ ] PostgreSQL Compose named volume/healthcheck/private binding.
- [ ] Flyway tạo 8 bảng MVP/index/constraint; seed metadata, không seed telemetry/ACK giả.
- [ ] MQTT Listener/PayloadValidator/MqttPublisher có AWS transport thật.
- [ ] Identity topic/farm/device và value/time validation.
- [ ] Dedupe bootId+sequence; out-of-order không rollback latest.
- [ ] Telemetry lưu PostgreSQL transaction cùng device/event update.
- [ ] Invalid payload tạo rejection evidence, không tạo valid measurement hoặc rule trigger.
- [ ] Presence/freshness scheduler ONLINE/OFFLINE + FRESH/STALE/NO_DATA.
- [ ] Backend feed/storage degraded khóa automation/ON, không success giả.
- [ ] GET devices/detail/telemetry 1h/24h/alerts/events hoạt động từ DB.
- [ ] List pagination/range limits và UTC timestamps.
- [ ] Session login/logout/me/CSRF hoạt động.
- [ ] OPERATOR/VIEWER authorization server-side, farm scope.
- [ ] API control anonymous401/viewer403/cross-farm deny.
- [ ] History còn sau backend/DB restart; migration repeatable không reset volume.
- [ ] Backend meaningful tests với PostgreSQL pass, không zero-test runner.

## Realtime frontend — G4

- [ ] `IotProvider`/API DTO riêng, không hydrate mock khi API lỗi.
- [ ] Vite REST/WebSocket proxy cùng origin.
- [ ] WS authenticated + Origin/farm checks, broadcast sau DB commit.
- [ ] WS events versions/correlation IDs; reconnect+REST refetch không rollback state.
- [ ] `/iot/dashboard` dùng counts/metrics thật, không hard-coded zone KPIs.
- [ ] `/iot/devices` hiện ENV01/PUMP01 và connection/data freshness thật.
- [ ] `/iot/devices/:id` resolve ID/detail, reload/deep link đúng.
- [ ] `/iot/realtime` hiện temp/air humidity/soil, unit/timestamp/data age.
- [ ] `/iot/history` query1h/24h DB, empty/gap/error state đúng.
- [ ] Browser không MQTT HiveMQ/AWS và không AWS credentials.
- [ ] Bỏ browser telemetry test publisher khỏi live demo.
- [ ] UI mất WS/backend hiển thị lỗi/reconnecting và disable ON.
- [ ] Data age tăng ngay cả khi không có packet mới.
- [ ] Unmeasured flow/current/battery hiện unavailable; không fake values.
- [ ] Topbar/screens ngoài slice ghi prototype/mock; không giả LoRa Live.
- [ ] Sensor→UI≤7s và backend receive→UI≤2s được đo trong môi trường demo.

## Remote control và ACK — G5

- [ ] Command entity/REST API/dispatcher persistent.
- [ ] HTTP idempotency key scoped requester/farm và payload conflict409.
- [ ] MQTT command retain=false, expiresAt, bounded duration≤30s.
- [ ] PENDING chỉ sau DB accept; SENT chỉ sau broker PUBACK.
- [ ] Firmware subscribe PUMP01 command và validate action/ID/expiry/duration.
- [ ] Manual START → GPIO ON → EXECUTED ACK SUCCESS thật.
- [ ] Manual STOP → GPIO OFF → EXECUTED ACK SUCCESS thật.
- [ ] ACKNOWLEDGED/SUCCESS dựa matching device ACK, không timer450ms.
- [ ] UI state ON chỉ từ fresh confirmed reportedState.
- [ ] Timeout10s, FAILED/errorCode và UNKNOWN state hiển thị rõ.
- [ ] ACK trước PUBACK không làm command state đi lùi.
- [ ] Wrong ACK/late ACK/duplicate được xử lý có event và reconciliation.
- [ ] Duplicate ON không reset local deadline; expired ON không được replay.
- [ ] STOP ưu tiên và accessible khi state UNKNOWN; không tuyên bố OFF thiếu evidence.
- [ ] Dashboard/device/alert quick actions cùng protected API, không gọi mock control handler.
- [ ] Command timeline DB + WS + log correlated commandId.

## Automation, alert và fail-safe — G6

- [ ] `/iot/automation` simple rule list/create/edit/enable có API thật.
- [ ] Rule soil<30 hai fresh samples, pump fresh/non-error/non-unknown và không safety lockout.
- [ ] soil≥35 hoặc20s normal runtime phát OFF qua command service.
- [ ] Một active run/pump; cooldown60s và hysteresis chống command flood.
- [ ] Manual STOP giữ manual hold; chuyển AUTO phải operator chủ động.
- [ ] Rule disable lúc run active có procedure OFF, không bỏ timer đang chạy.
- [ ] HIGH_TEMPERATURE >35 và LOW_SOIL_MOISTURE <30 alert dedupe.
- [ ] Device offline/command timeout alert và clear/ack flow đúng.
- [ ] `/iot/alerts` + `/iot/events` thật; export/simulator chưa implement được ẩn.
- [ ] MAX_PUMP_RUNTIME firmware≤30s, timer monotonic, không phụ thuộc AWS/backend.
- [ ] Network loss trong khi ON đạt OFF local; reboot không resume ON.
- [ ] Hard-cap trip tạo CRITICAL + lockout + local event; sync event sau reconnect.
- [ ] Backend safety supervisor lớp thứ hai; restart reconcile không replay ON.
- [ ] Reset lockout chỉ khi fresh confirmed OFF, operator authorized; RESET_LOCKOUT command có device ACK trước clear cờ, reset không tự bật.
- [ ] TELEMETRY_RECEIVED/RULE_TRIGGERED/COMMAND_SENT/COMMAND_ACK/ALERT_CREATED/DEVICE_ONLINE/DEVICE_OFFLINE/SAFETY_TRIP có IDs và timestamps.
- [ ] Fault-test profile cap30s không vô tình bypass chính hard cap; hook không exposed bản demo.

## Test matrix — G7

Mỗi ô chỉ đánh dấu sau test có evidence, gồm AWS thật cho tests tương ứng. Test protocol lỗi có thể dùng integration fixtures, nhưng fixtures không thay full-loop acceptance.

- [ ] TC-IOT-001 Normal telemetry received.
- [ ] TC-IOT-002 Sensor value changes realtime.
- [ ] TC-IOT-003 Invalid telemetry rejected.
- [ ] TC-IOT-004 Device goes offline.
- [ ] TC-IOT-005 Device reconnects.
- [ ] TC-IOT-006 Manual Pump ON.
- [ ] TC-IOT-007 Manual Pump OFF.
- [ ] TC-IOT-008 Command ACK success + PUBACK race.
- [ ] TC-IOT-009 Command timeout.
- [ ] TC-IOT-010 Soil threshold triggers automation.
- [ ] TC-IOT-011 Maximum runtime stops GPIO and creates critical evidence.
- [ ] TC-IOT-012 WebSocket reconnect/resync.
- [ ] TC-IOT-013 Stale telemetry despite heartbeat.
- [ ] TC-IOT-014 AWS device/backend disconnect/reconnect.
- [ ] TC-IOT-015 Certificate/policy permission denied and valid config restored.
- [ ] TC-IOT-016 Auth/farm/WS Origin denial.
- [ ] TC-IOT-017 Duplicate/reordered telemetry/commands.
- [ ] TC-IOT-018 Late/wrong/received-only ACK.
- [ ] TC-IOT-019 Threshold/timed stop and chatter suppression.
- [ ] TC-IOT-020 High-temperature alert dedupe/clear.
- [ ] TC-IOT-021 Backend/DB restart/outage during ON.
- [ ] TC-IOT-022 Expired/invalid ON, unsynced clock and safe boot.
- [ ] TC-IOT-023 Cold start from saved runbook, persistent data.
- [ ] TC-IOT-024 Rule disable/manual hold/safety reset.

## Security và bàn giao

- [ ] Cert/private key/Wi-Fi/password/AWS credential không trong tracked source/public simulator.
- [ ] `.gitignore` cho local config/certs/images/build verified bằng `git check-ignore`.
- [ ] Secret scan tracked files + history + artifacts; nếu leak thì revoke/rotate, không chỉ delete file.
- [ ] Least-privilege runtime/provisioning credentials tách biệt, backend refresh credentials đúng.
- [ ] Session cookies/CSRF/Origin/CORS chuẩn; không control endpoint anonymous.
- [ ] No default credential tracked, no raw auth/PEM logs, frontend bundle secret review.
- [ ] Runbook ghi working directories, install/start/health commands, flash/private provisioning.
- [ ] `npm run build`, `npm run lint`, frontend E2E, backend verify, firmware build đều pass.
- [ ] Fresh DB và retained DB startup đã test; backup trước demo.
- [ ] Cold start không phụ thuộc process cũ, rules/relay initialized safe OFF.
- [ ] Final demo soil45→28 có measurement→alert→rule→command→GPIO→ACK→UI→history/events thật.
- [ ] Final demo manual ON/OFF, timeout/offline/WS recovery và local hard cap có evidence.
- [ ] Demo chạy thành công hai lần; pass/failed/skipped/unrun được phân biệt.
- [ ] README/architecture/sequence/demo script cập nhật; limitations ghi rõ LED/virtual vs physical pump.

## Optional / Phase 2 — không chặn baseline

- [ ] Device Shadow reported-only, không retained desired ON bật lại sau reconnect.
- [ ] IoT Rule diagnostic → CloudWatch với role riêng/retention, không duplicate persistence.
- [ ] Flow sensor thực và NO_FLOW test ON+flow0 trong10s → OFF.
- [ ] Water level / solenoid valve.
- [ ] Remote backend deploy HTTPS đã bảo vệ.
- [ ] Fleet OTA/LoRaWAN/Greengrass/advanced digital twin/AI/ERP sau tuần MVP.

## Evidence register

Không ghi secret/credential vào bảng. Có thể dùng file test report private hoặc screenshot đã redacted làm link. Mở rộng mỗi test/gate một dòng khi thực hiện.

| Gate / Test | Người | Git SHA / UTC time | Device / sample / command / run IDs | Evidence | Outcome / limitation |
|---|---|---|---|---|---|
| G1 | — | — | — | Chưa thực hiện | UNRUN |
| G2 | — | — | — | Chưa thực hiện | UNRUN |
| G3 | — | — | — | Chưa thực hiện | UNRUN |
| G4 | — | — | — | Chưa thực hiện | UNRUN |
| G5 | — | — | — | Chưa thực hiện | UNRUN |
| G6 | — | — | — | Chưa thực hiện | UNRUN |
| G7 | — | — | — | Chưa thực hiện | UNRUN |

Checklist này không ghi nhận lại UI mock đã pass trong onboarding như bằng chứng MVP end-to-end. Typecheck có lỗi tại thời điểm audit và đã được sửa/kiểm tra pass trong Day1; AWS live gate và firmware compile vẫn chưa nghiệm thu. Chỉ thêm dấu kiểm cho phần có evidence tương ứng.

## Bước V33 — bơm LED có route tĩnh tại proof cục bộ

- [x] ON/reset chọn đúng nhánh/revisions/boot; van OPEN đã ACK và status mới,
  nhánh khác CLOSED, local proof OPEN; thời gian bật trong cửa sổ van.
- [x] Khóa di chuyển/sửa nhánh khi bơm chưa OFF phủ mọi lệnh; OFF không ràng route.
- [x] Firmware/API/UI opt-in, ledger/reconcile không tự retry/resume; kiểm thử cloud.
- [ ] Sáu ca AWS/Wokwi thực tế chương47, GPIO/NVS/physical path.
- [ ] Coordinator chuyển nhiều vùng, flow proof xuyên controller, queue dispatch.

[Hướng dẫn](../book/CHAPTER_47_PUMP_CIRCUIT_ROUTE.md),
[bàn giao](LOCAL_PUMP_CIRCUIT_ROUTE_REPORT.md). Không coi các test cloud là nghiệm thu A3.

## Bước V34 — truy vết bơm theo nhánh

- [x] History status accepted có route từ V34, nguyên clocks/tuple/boot/proof;
  không backfill latest hoặc lấy ACK làm status.
- [x] API/UI range/circuit/condition, detail, cursor và hai CSV chỉ dòng đã tải;
  bounded command/ACK ledger riêng, kiểm thử upgrade/restart/cloud.
- [ ] Năm ca live trong [chương48](../book/CHAPTER_48_PUMP_CIRCUIT_HISTORY.md).
- [ ] Coordinator nhiều nhánh/flow proof xuyên controller/queue dispatch.

[Bàn giao V34](LOCAL_PUMP_CIRCUIT_HISTORY_REPORT.md).

## Bước V35 — phiên tưới có người xác nhận

- [x] Một session lưu bền, mỗi bước UUID/revision/review và commit trước IO;
  giữ cấu hình/boots, khép bằng OFF/CLOSED mới, không auto retry/resume.
- [x] Chặn thao tác ngoài phiên/sửa cấu hình; OFF khẩn vẫn dùng và interrupt.
- [x] UI/pending GET lookup, startup RECOVERY, kiểm thử DB/browser/actualJVM.
- [ ] Sáu ca Windows/AWS/Wokwi trong [chương49](../book/CHAPTER_49_OPERATOR_IRRIGATION_SESSION.md).
- [ ] Coordinator tự chuyển bước/multi-route, flow xuyên node và queue dispatch.

[Bàn giao V35](LOCAL_IRRIGATION_SESSION_REPORT.md).

## Bước V36 — lịch sử phiên tưới

- [x] Lọc thời gian tạo/nhánh/trạng thái, phân trang phạm vi và chi tiết mọi bước.
- [x] Phân biệt kết quả gửi/ACK, ledger khớp định nghĩa, GET không thay điều khiển.
- [x] UI/CSV chỉ dòng đã tải, kiểm thử DB/browser/full app/upgrade giữ dữ liệu.
- [ ] Bốn ca Windows/AWS/Wokwi [chương 50](../book/CHAPTER_50_IRRIGATION_SESSION_HISTORY.md).
- [ ] Coordinator nhiều nhánh, flow proof xuyên controller, queue dispatch.

[Bàn giao V36](LOCAL_SESSION_HISTORY_REPORT.md).

## Bước V37 — giám sát mưa và ánh sáng

- [x] WEATHER/v2 riêng, registry/two metrics/source/quality, history/CSV.
- [x] Form/dashboard nhãn mưa đúng, stale/fault/skew/API lỗi không coi là khô.
- [x] Project Wokwi riêng, native/ESP32/buildfs/merge, helper SDK giả lập.
- [x] DB/browser/app thật/upgrade/restart giữ dữ liệu, không command/run.
- [ ] Năm ca Windows/AWS/Wokwi [chương 51](../book/CHAPTER_51_WEATHER_NODE.md).
- [ ] Weather gate theo vùng/chính sách unknown/dispatch và hiệu chuẩn thật.

[Bàn giao V37](LOCAL_WEATHER_NODE_REPORT.md).

## Bước V38 — chốt mưa trước lượt tưới

- [x] Binding vùng→WEATHER/RAIN, source/calibration/revision, opt-in.
- [x] Unknown/fault/stale/rain chặn, ON kiểm tra lại và lưu admission evidence.
- [x] OFF độc lập; UI conflict/lost response GET-only, không gửi lại.
- [x] DB/browser/full app/upgrade/restart kiểm tra riêng, không AWS thật.
- [ ] Sáu ca live [chương52](../book/CHAPTER_52_ZONE_RAIN_GATE.md).
- [ ] Dừng liên tục khi thời tiết đổi sau admission; dự báo/hiệu chuẩn vật lý.
- [ ] A3 coordinator nhiều nhánh, flow proof xuyên node và queue dispatch.

[Bàn giao V38](LOCAL_ZONE_RAIN_GATE_REPORT.md).

## Bước V39 — dừng phiên theo thời tiết, opt-in

- [x] Flag/backend và policy riêng, mặc địnhfalse, không đổi hành vi vùng cũ.
- [x] Rain/unknown trong phiên có ON giữ một OFF request với evidence trước IO.
- [x] Concurrent/manual OFF/ON race, delayed dispatch, no replay/restart.
- [x] Lịch sử GET-only tách operation/command/physical OFF; UI giữ opt-in.
- [x] Backend/browser/scheduler-fake/full-app/upgrade/restart kiểm tra riêng.
- [ ] Sáu ca AWS/Wokwi [chương53](../book/CHAPTER_53_SESSION_WEATHER_STOP.md).
- [ ] Đa route, flow proof xuyên node, queue dispatch, dự báo/ET/nông học.

[Bàn giao V39](LOCAL_SESSION_WEATHER_STOP_REPORT.md).

## Bước V40 — nguồn nước sẵn sàng trước ON theo nhánh

- [x] Policy opt-in theo revision nhánh, LOW/source/calibration đúng binding.
- [x] EMPTY/unknown/fault/stale chặn create/OPEN/ON; dispatch recheck/evidence.
- [x] Generic/legacy không bypass; OFF/RESET/duplicate giữ semantics riêng.
- [x] UI conflict/readback/calibration, DB/browser/native/full-app/upgrade/restart.
- [ ] Sáu ca AWS/Wokwi [chương54](../book/CHAPTER_54_CIRCUIT_WATER_ADMISSION.md).
- [ ] Giám sát LOW/flow khi đang tưới, cross-controller proof, multi-route/queue.

[Bàn giao V40](LOCAL_CIRCUIT_WATER_GATE_REPORT.md).

## Bước V41 — giám sát nguồn nước trong phiên

- [x] stopOnUnavailable/flag opt-in, defaultfalse, giữ hành vi V40.
- [x] LOW false/unknown giữ một OFF/evidence trước IO trong phiên có ON.
- [x] Nước/mưa cạnh tranh một stop claim; manual/late dispatch/restart không replay.
- [x] UI/history GET-only, unknown-save so cả mode, DB/browser/scheduler/upgrade/restart.
- [ ] Sáu ca AWS/Wokwi [chương55](../book/CHAPTER_55_SESSION_WATER_STOP.md).
- [ ] Flow proof/grace xuyên controller, coordinator/multi-route/queue, nghiệm thu thật.

[Bàn giao V41](LOCAL_SESSION_WATER_STOP_REPORT.md).

## Bước V42 — giám sát FLOW sau ý định ON

- [x] Policy theo nhánh/current FLOW calibration, ngưỡng/grace và flag opt-in.
- [x] Mốc ON server, mẫu đo/nhận sau ON; grace đúng biên, unknown/low dừng.
- [x] Shared claim LOW/FLOW/mưa, evidence commit trước IO, không replay/resume.
- [x] UI cấu hình và history, exact readback khi PUT chưa rõ, không claim OFF.
- [x] 643backend,98browser,46unit/lint/build; scheduler/native fake transport,
  upgrade15bảng và full app/restart17bảng đã kiểm tra.
- [ ] Sáu ca live AWS/Wokwi chương56; hiệu chuẩn/physical branch flow proof,
  hysteresis, coordinator multi-route và queue dispatch chưa hoàn tất.

[Bàn giao V42](LOCAL_SESSION_FLOW_STOP_REPORT.md).

## Bước V43 — FIFO head sang PREPARED

- [x] Profile opt-in, TTL/revision/snapshot/boot/readiness và duration/grace kiểm tra lại.
- [x] Queue+session+link+manual hold atomic; idempotent, rollback, cancel race.
- [x] UI GET-only review, explicit prepare, pending UUID qua reload, exact readback,
  mở phiên liên kết; không auto OPEN/ON/next hoặc dùng queue cancel làm OFF.
- [x] 663backend/123browser/17parser,lintbuild; native/fake transport→DB,
  upgrade23bảng, full app/restart24bảng kiểm tra đạt.
- [ ] Sáu ca live chương57, auto coordinator/multi-route/queue dispatch và hardware acceptance.

[Bàn giao V43](LOCAL_QUEUE_SESSION_HANDOFF_REPORT.md).

## Bước V44 — tự khép một lần sau OFF

- [x] Opt-in từng phiên WAIT_OFF, freeze OFF/revision/boot, fixed15s; không ON/OPEN/next.
- [x] OFF ACK+status trước một CLOSE; CLOSE ACK+CLOSED status trước FINISH/COMPLETE.
- [x] Identity/action commit trước IO, callback chống supersession, pause/manual/restart,
  deadline/uncertain và startup-ready guard; không replay/resume.
- [x] UI pending qua reload, GET readback chính xác, lịch sử và back navigation.
- [x] 688backend/131browser/17parser/lint/build/native; scheduler fake IO→DB,
  upgrade24bảng, full app/completed fixture restart25bảng đối chiếu.
- [ ] Sáu ca live chương58, tự điều phối toàn chu kỳ/multi-route/queue và hardware acceptance.

[Bàn giao V44](LOCAL_SESSION_CLOSURE_REPORT.md).


## Báo cáo lượng nước phiên — schema V44, 21/10/2026

- [x] GET-only config gốc, server ON→OFF đầu tiên, ledger/ACK đúng identity/boot.
- [x] FLOW estimate/coverage/exclusions/calibration groups, unknown khác measured0.
- [x] On-demand UI/CSV, exact microsecond scope, abort stale response và recovery API.
- [x] 705backend/128browser/26parser/lintbuild, full app/read-only giữ53bảng; restart52bảng giữ nguyên, rule chỉ epoch+1/pause.
- [ ] Năm ca live chương59; daily rollup/volume stop/physical allocation/coordinator.

[Bàn giao](LOCAL_SESSION_WATER_USAGE_REPORT.md).


## V45 — lịch tưới theo vùng lập queue

- [x] Weekly UTC+7,1–10s,8dòng tối đa, revision/review và frozen binding.
- [x] Queue-only occurrence/link/cursor atomic, unique due, no startup/gap catchup.
- [x] Skip config/full/waiting, disable không cancel; không session/MQTT.
- [x] UI pending reload/GET readback, 731backend/84browser/12parser/lintbuild, real clock/DB.
- [ ] Sáu ca live chương60, coordinator toàn chu kỳ/multi-route/auto queue/physical acceptance.

[Bàn giao](LOCAL_ZONE_QUEUE_SCHEDULE_REPORT.md).
