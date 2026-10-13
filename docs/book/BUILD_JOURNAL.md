# Nhật ký xây dựng Smart Farm

## Windows frontend — người dùng xác nhận chạy thành công

Sau cập nhật Sensor Realtime dùng API, người dùng báo “đã chạy thành công”.
Ghi nhận frontend local hoạt động theo xác nhận này; API live đã có bằng chứng
ở mốc trước. Chưa có kết quả riêng cho sensor variation, Stop Wokwi→stale,
backend outage→error và recovery trên Windows; không coi tất cả đã nghiệm thu.
Các trạng thái đó đã được kiểm tra bằng browser fixtures trong cloud. Tiếp theo
là command/ACK/an toàn relay theo kế hoạch; chưa có điều khiển actuator live.

## 13/10/2026 — React Sensor Realtime dùng API backend

Thay màn hình HiveMQ trực tiếp bằng latest/history API PostgreSQL; ba card
nhiệt độ/độ ẩm/đất, timestamp nguồn/receivedAt, trạng tháifresh/stale/empty/error
và history15 readings. Bỏ controls browser publish mock và guide HiveMQ cũ
trong màn hình này; không thay đổi dependency declarations/lockfile ở bước này.
Vite proxy/api→127.0.0.1:8080. Poll5 giây sau request, timeout8 giây, abort
unmount; clock freshness30 giây; không đồng nhất freshness với LWT/online.

Lint/build đạt,3 Node/tsx tests đạt. Browser fixture scenarios fresh/stale/503
cached/invalid/empty/recovery/dedup đạt, không page errors. Lỗi smoke glob đầu
không bắt /latest được sửa trong harness rồi chạy lại. Proxy thật đến app/DB
trống trả history[]/latest404 đúng. Cloud MQTT disabled, frontend live Windows
chưa xác nhận. Thêm chương9; các màn hình/topbar khác vẫn có mock. Không claim
WebSocket push hoặc full dashboard đã chuyển sang dữ liệu thật.

## 13/10/2026 — Windows live AWS → PostgreSQL → API xác nhận

Người dùng gọi GET /api/v1/devices/ENV01/telemetry/latest bằng curl --fail và
nhận reading id5, farmIdFARM001, deviceIdENV01, schemaVersion1, sequence15,
timestamp2026-10-13T09:06:14Z, temperature24, humidity40, soilMoisture100,
uptimeMs64419; receivedAt2026-10-13T09:06:19.775305Z. bootId có dạng UUID.
Đây là bằng chứng dữ liệu live qua ingest/storage/read API trên Windows theo
đầu ra người dùng; không phải fixture cloud. Chênh timestamp nguồn và receivedAt
khoảng5.775 giây trong sample, không coi là đo độ trễ mạng chuẩn vì clock và
simulation timing chưa được đối chiếu. Chưa có sample sau đổi sensor, history,
restart persistence hoặc frontend API integration từ người dùng.

## Windows PostgreSQL Healthy — Docker không còn chặn triển khai

Người dùng cung cấp output `docker compose --env-file .local/postgres/db.env
up -d --wait postgres`: image postgres:16-bookworm pulled, network và volume
được tạo, container smartfarm-mvp-postgres-1 Healthy. Xác nhận engine/Compose
hoạt động và database sẵn sàng trên Windows. Không có bằng chứng chính xác
người dùng đã dùng cách sửa WSL/PATH nào; không suy ra cách sửa cụ thể.
Tiếp theo chạy run_backend_windows.sh với Wokwi/gateway đang chạy và probe cũ
đã dừng, quan sát migration/subscription/TELEMETRY_SAVED, rồi gọi API latest.
Chưa có bằng chứng ingest hoặc API có dữ liệu trên Windows trong mốc này.

## 13/10/2026 — Docker Windows đang chặn triển khai; viết sách song song

