import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { mediaUrl } from "../lib/mediaUrl";

type DashboardData = {
  scope: "fleet" | "platform";
  fleet: {
    total: number;
    available: number;
    reserved: number;
    maintenance: number;
    availabilityPct: number;
  };
  reservations: {
    total: number;
    byStatus: Record<string, number>;
    active: number;
  };
  revenue: {
    total: number;
    monthly: Array<{ month: string; total: number }>;
  };
  ops: {
    pendingDocuments: number;
    heldDeposits: number;
  };
  recent: Array<{
    id: string;
    status: string;
    totalPrice: number;
    startDate: string;
    endDate: string;
    carLabel: string;
    customerName: string;
    customerEmail: string;
    createdAt: string;
  }>;
  topCars: Array<{
    carId: string;
    label: string;
    count: number;
    revenue?: number;
    imageUrl?: string | null;
  }>;
};

const DONUT_COLORS: Record<string, string> = {
  CONFIRMED: "#e11c49",
  PENDING: "#1f2937",
  COMPLETED: "#6b7280",
  CANCELLED: "#d1d5db",
  REJECTED: "#f87171",
};

function Icon({
  path,
  size = 18,
}: {
  path: string;
  size?: number;
}) {
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
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  menu: "M4 6h16M4 12h16M4 18h16",
};

function Donut({
  segments,
  label,
}: {
  segments: Array<{ key: string; value: number; color: string }>;
  label: string;
}) {
  const sum = segments.reduce((s, x) => s + x.value, 0);
  const total = sum || 1;
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 140 140" className="ops-donut" aria-hidden>
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="#eceff3"
        strokeWidth="16"
      />
      {segments.map((seg) => {
        const len = (seg.value / total) * c;
        const el = (
          <circle
            key={seg.key}
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="16"
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform="rotate(-90 70 70)"
          />
        );
        offset += len;
        return el;
      })}
      <text
        x="70"
        y="66"
        textAnchor="middle"
        fill="#111827"
        fontSize="26"
        fontWeight="700"
      >
        {sum}
      </text>
      <text
        x="70"
        y="86"
        textAnchor="middle"
        fill="#6b7280"
        fontSize="11"
        fontWeight="600"
      >
        {label}
      </text>
    </svg>
  );
}

