import axios from "../axiosInstance";

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

// ورود کاربر
export const login = async (data: LoginData) => {
  const response = await axios.post("/api/auth/customer/login", data);

  // ذخیره توکن در localStorage
  if (response.data.token) {
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
  }

  return response.data;
};

// ثبت نام کاربر
export const register = async (data: RegisterData) => {
  const response = await axios.post("/api/auth/customer/register", data);

  // ذخیره توکن در localStorage
  if (response.data.token) {
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
  }

  return response.data;
};

// خروج کاربر
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
};

// دریافت اطلاعات کاربر فعلی
export const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    return JSON.parse(userStr);
  }
  return null;
};

// بررسی لاگین بودن
export const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};

export default {
  login,
  register,
  logout,
  getCurrentUser,
  isAuthenticated
};