Người dùng yêu cầu vừa làm vừa viết sách. Đã bắt đầu bản thảo chương8, dẫn chiếu
runbook, ghi lý do kiến trúc và các lỗi thực tế thay vì chỉ lưu checklist.
Docker installer báo thiếu Virtual Machine Platform, per-user installation
không bật được vì cần admin; đã hướng dẫn WSL/features/restart, chưa có output
xác nhận fix. Sau đó init database helper tạo private db.env thành công nhưng
Git Bash gọi docker ở đường dẫn per-user không tồn tại. Hướng dẫn reopen terminal,
hash-r, where.exe docker, thử Program Files PATH nếu đúng vị trí. Chưa xác nhận
Docker Client/Server hoặc container healthy trên Windows. Không cần tạo lại
db.env; chưa chạy được ingestion DB/API live ở máy người dùng.

## 13/10/2026 — PostgreSQL local, ingestion và read API

Người dùng xác nhận có Docker và cho phép tiếp tục implementation. Thêm
Compose PostgreSQL16 (loopback5433, volume giữ dữ liệu), password ngẫu nhiên
trong ignored private .local/postgres/db.env, Flyway V1, telemetry validator,
MQTT subscription liên tục, JDBC INSERT ON CONFLICT chống trùng và API
latest/history trên loopback8080. API chưa có authentication, chỉ cho local.
Validator từ chối trường lạ/thiếu, numeric coercion, UUID/time sai, số vượt range,
duplicate JSON keys và timestamp tương lai quá60 giây. History tối đa31 ngày,
limit1..1000, source-time ordering; device cố địnhENV01/FARM001.

Cloud Docker đã chạy PostgreSQL thật. Lần kiểm tra đầu tiên chạy khi image còn
đang tải nên test context lỗi Connection refused; chờ Compose healthy rồi chạy
lại đạt7 Java tests (0skip): 3validator, 3DB/API và 1probe config. Test DB ở schema
telemetry_test, gồm8 insert đồng thời cùng identity chỉ có1 reading. 10 Python
tests đạt sau bổ sung exact-topic subscribe trong renderer. App jar khởi động,
Flyway public migration đạt, HTTP history[] và latest404 đúng khi chưa có dữ
liệu. MQTT disabled trong cloud smoke vì không có credentials live tại đây.

Hướng dẫn Windows: docs/implementation/LOCAL_TELEMETRY_BACKEND.md; init helper
ghi LF để Git Bash source password không dính CR. Chạy DB healthy rồi
run_backend_windows.sh, không chạy song song probe cùng clientID. Người dùng
chưa chạy bản persistence trên Windows; AWS→PostgreSQL→HTTP live chưa xác nhận.
Queue128 là volatile, DB error/queuefull có thể mất gói và được log; PUBACK không
đảm bảo DB commit. Chưa claim durable replay/exactly-once, reconnect-outage
recovery, frontend realtime hoặc actuator ACK.

## 13/10/2026 15:27:46 (Việt Nam) — Gate kết nối 5 phút đạt

Người dùng cung cấp toàn bộ output Windows: PROBE_SECONDS=300, Maven verify
BUILD SUCCESS và 1 test đạt, WSS_PUBACK_ECHO_PASS, TELEMETRY_PACKETS=60,
exec BUILD SUCCESS sau khoảng 5:02 phút. Gate số lượng gói đạt ngưỡng 58.
Luồng simulator → AWS IoT → backend local được quan sát 5 phút. Probe hiện
đếm callback, không kiểm chứng uniqueness/schema hoặc tính tỷ lệ mất gói.
Không suy ra độ ổn định production hoặc full Day1 security-deny tests đã đạt.
Chưa có payload/biến thiên sensor được gửi lại. Bước kế tiếp: persistence
PostgreSQL local, validation/idempotency và API đọc telemetry, giữ cloud cost
thấp; chưa triển khai DB/API trong mốc này.

## 13/10/2026 15:20 (Việt Nam) — Backend nhận telemetry, probe ngắn đạt

