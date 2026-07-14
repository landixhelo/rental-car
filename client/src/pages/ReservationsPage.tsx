import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useToast } from "../hooks/useToast";

export default function ReservationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const { show, Toast } = useToast();

  async function load() {
    const res = await api.myReservations();
    setItems(res.reservations);
  }

  useEffect(() => {
    load().catch((e) => show(e.message));
  }, []);

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

  return (
    <div className="section">
      {Toast}
      <h1>Rezervimet e Mia</h1>
      {!items.length && (
        <div className="panel">
          <p>Nuk ke rezervime.</p>
          <Link className="btn" to="/cars">
            Shiko Makinat
          </Link>
        </div>
      )}
      <div className="reservation-list">
        {items.map((r) => (
          <div key={r.id} className="reservation-card">
            <img src={r.car.imageUrl} alt="" />
            <div>
              <h3>
                {r.car.brand} {r.car.model}
              </h3>
              <p className="muted">{r.car.companyName || "AutoRent"}</p>
              <p>
                {String(r.startDate).slice(0, 10)} → {String(r.endDate).slice(0, 10)}
              </p>
              <p>
                {r.pickupLocation} → {r.returnLocation}
              </p>
              <p>
                {r.paymentMethod} · {r.paymentStatus}
              </p>
              <p className="total">€{r.totalPrice}</p>
              <span className={`badge status-${r.status}`}>{r.status}</span>
              {!["CANCELLED", "COMPLETED", "REJECTED"].includes(r.status) && (
                <button className="btn danger" onClick={() => cancel(r.id)}>
                  Anulo
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
