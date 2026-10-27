# Bối cảnh, stakeholder và phạm vi (Task 1.1)

## Vấn đề nghiệp vụ

Vào giờ cao điểm (sáng trước giờ học, giờ nghỉ trưa), khách của quán phải xếp hàng hai lần: một lần để gọi món và trả tiền, một lần để chờ lấy món. Nhân viên vừa ghi món vừa thu tiền mặt nên dễ nhầm món, nhầm tiền thối, và quán không biết trước món nào sắp hết. BrewLite giải quyết bằng cách cho khách tự gọi món, tự chọn tuỳ chọn và trả tiền không dùng tiền mặt ngay trên điện thoại; quán nhận đơn đã thanh toán, pha chế và báo trạng thái để khách tới đúng lúc lấy món.

## Stakeholder, mục tiêu và kỳ vọng

| Stakeholder | Vai trò | Mục tiêu | Kỳ vọng với hệ thống |
|---|---|---|---|
| Khách hàng | Người dùng chính | Đặt món nhanh, không xếp hàng, không cầm tiền mặt | Menu rõ giá; chọn size/topping thấy giá ngay; thanh toán vài chạm; biết khi nào món xong; không bị trừ tiền hai lần |
| Nhân viên quầy (Barista) | Người dùng phụ (mở rộng) | Nhận đơn đã trả tiền, pha đúng món | Thấy đơn PAID, chuyển trạng thái Đang pha → Sẵn sàng → Hoàn thành |
| Quản lý cửa hàng | Người ra yêu cầu nghiệp vụ, đại diện Product Owner | Tăng số đơn giờ cao điểm, không bán vượt tồn kho, có khuyến mãi | Không có đơn bị pha khi chưa trả tiền; tồn kho đúng khi nhiều người đặt cùng lúc; mã giảm giá và điểm thưởng tính đúng |
| Giảng viên (khách hàng nghiệm thu) | Nghiệm thu sản phẩm và quy trình | Đánh giá quy trình phần mềm của nhóm | Có tài liệu, sơ đồ, test, CI/CD, URL production chạy được; truy vết được từ yêu cầu tới code và test |
| Nhóm phát triển (6 thành viên) | Phân tích, thiết kế, lập trình, kiểm thử | Hoàn thành MVP đúng hạn, mỗi người có phần code rõ ràng | Kiến trúc dễ chia việc, CI chặn lỗi trước khi merge, triển khai một lệnh |
| Đơn vị thanh toán (VNPay) | Cung cấp cổng thanh toán | Giao dịch đúng chuẩn tích hợp, an toàn | Merchant ký đúng chữ ký, trả đúng mã phản hồi IPN, không giả mạo kết quả |

## Phạm vi

**Trong phạm vi MVP (In-scope):**

- Xem thực đơn từ CSDL, tìm kiếm, lọc theo danh mục; xem chi tiết món, chọn size S/M/L, mức đường, mức đá, topping, thấy giá thay đổi ngay.
- Giỏ hàng: thêm, sửa số lượng và tuỳ chọn, xoá, tự tính tổng, giữ nguyên khi tải lại trang.
- Đăng ký, đăng nhập bằng email và mật khẩu, nhận JWT; chỉ người đã đăng nhập mới đặt đơn.
- Tạo đơn PENDING, giữ chỗ tồn kho; chọn đến lấy tại quầy An Dương Vương hoặc giao hàng.
- Thanh toán qua VNPay sandbox hoặc bằng điểm BrewLite; thanh toán idempotent; thanh toán lại khi thất bại.
- Màn hình xác nhận, theo dõi trạng thái đơn, lịch sử đơn, lịch sử giao dịch kèm đối soát với VNPay.
- Máy trạng thái đơn hàng, huỷ đơn chưa thanh toán và hoàn kho.

**Phạm vi mở rộng (Should/Could, làm nếu còn thời gian):**

- Mã giảm giá (BREW20, VNPAY20, FREESHIP) và tích điểm, đổi điểm lấy quà (đã làm).
- Nút "vai trò quầy" để chuyển PAID → PREPARING → READY → COMPLETED khi demo (đã làm, chưa phân quyền).
- Hoá đơn xem trên màn hình, chuông thông báo (dữ liệu mẫu).

**Không thực hiện (Out-of-scope / Won't):**

- Nhiều chi nhánh, chọn chi nhánh gần nhất bằng GPS, mã QR lấy món, chỉ đường.
- Tài khoản và màn hình riêng cho nhân viên quầy, trang quản trị menu, báo cáo doanh thu.
- Thanh toán bằng tiền thật (chỉ dùng môi trường sandbox), hoàn tiền tự động, hoá đơn điện tử có mã cơ quan thuế.
- Ứng dụng di động gốc (iOS/Android).

## Giả định, ràng buộc và rủi ro ban đầu

| Loại | Nội dung |
|---|---|
| Giả định | Khách có điện thoại có trình duyệt và Internet; mỗi khách dùng email để đăng ký; một cửa hàng duy nhất; giá và tồn kho do quán nạp sẵn (seed); VNPay sandbox hoạt động trong thời gian demo |
| Ràng buộc kỹ thuật | Bắt buộc Next.js, NestJS, PostgreSQL; chạy được bằng Docker; HashSecret VNPay và JWT secret không được nằm trong repository |
| Ràng buộc quy trình | Làm theo Scrum, hai Sprint; mọi thay đổi qua pull request và review chéo; mỗi thành viên commit bằng tài khoản của mình |
| Ràng buộc thời gian | Một học kỳ, nhóm 6 sinh viên vừa học vừa làm |
| Rủi ro R1 | VNPay không gọi được IPN về máy local → kết quả chỉ về qua Return URL. Giảm thiểu: Return URL cũng ghi nhận sau khi kiểm chữ ký và số tiền; có đối soát `querydr` |
| Rủi ro R2 | Nhiều khách đặt cùng món còn ít → bán vượt tồn kho. Giảm thiểu: transaction + optimistic locking, test đồng thời |
| Rủi ro R3 | Mạng chập chờn làm client gửi lại yêu cầu thanh toán → trừ tiền hai lần. Giảm thiểu: Idempotency-Key, khoá dòng đơn |
| Rủi ro R4 | Gói miễn phí của nền tảng triển khai ngủ khi không dùng, CSDL miễn phí có hạn → URL production chậm hoặc hết hạn lúc chấm. Giảm thiểu: mở trước buổi chấm, gia hạn/tạo lại CSDL bằng migration + seed |
| Rủi ro R5 | Thành viên chưa quen Git, xung đột merge. Giảm thiểu: hướng dẫn Git, chia code theo thư mục, review chéo theo cặp |
