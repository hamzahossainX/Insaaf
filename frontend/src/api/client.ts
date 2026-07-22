import axios from "axios";

<<<<<<< HEAD
export const api = axios.create({ baseURL: "/api" });
=======
const apiOrigin =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "" : "https://insaaf-backend.vercel.app");

const baseURL = `${apiOrigin.replace(/\/$/, "")}/api`;

export const api = axios.create({
  baseURL,
  withCredentials: true,
});
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac

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
