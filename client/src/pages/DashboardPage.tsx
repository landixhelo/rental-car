import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { mediaUrl } from "../lib/mediaUrl";
import { reservationLocation, customerHistoryLocation } from "../lib/returnTo";
import { useOpsSearch } from "../components/OpsLayout";

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
    customerId?: string;
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
  const { query } = useOpsSearch();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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
    const order = [
      "CONFIRMED",
      "PENDING",
      "COMPLETED",
      "CANCELLED",
      "REJECTED",
    ];
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

  if (loading) {
    return (
      <>
        {Toast}
        <p className="ops-empty">{t("common.loading")}</p>
      </>
    );
  }

  if (!data) {
    return (
      <>
        {Toast}
        <p className="ops-empty">{t("common.error")}</p>
      </>
    );
  }

  const donutTotal = donutSegments.reduce((s, x) => s + x.value, 0) || 1;

  return (
    <>
      {Toast}
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
                      <td>
                        {r.customerId ? (
                          <Link
                            to={customerHistoryLocation(
                              r.customerId,
                              "/dashboard"
                            )}
                          >
                            {r.customerName}
                          </Link>
                        ) : (
                          r.customerName
                        )}
                      </td>
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
                          to={reservationLocation(r.id, "/dashboard")}
                          className="ops-eye"
                          aria-label={t("reservations.viewDetails")}
                        >
                          →
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
                      {img ? <img src={img} alt="" /> : <span aria-hidden />}
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
    </>
  );
}
