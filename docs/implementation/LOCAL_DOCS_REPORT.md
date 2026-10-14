# Báo cáo rà soát tài liệu local — 14/10/2026

## Bàn giao cuối phiên để tiếp tục lần sau

### Mục tiêu, phạm vi và trạng thái Git

Mục tiêu được giao: hoàn thiện tài liệu đợt tưới tự động V10 theo báo cáo code
đã bàn giao, hướng dẫn Windows và mẫu ghi bằng chứng Wokwi; không suy luận
từ code đang sửa. Chỉ được ghi `docs/book/**` và báo cáo này. Đợt biên tập đã
hoàn thành; phần chưa xong là kiểm thử/nghiệm thu thực tế, không phải phần
tài liệu được tự ý mở rộng tiếp.

Đã kiểm tra trực tiếp trước khi ghi bàn giao:

- Nhánh: `feat/day1-iot-foundation`.
- HEAD/commit nền: `943d22a2f1d7d56a84ca6fd6a0a8287af2554b50`.
- Báo cáo code dùng: `docs/implementation/LOCAL_CODEX_REPORT.md`, SHA256
  `B2108B77A49429FD13B33798878394D9DACEECEC9E1B9C8F262BCEE436A9B936`;
  vẫn khớp bản có mục theo dõi nhóm 1 đã đọc. Không sửa báo cáo code.
- Chưa commit/push, không stage/reset/clean/stash hoặc hoàn tác thay đổi.

Snapshot `git status --short` tại bàn giao (M: modified, D: Git báo deleted,
??: untracked; không kết luận quyền sở hữu hoặc hoàn tất từ ký hiệu này):

```text
 M backend/mvnw.cmd
 M backend/src/main/java/vn/smartfarm/iot/automation/RuleScheduler.java
 M backend/src/main/java/vn/smartfarm/iot/automation/WateringRule.java
 M backend/src/main/java/vn/smartfarm/iot/control/PumpController.java
 M backend/src/main/java/vn/smartfarm/iot/control/PumpService.java
 M backend/src/test/java/vn/smartfarm/iot/telemetry/PumpControlTest.java
 M backend/src/test/java/vn/smartfarm/iot/telemetry/WateringRuleTest.java
 M docs/book/BOOK_OUTLINE.md
 M docs/book/BUILD_JOURNAL.md
 M docs/book/CHAPTER_08_LOCAL_DATABASE_API.md
 M docs/book/CHAPTER_09B_SENSOR_AREAS.md
 M docs/book/CHAPTER_09_REALTIME_FRONTEND.md
 M docs/book/CHAPTER_10_WOKWI_RELAY_CONTROL.md
 M docs/book/CHAPTER_11_SENSOR_HISTORY.md
 M docs/book/CHAPTER_12_SENSOR_ALERTS.md
 M docs/book/CHAPTER_13_AUTOMATIC_WATERING.md
 M docs/book/README.md
 M docs/book/TROUBLESHOOTING.md
 D firmware/esp32/data/.gitkeep
 M firmware/esp32/wokwi.toml
 M package-lock.json
 M package.json
 M src/modules/iot/automation/AutomationManager.tsx
?? backend/src/main/java/vn/smartfarm/iot/automation/RuleStartup.java
?? backend/src/main/resources/db/migration/V10__watering_sample_identity.sql
?? docs/book/ACCEPTANCE_STATUS.md
?? docs/book/WINDOWS_RUNBOOK.md
?? docs/book/WOKWI_AUTOMATION_TEST_LOG.md
?? docs/implementation/LOCAL_CODEX_REPORT.md
?? docs/implementation/LOCAL_DOCS_REPORT.md
?? playwright.automation.config.ts
?? react-example@0.0.0
?? tools/tests/automation-fixture-server.mjs
?? tools/tests/automation.browser.spec.ts
?? tools/tests/fixtures/
?? tsc
```

Các file code/package/browser-test mới xuất hiện là công việc ngoài phạm vi
của phiên tài liệu, giữ nguyên và chưa đọc nội dung. Không suy ra browser tests
đã chạy hoặc đạt từ sự tồn tại của các file này. Báo cáo code đã đọc chưa ghi
browser/E2E automation mới; cần bản bàn giao tiếp theo để cập nhật kết luận.

