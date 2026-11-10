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
5. [Kịch bản demo end-to-end](#kịch-bản-demo-end-to-end)
6. [Product Backlog và mã nguồn](#product-backlog-và-mã-nguồn)
7. [Task 10: nghiệp vụ backend](#task-10-nghiệp-vụ-backend) (kèm test chứng minh)
8. [Bảo mật](#bảo-mật)
9. [Gọi API bằng Thunder Client](#gọi-api-bằng-thunder-client)
10. [API](#api)
11. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
12. [Biến môi trường](#biến-môi-trường)
13. [Lỗi thường gặp](#lỗi-thường-gặp)
14. [Làm việc nhóm](#làm-việc-nhóm)

---

## Giới thiệu

**BrewLite** là ứng dụng web giúp khách hàng đặt đồ uống và thanh toán hoàn toàn không dùng tiền mặt. Khách có thể xem thực đơn, tùy chỉnh món theo ý thích, quản lý giỏ hàng, thanh toán qua cổng VNPay (sandbox) hoặc điểm thưởng, rồi theo dõi trạng thái đơn hàng.

## Tính năng chính

- 🔍 **Thực đơn và tìm kiếm thông minh**: tìm kiếm không dấu (gõ `bx` ra "bạc xỉu"), hiển thị món sắp hết hàng.
- 🎛️ **Tùy chỉnh món**: chọn size S/M/L, mức đường, mức đá, topping; giá tự tính lại.
- 🛒 **Giỏ hàng**: thêm, sửa, xóa món; tổng tiền cập nhật tức thì, giữ nguyên khi tải lại trang.
- 🔐 **Tài khoản**: đăng ký, đăng nhập bằng JWT; chức năng đặt đơn được bảo vệ.
- 💳 **Thanh toán không tiền mặt**: cổng VNPay (môi trường thử sandbox) hoặc điểm BrewLite, hỗ trợ thanh toán lại khi thất bại.
- 🎁 **Khuyến mãi và điểm thưởng**: áp mã giảm giá, tích điểm khi thanh toán thành công, đổi điểm lấy quà.
- 📦 **Theo dõi đơn hàng**: cập nhật trạng thái từ lúc đặt đến khi hoàn thành.

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| **Frontend** | Next.js 15 (React, TypeScript), TailwindCSS 4, Zustand (giỏ hàng), React Query (gọi API) |
| **Backend** | NestJS 11 (REST API), class-validator, JWT + Passport, bcrypt (`bcryptjs`) |
| **Cơ sở dữ liệu** | PostgreSQL 16, Prisma ORM |
| **Thanh toán** | VNPay sandbox (cổng thanh toán thử của VNPay) + điểm BrewLite |
| **DevOps** | Docker, Docker Compose (frontend + backend + PostgreSQL) |

## Cài đặt và chạy dự án

### Yêu cầu

- Node.js bản LTS
- Docker Desktop (đang chạy)

Sau khi clone, vào thư mục mã nguồn trước: `cd Brewlite/brewlite`. Mọi lệnh và file `.bat` bên dưới đều nằm trong thư mục này.

### Cách 1: Chạy một chạm trên Windows (khuyên dùng khi phát triển)

Nhấp đúp vào `run-brewlite.bat`. Script sẽ tự động:

1. Khởi động PostgreSQL bằng Docker
2. Cài đặt thư viện
3. Tạo bảng (`prisma db push`) và nạp dữ liệu mẫu
4. Chạy backend, frontend và mở trình duyệt

### Cách 2: Docker Compose (dùng khi bàn giao)

Trước lần chạy đầu, tạo file `brewlite/.env` (cạnh `docker-compose.yml`) từ file mẫu rồi điền `JWT_SECRET`; thiếu khoá thì container backend báo lỗi và dừng:

```bash
cp .env.example .env          # Windows: copy .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # dán kết quả vào JWT_SECRET= trong .env
docker compose up --build
```
(hoặc nhấp đúp `run-docker.bat`). Mở http://localhost:3000. Tắt: `docker compose down` (thêm `-v` để xoá cả dữ liệu).

### Cách 3 – Từng lệnh (macOS / Linux / Windows)

```bash
docker compose up -d db                      # PostgreSQL ở cổng 5433
cd backend
cp .env.example .env                         # Windows: copy .env.example .env, rồi điền VNP_TMN_CODE, VNP_HASH_SECRET
npm install                                  # tự chạy prisma generate
npm run db:setup                             # tạo bảng + rào CSDL + nạp dữ liệu mẫu
npm run start:dev                            # http://localhost:3001/health

cd ../frontend                               # cửa sổ terminal thứ hai
cp .env.example .env.local
npm install
npm run dev                                  # http://localhost:3000
```

**Tài khoản demo:** khách `demo@brewlite.vn` / `Brewlite123` (có sẵn 1.250 điểm); nhân viên quầy `staff@brewlite.vn` / `Brewlite123`; quản lý cửa hàng `manager@brewlite.vn` / `Brewlite123`. Mọi vai trò đăng nhập chung ở `/login`, mỗi vai trò chỉ vào khu của mình: nhân viên ở **Quầy pha chế**, quản lý ở **Quản lý cửa hàng** (tổng quan, thực đơn, mã giảm giá, nội dung trang, tài khoản khách, phản hồi, nguyên liệu, nhập kho). Thực đơn, mã giảm giá, nội dung trang, tài khoản khách và phản hồi gọi API thật (`backend/src/manage`, `backend/src/customers`): quản lý ẩn món, báo hết, đổi giá hay tạo mã thì trang khách và API đặt đơn áp dụng ngay. Kho nguyên liệu, nhập kho, công thức cũng lưu CSDL (`backend/src/inventory`) và đồng bộ với quầy: quầy bấm *Bắt đầu pha* thì tự trừ nguyên liệu theo công thức (size S ×0,8, L ×1,25); hết nguyên liệu thì khách thấy món *Hết hàng*, đặt bằng API cũng bị từ chối, quầy thấy cảnh báo. Mọi vai trò đăng nhập chung ở `/login`; vai trò lưu trong CSDL (không đoán theo email), đăng nhập xong tự chuyển: khách về trang khách, nhân viên vào Quầy pha chế, quản lý vào Quản lý cửa hàng. Tài khoản nội bộ không đặt món được (API đặt đơn, thanh toán, đổi điểm trả 403).

**Thẻ test VNPay sandbox** (VNPay công bố cho môi trường thử, không phải thẻ thật):

| Ngân hàng | Số thẻ | Tên chủ thẻ | Ngày phát hành | Mã OTP |
|---|---|---|---|---|
| NCB | 9704198526191432198 | NGUYEN VAN A | 07/15 | 123456 |

Trên trang VNPay chọn **Thẻ nội địa và tài khoản ngân hàng → NCB**, nhập thông tin trên, OTP `123456`. Muốn demo thất bại: bấm **Hủy thanh toán** trên trang VNPay (mã 24).

> **Đã chạy bản cũ trước đây?** Bản này bỏ tài khoản ảo và đổi bảng thanh toán sang VNPay, nên `docker-compose.yml` dùng kho dữ liệu mới `pgdata_v3`, tự tạo CSDL sạch. Muốn xoá dữ liệu làm lại từ đầu (ví dụ trước buổi demo): nhấp đúp `reset-database.bat`.

## Kịch bản demo end-to-end

Khoảng 5 phút, đi đúng luồng bàn giao của đề: chọn món → giỏ hàng → thanh toán → xác nhận đơn.

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
11. **Theo dõi đơn hàng**: mã đơn để đọc tại quầy An Dương Vương. Mở cửa sổ ẩn danh, mở `/login`, đăng nhập `staff@brewlite.vn` → vào thẳng **Quầy pha chế**: bấm *Bắt đầu pha* → *Pha xong* → *Đã giao khách*; trang theo dõi đơn của khách tự cập nhật PAID → PREPARING → READY → COMPLETED.
12. Mở terminal chạy `npm run test` và `npm run test:int` trong `backend` để chứng minh Task 10 và việc xử lý kết quả VNPay.

## Product Backlog và mã nguồn

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

## Task 10: nghiệp vụ backend

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

**5. Luồng đặt, huỷ và số liệu bổ sung** – `OrdersService`, `backend/src/manage/overview.ts`

- **Báo giá trước khi đặt** (`POST /orders/quote`): trang thanh toán hỏi máy chủ giá từng dòng theo CSDL, mã giảm giá thật (kể cả mã quản lý vừa tạo, mã tạm dừng, hết hạn) và món còn hàng không; quản lý đổi giá thì giỏ hàng tự cập nhật và báo khách. Không ghi gì, không giữ kho.
- **Tự huỷ đơn bỏ dở**: đơn chưa thanh toán quá 30 phút (không còn link VNPay đang mở) tự huỷ mỗi phút một lần, trả món về kho, báo khách.
- **Quầy huỷ đơn đã thanh toán, chưa pha** (`POST /staff/orders/:id/cancel`, bắt buộc lý do): trả món về kho, bớt số đã bán, trả lượt mã giảm giá, hoàn điểm đã dùng, thu lại điểm đã tích, giao dịch VNPay chuyển *cần hoàn tiền*; khách nhận thông báo kèm lý do. Đơn đang pha không huỷ được.
- **Tổng quan quản lý** (`GET /staff/overview?range=today|7d|30d`): doanh thu, số đơn, món bán chạy, đơn gần đây tính từ đơn thật (đơn bị huỷ không tính).

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
| Báo giá, tự huỷ đơn bỏ dở, quầy huỷ đơn có hoàn tiền / hoàn điểm, tổng quan | `test/order-flows.int-spec.ts` |

## Bảo mật

| Lớp | Cách làm | Kiểm chứng |
|---|---|---|
| Mật khẩu | Băm bcrypt, không bao giờ trả `passwordHash` ra API; mật khẩu tối thiểu 8 ký tự, có chữ và số | `auth.service.ts` |
| Đăng nhập | JWT ký bằng `JWT_SECRET`; khi chạy production, thiếu khoá, khoá dưới 32 ký tự hoặc khoá mẫu thì API không khởi động | `jwt.strategy.ts` |
| Chống dò mật khẩu | Mỗi IP tối đa 10 lần/phút cho đăng nhập, đăng ký; 300 request/phút cho các API khác (các cửa sổ demo trên cùng máy dùng chung một IP); vượt thì trả 429 | Thunder Client: bấm đăng nhập sai 11 lần trong 1 phút |
| Phân quyền | `RolesGuard`: API quầy chỉ cho STAFF (403); vai trò đọc lại từ CSDL mỗi request; đăng ký trên web không tự gán vai trò được | `roles.guard.spec.ts`, Thunder mục 6 |
| Khu quản lý | Mọi API `/staff/*` của quản lý chỉ cho MANAGER (nhân viên quầy, khách nhận 403); món ẩn thì `GET /products` không trả, đặt bằng API bị từ chối; ảnh món chỉ nhận link `https` hoặc JPG/PNG/WEBP (chặn `javascript:`, SVG); link dải thông báo chỉ trỏ trang nội bộ; mã đã có người dùng không xoá, không đổi tên được | `backend/src/manage/` |
| Tài khoản dùng chung, đổi mật khẩu | Mỗi vị trí một tài khoản (`staff@`, `manager@`); có người nghỉ thì đổi mật khẩu (`POST /auth/change-password`, cần mật khẩu cũ). Token mang dấu lần đổi mật khẩu (`pwt`), đổi xong mọi máy khác bị đăng xuất ngay ở request kế tiếp, máy đang đổi nhận token mới | `auth/jwt.strategy.ts` |
| Tài khoản nội bộ không mua hàng | Một trang `/login` cho mọi vai trò; vai trò đọc từ CSDL, không suy theo email. Đăng ký bằng email nhân viên, quản lý bị từ chối (409, email không phân biệt hoa thường); nhân viên, quản lý gọi API đặt đơn, thanh toán, đổi điểm, món yêu thích nhận 403 (`@CustomerOnly()`); khách gọi API quầy, quản lý nhận 403 | `auth/customer-only.decorator.ts` |
| Khoá tài khoản khách | Quản lý khoá kèm lý do (chọn sẵn); khách bị đăng xuất ngay ở request kế tiếp, đăng nhập thấy lý do; chỉ báo bị khoá khi đúng mật khẩu; không có API xoá tài khoản | `test/customers.int-spec.ts` |
| Dữ liệu của ai người nấy xem | Mọi truy vấn đơn, giao dịch đều lọc theo người đăng nhập; đơn người khác trả 404 | Thunder mục 6 |
| Dữ liệu đầu vào | `ValidationPipe` với `whitelist` + `forbidNonWhitelisted`: trường lạ (giá, vai trò) bị từ chối 400; giá do backend tính từ CSDL | Thunder mục 6 |
| Thanh toán | Chữ ký HMAC-SHA512 của VNPay, kiểm số tiền, Idempotency-Key | `payments-vnpay.int-spec.ts` |
| Header HTTP | `helmet` ở API; frontend chặn nhúng iframe, `nosniff`, `Referrer-Policy` | `curl -I http://localhost:3001/health` |
| **CSDL: tài khoản riêng cho app** | App kết nối bằng `brewlite_app` (`DATABASE_URL`), chỉ được SELECT/INSERT/UPDATE/DELETE; tạo bảng dùng tài khoản chủ (`DIRECT_URL`). App bị tấn công cũng không DROP, TRUNCATE hay đổi cấu trúc bảng được | `test/db-security.int-spec.ts` |
| **CSDL: ràng buộc CHECK** | CSDL tự từ chối tồn kho âm, điểm âm, tiền âm, số lượng ngoài 1–20 | `src/db-harden.ts`, `test/db-security.int-spec.ts` |
| **CSDL: mạng** | PostgreSQL chỉ mở cổng cho `127.0.0.1`, máy khác trong mạng không kết nối thẳng được; truy vấn qua Prisma có tham số, không ghép chuỗi SQL | `docker-compose.yml` |
| Bí mật | `JWT_SECRET`, `VNP_HASH_SECRET`, mật khẩu CSDL chỉ nằm trong `.env` (đã `.gitignore`) | |

Còn lại cần làm khi đưa lên mạng thật: chạy sau HTTPS, đổi mật khẩu chủ CSDL (`DB_OWNER_PASSWORD`), cân nhắc chuyển token từ localStorage sang cookie `httpOnly`.

### Gợi ý khi trình bày

Tài khoản mẫu trên trang đăng nhập và thẻ thử VNPay ở bước thanh toán mặc định **ẩn**, khách thật không thấy. Khi demo, bật bằng `NEXT_PUBLIC_SHOW_DEMO_HINTS=1` trong `brewlite/frontend/.env.local` (chạy `npm run dev`) hoặc `SHOW_DEMO_HINTS=1` trong `brewlite/.env` (chạy Docker), rồi khởi động lại frontend.

## Gọi API bằng Thunder Client

1. Cài extension **Thunder Client** trong VS Code, chạy backend (`run-brewlite.bat` hoặc `npm run start:dev`).
2. Thunder Client → tab **Collections** → nút menu ☰ → **Import** → chọn `brewlite/thunder-client/thunder-collection_BrewLite.json` (91 request, 12 thư mục).
3. Tab **Env** → ☰ → **Import** → chọn `brewlite/thunder-client/thunder-environment_BrewLite.json` → chuột phải môi trường **BrewLite** → **Set Active**. Thiếu bước này thì token, mã đơn không được lưu và các request sau trả 401.
4. Chạy theo thứ tự thư mục 1 → 12 (chuột phải từng thư mục → **Run Folder**; bản miễn phí giới hạn số request mỗi lần Run All). Đăng ký lưu token khách vào `{{token}}`, đăng nhập nhân viên lưu `{{staffToken}}`, quản lý lưu `{{managerToken}}`; tạo đơn lưu `{{orderId}}`. Mỗi request có sẵn test mã trạng thái mong đợi.
5. Chạy cả 91 request bằng một lệnh, không giới hạn: `node brewlite/thunder-client/chay-thunder.mjs` (ở thư mục gốc repo). Không chạy hai lần trong cùng một phút vì đăng nhập bị giới hạn 10 lần/phút.

| Thư mục | Nội dung |
|---|---|
| 1–5 | Luồng chính: thực đơn, tài khoản, đặt đơn và trả bằng điểm (gửi lặp Idempotency-Key không trừ hai lần), VNPay, quầy pha chế tới COMPLETED |
| 6 | Bảo mật: không token, token giả (401); khách gọi API quầy, nhân viên gọi API khách (403); tự gửi giá, số lượng âm, thiếu Idempotency-Key, chữ ký VNPay sai, tự gán quyền (400); sai mật khẩu liên tục (429) |
| 7 | Món yêu thích |
| 8–10 | Quản lý: tổng quan và phân quyền; ẩn món, giá âm, mã giảm giá; kho, phiếu nhập |
| 11 | Quầy huỷ đơn đã thanh toán: hoàn điểm, huỷ lại 409, khách và quản lý không gọi được |
| 12 | Khoá tài khoản khách; khách này không xem, không huỷ được đơn của khách khác (404) |

Bộ test tự dọn những gì nó đổi (bỏ ẩn món, xoá mã thử, mở khoá tài khoản thử); mỗi lần chạy tạo thêm 2 khách thử `@brewlite.test` và nhập thêm 5 gói bánh quy vào kho.

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
| POST | `/payments` | Có | Bắt đầu thanh toán `{ orderId, method }`, header `Idempotency-Key` bắt buộc. VNPAY: trả `payUrl`; POINTS: trừ điểm ngay |
| GET | `/payments/vnpay/status` | | Backend đã điền mã VNPay chưa |
| GET | `/payments/vnpay/return?vnp_...` | Có | Trang kết quả gửi lại tham số VNPay: kiểm chữ ký, ghi nhận |
| GET | `/payments/vnpay/ipn?vnp_...` | | VNPay gọi báo kết quả, trả `{ RspCode, Message }` |
| GET | `/payments/me` | Có | Lịch sử giao dịch |
| GET | `/payments/:id` | Có | Chi tiết giao dịch kèm nhật ký trao đổi với VNPay |
| POST | `/payments/:id/query` | Có | Đối soát: hỏi lại VNPay (API `querydr`) |
| GET | `/staff/orders` | Nhân viên | Hàng đợi của quầy: đơn PAID, PREPARING, READY |
| POST | `/staff/orders/:id/advance` | Nhân viên | Chuyển đơn sang bước tiếp theo; khách gọi nhận 403 |
| GET | `/notifications/me` | Có | Thông báo của tôi (đơn đổi trạng thái, quà chào mừng) kèm số chưa đọc |
| POST | `/notifications/:id/read`, `/notifications/read-all` | Có | Đánh dấu đã đọc một hoặc tất cả |
| GET | `/favorites/me` | Có | Món yêu thích, lưu theo tài khoản trên CSDL |
| PUT / DELETE | `/favorites/:productId` | Có | Lưu / bỏ một món (lưu lại lần nữa không tạo bản trùng) |

## Cấu trúc thư mục

```
brewlite/
├── docker-compose.yml        PostgreSQL + backend + frontend
├── run-brewlite.bat          Chạy một chạm (Windows)
├── run-docker.bat            docker compose up --build
├── reset-database.bat        Xoá dữ liệu, làm lại CSDL từ đầu
├── backend/                  NestJS – cổng 3001
│   ├── prisma/schema.prisma  User, Product, Topping, Order, OrderItem, Payment, PaymentLog, Voucher, LoyaltyTransaction
│   ├── src/auth/             đăng ký, đăng nhập, JWT Passport, phân quyền, đổi điểm
│   ├── src/products/         GET /products, GET /products/:id
│   ├── src/promotions/       luật mã giảm giá
│   ├── src/favorites/        món yêu thích
│   ├── src/orders/           báo giá, tạo đơn, máy trạng thái, tồn kho, huỷ đơn
│   ├── src/payments/         thanh toán idempotent, Return URL, IPN, đối soát, lịch sử giao dịch
│   ├── src/payments/vnpay/   ký / kiểm chữ ký VNPay, tạo link, gọi API querydr
│   ├── src/notifications/    thông báo đổi trạng thái đơn
│   ├── src/staff/            quầy pha chế (phần mở rộng)
│   ├── src/manage/           quản lý cửa hàng: tổng quan, thực đơn, mã giảm giá, nội dung
│   ├── src/inventory/        kho nguyên liệu, phiếu nhập, công thức
│   ├── src/customers/        khoá, mở khoá tài khoản khách
│   ├── src/feedback/         phản hồi khách
│   ├── src/seed.ts           dữ liệu mẫu
│   ├── src/db-harden.ts      rào CSDL (tài khoản app chỉ đọc/ghi dữ liệu)
│   └── test/                 integration test (PostgreSQL thật)
├── frontend/                 Next.js – cổng 3000
│   ├── app/                  các trang (khách, quầy /staff, quản lý /quan-ly)
│   ├── components/           giao diện
│   ├── context/              Zustand (giỏ hàng), đăng nhập
│   └── lib/                  gọi API, React Query, tìm kiếm, định dạng
└── thunder-client/           bộ request kiểm thử API và lệnh chạy toàn bộ
```

## Biến môi trường

| File | Biến | Ý nghĩa |
|---|---|---|
| backend/.env | PORT | Cổng API (3001) |
| backend/.env | DIRECT_URL | Kết nối bằng tài khoản chủ CSDL, chỉ dùng để tạo bảng và rào CSDL |
| backend/.env | DATABASE_URL | Kết nối bằng tài khoản app `brewlite_app` (chỉ đọc/ghi dữ liệu); `db:harden` tự tạo tài khoản theo tên, mật khẩu ghi ở đây |
| backend/.env, .env | JWT_SECRET | Khoá ký token, chuỗi ngẫu nhiên ≥ 32 ký tự (bắt buộc với Docker và production) |
| .env | DB_OWNER_PASSWORD, DB_APP_PASSWORD | Mật khẩu 2 tài khoản CSDL khi chạy Docker (bỏ trống thì dùng mật khẩu mặc định cho máy cá nhân) |
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

## Làm việc nhóm

Nhóm làm theo Scrum và Definition of Done của đề: code chạy được, không lỗi build, đúng tiêu chí chấp nhận của task; có commit với mô tả rõ ràng và được review trong nhóm; API validate đầu vào, giao diện xử lý trạng thái đang tải và lỗi; có hướng dẫn chạy trong README.

- Mỗi phần việc làm trên một nhánh riêng (`feat/...`, `fix/...`, `docs/...`), merge vào `main` sau khi một bạn khác review.
- Commit theo dạng `<loại>(<phần>): <mô tả>`, ví dụ `feat(orders): ...`, `fix: ...`, `docs: ...`, `test: ...`, `chore: ...`.
- Cách làm chi tiết và bảng file phụ trách của từng người: [CONTRIBUTING.md](CONTRIBUTING.md).
- Phân công và luồng đặt món theo từng người: [docs/phan-cong-brewlite.pdf](docs/phan-cong-brewlite.pdf).

---

<div align="center">

Nhóm 10 BrewLite · Công nghệ Phần mềm · Trường Đại học Sài Gòn

</div>
