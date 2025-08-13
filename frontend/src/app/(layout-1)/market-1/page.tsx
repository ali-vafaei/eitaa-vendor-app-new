// src/app/(layout-1)/market-1/page.tsx

// ۱. ایمپورت کردن api مخصوص خود صفحه market-1 (روش صحیح)
import api from "utils/__api__/market-1";

// ۲. ایمپورت کردن کامپوننت اصلی که ظاهر صفحه را نمایش می‌دهد
import Market1PageView from "pages-sections/market-1/page-view/market-1";

export default async function Market1() {
  // ۳. گرفتن داده‌های هر بخش به صورت جداگانه، همانطور که قالب در ابتدا طراحی شده بود
  const mainCarouselData = await api.getMainCarousel();
  const flashDeals = await api.getFlashDeals();
  const topCategories = await api.getTopCategories();
  const topRatedBrands = await api.getTopRatedBrand();
  const newArrivals = await api.getNewArrivalList();
  const bigDiscounts = await api.getBigDiscountList();
  const topRatedProducts = await api.getTopRatedProduct();
  // ... و سایر داده‌هایی که کامپوننت Market1PageView نیاز دارد

  return (
    // ۴. ارسال تمام داده‌ها به کامپوننت اصلی نمایش
    <Market1PageView
      mainCarouselData={mainCarouselData}
      flashDealsData={flashDeals}
      topCategories={topCategories}
      topRatedBrands={topRatedBrands}
      newArrivalsData={newArrivals}
      bigDiscountList={bigDiscounts}
      topRatedProducts={topRatedProducts}
    />
  );
}