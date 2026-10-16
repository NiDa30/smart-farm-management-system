# Bàn giao — lịch sử phiên tưới V36

Ngày 16/10/2026, giờ Việt Nam. Nền `1c14b3b` trên nhánh
`feat/day1-iot-foundation`. [Chương 50](../book/CHAPTER_50_IRRIGATION_SESSION_HISTORY.md).

## Thay đổi

- V36 thêm identity phân trang và index vào session/action, giữ nội dung V35.
- API GET `/api/v1/irrigation-session-history`: giờ tạo `[from,to)` tối đa
  31 ngày, nhánh tùy chọn, ALL/UNFINISHED/CLOSED/RECOVERY, limit 1–100.
- GET `/{circuitId}/{sessionId}/steps`: tất cả bước theo trang, không giới
  hạn ở 20 bước hoặc chỉ các UUID cuối còn trong session. Không phụ thuộc
  registry/profile hiện tại; giữ config snapshot gốc.
- Transaction read-only/repeatable-read cho mỗi request. Ceiling identity
  và cursor scope chống ghép endpoint/bộ lọc/phiên. Không tuyên bố snapshot
  xuyên các trang: phase/ACK và transaction đến muộn vẫn có thể đổi kết quả.
- Lệnh được đối chiếu UUID **và định nghĩa** đã giữ, không nhận ledger của
  yêu cầu khác trùng UUID. RETURNED/result ban đầu tách ledger ACK hiện tại.
  FINISH không command; ledger thiếu để null. Van không có giờ nhận ACK
  thì không tạo giờ/GPIO; OFF route-free có thể ACK từ boot mới.
- Web từ danh sách nhánh: lịch sử mọi phiên hoặc từng nhánh, filter, chi
  tiết, tải thêm và hai CSV riêng. Abort/version chống stale filter/detail;
  cursor/ceiling/order/duplicate kiểm tra trước ghép. Revision đổi khi tải
  thêm bước yêu cầu đọc lại. CSV giữ readAt của từng trang, chỉ xuất các
  dòng đã tải, UTF-8 BOM/quote/formula guard. Lỗi tải chặn CSV tương ứng.
- Không thay dispatch, firmware, contract MQTT, IAM hoặc provisioning.
  Không auto retry/replay, force-unlock, worker, queue dispatch hoặc A3 live.

## Kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Backend toàn bộ PostgreSQL test | 512 đạt, 0 fail/error/skip; 15 mới |
| Browser nhánh cuối | 75 đạt; 62 hồi quy + 13 mới |
| Unit parser/CSV lịch sử | 10 đạt, không skip |
| Lint/build | Đạt; cảnh báo Vite cũ còn |
| V35 → V36 và migrate lần hai | 11 bảng cũ giữ nguyên nội dung, lần hai no-op |
| Startup JVM với fixture cũ | Closed giữ nguyên; active recovery tăng revision, không replay |
| App thật/menu/chi tiết/hai CSV/nhánh khác | Đạt, GET-only, 0 ngoại mạng/page error |
| GET trước/sau | 11 bảng bằng nhau |

Lượt targeted backend đầu lỗi compile do literal int cho Long trong test
HttpIntent; sửa `1L`, 15 ca targeted và 512 toàn bộ cuối đạt. Lượt browser
toàn bộ đầu 74/75 đạt, một assertion tìm exact đoạn văn thiếu câu tiếp theo;
snapshot đã hiện đủ hai bước. Sửa selector, 13 mới và toàn bộ 75 cuối đạt.
Không skip, giảm assertion, thay fixture thành trivial pass hoặc cộng các
lượt chạy vào số test. Full backend chỉ chạy một lượt cuối.

Log tại `/tmp/session-history-backend-targeted.log`, `-backend-final.log`,
`-browser-final.log` (lượt có selector lỗi), `-browser-fixed.log` (13 mới),
`-browser-last.log` (75 cuối), `-unit.log`, `-lint-final.log`, `-build.log`.

## Runtime và dữ liệu giữ lại

Giữ `smartfarm-cloud-test` loopback 55439, database/user `smartfarm_test`,
schema fixture **irrigation_session_smoke**. Không tác động demo 5433/volume
hoặc schema cũ khác; test suite dùng riêng telemetry_test. Fixture công khai
V35: PC1/PC2, PZONE1/2, IRRIGATION18/19, VALVE18/19, PWATER, route bơm PC1.
Không reseed hay phát lại packet để làm mới dữ liệu.

`/tmp/session-history-v35-before.json` và `-v36-after.json`: 11 bảng bằng
nhau sau loại cột history_id mới. Flyway chạy riêng trước startup, không có
lifecycle service làm nhiễu phép so. `/tmp/SessionHistoryUpgrade.java` và
`-v35-upgrade.log`: upgrade đúng schema cố định, migrate lần hai không đổi.

`-after-startup.json`: 10 bảng khác giữ nguyên; session đã khép giữ nguyên;
session active chỉ đổi recovery/reason/stop/revision theo V35. Startup còn
có thể pause rule/invalidate HTTP intent, không tuyên bố toàn DB byte-equal.
`-after-readonly.json`: GET list/detail giữ nguyên 11 bảng sau startup.

Backend 8080 vẫn dùng `/tmp/run-irrigation-session-backend.sh`, starter
`/tmp/start-irrigation-session-backend.py`, PID/log prefix
`/tmp/irrigation-session-backend`. Kiểm tra cmdline đúng JAR **và schema**
trước stop PID. JAR được rebuild sau stop tiến trình thuộc task; startup
preflight đã đạt. MQTT=false, không transport thực; session/control/fence/
route/circuit-demo true cho fixture, legacy/monitor false. Không chạy script
Windows trong cloud vì script đó dùng AWS thật trên máy người dùng.

Đọc lại ứng dụng, không ghi:

```bash
CHROMIUM_PATH=/usr/bin/chromium python3 tools/frontend/smoke_session_history.py
```

Script dùng evidence công khai V35 `/tmp/irrigation-session-evidence.json`,
đi menu thật, xem hai phiên cũ, đủ năm bước, CSV và PC2 rỗng; guard chặn
API write và ngoại mạng. Output `/tmp/session-history-full-app.log` và PNG.
Không seed, sửa timestamp hoặc ghi DB. Dữ liệu cũ có thể hết cửa sổ UI 31
ngày; không replay fixture khi đó. Bản gốc/evidence trước đều được giữ.

## Phần chưa làm

Bốn ca Windows/AWS/Wokwi ở chương 50 **Chưa chạy**. Không nghiệm thu GPIO,
thủy lực, NVS retention hoặc broker thật trong đợt này. Lịch sử không đo
thời gian chạy, lít hoặc lượng chia từng cây. Không audit chuyển phase từng
sự kiện hoặc user identity: dữ liệu phase là bản ghi lúc đọc. Chưa retention/
delete policy. Coordinator tự chuyển bước/route nhiều nhánh, flow proof và
queue dispatch vẫn để các đợt sau; không đánh dấu A3 hoàn tất.

Kiểm tra 539 liên kết Markdown tương đối trong tài liệu project: không thiếu đích; `git diff --check` đạt. Không tính README trong cache dependency firmware.
