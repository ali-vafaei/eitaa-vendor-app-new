"use client";

import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { ProductCreatePageView } from "pages-sections/vendor-dashboard/products/page-view";
import { useState } from "react"; // ✨ ایمپورت لازم برای مدیریت وضعیت آپلود

const ProductCreate = () => {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false); // ✨ state برای غیرفعال کردن دکمه حین آپلود

  // تابع ذخیره محصول با قابلیت آپلود واقعی فایل
  const handleSaveProduct = async (values: any) => {
    // ✨ جلوگیری از double submit
    if (isSubmitting) {
      console.log('🛑 Already submitting, ignoring duplicate call...');
      return;
    }

    console.log('💾 Starting product save process with values:', values);
    setIsSubmitting(true);

    try {
      let imageUrl = values.thumbnail; // آدرس URL وارد شده توسط کاربر در فیلد Image URL

      // ✨ مرحله ۱: اگر فایلی از فرم ارسال شده بود، آن را آپلود کن
      // حالا ما می‌دانیم که فایل‌ها در 'values.files' قرار دارند
      if (values.files && values.files.length > 0) {
        const fileToUpload = values.files[0]; // فعلا فقط اولین فایل را آپلود می‌کنیم
        console.log('🚀 Uploading new image file:', fileToUpload.name);

        const formData = new FormData();
        formData.append('image', fileToUpload);

        const uploadResponse = await fetch('http://localhost:4000/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadResult.error || uploadResult.message || 'خطا در آپلود عکس');
        }

        imageUrl = uploadResult.imageUrl; // ✨ تصحیح: از imageUrl استفاده کنیم بجای url
        console.log('✅ Image uploaded successfully:', imageUrl);
      }

      // اگر هیچ عکسی (نه URL و نه فایل) وجود نداشت، خطا بده
      if (!imageUrl) {
        throw new Error('لطفاً یک عکس برای محصول انتخاب یا آدرس آن را وارد کنید.');
      }

      // ✨ مرحله ۲: حالا اطلاعات کامل محصول را با آدرس عکس صحیح به سرور بفرست
      const productData = {
        name: values.name || values.title || '',
        price: Number(values.price) || 0,
        stock: Number(values.stock) || 0,
        brand: values.brand || '',
        categories: Array.isArray(values.category) ? values.category : (values.category ? [values.category] : []),
        slug: values.slug || generateUniqueSlug(values.name || values.title || 'product'),
        thumbnail: imageUrl,
        images: [imageUrl], // گالری عکس را با همان عکس اصلی پر می‌کنیم
        description: values.description || '', // ✨ اضافه کردن description
        sale_price: values.sale_price || 0, // ✨ اضافه کردن sale_price
        published: values.published !== false, // ✨ اضافه کردن published
      };

      console.log('📤 Sending product data to server:', productData);

      // ✅ validation شما دست‌نخورده باقی مانده است
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

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `خطای سرور: ${response.status}`);
      }

      console.log('✅ Product created successfully:', result);
      enqueueSnackbar("محصول جدید با موفقیت اضافه شد!", { variant: "success" });

      // کمی تاخیر برای نمایش پیام موفقیت
      setTimeout(() => {
        setIsSubmitting(false); // آزاد کردن state قبل از navigate
        router.push("/admin/products");
      }, 1500);

    } catch (error: any) {
      console.error("❌ خطا در ایجاد محصول:", error);
      enqueueSnackbar(error.message || "خطای نامشخص", { variant: "error" });
      setIsSubmitting(false); // آزاد کردن state در صورت خطا
    }
  };

  // ✅ تابع کمکی شما برای ایجاد slug دست‌نخورده باقی مانده است
  const generateUniqueSlug = (name: string): string => {
    if (!name || name.trim() === '') {
      return `product-${Date.now()}`;
    }
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    return `${baseSlug || 'product'}-${timestamp}-${randomNum}`;
  };

  // ✅ تابع لغو شما دست‌نخورده باقی مانده است
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
      isSubmitting={isSubmitting} // ✨ ارسال وضعیت آپلود به کامپوننت ویو
    />
  );
};

export default ProductCreate;