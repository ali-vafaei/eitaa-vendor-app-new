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
    ],
  },
};

module.exports = nextConfig;
