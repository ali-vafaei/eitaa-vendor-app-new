import { cache } from "react";
import axios from "../../utils/axiosInstance";

// --- PRODUCTS API ---
export const getAllProducts = cache(async () => {
  const response = await axios.get("/api/products");
  return response.data;
});

export const getProduct = cache(async (id: string) => {
  const response = await axios.get(`/api/products/${id}`);
  return response.data;
});

export const createProduct = async (productData: any) => {
  const response = await axios.post("/api/products", productData);
  return response.data;
};

export const updateProduct = async (id: string, productData: any) => {
  const response = await axios.put(`/api/products/${id}`, productData);
  return response.data;
};

export const deleteProduct = async (id: string) => {
  const response = await axios.delete(`/api/products/${id}`);
  return response.data;
};

export const archiveProduct = async (id: string) => {
  const response = await axios.patch(`/api/products/${id}/archive`);
  return response.data;
};

// --- ORDERS API ---
export const getAllOrders = cache(async () => {
  const response = await axios.get("/api/orders");
  return response.data;
});

export const getOrder = cache(async (id: string) => {
  const response = await axios.get(`/api/orders/${id}`);
  return response.data;
});

export const createOrder = async (orderData: any) => {
  const response = await axios.post("/api/orders", orderData);
  return response.data;
};

export const updateOrderStatus = async (id: string, status: string) => {
  const response = await axios.put(`/api/orders/${id}/status`, { status });
  return response.data;
};

export const cancelOrder = async (id: string) => {
  const response = await axios.patch(`/api/orders/${id}/cancel`);
  return response.data;
};

// --- AUTH API ---
export const login = async (email: string, password: string) => {
  const response = await axios.post("/api/auth/login", { email, password });
  return response.data;
};

export const register = async (email: string, password: string) => {
  const response = await axios.post("/api/auth/register", { email, password });
  return response.data;
};

export default {
  // Products
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  archiveProduct,

  // Orders
  getAllOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  cancelOrder,

  // Auth
  login,
  register
};