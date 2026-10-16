# Tài Liệu Hệ Thống Quản Lý Trang Trại Thông Minh (Smart Farm Management System)

## Kiến thức và định hướng nghề nghiệp

- [Bản đồ kiến thức Web / Cloud / AI cho vị trí PG・SE tại Nhật Bản](knowledge/code.md):
  sơ đồ từ cơ bản đến nâng cao, stack ưu tiên, bài thực hành, kỹ năng SE/tiếng Nhật
  và checklist tự đánh giá dựa trên JD được cung cấp.

## Định hướng IoT nông nghiệp đang ưu tiên

- [Ý tưởng và lộ trình thiết bị 14/10/2026](plan/AGRICULTURAL_IOT_DEVICE_ROADMAP.md):
  cây trồng/tưới 4 dãy, trạm nước, chăn nuôi, camera; 18 nhóm node và backlog A0–A6.
- [Trạng thái đã kiểm chứng](book/ACCEPTANCE_STATUS.md) và
  [chạy demo Windows](book/WINDOWS_RUNBOOK.md).


Thư mục `docs` chứa các tài liệu đặc tả thiết kế, kiến trúc giao diện người dùng (UI/UX) và quy trình nghiệp vụ cho hệ thống Smart Farm Management System.

---

## Danh Sách Tài Liệu

### 1. Phân Hệ Sản Xuất & Cây Trồng
- **Tài liệu Đặc tả Giao diện Hiện tại**: [UI_Mo_Ta_Phan_He_San_Xuat_Cay_Trong.md](./UI_Mo_Ta_Phan_He_San_Xuat_Cay_Trong.md)
- **Tài liệu Báo cáo UX Audit & Cải tiến Toàn diện**: [UX_AUDIT_AND_REDESIGN_SPECIFICATION.md](./UX_AUDIT_AND_REDESIGN_SPECIFICATION.md)
- **Nội dung**: Phân tích kiểm toán UX (Audit), giải quyết vấn đề "Card Fatigue", tối ưu hóa luồng tương tác *Overview → Detect → Investigate → Act*, thiết kế chuẩn độ phân giải 1366×768 (No-scroll goal), trải nghiệm ngoài thực địa (Field UX & Outdoor Mode) và hệ thống Design System chuẩn hóa.
- **Bao gồm các màn hình**:
  1. `ProductionDashboard` (`/production/dashboard`): Tổng quan sức khỏe đàn cây, KPI ma trận vườn, việc hôm nay, biểu đồ sinh trưởng.
  2. `GardenMap` (`/production/map`): Sơ đồ vườn trực quan, định vị cá thể cây theo hàng A/B, quản lý lớp IoT & bệnh hại, drawer thông tin nhanh.
  3. `PlantList` (`/production/plants`): Bảng dữ liệu danh sách cây trồng, lọc đa tiêu chí, phân trang và thao tác nhanh.
  4. `PlantDetail` (`/production/plants/:id`): Hồ sơ cá thể cây chuyên sâu với 8 tab dữ liệu (Tổng quan, Sinh trưởng, Việc, Dinh dưỡng, Tưới tiêu, Sâu bệnh, Thu hoạch, Dòng thời gian vòng đời).
  5. `PlantForm` (`/production/plants/new` & `edit`): Đăng ký xuống giống và cập nhật thông tin cây.
  6. `GrowthTracking` (`/production/growth`): Theo dõi và phân tích chỉ số sinh trưởng cá thể cây.
  7. `TaskManager` (`/production/tasks`): Quản lý công việc và lịch chăm sóc với 3 chế độ xem (List, Calendar, Kanban) kèm cơ chế tự động trừ kho vật tư.
  8. `NutritionManager` (`/production/nutrition`): Quản lý quy trình dinh dưỡng chuẩn VietGAP và lịch sử bón phân thực tế.
  9. `IrrigationManager` (`/production/irrigation`): Giám sát độ ẩm đất theo luống, lưu lượng nước và điều khiển van Solenoid.
  10. `EnvironmentMonitoring` (`/production/environment`): Giám sát hóa lý đất (pH, EC, độ ẩm) và vi khí hậu thời gian thực từ cảm biến IoT.
  11. `DiseaseLibrary` (`/production/diseases`): Thư viện sâu bệnh hại IPM, triệu chứng và phác đồ điều trị sinh học.
  12. `PesticideList` (`/production/pesticides`): Danh mục thuốc BVTV sinh học, kiểm soát thời gian cách ly (PHI) và công cụ tính liều lượng pha.
  13. `DiseaseCaseManager` (`/production/disease-cases`): Quản lý quy trình điều trị ca bệnh theo từng cá thể cây.
  14. `HarvestManager` (`/production/harvests`): Quản lý thu hoạch, phân loại phẩm cấp (Loại 1, Loại 2) và tự động sinh mã Lô thu hoạch.
  15. `TraceabilityView` (`/production/traceability`): Cổng thông tin truy xuất nguồn gốc và minh bạch nhật ký vòng đời nông sản.

