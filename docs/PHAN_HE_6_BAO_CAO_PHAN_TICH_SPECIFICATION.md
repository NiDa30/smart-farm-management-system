# TÀI LIỆU ĐẶC TẢ THIẾT KẾ & KIẾN TRÚC DỮ LIỆU
## PHÂN HỆ 6: BÁO CÁO & PHÂN TÍCH ĐA CHIỀU (FARM BI & ANALYTICS PLATFORM)
### Hệ Thống Quản Lý Trang Trại Thông Minh (Smart Farm Management System)

---

## 1. MỤC TIÊU VÀ TẦM NHÌN CHIẾN LƯỢC

### 1.1. Mục đích Phân hệ
Phân hệ **Báo cáo & Phân tích (Analytics & Business Intelligence)** là "Bộ não điều hành trung tâm" (Mission Control Intelligence) của Smart Farm Management System. Phân hệ đóng vai trò thu thập, hợp nhất, xử lý và trực quan hóa dữ liệu từ tất cả các phân hệ vệ tinh:
- **Phân hệ 1**: Cấu trúc nông trại, phân quyền RBAC và vị trí địa lý.
- **Phân hệ 2**: Sinh trắc học cây trồng, nhật ký chăm sóc, sâu bệnh hại và thu hoạch thực địa.
- **Phân hệ 3**: Tồn kho phân bón, thuốc BVTV sinh học, tài sản máy móc và chi phí mua sắm.
- **Phân hệ 4**: Dữ liệu cảm biến thời gian thực LoRaWAN (độ ẩm đất, EC, pH, vi khí hậu) và lịch sử điều khiển van tưới tự động.
- **Phân hệ 5**: Đơn đặt hàng, doanh thu bán quả, phân loại phẩm cấp, công nợ khách hàng và khiếu nại.

Từ đó chuyển hóa dữ liệu thô thành chuỗi giá trị:
$$\text{Operational Data} \longrightarrow \text{KPI & Trends} \longrightarrow \text{Comparison} \longrightarrow \text{Drill-down} \longrightarrow \text{Actionable Insight} \longrightarrow \text{Decision}$$

---

### 1.2. Trả lời 13 Câu hỏi Quản trị Cốt lõi
Phân hệ được thiết kế để người quản lý trả lời tức thì:
1. **Trang trại hiện đang hoạt động thế nào?** $\rightarrow$ Dải KPI Điều hành (Executive KPI Strip) & Tỷ lệ sức khỏe tổng thể.
2. **Khu nào đang tốt hoặc kém?** $\rightarrow$ Bản đồ Sức khỏe Trang trại (Farm Health Map) phân cấp theo Khu Bắc, Khu Trung, Khu Nam.
3. **Cây nào có năng suất thấp cần xử lý?** $\rightarrow$ Bảng xếp hạng Tree Performance Ranking (Bottom 10 cây suy thoái kèm link mở thẳng hồ sơ cá thể).
4. **Sâu bệnh nào xuất hiện nhiều?** $\rightarrow$ IPM Analytics & Bản đồ nhiệt mật độ ca bệnh (Disease Heatmap).
5. **Chi phí đang tăng ở đâu?** $\rightarrow$ Bóc tách cơ cấu chi phí sản xuất (Vật tư, Điện nước, Bảo trì, Nhân công).
6. **Nước và điện đang sử dụng có hiệu quả không?** $\rightarrow$ Suất tiêu thụ nước ($L/kg$ quả) và điện năng ($kWh/ha$) so sánh giữa các khu.
7. **Thiết bị nào thường xuyên lỗi?** $\rightarrow$ Bảng xếp hạng Độ tin cậy Thiết bị IoT (Device Reliability Ranking).
8. **Sản phẩm nào mang lại doanh thu cao nhất?** $\rightarrow$ Phân tích doanh thu & biên lãi gộp theo từng dòng dừa thương phẩm.
9. **Khách hàng nào quan trọng & nợ đọng?** $\rightarrow$ Báo cáo Tuổi nợ (Receivables Aging) theo các mốc 30-60-90 ngày.
10. **Trang trại đang có lời hay lỗ?** $\rightarrow$ Báo cáo Lợi nhuận gộp & Dòng tiền 6 tháng gần nhất.
11. **Tháng tới có thể thu hoạch bao nhiêu?** $\rightarrow$ Trung tâm Dự báo Mùa vụ (AI Yield Forecasting) kèm dải tin cậy xác suất.
12. **Vật tư nào có nguy cơ thiếu?** $\rightarrow$ Dự báo số ngày còn lại đến khi cạn kho (Reorder Soon Alert).
13. **Có dữ liệu nào bất thường cần kiểm tra?** $\rightarrow$ Trung tâm Quản trị Bất thường Tự động (Automated Anomaly Center).

