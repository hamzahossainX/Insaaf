import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
  Truck,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { useI18n } from "../lib/i18n";
import LanguageSelector from "./LanguageSelector";

const navItems = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/sales/new", labelKey: "nav.newSale", icon: ShoppingCart },
  { to: "/cylinder-returns", labelKey: "nav.cylinderReturns", icon: PackageOpen },
  { to: "/customers", labelKey: "nav.customers", icon: Users },
  { to: "/suppliers", labelKey: "nav.suppliers", icon: Truck },
  { to: "/products", labelKey: "nav.products", icon: Boxes },
  { to: "/accounts", labelKey: "nav.accounts", icon: Wallet },
  { to: "/expenses", labelKey: "nav.expenses", icon: Receipt },
  { to: "/payroll", labelKey: "nav.payroll", icon: UserCog },
  { to: "/reports", labelKey: "nav.reports", icon: BarChart3 },
  { to: "/change-password", labelKey: "nav.changePassword", icon: KeyRound },
  { to: "/settings", labelKey: "nav.settings", icon: SettingsIcon },
];

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = navItems.filter((n) => n.to !== "/settings" || isAdmin);
  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-950">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800">
        <button
          className="p-2 -ml-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          onClick={() => setMobileOpen(true)}
          aria-label={t("nav.openMenu")}
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2 font-display font-semibold text-gray-900 dark:text-slate-100">
          <span className="w-6 h-6 rounded-md bg-brand-gradient flex items-center justify-center text-white">
            <Flame size={13} strokeWidth={2.5} />
          </span>
          <span className="hidden sm:inline">{t("app.name")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <LanguageSelector compact />
          <button
            className="p-2 -mr-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
            onClick={toggleTheme}
            aria-label={t("nav.toggleTheme")}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — fixed on desktop, slide-over drawer on mobile */}
      <aside
        className={`
          fixed lg:static z-50 lg:z-auto top-0 left-0 h-full w-64 shrink-0 flex flex-col
          bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800
          transform transition-transform duration-200 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        `}
      >
        <div className="px-4 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-white shadow-sm shrink-0">
              <Flame size={16} strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <div className="font-display font-semibold text-gray-900 dark:text-slate-100 text-[15px] leading-tight truncate">{t("app.name")}</div>
              <div className="text-xs text-gray-400 dark:text-slate-500 leading-tight">{t("app.wing")}</div>
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            onClick={() => setMobileOpen(false)}
            aria-label={t("nav.closeMenu")}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 pl-3.5 pr-3 py-2 rounded-lg text-[13.5px] transition-colors ${
                    isActive
                      ? "bg-brand-50 text-brand-800 font-medium dark:bg-brand-500/10 dark:text-brand-300"
                      : "text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brand-gradient" />
                    )}
                    <Icon size={17} strokeWidth={2} className="shrink-0" />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-2.5 py-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
          <LanguageSelector />
          <button
            className="hidden lg:flex w-full items-center gap-3 pl-3.5 pr-3 py-2 rounded-lg text-[13.5px] text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            {theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}
          </button>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800/50">
            <span className="w-7 h-7 rounded-full bg-brand-gradient text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {initial}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate leading-tight">{user?.name}</div>
              <div className="text-xs text-gray-400 dark:text-slate-500 leading-tight">{user?.role === "ADMIN" ? t("common.admin") : t("common.member")}</div>
            </div>
          </div>
          <button
            className="w-full flex items-center gap-3 pl-3.5 pr-3 py-2 rounded-lg text-[13.5px] text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut size={17} />
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 sm:p-6 pt-20 lg:pt-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
