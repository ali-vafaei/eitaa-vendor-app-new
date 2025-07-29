// src/app/(layout-1)/market-1/page.tsx

// ۱. ایمپورت کردن "ماشین داده‌ساز" به جای API ساختگی قبلی
import { getPageData } from "utils/page-loader";
import Market1PageView from "pages-sections/market-1/page-view/market-1";

export default async function Market1() {
  // ۲. فراخوانی ماشین فقط با یک خط کد برای گرفتن تمام داده‌های لازم
  const { products, categories } = await getPageData("market-1");

  // ۳. ارسال داده‌های واقعی و پویا به کامپوننتی که ظاهر صفحه را نمایش می‌دهد
  return (
    <Market1PageView
      products={products}
      categories={categories}
      // نکته: سایر داده‌هایی که قبلاً از mock api می‌آمدند (مثل اسلایدر و بنرها)
      // را بعداً می‌توانیم به getPageData اضافه کنیم. فعلاً برای جلوگیری از خطا،
      // آنها را یا حذف کنید یا یک آرایه خالی به آنها پاس دهید.
      mainCarouselData={[]}
      flashDealsData={products.slice(0, 4)} // مثال: می‌توان از همان محصولات واقعی برای بخش‌های دیگر استفاده کرد
      newArrivalsData={products.slice(4, 8)}
      // ... سایر پراپ‌ها
    />
  );
}