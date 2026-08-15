import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { api } from "../lib/api";
import { mediaUrl } from "../lib/mediaUrl";

type Dash = Awaited<ReturnType<typeof api.dashboard>>;

export default function ReportsPage() {
  const t = useT();
  const { show } = useToast();
  const [data, setData] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .dashboard()
      .then(setData)
      .catch((e) => show(e instanceof Error ? e.message : t("common.error")))
      .finally(() => setLoading(false));
  }, [show, t]);

  if (loading || !data) {
    return (
      <div className="ops-page">
        <p className="muted">{t("common.loading")}</p>
      </div>
    );
  }

  const maxMonth = Math.max(
    1,
    ...data.revenue.monthly.map((m) => m.total)
  );

  return (
    <div className="ops-page">
      <header className="ops-page-head">
        <div>
          <h1>{t("dashboard.navReports")}</h1>
          <p>{t("opsPages.reportsSub")}</p>
        </div>
        <Link to="/dashboard" className="btn ghost">
          {t("nav.dashboard")}
        </Link>
      </header>

      <div className="ops-report-kpis">
        <article>
          <span>{t("opsPages.revenue")}</span>
          <strong>€{data.revenue.total}</strong>
        </article>
        <article>
          <span>{t("nav.reservations")}</span>
          <strong>{data.reservations.total}</strong>
        </article>
        <article>
          <span>{t("opsPages.activeBookings")}</span>
          <strong>{data.reservations.active}</strong>
        </article>
        <article>
          <span>{t("nav.fleet")}</span>
          <strong>
            {data.fleet.available}/{data.fleet.total}
          </strong>
        </article>
      </div>

      <section className="ops-report-panel">
        <h2>{t("opsPages.monthlyRevenue")}</h2>
        <div className="ops-report-bars">
          {data.revenue.monthly.map((m) => (
            <div key={m.month} className="ops-report-bar">
              <div
                className="ops-report-bar-fill"
                style={{ height: `${Math.max(6, (m.total / maxMonth) * 100)}%` }}
                title={`€${m.total}`}
              />
              <span>{m.month.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ops-report-panel">
        <h2>{t("opsPages.topVehicles")}</h2>
        {!data.topCars.length ? (
          <p className="muted">{t("opsPages.reportsEmpty")}</p>
        ) : (
          <ul className="ops-report-top">
            {data.topCars.map((c) => (
              <li key={c.carId}>
                {c.imageUrl ? (
                  <img src={mediaUrl(c.imageUrl)} alt="" />
                ) : (
                  <span className="ops-report-top-fallback" />
                )}
                <div>
                  <strong>{c.label}</strong>
                  <span className="muted">
                    {c.count} {t("dashboard.rentals")}
                    {c.revenue != null ? ` · €${c.revenue}` : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ops-report-panel">
        <h2>{t("opsPages.statusBreakdown")}</h2>
        <div className="ops-report-status">
          {Object.entries(data.reservations.byStatus).map(([status, count]) => (
            <div key={status}>
              <span>{t(`status.${status}`)}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
