import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import Breadcrumbs from "./Breadcrumbs";
import BrandLockup from "./BrandLockup";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { useUnreadNotifications } from "../context/UnreadContext";
import { applyBusinessMeta, businessRuntime } from "../seo/site";
import type { Locale } from "../i18n";
import { isOpsPath } from "./OpsLayout";

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { count: reservationBadge, label: badgeLabel } =
    useUnreadNotifications();
  const [whatsapp, setWhatsapp] = useState("355689001257");
  const [isMobileNav, setIsMobileNav] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 980px)").matches
  );
  const profileRef = useRef<HTMLDivElement>(null);

  const isHome = location.pathname === "/";
  const isOps = isOpsPath(location.pathname);
  const showNotificationBadge = Boolean(user) && reservationBadge > 0;
  const canManageFleet =
    user?.role === "CONTRACTOR" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN";

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
    const mq = window.matchMedia("(max-width: 980px)");
    const sync = () => {
      setIsMobileNav(mq.matches);
      if (!mq.matches) setMenuOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("nav-menu-open", menuOpen);
    return () => document.body.classList.remove("nav-menu-open");
  }, [menuOpen]);

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

  return (
    <div
      className={`app-shell${isHome ? " is-home" : ""}${
        isOps ? " is-ops" : ""
      }`}
    >
      {!isOps ? (
        <>
      <nav className="navbar">
          <div className="navbar-shell">
          <div className="nav-bar-row">
          <Link to="/" className="brand" onClick={closeMenus}>
            <BrandLockup />
          </Link>

          <div className="nav-center">
            <NavLink to="/cars" onClick={closeMenus}>
              {t("nav.cars")}
            </NavLink>
          </div>

          <div className="nav-end">
            {!isMobileNav ? (
              <div className="nav-lang">{langSwitch}</div>
            ) : null}

            {!isMobileNav ? (
            <div className="nav-desktop-only">
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
                      <span className="nav-avatar" aria-hidden>
                        {(user.fullName || "U").charAt(0).toUpperCase()}
                      </span>
                      <span className="nav-user-name">{user.fullName}</span>
                      {showNotificationBadge ? (
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
                      to="/profile?tab=notifications"
                      role="menuitem"
                      onClick={closeMenus}
                      className="nav-item-badge"
                    >
                      {t("profile.navNotifications")}
                      {showNotificationBadge ? (
                        <span className="nav-badge" aria-hidden>
                          {badgeLabel}
                        </span>
                      ) : null}
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
                      {showNotificationBadge ? (
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
              ) : (
                <div className="nav-auth">
                  <NavLink
                    to="/login"
                    className="nav-login"
                    onClick={closeMenus}
                  >
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
            </div>
            ) : (
            <div className="nav-mobile-only">
              {!user ? (
                <NavLink
                  to="/login"
                  className="nav-login-mobile"
                  onClick={closeMenus}
                >
                  {t("nav.login")}
                </NavLink>
              ) : null}
              <button
                type="button"
                className="icon-btn menu-toggle"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav-menu"
                aria-label={t("nav.toggleMenu")}
              >
                {menuOpen ? "✕" : "☰"}
                {user && showNotificationBadge ? (
                  <span className="nav-badge menu-toggle-badge" aria-hidden>
                    {badgeLabel}
                  </span>
                ) : null}
              </button>
            </div>
            )}
          </div>
          </div>

          {isMobileNav ? (
          <div
            id="mobile-nav-menu"
            className={`nav-links ${menuOpen ? "open" : ""}`}
          >
            {user ? (
              <div className="nav-menu-user">
                <div className="nav-menu-user-text">
                  <strong>{user.fullName}</strong>
                  {user.email ? <span>{user.email}</span> : null}
                </div>
                <button
                  type="button"
                  className="nav-menu-logout-inline"
                  onClick={() => {
                    closeMenus();
                    logout();
                  }}
                >
                  {t("nav.logout")}
                </button>
              </div>
            ) : null}

            <div className="nav-menu-lang">
              <p className="nav-menu-section">{t("nav.language")}</p>
              {langSwitch}
            </div>

            <p className="nav-menu-section">{t("footer.explore")}</p>
            <NavLink to="/cars" onClick={closeMenus}>
              {t("nav.cars")}
            </NavLink>
            <NavLink to="/faq" onClick={closeMenus}>
              {t("nav.faq")}
            </NavLink>
            <NavLink to="/contact" onClick={closeMenus}>
              {t("nav.contact")}
            </NavLink>

            {user ? (
              <>
                <p className="nav-menu-section">{t("nav.profile")}</p>
                <NavLink to="/profile" onClick={closeMenus}>
                  {t("nav.profile")}
                </NavLink>
                <NavLink
                  to="/profile?tab=notifications"
                  onClick={closeMenus}
                  className="nav-item-badge"
                >
                  {t("profile.navNotifications")}
                  {showNotificationBadge ? (
                    <span className="nav-badge" aria-hidden>
                      {badgeLabel}
                    </span>
                  ) : null}
                </NavLink>
                <NavLink
                  to="/reservations"
                  onClick={closeMenus}
                  className="nav-item-badge"
                >
                  {t("nav.reservations")}
                  {showNotificationBadge ? (
                    <span className="nav-badge" aria-hidden>
                      {badgeLabel}
                    </span>
                  ) : null}
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
                  className="nav-menu-logout"
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
                <p className="nav-menu-section">{t("nav.login")}</p>
                <NavLink to="/login" onClick={closeMenus}>
                  {t("nav.login")}
                </NavLink>
                <NavLink
                  to="/register"
                  className="btn nav-signup nav-menu-cta"
                  onClick={closeMenus}
                >
                  {t("nav.register")}
                </NavLink>
              </>
            )}
          </div>
          ) : null}
        </div>
      </nav>

      {menuOpen ? (
        <button
          type="button"
          className="nav-backdrop"
          aria-label={t("nav.toggleMenu")}
          onClick={closeMenus}
        />
      ) : null}

      {staffCrumb ? (
        <div className="breadcrumbs-bar">
          <Breadcrumbs items={[staffCrumb]} />
        </div>
      ) : null}
        </>
      ) : null}

      <main>
        <Outlet />
      </main>

      {!isOps ? (
      <footer className="footer site-footer">
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <BrandLockup size="footer" />
            <p>{t("footer.blurb")}</p>
          </div>
          <div>
            <h4>{t("footer.locations")}</h4>
            <div className="footer-links">
              <Link to="/car-rental-tirana">Tiranë</Link>
              <Link to="/car-rental-durres">Durrës</Link>
              <Link to="/car-rental-airport">Tirana Airport</Link>
              <Link to="/car-rental-vlore">Vlorë</Link>
              <Link to="/car-rental-sarande">Sarandë</Link>
            </div>
          </div>
          <div>
            <h4>{t("footer.quickLinks")}</h4>
            <div className="footer-links">
              <Link to="/cars">{t("nav.cars")}</Link>
              <a href={isHome ? "#why" : "/#why"}>{t("footer.about")}</a>
              <a href={isHome ? "#cities" : "/#cities"}>{t("nav.locations")}</a>
              <Link to="/faq">{t("nav.faq")}</Link>
              <Link to="/contact">{t("nav.contact")}</Link>
            </div>
          </div>
          <div>
            <h4>{t("footer.contact")}</h4>
            <div className="footer-links">
              <a href={`tel:+${whatsapp}`}>{t("footer.phone")}</a>
              <a href={`mailto:${businessRuntime.email || "info@autorent.al"}`}>
                {businessRuntime.email || "info@autorent.al"}
              </a>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Tirana+Albania"
                target="_blank"
                rel="noreferrer"
              >
                {t("footer.maps")}
              </a>
            </div>
          </div>
        </div>
        <p className="site-footer-copy">
          {t("footer.rights")}{" "}
          <Link to="/terms">{t("footer.terms")}</Link>
          {" · "}
          <Link to="/terms#privacy">{t("footer.privacy")}</Link>
        </p>
      </footer>
      ) : null}
    </div>
  );
}
