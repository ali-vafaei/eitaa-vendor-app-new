import { Metadata } from "next";
import api from "utils/__api__/gift-shop";
import GiftShopPageView from "pages-sections/gift-shop/page-view";

export const metadata: Metadata = {
  title: "Gift Shop - Bazaar Next.js E-commerce Template",
  description: `Bazaar is a React Next.js E-commerce template. Build SEO friendly Online store, delivery app and Multi vendor store`,
  authors: [{ name: "UI-LIB", url: "https://ui-lib.com" }],
  keywords: ["e-commerce", "e-commerce template", "next.js", "react"]
};

export default async function GiftShop() {
  // فراخوانی تمام داده‌های لازم برای صفحه
  const allProducts = await api.getAllProducts();
  const serviceList = await api.getServiceList();
  const topCategories = await api.getTopCategories();
  const popularProducts = await api.getPopularProducts();
  const mainCarouselData = await api.getMainCarouselData();
  const topSailedProducts = await api.getTopSailedProducts();
  const categoryNavigation = await api.getCategoryNavigation();

  return (
    <GiftShopPageView
      allProducts={allProducts}
      serviceList={serviceList}
      topCategories={topCategories}
      popularProducts={popularProducts}
      mainCarouselData={mainCarouselData}
      topSailedProducts={topSailedProducts}
      categoryNavigation={categoryNavigation}
    />
  );
}