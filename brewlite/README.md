# BrewLite – Ứng dụng đặt cà phê không dùng tiền mặt

Bài tập lớn môn Công nghệ Phần mềm, HK I 2026–2027, Trường ĐH Sài Gòn.

Khách xem menu, chọn size / đường / đá / topping, quản lý giỏ hàng, đăng nhập, thanh toán không tiền mặt (ví, VietQR, thẻ, điểm) và theo dõi trạng thái đơn.

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 15 (React, TypeScript), TailwindCSS 4, **Zustand** (giỏ hàng), **React Query** (gọi API) |
| Backend | NestJS 11 (REST), class-validator, **JWT + Passport**, bcrypt (thư viện `bcryptjs`) |
| CSDL | **PostgreSQL 16 + Prisma** |
| Thanh toán | Mock Payment Service (mô phỏng MoMo, ZaloPay, ShopeePay, VNPay, VietQR, thẻ) |
| DevOps | Docker Compose (frontend + backend + PostgreSQL) |

## Chạy dự án

Cần cài: **Node.js LTS** và **Docker Desktop** (đang mở).

### Cách 1 – Một chạm trên Windows (khuyên dùng khi phát triển)

Nhấp đúp `run-brewlite.bat`. File sẽ: bật PostgreSQL bằng Docker → cài thư viện → tạo bảng (`prisma db push`) → nạp dữ liệu mẫu → mở backend, frontend → mở trình duyệt.

### Cách 2 – Docker Compose (bàn giao, đúng Task 9)

```bash
docker compose up --build
```
(hoặc nhấp đúp `run-docker.bat`). Mở http://localhost:3000. Tắt: `docker compose down` (thêm `-v` để xoá cả dữ liệu).

### Cách 3 – Từng lệnh (macOS / Linux / Windows)

```bash
docker compose up -d db                      # PostgreSQL ở cổng 5433
cd backend
cp .env.example .env                         # Windows: copy .env.example .env
npm install                                  # tự chạy prisma generate
npm run db:setup                             # tạo bảng + nạp dữ liệu mẫu
npm run start:dev                            # http://localhost:3001/health

cd ../frontend                               # cửa sổ terminal thứ hai
cp .env.example .env.local
npm install
npm run dev                                  # http://localhost:3000
```

**Tài khoản demo:** `demo@brewlite.vn` / `Brewlite123` (có sẵn 1.250 điểm).

## Kịch bản demo end-to-end (khoảng 5 phút)

1. Trang chủ: menu lấy từ `GET /products`. Gõ `bx` vào ô tìm kiếm để thấy tìm kiếm thông minh. Món **Bánh croissant** có tồn kho thấp, **Brownie** chỉ còn 5 phần.
2. Bấm **+** trên một món → chọn size, đường, đá, topping → món bay vào giỏ, badge giỏ hàng tăng.
3. Vào giỏ hàng: sửa số lượng, sửa tuỳ chọn, xoá món; tổng tiền tự tính.
4. Bấm thanh toán khi chưa đăng nhập → bị chuyển sang trang đăng nhập (route đặt đơn được JWT bảo vệ).
5. Đăng nhập, chọn **Ví MoMo**, nhập mã `MOMO20`, bấm **Thanh toán ngay** → `POST /orders` tạo đơn **PENDING**.
6. Trong hộp "Đang chờ xác nhận", bấm *Demo: giả lập giao dịch thất bại* → đơn **PAYMENT_FAILED**, giỏ hàng giữ nguyên.
7. Bấm **Thanh toán lại** → `POST /payments` (Idempotency-Key mới) → đơn **PAID**, hiện màn hình xác nhận, cộng điểm.
8. **Theo dõi đơn hàng** → bấm *Demo (vai trò quầy)* để đi PAID → PREPARING → READY → COMPLETED.
9. Trang **Đơn hàng** (`GET /orders/me`) và **Tài khoản** (điểm, lịch sử điểm, đổi quà).
10. Mở terminal chạy `npm run test` và `npm run test:int` trong `backend` để chứng minh Task 10.

## Product Backlog → mã nguồn

