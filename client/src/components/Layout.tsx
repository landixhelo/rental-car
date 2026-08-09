import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import Breadcrumbs from "./Breadcrumbs";
import ChatWidget from "./ChatWidget";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLocale } from "../context/LocaleContext";
import { applyBusinessMeta } from "../seo/site";
import type { Locale } from "../i18n";

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale, labels } = useLocale();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [reservationBadge, setReservationBadge] = useState(0);
  const [whatsapp, setWhatsapp] = useState("355689001257");
  const profileRef = useRef<HTMLDivElement>(null);

  const showReservationBadge =
    user?.role === "CONTRACTOR" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN";
  const canManageFleet =
    user?.role === "CONTRACTOR" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN";

  async function refreshBadge() {
    if (!showReservationBadge) {
      setReservationBadge(0);
      return;
    }
    try {
      const res = await api.unreadReservationCount();
      setReservationBadge(res.count || 0);
    } catch {
      // ignore badge errors
    }
  }

  useEffect(() => {
    api
      .meta()
      .then((m) => {
        applyBusinessMeta(m.business);
        const wa = (m.business?.whatsapp || m.whatsapp || "").replace(
          /[^\d]/g,
          ""
        );
        if (wa) setWhatsapp(wa);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);

  useEffect(() => {
    refreshBadge();
    if (!showReservationBadge) return;

    const onFocus = () => refreshBadge();
    const onSeen = () => setReservationBadge(0);
    const interval = window.setInterval(refreshBadge, 30000);

    window.addEventListener("focus", onFocus);
    window.addEventListener("autorent:reservations-seen", onSeen);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("autorent:reservations-seen", onSeen);
    };
  }, [user?.id, user?.role, showReservationBadge]);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!profileRef.current?.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function closeMenus() {
    setMenuOpen(false);
    setProfileOpen(false);
  }

  const badgeLabel =
    reservationBadge > 9 ? "9+" : String(reservationBadge);

  const profileActive = [
    "/profile",
    "/reservations",
    "/favorites",
    "/contractor",
    "/dashboard",
    "/chats",
    "/seller",
  ].some((p) => location.pathname.startsWith(p));

  const staffCrumb = useMemo(() => {
    const path = location.pathname;
    if (path === "/admin" || path.startsWith("/admin/")) {
      return { label: t("nav.admin") };
    }
    if (path === "/super-admin" || path.startsWith("/super-admin/")) {
      return { label: t("nav.superAdmin") };
    }
    if (path === "/dashboard" || path.startsWith("/dashboard/")) {
      return { label: t("nav.dashboard") };
    }
    if (path === "/chats" || path.startsWith("/chats/")) {
      return { label: t("nav.chats") };
    }
    if (path === "/seller" || path.startsWith("/seller/")) {
      return { label: t("nav.sell") };
    }
    if (path === "/contractor" || path.startsWith("/contractor/")) {
      return { label: t("nav.fleet") };
    }
    return null;
  }, [location.pathname, t]);

  return (
    <div className="app-shell">
      <nav className="navbar">
        <div className="nav-top">
          <Link to="/" className="brand" onClick={closeMenus}>
            AutoRent
          </Link>

          <div className="nav-actions">
            <div
              className="lang-switch"
              role="group"
              aria-label={t("nav.language")}
              title={t("nav.language")}
            >
              {(["en", "sq", "it"] as Locale[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  className={locale === code ? "active" : undefined}
                  onClick={() => setLocale(code)}
                  aria-pressed={locale === code}
                  aria-label={labels[code]}
                  title={labels[code]}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="icon-btn theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? t("nav.switchLight") : t("nav.switchDark")
              }
              title={theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>

            <button
              type="button"
              className="icon-btn menu-toggle"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label={t("nav.toggleMenu")}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <NavLink to="/cars" onClick={closeMenus}>
            {t("nav.cars")}
          </NavLink>
          <NavLink to="/marketplace" onClick={closeMenus}>
            {t("nav.marketplace")}
          </NavLink>

          {user ? (
            <>
              {canManageFleet ? (
                <NavLink to="/dashboard" onClick={closeMenus}>
                  {t("nav.dashboard")}
                </NavLink>
              ) : null}
              {canManageFleet ? (
                <NavLink to="/chats" onClick={closeMenus}>
                  {t("nav.chats")}
                </NavLink>
              ) : null}
              <NavLink to="/seller" onClick={closeMenus}>
                {t("nav.sell")}
              </NavLink>
              {user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? (
                <NavLink to="/admin" onClick={closeMenus}>
                  {t("nav.admin")}
                </NavLink>
              ) : null}
              {user.role === "SUPER_ADMIN" ? (
                <NavLink to="/super-admin" onClick={closeMenus}>
                  {t("nav.superAdmin")}
                </NavLink>
              ) : null}

              <div
                className={`nav-dropdown${profileOpen ? " open" : ""}${
                  profileActive ? " active" : ""
                }`}
                ref={profileRef}
              >
                <button
                  type="button"
                  className="nav-dropdown-trigger"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  onClick={() => setProfileOpen((v) => !v)}
                >
                  <span className="nav-item-badge">
                    {t("nav.profile")}
                    {showReservationBadge && reservationBadge > 0 ? (
                      <span
                        className="nav-badge"
                        aria-label={`${reservationBadge} ${t("nav.notifications")}`}
                      >
                        {badgeLabel}
                      </span>
                    ) : null}
                  </span>
                  <span className="nav-caret" aria-hidden>
                    ▾
                  </span>
                </button>

                <div className="nav-dropdown-menu" role="menu">
                  <NavLink
                    to="/profile"
                    role="menuitem"
                    onClick={closeMenus}
                  >
                    {t("nav.profile")}
                  </NavLink>
                  <NavLink
                    to="/reservations"
                    role="menuitem"
                    onClick={closeMenus}
                    className={({ isActive }) =>
                      `nav-item-badge${isActive ? " active" : ""}`
                    }
                  >
                    {t("nav.reservations")}
                    {showReservationBadge && reservationBadge > 0 ? (
                      <span className="nav-badge" aria-hidden>
                        {badgeLabel}
                      </span>
                    ) : null}
                  </NavLink>
                  {canManageFleet ? (
                    <>
                      <NavLink
                        to="/dashboard"
                        role="menuitem"
                        onClick={closeMenus}
                      >
                        {t("nav.dashboard")}
                      </NavLink>
                      <NavLink
                        to="/chats"
                        role="menuitem"
                        onClick={closeMenus}
                      >
                        {t("nav.chats")}
                      </NavLink>
                      <NavLink
                        to="/contractor"
                        role="menuitem"
                        onClick={closeMenus}
                      >
                        {t("nav.fleet")}
                      </NavLink>
                    </>
                  ) : null}
                  <NavLink
                    to="/seller"
                    role="menuitem"
                    onClick={closeMenus}
                  >
                    {t("nav.sell")}
                  </NavLink>
                  <NavLink
                    to="/favorites"
                    role="menuitem"
                    onClick={closeMenus}
                  >
                    {t("nav.favorites")}
                  </NavLink>
                  <button
                    type="button"
                    className="nav-dropdown-logout"
                    role="menuitem"
                    onClick={() => {
                      closeMenus();
                      logout();
                    }}
                  >
                    {t("nav.logout")}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={closeMenus}>
                {t("nav.login")}
              </NavLink>
              <NavLink to="/register" className="btn" onClick={closeMenus}>
                {t("nav.register")}
              </NavLink>
            </>
          )}
        </div>
      </nav>

      {staffCrumb ? (
        <div className="breadcrumbs-bar">
          <Breadcrumbs items={[staffCrumb]} />
        </div>
      ) : null}

      <main>
        <Outlet />
      </main>

      <footer className="footer">
        <strong>AutoRent</strong>
        <div className="footer-links">
          <Link to="/contact">{t("nav.contact")}</Link>
          <Link to="/faq">{t("nav.faq")}</Link>
          <Link to="/terms">{t("footer.terms")}</Link>
          <Link to="/marketplace">{t("nav.marketplace")}</Link>
          <Link to="/cars">{t("nav.cars")}</Link>
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        </div>
        <p>{t("footer.rights")}</p>
      </footer>

      <ChatWidget />
    </div>
  );
}
