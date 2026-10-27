# Tài liệu BrewLite – Assignment 2

| Thư mục | Nội dung | Task |
|---|---|---|
| `requirements/` | Bối cảnh và phạm vi, SRS rút gọn, đặc tả UC-06 | Task 1 |
| `diagrams/` | Sơ đồ PlantUML: nguồn `.puml` và ảnh `.svg`, `.png` | Task 2, 3 |
| `architecture/` | Mô tả kiến trúc, ADR | Task 3 |
| `traceability-matrix.md` | Ma trận truy vết yêu cầu → thiết kế → code → test | |
| `deployment.md` | Triển khai, rollback | Task 5 |

## Ai phụ trách tệp nào

| Thành viên | Sơ đồ (`docs/diagrams/`) | Tài liệu khác |
|---|---|---|
| Nguyễn Tiến Đạt | `uc-01-tong-quat`, `class-domain` | `requirements/`, `traceability-matrix.md`, `architecture/adr/003-postgresql-prisma.md` |
| Phan Thành Đạt | `architecture-c4-container`, `architecture-layers`, `deployment-production`, `cicd-pipeline` | `architecture/architecture.md`, `architecture/adr/001-monorepo.md`, `deployment.md` |
| Trần Anh Trung | `sequence-dang-ky`, `sequence-dang-nhap` | `architecture/adr/002-modular-monolith-nestjs.md` |
| Đinh Văn Đạt | `uc-02-dat-thanh-toan`, `sequence-checkout` | `architecture/adr/004-vnpay-sandbox-payment.md` |
| Đỗ Chí Thanh | `act-01-dat-thanh-toan`, `sequence-theo-doi-don` | `architecture/adr/006-trien-khai-render-ghcr.md` |
| Lê Bảo Trọng Tấn | `state-don-hang`, `sequence-huy-don` | `architecture/adr/005-idempotency-va-optimistic-locking.md` |

Mọi thay đổi sơ đồ, yêu cầu hoặc kiến trúc đi qua pull request, ghi rõ lý do trong mô tả PR.