### Đã xong và còn dở

Đã xong: rà soát sách ở các lượt trước; chương 13 phản ánh mẫu khô liên tiếp,
mẫu ướt reset count, SENT/PUBACK khác ACK thực thi, status OFF mới, không retry
ON khi publish chưa rõ và startup pause. Runbook tách shell/terminal, dùng Git
Bash mới tránh biến DB test; V10 local không cần pull/reset/build firmware/đổi
IAM. Nhật ký đủ sáu ca yêu cầu, có thao tác/kỳ vọng/ô bằng chứng và toàn bộ
thực tế “Chưa chạy”. Giữ các phần agent khác đã viết.

Còn dở: nghiệm thu AWS/Wokwi thật cho ON sau hai mẫu khô, OFF sớm, timer
20 giây, cooldown 60 giây, manual hold và restart backend giữa run. Chưa có
bằng chứng mới để điền kết quả thực tế. NVS và phục hồi mạng để sau; restart
simulator mất RAM. Người dùng đã xác nhận cảnh báo đất thấp/nhiệt độ cao
mở/đóng đúng ngưỡng; không dùng xác nhận đó thay nghiệm thu tưới.

### Lệnh kiểm tra và kết quả

Phiên tài liệu đã chạy `git branch --show-current`, `git rev-parse HEAD`,
`git status --short`, `Get-FileHash -Algorithm SHA256` trên báo cáo code.
Các kết quả nhánh/HEAD/hash được ghi ở trên; Git có cảnh báo thư mục firmware.

Lượt hoàn thiện đã chạy:

```text
git diff --check -- docs/book/CHAPTER_13_AUTOMATIC_WATERING.md docs/book/WINDOWS_RUNBOOK.md docs/book/WOKWI_AUTOMATION_TEST_LOG.md docs/implementation/LOCAL_DOCS_REPORT.md
```

Đạt, exit code 0. Script PowerShell resolve các link Markdown tương đối trong
bốn file này kiểm tra 21 liên kết, không thiếu đích. Lượt trước kiểm tra toàn
sách và báo cáo: 59 liên kết, không thiếu. Không chạy lại build/tests code.

Kết quả lịch sử lấy từ báo cáo code, không phải phiên tài liệu chạy:

- `./mvnw.cmd -B verify`: audit DB test riêng đạt 41 backend tests, 0 skip.
- `node --import tsx --test src/modules/iot/realtime/telemetryApi.test.ts`:
  3 test đạt, 0 skip; không phải browser/E2E automation.
- `npm.cmd run lint` và `npm.cmd run build`: đạt theo báo cáo; cảnh báo build
  sẵn có về `__dirname` và bundle lớn.
- Helper backend demo sau đó tự verify: 4 test chạy đạt, 37 skip vì không có
  biến DB test trong môi trường demo. Không gọi lượt này là 41/41; artifact
  Surefire bị ghi lại không thay kết quả audit lịch sử.

### Lỗi còn gặp, terminal khác và bước tiếp theo

Git vẫn cảnh báo không mở được `firmware/esp32/data/`; không mở thư mục,
đổi ACL hoặc phục hồi `.gitkeep` theo ký hiệu D. Nguyên nhân clock chậm,
startup backend cũ và gateway/DNS trong lịch sử chưa đủ bằng chứng kết luận.

Terminal Codex khác phụ trách code/tests quy tắc tưới; snapshot hiện có thêm
PumpController/package/browser-test files đang thay đổi. Không sửa, chạy hoặc
hoàn tác công việc đó. Theo báo cáo code đã đọc, backend 8080/frontend 3000
được giữ chạy; gateway 9011 chưa thấy và `wokwigw` chưa có trên PATH của shell
agent. Đây là trạng thái tại thời điểm báo cáo, không phải kiểm tra tiến trình
mới của phiên tài liệu. Không tự dừng/restart hoặc tạo backend trùng.

Bước tiếp theo cụ thể khi người dùng yêu cầu tiếp tục:

1. Đọc báo cáo code bàn giao mới, so hash/phạm vi thay đổi; kiểm tra Git trước
   khi chỉnh. Đối chiếu kết quả browser/E2E nếu có, không suy ra từ source/file.
