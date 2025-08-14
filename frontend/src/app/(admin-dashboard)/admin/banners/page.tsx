import { Metadata } from "next";
import BannersPageView from "pages-sections/vendor-dashboard/banners/page-view";

export const metadata: Metadata = {
  title: "Banner Management - Admin Dashboard",
  description: "مدیریت بنرهای صفحه اصلی فروشگاه",
};

export default function BannersManagement() {
  return <BannersPageView />;
}