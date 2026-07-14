import { useEffect, useState } from "react";
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
  const [reservationBadge, setReservationBadge] = useState(0);

  const showReservationBadge =
    user?.role === "CONTRACTOR" || user?.role === "SUPER_ADMIN";

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
    closeMenu();
  }, [location.pathname]);

  function closeMenu() {
    setMenuOpen(false);
  }

  const badgeLabel =
    reservationBadge > 9 ? "9+" : String(reservationBadge);

  return (
    <div className="app-shell">
      <nav className="navbar">
        <div className="nav-top">
          <Link to="/" className="brand" onClick={closeMenu}>
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
          <NavLink to="/cars" onClick={closeMenu}>
            {t("nav.cars")}
          </NavLink>
          <NavLink to="/contact" onClick={closeMenu}>
            {t("nav.contact")}
          </NavLink>
          <NavLink to="/faq" onClick={closeMenu}>
            {t("nav.faq")}
          </NavLink>
          {user ? (
            <>
              <NavLink to="/favorites" onClick={closeMenu}>
                {t("nav.favorites")}
              </NavLink>
              <NavLink
                to="/reservations"
                onClick={closeMenu}
                className={({ isActive }) =>
                  `nav-item-badge${isActive ? " active" : ""}`
                }
              >
                {t("nav.reservations")}
                {showReservationBadge && reservationBadge > 0 ? (
                  <span
                    className="nav-badge"
                    aria-label={`${reservationBadge} ${t("nav.notifications")}`}
                  >
                    {badgeLabel}
                  </span>
                ) : null}
              </NavLink>
              <NavLink to="/profile" onClick={closeMenu}>
                {t("nav.profile")}
              </NavLink>
              {user.role === "CONTRACTOR" ||
              user.role === "ADMIN" ||
              user.role === "SUPER_ADMIN" ? (
                <NavLink to="/contractor" onClick={closeMenu}>
                  {t("nav.fleet")}
                </NavLink>
              ) : null}
              {user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? (
                <NavLink to="/admin" onClick={closeMenu}>
                  {t("nav.admin")}
                </NavLink>
              ) : null}
              {user.role === "SUPER_ADMIN" && (
                <NavLink to="/super-admin" onClick={closeMenu}>
                  {t("nav.superAdmin")}
                </NavLink>
              )}
              <button
                className="link-btn"
                onClick={() => {
                  closeMenu();
                  logout();
                }}
              >
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={closeMenu}>
                {t("nav.login")}
              </NavLink>
              <NavLink to="/register" className="btn" onClick={closeMenu}>
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