2. Kiểm tra terminal hiện có cùng người phụ trách demo; giữ frontend/backend/
   gateway riêng, đảm bảo telemetry và OFF fresh, rule tắt trước khi thử.
3. Người dùng thực hiện sáu ca trong `WOKWI_AUTOMATION_TEST_LOG.md`; ghi UTC,
   commandId/run ID, ACK/status boot/sequence và GPIO/serial đã che thông tin
   riêng. Chỉ điền kết quả có bằng chứng; tắt rule, xác nhận OFF sau demo.
4. Đối chiếu bằng chứng với bản bàn giao tương ứng rồi cập nhật trạng thái
   nghiệm thu, kiểm tra link và diff trong phạm vi tài liệu được giao.

Ràng buộc tiếp tục: không đọc/lưu secrets, config riêng, envfile hoặc flash
image; không sửa code/tests/migrations/`LOCAL_CODEX_REPORT.md`; không chạy lại
build/tests khi chưa được giao; không `docker compose down -v`; không tự đánh
dấu live PASS, commit/push hoặc mở task tiếp theo. Phiên này dừng sau báo cáo.

## Hoàn thiện đợt tưới hiện tại

Đối chiếu phần bàn giao đã đọc với phiên bản báo cáo code SHA256
`B2108B77A49429FD13B33798878394D9DACEECEC9E1B9C8F262BCEE436A9B936`
(bản 19681 byte, có mục “Theo dõi phép thử nhóm 1 — 14/10/2026, 00:49 +07”).
Báo cáo không đổi so với cuối lượt trước. Không đọc code đang sửa; không chạy
lại build/tests. Giữ các mục lịch sử của báo cáo tài liệu bên dưới.

Chỉ sửa thêm trong lượt hoàn thiện này:

- `CHAPTER_13_AUTOMATIC_WATERING.md`: chỉnh câu ghi bằng chứng local, ghi rõ
  LED bật là kỳ vọng và cần ACK EXECUTED SUCCESS/ON.
- `WINDOWS_RUNBOOK.md`: database demo đã có, không chạy lại helper khởi tạo;
  kiểm tra terminal hiện có trước khi mở backend để tránh chạy trùng; sắp
  thứ tự tắt quy tắc/xác nhận OFF trước khi dừng tiến trình.
- `WOKWI_AUTOMATION_TEST_LOG.md`: ghi rõ tên ca manual hold. Sáu ca yêu cầu
  đã có thao tác, kỳ vọng, thực tế, thời điểm, ID và ô bằng chứng; không tạo
  thêm ca/chương trong lượt này, giữ toàn bộ thực tế là “Chưa chạy”.
- `LOCAL_DOCS_REPORT.md`: ghi nguồn, phạm vi hoàn thiện và phần chờ đối chiếu.

Còn chờ đối chiếu sau bàn giao code: bằng chứng thực tế của sáu ca ON sau
hai mẫu khô, OFF sớm, timer 20 giây, cooldown 60 giây, manual hold và restart
backend giữa run. Nếu có bản bàn giao mới, đối chiếu lại ACK/status mới,
tracking run chưa kết thúc và startup pause theo báo cáo mới trước khi cập
nhật kỳ vọng. Không suy ra live PASS từ 41 test backend + 3 test telemetry
frontend; chưa có browser/E2E automation mới hoặc nghiệm thu AWS/Wokwi thật.

Không sửa code/tests/migrations hoặc báo cáo code, không đọc secrets, không
commit/push; giữ thay đổi có sẵn của agent khác. Đợt tài liệu này kết thúc sau
kiểm tra liên kết và diff, không mở công việc tiếp theo.

Kết quả kiểm tra lượt hoàn thiện: 21 liên kết nội bộ trong bốn file của lượt
này có đích tồn tại; `git diff --check` trong cùng phạm vi đạt. SHA256 báo cáo
code ở cuối lượt vẫn khớp bản đã dùng nêu trên.

## Lượt tiếp theo — cập nhật theo bản bàn giao V10