| # | Task | Nằm ở đâu |
|---|---|---|
| 1 | Khởi tạo dự án | `frontend/`, `backend/`, `docker-compose.yml`, `*/Dockerfile`, `.env.example`, trang Hello: `GET /health` (kiểm tra cả kết nối CSDL) |
| 2 | API sản phẩm | `backend/src/products/` – `GET /products`, `GET /products/:id` từ PostgreSQL qua Prisma |
| 3 | Trang Menu | `frontend/components/menu/MenuBrowser.tsx` – loading (skeleton), lỗi (thử lại), empty state |
| 4 | Chi tiết và tuỳ chọn | `frontend/components/product/ProductCustomizer.tsx` – size S/M/L, topping, tính lại giá |
| 5 | Giỏ hàng | `frontend/context/app-store.tsx` – **Zustand** + persist; thêm, sửa, xoá, tổng tiền, badge |
| 6 | API tạo đơn | `backend/src/orders/` – `POST /orders`, class-validator, đơn **PENDING**, trả mã đơn |
| 7 | Đăng ký / đăng nhập | `backend/src/auth/` – bcrypt, JWT qua **Passport** (`jwt.strategy.ts`), `JwtAuthGuard` |
| 8 | Thanh toán | `backend/src/payments/` – `POST /payments`; **PAID** khi thành công, **PAYMENT_FAILED** khi lỗi |
| 9 | Xác nhận, lịch sử, bàn giao | Màn hình xác nhận trong `Checkout.tsx`, `GET /orders/me`, Docker Compose, README này |
| 10 | Nghiệp vụ backend | Xem mục dưới |

## Task 10 – nghiệp vụ backend

**1. Máy trạng thái đơn hàng** – `backend/src/orders/order-state-machine.ts`

```
PENDING → PAID → PREPARING → READY → COMPLETED
PENDING → PAYMENT_FAILED → PENDING (thử lại)
PENDING / PAYMENT_FAILED / PAID → CANCELLED
```
Mọi lần đổi trạng thái đều qua `assertTransition(from, to)`; chuyển tiếp không có trong bảng bị ném lỗi 409. Thêm vào đó, câu UPDATE có điều kiện `WHERE status = <trạng thái cũ>` để 2 request đồng thời không cùng đổi một đơn.

**2. Thanh toán idempotent** – `backend/src/payments/payments.service.ts`

Client gửi header `Idempotency-Key` (UUID mới cho mỗi lần bấm thanh toán, gửi lại khi mạng lỗi thì dùng lại khoá cũ). Cột `Payment.idempotencyKey` là **UNIQUE**: request đầu tiên INSERT được thì gọi cổng thanh toán; request trùng khoá (tuần tự hoặc đồng thời) chỉ nhận lại kết quả cũ, không trừ tiền, không cộng điểm lần 2.

**3. Tồn kho khi đặt đồng thời** – `OrdersService.create`

Trong một **transaction**: đọc sản phẩm kèm cột `version`, rồi `UPDATE ... SET stock = stock - qty, version = version + 1 WHERE id = ? AND version = ?` (**optimistic locking**). Nếu 0 dòng được cập nhật nghĩa là người khác vừa trừ kho trước → rollback và thử lại (tối đa 8 lần, có lùi ngẫu nhiên). Kho không đủ → 409. Huỷ đơn chưa thanh toán thì hoàn kho.

**4. Khuyến mãi và điểm thưởng** – `backend/src/promotions/`

Mã giảm giá lưu trong bảng `Voucher` (điều kiện: đơn tối thiểu, phương thức thanh toán, giao hàng, giới hạn lượt). Backend tự tính lại tiền, không tin giá từ trình duyệt. Điểm chỉ cộng khi đơn **PAID** (1.000đ = 1 điểm), lưu lịch sử ở `LoyaltyTransaction`.

### Test chứng minh (tiêu chí chấm)

```bash
cd backend
npm run test        # unit test: máy trạng thái (a), luật khuyến mãi
npm run test:int    # integration test trên PostgreSQL thật (cần docker compose up -d db)
```