---

## 2. NGUYÊN TẮC THIẾT KẾ DATA & TRẢI NGHIỆM BI (UX/UI PRINCIPLES)

### 2.1. Chu trình "Overview $\rightarrow$ Drill-down $\rightarrow$ Compare $\rightarrow$ Diagnose $\rightarrow$ Action"
Không bao giờ biến báo cáo thành các biểu đồ rời rạc, vô hồn:
- **Overview**: Nhìn tổng thể toàn trang trại qua dải KPI đồng nhất.
- **Drill-down**: Nhấp vào bất kỳ con số nào (ví dụ: *25 cây bệnh*) để xem danh sách chi tiết các cây đó, nhấp vào mã cây `A023` để mở ngay hồ sơ cá thể ở Phân hệ 2.
- **Compare**: So sánh head-to-head trực tiếp giữa Phân khu A vs Phân khu B, hoặc giữa Cây A023 vs Trung bình đàn cây cùng tuổi.
- **Diagnose**: Kiểm tra các dữ liệu bằng chứng liên đới (Evidence Data) khi phát hiện điểm bất thường.
- **Action**: Cung cấp nút chuyển tiếp thẳng sang module nguồn (Mở van IoT, Tạo task điều tra, Lập phiếu mua vật tư).

### 2.2. Phân biệt Minh bạch Bản chất Dữ liệu (Data Type Integrity)
Giao diện phân định rõ ràng bằng nhãn Badge và màu sắc để tránh hiểu lầm:
1. **Dữ liệu Thực tế (Actual Data)**: Dữ liệu ghi nhận trực tiếp từ cảm biến IoT, phiếu cân thu hoạch hoặc hóa đơn bán lẻ.
2. **Dữ liệu Ước tính (Estimated Data)**: Dữ liệu tính toán dựa trên mô hình định mức (ví dụ: *Ước tính tiết kiệm 60 m³ nước nhờ tự động hóa*). Luôn gắn nhãn `Ước tính`.
3. **Dữ liệu Dự báo (Forecast Data)**: Dữ liệu dự phóng tương lai từ thuật toán hồi quy hoặc AI. Bắt buộc hiển thị kèm **Độ tin cậy (%)** và **Khoảng biến thiên cận trên / cận dưới**.
4. **Bất thường (Anomaly)**: Sai lệch vượt ngưỡng cảnh báo (Deviation %).
5. **Mối tương quan (Correlation) vs Nhân quả (Causation)**: Hệ thống ghi rõ *"Có tương quan quan sát được"*, tuyệt đối không tự quy kết nguyên nhân nhân quả khi chưa có kiểm chứng thực địa.

---

## 3. KIẾN TRÚC ĐIỀU HƯỚNG & CẤU TRÚC PHÂN HỆ

