import axios from "axios";

const apiOrigin =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "" : "https://insaaf-backend.vercel.app");

const baseURL = `${apiOrigin.replace(/\/$/, "")}/api`;

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

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
