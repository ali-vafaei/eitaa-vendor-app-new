"use client";

import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { ProductCreatePageView } from "pages-sections/vendor-dashboard/products/page-view";

const ProductCreate = () => {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  // تابع ذخیره محصول با کد کامل و درست
  const handleSaveProduct = async (values: any) => {
    console.log('💾 Saving product with values:', values);

    try {
      // ✅ آماده‌سازی داده‌ها با validation کامل
      const productData = {
        name: values.name || values.title || '',
        price: Number(values.price) || 0,
        stock: Number(values.stock) || 0,
        thumbnail: values.thumbnail || values.image || "https://via.placeholder.com/300.png?text=" + encodeURIComponent(values.name || 'Product'),
        brand: values.brand || '',
        // 🔥 تبدیل category به array برای سازگاری با بک‌اند
        categories: Array.isArray(values.category) ? values.category : (values.category ? [values.category] : []),
        slug: values.slug || generateUniqueSlug(values.name || values.title || 'product')
      };

      console.log('📤 Sending to server:', productData);

      // ✅ validation قبل از ارسال
      if (!productData.name.trim()) {
        throw new Error('نام محصول الزامی است');
      }
      if (productData.price <= 0) {
        throw new Error('قیمت محصول باید بیشتر از صفر باشد');
      }
      if (productData.stock < 0) {
        throw new Error('موجودی نمی‌تواند منفی باشد');
      }

      const response = await fetch('http://localhost:4000/api/products', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      console.log('📡 Response status:', response.status);

      const result = await response.json();
      console.log('📦 Server response:', result);

      if (!response.ok) {
        throw new Error(result.message || `خطای سرور: ${response.status}`);
      }

      enqueueSnackbar("محصول جدید با موفقیت اضافه شد!", { variant: "success" });

      // ✅ کمی تأخیر برای نمایش پیام موفقیت
      setTimeout(() => {
        router.push("/admin/products");
      }, 1000);

    } catch (error: any) {
      console.error("❌ خطا در ایجاد محصول:", error);

      // ✅ نمایش خطای دقیق‌تر
      let errorMessage = "خطا در ایجاد محصول";

      if (error.message.includes('fetch')) {
        errorMessage = "خطا در ارتباط با سرور - لطفاً اتصال اینترنت را بررسی کنید";
      } else if (error.message.includes('slug')) {
        errorMessage = "نام محصول تکراری است - لطفاً نام دیگری انتخاب کنید";
      } else {
        errorMessage = error.message || "خطای نامشخص";
      }

      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  // ✅ تابع کمکی برای ایجاد slug یکتا
  const generateUniqueSlug = (name: string): string => {
    if (!name || name.trim() === '') {
      return `product-${Date.now()}`;
    }

    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // حذف کاراکترهای خاص
      .replace(/\s+/g, '-') // جایگزینی فاصله با -
      .replace(/-+/g, '-') // حذف - های متوالی
      .replace(/^-|-$/g, ''); // حذف - از ابتدا و انتها

    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);

    return `${baseSlug || 'product'}-${timestamp}-${randomNum}`;
  };

  // ✅ تابع لغو
  const handleCancel = () => {
    // ✅ تأیید لغو اگر اطلاعاتی وارد شده
    const shouldCancel = window.confirm('آیا مطمئن هستید؟ تغییرات ذخیره نشده از بین می‌رود.');
    if (shouldCancel) {
      router.push("/admin/products");
    }
  };

  return (
    <ProductCreatePageView
      onSave={handleSaveProduct}
      onCancel={handleCancel}
    />
  );
};

export default ProductCreate;