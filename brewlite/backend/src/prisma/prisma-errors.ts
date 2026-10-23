import { Prisma } from '@prisma/client';

/** Lỗi vi phạm ràng buộc UNIQUE (mã P2002 của Prisma) */
export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}
