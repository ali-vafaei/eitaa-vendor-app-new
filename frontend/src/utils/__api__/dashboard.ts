import { cache } from "react";
import axios from "../../utils/axiosInstance";
import Brand from "models/Brand.model";
import Order from "models/Order.model";
import Review from "models/Review.model";
import Product from "models/Product.model";
import Category from "models/Category.model";

// dashboard - فعلاً mock می‌مانند
const getAllCard = cache(async () => {
  // اینجا می‌توانید API واقعی بنویسید
  return [];
});

const recentPurchase = cache(async () => {
  return [];
});

const stockOutProducts = cache(async () => {
  return [];
});

// products - متصل به بک‌اند واقعی
const products = cache(async (): Promise<Product[]> => {
  const response = await axios.get("/api/products");
  return response.data;
});

const category = cache(async (): Promise<Category[]> => {
  const response = await axios.get("http://localhost:4000/api/categories");
  return response.data;
});

const brands = cache(async (): Promise<Brand[]> => {
  // فعلاً خالی - می‌توانید بعداً API برند اضافه کنید
  return [];
});

const reviews = cache(async (): Promise<Review[]> => {
  // فعلاً خالی - می‌توانید بعداً API ریویو اضافه کنید
  return [];
});

// orders - متصل به بک‌اند واقعی
const orders = cache(async (): Promise<Order[]> => {
  const response = await axios.get("/api/orders");
  return response.data;
});

const getOrder = cache(async (id: string): Promise<Order> => {
  const response = await axios.get(`/api/orders/${id}`);
  return response.data;
});

// customers - فعلاً mock
const customers = cache(async () => {
  return [];
});

// سایر موارد - فعلاً mock
const refundRequests = cache(async () => {
  return [];
});

const sellers = cache(async () => {
  return [];
});

const packagePayments = cache(async () => {
  return [];
});

const earningHistory = cache(async () => {
  return [];
});

const payouts = cache(async () => {
  return [];
});

const payoutRequests = cache(async () => {
  return [];
});

export default {
  brands,
  orders,
  reviews,
  sellers,
  payouts,
  products,
  category,
  getOrder,
  customers,
  getAllCard,
  payoutRequests,
  recentPurchase,
  refundRequests,
  earningHistory,
  packagePayments,
  stockOutProducts,
};