### 3.1. Cấu trúc Menu Sidebar Phân hệ 6
```text
Báo cáo & Phân tích (Analytics BI)
├── 1. Tổng quan điều hành (Executive BI)      (/analytics/dashboard)
├── 2. Sản xuất & Cây trồng (Crop BI)           (/analytics/production)
│   ├── Năng suất & Sản lượng (Yield)         (/analytics/yield)
│   ├── Sinh thái & Tăng trưởng (Growth)      (/analytics/growth)
│   ├── Sâu bệnh & Trị liệu (IPM)             (/analytics/disease)
│   └── Dinh dưỡng & Bón phân (Nutrition)     (/analytics/nutrition)
├── 3. IoT & Tài nguyên (IoT & Resources)       (/analytics/iot)
│   ├── Hiệu suất tưới tiêu (Water)           (/analytics/water)
│   ├── Đất & Vi khí hậu (Environment)        (/analytics/environment)
│   ├── Độ tin cậy Thiết bị (IoT Devices)     (/analytics/iot-devices)
│   └── Lợi ích Tự động hóa (Automation)      (/analytics/automation)
├── 4. Vật tư & Tài sản (Supplies & Assets)     (/analytics/resources)
│   ├── Tồn kho & Dự báo Tiêu hao             (/analytics/inventory)
│   └── Máy móc & Sửa chữa vs Mua mới         (/analytics/assets)
├── 5. Kinh doanh & Tài chính (Commercial & Finance) (/analytics/sales)
│   ├── Doanh thu & Sản phẩm (Revenue)        (/analytics/revenue)
│   ├── Phân tích Tuổi nợ (Receivables Aging) (/analytics/receivables)
│   ├── Cơ cấu Chi phí & Suất đầu tư (Cost)   (/analytics/cost)
│   └── Lợi nhuận trên Cá thể Cây (Profit)    (/analytics/profitability)
└── 6. Phân tích Nâng cao (Advanced Intelligence)
    ├── Trung tâm Đối sánh (Benchmark Center)  (/analytics/benchmark)
    ├── Quản trị Bất thường (Anomaly Center)   (/analytics/anomalies)
    ├── Dự báo Mùa vụ & Nhu cầu (Forecast)     (/analytics/forecast)
    └── Trình tạo Báo cáo (Report Builder)    (/analytics/reports)
```

---

## 4. CHI TIẾT ĐẶC TẢ GIAO DIỆN CÁC MÀN HÌNH CHÍNH

### MÀN HÌNH 01: EXECUTIVE DASHBOARD (TỔNG QUAN ĐIỀU HÀNH)
- **Đường dẫn**: `/analytics/dashboard` hoặc `/analytics`
- **Đối tượng**: Ban giám đốc, Chủ trang trại, Quản lý cấp cao.
- **Thành phần UI**:
  1. *Global Filter Bar*: Đồng bộ chọn Trang trại, Phân khu, Giống dừa, Kỳ phân tích (`Today`, `7 ngày`, `30 ngày`, `Tháng này`, `Quý`, `Năm`) và Cơ sở so sánh (`Kỳ trước`, `Cùng kỳ năm ngoái`).
  2. *Bộ 8 KPI Chiến lược (Core KPI Strip)*:
     - Tổng cây: `1.250 cây` (100% định danh cá thể)
     - Cây khỏe: `1.173 cây` (93.8% đạt chuẩn VietGAP)
     - Cần theo dõi: `52 cây` (Giảm 3 cây so với kỳ trước)
     - Đang bệnh: `25 cây` (2 ca mở đang trị liệu)
     - Sản lượng tháng: `3.2 tấn` (+8.5% so với tháng trước)
     - Doanh thu: `325 triệu` (+14.2%)
     - Chi phí sản xuất: `184 triệu` (+5.1%)
     - Lợi nhuận gộp: `141 triệu` (Biên lãi: 43.4%)
  3. *Bộ 6 KPI Vận hành Phụ*: Nước tiêu thụ (`324 m³`), Điện năng (`1.240 kWh`), IoT Online (`95.8%`), Đơn hàng (`28 đơn`), Công nợ phải thu (`82 triệu`), Vật tư cảnh báo (`13 loại`).
  4. *Bản đồ Sức khỏe Trang trại (Farm Health Map)*: Ma trận phân cấp 3 khu:
     - Khu Bắc: 🟢 `NORMAL` (96.7% khỏe, 12.4 tấn/ha, 18.2 L/kg, 2 ca bệnh).
     - Khu Trung: 🟡 `WARNING` (91.2% khỏe, 11.2 tấn/ha, 22.4 L/kg, 8 ca bệnh - Bọ dừa tăng).
     - Khu Nam: 🔴 `CRITICAL` (88.5% khỏe, 10.8 tấn/ha, 27.5 L/kg - Tiêu hao nước cao hơn 51% do rò rỉ van).
  5. *Biểu đồ Doanh thu & Lợi nhuận Gộp 6 Tháng*: Cột đôi biểu diễn Doanh thu vs Lợi nhuận thực tế.
  6. *Chỉ số Hiệu suất Tài nguyên*: Suất tiêu thụ nước $22.4 L/kg$ và chi phí phân bón $147.200 đ/cây/năm$.