Người dùng xác nhận JDK/javac Temurin 21.0.12.1. Khi tạo backend IAM inline
policy, UI báo exceeding limit với bản đầy đủ; hướng dẫn dùng policy tối thiểu
cho Connect backend client, Subscribe/Receive đúng ENV01 telemetry và echo,
Publish echo. Cần giữ quyền subscribe exact topic: dấu + trong IAM resource
không thay thế wildcard IAM để khớp subscription exact của probe. Runtime
quyền điều khiển pump chưa được xác nhận cấp trong policy tối thiểu.

Lần probe trước WSS echo đạt nhưng kết thúc Insufficient device telemetry;
không có số gói được gửi lại, nguyên nhân thiếu chưa xác định. Sau hướng dẫn
giữ Wokwi/gateway chạy và kiểm tra live data, người dùng chạy lại: build/test
backend đạt (1 test), WSS_PUBACK_ECHO_PASS, TELEMETRY_PACKETS=5 trong 30 giây,
Maven BUILD SUCCESS; kết thúc 15:20:54 GMT+7, runtime 32.966 giây. Không kết luận
chắc chắn lần lỗi trước do simulator dừng vì chưa có bằng chứng.

Mốc đã có bằng chứng: Wokwi → AWS IoT → backend local nhận gói. Chưa có
300-second observation, schema validation/unique counting trong Java probe,
persistence/UI/control/ACK end-to-end. Tiếp theo chạy probe default 300 giây,
threshold 58 gói; đếm packet không phải đầy đủ nghiệm thu dữ liệu.

## Chuyển sang backend — người dùng báo test đã hoàn tất

Người dùng nói đã test xong Wokwi/AWS và yêu cầu tiếp tục. Ghi nhận hoàn tất theo
lời người dùng; chưa có JSON hoặc số gói/5 phút được gửi, không tự điền bằng
chứng còn thiếu. Tiếp tục gate backend WSS/SigV4 đã có code. Chuẩn bị helper
Windows Git Bash kiểm tra JDK21, profile/account, endpoint rồi build và chạy
probe. Backend runtime IAM policy phải gắn riêng, không thay provisioning policy;
không tạo EC2/RDS. Chưa chạy live backend bằng credentials của người dùng.
Người dùng cho biết chưa cài/chưa biết JDK21; cần hướng dẫn cài và xác nhận
java/javac trước khi chạy helper Windows.

## Wokwi telemetry được broker xác nhận QoS1

Người dùng cung cấp serial log Wokwi lặp `Telemetry queued; wait for PUBACK`
và `MQTT QoS1 PUBACK received` sau sửa RetainPublish. Đây là bằng chứng runtime
publish và QoS1 acknowledgement; callback hiện không phân biệt ACK telemetry với
ACK status, nên không dùng tổng số PUBACK làm số telemetry. Chưa có payload từ
MQTT Test Client, thời gian phiên 5 phút, biến thiên sensor hoặc backend receive.
Tiếp theo subscribe ENV01/telemetry trên AWS, ghi sample đã làm sạch và quan sát
sensor thay đổi. Không tuyên bố toàn bộ Day 1/end-to-end đã hoàn thành.

## Xác nhận sửa RetainPublish thành công trên Windows

Sau khi thêm iot:RetainPublish cho ENV01/status và lưu policy version mới làm
active, người dùng chạy check_device_connection.py --with-will: endpoint/client
ID match, certificate pair loaded, TLS verified, MQTT CONNECT accepted (ENV01).
Lỗi CONNECT với retained LWT đã được giải quyết trong phép thử Windows; chưa có
log Wokwi sau sửa hoặc telemetry được quan sát ở AWS. Tiếp theo chạy lại
simulator, giữ gateway đang cấu hình nếu dùng private gateway, kiểm tra connected,
PUBACK và MQTT Test Client trong 5 phút. Không cần rebuild firmware cho policy.

## Last Will retained tái hiện lỗi, policy thiếu RetainPublish

