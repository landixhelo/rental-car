import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LocaleContext";

type OpsSearchCtx = {
  query: string;
  setQuery: (value: string) => void;
};

const OpsSearchContext = createContext<OpsSearchCtx>({
  query: "",
  setQuery: () => {},
});

export function useOpsSearch() {
  return useContext(OpsSearchContext);
}

function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} fill="none" />
    </svg>
  );
}

const ICONS = {
  dash: "M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z",
  fleet:
    "M5 17h14M5 17a2 2 0 0 1-2-2v-3l2-5h14l2 5v3a2 2 0 0 1-2 2M7 17v2M17 17v2M3 12h18",
  reservations:
    "M8 3v3M16 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  customers:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  calendar:
    "M8 3v3M16 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  location:
    "M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11zM12 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  reviews:
    "M12 3l2.1 6.5H21l-5.4 3.9 2.1 6.5L12 16.9 6.3 19.9l2.1-6.5L3 9.5h6.9L12 3z",
  promo:
    "M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01",
  reports: "M4 19V5M4 19h16M8 15l3-3 3 3 5-6",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.9 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01",
  apps: "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z",
  heart:
    "M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l1.7 1.7L12 21l7.1-7.1 1.7-1.7a5 5 0 0 0 0-7.1z",
  menu: "M4 6h16M4 12h16M4 18h16",
  admin:
    "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
};

type NavItem = {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  hash?: string;
};

export const OPS_PATHS = [
  "/dashboard",
  "/contractor",
  "/chats",
  "/admin",
  "/super-admin",
  "/reservations",
  "/favorites",
  "/profile",
] as const;

export function isOpsPath(pathname: string) {
  return OPS_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export default function OpsLayout() {
  const { user, logout } = useAuth();
  const t = useT();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSidebarOpen(false);
    setQuery("");
  }, [location.pathname]);

  const role = user?.role;
  const isStaff =
    role === "CONTRACTOR" || role === "ADMIN" || role === "SUPER_ADMIN";
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const isSuper = role === "SUPER_ADMIN";

  const navItems = useMemo(() => {
    const items: NavItem[] = [];
    if (isStaff) {
      items.push({
        to: "/dashboard",
        label: t("nav.dashboard"),
        icon: ICONS.dash,
        end: true,
      });
      items.push({
        to: "/contractor",
        label: t("nav.fleet"),
        icon: ICONS.fleet,
      });
    }
    items.push({
      to: "/reservations",
      label: t("nav.reservations"),
      icon: ICONS.reservations,
    });
    if (isStaff) {
      items.push({ to: "/chats", label: t("nav.chats"), icon: ICONS.customers });
      items.push({
        to: "/contractor",
        label: t("dashboard.navCalendar"),
        icon: ICONS.calendar,
        hash: "#calendar",
      });
    }
    items.push({
      to: "/favorites",
      label: t("nav.favorites"),
      icon: ICONS.heart,
    });
    if (isAdmin) {
      items.push({ to: "/admin", label: t("nav.admin"), icon: ICONS.admin });
    }
    if (isSuper) {
      items.push({
        to: "/super-admin",
        label: t("nav.superAdmin"),
        icon: ICONS.reports,
      });
    }
    items.push({
      to: "/profile",
      label: t("dashboard.navSettings"),
      icon: ICONS.settings,
    });
    return items;
  }, [isStaff, isAdmin, isSuper, t]);

  const soonItems = isStaff
    ? [
        { label: t("dashboard.navCustomers"), icon: ICONS.customers },
        { label: t("dashboard.navLocations"), icon: ICONS.location },
        { label: t("dashboard.navReviews"), icon: ICONS.reviews },
        { label: t("dashboard.navPromo"), icon: ICONS.promo },
        { label: t("dashboard.navReports"), icon: ICONS.reports },
      ]
    : [];

  const roleLabel =
    role === "SUPER_ADMIN"
      ? t("nav.superAdmin")
      : role === "ADMIN"
        ? t("nav.admin")
        : role === "CONTRACTOR"
          ? t("nav.fleet")
          : t("nav.profile");

  const searchCtx = useMemo(() => ({ query, setQuery }), [query]);

  return (
    <OpsSearchContext.Provider value={searchCtx}>
      <div className={`ops-shell${sidebarOpen ? " sidebar-open" : ""}`}>
        {sidebarOpen ? (
          <button
            type="button"
            className="ops-backdrop"
            aria-label={t("nav.toggleMenu")}
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <aside className="ops-sidebar">
          <div className="ops-brand">
            <Link
              to="/"
              className="ops-brand-link"
              onClick={() => setSidebarOpen(false)}
            >
              AutoRent
            </Link>
            <span>
              {isStaff
                ? t("dashboard.fleetManagement")
                : t("dashboard.accountArea")}
            </span>
          </div>

          {isStaff ? (
            <Link
              to="/contractor"
              className="ops-add-btn"
              onClick={() => setSidebarOpen(false)}
            >
              + {t("dashboard.addVehicle")}
            </Link>
          ) : (
            <Link
              to="/cars"
              className="ops-add-btn"
              onClick={() => setSidebarOpen(false)}
            >
              {t("nav.cars")}
            </Link>
          )}

          <nav className="ops-nav" aria-label={t("dashboard.title")}>
            {navItems.map((item) => (
              <NavLink
                key={`${item.to}-${item.label}`}
                to={item.hash ? `${item.to}${item.hash}` : item.to}
                end={item.end}
                className={({ isActive }) =>
                  `ops-nav-link${isActive && !item.hash ? " active" : ""}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <Icon path={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
            {soonItems.map((item) => (
              <span
                key={item.label}
                className="ops-nav-link is-soon"
                title={t("dashboard.soon")}
              >
                <Icon path={item.icon} />
                <span>{item.label}</span>
              </span>
            ))}
          </nav>

          <div className="ops-sidebar-user">
            <span className="ops-avatar" aria-hidden>
              {(user?.fullName || "U").charAt(0).toUpperCase()}
            </span>
            <div className="ops-sidebar-user-text">
              <strong>{user?.fullName || t("dashboard.adminUser")}</strong>
              <span>{roleLabel}</span>
            </div>
            <button
              type="button"
              className="ops-logout"
              onClick={() => {
                setSidebarOpen(false);
                logout();
              }}
            >
              {t("nav.logout")}
            </button>
          </div>
        </aside>

        <div className="ops-main">
          <header className="ops-topbar">
            <button
              type="button"
              className="ops-menu-btn"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label={t("nav.toggleMenu")}
            >
              <Icon path={ICONS.menu} />
            </button>

            <label className="ops-search">
              <Icon path={ICONS.search} size={16} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("dashboard.searchPh")}
              />
            </label>

            <div className="ops-top-actions">
              <Link
                to="/reservations"
                className="ops-icon-btn"
                aria-label={t("nav.notifications")}
              >
                <Icon path={ICONS.bell} size={18} />
              </Link>
              <Link to="/faq" className="ops-icon-btn" aria-label={t("nav.faq")}>
                <Icon path={ICONS.help} size={18} />
              </Link>
              <Link
                to="/cars"
                className="ops-icon-btn"
                aria-label={t("nav.cars")}
              >
                <Icon path={ICONS.apps} size={18} />
              </Link>
              <Link
                to="/profile"
                className="ops-avatar ops-avatar-sm"
                aria-label={t("nav.profile")}
              >
                {(user?.fullName || "U").charAt(0).toUpperCase()}
              </Link>
            </div>
          </header>

          <div className="ops-content">
            <Outlet />
          </div>
        </div>
      </div>
    </OpsSearchContext.Provider>
  );
}
