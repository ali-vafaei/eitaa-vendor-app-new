"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSnackbar } from "notistack";
// LOCAL CUSTOM COMPONENT
import ProductForm from "../product-form";
import PageWrapper from "../../page-wrapper";

export default function EditProductPageView() {
  const [productToEdit, setProductToEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const slug = params.slug as string;
        console.log('🔍 Fetching product with slug:', slug);

        const response = await fetch(`http://localhost:4000/api/products/${slug}`);
        if (!response.ok) {
          throw new Error('محصول پیدا نشد');
        }

        const product = await response.json();
        console.log('📦 Product loaded for edit:', product);
        
        setProductToEdit(product);
      } catch (error: any) {
        console.error('❌ Error fetching product:', error);
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

  const handleSave = async (updatedProduct: any) => {
    try {
      console.log('💾 Product saved:', updatedProduct);
      enqueueSnackbar('محصول با موفقیت به‌روزرسانی شد!', { variant: 'success' });
      router.push('/admin/products');
    } catch (error: any) {
      console.error('❌ Error in handleSave:', error);
      enqueueSnackbar('خطا در ذخیره تغییرات', { variant: 'error' });
    }
  };

  const handleCancel = () => {
    router.push('/admin/products');
  };

  if (loading) {
    return (
      <PageWrapper title="Edit Product">
        <div>در حال بارگذاری...</div>
      </PageWrapper>
    );
  }

  if (!productToEdit) {
    return (
      <PageWrapper title="Edit Product">
        <div>محصول پیدا نشد!</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Edit Product">
      <ProductForm 
        productToEdit={productToEdit}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </PageWrapper>
  );
}