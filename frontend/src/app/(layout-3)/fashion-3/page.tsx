import { Metadata } from "next";

// ۱. ایمپورت کردن api مخصوص صفحه
import api from "utils/__api__/fashion-3";

// ۲. ایمپورت کردن کامپوننت ظاهری صفحه
import FashionThreePageView from "pages-sections/fashion-3/page-view";

// بخش metadata شما دست نخورده باقی می‌ماند
export const metadata: Metadata = {
  title: "Fashion 3 - Bazaar Next.js E-commerce Template",
  description: `Bazaar is a React Next.js E-commerce template. Build SEO friendly Online store, delivery app and Multi vendor store`,
  authors: [{ name: "UI-LIB", url: "https://ui-lib.com" }],
  keywords: ["e-commerce", "e-commerce template", "next.js", "react"]
};

// ۳. تابع اصلی صفحه را به یک تابع async تبدیل می‌کنیم
export default async function FashionShopThree() {
  // ۴. تمام داده‌های لازم را از بک‌اند فراخوانی می‌کنیم
  const blogs = await api.getBlogs();
  const brands = await api.getBrands();
  const services = await api.getServices();
  const products = await api.getProducts();
  const bestProducts = await api.getBestProducts();
  const mainCarouselData = await api.getMainCarouselData();

  // ۵. داده‌های واقعی را به عنوان props به کامپوننت ظاهری پاس می‌دهیم
  return (
    <FashionThreePageView
      blogs={blogs}
      brands={brands}
      services={services}
      products={products}
      bestProducts={bestProducts}
      mainCarouselData={mainCarouselData}
    />
  );
}