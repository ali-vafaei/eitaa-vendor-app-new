// آدرس اصلی بک‌اند شما. بهتر است این آدرس در فایل .env.local تعریف شود.
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// یک شیء برای نگهداری تمام توابع مربوط به API
export const backendApi = {
  /**
   * این تابع تمام محصولات را از سرور می‌گیرد
   */
  getProducts: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/products`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch products:", error);
      // در صورت خطا، یک آرایه خالی برمی‌گردانیم تا برنامه کرش نکند
      return [];
    }
  },

  /**
   * این تابع تمام دسته‌بندی‌ها را از سرور می‌گیرد
   */
  getCategories: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/categories`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      return [];
    }
  },

  // در آینده توابع دیگر مثل getOrders, getBrands و ... به اینجا اضافه می‌شوند
};