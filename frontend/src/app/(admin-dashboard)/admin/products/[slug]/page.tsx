"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import ProductForm from "pages-sections/vendor-dashboard/products/product-form";
import PageWrapper from "pages-sections/vendor-dashboard/page-wrapper";

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // بارگذاری اطلاعات محصول
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productId = params.slug; // در واقع این ID است
        console.log('🔍 Fetching product with ID:', productId);

        const response = await fetch(`http://localhost:4000/api/products/${productId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `محصول یافت نشد (${response.status})`);
        }

        const productData = await response.json();
        console.log('📦 Product loaded:', productData);
        setProduct(productData);
      } catch (error) {
        console.error('❌ خطا در بارگذاری محصول:', error);
        enqueueSnackbar(error.message || 'خطا در بارگذاری محصول', { variant: 'error' });
        router.push('/admin/products');
      } finally {
        setLoading(false);
      }
    };

    if (params.slug) {
      fetchProduct();
    }
  }, [params.slug, router, enqueueSnackbar]);

  // ذخیره تغییرات محصول
  const handleSaveProduct = async (values: any) => {
    console.log('💾 Updating product with values:', values);
    console.log('📋 Current product:', product);

    try {
      // ✅ validation
      if (!values.name || !values.name.trim()) {
        throw new Error('نام محصول الزامی است');
      }
      if (!values.price || Number(values.price) <= 0) {
        throw new Error('قیمت باید بیشتر از صفر باشد');
      }
      if (values.stock === undefined || Number(values.stock) < 0) {
        throw new Error('موجودی نمی‌تواند منفی باشد');
      }

      // ✅ ایجاد slug بهتر
      const generateSlug = (name: string) => {
        const baseSlug = name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

        const timestamp = Date.now();
        return `${baseSlug || 'product'}-${timestamp}`;
      };

      const productData = {
        name: values.name.trim(),
        price: Number(values.price),
        stock: Number(values.stock),
        brand: values.brand || '',
       categories: Array.isArray(values.category) ? values.category : [], // ✅ اطمینان از array بودن
        slug: generateSlug(values.name),
        thumbnail: values.thumbnail || "https://via.placeholder.com/300.png?text=" + encodeURIComponent(values.name),
        published: product?.published ?? true, // حفظ وضعیت قبلی
      };

      console.log('📤 Sending update data:', productData);

      const productId = params.slug;
      const response = await fetch(`http://localhost:4000/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      console.log('📡 Response status:', response.status);
      const result = await response.json();
      console.log('📦 Server response:', result);

      if (!response.ok) {
        throw new Error(result.message || `خطای سرور: ${response.status}`);
      }

      enqueueSnackbar("محصول با موفقیت ویرایش شد!", { variant: "success" });

      // ✅ کمی تأخیر برای نمایش پیام
      setTimeout(() => {
        router.push("/admin/products");
      }, 1000);

    } catch (error: any) {
      console.error("❌ خطا در ویرایش محصول:", error);

      // ✅ پیام خطای بهتر
      let errorMessage = "خطا در ویرایش محصول";

      if (error.message.includes('fetch')) {
        errorMessage = "خطا در ارتباط با سرور";
      } else if (error.message.includes('slug')) {
        errorMessage = "مشکل در نام محصول";
      } else {
        errorMessage = error.message || "خطای نامشخص";
      }

      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  // لغو ویرایش
  const handleCancel = () => {
    const shouldCancel = window.confirm('آیا مطمئن هستید؟ تغییرات ذخیره نشده از بین می‌رود.');
    if (shouldCancel) {
      router.push("/admin/products");
    }
  };

  if (loading) {
    return (
      <PageWrapper title="در حال بارگذاری...">
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          fontSize: '1.1rem',
          color: '#666'
        }}>
          <div>در حال بارگذاری اطلاعات محصول...</div>
          <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            لطفاً صبر کنید
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!product) {
    return (
      <PageWrapper title="خطا">
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#d32f2f',
          fontSize: '1.1rem'
        }}>
          <div>❌ محصول یافت نشد</div>
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
            ممکن است محصول حذف شده یا ID آن اشتباه باشد
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={`ویرایش محصول: ${product.name}`}>
      <ProductForm
        productToEdit={product}
        onSave={handleSaveProduct}
        onCancel={handleCancel}
      />
    </PageWrapper>
  );
}