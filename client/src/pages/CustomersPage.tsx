import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOpsSearch } from "../components/OpsLayout";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { api } from "../lib/api";
import { formatShortDate } from "../lib/bookingDraft";
import { reservationLocation } from "../lib/returnTo";

type Customer = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  memberSince: string;
  bookings: number;
  revenue: number;
  lastBookingId: string;
  lastCar: string;
  lastStart: string;
  lastEnd: string;
  lastStatus: string;
};

export default function CustomersPage() {
  const t = useT();
  const { locale } = useLocale();
  const { query } = useOpsSearch();
  const { show } = useToast();
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .dashboardCustomers()
      .then((res) => setRows(res.customers || []))
      .catch((e) => show(e instanceof Error ? e.message : t("common.error")))
      .finally(() => setLoading(false));
  }, [show, t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        c.lastCar.toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <div className="ops-page">
      <header className="ops-page-head">
        <div>
          <h1>{t("dashboard.navCustomers")}</h1>
          <p>{t("opsPages.customersSub")}</p>
        </div>
        <span className="ops-page-count">
          {filtered.length} {t("opsPages.customers")}
        </span>
      </header>

      {loading ? (
        <p className="muted">{t("common.loading")}</p>
      ) : !filtered.length ? (
        <div className="ops-empty">{t("opsPages.customersEmpty")}</div>
      ) : (
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>{t("checkout.fullName")}</th>
                <th>{t("checkout.email")}</th>
                <th>{t("checkout.phone")}</th>
                <th>{t("opsPages.bookings")}</th>
                <th>{t("opsPages.revenue")}</th>
                <th>{t("opsPages.lastBooking")}</th>
                <th className="ops-table-actions">{t("reservations.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/customers/${c.id}`}>
                      <strong>{c.fullName}</strong>
                    </Link>
                  </td>
                  <td>
                    <a href={`mailto:${c.email}`}>{c.email}</a>
                  </td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.bookings}</td>
                  <td>€{c.revenue}</td>
                  <td>
                    {c.lastBookingId ? (
                      <Link
                        to={reservationLocation(c.lastBookingId, "/customers")}
                      >
                        {c.lastCar}
                      </Link>
                    ) : (
                      c.lastCar || "—"
                    )}
                    <div className="muted ops-table-sub">
                      {formatShortDate(c.lastStart, locale)} →{" "}
                      {formatShortDate(c.lastEnd, locale)} ·{" "}
                      {t(`status.${c.lastStatus}`)}
                    </div>
                  </td>
                  <td className="ops-table-actions">
                    <Link to={`/customers/${c.id}`} className="btn">
                      {t("opsPages.viewHistory")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
