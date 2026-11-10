# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Địa chỉ API mà TRÌNH DUYỆT gọi tới (máy người dùng), nên là localhost chứ không phải tên service
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# 1 = hiện gợi ý trình bày (tài khoản mẫu, thẻ thử VNPay); để trống thì khách không thấy
ARG NEXT_PUBLIC_SHOW_DEMO_HINTS=
ENV NEXT_PUBLIC_SHOW_DEMO_HINTS=$NEXT_PUBLIC_SHOW_DEMO_HINTS
RUN npm run build

# ---------- run ----------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/next.config.mjs ./
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
