# ADR 002: QUYẾT ĐỊNH LỰA CHỌN KIẾN TRÚC MODULAR MONOLITH VỚI NESTJS

**Mã quyết định:** ADR 002
**Ngày quyết định:** 10/2026
**Trạng thái:** Đề xuất (Proposed). Chuyển sang "Đã chấp nhận" sau khi PR được merge.
**Lĩnh vực:** Kiến trúc phần mềm và thiết kế backend

## 1. Bối cảnh (Context)

Hệ thống cần xử lý nhiều nghiệp vụ có quan hệ chặt chẽ với nhau: xác thực người dùng, quản lý sản phẩm, xử lý đơn hàng, thanh toán, áp dụng khuyến mãi và quản lý điểm thưởng (loyalty).

Trong quá trình đặt hàng, hệ thống phải phối hợp nhiều thao tác: tạo đơn, trừ tồn kho, ghi nhận trạng thái thanh toán và cộng điểm thưởng. Các thao tác này cần nhất quán để tránh các tình huống sau:

- Đơn hàng được tạo nhưng tồn kho chưa được trừ, hoặc tồn kho bị trừ hai lần khi có nhiều yêu cầu cùng lúc.
- Điểm thưởng bị cộng nhiều lần khi cùng một thanh toán được xử lý lặp.
- Kết quả thanh toán VNPay đến trùng lặp qua hai kênh (Return và IPN) và làm sai trạng thái đơn.

Dự án do một nhóm nhỏ phát triển trong thời gian giới hạn. Kiến trúc backend cần đáp ứng các tiêu chí:

- Dễ triển khai, vận hành và bảo trì.
- Phân chia mã nguồn theo miền nghiệp vụ, với ranh giới được kiểm soát.
- Hỗ trợ transaction cơ sở dữ liệu cho các thao tác cần tính nguyên tử.
- Giảm độ phức tạp của giao tiếp giữa các thành phần.
- Có khả năng điều chỉnh kiến trúc khi hệ thống phát triển.

## 2. Các phương án được xem xét (Options Considered)

### 2.1. Monolithic truyền thống

Toàn bộ chức năng nằm trong một ứng dụng, không phân module rõ ràng. Cách này đơn giản khi triển khai nhưng mã nguồn khó quản lý khi nghiệp vụ tăng lên, vì ranh giới giữa các nghiệp vụ dễ bị phá vỡ.

### 2.2. Microservices

Hệ thống được chia thành nhiều dịch vụ độc lập. Cách này cho phép triển khai và mở rộng từng dịch vụ, nhưng làm tăng độ phức tạp của giao tiếp liên dịch vụ, giám sát, vận hành và quản lý nhất quán dữ liệu. Với nhóm nhỏ, chi phí này lớn hơn lợi ích hiện tại.

### 2.3. Modular Monolith

Hệ thống được triển khai thành một ứng dụng duy nhất, nhưng mã nguồn được tổ chức thành module theo miền nghiệp vụ. Các module giao tiếp với nhau qua giao diện được định nghĩa rõ ràng. Cách này giữ được sự đơn giản khi triển khai và tách bạch trách nhiệm.

## 3. Quyết định kiến trúc (Decision)

Nhóm quyết định xây dựng backend theo **Modular Monolith với NestJS**.

Mỗi module chịu trách nhiệm một miền nghiệp vụ và sở hữu dữ liệu của miền đó. Module khác chỉ truy cập dữ liệu này thông qua service công khai của module sở hữu.

| Module       | Trách nhiệm                                                                                     | Dữ liệu sở hữu (Prisma model)  |
| ------------ | ----------------------------------------------------------------------------------------------- | ------------------------------ |
| `auth`       | Xác thực, phân quyền, quản lý tài khoản người dùng.                                              | `User`                         |
| `loyalty`    | Quản lý điểm thưởng: tặng điểm chào mừng, cộng và trừ điểm, đổi quà. Ghi sổ mọi biến động điểm. (Kế hoạch: hiện logic điểm nằm ở `auth` và `payments`.) | `LoyaltyTransaction`           |
| `products`   | Quản lý sản phẩm, giá, tồn kho.                                                                  | `Product`, `Topping`           |
| `orders`     | Tiếp nhận đặt hàng, quản lý đơn hàng, máy trạng thái (state machine) của đơn.                   | `Order`, `OrderItem`           |
| `payments`   | Quản lý giao dịch thanh toán, tích hợp VNPay, đối soát, xử lý hoàn tiền.                         | `Payment`, `PaymentLog`        |
| `promotions` | Chương trình khuyến mãi và quy tắc áp dụng ưu đãi.                                              | `Voucher`                      |
| `prisma`     | Cung cấp Prisma Client và cấu hình kết nối cơ sở dữ liệu. Không chứa logic nghiệp vụ.            | —                              |

Thư mục `common/` chứa hạ tầng dùng chung không thuộc module nghiệp vụ, gồm `JwtAuthGuard`, decorator `CurrentUser` và tiện ích chung. Các thành phần này không chứa logic của một miền nghiệp vụ cụ thể.

