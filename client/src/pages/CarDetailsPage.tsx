import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Car } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import ImageCarousel from "../components/ImageCarousel";
import Seo from "../seo/Seo";
import { breadcrumbJsonLd, carProductJsonLd } from "../seo/jsonLd";
import { mediaUrl } from "../lib/mediaUrl";
import { carPath } from "../lib/carPath";

export default function CarDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const { locale } = useLocale();
  const { show, Toast } = useToast();
  const [car, setCar] = useState<Car | null>(null);
  const [meta, setMeta] = useState<{
    locations: Array<{ id: string; name: string; fee: number }>;
    extras: Array<{ id: string; name: string; price: number }>;
    cardEnabled?: boolean;
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
        const pretty = carRes.car.slug;
        if (pretty && id !== pretty) {
          navigate(carPath(carRes.car), { replace: true });
        }
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
      return t("details.conflict");
    }
    if (car.status === "MAINTENANCE") {
      return t("status.MAINTENANCE");
    }
    // Half-open [start, end): pickup on a return day is allowed.
    const hit = (car.busyRanges || []).find((range) => {
      return startDate < range.endDate && endDate > range.startDate;
    });
    if (hit) {
      return `${t("details.conflict")} (${hit.startDate} – ${hit.endDate})`;
    }
    return null;
  }, [car, startDate, endDate, t]);

  const canReserve = Boolean(startDate && endDate && !dateConflict);

  async function onReserve(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      show(t("common.requiredLogin"));
      navigate("/login");
      return;
    }
    if (!car) return;
    if (dateConflict) {
      show(dateConflict);
      return;
    }

    try {
      const fd = new FormData();
      fd.append("carId", car.id);
      fd.append("startDate", startDate);
      fd.append("endDate", endDate);
      fd.append("pickupLocationId", pickup);
      fd.append("returnLocationId", ret);
      fd.append("paymentMethod", paymentMethod);
      if (notes) fd.append("notes", notes);
      selectedExtras.forEach((x) => fd.append("extras", x));
      if (documentFile) fd.append("document", documentFile);

      const data = await api.createReservation(fd);
      if (data.checkoutUrl) {
        show(t("reservations.payRedirect"));
        window.location.href = data.checkoutUrl;
        return;
      }
      show(t("details.success"));
      navigate("/reservations");
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function onReview(e: FormEvent) {
    e.preventDefault();
    if (!car) return;
    try {
      await api.addReview({
        carId: car.id,
        rating: Number(rating),
        comment,
      });
      const refreshed = await api.car(car.id);
      setCar(refreshed.car);
      setComment("");
      show(t("details.submitReview"));
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function toggleFavorite() {
    if (!car) return;
    if (!user) {
      show(t("common.requiredLogin"));
      return;
    }
    if (car.isFavorite) await api.removeFavorite(car.id);
    else await api.addFavorite(car.id);
    const refreshed = await api.car(car.id);
    setCar(refreshed.car);
  }

  function statusLabel(status: string) {
    if (status === "RESERVED") {
      return car?.reservedUntil
        ? `${t("status.RESERVED")} · ${t("details.until")} ${car.reservedUntil}`
        : t("status.RESERVED");
    }
    if (status === "MAINTENANCE") return t("status.MAINTENANCE");
    if (status === "AVAILABLE") return t("status.AVAILABLE");
    return status || t("status.AVAILABLE");
  }

  if (!car || !meta) return <div className="section">{t("common.loading")}</div>;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="section details-grid">
      <Seo
        title={`${car.brand} ${car.model} — €${car.pricePerDay}${t("common.perDay")}`}
        description={car.description}
        path={carPath(car)}
        locale={locale}
        type="product"
        image={mediaUrl(car.imageUrl) || undefined}
        jsonLd={[
          breadcrumbJsonLd([
            { name: "AutoRent", path: "/" },
            { name: t("nav.cars"), path: "/cars" },
            {
              name: `${car.brand} ${car.model}`,
              path: carPath(car),
            },
          ]),
          carProductJsonLd(car),
        ]}
      />
      {Toast}
      <div className="details-media">
        <ImageCarousel
          className="detail-carousel"
          images={
            car.images?.length
              ? car.images
              : car.imageUrl
                ? [car.imageUrl]
                : []
          }
          alt={`${car.brand} ${car.model}`}
        />
      </div>

      <div className="details-booking">
        <div className="row-between">
          <div>
            <h1>
              {car.brand} {car.model}
            </h1>
            <div className="company-badge">
              <span className="company-badge-label">{t("profile.company")}</span>
              <strong>{car.companyName || "AutoRent"}</strong>
            </div>
            <p className="muted">
              {car.year} · ⭐ {car.ratingAvg || "-"} ({car.ratingCount || 0})
            </p>
            <span
              className={`status-chip status-inline status-${(car.status || "AVAILABLE").toLowerCase()}`}
            >
              {statusLabel(car.status || "AVAILABLE")}
            </span>
          </div>
          <div className="price-box">
            <button className={`fav-btn detail ${car.isFavorite ? "active" : ""}`} onClick={toggleFavorite}>
              ♥
            </button>
            <h2>€{car.pricePerDay}</h2>
            <span>{t("common.perDay")}</span>
          </div>
        </div>
        <p className="detail-desc">{car.description}</p>

        <form className="panel booking" onSubmit={onReserve}>
          <h3>{t("details.book")}</h3>
          {(car.busyRanges || []).length > 0 ? (
            <div className="busy-ranges">
              <p className="busy-ranges-title">{t("status.RESERVED")}</p>
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
              {t("details.startDate")}
              <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </label>
            <label>
              {t("details.endDate")}
              <input type="date" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </label>
          </div>
          {dateConflict ? (
            <p className="booking-conflict">{dateConflict}</p>
          ) : null}          <div className="two-col">
            <label>
              {t("details.pickup")}
              <select value={pickup} onChange={(e) => setPickup(e.target.value)}>
                {meta.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.fee ? `(+€${l.fee})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("details.dropoff")}
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
            <h4 className="extras-title">{t("details.extras")}</h4>
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
                      <span className="extra-price">+€{ex.price}{t("common.perDay")}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <label>
            {t("details.payment")}
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="CASH">Cash në marrje</option>
              <option value="BANK_TRANSFER">Transfer bankar</option>
              {meta?.cardEnabled ? (
                <option value="CARD">Kartë (Stripe)</option>
              ) : null}
            </select>
          </label>

          <label>
            {t("details.document")}
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
            />
          </label>

          <label>
            {t("details.notes")}
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <div className="summary">
            <p>{t("reservations.dates")}: {summary.days}</p>
            <p>{t("reservations.car")}: €{summary.carSubtotal}</p>
            <p>{t("details.extras")}: €{summary.extrasTotal}</p>
            <p>{t("details.location")}: €{summary.locationFees}</p>
            <p className="total">{t("details.total")}: €{summary.total}</p>
          </div>

          <button className="btn" type="submit" disabled={!canReserve}>
            {!user
              ? t("details.loginToBook")
              : dateConflict
                ? t("details.conflict")
                : t("details.book")}
          </button>
        </form>
      </div>

      <div className="details-info">
        <div className="specs">
          <div><strong>{car.seats}</strong><span>{t("details.seats")}</span></div>
          <div><strong>{car.fuel}</strong><span>{t("details.fuel")}</span></div>
          <div><strong>{car.transmission}</strong><span>{t("details.transmission")}</span></div>
          <div><strong>{car.doors}</strong><span>{t("details.doors")}</span></div>
          <div><strong>{car.luggage}</strong><span>{t("details.luggage")}</span></div>
          <div><strong>{car.horsepower || "-"}</strong><span>{t("details.hp")}</span></div>
        </div>
        <div className="chips">
          <span>{t("details.color")}: {car.color || "-"}</span>
          <span>{t("details.km")}: {car.mileage || "-"}</span>
          <span>{t("details.location")}: {car.location}</span>
        </div>
        <div className="panel">
          <h3>{t("details.features")}</h3>
          <ul className="features-list">
            {(car.features || []).map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
        </div>

        <form className="panel reviews-panel" onSubmit={onReview}>
          <h3>{t("details.reviews")}</h3>
          <div className="reviews">
            {(car.reviews || []).length ? (
              (car.reviews || []).map((r) => (
                <div key={r.id} className="review-item">
                  <strong>
                    {r.userName} · ⭐ {r.rating}
                  </strong>
                  <p>{r.comment || t("details.comment")}</p>
                </div>
              ))
            ) : (
              <p className="muted">—</p>
            )}
          </div>
          <h4 className="review-form-title">{t("details.writeReview")}</h4>
          <label>
            {t("details.yourRating")}
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} ⭐
                </option>
              ))}
            </select>
          </label>
          <textarea
            placeholder={t("details.comment")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button className="btn" type="submit">
            {t("details.submitReview")}
          </button>
        </form>
      </div>
    </div>
  );
}
