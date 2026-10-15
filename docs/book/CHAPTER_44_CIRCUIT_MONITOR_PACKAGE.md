# Chương 44 — Tạo project Wokwi riêng từ nhánh tưới

Đợt sau V31, schema database vẫn V31; không có migration mới.

## Từ nhánh đã khai báo tới project mô phỏng

Một hàng cấu hình trên web chưa tạo Thing, certificate hoặc ESP32 đang chạy.
Sau chương39, người dùng phải tự sửa nhiều ID và revision để nối một board
giám sát vào đúng nhánh. Chương44 thêm nút tải project Wokwi công khai theo
mapping đã xem: controller/client, actuator, circuit/zone và phiên bản của chúng.

Vào **IoT & Tự động hóa → Điều khiển Actuator → Cấu hình nhánh tưới**.
Nhập AWS Account ID12 chữ số ở khu vực Gói Wokwi theo nhánh, rồi chọn
**Tải gói Wokwi <mã nhánh>** trên hàng tương ứng. Account ID dùng để render
ARN trong policy; không nhập access key hoặc secret key. Trường này không
lưu vào cấu hình database hoặc localStorage. Region cố định Singapore,
`ap-southeast-1`, khớp môi trường demo hiện tại; chưa có lựa chọn region khác.

Gói dùng profile **IRRIGATION_MONITOR_ONLY**, cho IRRIGATION02–99/VALVE02–99,
một van trên một board. GPIO26 giữ OFF, không subscribe command hoặc publish
ACK. Đổi hai switch vị trí để giám sát trạng thái; LED không bật trong
profile này. IRRIGATION01/VALVE01 vẫn dùng demo và hướng dẫn chương32–37.

## Điều kiện để xuất

- Nhánh và phiên bản vùng vẫn CURRENT, nguồn SIMULATOR; phao/flow declaration
  và danh tính không bị đổi hoặc trùng registry đã có.
- Controller/client ID riêng: không dùng một controller dự kiến cho hai
  board giám sát độc lập. Registry nhánh vẫn cho phép thiết kế controller
  nhiều đầu ra sau này, nhưng exporter hiện chặn trường hợp dùng chung.
- Request gửi cả expectedRevision và expectedZoneRevision đã xem. Backend
  đọc một snapshot REPEATABLE_READ, trả409 khi mapping đã đổi trước khi đọc.
- Frontend cần cấu hình mới, kiểm tra header identity/revision, kiểu ZIP,
  signature và kích thước; bỏ tải nếu mapping thay đổi hoặc mất freshness
  trong lúc đợi. Mount/poll không tự tải gói hoặc tạo tài nguyên.

File là bản chụp, không giữ chỗ danh tính trên AWS và không là giấy phép
dispatch. Mapping có thể đổi sau khi tải; khi đó phải tải/build lại và boot
mới. Backend monitor hiện có từ chối packet không khớp mapping/revision.

## Những gì có trong ZIP

Tên dạng `FARM001-CIRCUIT02-r1-IRRIGATION02-VALVE02-monitor.zip`. ZIP có
một thư mục root cùng tên,15 file; không kèm credentials hoặc ảnh flash:

| Thành phần | Nội dung |
| --- | --- |
| src/main.cpp, include/Valve*.h | Firmware giám sát hiện hành, sao chép nguyên byte từ template công khai |
| platformio.ini, wokwi.toml | Toolchain có pin và đường dẫn flash local như project gốc |
| diagram.json | LED nhãn theo đúng van, hai switch GPIO32/33 độc lập |
| config/config.example.h | ID/revision riêng, monitor1/demo0/feedback1, endpoint/password trống |
| data/.gitkeep, .gitignore | Filesystem rỗng, bỏ private config/data/.pio khỏi Git |
| device-policy.json | IoT policy: Connect đúng client, Publish đúng status của một van |
| backend-additional-identity-policy.json | IAM bổ sung Subscribe/Receive đúng status, không thay toàn bộ quyền backend |
| manifest.json | Package version1, snapshot cấu hình, source profile, account/region, SHA-256 của14 file khác |
| README_VI.md | Các bước project riêng trên Windows, trạng thái chưa provision và giới hạn |

Maven chỉ đưa chín file firmware công khai được liệt kê rõ vào JAR. Không
quét thư mục repo ở runtime; không đọc .local/.aws/config.local.h/data/PEM,
không chạy script AWS hoặc lấy credential từ máy chủ. Assets có sẵn trong
JAR nên exporter vẫn làm việc khi ứng dụng không có checkout bên cạnh.
Source firmware gốc và config mặc định của repo không bị đổi sang ID của
nhánh vừa tải. Thêm file include mới về sau cần cập nhật allowlist và test.

Policy không có wildcard, RetainPublish, command/ack hoặc quyền PUMP01.
Thiết bị dùng IoT policy trên certificate; backend dùng IAM identity policy
bổ sung. Đây là hai loại khác nhau. Account ID đúng định dạng chưa chứng minh
tài khoản, quyền hay Thing thực sự tồn tại; đối chiếu trước khi áp thủ công.

## Thực hành Windows — phần chạy thật còn chờ

1. Pull nhánh `feat/day1-iot-foundation`, restart backend/frontend. Không xóa
   volume PostgreSQL. Đọc lại cấu hình nhánh và tải ZIP đúng hàng.
2. Giải nén vào một thư mục project mới, ví dụ `.local/simulators/` tại repo.
   Giữ nguyên root của gói; không giải nén ghi đè board có private config/key.
