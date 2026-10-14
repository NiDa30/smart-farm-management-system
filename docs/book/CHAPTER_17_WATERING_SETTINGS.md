# Chương 17 — Cài đặt quy tắc tưới có phiên bản

Bản ngày 14/10/2026 tiếp nối quy tắc ENV01 → PUMP01. Thay vì sửa code để
đổi ngưỡng, người vận hành chỉnh tại IoT & Tự động hóa → Quy tắc Tự động hóa.
Bản này vẫn chỉ có một quy tắc cho FARM001; chưa thêm quy tắc theo khu vực.

## Cài đặt và điều kiện sửa

| Trường | Mặc định | Giới hạn số nguyên |
|---|---:|---|
| Ngưỡng đất khô | 30% | 1–90% |
| Ngưỡng tắt sớm | 35% | Cao hơn ngưỡng đất khô ít nhất 5 điểm %, tối đa 100% |
| Thời gian bật tự động | 20 giây | 1–30 giây |
| Khoảng nghỉ sau OFF | 60 giây | 60–3600 giây |

Ví dụ đặt 25/40/12/120: hai mẫu mới liên tiếp dưới 25% cho phép gửi ON trong
12 giây; đất đạt 40% thì gửi OFF sớm; sau OFF được xác nhận, nghỉ 120 giây.
Dữ liệu phải mới trong 15 giây; các điều kiện ACK, boot/sequence, khóa an toàn,
manual hold và không tự bật lại sau restart vẫn áp dụng.

Phải tắt quy tắc và chờ `activeCommand` rỗng mới sửa được. Backend kiểm tra
điều kiện này ngay trong câu UPDATE; nút bị khóa trên giao diện chỉ hỗ trợ
người dùng. Không bỏ kiểm tra backend vì trạng thái ở trình duyệt có thể cũ.
Lưu cài đặt không gửi lệnh MQTT, không tự bật quy tắc và không đổi deadline
nghỉ đang có. Deadline mới dùng khoảng nghỉ đã cấu hình khi run kết thúc.

Ngưỡng tưới **độc lập** với cảnh báo đất thấp 30/35% và nhiệt độ 35/33°C.
Thời gian tự động tối đa 30 giây cũng độc lập với timer thủ công dài hơn.

## API, migration và dấu vết từng lần chạy

`GET /api/v1/automation/watering/settings` đọc bốn trường và `revision`.
`PUT` cùng đường dẫn nhận đủ bốn trường và phiên bản vừa đọc. Lưu thành công
trả cấu hình cùng phiên bản tăng một; 400 là dữ liệu sai, 409 là xung đột
phiên bản hoặc quy tắc/run chưa cho phép sửa. JSON dùng bộ giải mã nghiêm ngặt
của ứng dụng: không nhận chuỗi hoặc số thập phân thay số nguyên.

Migration V11 thêm cài đặt vào `watering_rule`, giữ mặc định cũ và thêm các
trường nullable vào `watering_run`. Khi dispatch ON, cấu hình được chụp lại
trong run và commit cùng tracking trước publish. Các run cũ không có thông
tin này hiển thị “Cài đặt chưa được lưu cho lần chạy cũ”; không tự gán mặc định
hiện tại cho lịch sử. Lưu cấu hình mới không sửa ảnh chụp của run đã qua.

Backend dùng khóa chung với configure/tick/manual dispatch trong một process,
cộng điều kiện phiên bản và trạng thái trong SQL. Đây chưa phải điều phối
scheduler nhiều backend instance. Khởi động lại giữ cấu hình trong PostgreSQL
nhưng vẫn tạm dừng quy tắc; không tự phát lại lệnh ON.

## Hai tab và phản hồi bị mất

Polling không được ghi đè bản nháp. Nếu tab khác đã lưu phiên bản mới, giao
diện giữ bản nháp, báo xung đột và khóa Lưu. Chọn **Tải lại cài đặt (bỏ thay
đổi)** để đọc lại từ server trước khi nhập tiếp. Có bản nháp thì không bật
quy tắc để tránh dùng nhầm cấu hình chưa lưu.

Nếu PUT mất phản hồi, HTTP 5xx hoặc phản hồi không hợp lệ, chưa thể biết đã
lưu hay chưa. Giao diện không báo thành công và không tự gửi lại PUT; cần
Tải lại để đối chiếu. Bản GET lỗi không được xem là xác nhận lưu. Chỉ coi
lưu thành công khi server trả đủ cấu hình đúng với yêu cầu và phiên bản kế tiếp.

## Cập nhật trên Windows

Dừng backend cũ bằng Ctrl+C. Trong terminal Git Bash không có thay đổi chưa
commit cần giữ ở các file cập nhật, tại gốc repository:

```bash
git pull --ff-only origin feat/day1-iot-foundation
```

Giữ PostgreSQL demo và frontend/gateway ở terminal riêng. Mở **Git Bash mới**
cho backend để tránh kế thừa biến database test, rồi chạy:

```bash
SMARTFARM_CONTROL_ENABLED=true bash tools/backend/run_backend_windows.sh
```

Flyway tự áp dụng V11 trên database demo hiện có; không xóa volume hoặc sửa
migration đã chạy. Không cần đổi IAM, tạo certificate hay build firmware cho
thay đổi cài đặt này. Trình duyệt đang mở có thể cần refresh.

Đầu tiên để quy tắc tắt và đọc lại cài đặt. Thử lưu 25/40/12/120, refresh và
restart backend để kiểm tra giữ cấu hình. Sau đó, nếu thử LED Wokwi, ghi lại
hai mẫu khô, commandId, duration, ACK, status OFF mới và cooldown. Đối chiếu
riêng với cảnh báo vì ngưỡng cảnh báo vẫn 30/35%. Tắt quy tắc cuối phiên.
Đây là kịch bản cần chạy trên máy người dùng, chưa phải kết quả nghiệm thu.

## Bằng chứng của đợt này

Cloud đạt 72 backend tests, trong đó thêm tám ca settings/API/scheduler và
migration V10 → V11; 24 browser fixtures quy tắc, 11 unit frontend, lint/build
đạt. Không skip. Smoke trên App thật qua menu → Vite proxy → Spring Boot →
PostgreSQL test đã lưu 25/40/12/120, mở lại và đọc sau restart backend.
Trong smoke MQTT/control đều tắt, chỉ cho PUT settings, không toggle quy tắc.

Các kết quả này không chứng minh GPIO/AWS chạy theo ngưỡng mới. Phần Windows,
Wokwi live và phục hồi NVS vẫn giữ trạng thái cần nghiệm thu riêng. Chi tiết
lệnh, phạm vi và file nằm trong [báo cáo bàn giao](../implementation/WATERING_SETTINGS_REPORT.md).
