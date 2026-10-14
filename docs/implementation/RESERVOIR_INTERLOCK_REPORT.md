# Bàn giao relay tưới và phao cạn nước — 14/10/2026

## Kết quả

- Sơ đồ chuẩn `firmware/esp32/diagram.json`: thêm relay PUMP01, LED tải qua NO,
  phao bằng slide-switch GPIO27 và nhãn cảm biến. Root `wokwi/` vẫn là legacy,
  có README chỉ rõ đường dẫn mới.
- Input closed-to-GND=có nước, open=cạn. Firmware opt-in bằng
  FARM_WATER_INTERLOCK_ENABLED=1; legacy config thiếu flag mặc định tắt.
- Cạn khóa OFF dù đang idle; ON/RESET từ chối WATER_LOW; OFF cho phép. Có nước
  không tự bật hoặc mở khóa. Dedupe cũ không vượt qua interlock mới; cả ACK từ chối lúc cạn được cache để
  duplicate RESET/ON sau khi thêm nước không biến thành thao tác mới.
- Backend nhận/lưu stateReason WATER_LOW, UI Control/Safety/Event Log có nhãn.
  Mở rộng schema status để nhận cả stateReason đã có trong firmware trước đây.
  Không thêm migration/topic/Thing/certificate/IAM.

## Bằng chứng cloud

- ESP32 PlatformIO build control=1, interlock=1 đạt, config mẫu ở `/tmp`, không
  dùng endpoint hoặc certificate thật. Config private của người dùng không bị đọc/ghi. Build legacy thiếu flags mới cũng đạt.
- Native C++ RelaySafety đạt: timer, dedup, network, clock và cạn/khôi phục/reset.
- Backend `verify`: **104 đạt, 0 fail/error/skip**, PostgreSQL test riêng.
- Safety frontend unit: **4 đạt**; browser safety API fixtures: **10 đạt**.
- Sơ đồ tĩnh: **3 đạt** (đầu dây, phao hở, tải qua NO; không mô phỏng điện).
- Smoke toàn app → API/PostgreSQL `reservoir_smoke` đạt: lý do WATER_LOW ở
  Safety/Control, nút ON bị khóa; chỉ GET, MQTT/control tắt; DB trước/sau giữ
  command0/run0/history1. Xem `tools/frontend/smoke_reservoir.py`.
- Hợp đồng Python: **7 đạt** sau bổ sung dependency format validator đúng pin.
  Lần đầu thiếu rfc3339-validator trong PYTHONPATH làm ca invalid timestamp thất
  bại; cài 0.1.4 từ requirements, giữ nguyên assertion, chạy lại đạt.
- Lint/build đạt; warning Vite config __dirname và chunk size là tồn tại trước.

## Giới hạn

Không chạy AWS hoặc Wokwi live mới, không nạp PEM cloud, không điều khiển GPIO
thật. Cực tính tiếp điểm relay cần nghiệm thu: tài liệu Wokwi có mâu thuẫn giữa
bảng transistor và đoạn Operation; sơ đồ dùng pnp theo Operation (HIGH→NO),
chưa gọi đó là tiếp điểm đã hoạt động. Nếu LED sáng ở boot, dừng và đối chiếu.
Phao là tín hiệu nhị phân, chưa có reading mức nước/flow, cảnh báo trung tâm,
email, NVS hoặc bảo vệ điện công nghiệp. Local loop polling không hứa ngắt cứng.
Cạn vẫn ngắt local khi AWS lỗi nhưng status mới chỉ tới web khi nối lại.

## Người dùng thực hiện

Theo [chương21](../book/CHAPTER_21_RESERVOIR_INTERLOCK.md): pull, giữ config
riêng và thêm flags phao, build firmware + buildfs + merge, restart backend,
mở đúng diagram. Tắt rule khi thử thủ công, chạy ma trận và gửi kết quả đã che
secrets. Chưa đánh dấu bất kỳ ca live mới nào đạt chỉ vì build/tests cloud đạt.

## Tái lập smoke toàn app (chỉ DB test riêng)

Chạy jar sau migration trong schema `reservoir_smoke` thuộc database test,
MQTT/control=false. Không dùng database demo. Seed chỉ fixture:

```sql
SET search_path TO reservoir_smoke;
INSERT INTO pump_status(singleton,boot_id,sequence,observed_at,received_at,reported_state,safety_lockout,state_reason)
VALUES(1,'51000000-0000-4000-8000-000000000001',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'OFF',true,'WATER_LOW');
```

Schema này phải không có command/run, và đã có history tự tạo bởi trigger.
Với Vite proxy tới jar, chạy `python tools/frontend/smoke_reservoir.py`.
Script không có API writes, không seed DB hay chạy lệnh điều khiển. Source
freshness vẫn được áp dụng; smoke không coi status cũ là bằng chứng OFF hiện tại.