Người dùng chạy probe --with-will trên Windows: TLS verified, rồi server đóng
trước CONNACK; probe không có will trước đó thành công. Device policy renderer
thiếu iot:RetainPublish trong khi firmware dùng retained LWT và retained status.
Bổ sung action giới hạn đúng topic smartfarm/FARM001/ENV01/status; kiểm tra
scope bằng test. Cần tạo version mới của IoT device policy và đặt default trên
AWS; đây không phải IAM policy smartfarm-dev. Script không tự sửa policy có sẵn
khác nội dung, nên cần cập nhật AWS trước khi retry provisioning. Chưa có kết quả
live sau sửa; chỉ kết luận lỗi retained CONNECT đã tái hiện và thiếu quyền được
xác định trong code, không tuyên bố Wokwi đã kết nối.

## MQTT lỗi vẫn còn sau thử gateway

Người dùng gửi log sau bước private gateway: Wi-Fi/NTP wait rồi MQTT receive
errno=119, connect failed lặp lại. Không xác nhận gateway là nguyên nhân hay
giải pháp. Probe Windows trước không có LWT; firmware có retained QoS1 LWT
trên ENV01/status. Bổ sung --with-will vào probe để đối chiếu CONNECT với LWT,
không publish telemetry/control; graceful DISCONNECT để tránh phát will khi
thành công. Nếu mạng ngắt bất thường sau CONNECT, AWS có thể phát OFFLINE will.
Chưa có kết quả chạy chế độ này; không kết luận lỗi authorization LWT.

## Chẩn đoán Windows TLS/MQTT thành công

Người dùng cung cấp output check_device_connection.py: endpoint/client ID match,
certificate/private key loaded, TLS handshake verified, MQTT CONNECT accepted
(ENV01), không publish. Xác nhận authentication CONNECT từ Windows bằng các
file hiện tại; không chứng minh quyền publish/LWT hoặc Wokwi TLS đã đúng.
Hướng chẩn đoán tiếp: dùng private Wokwi gateway qua mạng Windows đã hoạt động,
so sánh với đường mạng simulator hiện tại. Đây là phép thử, chưa kết luận public
gateway là nguyên nhân. README chính thức wokwi/wokwigw xác nhận chạy wokwigw
và cấu hình [net] gateway="ws://localhost:9011" cho VS Code. Không cần bridge
mode/TAP driver. Nếu vẫn lỗi, kiểm tra sự khác biệt MQTT CONNECT/LWT trong
firmware so với probe không có LWT.

## Wokwi mount/ready, MQTT connect bị ngắt

Người dùng cung cấp log: LittleFS mounted, AWS endpoint configured, Wi-Fi and
time ready, sau đó MQTT transport_read errno=119 và connect failed. Certificate
Active được xác nhận qua ảnh; người dùng báo client ID/policy đầy đủ, chưa có
bằng chứng JSON đối chiếu trực tiếp. Chưa kết luận lỗi policy/TLS/network.
Thêm check_device_connection.py dùng Python stdlib TLS xác minh CA/hostname,
certificate pair và MQTT CONNECT ENV01 trên Windows để phân biệt simulator với
AWS/authentication. Không publish/control. Dừng simulator trước vì trùng client
ID có thể ngắt phiên cũ. Chưa có kết quả live của phép thử này.

## 13/10/2026 — Image ghép boot, chờ chẩn đoán Wi-Fi/NTP/MQTT

Người dùng gửi log Wokwi mới chỉ có bootloader đến entry; không thấy lỗi
partition cũ trong đoạn gửi, nhưng chưa có bằng chứng mount/TLS/telemetry.
Firmware trước thiếu log cho trạng thái chờ Wi-Fi/NTP/endpoint. Thêm log boot,
mount result, endpoint presence (không in giá trị), và trạng thái chờ mỗi 10 giây
trước khi MQTT client khởi tạo. Cần rebuild firmware, ghép image lại và quan sát
serial 30–60 giây. Chưa kết luận nguyên nhân im lặng hoặc gate Day 1 đạt.

## 13/10/2026 — LittleFS build và công cụ ghép flash

