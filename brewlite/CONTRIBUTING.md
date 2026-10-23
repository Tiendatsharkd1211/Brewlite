# Quy trình làm việc nhóm với Git – BrewLite

Thầy chấm tiến độ dựa trên **lịch sử commit** của từng người, nên mỗi bạn phải tự commit
bằng **tài khoản GitHub của chính mình**. Không nhờ người khác commit hộ.

## 1. Cài đặt một lần

1. Cài [Git](https://git-scm.com/downloads) và Node.js LTS, Docker Desktop.
2. Chấp nhận lời mời vào repo (GitHub gửi qua email, hoặc vào trang repo bấm *Accept invitation*).
3. Khai báo tên và email **trùng với email tài khoản GitHub** (sai email thì commit không được tính cho bạn):
   ```bash
   git config --global user.name  "Họ Tên Của Bạn"
   git config --global user.email "email-dang-ky-github@gmail.com"
   ```
4. Tải code về và chạy thử theo README:
   ```bash
   git clone <link-repo>
   cd brewlite
   ```

## 2. Mỗi lần làm một việc

```bash
git checkout main
git pull                                   # lấy code mới nhất của cả nhóm
git checkout -b feat/huy-don-hoan-kho   # tạo nhánh riêng cho việc này

# ... sửa code, chạy thử ...

git add .
git commit -m "feat(orders): thêm API huỷ đơn và hoàn kho"
git push -u origin feat/huy-don-hoan-kho
```

Sau đó lên GitHub bấm **Compare & pull request**, điền mẫu có sẵn, chọn **1 bạn khác** ở ô *Reviewers*.
Người review đọc code, bấm *Approve* (hoặc góp ý), rồi bấm **Merge**. Xong thì xoá nhánh.

Làm tiếp trên cùng nhánh: cứ `git add` / `git commit` / `git push`, pull request tự cập nhật.

## 3. Quy tắc

| Quy tắc | Lý do |
|---|---|
| Không push thẳng vào `main`, luôn qua pull request | Tránh làm hỏng code chung, có người review |
| Commit **nhỏ và thường xuyên** (vài lần mỗi tuần), không dồn 1 commit to cuối kỳ | Thầy xem tiến độ đều đặn |
| Mỗi nhánh chỉ làm 1 việc | Review dễ, ít đụng nhau |
| Không commit file `.env`, `node_modules/`, `dist/`, `.next/` | Đã có trong `.gitignore`; `.env` chứa khoá bí mật |
| Trước khi tạo pull request: `npm run build` và `npm run test` (backend) phải qua | GitHub Actions cũng tự chạy kiểm tra, PR đỏ thì sửa rồi mới merge |

**Đặt tên nhánh:** `feat/<viec>` (chức năng mới), `fix/<loi>` (sửa lỗi), `docs/<tai-lieu>` (tài liệu, sơ đồ).

**Lời nhắn commit:** `<loại>(<phần>): <mô tả tiếng Việt>`, ví dụ
`feat(cart): sửa tuỳ chọn món trong giỏ`, `fix(payments): không trừ điểm hai lần`, `test(orders): thêm test huỷ đơn`, `docs: cập nhật sơ đồ tuần tự`, `chore: cập nhật thư viện`.

## 4. Khi bị xung đột (conflict)

```bash
git checkout feat/nhanh-cua-ban
git pull origin main          # kéo main mới về nhánh của bạn
# mở các file bị đánh dấu <<<<<<< ======= >>>>>>>, giữ phần đúng, xoá các dấu đó
git add .
git commit -m "merge main vào nhánh"
git push
```
Không chắc thì hỏi bạn đã viết đoạn code kia, đừng xoá code của người khác.

## 5. Phân chia phần code

Mỗi bạn phụ trách phần code dưới đây và vẽ các sơ đồ UML của đúng phần đó. Sửa vào phần của bạn khác thì nhắn trước và gắn bạn đó vào review.

| Thành viên | Phần phụ trách | Thư mục / file chính |
|---|---|---|
| Nguyễn Tiến Đạt | CSDL, sản phẩm, thực đơn, chi tiết món, mã giảm giá | `backend/prisma`, `backend/src/seed.ts`, `backend/src/products`, `backend/src/promotions`, `frontend/components/menu`, `frontend/components/product`, `frontend/components/search`, `frontend/lib/` (types, mock-data, format, products, search, images, pricing) |
| Phan Thành Đạt | Khởi tạo, kiến trúc, khung giao diện, lịch sử đơn, Docker, CI | `backend/src/main.ts`, `backend/src/app.*`, `backend/src/prisma`, `backend/src/common`, `frontend/app/layout.tsx`, `frontend/lib/api.ts`, `frontend/lib/use-orders.ts`, `frontend/components/ui`, `frontend/components/layout` (AppHeader, QueryProvider, BackendStatus), `frontend/components/orders` (OrdersList, OrderStatusPill), `docker-compose.yml`, `*/Dockerfile`, `.github/` |
| Trần Anh Trung | Đăng ký, đăng nhập, tài khoản, đổi điểm, giao diện tài khoản ảo | `backend/src/auth`, `frontend/context/auth-context.tsx`, `frontend/components/auth`, `frontend/components/account` (gồm `WalletManager.tsx`), `frontend/lib/wallets.ts`, `frontend/components/layout/UserMenu.tsx`, `frontend/app/login`, `frontend/app/register`, `frontend/app/account` |
| Đinh Văn Đạt | Tạo đơn, thanh toán, tài khoản ảo | `backend/src/orders` (dto, pricing.ts, tạo đơn trong orders.service.ts), `backend/src/payments`, `backend/src/wallets`, `backend/test/payments-idempotency.int-spec.ts`, `backend/test/wallets.int-spec.ts`, `frontend/components/checkout` (phần thanh toán) |
| Đỗ Chí Thanh | Giỏ hàng, theo dõi đơn | `frontend/context/app-store.tsx`, `frontend/lib/fly-to-cart.ts`, `frontend/components/layout/BottomNav.tsx`, `frontend/app/checkout` (phần giỏ hàng), `frontend/components/orders` (OrderTracking, InvoiceModal), `frontend/app/orders/[id]` |
| Lê Bảo Trọng Tấn | Máy trạng thái, tồn kho, huỷ đơn, quầy | `backend/src/orders/order-state-machine.ts` (+ spec), `backend/src/orders/orders.service.ts` (moveOrderStatus, optimistic locking, cancel, advance), `backend/test/stock-concurrency.int-spec.ts`, `frontend/components/layout/NotificationBell.tsx`, nút huỷ đơn và demo quầy trong `OrderTracking.tsx` |

**Review chéo:** Nguyễn Tiến Đạt ↔ Phan Thành Đạt, Trần Anh Trung ↔ Đỗ Chí Thanh, Đinh Văn Đạt ↔ Lê Bảo Trọng Tấn.

Mỗi tuần mỗi bạn nên có ít nhất 1 pull request được merge và review ít nhất 1 pull request của bạn khác.
