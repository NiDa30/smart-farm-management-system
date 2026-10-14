# Chương 23 — Trạm nước độc lập trên Wokwi

Ngày 14/10/2026. Sau [nền node/kênh](CHAPTER_22_NODES_AND_WATER_CHANNELS.md),
A2 có phần **giám sát**: firmware, sơ đồ, helper riêng từng node, provenance
và chẩn đoán hai phao. Chưa nghiệm thu AWS/Wokwi live trong cloud, chưa hoàn
tất flow-based pump protection hay tự động điều phối trạm/bơm.

## 1. Trạm mới làm gì?

WATER01 là board riêng, không đổi ENV01/PUMP01. Theo dõi hai phao và đếm xung
GPIO để tính lưu lượng. Mỗi 5 giây tạo packet v2 cho backend hiện có; LOW/HIGH
cùng sample, bootId/sequence/timestamp, FLOW cùng window. Không đo nhiệt/áp
trong firmware này dù contract/API đã hỗ trợ; các kênh thêm đó sẽ vẫn trống.

| Thành phần | Pin | Mô phỏng / ý nghĩa |
|---|---|---|
| Phao LOW | GPIO27, common2; chân1→GND | Trái=có nước tại LOW, phải=mạch hở/cạn |
| Phao HIGH | GPIO14, common2; chân1→GND | Trái=có nước tại HIGH, phải=mạch hở/cạn |
| Flow | GPIO25 qua slide gate | Trái=clock 45 Hz, phải=GND/0 xung |
| Clock generator | CLK | Phát tín hiệu xung, không phải lưu lượng nước vật lý |
| LED lỗi | GPIO2 qua 220 Ω | Đỏ khi khởi tạo hoặc tín hiệu phao/flow chưa hợp lệ |

Mặc định LOW ướt/HIGH khô là MID; HIGH ướt mà LOW khô là bất nhất. Đầu vào
ổn định 100 ms mới có reading hợp lệ. Bất nhất/warmup phát cả hai phao với
quality=SENSOR_FAULT,value=null; không biến lỗi thành “bồn có nước”.

Flow = `pulses × 60000 / elapsed_ms / pulses_per_litre`. Ví dụ clock 45 Hz và
450 pulse/L cho xấp xỉ 6 L/min (sai lệch một xung/window có thể xảy ra). Đây là
hệ số mô phỏng, không phải calibration của đồng hồ thật. Đếm xung bằng ISR,
chụp counter và thời điểm cùng critical section; tính trên thời gian thực
của window, không giả định mọi loop đều chính xác 5 giây.

Window 0 hoặc >15 giây, counter overflow, hệ số không hợp lệ hoặc vượt maxHz cấu
hình sẽ phát flow fault/null. Với source PHYSICAL, firmware còn cần version
hiệu chuẩn được khai báo; tên version tự nó không chứng minh hiệu chuẩn đúng.
Không có xung là số 0 hợp lệ và không đủ phân biệt ngừng chảy với đứt dây.

Node chỉ giám sát: không có pin relay bơm, không subscribe command, không
retained publish/LWT. GPIO2 chỉ là LED báo lỗi. **Không dùng WATER01 để thay
liên động cạn GPIO27 trên ENV01**; telemetry nước chưa cấp quyền bật PUMP01.

## 2. Chuẩn bị trên Windows

Từ gốc repository, Git Bash:

```bash
git pull --ff-only origin feat/day1-iot-foundation
```

Tắt rule và xác nhận bơm demo OFF trước khi đổi phiên simulator. Restart
backend sau khi PostgreSQL Healthy để Flyway áp dụng V15 (data_source), giữ
DB/config hiện có. Xem [Windows runbook](WINDOWS_RUNBOOK.md).

```bash
SMARTFARM_CONTROL_ENABLED=false bash tools/backend/run_backend_windows.sh
```

Giữ frontend và private gateway ở terminal riêng. Có thể dùng backend
control=false nếu chỉ thử nước; node này không gửi lệnh bơm.

Trên web **Sensor Realtime → Node & trạm nước → Khai báo trạm nước**:

- Mã WATER01, tên/khu vực đúng; form chuẩn có LOW/HIGH/FLOW.
- Không cần chọn kênh nhiệt cho firmware này.
- Calibration flow để trống hoặc đặt mã mô phỏng có nghĩa như SIM-450PPL-V1.
  Helper sẽ lấy đúng version trong registry, tránh mismatch với firmware.
- Chưa có dữ liệu sau khai báo là bình thường. Chưa tự có certificate/Thing.

Không đổi calibration registry đang dùng mà chỉ sửa string trên firmware:
parser so khớp chính xác. A1 chưa có API sửa calibration; cần thiết kế cập
nhật có phiên bản trước khi đổi measurement chain của node đã triển khai.

## 3. Certificate và policy riêng

Dùng profile smartfarm đã cấu hình, không đưa access key/private key vào chat.
Thay ACCOUNT_ID bằng tài khoản của bạn; không sao chép số tài khoản ví dụ.
Lệnh đầu chỉ render file, **không gọi AWS**:

```bash
export AWS_PROFILE=smartfarm
export AWS_DEFAULT_REGION=ap-southeast-1
./.local/day1-venv/Scripts/python.exe tools/aws/provision_water_node.py \
  --node-id WATER01 --region ap-southeast-1 --account-id ACCOUNT_ID
```

Thư mục riêng `.local/aws/WATER01/` có device-policy.json và
provisioner-iam-policy.json để kiểm tra. Device chỉ được Connect client WATER01
và Publish topic của WATER01, không Subscribe/Receive/RetainPublish/command.
Nếu user smartfarm-dev hiện chỉ được provisioning ENV01, admin gắn thêm
inline policy water đã render cho user/role đang dùng. Không ghi đè policy
backend/ENV đang hoạt động hoặc thêm AdministratorAccess để chữa lỗi.

AttachThingPrincipal cần scope thing và cert, AttachPolicy có policy và cert;
render đã chứa các resource này cùng region. CreateKeysAndCertificate và
DescribeEndpoint dùng Resource * vì không có resource cụ thể trước khi tạo.
Không cần tạo IAM role mới cho từng node. Helper hiện render provisioning
scope theo node, chưa phải fleet provisioning tự động theo tag.

Sau khi quyền phù hợp, chạy apply (thao tác tạo/attach AWS thực sự):

```bash
./.local/day1-venv/Scripts/python.exe tools/aws/provision_water_node.py \
  --node-id WATER01 --region ap-southeast-1 --account-id ACCOUNT_ID --apply
```

Manifest, device.pem.crt, private.pem.key và endpoint.txt nằm riêng trong
`.local/aws/WATER01/`. Script kiểm tra account, Thing FARM001/WATER, policy
đúng, certificate ACTIVE và identity manifest; không đổi policy khác hoặc
copy cert ENV01. Retry sau attach lỗi dùng lại certificate đã ghi, không
mint thêm một certificate cho mỗi lượt chạy.

Helper giữ lock riêng theo node để không chạy đồng thời hai lần provision.
Nếu process bị ngắt, .provisioning.lock có thể còn lại: kiểm tra PID/process
và hồ sơ certificate trước khi xử lý, không tự xóa lock khi chưa rõ trạng thái.
SDK không tự retry CreateKeysAndCertificate khi kết quả chưa rõ. Checkpoint
certificate-request.json chặn tạo tiếp nếu request bị gián đoạn trước khi
lưu manifest/keys. Nếu gặp thông báo request interrupted/missing files, kiểm
tra certificate trên AWS và hồ sơ local trước khi xử lý; không xóa marker
hoặc tạo lại mù. Đây không phải giao dịch nguyên tử AWS+filesystem hay chứng
minh chống mọi trường hợp mất điện. AccessDenied trước khi tạo được phân biệt
để có thể sửa quyền và retry.

Nếu lỗi, chỉ gửi tên operation/code đã sanitize, không gửi nội dung private
folder. Bộ helpers cũ provision_day1.py vẫn dành ENV01, không đổi ID để dùng
cho WATER hoặc dán private key ENV01 sang node mới.

## 4. Chuẩn bị project Wokwi riêng từng node

Dùng public AmazonRootCA1.pem đã tải qua TLS được xác minh. Có thể tái dùng
**chỉ CA public** từ demo ENV (không dùng cert/private key ENV):