Người dùng cung cấp buildfs SUCCESS sau 9.12 giây; danh sách image có .gitkeep,
AmazonRootCA1.pem, device.pem.crt, private.pem.key. Trước đó đã giới hạn quyền
data directory và tải Root CA qua HTTPS chính thức. Không lưu nội dung key.
Thêm tools/wokwi/merge_flash.py đọc layout từ partitions.bin, kiểm tra size và
overlap, ghép bootloader/partition table/OTA init/app/LittleFS thành flash 4 MiB.
Output trong .pio/build/esp32dev/wokwi-private, quyền thư mục riêng tư; Wokwi
config chuyển từ application-only sang image ghép. Cloud chạy 10 tests đạt,
gồm kiểm tra offsets, gaps, overlap và quá kích thước bằng dữ liệu giả.
Chưa chạy merge trên artifact thật của người dùng hoặc xác nhận Wokwi nạp
image ghép/TLS; cần người dùng chạy helper và gửi serial log tiếp theo.

## 13/10/2026 — Wokwi khởi động firmware, thiếu partition LittleFS

Kiểm tra tiếp theo do người dùng cung cấp: partitions.bin có nvs 0x9000/0x5000,
otadata 0xe000/0x2000, app0 0x10000/0x140000, app1 0x150000/0x140000,
spiffs 0x290000/0x160000 và coredump 0x3f0000/0x10000. Partition filesystem
đã tồn tại trong build output; không cần đổi tên hoặc layout để chữa log.
Simulator chưa được xác nhận đã nạp partition table/image này. Bước tiếp theo
là tạo LittleFS riêng tư, rồi ghép flash tại offsets đã kiểm tra.

Người dùng cài Wokwi extension VS Code, kích hoạt license và cung cấp boot log
ESP32. Firmware khởi động, báo `partition "spiffs" could not be found`,
`Mounting LittleFS failed! Error: 261`, rồi giữ relay OFF vì không đọc được
credentials. `wokwi.toml` hiện trỏ vào application firmware.bin, chưa có bằng
chứng partition table và filesystem riêng tư đã được nạp vào simulator.
Không đổi tên partition hoặc bật auto-format để che lỗi. Cần tạo filesystem
image, kiểm tra partition table và chuẩn bị image phù hợp simulator trước khi
nghiệm thu TLS. Chưa có kết nối MQTT. Không lưu key/image vào Git.

## 13/10/2026 — Tải toolchain firmware trên Windows (chưa build xong)

**Cập nhật sau retry:** người dùng cung cấp đầu ra build thành công:
`esptool.py v4.9.0`, `Successfully created esp32 image`,
`[SUCCESS] Took 97.88 seconds`. Firmware ELF/bin đã được tạo trên Windows.
Mốc này xác nhận compile/package, không xác nhận LittleFS, Wokwi runtime hoặc
MQTT TLS/telemetry. Bước tiếp theo chuyển sang Wokwi local/private và kiểm tra
filesystem provisioning; giữ phần lỗi tải bên dưới làm lịch sử.

Người dùng cung cấp đầu ra PlatformIO: toolchain-xtensa-esp32 8.4.0+2021r2-patch5
đã cài. Mirror sin1.contabostorage.com gặp SSL WRONG_VERSION_NUMBER; PlatformIO
tự chuyển mirror và cài framework-arduinoespressif32 3.20017.241212+sha.dcc1105b
thành công. Khi tải tool-esptoolpy từ mirror thay thế, tiến trình báo Aborted ở
59%. Chưa xác định nguyên nhân abort (không kết luận người dùng hủy hoặc TLS
gây ra). Chưa có bằng chứng biên dịch firmware thành công. Bước tiếp theo:
chạy lại đúng lệnh build để tận dụng package đã cài; giữ TLS verification.

## 11/10/2026 — Trạng thái hiện tại

