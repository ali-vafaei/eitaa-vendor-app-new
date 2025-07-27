import { Metadata } from "next";
import { notFound } from "next/navigation";
// PAGE VIEW COMPONENT
import { ProductDetailsPageView } from "pages-sections/product-details/page-view";
// API FUNCTIONS
import api from "utils/__api__/products";
// import { getFrequentlyBought, getRelatedProducts } from "utils/__api__/related-products";

export const metadata: Metadata = {
  title: "Product Details - Bazaar Next.js E-commerce Template",
  description: `Bazaar is a React Next.js E-commerce template. Build SEO friendly Online store, delivery app and Multi vendor store`,
  authors: [{ name: "UI-LIB", url: "https://ui-lib.com" }],
  keywords: ["e-commerce", "e-commerce template", "next.js", "react"]
};

export default async function ProductDetails({ params }) {
  // --- شروع لاگ‌های عیب‌یابی ---
  console.log("\n--- [صفحه فرانت‌اند] شروع رندر صفحه جزئیات محصول ---");
  console.log("[صفحه فرانت‌اند] پارامترهای دریافت شده:", params);

  if (!params || typeof params.slug !== 'string') {
    console.error("[صفحه فرانت‌اند] خطا: Slug وجود ندارد یا از نوع رشته نیست.");
    notFound();
  }

  const slug = params.slug as string;
  console.log(`[صفحه فرانت‌اند] تلاش برای دریافت محصول با slug: "${slug}"`);
  // --- پایان لاگ‌های عیب‌یابی ---

  try {
    const product = await api.getProduct(slug);
    console.log("[صفحه فرانت‌اند] موفقیت: اطلاعات محصول با موفقیت دریافت شد.");

    // برای سادگی، فعلا از آرایه‌های خالی استفاده می‌کنیم
    const relatedProducts = [];
    const frequentlyBought = [];

    return (
      <ProductDetailsPageView
        product={product}
        relatedProducts={relatedProducts}
        frequentlyBought={frequentlyBought}
      />
    );
  } catch (error) {
    // --- لاگ‌های عیب‌یابی در صورت بروز خطا ---
    console.error("\n‼️ --- [صفحه فرانت‌اند] بلوک CATCH اجرا شد --- ‼️");
    console.error("[صفحه فرانت‌اند] فراخوانی 'api.getProduct' با شکست مواجه شد. آبجکت کامل خطا:", error);
    console.error("-------------------------------------------------");
    // --- پایان لاگ‌های عیب‌یابی ---
    notFound();
  }
}
