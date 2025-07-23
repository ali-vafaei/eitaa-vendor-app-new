// LOCAL CUSTOM COMPONENT
import ProductForm from "../product-form";
import PageWrapper from "../../page-wrapper";

// تعریف Props برای onSave
type Props = {
  onSave: (values: any) => Promise<void>;
};

// تغییر از named export به default export
export default function ProductCreatePageView({ onSave }: Props) {
  return (
    <PageWrapper title="Add New Product">
      {/* پراپ onSave را به ProductForm پاس می‌دهیم */}
      <ProductForm onSave={onSave} />
    </PageWrapper>
  );
}