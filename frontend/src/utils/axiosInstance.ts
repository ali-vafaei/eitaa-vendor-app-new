import axios from 'axios';

// Axios instance
const axiosInstance = axios.create({
    baseURL: "http://localhost:4000",
    headers: {
        'Content-Type': 'application/json'
    }
});

// interceptor برای توکن JWT - فقط در سمت کلاینت
axiosInstance.interceptors.request.use(
  (config) => {
    // بررسی اینکه در محیط مرورگر هستیم
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;