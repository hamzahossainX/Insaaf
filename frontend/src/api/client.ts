import axios from "axios";

// In production (Vercel), VITE_API_URL is set to the backend Vercel URL.
// In local dev the Vite proxy rewrites /api → http://localhost:4000, so
// the relative baseURL "/api" works without needing an env var.
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("insaaf_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      sessionStorage.removeItem("insaaf_token");
      sessionStorage.removeItem("insaaf_user");
      if (!location.pathname.startsWith("/login")) location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export function currency(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `৳ ${n.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
