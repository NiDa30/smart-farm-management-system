# Nhật ký xây dựng Smart Farm

## 13/10/2026 — Wokwi khởi động firmware, thiếu partition LittleFS

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