3. Trong project mới, copy config/config.example.h thành config/config.local.h.
   Điền endpoint Data-ATS riêng. Giữ MONITOR_ONLY1, DEMO_ENABLED0, SIMULATOR1
   và các ID/revision đã sinh. Khi mapping đổi hãy tải lại gói thay vì đoán ID.
4. Tạo/chọn Thing/certificate riêng cho board theo quy trình AWS đã học,
   kiểm tra client ID chưa bị dùng bởi board khác. Không dùng lại key của
   ENV/WATER/SOIL hoặc van khác. Certificate ACTIVE và policy đúng van cần
   được gắn riêng; tải ZIP không làm bước này.
5. Đặt device.pem.crt, private.pem.key và AmazonRootCA1.pem vào data/ của
   project mới. Bổ sung quyền đọc status cho IAM backend; không thay policy
   đầy đủ bằng file bổ sung trong gói. Không gửi PEM/config/flash vào chat/Git
   hoặc public Wokwi.
6. Backend bật SMARTFARM_IRRIGATION_MONITOR_ENABLED=true và restart để lấy
   topic mới. Giữ cấu hình MQTT/endpoint riêng đang dùng; không bật demo để
   thử giám sát. Mỗi board đang chạy đồng thời cần client ID khác nhau.
7. Chạy ba lệnh trong README_VI.md của gói từ Git Bash tại gốc repo: build
   PlatformIO, buildfs, merge_flash. Sửa SIM_PROJECT theo vị trí giải nén,
   dừng khi một lệnh lỗi. Mở diagram.json của project mới bằng Wokwi VS Code.

Hai switch: CLOSED GPIO32 nối common2→GPIO, terminal1→GND; OPEN GPIO33
common2→GPIO, terminal3→GND. Đây là phản hồi mô phỏng độc lập, không lấy
tín hiệu từ LED. Chỉ CLOSED active là CLOSED, chỉ OPEN active là OPEN,
cả hai hở UNKNOWN và cả hai active CONFLICT. Fault monitor giữ latch, cần
sửa đầu vào và boot mới; không có lệnh CLOSE/reset trong profile này.

Đợi bản tin mới về đúng hàng nhánh; thiếu/cũ không được gọi là van đã đóng
hiện tại. Cả OPEN lẫn CLOSED trong monitor đều không xác nhận nước thực chảy
hoặc tạo quyền bật PUMP01. Màn hình, hàng chờ và dispatch giữ phạm vi hiện có.

## Lỗi checksum giữa hai lần chạy Java

Phép thử restart phát hiện policy có cùng quyền nhưng byte khác nhau vì
Map.of không đảm bảo thứ tự key qua các JVM. SHA-256 vì vậy đổi. Exporter
đã sắp xếp key cho các map JSON trước khi ghi file. Có test hồi quy thứ tự
key và kiểm tra xuất lại sau restart thật.

generatedAt trong manifest và thời điểm tạo trong README thay đổi khi xuất
lại là đúng. Các file firmware/config/policy phải giữ byte khi cùng JAR và
mapping/account; checksum của mỗi ZIP được tính lại từ đúng file trong gói.
Manifest không tự hash chính nó và hash không phải chữ ký số. Các artifact
trước khi sửa được giữ riêng để đối chiếu, không dùng làm bản chuẩn cuối.

## Kiểm chứng và nghiệm thu

416 backend (18 mới),26 browser nhánh/16 queue,6 unit frontend,5 policy Python
và12 contract đạt, không skip. Lint/build đạt; cảnh báo Vite cũ vẫn còn.
Hai project cuối tải từ ứng dụng thật được giải nén/build trực tiếp với ID
khác nhau; public inputs, manifest hash và policy khớp renderer Python.
Native encoder đọc config/header từ gói đã tải, qua receiver thật vào
PostgreSQL và React: chỉ van thứ nhất có packet, van thứ hai vẫn trống.

Restart JVM giữ nguyên observation/source/receipt/history, UI coi packet cũ
là STALE. Xuất lại với cùng mapping giữ firmware/config/policy, chỉ thời
điểm tạo được đổi. Không phát lại packet để làm mới. Profile monitor+demo1
bị compiler từ chối, restored build/emptyFS/merge4MiB đạt. Không dùng key
hoặc gọi AWS/MQTT/GPIO trong cloud; schema vẫn V31, dữ liệu NVS báo từ lượt
trước giữ nguyên trong kiểm tra tương thích.

| Ca Windows/AWS/Wokwi | Kết quả |
| --- | --- |
| Tải/giải nén và thêm endpoint/certificate riêng cho hai board | Chưa chạy |
| Chạy hai simulator đồng thời, đổi switch và nhận đúng hai hàng nhánh | Chưa chạy |
| Đổi mapping, tải/build/boot mới và xác nhận gói cũ bị từ chối | Chưa chạy |
| Tắt gateway một board, dữ liệu board đó cũ và board còn lại không bị mượn | Chưa chạy |
| Đối chiếu policy trên AWS thực tế và mức usage khi chạy MQTT | Chưa chạy |

Đây là cách chuẩn bị và nhân bản project giám sát. Chưa có lệnh điều khiển
van02–99, coordinator nhiều vùng, proof theo nhánh hoặc dispatch queue. A3
chưa hoàn tất; không bật bơm chỉ từ việc tải ZIP hoặc nhận position status.
