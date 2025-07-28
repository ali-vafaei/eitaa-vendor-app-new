/** @type {import('next').NextConfig} */
const nextConfig = {
  // این خط برای جلوگیری از رندر دوباره در حالت توسعه مفید است
  reactStrictMode: false,

  // ✨✨✨ بخش تنظیمات تصاویر - اصلاح شده ✨✨✨
  images: {
    remotePatterns: [
      // برای سرور محلی بک‌اند - همه مسیرها
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/**', // ✨ همه مسیرها: /uploads/**, /assets/**, etc
      },
      // برای عکس‌های موقت و جایگزین (placeholder)
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
      // یک سرویس ابری رایج برای عکس
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
    // ✨ برای سازگاری بیشتر
    domains: ['localhost'],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = nextConfig;