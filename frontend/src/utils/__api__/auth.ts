import axios from "../axiosInstance";

// ==========================================================
//               بخش اینترفیس‌ها (Interfaces)
// ==========================================================

interface LoginData {
  email: string;
  password: string;
}

interface RegisterCustomerData {
  email: string;
  password: string;
  first_name: string;
}

// اینترفیس برای داده‌های ثبت‌نام فروشنده
interface RegisterSellerData {
  email: string;
  password: string;
}

// ==========================================================
//                بخش توابع API (Functions)
// ==========================================================

// ورود مشتری
export const loginCustomer = async (data: LoginData) => {
  try {
    const response = await axios.post("/api/auth/login/customer", data);

    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("userType", "customer");
    }

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "خطا در ورود");
  }
};

// ثبت نام مشتری
export const registerCustomer = async (data: RegisterCustomerData) => {
  try {
    const response = await axios.post("/api/auth/register/customer", data);

    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("userType", "customer");
    }

    return response.data;
  } catch (error: any) {
    console.error("Error details from registerCustomer:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "خطا در ثبت نام. لطفاً دوباره تلاش کنید.");
  }
};

// ✅ تابع ثبت نام فروشنده که تعریف نشده بود، اضافه شد
export const registerSeller = async (data: RegisterSellerData) => {
  try {
    const response = await axios.post("/api/auth/register/seller", data);
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("userType", "seller");
    }
    return response.data;
  } catch (error: any) {
    console.error("Seller Register API Error:", error.response?.data);
    throw new Error(error.response?.data?.message || "خطا در ثبت نام فروشنده");
  }
};

// ورود فروشنده
export const loginVendor = async (data: LoginData) => {
  try {
    const response = await axios.post("/api/auth/login", data);

    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("userType", "vendor");
    }

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "خطا در ورود");
  }
};

// خروج
export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userType");
    window.location.href = "/login";
  }
};

// دریافت کاربر فعلی
export const getCurrentUser = () => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      return JSON.parse(userStr);
    }
  }
  return null;
};

// بررسی احراز هویت
export const isAuthenticated = () => {
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem("token");
  }
  return false;
};

// ==========================================================
//                بخش خروجی (Export Default)
// ==========================================================

export default {
  loginCustomer,
  registerCustomer,
  registerSeller, // حالا این تابع وجود دارد و خطا نمی‌دهد
  loginVendor,
  logout,
  getCurrentUser,
  isAuthenticated
};