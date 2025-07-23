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
      const response = await fetch('http://localhost:4000/api/products', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name || values.title,
          price: Number(values.price),
          stock: Number(values.stock || 0),
          thumbnail: values.thumbnail || values.image || "https://via.placeholder.com/300",
          brand: values.brand || "Unknown",
          categories: Array.isArray(values.categories) ? values.categories : [values.category || "General"],
          slug: values.slug || (values.name || values.title)?.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "خطا در ذخیره محصول");
      }

      enqueueSnackbar("محصول جدید با موفقیت اضافه شد!", { variant: "success" });
      router.push("/admin/products");

    } catch (error: any) {
      console.error("❌ خطا در ارتباط با بک‌اند:", error);
      enqueueSnackbar(error.message || "خطا در ارتباط با سرور", { variant: "error" });
    }
  };

  return <ProductCreatePageView onSave={handleSaveProduct} />;
};

export default ProductCreate;