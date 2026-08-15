import { useEffect, useMemo, useState } from "react";
import { useOpsSearch } from "../components/OpsLayout";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { api } from "../lib/api";

type Loc = {
  id: string;
  name: string;
  fee: number;
  pickups: number;
  returns: number;
  revenue: number;
};

export default function LocationsPage() {
  const t = useT();
  const { query } = useOpsSearch();
  const { show } = useToast();
  const [rows, setRows] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .dashboardLocations()
      .then((res) => setRows(res.locations || []))
      .catch((e) => show(e instanceof Error ? e.message : t("common.error")))
      .finally(() => setLoading(false));
  }, [show, t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((l) => l.name.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="ops-page">
      <header className="ops-page-head">
        <div>
          <h1>{t("dashboard.navLocations")}</h1>
          <p>{t("opsPages.locationsSub")}</p>
        </div>
        <span className="ops-page-count">
          {filtered.length} {t("opsPages.locations")}
        </span>
      </header>

      {loading ? (
        <p className="muted">{t("common.loading")}</p>
      ) : !filtered.length ? (
        <div className="ops-empty">{t("opsPages.locationsEmpty")}</div>
      ) : (
        <div className="ops-cards-grid">
          {filtered.map((l) => (
            <article key={l.id} className="ops-info-card">
              <h2>{l.name}</h2>
              <p className="ops-info-fee">
                {t("opsPages.fee")}: <strong>€{l.fee}</strong>
              </p>
              <dl className="ops-info-stats">
                <div>
                  <dt>{t("reservations.pickup")}</dt>
                  <dd>{l.pickups}</dd>
                </div>
                <div>
                  <dt>{t("reservations.return")}</dt>
                  <dd>{l.returns}</dd>
                </div>
                <div>
                  <dt>{t("opsPages.revenue")}</dt>
                  <dd>€{l.revenue}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
