import { useState } from "react";
<<<<<<< HEAD
import { NavLink, Outlet, useNavigate } from "react-router-dom";
=======
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
import {
  LayoutDashboard,
  ShoppingCart,
  PackageOpen,
  Users,
  Boxes,
  Wallet,
  Receipt,
  UserCog,
  BarChart3,
  Settings as SettingsIcon,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  Flame,
<<<<<<< HEAD
  Truck,
=======
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sales/new", label: "New Sale", icon: ShoppingCart },
  { to: "/cylinder-returns", label: "Cylinder Returns", icon: PackageOpen },
  { to: "/customers", label: "Customers", icon: Users },
<<<<<<< HEAD
  { to: "/suppliers", label: "Suppliers", icon: Truck },
=======
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
  { to: "/products", label: "Products & Stock", icon: Boxes },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/payroll", label: "Employees & Payroll", icon: UserCog },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
<<<<<<< HEAD
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = navItems.filter((n) => n.to !== "/settings" || isAdmin);
  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-950">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800">
        <button
          className="p-2 -ml-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
=======
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = navItems.filter((n) => n.to !== "/settings" || isAdmin);
  const initials = (user?.name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-900">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <button
          className="p-2 -ml-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
<<<<<<< HEAD
        <div className="flex items-center gap-2 font-display font-semibold text-gray-900 dark:text-slate-100">
          <span className="w-6 h-6 rounded-md bg-brand-gradient flex items-center justify-center text-white">
            <Flame size={13} strokeWidth={2.5} />
=======
        <div className="flex items-center gap-2 font-semibold text-brand-700 dark:text-brand-400">
          <span className="w-7 h-7 rounded-lg bg-brand-gradient text-white flex items-center justify-center shadow-sm">
            <Flame size={15} />
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
          </span>
          Insaaf ERP
        </div>
        <button
<<<<<<< HEAD
          className="p-2 -mr-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
=======
          className="p-2 -mr-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-transform active:scale-90"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={20} className="animate-scale-in" /> : <Moon size={20} className="animate-scale-in" />}
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
        </button>
      </header>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
<<<<<<< HEAD
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px]"
=======
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — fixed on desktop, slide-over drawer on mobile */}
      <aside
        className={`
          fixed lg:static z-50 lg:z-auto top-0 left-0 h-full w-64 shrink-0 flex flex-col
<<<<<<< HEAD
          bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800
=======
          bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
          transform transition-transform duration-200 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        `}
      >
<<<<<<< HEAD
        <div className="px-4 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-white shadow-sm shrink-0">
              <Flame size={16} strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <div className="font-display font-semibold text-gray-900 dark:text-slate-100 text-[15px] leading-tight truncate">Insaaf ERP</div>
              <div className="text-xs text-gray-400 dark:text-slate-500 leading-tight">Oxygen Wing</div>
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
=======
        <div className="px-4 py-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 font-semibold text-brand-700 dark:text-brand-400 text-lg">
              <span className="w-9 h-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-glow-lg">
                <Flame size={18} className="animate-floaty" />
              </span>
              Insaaf ERP
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 pl-11">Oxygen Wing</div>
          </div>
          <button
            className="lg:hidden p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

<<<<<<< HEAD
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {visibleItems.map((item) => {
=======
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleItems.map((item, i) => {
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMobileOpen(false)}
<<<<<<< HEAD
                className={({ isActive }) =>
                  `relative flex items-center gap-3 pl-3.5 pr-3 py-2 rounded-lg text-[13.5px] transition-colors ${
                    isActive
                      ? "bg-brand-50 text-brand-800 font-medium dark:bg-brand-500/10 dark:text-brand-300"
                      : "text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
=======
                style={{ animationDelay: `${i * 30}ms` }}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 pl-3 pr-3 py-2 rounded-lg text-sm transition-all duration-150 animate-slide-in-left ${
                    isActive
                      ? "bg-brand-50 text-brand-700 font-medium dark:bg-brand-500/15 dark:text-brand-300"
                      : "text-gray-600 hover:bg-gray-100 hover:pl-4 dark:text-slate-300 dark:hover:bg-slate-700/60"
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
                  }`
                }
              >
                {({ isActive }) => (
                  <>
<<<<<<< HEAD
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brand-gradient" />
                    )}
                    <Icon size={17} strokeWidth={2} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
=======
                    <span
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-brand-gradient transition-all duration-200 ${
                        isActive ? "h-5 opacity-100" : "h-0 opacity-0"
                      }`}
                    />
                    <Icon
                      size={17}
                      strokeWidth={2}
                      className={`transition-transform duration-150 ${isActive ? "scale-110" : "group-hover:scale-110"}`}
                    />
                    {item.label}
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

<<<<<<< HEAD
        <div className="px-2.5 py-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
          <button
            className="hidden lg:flex w-full items-center gap-3 pl-3.5 pr-3 py-2 rounded-lg text-[13.5px] text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800/50">
            <span className="w-7 h-7 rounded-full bg-brand-gradient text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {initial}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate leading-tight">{user?.name}</div>
              <div className="text-xs text-gray-400 dark:text-slate-500 leading-tight">{user?.role === "ADMIN" ? "Admin" : "Member"}</div>
            </div>
          </div>
          <button
            className="w-full flex items-center gap-3 pl-3.5 pr-3 py-2 rounded-lg text-[13.5px] text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
=======
        <div className="px-3 py-3 border-t border-gray-200 dark:border-slate-700 space-y-2">
          <button
            className="hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700/60 transition-colors group"
            onClick={toggleTheme}
          >
            <span className="transition-transform duration-300 group-hover:rotate-45">
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </span>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900/60">
            <div className="w-8 h-8 shrink-0 rounded-full bg-brand-gradient text-white text-xs font-semibold flex items-center justify-center shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{user?.name}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">{user?.role === "ADMIN" ? "Admin" : "Member"}</div>
            </div>
          </div>
          <button
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors group"
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
<<<<<<< HEAD
            <LogOut size={17} />
=======
            <LogOut size={17} className="transition-transform group-hover:translate-x-0.5" />
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 sm:p-6 pt-20 lg:pt-6 overflow-y-auto">
<<<<<<< HEAD
        <Outlet />
=======
        <div key={location.pathname} className="animate-fade-in-up">
          <Outlet />
        </div>
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
      </main>
    </div>
  );
}
