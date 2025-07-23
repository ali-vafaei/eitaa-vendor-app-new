import axios from 'axios';

// Axios instance با baseURL بک‌اند واقعی
const axiosInstance = axios.create({
  baseURL: "http://localhost:4000",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

export default axiosInstance;