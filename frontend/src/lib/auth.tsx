import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "../api/client";

export interface AuthUser {
  id: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  wing_id: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  checkingSession: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = sessionStorage.getItem("insaaf_user");
    return raw ? JSON.parse(raw) : null;
  });
  // Guards the first render so a stale/expired token isn't briefly trusted
  // before we've confirmed it against the backend.
  const [checkingSession, setCheckingSession] = useState(!!sessionStorage.getItem("insaaf_token"));

  // A token can outlive its usefulness (expired, or the server restarted with a
  // different secret) while the cached user object stays in storage. Verify it
  // for real on load instead of blindly trusting what's stored.
  useEffect(() => {
    const token = sessionStorage.getItem("insaaf_token");
    if (!token) {
      setCheckingSession(false);
      return;
    }
    api
      .get("/auth/me")
      .catch(() => {
        sessionStorage.removeItem("insaaf_token");
        sessionStorage.removeItem("insaaf_user");
        setUser(null);
      })
      .finally(() => setCheckingSession(false));
  }, []);

  async function login(phone: string, password: string) {
    const res = await api.post("/auth/login", { phone, password });
    sessionStorage.setItem("insaaf_token", res.data.token);
    sessionStorage.setItem("insaaf_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
  }

  function logout() {
    sessionStorage.removeItem("insaaf_token");
    sessionStorage.removeItem("insaaf_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === "ADMIN", checkingSession, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
