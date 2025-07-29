// src/utils/adapters/productAdapter.ts

// این همان مدل محصول در فرانت‌اند شماست. ما آن را وارد می‌کنیم
// تا مطمئن شویم خروجی مترجم ما با چیزی که قالب انتظار دارد، یکی است.
import type { default as FrontendProduct } from "models/Product.model";

/**
 * این تابع یک "مترجم" است. داده محصول خام را از بک‌اند شما می‌گیرد
 * و آن را به فرمت دقیقی که فرانت‌اند (قالب Bazar Pro) انتظار دارد، تبدیل می‌کند.
 *
 * @param backendProduct - شیء محصول خام از اندپوینت /api/products شما.
 * @returns یک شیء محصول که برای فرانت‌اند فرمت‌بندی شده است.
 */
export const adaptProduct = (backendProduct: any): FrontendProduct => {
  return {
    // --- فیلدهای اصلی و مورد نیاز فرانت‌اند ---
    id: String(backendProduct.id), // ❗️ مهم: آیدی عددی را به رشته تبدیل می‌کند
    title: backendProduct.name,     // از فیلد 'name' بک‌اند برای 'title' فرانت‌اند استفاده می‌کند
    slug: backendProduct.slug,
    price: Number(backendProduct.price) || 0,
    thumbnail: backendProduct.thumbnail || '/assets/images/products/placeholder.png', // در صورت نبود عکس، یک عکس پیش‌فرض نشان می‌دهد
    categories: backendProduct.categories || [],

    // --- سایر فیلدهای اختیاری ---
    images: backendProduct.images || (backendProduct.thumbnail ? [backendProduct.thumbnail] : []),
    discount: backendProduct.discount || 0,
    rating: backendProduct.rating || 0,
    brand: backendProduct.brand,
    size: backendProduct.size,
    colors: backendProduct.colors,
    status: backendProduct.status,
    published: backendProduct.published,
  };
};

/**
 * یک تابع کمکی برای ترجمه کردن آرایه‌ای از محصولات.
 * @param backendProducts - آرایه‌ای از محصولات خام از بک‌اند.
 * @returns آرایه‌ای از محصولات فرمت‌بندی شده برای فرانت‌اند.
 */
export const adaptProducts = (backendProducts: any[]): FrontendProduct[] => {
  if (!Array.isArray(backendProducts)) return [];
  return backendProducts.map(adaptProduct);
};