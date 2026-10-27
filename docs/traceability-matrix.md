# Ma trận truy vết

Tệp `docs/traceability-matrix.md` theo mẫu của đề:

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code / API | Test |
|---|---|---|---|---|
| FR-01 | UC-01, US-02 Xem thực đơn | Activity-01, Class-01, C4 | `GET /products`, `MenuBrowser.tsx` | API-T01 (`GET /products` 200), E2E-T01 |
| FR-02 | UC-01, US-03 Tìm kiếm & lọc | Use-case tổng quát | `lib/search.ts`, `SearchBox.tsx` | Kiểm thử thủ công MT-02 |
| FR-03 | UC-02, US-04 Chi tiết & tuỳ chọn | Activity-01, Class-01 | `GET /products/:id`, `ProductCustomizer.tsx` | API-T02 (`/products/:id` 200/404), E2E-T01 |
| FR-04, FR-05 | UC-03, US-06, US-08 Giỏ hàng | Activity-01 | `context/app-store.tsx` | E2E-T01, MT-05 |
| FR-06 | UC-04, US-09 Đăng ký | Use-case tổng quát | `POST /auth/register`, `RegisterForm.tsx` | INT-T05 (email trùng 409) |
| FR-07 | UC-05, US-10 Đăng nhập JWT | Sequence-01 (bước 4) | `POST /auth/login`, `JwtAuthGuard` | INT-T05, E2E-T01 |
| FR-08 | UC-06, US-12 Tạo đơn | Sequence-01, Activity-01, Class-01 | `POST /orders` | INT-T01 (`stock-concurrency.int-spec.ts`) |
| FR-09, FR-10 | UC-06, US-11 Mã giảm giá | Class-01 (Promotion) | `promotions.service.ts`, `voucher-rules.ts` | UNIT-T02 (`voucher-rules.spec.ts`) |
| FR-11 | UC-06, US-14 Thanh toán VNPay | Sequence-01, State-01 | `POST /payments`, `GET /payments/vnpay/return`, `/vnpay/ipn` | INT-T03 (`payments-vnpay.int-spec.ts`), UNIT-T03 (`vnpay.util.spec.ts`) |
| FR-12 | UC-06, US-15 Không trừ tiền 2 lần | Sequence-01 (opt idempotency) | `PaymentsService.pay`, `applyResult` | INT-T03 (cùng khoá, đồng thời) |
| FR-13 | UC-06 (ngoại lệ 11a) | Sequence-01, Activity-01 | `vnpay.util.ts` verify | INT-T03 (97, 04), UNIT-T03 |
| FR-14 | UC-06 (thay thế 3a, 10a) | State-01 | `payWithPoints`, nút thanh toán lại | INT-T03, INT-T04 (điểm) |
| FR-15 | UC-08, UC-09, US-17, US-18 | Activity-01 | `GET /orders/me`, `GET /payments/me`, `POST /payments/:id/query` | INT-T03 (lịch sử, querydr) |
| FR-16 | UC-07, US-13 Trạng thái đơn | State-01 | `order-state-machine.ts`, `moveOrderStatus` | UNIT-T01 (`order-state-machine.spec.ts`) |
| FR-17 | UC-10, US-19 Huỷ đơn | State-01, Activity-01 | `POST /orders/:id/cancel` | INT-T01 (hoàn kho) |
| FR-18 | UC-06, US-16 Không vượt tồn kho | Sequence-01 (transaction) | `OrdersService.create` (optimistic locking) | INT-T01 (12 khách / kho 5) |
| FR-19 | UC-11, US-21 Điểm thưởng | Class-01 (LoyaltyTransaction) | `POST /auth/redeem`, `applyResult` | INT-T03 (điểm cộng 1 lần), UNIT-T02 |
| FR-20 | UC-12, US-20 Vai trò quầy | State-01 | `POST /orders/:id/advance` | INT-T01 |
| NFR-03, NFR-04 | — | Sequence-01 | `ValidationPipe`, bcrypt, JWT | INT-T05 |
| NFR-05, NFR-11 | US-22 Bàn giao | Deployment-01 | `.github/workflows`, `.env.example` | Pipeline CI/CD |
| NFR-10 | US-01, US-22 | Deployment-01 | `docker-compose.yml`, `GET /health` | UNIT-T04 (`app.controller.spec.ts`), smoke test |

Quy ước mã test: UNIT-T01 máy trạng thái, UNIT-T02 luật khuyến mãi, UNIT-T03 tiện ích VNPay, UNIT-T04 health; INT-T01 tồn kho và trạng thái, INT-T03 thanh toán VNPay, INT-T04 thanh toán bằng điểm, INT-T05 xác thực; API-T01/T02 API sản phẩm; E2E-T01 luồng menu → xác nhận đơn; MT-xx kiểm thử thủ công.
