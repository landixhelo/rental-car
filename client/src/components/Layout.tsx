import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLocale } from "../context/LocaleContext";
import type { Locale } from "../i18n";

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale, locales, labels } = useLocale();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [reservationBadge, setReservationBadge] = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);

  const showReservationBadge =
    user?.role === "CONTRACTOR" || user?.role === "SUPER_ADMIN";
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
  ].some((p) => location.pathname.startsWith(p));

  return (
    <div className="app-shell">
      <nav className="navbar">
        <div className="nav-top">
          <Link to="/" className="brand" onClick={closeMenus}>
            AutoRent
          </Link>

          <div className="nav-actions">
            <label className="lang-switch" title={t("nav.language")}>
              <span className="sr-only">{t("nav.language")}</span>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                aria-label={t("nav.language")}
              >
                {locales.map((code) => (
                  <option key={code} value={code}>
                    {labels[code]}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="icon-btn"
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

          {user ? (
            <>
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
                    <NavLink
                      to="/contractor"
                      role="menuitem"
                      onClick={closeMenus}
                    >
                      {t("nav.fleet")}
                    </NavLink>
                  ) : null}
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

      <main>
        <Outlet />
      </main>

      <footer className="footer">
        <strong>AutoRent</strong>
        <div className="footer-links">
          <Link to="/contact">{t("nav.contact")}</Link>
          <Link to="/faq">{t("nav.faq")}</Link>
          <Link to="/terms">{t("footer.terms")}</Link>
          <Link to="/cars">{t("nav.cars")}</Link>
        </div>
        <p>{t("footer.rights")}</p>
      </footer>
    </div>
  );
}