Đã đọc năm file người dùng chỉ định, gồm `LOCAL_CODEX_REPORT.md`; quyền đọc
báo cáo code được cung cấp trong nhiệm vụ này. Không sửa báo cáo code hoặc
đọc source đang sửa để suy luận hành vi. Các phần phía dưới giữ lại lịch sử
lượt biên tập trước, khi chưa đọc báo cáo code.

Phiên bản báo cáo code đã dùng: “Báo cáo Codex local — quy tắc tưới ENV01 →
PUMP01”, ngày 14/10/2026, HEAD nền được báo cáo là
`943d22a2f1d7d56a84ca6fd6a0a8287af2554b50`. File dài 17443 byte,
LastWriteTimeUtc `2026-10-13T17:42:18Z`; SHA256:
`A1A7E85E01DD7E8676D2E00E0933C64ED641C9A253894CE8074A9D89DA60949A`.
Đây là dấu nhận diện báo cáo, không phải commit mới của bản V10.

Báo cáo code đổi trong lúc biên tập: lần kiểm tra tiếp theo có SHA256
`B2108B77A49429FD13B33798878394D9DACEECEC9E1B9C8F262BCEE436A9B936`,
19681 byte, LastWriteTimeUtc `2026-10-13T17:50:42Z`. Đã đọc phần bổ sung
“Theo dõi phép thử nhóm 1 — 14/10/2026, 00:49 +07” và đối chiếu các dòng
liên quan. Chương V10 dùng bản đầu làm nguồn hành vi; bản sau làm nguồn ghi
chú runtime: backend đã áp dụng V9→V10, API rule tắt, nhưng status cũ/UNKNOWN,
chưa bật rule hoặc gửi ON/OFF. Không suy luận từ source đang sửa.

Phần bổ sung ghi helper verify chạy 4 test đạt, 37 skip, khác lượt audit
41/41 không skip và 3 test telemetry frontend đã ghi trước đó. Không dùng
artifact Surefire bị helper ghi lại để thay kết quả lịch sử. Chưa có browser/E2E
automation mới hoặc nghiệm thu tưới AWS/Wokwi thật; nhật ký mới vẫn “Chưa chạy”.

File sửa trong lượt này:

| File | Nội dung |
|---|---|
| `docs/book/CHAPTER_13_AUTOMATIC_WATERING.md` | Bàn giao V10: mẫu khô liên tiếp, mẫu ướt reset count; SENT/PUBACK khác ACK thực thi; OFF cần status mới; uncertain publish không retry ON; startup pause, không replay ON; kết quả tests chính xác |
| `docs/book/WOKWI_AUTOMATION_TEST_LOG.md` (mới) | Sáu ca bắt buộc và ca mẫu ướt xen giữa; thao tác, kỳ vọng, thực tế “Chưa chạy”, thời điểm, ID và bằng chứng |
| `docs/book/WINDOWS_RUNBOOK.md` | Git Bash mới tránh biến DB test; lệnh backend demo bật control; code local, không pull/reset/build firmware/đổi IAM; terminal riêng, tắt rule và không down -v |
| `docs/book/ACCEPTANCE_STATUS.md` | 41 test backend + 3 test telemetry frontend; chưa browser/E2E automation mới, chưa nghiệm thu AWS/Wokwi thật |
| `docs/book/README.md` | Liên kết nhật ký kiểm thử mới |
| `docs/implementation/LOCAL_DOCS_REPORT.md` | Dấu nhận diện nguồn, phạm vi thay đổi và bàn giao lượt này |

Các thay đổi code/tests/migrations và tài liệu có sẵn của agent khác được giữ.
Không commit/push, reset/clean/stash; không đọc secrets hoặc chạy demo/tests.
Số tests lấy từ báo cáo bàn giao, không phải kết quả chạy mới của lượt tài liệu.

Còn cần xác nhận: toàn bộ kết quả thực tế trong nhật ký Wokwi, GPIO/timing
20 giây, cooldown từ OFF được xác nhận, ACK/status và run history, tắt thủ
công, restart tiến trình backend giữa run thật. Test startup hook trên DB test
không thay thế kill/restart tiến trình trong lúc GPIO ON. Ca mẫu trung gian
và publish/ACK bất thường đã có test mock, chưa được coi là nghiệm thu live.
NVS, phục hồi mạng và giới hạn crash giữa gửi command và ghi run còn cần theo dõi.

