import { Metadata } from "next";
import CarouselPageView from "pages-sections/vendor-dashboard/carousel/page-view";

export const metadata: Metadata = {
  title: "Carousel Management - Admin Dashboard",
  description: "مدیریت اسلایدهای صفحه اصلی فروشگاه",
};

export default function CarouselManagement() {
  return <CarouselPageView />;
}