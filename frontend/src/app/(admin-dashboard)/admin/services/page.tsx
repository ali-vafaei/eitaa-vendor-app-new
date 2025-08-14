import { Metadata } from "next";
import ServicesPageView from "pages-sections/vendor-dashboard/services/page-view";

export const metadata: Metadata = {
  title: "Services Management - Admin Dashboard",
  description: "مدیریت سرویس‌های فروشگاه",
};

export default function ServicesManagement() {
  return <ServicesPageView />;
}