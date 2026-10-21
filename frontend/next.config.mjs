/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dự án chưa cài ESLint; kiểm tra kiểu TypeScript vẫn chạy khi build
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