Tóm tắt bàn giao lượt này: sách đã đồng bộ với báo cáo V10; local đạt 41 test
backend và 3 test telemetry frontend, không có browser/E2E automation mới.
AWS/Wokwi thật chưa nghiệm thu. Code nằm local, không cần pull/reset, build
firmware hoặc đổi IAM. Backend demo dùng Git Bash mới; giữ ba terminal riêng,
tắt rule và xác nhận OFF sau demo, không xóa volume. Nhật ký mới để tất cả
kết quả thực tế “Chưa chạy”; không tự đánh dấu PASS.

Kiểm tra cuối lượt: 59 liên kết Markdown nội bộ trong sách và báo cáo này
resolve tới file tồn tại, không có đích thiếu; `git diff --check -- docs/book
docs/implementation/LOCAL_DOCS_REPORT.md` đạt. Không kiểm chứng website ngoài.

## Phạm vi và kiểm tra đầu vào

Đã kiểm tra Git trước khi sửa. Không tìm thấy `AGENTS.md` tại gốc workspace,
các thư mục cha đã kiểm tra hoặc trong `docs`; `.agents` và `.codex` không có
trong workspace. Tìm kiếm toàn repository gặp Access denied ở thư mục dữ liệu
firmware; không tiếp tục mở thư mục đó hoặc thay ACL. Git cũng cảnh báo không
mở được `firmware/esp32/data/`.

Đầu phiên đã có thay đổi code/tests, cấu hình Wokwi và ba tài liệu
`BUILD_JOURNAL.md`, `CHAPTER_13_AUTOMATIC_WATERING.md`, `TROUBLESHOOTING.md`.
Giữ các phần có sẵn trong ba file đó; chỉ thêm ghi chú và phần tổng hợp riêng.
Không đọc code đang sửa để suy ra hành vi mới. Không sửa code, tests, cấu hình,
migrations hoặc `LOCAL_CODEX_REPORT.md`; không commit/push, reset, clean, stash.
Không mở secrets, credentials, private flash image hay envfile.

## File tài liệu đã sửa

Tất cả đường dẫn dưới đây ở `docs/book/`:

| File | Nội dung bổ sung/chỉnh sửa |
|---|---|
| `README.md` | Liên kết hướng dẫn Windows và bảng nghiệm thu cho người mới |
| `BOOK_OUTLINE.md` | Làm rõ trạng thái lịch sử của dàn ý, liên kết trạng thái hiện tại |
| `WINDOWS_RUNBOOK.md` (mới) | PowerShell/Git Bash, thư mục làm việc, database Healthy, ba terminal riêng frontend/backend/gateway, API và cách dừng giữ dữ liệu |
| `ACCEPTANCE_STATUS.md` (mới) | Phân biệt user-reported, tests giả lập, phạm vi AWS/Wokwi còn chờ; danh sách bằng chứng cần thu cho automation |
| `CHAPTER_08_LOCAL_DATABASE_API.md` | Thêm khoảng trắng trong câu và số liệu, giữ nguyên lệnh/identity/payload |
| `CHAPTER_09_REALTIME_FRONTEND.md` | Chỉnh khoảng trắng, bỏ lệnh pull trong bước chạy song song, làm rõ xác nhận người dùng và các ca live chưa xác nhận riêng |
| `CHAPTER_09B_SENSOR_AREAS.md` | Chỉnh khoảng trắng, dùng bản bàn giao thay lệnh pull khi agent khác đang sửa |
| `CHAPTER_10_WOKWI_RELAY_CONTROL.md` | Dẫn xác nhận ON/OFF/timer trong nhật ký; giới hạn clock/reconnect, restart mất RAM và NVS chưa làm |
| `CHAPTER_11_SENSOR_HISTORY.md` | Chỉnh khoảng trắng, phân biệt xác nhận trang lịch sử với CSV live còn chờ |
| `CHAPTER_12_SENSOR_ALERTS.md` | Xác nhận mở/đóng đúng ngưỡng, bảng ngưỡng, các bước thực hành, tách cảnh báo khỏi tưới tự động |
| `CHAPTER_13_AUTOMATIC_WATERING.md` | Thêm ghi chú code đang sửa, chưa nghiệm thu đầy đủ; giữ phần audit có sẵn |
| `BUILD_JOURNAL.md` | Thêm mốc biên tập và xác nhận cảnh báo, giữ nhật ký cũ |
| `TROUBLESHOOTING.md` | Bảng tổng hợp Python/botocore, IAM, LittleFS, RetainPublish, CLOCK_SKEW, Docker/WSL, ECONNREFUSED và gateway/DNS với giới hạn bằng chứng |

