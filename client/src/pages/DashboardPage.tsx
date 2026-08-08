import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";

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
  topCars: Array<{ carId: string; label: string; count: number }>;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#10b981",
  COMPLETED: "#3b82f6",
  CANCELLED: "#94a3b8",
  REJECTED: "#ef4444",
};

function Donut({
  segments,
}: {
  segments: Array<{ key: string; value: number; color: string }>;
}) {
  const sum = segments.reduce((s, x) => s + x.value, 0);
  const total = sum || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 120 120" className="dash-donut" aria-hidden>
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth="14"
      />
      {segments.map((seg) => {
        const len = (seg.value / total) * c;
        const el = (
          <circle
            key={seg.key}
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="14"
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 60 60)"
          />
        );
        offset += len;
        return el;
      })}
      <text
        x="60"
        y="56"
        textAnchor="middle"
        className="dash-donut-total"
        fill="currentColor"
        fontSize="16"
        fontWeight="700"
      >
        {sum}
      </text>
      <text
        x="60"
        y="72"
        textAnchor="middle"
        fill="var(--text-muted)"
        fontSize="8"
      >
        total
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
  const w = 320;
  const h = 120;
  const pad = 8;
  const barW = (w - pad * 2) / data.length - 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="dash-bars" aria-hidden>
      {data.map((d, i) => {
        const bh = ((d.total / max) * (h - 28)) || 0;
        const x = pad + i * ((w - pad * 2) / data.length) + 2;
        const y = h - 18 - bh;
        return (
          <g key={d.month}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={bh}
              rx="3"
              fill={i === data.length - 1 ? "var(--accent)" : "var(--accent-soft)"}
            />
            <text
              x={x + barW / 2}
              y={h - 4}
              textAnchor="middle"
              fontSize="7"
              fill="var(--text-muted)"
            >
              {d.month.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const t = useT();
  const { show, Toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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
    return Object.entries(data.reservations.byStatus).map(([key, value]) => ({
      key,
      value,
      color: STATUS_COLORS[key] || "#64748b",
    }));
  }, [data]);

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
      <div className="section">
        {Toast}
        <p className="muted">{t("common.loading")}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="section">
        {Toast}
        <p className="muted">{t("common.error")}</p>
      </div>
    );
  }

  return (
    <div className="section dashboard">
      {Toast}
      <div className="row-between" style={{ alignItems: "flex-end", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>{t("dashboard.title")}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {data.scope === "fleet"
              ? t("dashboard.scopeFleet")
              : t("dashboard.scopePlatform")}
          </p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn ghost" to="/reservations">
            {t("nav.reservations")}
          </Link>
          <Link className="btn" to="/contractor">
            {t("nav.fleet")}
          </Link>
        </div>
      </div>

      <div className="dash-kpi">
        <div className="dash-kpi-card">
          <p>{t("dashboard.cars")}</p>
          <h2>{data.fleet.total}</h2>
        </div>
        <div className="dash-kpi-card">
          <p>{t("dashboard.activeBookings")}</p>
          <h2>{data.reservations.active}</h2>
        </div>
        <div className="dash-kpi-card">
          <p>{t("dashboard.revenue")}</p>
          <h2>€{data.revenue.total}</h2>
        </div>
        <div className="dash-kpi-card">
          <p>{t("dashboard.availability")}</p>
          <h2>{data.fleet.availabilityPct}%</h2>
        </div>
      </div>

      <div className="dash-grid">
        <div className="panel dash-panel">
          <h3>{t("dashboard.reservationStatus")}</h3>
          <div className="dash-donut-wrap">
            <Donut segments={donutSegments} />
            <ul className="dash-legend">
              {donutSegments.map((s) => (
                <li key={s.key}>
                  <span
                    className="dash-swatch"
                    style={{ background: s.color }}
                  />
                  {statusText(s.key)}
                  <strong>{s.value}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="panel dash-panel">
          <h3>{t("dashboard.monthlyRevenue")}</h3>
          <BarChart data={data.revenue.monthly} />
        </div>

        <div className="panel dash-panel">
          <h3>{t("dashboard.fleetBreakdown")}</h3>
          <div className="dash-fleet-bars">
            {(
              [
                ["available", data.fleet.available, "#10b981"],
                ["reserved", data.fleet.reserved, "#f59e0b"],
                ["maintenance", data.fleet.maintenance, "#ef4444"],
              ] as const
            ).map(([key, value, color]) => {
              const pct =
                data.fleet.total === 0
                  ? 0
                  : Math.round((value / data.fleet.total) * 100);
              return (
                <div key={key} className="dash-fleet-row">
                  <span>{t(`dashboard.${key}`)}</span>
                  <div className="dash-fleet-track">
                    <div
                      className="dash-fleet-fill"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <strong>{value}</strong>
                </div>
              );
            })}
          </div>
          <div className="dash-ops">
            <p>
              {t("dashboard.pendingDocs")}:{" "}
              <strong>{data.ops.pendingDocuments}</strong>
            </p>
            <p>
              {t("dashboard.heldDeposits")}:{" "}
              <strong>{data.ops.heldDeposits}</strong>
            </p>
          </div>
        </div>

        <div className="panel dash-panel dash-panel-wide">
          <div className="row-between">
            <h3>{t("dashboard.recent")}</h3>
            <Link to="/reservations">{t("dashboard.viewAll")}</Link>
          </div>
          {!data.recent.length ? (
            <p className="muted">{t("reservations.empty")}</p>
          ) : (
            <ul className="dash-feed">
              {data.recent.map((r) => (
                <li key={r.id}>
                  <div>
                    <strong>{r.carLabel}</strong>
                    <span className="muted">
                      {" "}
                      · {r.customerName} · {r.startDate} → {r.endDate}
                    </span>
                  </div>
                  <div className="dash-feed-meta">
                    <span className={`badge status-${r.status}`}>
                      {statusText(r.status)}
                    </span>
                    <strong>€{r.totalPrice}</strong>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel dash-panel">
          <h3>{t("dashboard.topCars")}</h3>
          {!data.topCars.length ? (
            <p className="muted">{t("reservations.empty")}</p>
          ) : (
            <ul className="dash-top-cars">
              {data.topCars.map((c, i) => (
                <li key={c.carId}>
                  <span className="dash-rank">{i + 1}</span>
                  <span>{c.label}</span>
                  <strong>{c.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
