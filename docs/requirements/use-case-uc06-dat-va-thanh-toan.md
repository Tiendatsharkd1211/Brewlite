# Đặc tả use-case UC-06: Đặt và thanh toán đơn hàng (Task 1.3)

![Hình 2.2. Use-case diagram cho phạm vi UC-06](../diagrams/uc-02-dat-thanh-toan.png)

| Mục | Nội dung |
|---|---|
| Mã, tên | UC-06 – Đặt và thanh toán đơn hàng |
| Mục tiêu | Khách chuyển giỏ hàng thành đơn đã thanh toán không dùng tiền mặt |
| Actor chính | Khách hàng (thành viên) |
| Actor phụ | Cổng VNPay sandbox |
| Trigger | Khách bấm "Thanh toán ngay" ở trang giỏ hàng/thanh toán |
| Tiền điều kiện | Giỏ hàng có ít nhất 1 món; backend đã cấu hình `VNP_TMN_CODE`, `VNP_HASH_SECRET` (nếu chọn VNPay) |
| Hậu điều kiện thành công | Đơn ở trạng thái PAID; Payment SUCCEEDED lưu mã giao dịch VNPay, ngân hàng, thời gian trả; tồn kho đã trừ; điểm được cộng và ghi LoyaltyTransaction; lượt dùng mã giảm giá tăng; giỏ hàng được xoá |
| Hậu điều kiện thất bại | Đơn PAYMENT_FAILED (hoặc không tạo đơn); Payment FAILED kèm lý do; khách không bị trừ tiền; giỏ hàng giữ nguyên |
| Yêu cầu liên quan | FR-07, FR-08, FR-09, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-18, FR-19, NFR-03, NFR-04, NFR-06, NFR-09 |

**Luồng chính:**

1. Khách mở giỏ hàng, kiểm tra món và tổng tạm tính.
2. Khách chọn hình thức nhận (đến lấy tại quầy An Dương Vương kèm giờ lấy, hoặc giao hàng kèm địa chỉ).
3. Khách chọn phương thức VNPay, (tuỳ chọn) nhập mã giảm giá; giao diện xem trước số tiền giảm.
4. Khách bấm "Thanh toán ngay".
5. Giao diện kiểm tra đã đăng nhập, gửi `POST /orders` kèm JWT, chỉ gửi lựa chọn, không gửi giá.
6. API kiểm tra JWT, validate DTO; trong một transaction tính lại giá theo CSDL, trừ tồn kho bằng optimistic locking, áp mã giảm giá, tạo đơn PENDING và trả mã đơn.
7. Giao diện sinh Idempotency-Key (UUID) và gửi `POST /payments {orderId, method: VNPAY}`.
8. API tạo Payment PROCESSING (khoá UNIQUE), ký link VNPay bằng HMAC-SHA512 (hết hạn sau 15 phút), trả `payUrl`.
9. Trình duyệt chuyển sang trang VNPay; khách nhập thẻ test và OTP.
10. VNPay báo thành công: gọi IPN về API và chuyển trình duyệt về `/payment/vnpay-return`.
11. API kiểm chữ ký, số tiền; khoá dòng đơn và ghi nhận đúng một lần: đơn PAID, Payment SUCCEEDED, cộng điểm, tăng lượt dùng mã.
12. Giao diện xoá giỏ, hiển thị mã đơn, trạng thái PAID, mã giao dịch VNPay, ngân hàng, điểm được cộng, và nút theo dõi đơn.

**Luồng thay thế:**

- 2a. Giao hàng: khách nhập địa chỉ; phí giao hàng cộng vào tổng (mã FREESHIP miễn phí).
- 3a. Thanh toán bằng điểm: ở bước 8 API trừ điểm ngay trong transaction (`loyaltyPoints >= cần`), đơn PAID, không chuyển sang VNPay.
- 4a. Chưa đăng nhập: chuyển tới `/login?next=/checkout`; đăng nhập xong quay lại bước 4.
- 10a. Khách huỷ trên VNPay (mã 24) hoặc thẻ lỗi: API ghi Payment FAILED, đơn PAYMENT_FAILED; giao diện giữ giỏ và hiện nút "Thanh toán lại qua VNPay" (tạo link mới, khoá mới) hoặc "Huỷ đơn".
- 10b. Khách đóng trình duyệt trước khi quay về: kết quả vẫn ghi qua IPN; nếu không có IPN, khách mở Lịch sử giao dịch và bấm "Kiểm tra lại với VNPay" (`querydr`).

**Luồng ngoại lệ:**

- 6a. Món không đủ tồn kho: rollback, trả 409 "… đã hết hàng / chỉ còn N phần", không tạo đơn, giỏ giữ nguyên.
- 6b. Dữ liệu sai (qty ngoài 1–20, topping không thuộc món, mã giảm giá không hợp lệ): trả 400 kèm lý do.
- 6c. Nhiều khách tranh cùng món: tự thử lại tối đa 8 lần; vẫn xung đột trả 409 "vui lòng thử lại".
- 7a. Mạng lỗi khi gửi `POST /payments`: client gửi lại với cùng khoá; API trả lại giao dịch và link cũ, không tạo giao dịch thứ hai.
- 11a. Tham số bị sửa (chữ ký sai) hoặc số tiền không khớp: không ghi nhận; IPN trả 97/04; giao diện báo "Chữ ký VNPay không hợp lệ".
- 11b. Khách trả hai link cho cùng đơn (hai tab): đơn chỉ PAID một lần, giao dịch sau ghi NEEDS_REFUND.
- 11c. JWT hết hạn khi quay về từ VNPay: chuyển tới đăng nhập, giữ tham số kết quả, đăng nhập xong ghi nhận tiếp.
