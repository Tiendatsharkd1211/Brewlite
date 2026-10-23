# ---------- build ----------
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npm run build

# ---------- run ----------
FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
EXPOSE 3001
# Tạo/cập nhật bảng theo schema.prisma, nạp dữ liệu mẫu (chỉ thêm cái còn thiếu), rồi chạy API
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/seed.js && node dist/main"]
