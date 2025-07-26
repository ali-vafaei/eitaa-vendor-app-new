import { cache } from "react";
// ما دیگه به axios برای این تابع خاص نیاز نداریم و مستقیم از fetch استفاده می‌کنیم
// CUSTOM DATA MODEL
import Product from "models/Product.model";
import { SlugParams } from "models/Common";

// ====================================================================================
//                             ✨ کد اصلاح شده اینجاست ✨
// ====================================================================================

// get product based on slug
const getProduct = cache(async (slug: string): Promise<Product> => {
  console.log(`Fetching product with slug: ${slug} from REAL backend...`);

  // درخواست مستقیم به API بک‌اند شما که روی پورت 4000 اجراست
  const response = await fetch(`http://localhost:4000/api/products/${slug}`, {
    // این خط باعث میشه Next.js نتیجه رو کش نکنه و همیشه اطلاعات تازه رو بگیره
    // برای حالت پروداکشن می‌تونی این خط رو مدیریت کنی
    cache: "no-store",
  });

  // اگر محصول پیدا نشد یا خطایی رخ داد، ارور برمی‌گردونیم
  if (!response.ok) {
    // این ارور توسط بلوک try...catch در صفحه شما گرفته می‌شود و صفحه 404 نمایش داده می‌شود
    throw new Error("Failed to fetch product from backend");
  }

  const productData = await response.json();
  return productData;
});


// ====================================================================================
//             توابع دیگر فعلاً می‌توانند به شکل قبل باقی بمانند
// ====================================================================================

// get all product slug
// این تابع فعلا به سرور نمایشی اشاره می‌کند، بعدا می‌توانید آن را هم اصلاح کنید
const getSlugs = cache(async (): Promise<SlugParams[]> => {
  // فرض می‌کنیم سرور نمایشی هنوز برای این کار استفاده می‌شود
  // const response = await axios.get("/api/products/slug-list");
  // return response.data;

  // فعلا یک آرایه خالی برمی‌گردانیم تا خطا ندهد
  return [];
});

// search products
// این تابع فعلا به سرور نمایشی اشاره می‌کند، بعدا می‌توانید آن را هم اصلاح کنید
const searchProducts = cache(async (name?: string, category?: string): Promise<Product[]> => {
  // فعلا یک آرایه خالی برمی‌گردانیم تا خطا ندهد
  return [];
});


export default { getSlugs, getProduct, searchProducts };