| Tiêu chí | Test |
|---|---|
| (a) chặn chuyển trạng thái sai | `src/orders/order-state-machine.spec.ts`, `test/stock-concurrency.int-spec.ts` |
| (b) 2 lần cùng Idempotency-Key chỉ tạo 1 giao dịch | `test/payments-idempotency.int-spec.ts` (gửi tuần tự và 5 request đồng thời) |
| (c) đặt đồng thời không vượt tồn kho | `test/stock-concurrency.int-spec.ts` (kho 5, 12 khách đặt cùng lúc → đúng 5 đơn) |

## API

| Phương thức | Đường dẫn | Đăng nhập | Việc |
|---|---|---|---|
| GET | `/health` | | Kiểm tra backend và CSDL |
| GET | `/products`, `/products/:id` | | Menu, chi tiết món |
| POST | `/auth/register`, `/auth/login` | | Đăng ký, đăng nhập (trả JWT) |
| GET | `/auth/me` | Có | Tài khoản, điểm, lịch sử điểm |
| POST | `/auth/redeem` | Có | Đổi điểm lấy quà |
| POST | `/orders` | Có | Tạo đơn PENDING, giữ tồn kho |
| GET | `/orders/me` | Có | Lịch sử đơn |
| GET | `/orders/:id` | Có | Chi tiết đơn |
| POST | `/orders/:id/cancel` | Có | Huỷ đơn chưa thanh toán, hoàn kho |
| POST | `/orders/:id/advance` | Có | Demo vai trò quầy: bước tiếp theo |
| POST | `/payments` | Có | Thanh toán, header `Idempotency-Key` bắt buộc |

## Cấu trúc thư mục

```
brewlite/
├── docker-compose.yml        PostgreSQL + backend + frontend
├── run-brewlite.bat          Chạy một chạm (Windows)
├── run-docker.bat            docker compose up --build
├── backend/                  NestJS – cổng 3001
│   ├── prisma/schema.prisma  User, Product, Topping, Order, OrderItem, Payment, Voucher, LoyaltyTransaction
│   ├── src/auth/             đăng ký, đăng nhập, JWT Passport
│   ├── src/products/         GET /products
│   ├── src/orders/           tạo đơn, máy trạng thái, tồn kho
│   ├── src/payments/         thanh toán idempotent, cổng giả lập
│   ├── src/promotions/       mã giảm giá, điểm thưởng
│   ├── src/seed.ts           dữ liệu mẫu
│   └── test/                 integration test (PostgreSQL thật)
└── frontend/                 Next.js – cổng 3000
    ├── app/                  các trang
    ├── components/           giao diện
    ├── context/              Zustand (giỏ hàng), đăng nhập
    └── lib/                  gọi API, React Query, tìm kiếm, định dạng
```

## Biến môi trường

| File | Biến | Ý nghĩa |
|---|---|---|
| backend/.env | PORT | Cổng API (3001) |
| backend/.env | DATABASE_URL | Chuỗi kết nối PostgreSQL |
| backend/.env | JWT_SECRET | Khoá ký token, đổi khi triển khai thật |
| backend/.env | FRONTEND_URL | Địa chỉ frontend được phép gọi API (CORS) |
| frontend/.env.local | NEXT_PUBLIC_API_URL | Địa chỉ API mà trình duyệt gọi tới |

## Lỗi thường gặp

- **"Docker Desktop chưa chạy"**: mở Docker Desktop, đợi biểu tượng cá voi ngừng nhấp nháy rồi chạy lại.
- **Trang báo "Không tải được thực đơn"**: backend chưa chạy hoặc PostgreSQL chưa bật. Mở http://localhost:3001/health, phải thấy `"db":"up"`.
- **Cổng 5433 hoặc 3000/3001 đang bị dùng**: tắt chương trình đang chiếm cổng, hoặc sửa cổng trong `docker-compose.yml` và `.env`.
- **Làm lại dữ liệu từ đầu**: `docker compose down -v`, rồi chạy lại.
- Ghi chú: dùng `bcryptjs` (cùng thuật toán bcrypt, viết bằng JavaScript) để khỏi phải biên dịch thư viện C++ trên Windows.

## Quy ước làm việc nhóm

- Không push thẳng vào `main`; làm trên nhánh `feat/task-<số>-<mô-tả>`.
- Mỗi Pull Request cần ít nhất 1 thành viên khác duyệt.
- Commit theo dạng: `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`, `chore: ...`.
