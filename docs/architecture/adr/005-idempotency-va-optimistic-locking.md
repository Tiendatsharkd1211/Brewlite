# ADR 005: Idempotency và optimistic locking

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10

## Bối cảnh

Mạng chập chờn khiến client gửi lại yêu cầu; nhiều khách đặt cùng món còn ít.

## Quyết định

Thanh toán: header `Idempotency-Key`, cột UNIQUE, khoá dòng đơn khi ghi nhận. Tồn kho: cột `version`, `UPDATE … WHERE version = ?`, thử lại tối đa 8 lần có lùi ngẫu nhiên.

## Hệ quả

Không trừ tiền 2 lần, không bán vượt kho mà không khoá cả bảng. Có integration test đồng thời chứng minh.
