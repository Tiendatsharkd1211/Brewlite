# SRS rút gọn – BrewLite (Task 1.2)

Mức ưu tiên theo MoSCoW: **M** = Must, **S** = Should, **C** = Could, **W** = Won't.

## Yêu cầu chức năng

| Mã | Nhóm | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận (kiểm chứng được) |
|---|---|---|---|---|
| FR-01 | Menu | Hiển thị danh sách đồ uống, bánh kèm hình, tên, giá, danh mục | M | `GET /products` trả 200 và danh sách từ CSDL; trang chủ hiện skeleton khi tải, thông báo + nút "Thử lại" khi lỗi, "Không có món" khi rỗng |
| FR-02 | Menu | Tìm kiếm theo tên (gõ không dấu, viết tắt) và lọc theo danh mục | S | Gõ "bx" ra Bạc xỉu; chọn danh mục chỉ còn món thuộc danh mục đó |
| FR-03 | Chi tiết sản phẩm | Xem chi tiết món, chọn size S/M/L, mức đường, mức đá, topping, ghi chú | M | `GET /products/:id` trả món và topping dùng được; đổi size/topping thì giá hiển thị đổi ngay; mã không tồn tại trả 404 |
| FR-04 | Giỏ hàng | Thêm món đã tuỳ chọn vào giỏ, badge hiện tổng số món | M | Thêm 2 ly cùng tuỳ chọn thì gộp một dòng qty = 2; badge tăng đúng |
| FR-05 | Giỏ hàng | Sửa số lượng, sửa tuỳ chọn, xoá món; tự tính tổng; giữ khi tải lại trang | M | Tổng = Σ (đơn giá × qty); tải lại trang giỏ vẫn còn; qty giới hạn 1–20 |
| FR-06 | Xác thực | Đăng ký bằng họ tên, email, mật khẩu | M | Email trùng trả 409; mật khẩu < 8 ký tự hoặc thiếu chữ/số trả 400; mật khẩu lưu dạng băm bcrypt |
| FR-07 | Xác thực | Đăng nhập nhận JWT; route đặt đơn, thanh toán, lịch sử yêu cầu JWT | M | Đăng nhập đúng trả `accessToken` hạn 7 ngày; gọi `POST /orders` không có token trả 401; giao diện chuyển tới `/login?next=/checkout` |
| FR-08 | Đặt đơn | Tạo đơn từ giỏ, backend tự tính lại giá theo CSDL, trừ tồn kho, trả mã đơn trạng thái PENDING | M | `POST /orders` trả 201 với mã "BLxxxxxx", status PENDING; giá client gửi lên bị bỏ qua; món hết hàng trả 409 và không tạo đơn |
| FR-09 | Đặt đơn | Chọn hình thức nhận: đến lấy tại quầy (giờ lấy) hoặc giao hàng (địa chỉ, phí ship) | S | Giao hàng mà địa chỉ < 8 ký tự trả 400; phí giao hàng cộng vào tổng |
| FR-10 | Đặt đơn | Áp mã giảm giá theo điều kiện (đơn tối thiểu, phương thức, giao hàng, giới hạn lượt) | S | BREW20 với đơn < 50.000đ bị từ chối kèm lý do; VNPAY20 chỉ dùng khi trả qua VNPay, giảm tối đa 25.000đ |
| FR-11 | Thanh toán | Thanh toán qua VNPay sandbox: tạo link ký HMAC-SHA512, nhận kết quả qua Return URL và IPN | M | `POST /payments` trả `payUrl`; thanh toán thẻ test thành công → đơn PAID; khách huỷ (mã 24) → đơn PAYMENT_FAILED, giỏ giữ nguyên |
| FR-12 | Thanh toán | Thanh toán idempotent bằng header Idempotency-Key | M | Gửi lại cùng khoá (tuần tự hoặc 5 request đồng thời) chỉ tạo 1 giao dịch, cùng 1 link; điểm chỉ cộng 1 lần khi Return và IPN tới cùng lúc |
| FR-13 | Thanh toán | Từ chối kết quả giả mạo: sai chữ ký, sai số tiền | M | Sửa `vnp_ResponseCode` trên URL → báo "chữ ký không hợp lệ", không ghi nhận; IPN sai chữ ký trả 97, sai số tiền trả 04 |
| FR-14 | Thanh toán | Thanh toán lại khi thất bại; thanh toán bằng điểm BrewLite | S | Đơn PAYMENT_FAILED tạo được link mới và trả thành công; trả bằng điểm không đủ điểm → PAYMENT_FAILED, không âm điểm |
| FR-15 | Xác nhận, lịch sử | Màn hình xác nhận (mã đơn, trạng thái, mã giao dịch VNPay), lịch sử đơn, lịch sử giao dịch và đối soát | M | Sau thanh toán thấy mã đơn và PAID; `GET /orders/me`, `GET /payments/me` chỉ trả dữ liệu của chính người dùng; nút "Kiểm tra lại với VNPay" gọi `querydr` |
| FR-16 | Quản lý trạng thái đơn | Đơn chỉ đi theo PENDING → PAID → PREPARING → READY → COMPLETED; PENDING ↔ PAYMENT_FAILED; huỷ khi chưa thanh toán | M | Chuyển sai (vd. PENDING → PREPARING) trả 409; trang theo dõi tự cập nhật 5 giây/lần |
| FR-17 | Quản lý trạng thái đơn | Huỷ đơn chưa thanh toán và hoàn tồn kho, vô hiệu link VNPay đang chờ | S | Huỷ đơn PENDING → CANCELLED, stock tăng lại đúng số đã giữ; huỷ đơn PAID bị từ chối |
| FR-18 | Tồn kho | Không bán vượt tồn kho khi nhiều khách đặt cùng lúc | M | Kho 5 phần, 12 khách đặt đồng thời → đúng 5 đơn thành công, stock = 0 |
| FR-19 | Loyalty | Cộng điểm khi đơn PAID (1.000đ = 1 điểm), xem lịch sử điểm, đổi điểm lấy quà | S | Đơn 45.000đ PAID → +45 điểm, ghi LoyaltyTransaction; đổi quà không đủ điểm bị từ chối |
| FR-20 | Vai trò quầy | Nhân viên quầy chuyển đơn sang bước pha chế tiếp theo | C | `POST /orders/:id/advance` đi đúng một bước; hiện là nút demo, chưa phân quyền |
| FR-21 | Quản trị | Trang quản trị menu, báo cáo doanh thu | W | Không làm trong học kỳ này |

