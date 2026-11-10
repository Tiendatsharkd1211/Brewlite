# Quy trình làm việc nhóm với Git – BrewLite

Nhóm làm theo Scrum như đề bài tập lớn: Product Backlog gồm 10 task, chia vào 3 Sprint. Mỗi task chỉ được tính là xong khi đạt **Definition of Done** ở mục 3.

## 1. Cài đặt một lần

1. Cài [Git](https://git-scm.com/downloads), Node.js LTS và Docker Desktop.
2. Chấp nhận lời mời vào repo (GitHub gửi qua email, hoặc vào trang repo bấm *Accept invitation*).
3. Khai báo tên và email trùng với tài khoản GitHub để commit hiện đúng tên bạn:
   ```bash
   git config --global user.name  "Họ Tên Của Bạn"
   git config --global user.email "email-dang-ky-github@gmail.com"
   ```
4. Tải code về và chạy thử theo README:
   ```bash
   git clone <link-repo>
   cd Brewlite/brewlite
   ```

## 2. Mỗi lần làm một việc

```bash
git checkout main
git pull                                   # lấy code mới nhất của cả nhóm
git checkout -b feat/huy-don-hoan-kho      # tạo nhánh riêng cho việc này

# ... sửa code, chạy thử ...

git add .
git commit -m "feat(orders): thêm API huỷ đơn và hoàn kho"
git push -u origin feat/huy-don-hoan-kho
```

Sau đó lên GitHub bấm **Compare & pull request**, điền mẫu có sẵn, chọn **1 bạn khác** ở ô *Reviewers*.
Người review đọc code, bấm *Approve* (hoặc góp ý), rồi bấm **Merge**. Xong thì xoá nhánh.

Làm tiếp trên cùng nhánh: cứ `git add` / `git commit` / `git push`, pull request tự cập nhật.

## 3. Definition of Done (theo đề)

Một task được tính là xong khi:

- Code chạy được, không lỗi build; đúng tiêu chí chấp nhận của task.
- Có commit trên Git với mô tả rõ ràng; được review trong nhóm.
- API có validate đầu vào; giao diện xử lý trạng thái đang tải và lỗi cơ bản.
- Có hướng dẫn chạy trong README.

## 4. Quy ước của nhóm

| Quy ước | Lý do |
|---|---|
| Không push thẳng vào `main`, luôn qua nhánh riêng và pull request | Tránh làm hỏng code chung, có người review (DoD) |
| Mỗi nhánh chỉ làm 1 việc | Review dễ, ít đụng nhau |
| Không commit file `.env`, `node_modules/`, `dist/`, `.next/` | Đã có trong `.gitignore`; `.env` chứa khoá bí mật (`JWT_SECRET`, `VNP_HASH_SECRET` của VNPay). Gửi mã VNPay cho nhau qua tin nhắn riêng, không dán vào code, issue hay pull request |
| Trước khi tạo pull request: `npm run build` (backend, frontend) và `npm run test` (backend) phải qua | Đảm bảo "không lỗi build" của DoD; GitHub Actions cũng tự chạy kiểm tra, PR đỏ thì sửa rồi mới merge |

**Đặt tên nhánh:** `feat/<viec>` (chức năng mới), `fix/<loi>` (sửa lỗi), `docs/<tai-lieu>` (tài liệu, sơ đồ).

**Lời nhắn commit:** `<loại>(<phần>): <mô tả tiếng Việt>`, ví dụ
`feat(cart): sửa tuỳ chọn món trong giỏ`, `fix(payments): không trừ điểm hai lần`, `test(orders): thêm test huỷ đơn`, `docs: cập nhật sơ đồ tuần tự`, `chore: cập nhật thư viện`.

## 5. Khi bị xung đột (conflict)

```bash
git checkout feat/nhanh-cua-ban
git pull origin main          # kéo main mới về nhánh của bạn
# mở các file bị đánh dấu <<<<<<< ======= >>>>>>>, giữ phần đúng, xoá các dấu đó
git add .
git commit -m "merge main vào nhánh"
git push
```
Không chắc thì hỏi bạn đã viết đoạn code kia, đừng xoá code của người khác.

## 6. Phân công

Phân công theo chức năng và luồng đặt món: [docs/phan-cong-brewlite.pdf](docs/phan-cong-brewlite.pdf).

### 6.1 Phần phụ trách

Nhóm còn 3 thành viên. Mỗi bạn phụ trách **tìm hiểu, trình bày khi vấn đáp, vẽ sơ đồ UML và review** phần dưới đây. Sửa vào phần của bạn khác thì nhắn trước và gắn bạn đó vào review. Đường dẫn tính từ thư mục `brewlite/`, riêng `.github/` và `docs/` nằm ở thư mục gốc repo.

| Thành viên | Nhánh | Chức năng | Backend | Frontend | Sơ đồ UML |
|---|---|---|---|---|---|
| Nguyễn Tiến Đạt | `feat/san-pham-menu`, `feat/trang-thai-don` | Thiết kế CSDL và dữ liệu mẫu; API sản phẩm; luật mã giảm giá (giảm %, miễn phí giao, điều kiện, hạn dùng); thực đơn, chi tiết món, tìm món không dấu, giỏ hàng; máy trạng thái đơn (PENDING → PAID → PREPARING → READY → COMPLETED, chặn chuyển sai); giữ tồn kho khi đặt cùng lúc (transaction, optimistic locking); huỷ đơn chưa thanh toán và trả món về kho; thông báo khi đơn đổi trạng thái | `backend/prisma`, `backend/src/seed.ts`, `backend/src/products`, `backend/src/promotions`, `backend/src/orders/order-state-machine.ts` (+ spec); trong `orders.service.ts`: trừ kho có kiểm tra `version`, `cancel`, `advance`; `backend/src/notifications` | `frontend/app/menu`, `frontend/app/product`, `frontend/components/menu`, `frontend/components/product`, `frontend/components/search`, `frontend/components/layout/CartDrawer.tsx`, `frontend/components/layout/NotificationBell.tsx`, `frontend/context/app-store.tsx`, `frontend/lib/products.ts`, `search.ts`, `fly-to-cart.ts`, `notifications.ts`, nút huỷ đơn trong `OrderTracking.tsx` (giao diện thực đơn, giỏ hàng cùng Phan Thành Đạt) | Sơ đồ lớp toàn hệ thống; sơ đồ hoạt động từ đặt món đến nhận món |
| Đinh Văn Đạt | `feat/dat-mon`, `feat/vnpay` | Đặt đơn: validate, tính lại giá, áp mã, trả mã đơn; xem một đơn; trang thanh toán (giờ nhận, mã ưu đãi, phương thức); thanh toán idempotent theo Idempotency-Key; VNPay sandbox: tạo link, ký và kiểm chữ ký, Return URL, IPN, đối soát (querydr); trang kết quả; theo dõi đơn, hoá đơn | `backend/src/orders`: `orders.controller.ts`, `orders.module.ts`, `dto/create-order.dto.ts`; trong `orders.service.ts`: `create`, `createInTx`, `findOne`; `backend/src/payments` (`vnpay/`, `dto/`, `client-ip.ts`) | `frontend/app/checkout`, `frontend/app/orders/[id]`, `frontend/app/payment/vnpay-return`, `frontend/components/checkout`, `frontend/components/orders` (OrderTracking, OrderStatusPill, InvoiceModal), `frontend/components/payment/VnpayReturn.tsx`, `frontend/lib/use-orders.ts`, `frontend/lib/payments.ts` | Use case đặt món và thanh toán; sequence đặt món và thanh toán |
| Phan Thành Đạt | `main`, `feat/tai-khoan-diem`, `feat/bao-gia`, `feat/lich-su-quan-ly-kiem-thu` | Khởi tạo dự án; đăng ký, đăng nhập (JWT, bcrypt), phân quyền; tài khoản, tích điểm, đổi điểm; báo giá từ máy chủ; món yêu thích, trang ưu đãi; lịch sử đơn, lịch sử giao dịch; khung giao diện, trang nhất; Docker, CI | `backend/src/main.ts`, `app.*`, `src/prisma`, `src/common`, `src/auth`; `orders/pricing.ts`, `orders/dto/quote-order.dto.ts`, `quote`, `findMine` trong `orders.service.ts`; `src/favorites`; lịch sử giao dịch trong `payments.service.ts` | `frontend/app/layout.tsx`, `page.tsx`, `globals.css`, trang thông tin, `frontend/components/layout`, `ui`, `home`, `contact`, các file dùng chung trong `frontend/lib`; `frontend/app/login`, `register`, `account`, `frontend/components/auth`, `account`, `frontend/context/auth-context.tsx`, `frontend/lib/redeem.ts`; `frontend/lib/pricing.ts`, `quote.ts`; `frontend/app/uu-dai`, `components/deals`, `TodayPrices.tsx`; `frontend/app/orders/page.tsx`, `frontend/app/payments`, `OrdersList.tsx`, `PaymentHistory.tsx`; `.github/`, Docker, `*.bat` | Use case tổng quát; sơ đồ triển khai |

**Review chéo:** Nguyễn Tiến Đạt review pull request của Đinh Văn Đạt, Đinh Văn Đạt review của Phan Thành Đạt, Phan Thành Đạt review của Nguyễn Tiến Đạt.

### 6.2 Quầy và quản lý cửa hàng (phần mở rộng)

Đề ghi nhân viên quầy nằm ngoài phạm vi MVP, nhóm làm thêm như phần mở rộng.

| Thành viên | Chức năng | Backend | Frontend |
|---|---|---|---|
| Phan Thành Đạt | Nhân viên quầy (hàng đợi, chuyển bước, huỷ đơn đã trả có lý do), quản lý cửa hàng (tổng quan, thực đơn, mã giảm giá, nội dung trang, phản hồi khách), kho nguyên liệu (phiếu nhập, công thức, trừ kho khi pha), quản lý tài khoản khách (khoá, mở khoá có lý do), tự huỷ đơn bỏ dở sau 30 phút | `backend/src/staff`, `backend/src/manage`, `backend/src/inventory`, `backend/src/customers`, `backend/src/feedback`, `backend/src/auth/customer-only.decorator.ts`; `expireStale`, `staffCancel` trong `orders.service.ts` | `frontend/app/staff`, `frontend/app/quan-ly`, `frontend/app/noi-bo`, `frontend/components/staff`, `frontend/components/manager`, `frontend/components/internal`, `frontend/components/auth/InternalNotice.tsx`, `frontend/lib/inventory.ts`, `customers-admin.ts`, `feedback-admin.ts`, `internal.ts`, `manager-nav.ts`, `sales.ts` |

### 6.3 Rà soát code và kiểm thử

| Thành viên | Nhiệm vụ | Sản phẩm |
|---|---|---|
| Phan Thành Đạt | Rà soát toàn bộ code backend và frontend theo 10 task và Definition of Done; kiểm thử luồng đúng, luồng sai (sai quyền, sai trạng thái, dữ liệu xấu) và đồng bộ giữa khách, quầy, quản lý; kiểm thử API trực tiếp; đo yêu cầu phi chức năng (API dưới 500ms) | Unit test (`npm test`), integration test trên CSDL thật (`npm run test:int`), rào CSDL (`backend/src/db-harden.ts`), bộ Thunder Client 91 request (`brewlite/thunder-client/`, chạy toàn bộ bằng `node brewlite/thunder-client/chay-thunder.mjs`) |
| Nguyễn Tiến Đạt | Review phần mình phụ trách trong pull request; chạy các thư mục Thunder Client về sản phẩm, mã giảm giá, trạng thái đơn, huỷ đơn; kiểm tra test máy trạng thái và đặt đồng thời không vượt tồn kho (`stock-concurrency.int-spec.ts`) | Review trên GitHub, kết quả chạy test |
| Đinh Văn Đạt | Review phần mình phụ trách trong pull request; chạy các thư mục Thunder Client về đặt đơn và thanh toán; thử VNPay sandbox thành công, thất bại, huỷ giữa chừng; kiểm tra gửi lại cùng Idempotency-Key chỉ tạo 1 giao dịch (`payments-vnpay.int-spec.ts`) | Review trên GitHub, kết quả chạy test |
