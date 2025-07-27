// LOCAL CUSTOM COMPONENT
import ProductForm from "../product-form";
import PageWrapper from "../../page-wrapper";

// ✨ تعریف Props که با ProductForm سازگار باشد
type Props = {
  onSave: (values: any) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
};

// تغییر از named export به default export
export default function ProductCreatePageView({ onSave, onCancel, isSubmitting }: Props) {
  // ✨ تابع پیش‌فرض برای cancel
  const handleCancel = onCancel || (() => {
    console.log('Cancel clicked');
    // می‌توانید اینجا منطق پیش‌فرض بگذارید، مثل برگشت به صفحه قبل
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  });

  return (
    <PageWrapper title="Add New Product">
      {/* ✨ ارسال تمام props مورد نیاز ProductForm */}
      <ProductForm
        onSave={onSave}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        productToEdit={undefined} // چون در حال ایجاد محصول جدید هستیم
      />
    </PageWrapper>
  );
}