---

### MÀN HÌNH 02 - 06: PRODUCTION ANALYTICS (NÔNG HỌC & CÂY TRỒNG)
- **Đường dẫn**: `/analytics/production`
- **Thành phần UI**:
  - *Tab Năng suất*: Phân tích sản lượng theo khu và giống; biểu đồ phân bố năng suất quả trên đàn cây ($<50$ quả, $50-70$, $70-90$, $>90$ quả).
  - *Tab Xếp hạng Cá thể Cây (Tree Performance Ranking)*:
    - Top 10 cây năng suất cao nhất (Ví dụ: Cây `A001` đạt 98 quả/năm, lãi 1.550.000 đ) $\rightarrow$ Ứng viên nhân giống F1.
    - Bottom 10 cây năng suất thấp (Ví dụ: Cây `A023` chỉ đạt 42 quả/năm, Cây `A018` sâu bệnh nặng) $\rightarrow$ Có liên kết 1-click mở thẳng hồ sơ cây tại Phân hệ 2.
  - *Tab Sinh thái & Tăng trưởng*: So sánh tốc độ tăng trưởng thực tế vs Dải chuẩn khuyến nghị VietGAP (Ví dụ: Độ tăng chiều cao $34.2 cm/năm$ mấp mé ngưỡng dưới dải chuẩn $40-50 cm$).
  - *Tab Sâu bệnh & IPM*: Tỷ lệ chữa khỏi dứt điểm $92.4\%$, thời gian khỏi bệnh bình quân $5.8$ ngày, chi phí thuốc sinh học trung bình $82.500 đ/ca$.
  - *Tab Dinh dưỡng & Hiệu suất*: Cảnh báo lệch chuẩn hiệu quả (Khu Nam lượng phân bón tăng $+20\%$ nhưng năng suất chỉ tăng $+4\%$).

---

### MÀN HÌNH 07 - 10: IOT & RESOURCE ANALYTICS (TÀI NGUYÊN & PHẦN CỨNG)
- **Đường dẫn**: `/analytics/iot`
- **Thành phần UI**:
  - *Phân tích Suất tiêu thụ Nước*: So sánh Khu Bắc ($18.2 L/kg$) vs Khu Nam ($27.5 L/kg$ - cao hơn 51% do van Solenoid 04 bị rò rỉ áp lực).
  - *Biểu đồ Nước cấp Hàng ngày*: Phân tích lượng nước tưới từng ngày kèm ghi chú tự động giảm tưới khi có mưa tự nhiên.
  - *Xếp hạng Độ tin cậy Thiết bị IoT*: Danh sách trạm cảm biến hoạt động bền bỉ (Trạm `WS-01` đạt 99.9% uptime) vs Thiết bị thường xuyên lỗi (Cảm biến `SM-07` offline 14 lần, pin yếu).
  - *Lợi ích Tự động hóa IoT*: So sánh định mức tưới thủ công $420 m³$ vs Tưới cảm biến $360 m³$ $\rightarrow$ Tiết kiệm $60 m³$ nước và $1.800.000 đ$ tiền điện bơm.

---