```bash
./.local/day1-venv/Scripts/python.exe tools/water/prepare_local_node.py \
  --node-id WATER01 --ca-file firmware/esp32/data/AmazonRootCA1.pem
```

Nếu chưa có CA, tải từ nguồn chính thức vào thư mục water đã tạo:

```bash
curl --fail --show-error --location \
  https://www.amazontrust.com/repository/AmazonRootCA1.pem \
  --output .local/aws/WATER01/AmazonRootCA1.pem
./.local/day1-venv/Scripts/python.exe tools/water/prepare_local_node.py \
  --node-id WATER01 --ca-file .local/aws/WATER01/AmazonRootCA1.pem
```

Helper đọc khai báo từ API loopback 8080, kiểm tra identity/channels/version,
manifest/endpoint region, PEM/key pair và CA. Tạo project riêng
`.local/water-nodes/WATER01/`, config endpoint/client/calibration và data
riêng dưới ACL private. Không in PEM/endpoint hoặc ghi vào config ENV.
Project mặc định SIMULATOR; không tự biến hệ số 450 thành đo vật lý.

Build tại gốc repo, lần lượt; dừng khi một lệnh lỗi:

```bash
./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir .local/water-nodes/WATER01
./.local/day1-venv/Scripts/python.exe -m platformio run --project-dir .local/water-nodes/WATER01 -t buildfs
./.local/day1-venv/Scripts/python.exe tools/wokwi/merge_flash.py --project-dir .local/water-nodes/WATER01
```

Ảnh flash.bin chứa private key: giữ trong folder ignored, không commit/chia
sẻ/upload public. Merge vẫn hỗ trợ default firmware/esp32 cho ENV; không ghép
nhầm thư mục và không chỉ rebuild firmware.bin rồi chạy flash.bin cũ.

Mở **folder `.local/water-nodes/WATER01` trong cửa sổ VS Code riêng**, chọn
`diagram.json` tại đó rồi Start Wokwi. Gateway 9011 phải đang chạy và extension
licensed. Template firmware/water-node là source để tạo project, không có
private endpoint/cert để chạy AWS ngay. Không mở legacy root wokwi/diagram.json.

Serial mong đợi (chưa phải kết quả live của đợt cloud):

```text
Water monitor starting: WATER01; no pump output
WATER LittleFS mounted
WATER_SAMPLE tank=MID flow=VALID ... source=SIMULATOR
WATER AWS MQTT connected (TLS verified)
WATER telemetry queued; wait for PUBACK
WATER MQTT QoS1 PUBACK ...
```

PUBACK xác nhận broker, chưa tự chứng minh backend đã lưu. Đối chiếu web node
WATER01: LOW/HIGH/FLOW, nguồn Mô phỏng, packet/giờ mới và mức MID. Backend cần
Subscribe/Receive topic WATER01 trong policy; filter + không tự cấp quyền IAM.

WATER02 lặp cùng quy trình theo mã mới, certificate/clientId/config/project
riêng. Không chia sẻ private key. Nhiều phiên VS Code/gateway đồng thời phụ
thuộc hỗ trợ và license cục bộ, chưa thử trong cloud; nếu chỉ chạy một phiên,
dừng ENV khi đã OFF để thử WATER, khi đó reading ENV sẽ cũ chứ không giả online.

## 5. Nguồn dữ liệu, mức bồn và cập nhật source

V15 lưu dataSource theo packet: SIMULATOR/PHYSICAL/UNSPECIFIED. V2 cũ không
gửi field vẫn được nhận dưới UNSPECIFIED; v1 không đổi. Đây là nguồn thiết
bị khai báo, chưa phải hardware attestation. Duplicate packet không đổi
source/receivedAt của mẫu đã lưu.

Web suy ra EMPTY/MID/HIGH đạt hoặc SENSOR_FAULT chỉ từ LOW/HIGH fresh ≤30 s,
cùng bootId/sequence/timestamp/source. Khác mẫu, thiếu/stale/lệch giờ/API lỗi
thì chưa xác định. Fault/null không thành 0; flow 0 vẫn là measurement riêng.
Nhãn mức bồn không phải safety permission, không suy ra phần trăm/lít hoặc
cảnh báo không-flow chỉ vì đang không có xung.

