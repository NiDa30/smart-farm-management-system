# Cấu hình từ xa có ACK và OTA có chữ ký + rollback (V20, hợp đồng v4)

Gói 3b của phân hệ IoT, nối sau gói 3a (nhiều relay). Tất cả là tùy chọn và mặc định tắt:
firmware `FARM_DEVMGMT_ENABLED`, backend `SMARTFARM_DEVMGMT_ENABLED`. Không có khóa công khai
(`FARM_OTA_PUBLIC_KEY_PEM` / `SMARTFARM_OTA_PUBLIC_KEY`) thì OTA bị từ chối.

## Firmware

| Phần | Nội dung |
|---|---|
| `DeviceConfig.h` | Chu kỳ gửi (5–10 s), heartbeat (5–20 s), hiệu chuẩn độ ẩm đất, giới hạn bơm (chỉ giảm). Áp dụng toàn bộ hoặc không, revision tăng dần, ACK lặp lại giống hệt cho cùng `configId`. Lưu NVS, revision ghi sau cùng. |
| `OtaGuard.h` | Kiểm yêu cầu: https đúng host, kích thước ≤ phân vùng, SHA-256 chữ thường, phiên bản, thời hạn ≤ 60 s, mọi relay tắt. Khởi động thử: quá 3 lần khởi động hoặc 120 s chưa có phiên MQTT ổn định thì quay về phân vùng cũ. |
| `OtaVerify.h` | SHA-256 theo luồng và ECDSA P-256 bằng mbedtls 2.28 (đúng bản trong ESP-IDF 4.4). |
| `main.cpp` | Topic config/ota, `config-state` khi kết nối, chặn mọi lệnh ON khi đang OTA (có ghi nhớ như mọi lệnh bị từ chối), tải bằng TLS với Amazon Root CA của thiết bị. `Update.end()` (đổi phân vùng khởi động) chỉ chạy sau khi hash và chữ ký khớp. Dùng `verifyRollbackLater()` và `esp_ota_mark_app_valid_cancel_rollback()` khi bootloader hỗ trợ; nếu không thì tự đổi phân vùng theo nhãn. |

## Backend

V20: `device_config_request`, `device_config_state`, `firmware_release`, `ota_job` (chỉ một lượt
đang chạy). `DeviceManagementService` dùng cùng giới hạn như thiết bị, chỉ có một yêu cầu cấu
hình chờ ACK, revision mới cao hơn mọi revision đã gửi hoặc thiết bị đã báo. Bản firmware chỉ
được đăng ký khi chữ ký khớp khóa cấu hình và URL đúng host. OTA chỉ bắt đầu khi thiết bị đang báo
trạng thái, chạy bản khác, bơm/actuator đang OFF, không có lượt tưới zone, quy tắc tưới tắt. Trạng
thái chỉ đi tiến; lượt im lặng thì hết hạn; `config-state` lành mạnh sau `REBOOTING` sẽ đóng lượt
nếu mất gói `CONFIRMED`. REST: `/api/v1/devices/ENV01/config`, `/ota`, `/ota/releases`, `/ota/jobs`.

## Giao diện

`/iot/config` và `/iot/ota`: form cấu hình (kiểm cùng giới hạn, hiện giá trị thiết bị đang chạy,
lịch sử ACK) và OTA (chọn bản, không chọn được bản đang chạy, tiến trình, lịch sử, rollback).

## Kiểm chứng

| Bước | Kết quả |
|---|---|
| Test native `device_management_test.cpp` (link mbedtls 2.28.8, ASan/UBSan) | đạt, đã bắt một lỗi thật (`1.4.0-` lọt kiểm phiên bản) |
| `pio run` (`esp32dev`, `wokwi_selftest`) | đạt trên CI |
| pytest (hợp đồng v4, công cụ ký, IAM, vector test) | 54 |
| Unit / Playwright frontend | xem CI; `test:devices` 3/3 |
| `./mvnw -B verify` | xem CI (`DeviceManagementTest`) |
| Wokwi (cấu hình + kiểm chữ ký ngay trên ESP32) | cần `WOKWI_CLI_TOKEN` |

Chưa kiểm trên phần cứng: tải thật qua S3, đổi phân vùng và rollback thật (Wokwi không mô phỏng
được). Cần thử trên một ESP32 thật trước khi dùng ngoài vườn.
