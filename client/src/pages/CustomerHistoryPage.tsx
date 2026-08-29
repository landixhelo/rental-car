import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useOpsSearch } from "../components/OpsLayout";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { api } from "../lib/api";
import {
  formatReservationCode,
  formatShortDate,
} from "../lib/bookingDraft";
import { mediaUrl } from "../lib/mediaUrl";
import {
  backLabelKey,
  readReturnTo,
  reservationLocation,
} from "../lib/returnTo";

type CustomerHistory = Awaited<ReturnType<typeof api.dashboardCustomer>>;

function isPlaceholderGuestEmail(email?: string | null) {
  return Boolean(email?.toLowerCase().endsWith("@guest.viaegnatia.al"));
}

export default function CustomerHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const t = useT();
  const { locale } = useLocale();
  const { query } = useOpsSearch();
  const { show } = useToast();
  const navigate = useNavigate();
  const backTo = readReturnTo(location, "/customers");
  const [data, setData] = useState<CustomerHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .dashboardCustomer(id)
      .then(setData)
      .catch((e) => {
        show(e instanceof Error ? e.message : t("common.error"));
        navigate(backTo, { replace: true });
      })
      .finally(() => setLoading(false));
  }, [id, navigate, show, t]);

  const filtered = useMemo(() => {
    const rows = data?.reservations || [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const car = `${r.car.brand} ${r.car.model}`.toLowerCase();
      const status = t(`status.${r.status}`).toLowerCase();
      return (
        car.includes(q) ||
        status.includes(q) ||
        r.pickupLocation.toLowerCase().includes(q) ||
        r.returnLocation.toLowerCase().includes(q)
      );
    });
  }, [data, query, t]);

  if (loading || !data) {
    return (
      <div className="ops-page">
        <p className="muted">{t("common.loading")}</p>
      </div>
    );
  }

  const { customer } = data;
  const showEmail = customer.email && !isPlaceholderGuestEmail(customer.email);

  return (
    <div className="ops-page">
      <header className="ops-page-head">
        <div>
          <Link to={backTo} className="rental-detail-back">
            ← {t(backLabelKey(backTo))}
          </Link>
          <h1>{customer.fullName}</h1>
          <p>{t("opsPages.historySub")}</p>
          <p className="ops-customer-contact">
            {showEmail ? (
              <a href={`mailto:${customer.email}`}>{customer.email}</a>
            ) : null}
            {customer.phone ? (
              <a href={`tel:${customer.phone}`}>{customer.phone}</a>
            ) : null}
            <span>
              {t("opsPages.memberSince")}{" "}
              {formatShortDate(customer.memberSince, locale)}
            </span>
          </p>
        </div>
        <div className="ops-page-metrics">
          <span className="ops-page-count">
            {filtered.length} {t("opsPages.bookings")}
          </span>
          <span className="ops-page-avg">
            €{customer.revenue} {t("opsPages.revenue")}
          </span>
        </div>
      </header>

      {!filtered.length ? (
        <div className="ops-empty">{t("opsPages.historyEmpty")}</div>
      ) : (
        <div className="reservation-list">
          {filtered.map((r) => {
            const code = formatReservationCode(r.id, r.createdAt);
            const carLabel = `${r.car.brand} ${r.car.model}`;
            return (
              <article
                key={r.id}
                className="reservation-card fleet-reservation-card"
              >
                <div className="reservation-card-media">
                  {r.car.imageUrl ? (
                    <img src={mediaUrl(r.car.imageUrl)} alt={carLabel} />
                  ) : (
                    <div className="fleet-reservation-fallback" />
                  )}
                </div>
                <div className="reservation-card-body">
                  <div className="reservation-card-head">
                    <div>
                      <h3>{carLabel}</h3>
                      <p className="muted">
                        {t("reservations.reservationCode")}: {code}
                        {r.car.year ? ` · ${r.car.year}` : ""}
                      </p>
                    </div>
                    <span className={`badge status-${r.status}`}>
                      {t(`status.${r.status}`)}
                    </span>
                  </div>
                  <dl className="reservation-meta">
                    <div>
                      <dt>{t("reservations.dates")}</dt>
                      <dd>
                        {formatShortDate(r.startDate, locale)} →{" "}
                        {formatShortDate(r.endDate, locale)}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("reservations.route")}</dt>
                      <dd>
                        {r.pickupLocation} → {r.returnLocation}
                      </dd>
                    </div>
                  </dl>
                  <p className="total">€{r.totalPrice}</p>
                  <div className="reservation-actions">
                    <Link
                      to={
                        id
                          ? reservationLocation(r.id, `/customers/${id}`)
                          : `/reservations/${r.id}`
                      }
                      className="btn"
                    >
                      {t("reservations.viewDetails")}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
