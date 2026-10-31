# ADR 006: Triển khai trên Render, image trên GHCR

- Trạng thái: Đã chấp nhận
- Ngày: 2026-10

## Bối cảnh

Cần URL production HTTPS, CSDL bền vững không public, chi phí thấp, có health check và rollback.

## Quyết định

GitHub Actions build image tag commit SHA, push GitHub Container Registry, gọi deploy hook Render; Render chạy web và API dạng Docker, PostgreSQL managed qua mạng nội bộ.

## Hệ quả

HTTPS tự động, zero-downtime theo health check, rollback bằng SHA cũ. Gói miễn phí ngủ khi rảnh, CSDL miễn phí có hạn dùng.