### 3.1. Quy tắc giao tiếp giữa các module

1. Module chỉ import từ phần công khai của module khác: service, DTO hoặc hằng số được export có chủ đích.
2. Không import file nội bộ của module khác, ví dụ hàm trợ giúp đặt trong file service của module khác.
3. Các thao tác thay đổi trạng thái của một miền đi qua service của miền đó. Ví dụ, mọi thay đổi trạng thái đơn đi qua `OrdersService`.
4. Quy tắc 1–3 được kiểm tra trong CI bằng công cụ phân tích phụ thuộc (dependency-cruiser hoặc eslint-plugin-boundaries). Vi phạm làm CI thất bại.

### 3.2. Quản lý transaction và tính nhất quán

- **Tạo đơn và tồn kho:** Tạo đơn chạy trong một `$transaction` của Prisma. Việc trừ tồn kho dùng khóa lạc quan: đọc sản phẩm kèm cột `version`, rồi `updateMany` với điều kiện `version` không đổi và tăng `version` lên 1. Nếu `updateMany` không cập nhật dòng nào (có yêu cầu khác vừa trừ kho), giao dịch bị hủy và thử lại từ đầu, tối đa `MAX_ATTEMPTS` lần. Hết lượt thì trả 409 "vui lòng thử lại". Nếu kho không đủ, trả 409 ngay và không thử lại.
- **Ngoại lệ về ranh giới dữ liệu:** Việc trừ kho ghi vào bảng `Product`, do module `products` sở hữu, từ trong `orders`. Đây là ngoại lệ có chủ đích để trừ kho nằm trong cùng transaction với việc tạo đơn.
- **Trạng thái đơn:** Mọi thay đổi trạng thái đơn đi qua hàm chuyển trạng thái của `OrdersService`, dùng điều kiện `status = from` khi cập nhật để tránh ghi đè trạng thái.
- **Thanh toán bằng điểm:** Trừ điểm dùng điều kiện `loyaltyPoints >= số điểm cần` trong cùng transaction với việc ghi nhận thanh toán.

### 3.3. Thanh toán VNPay

VNPay nằm ngoài transaction cơ sở dữ liệu nội bộ. Quy trình như sau:

1. **Khởi tạo:** Ghi `Payment` với trạng thái `PROCESSING` và `idempotencyKey` có ràng buộc UNIQUE. Hai yêu cầu cùng lúc với cùng khóa chỉ tạo được một giao dịch.
2. **Nhận kết quả:** Qua Return (người dùng được chuyển hướng về) hoặc IPN (máy chủ VNPay gọi về). Cả hai đều xác minh chữ ký HMAC-SHA512 và số tiền trước khi ghi nhận.
3. **Ghi nhận:** Thực hiện trong một transaction, dùng điều kiện trạng thái để chỉ ghi một lần. Return và IPN đến cùng lúc vẫn cho kết quả đúng.
4. **Xử lý bất thường:** Nếu kết quả không rõ hoặc không khớp với trạng thái đơn, giao dịch chuyển sang `NEEDS_REFUND` hoặc được đối soát bằng truy vấn trạng thái giao dịch tới VNPay.

### 3.4. Điểm thưởng

- Điểm chỉ được ghi qua `LoyaltyService`. Các module khác không ghi trực tiếp vào `User.loyaltyPoints` hay `LoyaltyTransaction`. Đây là quy tắc đích. Hiện `payments` và `auth` vẫn ghi trực tiếp, xem mục 5.3.
- Mỗi biến động điểm tạo một bản ghi `LoyaltyTransaction` với `delta` và `reason`.
- Việc cộng điểm khi đơn chuyển sang `PAID` nằm trong cùng transaction với việc chuyển trạng thái đơn. Trước khi cộng, transaction khóa dòng đơn bằng `SELECT ... FOR UPDATE`, kiểm tra đơn còn ở trạng thái có thể thanh toán, và chỉ cộng khi đơn có điểm thưởng (đơn trả bằng điểm không được cộng).
- Kết quả VNPay đã ghi nhận thì không được xử lý lại. Nhờ vậy một đơn không bị cộng điểm hai lần, kể cả khi Return và IPN đến cùng lúc.

## 4. Lý do lựa chọn (Rationale)

**Thứ nhất, phù hợp với quy mô dự án.** Nhóm nhỏ và thời gian hạn chế. Một ứng dụng backend giảm chi phí triển khai, cấu hình và vận hành so với nhiều dịch vụ.

**Thứ hai, hỗ trợ tính nhất quán dữ liệu.** Các module dùng chung một cơ sở dữ liệu, nên các thao tác cần tính nguyên tử (tạo đơn và trừ tồn kho, trừ điểm và ghi nhận thanh toán) có thể gom vào một transaction.

**Thứ ba, tách bạch trách nhiệm.** Mỗi module sở hữu dữ liệu và quy tắc của miền mình, giúp kiểm thử, sửa lỗi và phát triển chức năng mới độc lập hơn.

**Thứ tư, phù hợp với NestJS và Prisma.** NestJS hỗ trợ tổ chức theo module. Prisma cung cấp transaction và điều kiện cập nhật có điều kiện, đủ để làm khóa lạc quan và chống ghi đè.

