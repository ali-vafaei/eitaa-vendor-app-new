// فایل: src/app/(admin-dashboard)/admin/products/[slug]/page.tsx

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
        // 🔥 استفاده از ID برای fetch کردن
        const productId = params.slug; // در واقع این ID است
        const response = await fetch(`http://localhost:4000/api/products/${productId}`);

        if (!response.ok) {
          throw new Error('محصول یافت نشد');
        }
        const productData = await response.json();
        console.log('📦 Product loaded:', productData); // برای debug
        setProduct(productData);
      } catch (error) {
        console.error('خطا در بارگذاری محصول:', error);
        enqueueSnackbar('خطا در بارگذاری محصول', { variant: 'error' });
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
    try {
      // 🔥 ایجاد slug جدید با timestamp برای جلوگیری از تکرار
      const timestamp = Date.now();
      const baseSlug = values.name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // حذف کاراکترهای خاص
        .replace(/\s+/g, '-') // جایگزینی فاصله با -
        .trim();
      const uniqueSlug = `${baseSlug}-${timestamp}`;

      const productId = params.slug; // ID محصول
      const response = await fetch(`http://localhost:4000/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          price: Number(values.price),
          stock: Number(values.stock),
          brand: values.brand || '',
          categories: values.category || '',
          slug: uniqueSlug, // 🔥 slug یکتا
          thumbnail: values.thumbnail || "https://via.placeholder.com/300.png?text=" + encodeURIComponent(values.name),
          published: product?.published ?? true, // حفظ وضعیت قبلی
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "خطا در ویرایش محصول");
      }

      enqueueSnackbar("محصول با موفقیت ویرایش شد!", { variant: "success" });
      router.push("/admin/products");

    } catch (error: any) {
      console.error("خطا در ویرایش محصول:", error);
      enqueueSnackbar(error.message, { variant: "error" });
    }
  };

  // لغو ویرایش
  const handleCancel = () => {
    router.push("/admin/products");
  };

  if (loading) {
    return (
      <PageWrapper title="در حال بارگذاری...">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          در حال بارگذاری اطلاعات محصول...
        </div>
      </PageWrapper>
    );
  }

  if (!product) {
    return (
      <PageWrapper title="خطا">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
          محصول یافت نشد
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