- Repository: NiDa30/smart-farm-management-system; nhánh làm việc `feat/day1-iot-foundation`. Không merge vào main.
- Cloud: Linux dưới `/workspace`; máy người dùng: Windows 11, Git Bash UCRT64, repository tại `D:/IOT/Project/smart-farm-management-system`.
- Người dùng dùng Wokwi, chưa có ESP32 vật lý. AWS IoT chọn Singapore (`ap-southeast-1`) vì gần Việt Nam; không tuyên bố đây là region rẻ nhất.
- **AWS provisioning thành công trên máy người dùng**. Đầu ra người dùng cung cấp: `AWS Thing/certificate/policy provisioned. Private files and endpoint saved to .../.local/aws`.
- Thing `ENV01`, policy `SmartFarmMvpENV01`, certificate và endpoint được script tạo/lưu. Thành công của script không chứng minh thiết bị đã kết nối.
- **Bước kế tiếp:** cấu hình `firmware/esp32/config/config.local.h`, chạy PlatformIO build trên Windows; sau đó xác nhận Wokwi local có thể nạp LittleFS riêng tư, rồi thu telemetry AWS.
- Chưa có kết quả build firmware trên Windows; chưa có MQTT live, PUBACK, phiên quan sát 5 phút, backend nhận telemetry hoặc điều khiển relay/ACK end-to-end.

## 1. Khảo sát và chuẩn bị môi trường

Frontend có React 19, TypeScript, Vite 8, Tailwind 4; nhiều luồng còn dùng mock. Baseline chưa có backend/database cho vertical slice IoT. `npm ci --legacy-peer-deps` cài được; `npm run build` đạt với cảnh báo kích thước bundle và cấu hình Vite. Lint phát hiện loại toast không hợp lệ; sửa sang `warning`. Cloud từng chạy smoke dashboard và danh sách cây bằng browser tự động.

Môi trường cloud được chuẩn bị bằng skill cloud-environment-onboarding:setup; hướng dẫn install/start và yêu cầu domain mạng đã lưu vào draft. Draft không đồng nghĩa cấu hình đã được áp dụng cho runtime. Không lưu bí mật vào draft.

## 2. Kế hoạch MVP và quản lý công việc

Kế hoạch 7 ngày cho 2 kỹ sư, khoảng 84 giờ, có điều kiện: ESP32/Wokwi → AWS IoT → Spring Boot → PostgreSQL → WebSocket → React → rule/command → GPIO → ACK → logs. Có schemas, tests, rủi ro và gate nghiệm thu trong tài liệu implementation. Đây là kế hoạch, không phải cam kết hệ thống đã hoàn thành.

Người dùng muốn tạo 7 task trong Jira project ISP. Plugin Atlassian hiển thị tài khoản kết nối nhưng phiên làm việc không có công cụ Jira callable. Đã chuẩn bị CSV và mô tả task; link tải CSV trong ứng dụng thất bại. **Không có bằng chứng task Jira nào được tạo bởi trợ lý.** Không coi cài plugin là quyền API đã dùng được.

## 3. Code nền tảng Day 1

- JSON Schema và ví dụ telemetry, command, ACK, status, event; farm FARM001, ENV01/PUMP01, bootId, sequence, timestamp và giới hạn thời gian ON.
- Script render/provision IoT với kiểm tra account, policy có scope, manifest để dùng lại certificate và từ chối ghi đè tài nguyên không khớp.
- Backend Java 21, Spring Boot 3.5.16, Maven wrapper 3.9.11, AWS IoT SDK 1.34.0. Probe WSS/SigV4 chỉ gửi echo riêng của backend ở bước chẩn đoán, không bật pump.
- Firmware ESP32 Arduino/ESP-MQTT TLS/QoS1, DHT22 GPIO15, ADC đất GPIO34, relay GPIO26 giữ OFF. LittleFS chứa credentials riêng tư. Không dùng sketch HiveMQ cũ làm bằng chứng AWS.
- Cloud đã kiểm chứng frontend lint/build, 6 tests schema/policy ban đầu, Maven verify 1 test, Spring context và probe native self-test. Self-test không kết nối AWS.
- Firmware build cloud bị proxy CONNECT403 tới registry PlatformIO; chưa được xác nhận hoàn tất.