### 2. Phân Hệ Báo Cáo & Phân Tích (BI & Analytics)
- **Tài liệu Đặc tả Thiết kế & Kiến trúc Dữ liệu**: [PHAN_HE_6_BAO_CAO_PHAN_TICH_SPECIFICATION.md](./PHAN_HE_6_BAO_CAO_PHAN_TICH_SPECIFICATION.md)
- **Nội dung**: Đặc tả toàn diện hệ thống BI Nông nghiệp tích hợp đa phân hệ (Cây trồng + Vật tư + IoT + Bán hàng + Tài chính), chu trình tương tác *Overview → Drill-down → Compare → Diagnose → Action*, cơ chế phân định minh bạch bản chất dữ liệu (Thực tế, Ước tính, Dự báo, Bất thường), và hệ thống 22 màn hình phân tích điều hành chuyên sâu.
- **Bao gồm các màn hình chính**:
  1. `ExecutiveDashboard` (`/analytics/dashboard`): Bộ 8 KPI điều hành chiến lược, 6 KPI vận hành phụ, Bản đồ sức khỏe trang trại (Farm Health Map) 3 phân khu, dòng tiền lợi nhuận gộp 6 tháng và hiệu suất tài nguyên.
  2. `ProductionAnalytics` (`/analytics/production`): Phân tích nông học, phân bố sản lượng, bảng xếp hạng Top 10 & Bottom 10 cây (Tree Performance Ranking) kết nối trực tiếp hồ sơ cá thể cây `A023`, dải chuẩn tăng trưởng sinh học và hiệu quả phác đồ IPM.
  3. `IoTResourceAnalytics` (`/analytics/iot`): Hiệu suất tiêu thụ nước tưới (so sánh Khu Bắc $18.2 L/kg$ vs Khu Nam $27.5 L/kg$), độ tin cậy trạm cảm biến LoRaWAN và giá trị tiết kiệm nước thực tế từ tự động hóa ($60 m^3$).
  4. `ResourceAnalytics` (`/analytics/resources`): Cân đối Nhập - Xuất - Tồn vật tư, dự báo số ngày còn lại đến khi cạn kho (Reorder Alert) và phân tích TCO sửa chữa vs mua mới máy móc.
  5. `SalesFinanceAnalytics` (`/analytics/sales`): Doanh thu theo sản phẩm, báo cáo tuổi nợ khách hàng (Aging 30-60-90 ngày), bóc tách chi phí và tính toán lãi trực tiếp trên từng cá thể cây (`A023`: Doanh thu 1.84M, Chi phí 430k $\rightarrow$ Lợi nhuận trực tiếp 1.41M).
  6. `BenchmarkView` (`/analytics/benchmark`): Trung tâm đối sánh đa chiều trực tiếp giữa 2 phân khu hoặc cá thể cây vs chuẩn đàn.
  7. `AnomalyCenter` (`/analytics/anomalies`): Trung tâm quản trị bất thường tự động bằng AI, ngăn kéo điều tra nguyên nhân kèm bằng chứng liên đới (Evidence Data) và nút chuyển tiếp sang module nguồn xử lý.
  8. `ForecastCenter` (`/analytics/forecast`): Dự báo mùa vụ tháng tới kèm dải tin cậy xác suất ($84\%$) và dự báo thiếu hụt vật tư phân bón 30 ngày.
  9. `ReportBuilder` (`/analytics/reports`): Trình tạo báo cáo tùy biến 5 bước, xem trước tương tác (Live Preview) và lập lịch gửi báo cáo tự động định kỳ.
