# Smart Farm Management System

Hệ thống quản lý trang trại thông minh: quản lý sản xuất cây trồng, vật tư, bán hàng,
phân tích và IoT tưới tiêu (cảm biến, trạm nước, điều khiển bơm qua AWS IoT/MQTT).

> **Trạng thái:** MVP phát triển local. Phân hệ IoT đã nối backend thật; các phân hệ
> khác (sản xuất, vật tư, bán hàng, phân tích, hệ thống) hiện dùng dữ liệu mẫu trong
> `src/data/`. API **chưa có xác thực** và chỉ bind `127.0.0.1` — không public ra mạng.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/` | Frontend React 19 + Vite + Tailwind + TypeScript |
| `backend/` | Spring Boot 3.5 (Java 21), PostgreSQL + Flyway, AWS IoT SDK |
| `firmware/esp32`, `firmware/water-node` | Firmware PlatformIO, chạy giả lập bằng Wokwi |
| `contracts/iot/v1` | JSON Schema cho telemetry / command / ack / event / status |
| `tools/` | Script AWS, khởi tạo DB, smoke test, test Python/C++ |
| `docs/` | Đặc tả phân hệ, sổ nghiệm thu, hướng dẫn chạy |

## Yêu cầu

- Node.js 24 (xem `.nvmrc`)
- JDK 21 (bản đầy đủ, không phải JRE) — Maven dùng wrapper `backend/mvnw`
- Docker (cho PostgreSQL)
- Python 3 + `tools/requirements-day1.txt` (cho script và test Python)

## Chạy local

```bash
# 1. Frontend
npm install
npm run dev            # http://localhost:3000, proxy /api -> 127.0.0.1:8080

# 2. Database (tạo mật khẩu ngẫu nhiên vào .local/postgres/db.env)
python tools/backend/init_local_database.py
docker compose --env-file .local/postgres/db.env up -d --wait postgres

# 3. Backend
cd backend
set -a; . ../.local/postgres/db.env; set +a
./mvnw -B spring-boot:run
```

Biến môi trường: xem `.env.example`. MQTT và điều khiển bơm tắt mặc định
(`SMARTFARM_MQTT_ENABLED`, `SMARTFARM_CONTROL_ENABLED`).

Trên Windows/Git Bash và khi kết nối AWS IoT thật, làm theo
[docs/book/WINDOWS_RUNBOOK.md](docs/book/WINDOWS_RUNBOOK.md) và
[docs/implementation/LOCAL_TELEMETRY_BACKEND.md](docs/implementation/LOCAL_TELEMETRY_BACKEND.md).

## Kiểm thử

```bash
npm run lint                         # kiểm tra kiểu TypeScript
npm run test:nodes                   # Playwright (các script test:* khác trong package.json)
cd backend && ./mvnw -B verify       # test backend
pip install -r tools/requirements-day1.txt
python -m pytest tools/tests         # contract, diagram, provisioning
g++ -std=c++17 tools/tests/relay_safety_test.cpp -o /tmp/relay && /tmp/relay
```

## Tài liệu

- [Tổng quan tài liệu](docs/README.md)
- [Trạng thái nghiệm thu](docs/book/ACCEPTANCE_STATUS.md)
- [Lộ trình thiết bị IoT](docs/plan/AGRICULTURAL_IOT_DEVICE_ROADMAP.md)
