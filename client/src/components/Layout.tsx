import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

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
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
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
              <NavLink to="/reservations" onClick={closeMenu}>
                Rezervimet
              </NavLink>
              <NavLink to="/profile" onClick={closeMenu}>
                Profili
              </NavLink>
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