Sau khi pull nâng cấp code, helper ban đầu không ghi đè private project đã
có. Dùng lệnh refresh cho public source chưa tự chỉnh sửa, sau đó build/merge:

```bash
./.local/day1-venv/Scripts/python.exe tools/water/prepare_local_node.py --node-id WATER01 --refresh-source
```

Refresh giữ config/cert, dùng hash để từ chối ghi đè generated source đã
được người dùng sửa. Nếu đã chỉnh diagram để thử lỗi, đối chiếu/giữ thay đổi
đó trước khi cập nhật; không xóa folder chứa key để chữa một file diagram.

## 6. Ma trận Wokwi live còn chờ

Tất cả ca sau **Chưa chạy** trong đợt cloud. Ghi giờ/serial/source/reading,
không đánh dấu đạt chỉ từ build hoặc fixture. Khôi phục diagram sau fault test.

| Ca | Mong đợi | Thực tế |
|---|---|---|
| Default LOW trái/HIGH phải, flow gate trái | MID, source SIMULATOR, flow≈6 L/min | Chưa chạy |
| Hai phao trái | Nước đạt HIGH, không suy ra 100% | Chưa chạy |
| Hai phao phải | Không có nước tại LOW/HIGH, không tự điều khiển bơm | Chưa chạy |
| LOW phải/HIGH trái | Hai phao fault/null, LED lỗi, web chẩn đoán lỗi | Chưa chạy |
| Flow gate phải | 0 L/min VALID, không gọi đó là lỗi bơm | Chưa chạy |
| Clock đổi 5000 Hz, restart mô phỏng | SIGNAL_TOO_FAST, flow fault/null | Chưa chạy |
| Tắt gateway rồi nối lại | Sampling local tiếp tục; web stale; dữ liệu mới sau reconnect giữ source đúng | Chưa chạy |
| Restart simulator | bootId mới; không replay job, node không có pump output | Chưa chạy |
| Hai node riêng | Không clientId/certificate collision, dữ liệu vào đúng node | Chưa chạy |

Flow-based shutdown cần xác nhận pump ON, liên kết trạm/controller và thời
gian mồi/giới hạn đã hiệu chuẩn, cùng fail-safe cục bộ. Cảnh báo nước trung
tâm, pressure/temp thật, bơm/van nhiều zone, NVS và recovery vẫn là bước sau.
Không tuyên bố A2 toàn bộ hoàn tất chỉ vì phần monitor này đã có code.


## 7. Bằng chứng cloud và chi phí khi chạy demo

119 backend tests, 9 browser node, 6 unit frontend node, 17 Python water helpers/
contracts/SDK mocks/diagram và 2 flash regression đạt, không skip. Native C++
model/packet đạt; packet cùng encoder firmware đi qua schema và Java/parser/
SQL test. Build ESP32, buildfs rỗng và merge 4 MiB đạt, không dùng endpoint/key
thật. Full app/API/PostgreSQL MID/source/fault/zero/stale fixture đạt. Nâng
DB đã có sample V14 lên V15 giữ reading cũ/source UNSPECIFIED, không tạo lệnh.
Đây không phải bằng chứng AWS, Wokwi hoặc flow vật lý đã hoạt động.

Nếu kết nối/publish liên tục mỗi 5 giây, mỗi node gửi khoảng 17.280 packet/ngày;
4 node khoảng 69.120 publish/ngày, chưa tính delivery/connection/retry. Chi phí
AWS phụ thuộc usage và biểu giá hiện hành, credit không đồng nghĩa không có
chi phí. Giữ Budget và dừng simulator khi kết thúc thử; không tự bật logging
chi tiết hoặc triển khai server mới chỉ để chạy monitor này.


Bước kế tiếp đã có: [chương 24 — Cảnh báo trạm nước](CHAPTER_24_WATER_ALERTS.md).
V16 bổ sung hồ sơ LOW/fault và đã xem, không đổi firmware hoặc thêm bơm no-flow
protection. Các nhận xét central alert chưa làm ở chương này là mốc trước V16.
