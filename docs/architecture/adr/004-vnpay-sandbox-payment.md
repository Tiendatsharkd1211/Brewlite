# ADR 004: THANH TOÁN QUA VNPAY SANDBOX

**Mã quyết định:** ADR 004
**Ngày quyết định:** 23/10/2026
**Trạng thái:** Đề xuất (Proposed). Chuyển sang "Đã chấp nhận" sau khi PR được merge.
**Lĩnh vực:** Thanh toán và tích hợp dịch vụ bên ngoài

## 1. Bối cảnh (Context)

Phiên bản đầu của BrewLite thanh toán bằng ví ảo, tức thanh toán giả lập do hệ thống tự trừ tiền, không đi qua một cổng thanh toán thật. Ngày 23/10/2026, giảng viên yêu cầu nhóm thử thanh toán trên môi trường sandbox VNPay thay cho cách này.

Khi chuyển sang cổng bên ngoài, thanh toán nằm ngoài transaction cơ sở dữ liệu của hệ thống và đặt ra các yêu cầu sau:

- Kết quả phải đáng tin cậy: tham số trả về không được giả mạo hoặc sửa số tiền.
- Kết quả có thể đến qua hai kênh (Return URL do trình duyệt chuyển về, IPN do máy chủ VNPay gọi về) và đến trùng hoặc đồng thời, nhưng đơn chỉ được ghi nhận một lần.
- Môi trường chạy local không nhận được IPN từ VNPay.
- Khách có thể đóng trình duyệt trước khi quay về, hoặc mạng lỗi khi gửi yêu cầu thanh toán.

## 2. Các phương án được xem xét (Options Considered)

### 2.1. Giữ ví ảo

Giữ nguyên thanh toán giả lập. Cách này đơn giản và chạy được hoàn toàn ở local, nhưng không phản ánh quy trình thanh toán thực tế và không đáp ứng yêu cầu của giảng viên.

Các phương án 2.2 đến 2.4 đều tích hợp VNPay sandbox và khác nhau ở **cách nhận kết quả thanh toán**.

### 2.2. VNPay sandbox, chỉ nhận kết quả qua Return URL

Chỉ dựa vào việc trình duyệt khách được chuyển về trang của hệ thống. Cách này đơn giản và chạy được ở local, nhưng nếu khách đóng trình duyệt hoặc mất mạng trước khi quay về thì hệ thống không biết kết quả, dù khách đã bị trừ tiền.

### 2.3. VNPay sandbox, chỉ nhận kết quả qua IPN

Máy chủ VNPay gọi thẳng về máy chủ của hệ thống, không phụ thuộc trình duyệt nên đáng tin hơn. Tuy nhiên IPN cần địa chỉ truy cập được từ internet, nên môi trường local không nhận được; giao diện cũng cần một cách để biết kết quả khi khách quay về.

### 2.4. VNPay sandbox, nhận qua cả Return URL và IPN, có đối soát

Cả hai kênh cùng kiểm chữ ký và số tiền, rồi cùng đi qua một hàm ghi nhận idempotent. Có thêm đối soát bằng `querydr` khi không nhận được kết quả. Cách này bù được điểm yếu của từng kênh, nhưng phải xử lý hai kênh đến trùng hoặc đồng thời, và tốn thêm công cài đặt, kiểm thử.

## 3. Quyết định (Decision)

Nhóm chọn **thanh toán qua VNPay sandbox** và bỏ ví ảo, theo **phương án 2.4**: nhận kết quả qua cả Return URL và IPN, có đối soát. Thanh toán bằng điểm của BrewLite được giữ lại như một phương thức riêng.

