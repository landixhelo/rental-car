import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
            <button
              type="button"
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
              }
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>

            <button
              type="button"
              className="icon-btn menu-toggle"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Toggle menu"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <NavLink to="/cars" onClick={closeMenu}>
            Makinat
          </NavLink>
          <NavLink to="/contact" onClick={closeMenu}>
            Kontakt
          </NavLink>
          <NavLink to="/faq" onClick={closeMenu}>
            FAQ
          </NavLink>
          {user ? (
            <>
              <NavLink to="/favorites" onClick={closeMenu}>
                Favoritet
              </NavLink>
              <NavLink
                to="/reservations"
                onClick={closeMenu}
                className={({ isActive }) =>
                  `nav-item-badge${isActive ? " active" : ""}`
                }
              >
                Rezervimet
                {showReservationBadge && reservationBadge > 0 ? (
                  <span className="nav-badge" aria-label={`${reservationBadge} njoftime`}>
                    {badgeLabel}
                  </span>
                ) : null}
              </NavLink>
              <NavLink to="/profile" onClick={closeMenu}>
                Profili
              </NavLink>
              {user.role === "CONTRACTOR" ||
              user.role === "ADMIN" ||
              user.role === "SUPER_ADMIN" ? (
                <NavLink to="/contractor" onClick={closeMenu}>
                  Flota ime
                </NavLink>
              ) : null}
              {user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? (
                <NavLink to="/admin" onClick={closeMenu}>
                  Admin
                </NavLink>
              ) : null}
              {user.role === "SUPER_ADMIN" && (
                <NavLink to="/super-admin" onClick={closeMenu}>
                  Super Admin
                </NavLink>
              )}
              <button
                className="link-btn"
                onClick={() => {
                  closeMenu();
                  logout();
                }}
              >
                Dil
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={closeMenu}>
                Hyr
              </NavLink>
              <NavLink to="/register" className="btn" onClick={closeMenu}>
                Regjistrohu
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
          <Link to="/contact">Kontakt</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/terms">Kushtet</Link>
          <Link to="/cars">Makinat</Link>
        </div>
        <p>© 2026 AutoRent. Të gjitha të drejtat e rezervuara.</p>
      </footer>
    </div>
  );
}
