# BrewLite – Ứng dụng đặt cà phê không dùng tiền mặt

Bài tập lớn môn Công nghệ Phần mềm, HK I 2026–2027, Trường ĐH Sài Gòn.

Khách xem menu, chọn size / đường / đá / topping, quản lý giỏ hàng, đăng nhập, **liên kết tài khoản ảo (ví điện tử / thẻ)**, thanh toán không tiền mặt **trừ tiền thật vào số dư tài khoản ảo** (hoặc trừ điểm) và theo dõi trạng thái đơn.

BrewLite có **một chi nhánh duy nhất: BrewLite An Dương Vương** (273 An Dương Vương, Phường 3, Quận 5, TP.HCM). Khách tới quầy đọc mã đơn để nhận món.

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 15 (React, TypeScript), TailwindCSS 4, **Zustand** (giỏ hàng), **React Query** (gọi API) |
| Backend | NestJS 11 (REST), class-validator, **JWT + Passport**, bcrypt (thư viện `bcryptjs`) |
| CSDL | **PostgreSQL 16 + Prisma** |
| Thanh toán | **Tài khoản ảo liên kết** (bảng `WalletAccount`): ví MoMo, ZaloPay, ShopeePay, VNPay, thẻ ngân hàng. Thanh toán thành công trừ thẳng vào số dư, không đủ số dư thì đơn `PAYMENT_FAILED` |
| DevOps | Docker Compose (frontend + backend + PostgreSQL) |

## Nhóm và phân công

| Thành viên | Vai trò | Phần phụ trách trong mã nguồn |
|---|---|---|
| Nguyễn Tiến Đạt | Product Owner, Developer | Lược đồ CSDL (Prisma), dữ liệu mẫu, API sản phẩm, trang thực đơn và chi tiết món, mã giảm giá |
| Phan Thành Đạt | Scrum Master, Developer | Khởi tạo dự án, khung giao diện, lịch sử đơn hàng, Docker Compose, CI, README |
| Trần Anh Trung | Developer | Đăng ký, đăng nhập (JWT), trang tài khoản, đổi điểm thưởng, giao diện liên kết / nạp tiền tài khoản ảo |
| Đinh Văn Đạt | Developer | API tạo đơn, thanh toán idempotent trừ tiền tài khoản ảo, API tài khoản ảo, giao diện thanh toán |
| Đỗ Chí Thanh | Developer | Giỏ hàng, theo dõi đơn hàng, hoá đơn |
| Lê Bảo Trọng Tấn | Developer | Máy trạng thái đơn hàng, tồn kho khi đặt đồng thời, huỷ đơn và hoàn kho, demo vai trò quầy |

