// فایل: src/app/(admin-dashboard)/admin/products/create/page.tsx

"use client"; // برای فعال کردن منطق سمت کلاینت

import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { ProductCreatePageView } from "pages-sections/vendor-dashboard/products/page-view";

const ProductCreate = () => {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  // این تابع مسئول ارسال اطلاعات فرم به بک‌اند شماست
  const handleSaveProduct = async (values: any) => {
    // !!! مهم: آدرس IP مک‌بوک خود را اینجا وارد کنید
    const YOUR_MAC_IP = "192.168.1.5";
    const BACKEND_URL = `http://${YOUR_MAC_IP}:4000/api/products`;

    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          price: Number(values.price),
          stock: Number(values.stock),
          image_url: values.image_url || "https://via.placeholder.com/300",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "خطا در ذخیره محصول در بک‌اند");
      }

      enqueueSnackbar("محصول جدید با موفقیت اضافه شد!", { variant: "success" });
      router.push("/admin/products");

    } catch (error: any) {
      console.error("خطا در ارتباط با بک‌اند:", error);
      enqueueSnackbar(error.message, { variant: "error" });
    }
  };

  // تابع handleSaveProduct را به عنوان پراپ onSave به کامپوننت ویو پاس می‌دهیم
  return <ProductCreatePageView onSave={handleSaveProduct} />;
};

export default ProductCreate;