### MÀN HÌNH 11 - 12: INVENTORY & ASSET ANALYTICS (VẬT TƯ & MÁY MÓC)
- **Đường dẫn**: `/analytics/resources`
- **Thành phần UI**:
  - *Cân đối Nhập - Xuất - Tồn*: Bảng theo dõi số lượng tồn kho đầu kỳ, lượng nhập mới, lượng xuất dùng thực địa và tồn cuối kỳ của Phân NPK, Trichoderma, Bẫy Pheromone.
  - *Dự báo Hạn mức Cạn kho (Inventory Depletion Forecast)*: Tính toán tốc độ tiêu hao thực tế $20 kg/ngày$ $\rightarrow$ Dự báo NPK cạn kho sau $17.5$ ngày kèm nút gọi hành động `Tạo Đề xuất Mua hàng ngay`.
  - *Phân tích Sửa chữa vs Mua mới (Repair vs Replace TCO Insight)*: Báo cáo máy bơm `P01` có chi phí sửa chữa lũy kế đạt $3.200.000 đ$ (chiếm 40% giá mua mới $8.000.000 đ$) và gây $82$ giờ gián đoạn tưới $\rightarrow$ Đề xuất thay thế trong Q1/2027.

---

### MÀN HÌNH 13 - 17: SALES & FINANCIAL BI (KINH DOANH & TÀI CHÍNH)
- **Đường dẫn**: `/analytics/sales`
- **Thành phần UI**:
  - *Phân tích Danh mục Sản phẩm*: Bảng doanh số, đơn giá bình quân, doanh thu và biên lãi gộp ước tính của từng loại quả (Loại 1 xuất khẩu đạt biên 48.2%, Dừa Dứa thơm đạt biên 51.0%).
  - *Báo cáo Tuổi nợ Khách hàng (Receivables Aging)*: Phân loại 82 triệu công nợ thành 5 kỳ hạn: Trong hạn ($57.3\%$), Quá hạn 1-30 ngày ($17.0\%$), Quá hạn 31-60 ngày ($14.6\%$), Quá hạn 61-90 ngày ($7.3\%$) và Quá hạn $>90$ ngày ($3.8\%$).
  - *Cơ cấu Chi phí Sản xuất*: Bóc tách 184 triệu chi phí tháng thành các nhóm tỷ trọng (Vật tư 39.1%, Điện nước 19.0%, Nhân công 24.5%, Bảo trì 9.8%, Bao bì 7.6%).
  - *Mô hình Bóc tách Chi phí & Lợi nhuận trên Cá thể Cây (Direct Tree Profitability)*:
    - Phân bổ chi phí chi tiết trên cây `A023`: Phân bón 250k, Thuốc sinh học 70k, Nước tưới 80k, Bảo trì 30k $\rightarrow$ Tổng chi phí trực tiếp $430.000 đ/năm$.
    - Doanh thu từ quả thu hoạch: $1.840.000 đ$ (92 quả $\times$ 20.000 đ).
    - **Lợi nhuận trực tiếp**: $+1.410.000 đ/năm$ (Tỷ suất sinh lời ROI đạt $327.9\%$).

---

### MÀN HÌNH 18: BENCHMARKING CENTER (TRUNG TÂM ĐỐI SÁNH)
- **Đường dẫn**: `/analytics/benchmark`
- **Thành phần UI**:
  - Cho phép người dùng chọn **Đối tượng A** (ví dụ: Khu Bắc) và **Đối tượng B** (ví dụ: Khu Nam).
  - Bảng ma trận đối đầu Head-to-Head trên 6 thông số: Năng suất ($12.4$ vs $10.8$ tấn/ha), Nước tiêu hao ($18.2$ vs $27.5$ L/kg), Phân bón ($1.8$ vs $2.2$ kg/cây), Ca bệnh ($2$ vs $11$ ca), Giá thành ($8.200$ vs $10.500$ đ/kg) và Doanh thu ($185$ vs $142$ tr/ha).
  - Tự động gắn nhãn cảnh báo `Lệch chuẩn hiệu quả` đối với các chỉ số lãng phí tài nguyên.

---