## Yêu cầu phi chức năng

| Mã | Nhóm | Yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
|---|---|---|---|---|
| NFR-01 | Hiệu năng | Thời gian phản hồi API với dữ liệu mẫu | M | p95 của `GET /products`, `POST /orders` < 500 ms khi chạy local (đo bằng log thời gian request hoặc DevTools) |
| NFR-02 | Hiệu năng | Trang menu tải nhanh trên di động | S | Có skeleton trong lúc tải; Lighthouse Performance mobile ≥ 70 |
| NFR-03 | Bảo mật | Mật khẩu băm, xác thực bằng JWT | M | Cột `passwordHash` không chứa mật khẩu gốc; token sai/hết hạn trả 401 |
| NFR-04 | Bảo mật | Validate dữ liệu đầu vào ở cả frontend và backend | M | ValidationPipe với `whitelist` và `forbidNonWhitelisted`: trường lạ hoặc sai kiểu trả 400 |
| NFR-05 | Bảo mật | Bí mật không nằm trong repository và log | M | `.env` trong `.gitignore`; `JWT_SECRET`, `VNP_HASH_SECRET`, `DATABASE_URL` production chỉ có trong secret của nền tảng/CI |
| NFR-06 | Bảo mật | Toàn vẹn kết quả thanh toán | M | Mọi kết quả VNPay được kiểm chữ ký HMAC-SHA512 và số tiền trước khi ghi |
| NFR-07 | Tính khả dụng | Giao diện mobile-first, dùng được trên Chrome, Safari, Edge mới | M | Không cuộn ngang ở màn hình 375 px; nút bấm ≥ 40 px; thông báo lỗi tiếng Việt dễ hiểu |
| NFR-08 | Tính khả dụng | Thông báo trạng thái rõ ràng | S | Mọi thao tác gọi API có trạng thái đang xử lý, thành công hoặc lỗi |
| NFR-09 | Tin cậy | Dữ liệu nhất quán khi có lỗi hoặc đồng thời | M | Tạo đơn và ghi nhận thanh toán chạy trong transaction; lỗi giữa chừng rollback |
| NFR-10 | Khả năng triển khai | Chạy toàn bộ hệ thống bằng một lệnh ở local | M | `docker compose up --build` chạy web, API, CSDL; `GET /health` trả `{"status":"ok","db":"up"}` |
| NFR-11 | Khả năng triển khai | Tự động kiểm tra và triển khai | M | PR chạy CI (install, lint, test, build); merge vào `main` tự build image, deploy, smoke test |
| NFR-12 | Khả năng bảo trì | Mã chia module theo domain, có test cho nghiệp vụ quan trọng | S | Mỗi module NestJS một thư mục; máy trạng thái, idempotency, tồn kho, VNPay đều có test |

## Sơ đồ use-case tổng quát

![Hình 2.1. Sơ đồ use-case tổng quát của hệ thống BrewLite](../diagrams/uc-01-tong-quat.png)

| Actor | Mô tả |
|---|---|
| Khách vãng lai | Chưa đăng nhập: xem menu, chi tiết, dùng giỏ hàng, đăng ký, đăng nhập |
| Khách hàng (thành viên) | Kế thừa khách vãng lai; đặt và thanh toán đơn, theo dõi, xem lịch sử, huỷ đơn, quản lý tài khoản và điểm |
| Nhân viên quầy | Mở rộng ngoài MVP: chuyển trạng thái pha chế |
| Cổng VNPay | Hệ thống ngoài: nhận khách thanh toán, báo kết quả qua Return URL, IPN, trả lời truy vấn đối soát |