Ngoài sách, tạo báo cáo này tại `docs/implementation/LOCAL_DOCS_REPORT.md`.

## Những thông tin còn cần xác nhận

- Nghiệm thu tưới tự động đầy đủ sau khi agent code bàn giao: mẫu khô/ướt,
  ACK thực thi, status, GPIO, run history, cutoff, nghỉ, manual và restart.
- Nguyên nhân clock Wokwi chậm; nguyên nhân backend startup thất bại cần stack
  trace; nguyên nhân MQTT errno=119 và DNS/Wi-Fi không phục hồi chưa xác định.
- Bước WSL/PATH cụ thể đã giải quyết lỗi Docker; nguyên nhân lần IAM retry
  vẫn deny. Không kết luận do propagation hoặc một bản sửa cụ thể khi thiếu log.
- CSV live, các ca stale/outage/recovery, giữ dữ liệu/chống trùng sau restart,
  runtime timer 60 phút và multi-device live chưa có xác nhận riêng đầy đủ.
- NVS chưa làm; reconnect không reboot và lưu/gửi đủ lý do offline chưa nghiệm thu.

## Các liên kết tài liệu đã kiểm tra

Kiểm tra các liên kết Markdown tương đối trong toàn bộ sách bằng cách resolve
đường dẫn và xác nhận file tồn tại. Không mở nội dung secrets hoặc truy cập
AWS/Wokwi; không kiểm chứng lại nội dung website bên ngoài.

- [Mục lục sách](../book/README.md), [dàn ý](../book/BOOK_OUTLINE.md),
  [nhật ký](../book/BUILD_JOURNAL.md), [sổ lỗi](../book/TROUBLESHOOTING.md).
- [Windows](../book/WINDOWS_RUNBOOK.md),
  [nghiệm thu](../book/ACCEPTANCE_STATUS.md), các chương 8, 9, 9B, 10, 11, 12, 13
  được liên kết từ mục lục: đích tồn tại.
- [Runbook backend](LOCAL_TELEMETRY_BACKEND.md),
  [kế hoạch MVP](ONE_WEEK_SMART_FARM_MVP_PLAN.md), [checklist](MVP_CHECKLIST.md):
  đích tồn tại. `LOCAL_CODEX_REPORT.md` được agent khác tạo trong lúc rà soát;
  chỉ kiểm tra đích liên kết tồn tại, không đọc hoặc sửa báo cáo đó.

`git diff --check` trong phạm vi sách đạt. Không chạy build/tests vì chỉ chỉnh
tài liệu; kết quả kiểm tra trong sách là bằng chứng lịch sử, không phải kết quả
chạy mới của phiên này. Các lệnh Windows mới tổng hợp từ workflow đã ghi nhận,
chưa chạy lại để nghiệm thu trong phiên biên tập.

## Tóm tắt chuyển cho trợ lý theo dõi dự án

Đã rà soát sách, thêm hướng dẫn Windows với ba terminal riêng và bảng bằng
chứng. Người dùng xác nhận cảnh báo đất thấp `<30%`/`>=35%`, nhiệt độ cao
`>35°C`/`<=33°C` mở/đóng đúng. Automation đang được agent code sửa và chưa
nghiệm thu đầy đủ AWS/Wokwi thật. Tests mock/fixtures không thay thế nghiệm
thu live. Restart simulator mất RAM; NVS và phục hồi mạng chưa hoàn tất.
Các nguyên nhân CLOCK_SKEW, startup backend và gateway/DNS chưa có bằng chứng
để kết luận. Chỉ sửa sách/báo cáo tài liệu, giữ công việc agent khác, chưa commit.