function BarChart({
  data,
}: {
  data: Array<{ month: string; total: number }>;
}) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const w = 520;
  const h = 220;
  const padX = 12;
  const padBottom = 28;
  const padTop = 12;
  const gap = 10;
  const barW = Math.max(
    10,
    (w - padX * 2 - gap * (data.length - 1)) / data.length
  );

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="ops-bars" aria-hidden>
      {data.map((d, i) => {
        const full = ((d.total / max) * (h - padBottom - padTop)) || 2;
        const top = full * 0.28;
        const base = full - top;
        const x = padX + i * (barW + gap);
        const yBase = h - padBottom - base;
        const yTop = yBase - top;
        return (
          <g key={d.month}>
            <rect
              x={x}
              y={yBase}
              width={barW}
              height={Math.max(base, 0)}
              rx="6"
              fill="#e11c49"
            />
            <rect
              x={x}
              y={yTop}
              width={barW}
              height={Math.max(top, 0)}
              rx="6"
              fill="#f9a8b8"
            />
            <text
              x={x + barW / 2}
              y={h - 8}
              textAnchor="middle"
              fontSize="11"
              fill="#98a2b3"
              fontWeight="600"
            >
              {d.month.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function shortId(id: string) {
  return `AR-${id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase()}`;
}

function formatShort(iso: string, locale: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(d);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const t = useT();
  const { locale } = useLocale();
  const { show, Toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const intlLocale =
    locale === "sq" ? "sq-AL" : locale === "it" ? "it-IT" : "en-GB";

  useEffect(() => {
    setLoading(true);
    api
      .dashboard()
      .then(setData)
      .catch((e) => show(e instanceof Error ? e.message : t("common.error")))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const donutSegments = useMemo(() => {
    if (!data) return [];
    const order = ["CONFIRMED", "PENDING", "COMPLETED", "CANCELLED", "REJECTED"];
    return order
      .filter((key) => (data.reservations.byStatus[key] || 0) > 0)
      .map((key) => ({
        key,
        value: data.reservations.byStatus[key] || 0,
        color: DONUT_COLORS[key] || "#64748b",
      }));
  }, [data]);

  const filteredRecent = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.recent;
    return data.recent.filter(
      (r) =>
        r.customerName.toLowerCase().includes(q) ||
        r.carLabel.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        shortId(r.id).toLowerCase().includes(q)
    );
  }, [data, query]);

  function statusText(status: string) {
    if (
      status === "PENDING" ||
      status === "CONFIRMED" ||
      status === "COMPLETED" ||
      status === "CANCELLED" ||
      status === "REJECTED"
    ) {
      return t(`status.${status}`);
    }
    return status;
  }

  const navItems = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: ICONS.dash, end: true },
    { to: "/contractor", label: t("nav.fleet"), icon: ICONS.fleet },
    { to: "/reservations", label: t("nav.reservations"), icon: ICONS.reservations },
    { to: "/chats", label: t("nav.chats"), icon: ICONS.customers },
    {
      to: "/contractor",
      label: t("dashboard.navCalendar"),
      icon: ICONS.calendar,
      hash: "#calendar",
    },
    { to: "/profile", label: t("dashboard.navSettings"), icon: ICONS.settings },
  ];

  const soonItems = [
    { label: t("dashboard.navCustomers"), icon: ICONS.customers },
    { label: t("dashboard.navLocations"), icon: ICONS.location },
    { label: t("dashboard.navReviews"), icon: ICONS.reviews },
    { label: t("dashboard.navPromo"), icon: ICONS.promo },
    { label: t("dashboard.navReports"), icon: ICONS.reports },
  ];

  if (loading) {
    return (
      <div className="ops-shell">
        {Toast}
        <p className="ops-loading">{t("common.loading")}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="ops-shell">
        {Toast}
        <p className="ops-loading">{t("common.error")}</p>
      </div>
    );
  }

  const donutTotal = donutSegments.reduce((s, x) => s + x.value, 0) || 1;

  return (
    <div className={`ops-shell${sidebarOpen ? " sidebar-open" : ""}`}>
      {Toast}
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
          <Link to="/" className="ops-brand-link">
            AutoRent
          </Link>
          <span>{t("dashboard.fleetManagement")}</span>
        </div>

        <Link to="/contractor" className="ops-add-btn" onClick={() => setSidebarOpen(false)}>
          + {t("dashboard.addVehicle")}
        </Link>

        <nav className="ops-nav" aria-label={t("dashboard.title")}>
          {navItems.map((item) => (
            <NavLink
              key={item.label + item.to}
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
            <span key={item.label} className="ops-nav-link is-soon" title={t("dashboard.soon")}>
              <Icon path={item.icon} />
              <span>{item.label}</span>
            </span>
          ))}
        </nav>

        <div className="ops-sidebar-user">
          <span className="ops-avatar" aria-hidden>
            {(user?.fullName || "A").charAt(0).toUpperCase()}
          </span>
          <div>
            <strong>{user?.fullName || t("dashboard.adminUser")}</strong>
            <span>{user?.role === "CONTRACTOR" ? t("nav.fleet") : t("dashboard.adminUser")}</span>
          </div>
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
            <button type="button" className="ops-icon-btn" aria-label={t("nav.notifications")}>
              <Icon path={ICONS.bell} size={18} />
              {data.ops.pendingDocuments > 0 ? (
                <i className="ops-dot" />
              ) : null}
            </button>
            <Link to="/faq" className="ops-icon-btn" aria-label={t("nav.faq")}>
              <Icon path={ICONS.help} size={18} />
            </Link>
            <Link to="/cars" className="ops-icon-btn" aria-label={t("nav.cars")}>
              <Icon path={ICONS.apps} size={18} />
            </Link>
            <Link to="/profile" className="ops-avatar ops-avatar-sm" aria-label={t("nav.profile")}>
              {(user?.fullName || "A").charAt(0).toUpperCase()}
            </Link>
          </div>
        </header>

        <div className="ops-content">
          <div className="ops-grid">
            <section className="ops-card ops-card-revenue">
              <div className="ops-card-head">
                <h2>{t("dashboard.revenueOverview")}</h2>
                <span className="ops-chip">{t("dashboard.thisMonth")}</span>
              </div>
              <div className="ops-chart-wrap">
                <BarChart data={data.revenue.monthly} />
              </div>
              <p className="ops-revenue-total">
                {t("dashboard.revenue")}: <strong>€{data.revenue.total}</strong>
              </p>
            </section>

            <section className="ops-card ops-card-reservations">
              <div className="ops-card-head">
                <h2>{t("nav.reservations")}</h2>
              </div>
              <div className="ops-donut-block">
                <Donut segments={donutSegments} label={t("dashboard.total")} />
                <ul className="ops-legend">
                  {donutSegments.map((s) => {
                    const pct = Math.round((s.value / donutTotal) * 100);
                    return (
                      <li key={s.key}>
                        <span
                          className="ops-swatch"
                          style={{ background: s.color }}
                        />
                        <span>
                          {statusText(s.key)} ({pct}%)
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            <section className="ops-card ops-card-recent">
              <div className="ops-card-head">
                <h2>{t("dashboard.recent")}</h2>
                <Link to="/reservations" className="ops-link">
                  {t("dashboard.viewAll")}
                </Link>
              </div>
              {!filteredRecent.length ? (
                <p className="ops-empty">{t("reservations.empty")}</p>
              ) : (
                <div className="ops-table-wrap">
                  <table className="ops-table">
                    <thead>
                      <tr>
                        <th>{t("dashboard.colId")}</th>
                        <th>{t("dashboard.colCustomer")}</th>
                        <th>{t("dashboard.colVehicle")}</th>
                        <th>{t("dashboard.colDates")}</th>
                        <th>{t("dashboard.colAmount")}</th>
                        <th>{t("dashboard.colStatus")}</th>
                        <th>{t("dashboard.colActions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecent.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <span className="ops-id">{shortId(r.id)}</span>
                          </td>
                          <td>{r.customerName}</td>
                          <td>{r.carLabel}</td>
                          <td className="ops-dates">
                            {formatShort(r.startDate, intlLocale)}
                            <span>→</span>
                            {formatShort(r.endDate, intlLocale)}
                          </td>
                          <td>€{r.totalPrice}</td>
                          <td>
                            <span
                              className={`ops-status status-${r.status.toLowerCase()}`}
                            >
                              {statusText(r.status)}
                            </span>
                          </td>
                          <td>
                            <Link
                              to="/reservations"
                              className="ops-eye"
                              aria-label={t("dashboard.viewAll")}
                            >
                              <Icon path={ICONS.eye} size={16} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="ops-card ops-card-top">
              <div className="ops-card-head">
                <h2>{t("dashboard.topVehicles")}</h2>
              </div>
              {!data.topCars.length ? (
                <p className="ops-empty">{t("reservations.empty")}</p>
              ) : (
                <ul className="ops-top-list">
                  {data.topCars.slice(0, 3).map((c, i) => {
                    const img = c.imageUrl ? mediaUrl(c.imageUrl) : "";
                    return (
                      <li key={c.carId}>
                        <span className={`ops-rank${i === 0 ? " is-first" : ""}`}>
                          {i + 1}
                        </span>
                        <span className="ops-top-thumb">
                          {img ? (
                            <img src={img} alt="" />
                          ) : (
                            <span aria-hidden />
                          )}
                        </span>
                        <div className="ops-top-meta">
                          <strong>{c.label}</strong>
                          <span>
                            {c.count} {t("dashboard.rentals")}
                          </span>
                        </div>
                        <em>€{c.revenue ?? 0}</em>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link to="/contractor" className="ops-fleet-link">
                {t("dashboard.viewFleetPerf")}
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
