// فایل: src/pages-sections/vendor-dashboard/products/page-view/product-create.tsx

// LOCAL CUSTOM COMPONENT
import ProductForm from "../product-form";
import PageWrapper from "../../page-wrapper";

// تعریف می‌کنیم که این کامپوننت یک پراپ به نام onSave دریافت می‌کند
type Props = {
  onSave: (values: any) => Promise<void>;
};

export function ProductCreatePageView({ onSave }: Props) {
  return (
    <PageWrapper title="Add New Product">
      {/* پراپ onSave دریافتی را مستقیماً به ProductForm می‌دهیم */}
      <ProductForm onSave={onSave} />
    </PageWrapper>
  );
}