### MÀN HÌNH 19: AUTOMATED ANOMALY CENTER (QUẢN TRỊ BẤT THƯỜNG)
- **Đường dẫn**: `/analytics/anomalies`
- **Thành phần UI**:
  - Danh sách các bất thường do thuật toán AI và Heuristics phát hiện, kèm độ lệch chuẩn %, độ tin cậy và mức độ nghiêm trọng (`CRITICAL`, `HIGH`, `MEDIUM`).
  - *Ngăn kéo Drawer Điều tra Chuyên sâu*:
    - Hiển thị mô tả hiện tượng lệch chuẩn.
    - Cụm dữ liệu bằng chứng liên quan (Evidence Data Metrics).
    - Khuyến nghị xử lý và **Nút chuyển tiếp thẳng sang module nguồn** (`Mở Điều Khiển Van IoT`, `Mở Hồ Sơ Cây A023`, `Mở Quản Lý Thiết Bị IoT`).
    - Nút cập nhật trạng thái: `Xác nhận`, `Đã giải quyết`, `Bỏ qua (Dismiss)`.

---

### MÀN HÌNH 20: FORECAST CENTER (DỰ BÁO MÙA VỤ & NHU CẦU)
- **Đường dẫn**: `/analytics/forecast`
- **Thành phần UI**:
  - *Dự báo Sản lượng Thu hoạch Tháng 11/2026*: Dự phóng $1.550 - 1.720$ quả dừa với độ tin cậy $84\%$, hiển thị rõ cận trên và cận dưới kịch bản.
  - *Dự báo Nhu cầu Vật tư 30 Ngày*: Cảnh báo thiếu hụt $100 kg$ Phân NPK trước ngày 22/10 kèm nút `Tạo Đề Xuất Mua Hàng`.
  - *Dự báo Tiêu thụ Nước Mùa khô*: Dự phóng $385 m³/tháng$ do nhiệt độ tăng $1.5^\circ C$.

---

### MÀN HÌNH 21 - 22: CUSTOM REPORT BUILDER (TRÌNH TẠO BÁO CÁO)
- **Đường dẫn**: `/analytics/reports`
- **Thành phần UI**:
  - *Quy trình Thiết kế 5 Bước Trực quan*:
    1. Chọn Nguồn dữ liệu (Cây trồng, Sinh trưởng, Sâu bệnh, IoT, Kho, Kinh doanh, Tài chính).
    2. Chọn Chỉ số muốn đo (Sản lượng, Lượng nước, Chi phí, Doanh thu...).
    3. Chọn Chiều phân tích (Theo Phân khu, Theo Giống dừa, Theo Tháng, Chi tiết từng Cây).
    4. Chọn Dạng trực quan (Biểu đồ Cột, Bảng Dữ liệu, Đường Xu hướng, Biểu đồ Tròn).
    5. Thiết lập Lập lịch Gửi tự động (Schedule: Hàng ngày, Thứ Hai hàng tuần, Ngày 01 hàng tháng qua Email kèm định dạng PDF/Excel).
  - *Màn hình Live Preview tương tác*: Tự động cập nhật biểu đồ mẫu theo cấu hình thời gian thực.
  - *Tab Báo cáo Đã lưu (Saved Reports)*: Danh sách các mẫu báo cáo đã được lưu hành nội bộ kèm nút `Chạy ngay` và `Xuất Excel`.

---

## 5. BẢO MẬT & PHÂN QUYỀN TRUY CẬP (RBAC IN ANALYTICS)

Phân hệ 6 tuân thủ nghiêm ngặt cơ chế phân quyền bảo mật:
- **Chủ trang trại & Giám đốc Điều hành (Owner / Executive)**: Toàn quyền truy cập tất cả các màn hình, bao gồm Doanh thu, Chi phí, Lợi nhuận và Dòng tiền.
- **Kỹ sư Trưởng / Quản lý Nông học (Agronomist / Farm Manager)**: Truy cập Sản xuất, Năng suất, Sâu bệnh, Dinh dưỡng, IoT & Tài nguyên nước, Đối sánh Phân khu, Trung tâm Bất thường. Ẩn thông tin công nợ và biên lợi nhuận tài chính nhạy cảm.
- **Kỹ thuật viên Hiện trường (Field Technician)**: Chỉ xem các báo cáo trực tiếp liên quan đến ca bệnh, nhiệm vụ chăm sóc và trạm cảm biến IoT phụ trách.

---
*Tài liệu được biên soạn và tích hợp chính thức vào hệ thống tài liệu kỹ thuật Smart Farm Management System.*
