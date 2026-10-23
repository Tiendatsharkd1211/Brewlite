# BrewLite – Ứng dụng đặt cà phê không dùng tiền mặt

Bài tập lớn môn Công nghệ Phần mềm, HK I 2026–2027, Trường ĐH Sài Gòn.

Khách xem menu, chọn size / đường / đá / topping, quản lý giỏ hàng, đăng nhập, thanh toán không tiền mặt **qua cổng VNPay (môi trường thử sandbox)** hoặc bằng điểm, xem **lịch sử giao dịch** chi tiết (mã giao dịch VNPay, ngân hàng, thời gian, mã phản hồi) và theo dõi trạng thái đơn.

BrewLite có **một chi nhánh duy nhất: BrewLite An Dương Vương** (273 An Dương Vương, Phường 3, Quận 5, TP.HCM). Khách tới quầy đọc mã đơn để nhận món.

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 15 (React, TypeScript), TailwindCSS 4, **Zustand** (giỏ hàng), **React Query** (gọi API) |
| Backend | NestJS 11 (REST), class-validator, **JWT + Passport**, bcrypt (thư viện `bcryptjs`) |
| CSDL | **PostgreSQL 16 + Prisma** |
| Thanh toán | **VNPay sandbox** (API 2.1.0): tạo link ký HMAC-SHA512, nhận kết quả qua Return URL và IPN, đối soát bằng API `querydr`. Khách trả bằng thẻ test của VNPay, không mất tiền thật |
| DevOps | Docker Compose (frontend + backend + PostgreSQL) |

## Nhóm và phân công

| Thành viên | Vai trò | Phần phụ trách trong mã nguồn |
|---|---|---|
| Nguyễn Tiến Đạt | Product Owner, Developer | Lược đồ CSDL (Prisma), dữ liệu mẫu, API sản phẩm, trang thực đơn và chi tiết món, mã giảm giá (có mã VNPAY20), giỏ hàng, trang thanh toán (nhận món, mã ưu đãi, màn hình đặt hàng thành công) |
| Phan Thành Đạt | Scrum Master, Developer | Khởi tạo dự án, khung giao diện, trang Lịch sử giao dịch, trang thanh toán (chuyển sang VNPay, trang kết quả VNPay trả về), lịch sử đơn hàng, Docker Compose, CI, README |
| Trần Anh Trung | Developer | Đăng ký, đăng nhập (JWT), trang tài khoản, đổi điểm thưởng |
| Đinh Văn Đạt | Developer | Kết nối cổng VNPay (ký, kiểm chữ ký, querydr), API tạo đơn, API thanh toán idempotent (Return URL, IPN, đối soát, lịch sử giao dịch) |
| Đỗ Chí Thanh | Developer | Theo dõi đơn hàng (thanh toán lại qua VNPay), hoá đơn |
| Lê Bảo Trọng Tấn | Developer | Máy trạng thái đơn hàng, tồn kho khi đặt đồng thời, huỷ đơn và hoàn kho, demo vai trò quầy |

Chi tiết thư mục của từng người: [CONTRIBUTING.md](CONTRIBUTING.md#5-phân-chia-phần-code).

## Chạy dự án

Cần cài: **Node.js LTS** và **Docker Desktop** (đang mở).

### Bước 0 – Lấy mã VNPay sandbox (làm 1 lần, miễn phí)

1. Đăng ký tài khoản thử nghiệm tại https://sandbox.vnpayment.vn/devreg/ (điền email, tên website ví dụ `BrewLite`, URL `http://localhost:3000`).
2. VNPay gửi email có **vnp_TmnCode** (mã website, 8 ký tự) và **vnp_HashSecret** (chuỗi bí mật), kèm tài khoản đăng nhập trang quản trị merchant sandbox.
3. Mở `backend/.env` (lần đầu chạy `run-brewlite.bat` sẽ tự tạo từ `.env.example`) và điền:
   ```
   VNP_TMN_CODE=<mã trong email>
   VNP_HASH_SECRET=<chuỗi bí mật trong email>
   ```
   Chạy bằng Docker Compose thì ghi 2 dòng này vào file `.env` đặt cạnh `docker-compose.yml`.
4. **Không** đưa `VNP_HASH_SECRET` lên GitHub: `.env` đã nằm trong `.gitignore`. Mỗi bạn trong nhóm có thể dùng chung 1 cặp mã (gửi riêng qua tin nhắn) hoặc tự đăng ký.

Chưa điền mã thì web vẫn chạy, nhưng lựa chọn VNPay ở trang thanh toán bị khoá và hiện lời nhắc.

### Cách 1 – Một chạm trên Windows (khuyên dùng khi phát triển)

Nhấp đúp `run-brewlite.bat`. File sẽ: bật PostgreSQL bằng Docker → cài thư viện → tạo bảng (`prisma db push`) → nạp dữ liệu mẫu → mở backend, frontend → mở trình duyệt. Nếu `backend/.env` chưa có mã VNPay, cửa sổ sẽ nhắc.

### Cách 2 – Docker Compose (bàn giao, đúng Task 9)

```bash
docker compose up --build
```
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

## Cấu trúc thư mục

```
brewlite/
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
```

## Biến môi trường

| File | Biến | Ý nghĩa |
|---|---|---|
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
