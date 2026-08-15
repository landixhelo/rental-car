import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOpsSearch } from "../components/OpsLayout";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { api } from "../lib/api";
import { formatShortDate } from "../lib/bookingDraft";
import { mediaUrl } from "../lib/mediaUrl";
import { carPath } from "../lib/carPath";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userName: string;
  userEmail: string;
  carId: string;
  carLabel: string;
  carYear: number;
  carImage: string;
};

export default function ReviewsPage() {
  const t = useT();
  const { locale } = useLocale();
  const { query } = useOpsSearch();
  const { show } = useToast();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [average, setAverage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .dashboardReviews()
      .then((res) => {
        setRows(res.reviews || []);
        setAverage(res.average || 0);
      })
      .catch((e) => show(e instanceof Error ? e.message : t("common.error")))
      .finally(() => setLoading(false));
  }, [show, t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.userName.toLowerCase().includes(q) ||
        r.carLabel.toLowerCase().includes(q) ||
        (r.comment || "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div className="ops-page">
      <header className="ops-page-head">
        <div>
          <h1>{t("dashboard.navReviews")}</h1>
          <p>{t("opsPages.reviewsSub")}</p>
        </div>
        <div className="ops-page-metrics">
          <span className="ops-page-count">
            {filtered.length} {t("opsPages.reviews")}
          </span>
          <span className="ops-page-avg">
            ★ {average.toFixed(1)} {t("opsPages.avgRating")}
          </span>
        </div>
      </header>

      {loading ? (
        <p className="muted">{t("common.loading")}</p>
      ) : !filtered.length ? (
        <div className="ops-empty">{t("opsPages.reviewsEmpty")}</div>
      ) : (
        <div className="ops-review-list">
          {filtered.map((r) => (
            <article key={r.id} className="ops-review-card">
              <div className="ops-review-media">
                {r.carImage ? (
                  <img src={mediaUrl(r.carImage)} alt={r.carLabel} />
                ) : (
                  <div className="fleet-reservation-fallback" />
                )}
              </div>
              <div className="ops-review-body">
                <div className="ops-review-top">
                  <div>
                    <Link to={carPath({ id: r.carId })}>
                      <strong>
                        {r.carLabel} · {r.carYear}
                      </strong>
                    </Link>
                    <p className="muted">
                      {r.userName}
                      {r.userEmail ? ` · ${r.userEmail}` : ""}
                    </p>
                  </div>
                  <span className="ops-review-stars" aria-label={`${r.rating}/5`}>
                    {"★".repeat(r.rating)}
                    {"☆".repeat(Math.max(0, 5 - r.rating))}
                  </span>
                </div>
                {r.comment ? <p className="ops-review-comment">{r.comment}</p> : null}
                <p className="muted ops-table-sub">
                  {formatShortDate(r.createdAt.slice(0, 10), locale)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
