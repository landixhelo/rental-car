import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { mediaUrl } from "../lib/mediaUrl";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
] as const;

export default function ReservationsPage() {
  const { user } = useAuth();
  const t = useT();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { show, Toast } = useToast();

  const showReservationAlerts =
    user?.role === "CONTRACTOR" || user?.role === "SUPER_ADMIN";

  const isFleetManager =
    user?.role === "CONTRACTOR" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN";

  async function load() {
    setLoading(true);
    try {
      if (isFleetManager) {
        const res = await api.fleetReservations();
        setItems(res.reservations || []);
      } else {
        const res = await api.myReservations();
        setItems(res.reservations || []);
      }

      if (showReservationAlerts) {
        await api.markReservationNotificationsRead().catch(() => {});
        window.dispatchEvent(new Event("autorent:reservations-seen"));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    load().catch((e) => show(e.message));
  }, [user?.id, user?.role]);

  async function cancel(id: string) {
    if (!confirm(t("reservations.cancel") + "?")) return;
    try {
      await api.cancelReservation(id);
      show(t("status.CANCELLED"));
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : t("common.error"));
    }
  }

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

  async function updateStatus(id: string, status: string) {
    try {
      await api.updateReservationStatus(id, status);
      show(statusText(status));
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : t("common.error"));
    }
  }

  return (
    <div className="section">
      {Toast}
      {isFleetManager ? (
        <>
          <div className="row-between" style={{ alignItems: "center" }}>
            <div>
              <h1 style={{ marginBottom: 6 }}>{t("reservations.fleet")}</h1>
            </div>
            <button className="btn ghost" type="button" onClick={() => load()}>
              ↻
            </button>
          </div>

          {loading ? (
            <p className="muted">{t("common.loading")}</p>
          ) : !items.length ? (
            <div className="panel" style={{ marginTop: 18 }}>
              <p>{t("reservations.empty")}</p>
              <Link className="btn" to="/contractor">
                {t("nav.fleet")}
              </Link>
            </div>
          ) : (
            <div className="reservation-list" style={{ marginTop: 18 }}>
              {items.map((r) => (
                <div key={r.id} className="reservation-card fleet-reservation-card">
                  {r.car?.imageUrl ? (
                    <img src={mediaUrl(r.car.imageUrl)} alt="" />
                  ) : (
                    <div className="fleet-reservation-fallback" />
                  )}
                  <div>
                    <div className="row-between">
                      <h3>
                        {r.car?.brand} {r.car?.model}
                      </h3>
                      <span className={`badge status-${r.status}`}>
                        {statusText(r.status)}
                      </span>
                    </div>
                    <p>
                      <strong>{r.user?.fullName}</strong>
                      {r.user?.email ? ` · ${r.user.email}` : ""}
                      {r.user?.phone ? ` · ${r.user.phone}` : ""}
                    </p>
                    <p>
                      {String(r.startDate).slice(0, 10)} →{" "}
                      {String(r.endDate).slice(0, 10)}
                    </p>
                    <p>
                      {r.pickupLocation} → {r.returnLocation}
                    </p>
                    <p className="total">€{r.totalPrice}</p>
                    <label className="fleet-status-label">
                      {t("reservations.status")}
                      <select
                        value={r.status}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {t(`status.${s}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <h1>{t("reservations.mine")}</h1>
          {loading ? (
            <p className="muted">{t("common.loading")}</p>
          ) : !items.length ? (
            <div className="panel">
              <p>{t("reservations.empty")}</p>
              <Link className="btn" to="/cars">
                {t("nav.cars")}
              </Link>
            </div>
          ) : (
            <div className="reservation-list">
              {items.map((r) => (
                <div key={r.id} className="reservation-card">
                  <img src={mediaUrl(r.car.imageUrl)} alt={t("details.noPhoto")} />
                  <div>
                    <h3>
                      {r.car.brand} {r.car.model}
                    </h3>
                    <span className="company-chip">
                      {r.car.companyName || "AutoRent"}
                    </span>
                    <p>
                      {String(r.startDate).slice(0, 10)} →{" "}
                      {String(r.endDate).slice(0, 10)}
                    </p>
                    <p>
                      {r.pickupLocation} → {r.returnLocation}
                    </p>
                    <p>
                      {r.paymentMethod} · {r.paymentStatus}
                    </p>
                    <p className="total">€{r.totalPrice}</p>
                    <span className={`badge status-${r.status}`}>
                      {statusText(r.status)}
                    </span>
                    {!["CANCELLED", "COMPLETED", "REJECTED"].includes(
                      r.status
                    ) && (
                      <button
                        className="btn danger"
                        onClick={() => cancel(r.id)}
                      >
                        {t("reservations.cancel")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
