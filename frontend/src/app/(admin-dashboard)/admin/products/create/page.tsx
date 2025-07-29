"use client";

import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { ProductCreatePageView } from "pages-sections/vendor-dashboard/products/page-view";
import { useState } from "react";

const ProductCreate = () => {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // تابع ذخیره محصول - فقط داده‌های آماده شده از product-form.tsx را دریافت می‌کند
  const handleSaveProduct = async (productData: any) => {
    // ✨ جلوگیری از double submit
    if (isSubmitting) {
      console.log('🛑 Already submitting, ignoring duplicate call...');
      return;
    }

    console.log('💾 Starting product save process with data:', {
      name: productData.name,
      slug: productData.slug,
      images: productData.images,
      thumbnail: productData.thumbnail,
      totalImages: productData.images ? productData.images.length : 0
    });

    setIsSubmitting(true);

    try {
      // ✅ validation
      if (!productData.name || !productData.name.trim()) {
        throw new Error('نام محصول الزامی است');
      }
      if (!productData.price || productData.price <= 0) {
        throw new Error('قیمت محصول باید بیشتر از صفر باشد');
      }
      if (!productData.stock || productData.stock < 0) {
        throw new Error('موجودی نمی‌تواند منفی باشد');
      }

      console.log('📤 Sending product data to server:', productData);

      const response = await fetch('http://localhost:4000/api/products', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      console.log('📡 Response status:', response.status);
      const result = await response.json();
      console.log('📡 Response data:', result);

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('نام محصول تکراری است. لطفاً نام دیگری انتخاب کنید یا صبر کنید و دوباره تلاش کنید.');
        }
        throw new Error(result.message || `خطای سرور: ${response.status}`);
      }

      console.log('✅ Product created successfully:', result);
      enqueueSnackbar("محصول جدید با موفقیت اضافه شد!", { variant: "success" });

      // کمی تاخیر برای نمایش پیام موفقیت
      setTimeout(() => {
        router.push("/admin/products");
      }, 1500);

    } catch (error: any) {
      console.error("❌ خطا در ایجاد محصول:", error);
      enqueueSnackbar(error.message || "خطای نامشخص", { variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // تابع لغو
  const handleCancel = () => {
    if (isSubmitting) {
      enqueueSnackbar("لطفاً تا پایان فرآیند آپلود صبر کنید...", { variant: "warning" });
      return;
    }

    const shouldCancel = window.confirm('آیا مطمئن هستید؟ تغییرات ذخیره نشده از بین می‌رود.');
    if (shouldCancel) {
      router.push("/admin/products");
    }
  };

  return (
    <ProductCreatePageView
      onSave={handleSaveProduct}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
    />
  );
};

export default ProductCreate;