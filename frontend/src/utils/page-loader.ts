// src/utils/page-loader.ts

import { backendApi } from "utils/__api__/backend";
import { adaptProducts } from "utils/adapters/productAdapter";
import type { default as Category } from "models/Category.model";
import type { default as Product } from "models/Product.model";

// تعریف ساختار خروجی ماشین ما
interface PageData {
  products: Product[];
  categories: Category[];
}

/**
 * این تابع هوشمند (ماشین داده‌ساز) تمام کارهای زیر را انجام می‌دهد:
 * 1. گرفتن داده خام از بک‌اند.
 * 2. فیلتر کردن داده‌ها برای صفحه مورد نظر.
 * 3. ترجمه (adapt) کردن داده‌ها به فرمت فرانت‌اند.
 *
 * @param filterTag - یک تگ برای فیلتر کردن داده‌ها (مثلا "market-1").
 * @returns آبجکتی شامل محصولات و دسته‌بندی‌های آماده برای نمایش.
 */
export async function getPageData(filterTag: string): Promise<PageData> {
  try {
    // قدم الف: گرفتن تمام داده‌های خام با استفاده از رابط API
    const allProductsRaw = await backendApi.getProducts();
    const allCategoriesRaw = await backendApi.getCategories();

    // قدم ب: فیلتر کردن داده‌ها بر اساس تگ صفحه
    // فرض می‌کنیم هر محصول در بک‌اند یک فیلد 'tags' دارد
    const filteredProductsRaw = allProductsRaw.filter((p: any) =>
      p.tags?.includes(filterTag)
    );

    // فرض می‌کنیم هر دسته‌بندی در بک‌اند یک فیلد 'forDemo' دارد
    const filteredCategories = allCategoriesRaw.filter((c: any) =>
      c.forDemo === filterTag
    );

    // قدم ج: ترجمه کردن محصولات فیلتر شده با استفاده از مترجم
    const finalProducts = adaptProducts(filteredProductsRaw);

    // قدم د: برگرداندن داده‌های نهایی و آماده
    return {
      products: finalProducts,
      categories: filteredCategories,
    };
  } catch (error) {
    console.error(`[getPageData] Failed to load data for tag: ${filterTag}`, error);
    // در صورت بروز هرگونه خطا، داده خالی برمی‌گردانیم تا صفحه خراب نشود
    return {
      products: [],
      categories: [],
    };
  }
}