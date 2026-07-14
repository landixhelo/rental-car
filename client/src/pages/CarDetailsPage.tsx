import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Car } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import { API_URL } from "../lib/api";

export default function CarDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { show, Toast } = useToast();
  const [car, setCar] = useState<Car | null>(null);
  const [meta, setMeta] = useState<{
    locations: Array<{ id: string; name: string; fee: number }>;
    extras: Array<{ id: string; name: string; price: number }>;
  } | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pickup, setPickup] = useState("tirane");
  const [ret, setRet] = useState("tirane");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([api.car(id), api.meta()])
      .then(([carRes, metaRes]) => {
        setCar(carRes.car);
        setMeta(metaRes);
      })
      .catch((e) => show(e.message));
  }, [id]);

  const summary = useMemo(() => {
    if (!car || !meta || !startDate || !endDate) {
      return { days: 0, carSubtotal: 0, extrasTotal: 0, locationFees: 0, total: 0 };
    }
    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (days <= 0) {
      return { days: 0, carSubtotal: 0, extrasTotal: 0, locationFees: 0, total: 0 };
    }
    const carSubtotal = days * car.pricePerDay;
    const extrasTotal = meta.extras
      .filter((e) => selectedExtras.includes(e.id))
      .reduce((s, e) => s + e.price * days, 0);
    const locationFees =
      (meta.locations.find((l) => l.id === pickup)?.fee || 0) +
      (meta.locations.find((l) => l.id === ret)?.fee || 0);
    return {
      days,
      carSubtotal,
      extrasTotal,
      locationFees,
      total: carSubtotal + extrasTotal + locationFees,
    };
  }, [car, meta, startDate, endDate, selectedExtras, pickup, ret]);

  const dateConflict = useMemo(() => {
    if (!car || !startDate || !endDate) return null;
    if (new Date(endDate) <= new Date(startDate)) {
      return "Data e mbarimit duhet të jetë pas fillimit.";
    }
    if (car.status === "MAINTENANCE") {
      return "Makina është në mirëmbajtje dhe nuk mund të rezervohet.";
    }
    const hit = (car.busyRanges || []).find((range) => {
      return startDate <= range.endDate && endDate >= range.startDate;
    });
    if (hit) {
      return `Makina është e rezervuar nga ${hit.startDate} deri ${hit.endDate}. Zgjidh data që nuk përputhen.`;
    }
    return null;
  }, [car, startDate, endDate]);

  const canReserve = Boolean(startDate && endDate && !dateConflict);

  async function onReserve(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      show("Duhet të identifikoheni");
      navigate("/login");
      return;
    }
    if (!id) return;
    if (dateConflict) {
      show(dateConflict);
      return;
    }

    try {
      await fetch(`${API_URL}/api/reservations`, {
        method: "POST",
        credentials: "include",
        body: (() => {
          const fd = new FormData();
          fd.append("carId", id);
          fd.append("startDate", startDate);
          fd.append("endDate", endDate);
          fd.append("pickupLocationId", pickup);
          fd.append("returnLocationId", ret);
          fd.append("paymentMethod", paymentMethod);
          if (notes) fd.append("notes", notes);
          selectedExtras.forEach((x) => fd.append("extras", x));
          if (documentFile) fd.append("document", documentFile);
          return fd;
        })(),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Reservation failed");
        return data;
      });
      show("Rezervimi u krye!");
      navigate("/reservations");
    } catch (err) {
      show(err instanceof Error ? err.message : "Error");
    }
  }

  async function onReview(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      await api.addReview({
        carId: id,
        rating: Number(rating),
        comment,
      });
      const refreshed = await api.car(id);
      setCar(refreshed.car);
      setComment("");
      show("Vlerësimi u shtua!");
    } catch (err) {
      show(err instanceof Error ? err.message : "Error");
    }
  }

  async function toggleFavorite() {
    if (!car) return;
    if (!user) {
      show("Duhet të identifikoheni");
      return;
    }
    if (car.isFavorite) await api.removeFavorite(car.id);
    else await api.addFavorite(car.id);
    const refreshed = await api.car(car.id);
    setCar(refreshed.car);
  }

  if (!car || !meta) return <div className="section">Duke u ngarkuar...</div>;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="section details-grid">
      {Toast}
      <div>
        <img className="detail-image" src={car.imageUrl} alt={car.brand} />
        <div className="specs">
          <div><strong>{car.seats}</strong><span>Vende</span></div>
          <div><strong>{car.fuel}</strong><span>Karburant</span></div>
          <div><strong>{car.transmission}</strong><span>Transmision</span></div>
          <div><strong>{car.doors}</strong><span>Dyer</span></div>
          <div><strong>{car.luggage}</strong><span>Bagazhe</span></div>
          <div><strong>{car.horsepower || "-"}</strong><span>HP</span></div>
        </div>
        <div className="chips">
          <span>Ngjyra: {car.color || "-"}</span>
          <span>Km: {car.mileage || "-"}</span>
          <span>Vendndodhja: {car.location}</span>
          <span
            className={`status-chip status-${(car.status || "AVAILABLE").toLowerCase()}`}
          >
            {car.status === "RESERVED"
              ? car.reservedUntil
                ? `RESERVED · deri ${car.reservedUntil}`
                : "RESERVED"
              : car.status || "AVAILABLE"}
          </span>
        </div>
        <div className="panel">
          <h3>Pajisjet</h3>
          <ul className="features-list">
            {(car.features || []).map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
        </div>

        <form className="panel reviews-panel" onSubmit={onReview}>
          <h3>Komentet e klientëve</h3>
          <div className="reviews">
            {(car.reviews || []).length ? (
              (car.reviews || []).map((r) => (
                <div key={r.id} className="review-item">
                  <strong>
                    {r.userName} · ⭐ {r.rating}
                  </strong>
                  <p>{r.comment || "Pa koment"}</p>
                </div>
              ))
            ) : (
              <p className="muted">Nuk ka komente ende.</p>
            )}
          </div>
          <h4 className="review-form-title">Lëre vlerësimin tënd</h4>
          <select value={rating} onChange={(e) => setRating(e.target.value)}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} ⭐
              </option>
            ))}
          </select>
          <textarea
            placeholder="Si ishte përvoja?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button className="btn" type="submit">
            Dërgo Vlerësimin
          </button>
        </form>
      </div>

      <div>
        <div className="row-between">
          <div>
            <h1>
              {car.brand} {car.model}
            </h1>
            <div className="company-badge">
              <span className="company-badge-label">Kompania</span>
              <strong>{car.companyName || "AutoRent"}</strong>
            </div>
            <p className="muted">
              {car.year} · ⭐ {car.ratingAvg || "-"} ({car.ratingCount || 0})
            </p>
          </div>
          <div className="price-box">
            <button className={`fav-btn detail ${car.isFavorite ? "active" : ""}`} onClick={toggleFavorite}>
              ♥
            </button>
            <h2>€{car.pricePerDay}</h2>
            <span>/ditë</span>
          </div>
        </div>
        <p className="detail-desc">{car.description}</p>

        <form className="panel booking" onSubmit={onReserve}>
          <h3>Rezervo Tani</h3>
          {(car.busyRanges || []).length > 0 ? (
            <div className="busy-ranges">
              <p className="busy-ranges-title">Periudha të rezervuara</p>
              <ul>
                {(car.busyRanges || []).map((range) => (
                  <li key={`${range.startDate}-${range.endDate}`}>
                    {range.startDate} → {range.endDate}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="two-col">
            <label>
              Fillimi
              <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </label>
            <label>
              Mbarimi
              <input type="date" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </label>
          </div>
          {dateConflict ? (
            <p className="booking-conflict">{dateConflict}</p>
          ) : null}          <div className="two-col">
            <label>
              Pickup
              <select value={pickup} onChange={(e) => setPickup(e.target.value)}>
                {meta.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.fee ? `(+€${l.fee})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Return
              <select value={ret} onChange={(e) => setRet(e.target.value)}>
                {meta.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.fee ? `(+€${l.fee})` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="extras">
            <h4 className="extras-title">Opsione shtesë</h4>
            <div className="extras-grid">
              {meta.extras.map((ex) => {
                const checked = selectedExtras.includes(ex.id);
                return (
                  <label
                    key={ex.id}
                    className={`extra-item${checked ? " selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedExtras((prev) =>
                          e.target.checked
                            ? [...prev, ex.id]
                            : prev.filter((x) => x !== ex.id)
                        );
                      }}
                    />
                    <span className="extra-check" aria-hidden="true" />
                    <span className="extra-copy">
                      <span className="extra-name">{ex.name}</span>
                      <span className="extra-price">+€{ex.price}/ditë</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <label>
            Pagesa
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="CASH">Cash në marrje</option>
              <option value="BANK_TRANSFER">Transfer bankar</option>
              <option value="CARD">Kartë (simulim)</option>
            </select>
          </label>

          <label>
            Dokumente (patentë/ID)
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
            />
          </label>

          <label>
            Shënime
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <div className="summary">
            <p>Ditë: {summary.days}</p>
            <p>Makina: €{summary.carSubtotal}</p>
            <p>Extras: €{summary.extrasTotal}</p>
            <p>Lokacione: €{summary.locationFees}</p>
            <p className="total">Totali: €{summary.total}</p>
          </div>

          <button className="btn" type="submit" disabled={!canReserve}>
            {dateConflict ? "Data nuk janë të lira" : "Konfirmo Rezervimin"}
          </button>
        </form>
      </div>
    </div>
  );
}
