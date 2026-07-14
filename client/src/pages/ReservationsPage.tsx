import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
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
    if (!confirm("Anulo rezervimin?")) return;
    try {
      await api.cancelReservation(id);
      show("U anulua");
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : "Error");
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api.updateReservationStatus(id, status);
      show("Statusi u ndryshua");
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="section">
      {Toast}
      {isFleetManager ? (
        <>
          <div className="row-between" style={{ alignItems: "center" }}>
            <div>
              <h1 style={{ marginBottom: 6 }}>Rezervimet e klientëve</h1>
              <p className="muted" style={{ margin: 0 }}>
                Rezervimet për makinat e flotës sate
              </p>
            </div>
            <button className="btn ghost" type="button" onClick={() => load()}>
              Rifresko
            </button>
          </div>

          {loading ? (
            <p className="muted">Duke u ngarkuar...</p>
          ) : !items.length ? (
            <div className="panel" style={{ marginTop: 18 }}>
              <p>Nuk ka ende rezervime nga klientët për makinat e tua.</p>
              <Link className="btn" to="/contractor">
                Menaxho flotën
              </Link>
            </div>
          ) : (
            <div className="reservation-list" style={{ marginTop: 18 }}>
              {items.map((r) => (
                <div key={r.id} className="reservation-card fleet-reservation-card">
                  {r.car?.imageUrl ? (
                    <img src={r.car.imageUrl} alt="" />
                  ) : (
                    <div className="fleet-reservation-fallback" />
                  )}
                  <div>
                    <div className="row-between">
                      <h3>
                        {r.car?.brand} {r.car?.model}
                      </h3>
                      <span className={`badge status-${r.status}`}>
                        {r.status}
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
                      Ndrysho statusin
                      <select
                        value={r.status}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
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
          <h1>Rezervimet e Mia</h1>
          {loading ? (
            <p className="muted">Duke u ngarkuar...</p>
          ) : !items.length ? (
            <div className="panel">
              <p>Nuk ke rezervime.</p>
              <Link className="btn" to="/cars">
                Shiko Makinat
              </Link>
            </div>
          ) : (
            <div className="reservation-list">
              {items.map((r) => (
                <div key={r.id} className="reservation-card">
                  <img src={r.car.imageUrl} alt="" />
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
                    <span className={`badge status-${r.status}`}>{r.status}</span>
                    {!["CANCELLED", "COMPLETED", "REJECTED"].includes(
                      r.status
                    ) && (
                      <button
                        className="btn danger"
                        onClick={() => cancel(r.id)}
                      >
                        Anulo
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