**Thứ năm, giữ đường đi cho tương lai.** Ranh giới module được xác định và kiểm tra tự động. Nếu một miền cần tách thành dịch vụ riêng, việc tách sẽ dễ hơn so với một khối mã không có ranh giới.

## 5. Hệ quả của quyết định (Consequences)

### 5.1. Ưu điểm

- **Đơn giản khi triển khai:** Backend là một ứng dụng, một đơn vị triển khai.
- **Nhất quán dữ liệu:** Các thao tác cùng transaction được thực hiện nguyên tử theo đảm bảo ACID của cơ sở dữ liệu.
- **Chi phí vận hành thấp:** Không cần triển khai và giám sát nhiều dịch vụ riêng.
- **Dễ kiểm thử:** Có test tích hợp cho hai rủi ro lớn là tranh chấp tồn kho và xử lý thanh toán VNPay.

### 5.2. Hạn chế

- **Không mở rộng độc lập từng module:** Mọi module chia sẻ một tiến trình và một tài nguyên triển khai.
- **Nguy cơ phụ thuộc chéo:** Nếu không kiểm soát, module có thể truy cập trực tiếp logic hoặc dữ liệu của nhau. Rủi ro này cần được theo dõi bằng kiểm tra tự động (mục 5.3).
- **Phạm vi ảnh hưởng của sự cố:** Lỗi nghiêm trọng hoặc quá tải ở một module ảnh hưởng toàn bộ ứng dụng.
- **Không bảo đảm nguyên tử với VNPay:** Giao dịch VNPay nằm ngoài transaction nội bộ. Hệ thống dựa vào trạng thái `PROCESSING`, xác minh chữ ký và đối soát để xử lý phần này.

### 5.3. Biện pháp kiểm soát

1. **Ranh giới module.** Thực hiện theo mục 3.1. Các điểm cần xử lý:
   - `payments` import `moveOrderStatus`, `TX_OPTIONS` và `OrderStatus` từ `orders`. Chuyển các hàm này thành method công khai của `OrdersService` hoặc một service chuyển trạng thái riêng.
   - `payments` import `pointsEarnedFor` và `pointsNeededFor` từ `promotions/voucher-rules`. Chuyển logic điểm vào `loyalty`.
   - `orders/dto` import `LEVELS` từ `orders/pricing`. Cần đảm bảo chỉ import phần công khai của module.
   - Các controller import `JwtAuthGuard` và `CurrentUser` từ `auth`. Chuyển vào `common/auth`.
2. **Kiểm tra tự động.** Cấu hình dependency-cruiser hoặc eslint-plugin-boundaries trong CI theo mục 3.1.
3. **Quản lý transaction.** Dùng `$transaction` cho mọi thao tác cần tính nguyên tử. Dùng khóa lạc quan (`version`) cho tồn kho và điều kiện trạng thái cho đơn và thanh toán.
4. **Bảo đảm an toàn VNPay.** Xác minh chữ ký HMAC-SHA512 và số tiền cho mọi kết quả. Dùng `idempotencyKey` UNIQUE khi khởi tạo. Ghi nhận kết quả theo cách idempotent. Xử lý trường hợp không khớp bằng `NEEDS_REFUND` và đối soát.
5. **Kiểm soát điểm thưởng.** Việc cộng điểm khi đơn chuyển sang `PAID` được bảo vệ bằng ba điều kiện: khóa dòng đơn, kiểm tra trạng thái trước khi cộng, và kiểm tra kết quả VNPay đã được ghi nhận hay chưa. Hiện `payments.service.ts` và `auth.service.ts` vẫn ghi trực tiếp vào `User.loyaltyPoints` và `LoyaltyTransaction`. Cần chuyển các thao tác này sang `LoyaltyService` theo biện pháp 1.
6. **Theo dõi khả năng mở rộng.** Đo hiệu năng và mức độ phụ thuộc giữa các module định kỳ. Chỉ xem xét tách dịch vụ khi có số liệu cho thấy nhu cầu thực tế.

## 6. Phạm vi áp dụng và định hướng tương lai

Quyết định này áp dụng cho kiến trúc backend trong giai đoạn phát triển hiện tại.

Nếu một miền nghiệp vụ cần mở rộng tài nguyên riêng, cần triển khai độc lập hoặc có yêu cầu vận hành khác biệt đáng kể, nhóm sẽ đánh giá lại kiến trúc. Việc chuyển sang microservices chỉ được xem xét khi lợi ích về khả năng mở rộng, tính độc lập triển khai và quy mô đội ngũ đủ bù chi phí vận hành.

## 7. Kết luận

Modular Monolith với NestJS phù hợp với quy mô nhóm, thời gian và yêu cầu nhất quán dữ liệu của dự án. Để quyết định này hiệu quả, ranh giới module cần được giữ bằng kiểm tra tự động, không chỉ bằng quy ước. Quyết định được xem xét lại khi số liệu cho thấy nhu cầu thực tế thay đổi.
