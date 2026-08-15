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
  const { t, locale, setLocale } = useLocale();
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
  const isHome = location.pathname === "/";

  async function refreshBadge() {
    if (!showReservationBadge) {
      setReservationBadge(0);
      return;
    }
    try {
      const res = await api.unreadReservationCount();
      setReservationBadge(res.count || 0);
    } catch {
      // ignore
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

  const badgeLabel = reservationBadge > 9 ? "9+" : String(reservationBadge);

  const profileActive = [
    "/profile",
    "/reservations",
    "/favorites",
    "/contractor",
    "/dashboard",
    "/chats",
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
    if (path === "/contractor" || path.startsWith("/contractor/")) {
      return { label: t("nav.fleet") };
    }
    return null;
  }, [location.pathname, t]);

  const langSwitch = (
    <div className="lang-switch" role="group" aria-label={t("nav.language")}>
      {(["en", "sq", "it"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          className={locale === code ? "active" : undefined}
          onClick={() => setLocale(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );

  const themeBtn = (
    <button
      type="button"
      className="icon-btn theme-toggle"
      onClick={toggleTheme}
      aria-label={
        theme === "dark" ? t("nav.switchLight") : t("nav.switchDark")
      }
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );

  return (
    <div className={`app-shell${isHome ? " is-home" : ""}`}>
      <nav className="navbar">
        <div className="navbar-shell">
          <Link to="/" className="brand" onClick={closeMenus}>
            <span className="brand-mark" aria-hidden>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.1a2.5 2.5 0 0 1-4.8 0H9.9a2.5 2.5 0 0 1-4.8 0H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1zm2.5 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM7.2 11h9.6l-1.1-3.3a.5.5 0 0 0-.48-.35H8.78a.5.5 0 0 0-.48.35L7.2 11z" />
              </svg>
            </span>
            AutoRent
          </Link>

          <div className="nav-center">
            {isHome ? (
              <>
                <NavLink to="/cars" onClick={closeMenus}>
                  {t("nav.cars")}
                </NavLink>
                <a href="#cities" onClick={closeMenus}>
                  {t("nav.locations")}
                </a>
                <a href="#how" onClick={closeMenus}>
                  {t("nav.how")}
                </a>
                <a href="#why" onClick={closeMenus}>
                  {t("nav.about")}
                </a>
              </>
            ) : (
              <>
                <NavLink to="/cars" onClick={closeMenus}>
                  {t("nav.cars")}
                </NavLink>
                <NavLink to="/faq" onClick={closeMenus}>
                  {t("nav.faq")}
                </NavLink>
                <NavLink to="/contact" onClick={closeMenus}>
                  {t("nav.contact")}
                </NavLink>
              </>
            )}
          </div>

          <div className="nav-end">
            <div className="nav-utils-desktop">
              {langSwitch}
              {themeBtn}
            </div>

            {user ? (
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
                  <NavLink to="/profile" role="menuitem" onClick={closeMenus}>
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
                  {user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? (
                    <NavLink to="/admin" role="menuitem" onClick={closeMenus}>
                      {t("nav.admin")}
                    </NavLink>
                  ) : null}
                  {user.role === "SUPER_ADMIN" ? (
                    <NavLink
                      to="/super-admin"
                      role="menuitem"
                      onClick={closeMenus}
                    >
                      {t("nav.superAdmin")}
                    </NavLink>
                  ) : null}
                  <NavLink to="/favorites" role="menuitem" onClick={closeMenus}>
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
            ) : (
              <div className="nav-auth">
                <NavLink to="/login" className="nav-login" onClick={closeMenus}>
                  {t("nav.login")}
                </NavLink>
                <NavLink
                  to="/register"
                  className="btn nav-signup"
                  onClick={closeMenus}
                >
                  {t("nav.register")}
                </NavLink>
              </div>
            )}

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

          <div className={`nav-links ${menuOpen ? "open" : ""}`}>
            {isHome ? (
              <>
                <NavLink to="/cars" onClick={closeMenus}>
                  {t("nav.cars")}
                </NavLink>
                <a href="#cities" onClick={closeMenus}>
                  {t("nav.locations")}
                </a>
                <a href="#how" onClick={closeMenus}>
                  {t("nav.how")}
                </a>
                <a href="#why" onClick={closeMenus}>
                  {t("nav.about")}
                </a>
              </>
            ) : (
              <>
                <NavLink to="/cars" onClick={closeMenus}>
                  {t("nav.cars")}
                </NavLink>
                <NavLink to="/faq" onClick={closeMenus}>
                  {t("nav.faq")}
                </NavLink>
                <NavLink to="/contact" onClick={closeMenus}>
                  {t("nav.contact")}
                </NavLink>
              </>
            )}

            {user ? (
              <>
                <NavLink to="/profile" onClick={closeMenus}>
                  {t("nav.profile")}
                </NavLink>
                <NavLink to="/reservations" onClick={closeMenus}>
                  {t("nav.reservations")}
                </NavLink>
                <NavLink to="/favorites" onClick={closeMenus}>
                  {t("nav.favorites")}
                </NavLink>
                {canManageFleet ? (
                  <>
                    <NavLink to="/dashboard" onClick={closeMenus}>
                      {t("nav.dashboard")}
                    </NavLink>
                    <NavLink to="/chats" onClick={closeMenus}>
                      {t("nav.chats")}
                    </NavLink>
                    <NavLink to="/contractor" onClick={closeMenus}>
                      {t("nav.fleet")}
                    </NavLink>
                  </>
                ) : null}
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
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    closeMenus();
                    logout();
                  }}
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" onClick={closeMenus}>
                  {t("nav.login")}
                </NavLink>
                <NavLink
                  to="/register"
                  className="btn nav-signup"
                  onClick={closeMenus}
                >
                  {t("nav.register")}
                </NavLink>
              </>
            )}

            <div className="nav-menu-utils">
              {langSwitch}
              {themeBtn}
            </div>
          </div>
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

      <footer className="footer site-footer">
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <strong>AutoRent</strong>
            <p>{t("footer.blurb")}</p>
          </div>
          <div>
            <h4>{t("footer.explore")}</h4>
            <div className="footer-links">
              <Link to="/cars">{t("nav.cars")}</Link>
              <a href={isHome ? "#cities" : "/#cities"}>{t("nav.locations")}</a>
              <a href={isHome ? "#how" : "/#how"}>{t("nav.how")}</a>
              <a href={isHome ? "#why" : "/#why"}>{t("footer.about")}</a>
            </div>
          </div>
          <div>
            <h4>{t("footer.support")}</h4>
            <div className="footer-links">
              <Link to="/contact">{t("nav.contact")}</Link>
              <Link to="/faq">{t("nav.faq")}</Link>
              <Link to="/terms">{t("footer.terms")}</Link>
            </div>
          </div>
          <div>
            <h4>{t("footer.contact")}</h4>
            <div className="footer-links">
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
              <a href="mailto:info@autorent.al">info@autorent.al</a>
            </div>
          </div>
        </div>
        <p className="site-footer-copy">{t("footer.rights")}</p>
      </footer>

      <ChatWidget />
    </div>
  );
}
