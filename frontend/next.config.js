/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // ✨✨✨ راه حل اصلی اینجاست ✨✨✨
  // ما به Next.js می‌گوییم که اجازه دارد از دامنه‌های زیر عکس بارگذاری کند.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com', // این دامنه معمولا برای آپلود عکس استفاده می‌شود
      },
      // ✨ اضافه شد برای سرور محلی backend
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
      // ✨ اضافه شد برای IP محلی (در صورت نیاز)
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '4000',
        pathname: '/uploads/**',
      },
    ],
  },
};

module.exports = nextConfig;