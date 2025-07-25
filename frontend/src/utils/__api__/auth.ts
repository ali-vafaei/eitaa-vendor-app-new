import axios from "../axiosInstance";
import { useRouter } from "next/navigation";

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

// ورود کاربر
export const loginCustomer = async (data: LoginData) => {
  try {
    const response = await axios.post("/api/auth/customer/login", data);

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

// ثبت نام کاربر
export const registerCustomer = async (data: RegisterData) => {
  try {
    // تقسیم نام به firstName و lastName
    const nameParts = data.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    const response = await axios.post("/api/auth/customer/register", {
      email: data.email,
      password: data.password,
      firstName,
      lastName
    });

    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("userType", "customer");
    }

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "خطا در ثبت نام");
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

export default {
  loginCustomer,
  registerCustomer,
  loginVendor,
  logout,
  getCurrentUser,
  isAuthenticated
};