<div align="center">

# ☕ BrewLite

**Ứng dụng đặt cà phê không dùng tiền mặt**

Bài tập lớn môn Công nghệ Phần mềm · Học kỳ I, năm học 2026–2027 · Trường Đại học Sài Gòn

`Next.js 15` · `NestJS 11` · `PostgreSQL 16` · `Prisma` · `Docker Compose`

</div>

---

## Mục lục

1. [Giới thiệu](#giới-thiệu)
2. [Tính năng chính](#tính-năng-chính)
3. [Công nghệ sử dụng](#công-nghệ-sử-dụng)
4. [Cài đặt và chạy dự án](#cài-đặt-và-chạy-dự-án)
5. [Kịch bản demo](#kịch-bản-demo)
6. [Product Backlog và mã nguồn](#product-backlog-và-mã-nguồn)
7. [Nghiệp vụ backend nâng cao](#nghiệp-vụ-backend-nâng-cao)
8. [Kiểm thử](#kiểm-thử)
9. [Tài liệu API](#tài-liệu-api)
10. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
11. [Biến môi trường](#biến-môi-trường)
12. [Xử lý sự cố](#xử-lý-sự-cố)
13. [Quy ước làm việc nhóm](#quy-ước-làm-việc-nhóm)

---

## Giới thiệu

**BrewLite** là ứng dụng web giúp khách hàng đặt đồ uống và thanh toán hoàn toàn không dùng tiền mặt. Khách có thể xem thực đơn, tùy chỉnh món theo ý thích, quản lý giỏ hàng, thanh toán qua ví điện tử, VietQR, thẻ hoặc điểm thưởng, rồi theo dõi trạng thái đơn hàng.

## Tính năng chính

- 🔍 **Thực đơn và tìm kiếm thông minh**: tìm kiếm không dấu (gõ `bx` ra "bạc xỉu"), hiển thị món sắp hết hàng.
- 🎛️ **Tùy chỉnh món**: chọn size S/M/L, mức đường, mức đá, topping; giá tự tính lại.
- 🛒 **Giỏ hàng**: thêm, sửa, xóa món; tổng tiền cập nhật tức thì, giữ nguyên khi tải lại trang.
- 🔐 **Tài khoản**: đăng ký, đăng nhập bằng JWT; chức năng đặt đơn được bảo vệ.
- 💳 **Thanh toán không tiền mặt**: MoMo, ZaloPay, ShopeePay, VNPay, VietQR, thẻ (cổng giả lập), hỗ trợ thanh toán lại khi thất bại.
- 🎁 **Khuyến mãi và điểm thưởng**: áp mã giảm giá, tích điểm khi thanh toán thành công, đổi điểm lấy quà.
- 📦 **Theo dõi đơn hàng**: cập nhật trạng thái từ lúc đặt đến khi hoàn thành.

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| **Frontend** | Next.js 15 (React, TypeScript), TailwindCSS 4, Zustand (giỏ hàng), React Query (gọi API) |
| **Backend** | NestJS 11 (REST API), class-validator, JWT + Passport, bcrypt (`bcryptjs`) |
| **Cơ sở dữ liệu** | PostgreSQL 16, Prisma ORM |
| **Thanh toán** | Mock Payment Service mô phỏng MoMo, ZaloPay, ShopeePay, VNPay, VietQR, thẻ |
| **DevOps** | Docker, Docker Compose (frontend + backend + PostgreSQL) |

## Cài đặt và chạy dự án

### Yêu cầu

- Node.js bản LTS
- Docker Desktop (đang chạy)

### Cách 1: Chạy một chạm trên Windows (khuyên dùng khi phát triển)

Nhấp đúp vào `run-brewlite.bat`. Script sẽ tự động:

1. Khởi động PostgreSQL bằng Docker
2. Cài đặt thư viện
3. Tạo bảng (`prisma db push`) và nạp dữ liệu mẫu
4. Chạy backend, frontend và mở trình duyệt

### Cách 2: Docker Compose (dùng khi bàn giao)
>>>>>>> 9743307f3f271670b136d791f593dda74af30d0c

```bash
docker compose up --build
```
<<<<<<< HEAD
(hoặc nhấp đúp `run-docker.bat`). Mở http://localhost:3000. Tắt: `docker compose down` (thêm `-v` để xoá cả dữ liệu).

### Cách 3 – Từng lệnh (macOS / Linux / Windows)

```bash
docker compose up -d db                      # PostgreSQL ở cổng 5433
cd backend
cp .env.example .env                         # Windows: copy .env.example .env, rồi điền VNP_TMN_CODE, VNP_HASH_SECRET
npm install                                  # tự chạy prisma generate
npm run db:setup                             # tạo bảng + nạp dữ liệu mẫu
npm run start:dev                            # http://localhost:3001/health

cd ../frontend                               # cửa sổ terminal thứ hai
cp .env.example .env.local
npm install
npm run dev                                  # http://localhost:3000
```

**Tài khoản demo:** `demo@brewlite.vn` / `Brewlite123` (có sẵn 1.250 điểm).

**Thẻ test VNPay sandbox** (VNPay công bố cho môi trường thử, không phải thẻ thật):

| Ngân hàng | Số thẻ | Tên chủ thẻ | Ngày phát hành | Mã OTP |
|---|---|---|---|---|
| NCB | 9704198526191432198 | NGUYEN VAN A | 07/15 | 123456 |

Trên trang VNPay chọn **Thẻ nội địa và tài khoản ngân hàng → NCB**, nhập thông tin trên, OTP `123456`. Muốn demo thất bại: bấm **Hủy thanh toán** trên trang VNPay (mã 24).

> **Đã chạy bản cũ trước đây?** Bản này bỏ tài khoản ảo và đổi bảng thanh toán sang VNPay, nên `docker-compose.yml` dùng kho dữ liệu mới `pgdata_v3`, tự tạo CSDL sạch. Muốn xoá dữ liệu làm lại từ đầu (ví dụ trước buổi demo): nhấp đúp `reset-database.bat`.

## Kịch bản demo end-to-end (khoảng 5 phút)

1. Trang chủ: menu lấy từ `GET /products`. Gõ `bx` vào ô tìm kiếm để thấy tìm kiếm thông minh. Món **Bánh croissant** có tồn kho thấp, **Brownie** chỉ còn 5 phần.
2. Bấm **+** trên một món → chọn size, đường, đá, topping → món bay vào giỏ, badge giỏ hàng tăng.
3. Vào giỏ hàng: sửa số lượng, sửa tuỳ chọn, xoá món; tổng tiền tự tính.
4. Bấm thanh toán khi chưa đăng nhập → bị chuyển sang trang đăng nhập (route đặt đơn được JWT bảo vệ).
5. Đăng nhập, quay lại giỏ hàng, chọn **VNPay**, nhập mã `VNPAY20`, bấm **Thanh toán ngay** → `POST /orders` tạo đơn **PENDING** → `POST /payments` trả link VNPay đã ký → trình duyệt sang trang VNPay sandbox.
6. Trên trang VNPay bấm **Hủy thanh toán** → VNPay đưa về `/payment/vnpay-return` → backend kiểm tra chữ ký, ghi giao dịch **FAILED** (mã 24), đơn **PAYMENT_FAILED**, giỏ hàng giữ nguyên.
7. Bấm **Thanh toán lại qua VNPay** (link mới, Idempotency-Key mới) → trả bằng thẻ NCB ở trên, OTP `123456` → về BrewLite: đơn **PAID**, hiện mã giao dịch VNPay, ngân hàng, thời gian, cộng điểm, giỏ hàng được xoá.
8. Thử sửa `vnp_ResponseCode` trên thanh địa chỉ rồi tải lại trang → báo **chữ ký không hợp lệ**, không ghi nhận (chống giả mạo kết quả).
9. Mở **Lịch sử giao dịch** (menu tài khoản hoặc trang Tài khoản → Xem tất cả): thấy 2 giao dịch (thất bại, thành công). Bấm vào giao dịch thành công: chi tiết + nhật ký trao đổi với VNPay; bấm **Kiểm tra lại với VNPay** để hỏi lại VNPay (API `querydr`).
10. Đăng nhập trang quản trị merchant sandbox https://sandbox.vnpayment.vn/merchantv2/ (tài khoản trong email đăng ký) → **Tra cứu giao dịch**: thấy đúng giao dịch, đúng số tiền và mã `vnp_TxnRef` như trong BrewLite.
11. **Theo dõi đơn hàng**: mã đơn để đọc tại quầy An Dương Vương; bấm *Demo (vai trò quầy)* để đi PAID → PREPARING → READY → COMPLETED.
12. Mở terminal chạy `npm run test` và `npm run test:int` trong `backend` để chứng minh Task 10 và việc xử lý kết quả VNPay.

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
| 8 | Thanh toán | `backend/src/payments/` – `POST /payments` tạo link VNPay (`vnpay/`), kết quả về qua Return URL / IPN: **PAID** khi VNPay báo thành công, **PAYMENT_FAILED** khi khách huỷ hoặc thẻ lỗi |
| 9 | Xác nhận, lịch sử, bàn giao | Trang kết quả `VnpayReturn.tsx`, lịch sử giao dịch `GET /payments/me`, `GET /orders/me`, Docker Compose, README này |
| 10 | Nghiệp vụ backend | Xem mục dưới |

## Task 10 – nghiệp vụ backend

**1. Máy trạng thái đơn hàng** – `backend/src/orders/order-state-machine.ts`

```
PENDING → PAID → PREPARING → READY → COMPLETED
PENDING → PAYMENT_FAILED → PENDING (thử lại)
PENDING / PAYMENT_FAILED / PAID → CANCELLED
```
Mọi lần đổi trạng thái đều qua `assertTransition(from, to)`; chuyển tiếp không có trong bảng bị ném lỗi 409. Thêm vào đó, câu UPDATE có điều kiện `WHERE status = <trạng thái cũ>` để 2 request đồng thời không cùng đổi một đơn.

**2. Thanh toán idempotent qua VNPay** – `backend/src/payments/`

Client gửi header `Idempotency-Key` (UUID mới cho mỗi lần bấm thanh toán, gửi lại khi mạng lỗi thì dùng lại khoá cũ). Cột `Payment.idempotencyKey` là **UNIQUE**: request trùng khoá (tuần tự hoặc đồng thời) chỉ nhận lại đúng giao dịch và link cũ, không tạo giao dịch thứ 2.

Luồng VNPay (theo [tài liệu VNPay](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html)):

```
Trình duyệt        BrewLite backend                         VNPay sandbox
POST /payments ──▶ tạo Payment PROCESSING, vnp_TxnRef,
                   ký link HMAC-SHA512(HashSecret)  ──link──▶ khách nhập thẻ test, OTP
                                                  ◀──IPN──── GET /payments/vnpay/ipn (server gọi server)
/payment/vnpay-return ◀──── chuyển trình duyệt về ─────────── vnp_ReturnUrl?vnp_ResponseCode=...&vnp_SecureHash=...
GET /payments/vnpay/return ─▶ kiểm chữ ký + số tiền → ghi nhận (idempotent)
```

- **Chữ ký**: sắp tham số `vnp_*` theo chữ cái, ký HMAC-SHA512 bằng `VNP_HASH_SECRET` (`vnpay/vnpay.util.ts`). Kết quả gửi về được ký lại và so khớp; sửa bất kỳ tham số nào (ví dụ đổi mã lỗi thành `00`) là bị từ chối.
- **Ghi nhận đúng 1 lần**: Return URL, IPN và đối soát dùng chung `applyResult`: khoá dòng đơn hàng (`SELECT … FOR UPDATE`), giao dịch đã có kết quả thì bỏ qua (IPN trả `02`). Return và IPN tới cùng lúc vẫn chỉ cộng điểm, đếm mã giảm giá, tăng số đã bán 1 lần.
- **Số tiền**: `vnp_Amount / 100` phải bằng số tiền giao dịch, khác thì không ghi (IPN trả `04`).
- **Nhiều link cho 1 đơn**: khách huỷ rồi trả lại tạo link mới; chỉ link mới nhất quyết định đơn có `PAYMENT_FAILED` hay không. Nếu khách lỡ trả 2 link (2 tab), đơn chỉ PAID 1 lần, giao dịch sau ghi **NEEDS_REFUND** (cần hoàn tiền); huỷ đơn khi link còn mở cũng vậy.
- **Máy local không nhận được IPN** (VNPay không gọi được `localhost`), nên kết quả ở Return URL cũng được ghi nhận, nhưng chỉ sau khi kiểm chữ ký và số tiền. Muốn thử IPN thật: chạy `ngrok http 3001`, rồi đặt IPN URL `https://<địa-chỉ-ngrok>/payments/vnpay/ipn` trong trang quản trị merchant sandbox (Thông tin tài khoản → sửa website).
- **Đối soát**: nút *Kiểm tra lại với VNPay* gọi API `querydr` để lấy trạng thái thật (dùng khi khách đóng trình duyệt trước khi quay về).
- **Trả bằng điểm** vẫn xử lý ngay trong 1 transaction: trừ điểm có điều kiện `loyaltyPoints >= cần`, không bao giờ âm điểm.

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
| (b) 2 lần cùng Idempotency-Key chỉ tạo 1 giao dịch | `test/payments-vnpay.int-spec.ts` (gửi tuần tự và 5 request đồng thời: 1 giao dịch, 1 link; Return + 4 IPN tới cùng lúc: điểm chỉ cộng 1 lần) |
| Xử lý kết quả VNPay | `test/payments-vnpay.int-spec.ts` (VNPay giả lập bằng tham số ký đúng: thành công, khách huỷ rồi trả lại, sửa tham số → chữ ký sai 97, sai số tiền 04, mã lạ 01, trả 2 lần → cần hoàn tiền, đối soát querydr), `src/payments/vnpay/vnpay.util.spec.ts` (chữ ký so với giá trị tính độc lập bằng Python, giờ GMT+7) |
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
| POST | `/payments` | Có | Bắt đầu thanh toán `{ orderId, method }`, header `Idempotency-Key` bắt buộc. VNPAY: trả `payUrl`; POINTS: trừ điểm ngay |
| GET | `/payments/vnpay/status` | | Backend đã điền mã VNPay chưa |
| GET | `/payments/vnpay/return?vnp_...` | Có | Trang kết quả gửi lại tham số VNPay: kiểm chữ ký, ghi nhận |
| GET | `/payments/vnpay/ipn?vnp_...` | | VNPay gọi báo kết quả, trả `{ RspCode, Message }` |
| GET | `/payments/me` | Có | Lịch sử giao dịch |
| GET | `/payments/:id` | Có | Chi tiết giao dịch kèm nhật ký trao đổi với VNPay |
| POST | `/payments/:id/query` | Có | Đối soát: hỏi lại VNPay (API `querydr`) |
=======

Hoặc nhấp đúp `run-docker.bat`, sau đó mở http://localhost:3000. Dừng hệ thống bằng `docker compose down` (thêm `-v` để xóa cả dữ liệu).

### Cách 3: Chạy thủ công (macOS / Linux / Windows)

```bash
# 1. Khởi động cơ sở dữ liệu (cổng 5433)
docker compose up -d db

# 2. Backend
cd backend
cp .env.example .env          # Windows: copy .env.example .env
npm install                   # tự chạy prisma generate
npm run db:setup              # tạo bảng và nạp dữ liệu mẫu
npm run start:dev             # http://localhost:3001/health

# 3. Frontend (mở terminal thứ hai)
cd frontend
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

### Tài khoản demo

| Email | Mật khẩu | Ghi chú |
|---|---|---|
| `demo@brewlite.vn` | `Brewlite123` | Có sẵn 1.250 điểm thưởng |

## Kịch bản demo

Toàn bộ luồng chạy trong khoảng 5 phút:

| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Mở trang chủ, gõ `bx` vào ô tìm kiếm | Thực đơn tải từ `GET /products`; *Bánh croissant* sắp hết, *Brownie* còn 5 phần |
| 2 | Bấm **+** trên một món, chọn size, đường, đá, topping | Món vào giỏ, số trên biểu tượng giỏ hàng tăng |
| 3 | Vào giỏ hàng, sửa số lượng, đổi tùy chọn, xóa món | Tổng tiền tự cập nhật |
| 4 | Bấm thanh toán khi chưa đăng nhập | Chuyển sang trang đăng nhập (route được JWT bảo vệ) |
| 5 | Đăng nhập, chọn **Ví MoMo**, nhập mã `MOMO20`, bấm **Thanh toán ngay** | `POST /orders` tạo đơn **PENDING** |
| 6 | Bấm *Demo: giả lập giao dịch thất bại* | Đơn chuyển **PAYMENT_FAILED**, giỏ hàng giữ nguyên |
| 7 | Bấm **Thanh toán lại** | `POST /payments` với Idempotency-Key mới, đơn **PAID**, cộng điểm |
| 8 | Vào **Theo dõi đơn hàng**, bấm *Demo (vai trò quầy)* | PAID → PREPARING → READY → COMPLETED |
| 9 | Mở trang **Đơn hàng** và **Tài khoản** | Lịch sử đơn, điểm, lịch sử điểm, đổi quà |
| 10 | Chạy `npm run test` và `npm run test:int` trong `backend` | Chứng minh nghiệp vụ Task 10 |

## Product Backlog và mã nguồn

| # | Hạng mục | Vị trí trong mã nguồn |
|---|---|---|
| 1 | Khởi tạo dự án | `frontend/`, `backend/`, `docker-compose.yml`, `*/Dockerfile`, `.env.example`; `GET /health` kiểm tra cả CSDL |
| 2 | API sản phẩm | `backend/src/products/`: `GET /products`, `GET /products/:id` |
| 3 | Trang thực đơn | `frontend/components/menu/MenuBrowser.tsx`: đang tải, lỗi, rỗng |
| 4 | Chi tiết và tùy chọn món | `frontend/components/product/ProductCustomizer.tsx` |
| 5 | Giỏ hàng | `frontend/context/app-store.tsx`: Zustand + persist |
| 6 | API tạo đơn | `backend/src/orders/`: `POST /orders`, kiểm tra dữ liệu, trả mã đơn |
| 7 | Đăng ký và đăng nhập | `backend/src/auth/`: bcrypt, JWT Passport (`jwt.strategy.ts`), `JwtAuthGuard` |
| 8 | Thanh toán | `backend/src/payments/`: `POST /payments` |
| 9 | Xác nhận, lịch sử, bàn giao | `Checkout.tsx`, `GET /orders/me`, Docker Compose, README |
| 10 | Nghiệp vụ backend | Xem mục Nghiệp vụ backend nâng cao |

## Nghiệp vụ backend nâng cao

### 1. Máy trạng thái đơn hàng

📄 `backend/src/orders/order-state-machine.ts`

```
PENDING ──► PAID ──► PREPARING ──► READY ──► COMPLETED
   │  ▲
   ▼  │ (thanh toán lại)
PAYMENT_FAILED

PENDING / PAYMENT_FAILED / PAID ──► CANCELLED
```

- Mọi thay đổi trạng thái đều đi qua `assertTransition(from, to)`; chuyển tiếp không hợp lệ trả về **409 Conflict**.
- Câu UPDATE có điều kiện `WHERE status = <trạng thái cũ>` nên hai request đồng thời không thể cùng đổi một đơn.

### 2. Thanh toán idempotent

📄 `backend/src/payments/payments.service.ts`

- Mỗi lần bấm thanh toán, client sinh UUID mới gửi qua header `Idempotency-Key`; khi gửi lại do lỗi mạng thì dùng lại khóa cũ.
- Cột `Payment.idempotencyKey` có ràng buộc **UNIQUE**. Chỉ request đầu tiên được ghi và gọi cổng thanh toán; request trùng khóa (tuần tự hay đồng thời) nhận lại kết quả cũ, không trừ tiền, không cộng điểm lần hai.

### 3. Tồn kho khi đặt hàng đồng thời

📄 `OrdersService.create`

- Xử lý trong một **transaction**, dùng **optimistic locking** qua cột `version`:
  ```sql
  UPDATE product SET stock = stock - qty, version = version + 1
  WHERE id = ? AND version = ?
  ```
- Nếu không dòng nào được cập nhật (đã có người trừ kho trước), hệ thống rollback và thử lại tối đa 8 lần với thời gian chờ ngẫu nhiên.
- Không đủ hàng trả về **409**. Hủy đơn chưa thanh toán sẽ hoàn lại tồn kho.

### 4. Khuyến mãi và điểm thưởng

📄 `backend/src/promotions/`

- Mã giảm giá lưu trong bảng `Voucher` với điều kiện: đơn tối thiểu, phương thức thanh toán, hình thức giao hàng, giới hạn lượt dùng.
- Backend tự tính lại toàn bộ số tiền, không tin giá gửi từ trình duyệt.
- Điểm chỉ cộng khi đơn **PAID** (1.000đ = 1 điểm), lịch sử lưu trong bảng `LoyaltyTransaction`.

## Kiểm thử

```bash
cd backend
npm run test        # Unit test: máy trạng thái, luật khuyến mãi
npm run test:int    # Integration test trên PostgreSQL thật (cần docker compose up -d db)
```

| Tiêu chí chấm | Test chứng minh |
|---|---|
| (a) Chặn chuyển trạng thái không hợp lệ | `src/orders/order-state-machine.spec.ts`, `test/stock-concurrency.int-spec.ts` |
| (b) Hai request cùng Idempotency-Key chỉ tạo một giao dịch | `test/payments-idempotency.int-spec.ts` (tuần tự và 5 request đồng thời) |
| (c) Đặt hàng đồng thời không vượt tồn kho | `test/stock-concurrency.int-spec.ts` (kho 5, 12 khách đặt cùng lúc, đúng 5 đơn thành công) |

## Tài liệu API

Base URL: `http://localhost:3001`

| Phương thức | Endpoint | Cần đăng nhập | Mô tả |
|---|---|:---:|---|
| `GET` | `/health` | | Kiểm tra backend và CSDL |
| `GET` | `/products` | | Danh sách món |
| `GET` | `/products/:id` | | Chi tiết món |
| `POST` | `/auth/register` | | Đăng ký |
| `POST` | `/auth/login` | | Đăng nhập, trả về JWT |
| `GET` | `/auth/me` | ✅ | Tài khoản, điểm, lịch sử điểm |
| `POST` | `/auth/redeem` | ✅ | Đổi điểm lấy quà |
| `POST` | `/orders` | ✅ | Tạo đơn PENDING, giữ tồn kho |
| `GET` | `/orders/me` | ✅ | Lịch sử đơn hàng |
| `GET` | `/orders/:id` | ✅ | Chi tiết đơn hàng |
| `POST` | `/orders/:id/cancel` | ✅ | Hủy đơn chưa thanh toán, hoàn kho |
| `POST` | `/orders/:id/advance` | ✅ | Demo vai trò quầy: chuyển bước tiếp theo |
| `POST` | `/payments` | ✅ | Thanh toán (bắt buộc header `Idempotency-Key`) |
>>>>>>> 9743307f3f271670b136d791f593dda74af30d0c

## Cấu trúc thư mục

```
brewlite/
<<<<<<< HEAD
├── docker-compose.yml        PostgreSQL + backend + frontend
├── run-brewlite.bat          Chạy một chạm (Windows)
├── run-docker.bat            docker compose up --build
├── reset-database.bat        Xoá dữ liệu, làm lại CSDL từ đầu
├── backend/                  NestJS – cổng 3001
│   ├── prisma/schema.prisma  User, Product, Topping, Order, OrderItem, Payment, PaymentLog, Voucher, LoyaltyTransaction
│   ├── src/auth/             đăng ký, đăng nhập, JWT Passport
│   ├── src/products/         GET /products
│   ├── src/orders/           tạo đơn, máy trạng thái, tồn kho
│   ├── src/payments/         thanh toán idempotent, Return URL, IPN, đối soát, lịch sử giao dịch
│   ├── src/payments/vnpay/   ký / kiểm chữ ký VNPay, tạo link, gọi API querydr
│   ├── src/promotions/       mã giảm giá, điểm thưởng
│   ├── src/seed.ts           dữ liệu mẫu
│   └── test/                 integration test (PostgreSQL thật)
└── frontend/                 Next.js – cổng 3000
    ├── app/                  các trang
    ├── components/           giao diện
    ├── context/              Zustand (giỏ hàng), đăng nhập
    └── lib/                  gọi API, React Query, tìm kiếm, định dạng
=======
├── docker-compose.yml          # PostgreSQL + backend + frontend
├── run-brewlite.bat            # Chạy một chạm (Windows)
├── run-docker.bat              # docker compose up --build
├── backend/                    # NestJS, cổng 3001
│   ├── prisma/schema.prisma    # User, Product, Topping, Order, OrderItem, Payment, Voucher, LoyaltyTransaction
│   ├── src/
│   │   ├── auth/               # Đăng ký, đăng nhập, JWT Passport
│   │   ├── products/           # API sản phẩm
│   │   ├── orders/             # Tạo đơn, máy trạng thái, tồn kho
│   │   ├── payments/           # Thanh toán idempotent, cổng giả lập
│   │   ├── promotions/         # Mã giảm giá, điểm thưởng
│   │   └── seed.ts             # Dữ liệu mẫu
│   └── test/                   # Integration test (PostgreSQL thật)
└── frontend/                   # Next.js, cổng 3000
    ├── app/                    # Các trang
    ├── components/             # Thành phần giao diện
    ├── context/                # Zustand (giỏ hàng), đăng nhập
    └── lib/                    # Gọi API, React Query, tìm kiếm, định dạng
>>>>>>> 9743307f3f271670b136d791f593dda74af30d0c
```

## Biến môi trường

| File | Biến | Ý nghĩa |
|---|---|---|
<<<<<<< HEAD
| backend/.env | PORT | Cổng API (3001) |
| backend/.env | DATABASE_URL | Chuỗi kết nối PostgreSQL |
| backend/.env | JWT_SECRET | Khoá ký token, đổi khi triển khai thật |
| backend/.env | FRONTEND_URL | Địa chỉ frontend được phép gọi API (CORS) |
| backend/.env | VNP_TMN_CODE | Mã website VNPay sandbox (trong email đăng ký) |
| backend/.env | VNP_HASH_SECRET | Chuỗi bí mật ký HMAC-SHA512, **không đưa lên GitHub** |
| backend/.env | VNP_URL, VNP_API_URL, VNP_RETURN_URL | Để trống thì dùng địa chỉ sandbox và `http://localhost:3000/payment/vnpay-return` |
| frontend/.env.local | NEXT_PUBLIC_API_URL | Địa chỉ API mà trình duyệt gọi tới |

## Lỗi thường gặp

- **"Docker Desktop chưa chạy"**: mở Docker Desktop, đợi biểu tượng cá voi ngừng nhấp nháy rồi chạy lại.
- **Trang báo "Không tải được thực đơn"**: backend chưa chạy hoặc PostgreSQL chưa bật. Mở http://localhost:3001/health, phải thấy `"db":"up"`.
- **Cổng 5433 hoặc 3000/3001 đang bị dùng**: tắt chương trình đang chiếm cổng, hoặc sửa cổng trong `docker-compose.yml` và `.env`.
- **Làm lại dữ liệu từ đầu**: nhấp đúp `reset-database.bat` (hoặc `docker compose down -v`), rồi chạy lại `run-brewlite.bat`.
- **Lựa chọn VNPay bị khoá, báo "Máy chủ chưa điền mã VNPay sandbox"**: điền `VNP_TMN_CODE`, `VNP_HASH_SECRET` vào `backend/.env` rồi tắt bật lại backend.
- **Trang VNPay báo "Sai chữ ký" (mã 70) hoặc "Website chưa được phê duyệt"**: kiểm tra lại 2 mã (thừa dấu cách, chép thiếu ký tự), mã phải là của môi trường sandbox.
- **Trả xong nhưng BrewLite báo "Chữ ký VNPay không hợp lệ"**: `VNP_HASH_SECRET` trong `.env` khác chuỗi VNPay dùng; sửa rồi bấm *Kiểm tra lại với VNPay* trong Lịch sử giao dịch.
- **Đóng trình duyệt giữa chừng, đơn vẫn "Chờ thanh toán"**: vào Lịch sử giao dịch, mở giao dịch, bấm *Kiểm tra lại với VNPay*.
- Ghi chú: dùng `bcryptjs` (cùng thuật toán bcrypt, viết bằng JavaScript) để khỏi phải biên dịch thư viện C++ trên Windows.

## Quy ước làm việc nhóm

- Không push thẳng vào `main`; làm trên nhánh `feat/task-<số>-<mô-tả>`.
- Mỗi Pull Request cần ít nhất 1 thành viên khác duyệt.
- Commit theo dạng: `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`, `chore: ...`.

## Làm việc nhóm

Xem [CONTRIBUTING.md](CONTRIBUTING.md): tạo nhánh riêng, commit bằng tài khoản của mình, mở pull request và nhờ một bạn review trước khi merge.
=======
| `backend/.env` | `PORT` | Cổng API (mặc định 3001) |
| `backend/.env` | `DATABASE_URL` | Chuỗi kết nối PostgreSQL |
| `backend/.env` | `JWT_SECRET` | Khóa ký token, cần đổi khi triển khai thật |
| `backend/.env` | `FRONTEND_URL` | Địa chỉ frontend được phép gọi API (CORS) |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL` | Địa chỉ API mà trình duyệt gọi tới |

## Xử lý sự cố

| Hiện tượng | Cách khắc phục |
|---|---|
| Báo "Docker Desktop chưa chạy" | Mở Docker Desktop, đợi biểu tượng cá voi ngừng nhấp nháy rồi chạy lại |
| Trang báo "Không tải được thực đơn" | Backend hoặc PostgreSQL chưa chạy. Mở http://localhost:3001/health, phải thấy `"db":"up"` |
| Cổng 5433, 3000 hoặc 3001 bị chiếm | Tắt chương trình đang dùng cổng, hoặc đổi cổng trong `docker-compose.yml` và `.env` |
| Muốn làm lại dữ liệu từ đầu | Chạy `docker compose down -v` rồi khởi động lại |

> **Ghi chú:** dự án dùng `bcryptjs` (cùng thuật toán bcrypt, viết thuần JavaScript) để không phải biên dịch thư viện C++ trên Windows.

## Quy ước làm việc nhóm

- 🚫 Không push thẳng vào nhánh `main`.
- 🌿 Mỗi công việc làm trên một nhánh riêng: `feat/task-<số>-<mô-tả>` (ví dụ `feat/task-5-gio-hang`).
- 👀 Mỗi Pull Request cần ít nhất **một thành viên khác** duyệt trước khi merge.
- 📝 Commit theo chuẩn Conventional Commits:

| Tiền tố | Dùng khi |
|---|---|
| `feat:` | Thêm tính năng mới |
| `fix:` | Sửa lỗi |
| `docs:` | Cập nhật tài liệu |
| `test:` | Thêm hoặc sửa test |
| `chore:` | Cấu hình, công cụ, việc lặt vặt |

---

<div align="center">

Nhóm 10 BrewLite · Công nghệ Phần mềm · Trường Đại học Sài Gòn

</div>
>>>>>>> 9743307f3f271670b136d791f593dda74af30d0c