Chi tiết thư mục của từng người: [CONTRIBUTING.md](CONTRIBUTING.md#5-phân-chia-phần-code).

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

**Tài khoản demo:** `demo@brewlite.vn` / `Brewlite123` (có sẵn 1.250 điểm và 2 tài khoản ảo đã liên kết):

| Tài khoản ảo | Số | Số dư ban đầu | Dùng để demo |
|---|---|---|---|
| Ví MoMo | 090•••4567 | 300.000đ | Thanh toán thành công, số dư bị trừ |
| Thẻ ngân hàng | •••• 4242 | 20.000đ | Thanh toán thất bại do không đủ số dư (`PAYMENT_FAILED`), nạp tiền rồi thanh toán lại |

Tài khoản mới đăng ký chưa có tài khoản ảo: vào **Tài khoản → Tài khoản ảo liên kết** để liên kết (ví: số điện thoại 10 số; thẻ: 16 số, ví dụ thẻ thử `4242 4242 4242 4242`). Mỗi tài khoản ảo mới được cấp sẵn 200.000đ, nạp thêm được 10.000đ – 2.000.000đ mỗi lần.

> **Đã chạy bản cũ trước đây?** Bản này đổi lược đồ CSDL (thêm bảng tài khoản ảo, bỏ chi nhánh và mã lấy món), nên `docker-compose.yml` dùng kho dữ liệu mới `pgdata_v2`, tự tạo CSDL sạch. Muốn xoá dữ liệu làm lại từ đầu (ví dụ trước buổi demo): nhấp đúp `reset-database.bat`.

## Kịch bản demo end-to-end (khoảng 5 phút)

1. Trang chủ: menu lấy từ `GET /products`. Gõ `bx` vào ô tìm kiếm để thấy tìm kiếm thông minh. Món **Bánh croissant** có tồn kho thấp, **Brownie** chỉ còn 5 phần.
2. Bấm **+** trên một món → chọn size, đường, đá, topping → món bay vào giỏ, badge giỏ hàng tăng.
3. Vào giỏ hàng: sửa số lượng, sửa tuỳ chọn, xoá món; tổng tiền tự tính.
4. Bấm thanh toán khi chưa đăng nhập → bị chuyển sang trang đăng nhập (route đặt đơn được JWT bảo vệ).
5. Đăng nhập. Vào **Tài khoản → Tài khoản ảo liên kết**: thấy ví MoMo 300.000đ và thẻ 20.000đ (`GET /wallets`). Liên kết thêm ví ZaloPay bằng số điện thoại (`POST /wallets`).
6. Quay lại giỏ hàng, chọn **Thẻ ngân hàng** (số dư 20.000đ, giao diện báo trước không đủ), bấm **Thanh toán ngay** → `POST /orders` tạo đơn **PENDING** → `POST /payments` bị từ chối vì không đủ số dư → đơn **PAYMENT_FAILED**, số dư không bị trừ, giỏ hàng giữ nguyên.
7. Trong hộp báo lỗi bấm **Nạp 100.000đ vào tài khoản ảo** (`POST /wallets/:id/topup`), rồi **Thanh toán lại** (Idempotency-Key mới) → đơn **PAID**, hiện "Đã trừ … vào tài khoản ảo, số dư còn …", cộng điểm.
8. Đặt đơn thứ hai bằng **Ví MoMo** với mã `MOMO20` → PAID, số dư MoMo giảm đúng số tiền.
9. **Theo dõi đơn hàng**: mã đơn để đọc tại quầy An Dương Vương; bấm *Demo (vai trò quầy)* để đi PAID → PREPARING → READY → COMPLETED.
10. Trang **Tài khoản**: bấm *Lịch sử số dư* của từng tài khoản ảo để thấy từng lần trừ tiền gắn với mã đơn; trang **Đơn hàng** (`GET /orders/me`).
11. Mở terminal chạy `npm run test` và `npm run test:int` trong `backend` để chứng minh Task 10 và việc trừ tiền tài khoản ảo.

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
| 8 | Thanh toán | `backend/src/payments/` – `POST /payments` trừ tiền vào tài khoản ảo (`backend/src/wallets/`); **PAID** khi đủ số dư, **PAYMENT_FAILED** khi không đủ hoặc chưa liên kết |
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

Client gửi header `Idempotency-Key` (UUID mới cho mỗi lần bấm thanh toán, gửi lại khi mạng lỗi thì dùng lại khoá cũ). Cột `Payment.idempotencyKey` là **UNIQUE**: request đầu tiên INSERT được thì đi tiếp; request trùng khoá (tuần tự hoặc đồng thời) chỉ nhận lại kết quả cũ, không trừ tiền, không cộng điểm lần 2.

Request đi tiếp mở **một transaction**: khoá dòng đơn hàng (`SELECT … FOR UPDATE`), trừ tiền tài khoản ảo bằng `UPDATE "WalletAccount" SET balance = balance - total WHERE id = ? AND balance >= total`, ghi `WalletTransaction`, chuyển đơn sang PAID và cộng điểm. Không đủ số dư thì câu UPDATE không đổi dòng nào → đơn PAYMENT_FAILED, không trừ đồng nào. Có lỗi giữa chừng thì cả transaction rollback, tiền cũng không bị trừ. Nhờ vậy số dư không bao giờ âm, kể cả khi nhiều đơn thanh toán cùng lúc.

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
| (b) 2 lần cùng Idempotency-Key chỉ tạo 1 giao dịch | `test/payments-idempotency.int-spec.ts` (gửi tuần tự và 5 request đồng thời: số dư tài khoản ảo chỉ bị trừ 1 lần) |
| Trừ tiền tài khoản ảo | `test/payments-idempotency.int-spec.ts` (không đủ số dư → PAYMENT_FAILED, nạp thêm rồi thử lại → PAID; số dư 50.000đ, 5 đơn 30.000đ trả cùng lúc → đúng 1 đơn PAID), `test/wallets.int-spec.ts` (liên kết, nạp tiền, huỷ liên kết), `src/wallets/wallet-rules.spec.ts` |
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
| POST | `/payments` | Có | Thanh toán: trừ tiền tài khoản ảo (hoặc điểm), header `Idempotency-Key` bắt buộc |
| GET | `/wallets` | Có | Tài khoản ảo đã liên kết, số dư, lịch sử số dư |
| POST | `/wallets` | Có | Liên kết tài khoản ảo `{ provider, accountNumber, holderName? }` |
| POST | `/wallets/:id/topup` | Có | Nạp tiền `{ amount }` (10.000đ – 2.000.000đ) |
| DELETE | `/wallets/:id` | Có | Huỷ liên kết |

## Cấu trúc thư mục

```
brewlite/
├── docker-compose.yml        PostgreSQL + backend + frontend
├── run-brewlite.bat          Chạy một chạm (Windows)
├── run-docker.bat            docker compose up --build
├── reset-database.bat        Xoá dữ liệu, làm lại CSDL từ đầu
├── backend/                  NestJS – cổng 3001
│   ├── prisma/schema.prisma  User, Product, Topping, Order, OrderItem, Payment, Voucher, LoyaltyTransaction, WalletAccount, WalletTransaction
│   ├── src/auth/             đăng ký, đăng nhập, JWT Passport
│   ├── src/products/         GET /products
│   ├── src/orders/           tạo đơn, máy trạng thái, tồn kho
│   ├── src/payments/         thanh toán idempotent, trừ tiền tài khoản ảo
│   ├── src/wallets/          tài khoản ảo: liên kết, nạp tiền, trừ tiền
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
- **Làm lại dữ liệu từ đầu**: nhấp đúp `reset-database.bat` (hoặc `docker compose down -v`), rồi chạy lại `run-brewlite.bat`.
- **Báo "Bạn chưa liên kết Ví …" khi thanh toán**: vào trang Tài khoản liên kết tài khoản ảo tương ứng, hoặc chọn ví/thẻ đã liên kết.
- Ghi chú: dùng `bcryptjs` (cùng thuật toán bcrypt, viết bằng JavaScript) để khỏi phải biên dịch thư viện C++ trên Windows.

## Quy ước làm việc nhóm

- Không push thẳng vào `main`; làm trên nhánh `feat/task-<số>-<mô-tả>`.
- Mỗi Pull Request cần ít nhất 1 thành viên khác duyệt.
- Commit theo dạng: `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`, `chore: ...`.

## Làm việc nhóm

Xem [CONTRIBUTING.md](CONTRIBUTING.md): tạo nhánh riêng, commit bằng tài khoản của mình, mở pull request và nhờ một bạn review trước khi merge.