1. **Khởi tạo.** `POST /payments` (có header `Idempotency-Key`) tạo `Payment` ở trạng thái `PROCESSING`, tạo link VNPay API 2.1.0 và ký bằng HMAC-SHA512 với `VNP_HASH_SECRET`. Link hết hạn sau 15 phút (`vnp_ExpireDate`).
2. **Nhận kết quả.** Qua Return URL (`GET /payments/vnpay/return`) và IPN (`GET /payments/vnpay/ipn`). Cả hai kiểm tra chữ ký và số tiền (`vnp_Amount / 100`) trước khi ghi nhận. IPN trả mã 97 khi sai chữ ký, mã 04 khi sai số tiền.
3. **Ghi nhận một lần.** Cả hai kênh cùng đi qua `applyResult()`: khóa dòng đơn, ghi nhận kết quả đúng một lần (đơn `PAID`, `Payment` `SUCCEEDED`, cộng điểm, tăng lượt dùng mã). Kết quả đã ghi nhận thì bị bỏ qua. Cơ chế idempotency và khóa dòng được mô tả ở ADR 005.
4. **Thất bại.** Khách huỷ hoặc thẻ lỗi: `Payment` `FAILED`, đơn `PAYMENT_FAILED`, không trừ tiền. Khách được thanh toán lại bằng khóa idempotency mới.
5. **Đối soát.** `POST /payments/:id/query` hỏi lại VNPay bằng `querydr` khi không nhận được IPN.
6. **Chạy local.** Local không nhận IPN, nên Return URL cũng ghi nhận kết quả sau khi kiểm chữ ký và số tiền.

## 4. Lý do lựa chọn (Rationale)

**Thứ nhất, đáp ứng yêu cầu của giảng viên.** Chỉ VNPay sandbox cho phép thử quy trình thanh toán qua cổng thật mà không phát sinh tiền thật.

**Thứ hai, sát thực tế.** Quy trình chuyển hướng, chữ ký, IPN và đối soát giống với thanh toán thực tế, giúp kiểm thử các tình huống như huỷ giao dịch, sai chữ ký, kết quả đến trùng.

**Thứ ba, an toàn.** Chữ ký HMAC-SHA512 và kiểm tra số tiền ngăn tham số bị sửa. Ghi nhận qua `applyResult()` idempotent ngăn cộng điểm hoặc đổi trạng thái đơn hai lần khi Return và IPN đến cùng lúc.

**Thứ tư, chọn phương án 2.4 thay vì chỉ một kênh.** Return URL một mình dễ mất kết quả khi khách đóng trình duyệt, IPN một mình không chạy được ở local. Dùng cả hai cùng đối soát khắc phục được cả hai điểm yếu, với cái giá là phải đảm bảo ghi nhận một lần.

**Thứ năm, giữ được thanh toán bằng điểm.** Phương thức này không đi qua cổng ngoài nên vẫn nằm trong một transaction nội bộ và không cần đối soát.

## 5. Hệ quả của quyết định (Consequences)

### 5.1. Ưu điểm

- Thanh toán gần với thực tế và có thể trình bày được các luồng thành công, thất bại, trùng kết quả.
- Có cơ chế chống giả mạo (chữ ký, số tiền) và chống ghi nhận trùng.
- Có đường đối soát (`querydr`) khi không nhận được IPN.

### 5.2. Hạn chế và rủi ro

- **Bảo mật khóa:** phải bảo vệ `VNP_HASH_SECRET` và `VNP_TMN_CODE`, không đưa vào mã nguồn hay kho lưu trữ công khai.
- **Phụ thuộc bên ngoài:** hệ thống phụ thuộc sandbox VNPay hoạt động ổn định và vào kết nối mạng.
- **Không nguyên tử với VNPay:** giao dịch nằm ngoài transaction nội bộ. Hệ thống dựa vào trạng thái `PROCESSING`, kiểm chữ ký và đối soát để xử lý.
- **Hạn chế khi chạy local:** không nhận IPN, kết quả dựa vào Return URL. Nếu khách đóng trình duyệt giữa chừng, phải đối soát thủ công bằng `querydr`.
- **Link hết hạn:** link thanh toán sống 15 phút; hết hạn phải tạo link mới với khóa idempotency mới.
- **Chi phí kiểm thử:** cần thêm test cho chữ ký, số tiền và tình huống trùng kết quả.

## 6. Tài liệu liên quan

- ADR 002, mục 3.3 (thanh toán VNPay trong kiến trúc modular monolith) và ADR 005 (idempotency và optimistic locking).
- Use case UC-06 (`docs/requirements/use-case-uc06-dat-va-thanh-toan.md`, `docs/diagrams/uc-02-dat-thanh-toan.png`).
- Sequence-01 (`docs/diagrams/sequence-checkout.png`).
- Mã nguồn: `brewlite/backend/src/payments/payments.service.ts`, `brewlite/backend/src/payments/vnpay/vnpay.gateway.ts`, `brewlite/backend/src/payments/vnpay/vnpay.util.ts`.