## 4. Đồng bộ máy Windows

Commit nền tảng `31eeaae` được push lên nhánh feature. Checkout bị chặn do người dùng có sửa `SensorRealtime.tsx` trên main. Đã stash riêng file, rồi switch theo remote branch; các file tools/backend xuất hiện và lint đạt. Không pop stash vì bản sửa toast đã có trên nhánh mới.

Python ban đầu không có; sau đó người dùng cài Python 3.12.10 và venv `.local/day1-venv`. AWS CLI gọi bằng `Scripts/python.exe -m awscli`, không dựa vào `Scripts/aws.exe`. Thiết lập profile `smartfarm` trên máy người dùng; IAM user `smartfarm-dev`, không cấp AdministratorAccess.

## 5. Điều tra chi phí AWS trước khi tiếp tục

Credits có lúc hiển thị $79.26, sau đó $99.26. Trang Credits giải thích rõ tổng cấp $120: $100 Free Tier + $20 thưởng “Explore AWS: Launch an instance using EC2” ngày 11/10/2026. Tổng sử dụng ước tính $20.74 = $12.86 tháng 9 + $7.88 tháng 10; còn ước tính $99.26. Xóa tài nguyên không tự hoàn lại credit; mức tăng $20 là khoản thưởng, không suy luận là refund.

Hóa đơn tháng 10 người dùng cung cấp: t3.micro 483.596 giờ $5.03, EBS gp3 $0.41, IPv4 public 488 giờ $2.44; tổng $7.88 được credit bù nên payable $0. Data transfer $0. Hai volume gp3 8 GiB gắn với các instance DevOps/Test ở us-east-1. Stop không ngừng phí ổ EBS/Elastic IP. Người dùng cung cấp ảnh cả hai instance Terminated, sau đó báo không còn Volumes/Elastic IPs. Chưa có bằng chứng xác nhận Snapshots Owned by me hoặc tất cả region đều trống.

Budget `SmartFarm-Monthly`: $5 recurring/tháng, Unblended costs, loại trừ Credit/Refund, không có end date. Cảnh báo Actual 20%, 80%, 100% và Forecasted 100%; người dùng xác nhận email đã verified. Budget không tự dừng tài nguyên. Chi phí billing cập nhật có độ trễ; cần đối chiếu lại sau 24–48 giờ. Tháng hiện tại vẫn hiển thị chi phí đã phát sinh dù đã xóa máy.

## 6. Sửa lỗi provisioning và bằng chứng thành công

Các lỗi Windows ACL, dependency botocore và IAM được ghi ở [sổ lỗi](TROUBLESHOOTING.md). Các commit đã push: `fd0cb97` ACL Windows ban đầu, `dfd97a1` chỉ sửa DACL, `eaa75fc` khai báo botocore, `fd335b1` hiển thị operation/error code an toàn.

Tests trên cloud sau sửa: 8 đạt. Người dùng Windows cung cấp kết quả 8 tests tổng, 7 đạt và 1 skip vì POSIX mode không áp dụng Windows. Đây không phải test AWS live.

Sau điều chỉnh IAM, lệnh CLI attach-policy không lỗi. Lần chạy script tiếp theo người dùng xác nhận provisioning thành công. Cần giữ `.local/aws/` và manifest; không tạo lại certificate để né lỗi quyền.

## Việc còn lại trước khi viết chương triển khai thành công

1. Biên dịch firmware thật, ghi tool versions và kết quả.
2. Xác nhận workflow Wokwi local/private và filesystem image, không đăng private key lên Wokwi public.
3. Thu MQTT TLS/PUBACK và khoảng 60 telemetry hợp lệ trong 5 phút, thay đổi sensor ảo.
4. Chạy backend probe với quyền runtime riêng, lưu bằng chứng đã làm sạch.
5. Tiếp tục persistence/UI/control/safety/ACK theo kế hoạch sau khi gate Day 1 đạt.
