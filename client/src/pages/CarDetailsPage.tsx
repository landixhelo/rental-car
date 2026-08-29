import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type Car } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import Seo from "../seo/Seo";
import { breadcrumbJsonLd, carProductJsonLd } from "../seo/jsonLd";
import { SITE } from "../seo/site";
import BookingCalendar from "../components/BookingCalendar";
import { mediaUrl } from "../lib/mediaUrl";
import { carPath } from "../lib/carPath";
import { fuelLabel, transmissionLabel } from "../lib/labels";
import { saveBookingDraft } from "../lib/bookingDraft";
import { addDays, clampDate, rangeOverlapsBusy, tiraneToday } from "../lib/dates";

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

  const today = tiraneToday();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pickup, setPickup] = useState("tirane");
  const [ret, setRet] = useState("tirane");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [showMore, setShowMore] = useState(false);

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
        if (metaRes.locations[0]) {
          setPickup(metaRes.locations[0].id);
          setRet(metaRes.locations[0].id);
        }
      })
      .catch((e) => show(e.message));
  }, [id]);

  useEffect(() => {
    if (!user?.fullName) return;
    setReviewerName((current) => current || user.fullName);
  }, [user]);

  const images = useMemo(() => {
    if (!car) return [];
    const list =
      car.images?.length
        ? car.images
        : car.imageUrl
          ? [car.imageUrl]
          : [];
    return list.map(mediaUrl).filter(Boolean);
  }, [car]);

  useEffect(() => {
    setActiveImage(0);
  }, [car?.id]);

  const summary = useMemo(() => {
    if (!car || !meta || !startDate || !endDate) {
      return {
        days: 0,
        carSubtotal: 0,
        extrasTotal: 0,
        locationFees: 0,
        total: 0,
      };
    }
    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (days <= 0) {
      return {
        days: 0,
        carSubtotal: 0,
        extrasTotal: 0,
        locationFees: 0,
        total: 0,
      };
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
    const hit = (car.busyRanges || []).find((range) => {
      return startDate < range.endDate && endDate > range.startDate;
    });
    if (hit) {
      return `${t("details.conflict")} (${hit.startDate} – ${hit.endDate})`;
    }
    return null;
  }, [car, startDate, endDate, t]);

  const canReserve = Boolean(startDate && endDate && !dateConflict);

  function onReserve(e: FormEvent) {
    e.preventDefault();
    if (!car || !meta) return;
    if (!startDate || !endDate || startDate < today || endDate <= startDate) {
      show(t("details.pickStart"));
      return;
    }
    if (rangeOverlapsBusy(startDate, endDate, car.busyRanges || [])) {
      show(t("details.conflict"));
      return;
    }
    if (dateConflict) {
      show(dateConflict);
      return;
    }

    const pickupLoc = meta.locations.find((l) => l.id === pickup);
    const returnLoc = meta.locations.find((l) => l.id === ret);
    saveBookingDraft({
      carId: car.id,
      carSlug: car.slug,
      brand: car.brand,
      model: car.model,
      imageUrl: car.imageUrl,
      type: car.type,
      transmission: car.transmission,
      pricePerDay: car.pricePerDay,
      ratingAvg: car.ratingAvg,
      ratingCount: car.ratingCount,
      startDate,
      endDate,
      pickupLocationId: pickup,
      returnLocationId: ret,
      pickupName: pickupLoc?.name || car.location,
      returnName: returnLoc?.name || car.location,
      extras: selectedExtras,
      paymentMethod,
      carSubtotal: summary.carSubtotal,
      extrasTotal: summary.extrasTotal,
      locationFees: summary.locationFees,
      total: summary.total,
      days: summary.days,
      returnPath: carPath(car),
      notes: notes.trim() || undefined,
    });

    navigate("/checkout");
  }

  async function onReview(e: FormEvent) {
    e.preventDefault();
    if (!car) return;
    if (!reviewerName.trim()) {
      show(t("details.needReviewName"));
      return;
    }
    try {
      await api.addReview({
        carId: car.id,
        rating: Number(rating),
        comment,
        authorName: reviewerName.trim(),
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

  async function shareCar() {
    if (!car) return;
    const url = window.location.href;
    const title = `${car.brand} ${car.model}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        show(t("details.linkCopied"));
      }
    } catch {
      // user cancelled share
    }
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

  if (!car || !meta) {
    return <div className="section">{t("common.loading")}</div>;
  }

  const carName = `${car.brand} ${car.model}`;
  const statusClass = (car.status || "AVAILABLE").toLowerCase();

  return (
    <div className="detail-page">
      <Seo
        title={`${carName} — €${car.pricePerDay}${t("common.perDay")}`}
        description={car.description}
        path={carPath(car)}
        locale={locale}
        type="product"
        image={mediaUrl(car.imageUrl) || undefined}
        jsonLd={[
          breadcrumbJsonLd([
            { name: SITE.name, path: "/" },
            { name: t("nav.cars"), path: "/cars" },
            { name: carName, path: carPath(car) },
          ]),
          carProductJsonLd(car),
        ]}
      />
      {Toast}

      <nav className="detail-crumbs" aria-label="Breadcrumb">
        <Link to="/">{t("details.crumbHome")}</Link>
        <span aria-hidden>›</span>
        <Link to="/cars">{t("details.crumbFleet")}</Link>
        <span aria-hidden>›</span>
        <span>{carName}</span>
      </nav>

      <div className="detail-layout">
        <div className="detail-main">
          <div className="detail-gallery">
            <div className="detail-gallery-main">
              {images.length ? (
                <img
                  src={images[Math.min(activeImage, images.length - 1)]}
                  alt={carName}
                />
              ) : (
                <div className="detail-gallery-empty">{t("details.noPhoto")}</div>
              )}
            </div>
            {images.length > 1 ? (
              <div className="detail-thumbs">
                {images.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    className={i === activeImage ? "active" : undefined}
                    onClick={() => setActiveImage(i)}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="detail-header">
            <div className="detail-badges">
              <span className={`detail-status status-${statusClass}`}>
                {statusLabel(car.status || "AVAILABLE")}
              </span>
              <span className="detail-rating">
                ★ {car.ratingAvg || "—"}{" "}
                <small>
                  ({car.ratingCount || 0} {t("details.reviews").toLowerCase()})
                </small>
              </span>
            </div>
            <div className="detail-title-row">
              <h1>{carName}</h1>
              <div className="detail-actions">
                <button
                  type="button"
                  className={`detail-icon-btn${car.isFavorite ? " active" : ""}`}
                  onClick={toggleFavorite}
                  aria-label={t("nav.favorites")}
                >
                  ♥
                </button>
                <button
                  type="button"
                  className="detail-icon-btn"
                  onClick={shareCar}
                  aria-label={t("details.share")}
                >
                  ↗
                </button>
              </div>
            </div>
            <p className="detail-loc">
              <span aria-hidden>⌖</span>
              {t("details.pickupAvailable", { location: car.location })}
            </p>
            <p className="detail-desc">{car.description}</p>
          </div>

          <section className="detail-block">
            <h2>{t("details.specifications")}</h2>
            <div className="detail-specs">
              <div>
                <span className="detail-spec-ico" aria-hidden>
                  ⚙
                </span>
                <div>
                  <strong>{transmissionLabel(t, car.transmission)}</strong>
                  <small>{t("details.transmission")}</small>
                </div>
              </div>
              <div>
                <span className="detail-spec-ico" aria-hidden>
                  ⛽
                </span>
                <div>
                  <strong>{fuelLabel(t, car.fuel)}</strong>
                  <small>{t("details.fuel")}</small>
                </div>
              </div>
              <div>
                <span className="detail-spec-ico" aria-hidden>
                  👥
                </span>
                <div>
                  <strong>
                    {car.seats} {t("details.seats")}
                  </strong>
                  <small>{t("details.seats")}</small>
                </div>
              </div>
              <div>
                <span className="detail-spec-ico" aria-hidden>
                  🚪
                </span>
                <div>
                  <strong>
                    {car.doors} {t("details.doors")}
                  </strong>
                  <small>{t("details.doors")}</small>
                </div>
              </div>
              <div>
                <span className="detail-spec-ico" aria-hidden>
                  📅
                </span>
                <div>
                  <strong>{car.year}</strong>
                  <small>{t("details.year")}</small>
                </div>
              </div>
              <div>
                <span className="detail-spec-ico" aria-hidden>
                  ◆
                </span>
                <div>
                  <strong>
                    {car.type === "SUV" ||
                    car.type === "Sedan" ||
                    car.type === "Sports" ||
                    car.type === "Luxury"
                      ? t(`labels.type.${car.type}`)
                      : car.type}
                  </strong>
                  <small>{t("details.category")}</small>
                </div>
              </div>
            </div>
          </section>

          <section className="detail-block">
            <h2>{t("details.features")}</h2>
            <ul className="detail-features">
              {(car.features || []).length ? (
                (car.features || []).map((f) => (
                  <li key={f}>
                    <span aria-hidden>✓</span>
                    {f}
                  </li>
                ))
              ) : (
                <li className="muted">—</li>
              )}
            </ul>
          </section>

          <section className="detail-block">
            <h2>{t("details.reviews")}</h2>
            <div className="detail-reviews">
              {(car.reviews || []).length ? (
                (car.reviews || []).map((r) => (
                  <div key={r.id} className="detail-review">
                    <strong>
                      {r.userName} · ★ {r.rating}
                    </strong>
                    <p>{r.comment || t("details.comment")}</p>
                  </div>
                ))
              ) : (
                <p className="muted">—</p>
              )}
            </div>
            <form className="detail-review-form" onSubmit={onReview}>
              <h3>{t("details.writeReview")}</h3>
              <label>
                {t("details.reviewerName")}
                <input
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                {t("details.yourRating")}
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} ★
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
          </section>
        </div>

        <aside className="detail-side">
          <form className="detail-book" onSubmit={onReserve}>
            <div className="detail-book-price">
              <span>{t("details.priceLabel")}</span>
              <div>
                <strong>€{car.pricePerDay}</strong>
                <small>{t("common.perDay")}</small>
                <em>{t("details.unlimitedKm")}</em>
              </div>
            </div>

            <label className="detail-book-field">
              {t("details.pickup")}
              <select
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              >
                {meta.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.fee ? ` (+€${l.fee})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="detail-book-dates">
              <label>
                {t("home.searchPickup")}
                <input
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => {
                    const start = clampDate(e.target.value, today);
                    setStartDate(start);
                    if (!endDate || endDate <= start) {
                      setEndDate("");
                    }
                  }}
                  required
                />
              </label>
              <label>
                {t("home.searchReturn")}
                <input
                  type="date"
                  min={startDate ? addDays(startDate, 1) : addDays(today, 1)}
                  value={endDate}
                  onChange={(e) => {
                    const minEnd = startDate
                      ? addDays(startDate, 1)
                      : addDays(today, 1);
                    setEndDate(clampDate(e.target.value, minEnd));
                  }}
                  required
                />
              </label>
            </div>

            <BookingCalendar
              startDate={startDate}
              endDate={endDate}
              busyRanges={car.busyRanges || []}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />

            {dateConflict ? (
              <p className="booking-conflict">{dateConflict}</p>
            ) : null}

            <div className="detail-breakdown">
              <div>
                <span>
                  €{car.pricePerDay} × {summary.days || 0}{" "}
                  {t("details.days")}
                </span>
                <strong>€{summary.carSubtotal}</strong>
              </div>
              {summary.extrasTotal > 0 ? (
                <div>
                  <span>{t("details.extras")}</span>
                  <strong>€{summary.extrasTotal}</strong>
                </div>
              ) : null}
              {summary.locationFees > 0 ? (
                <div>
                  <span>{t("details.location")}</span>
                  <strong>€{summary.locationFees}</strong>
                </div>
              ) : null}
              <div>
                <span>{t("details.serviceFee")}</span>
                <strong className="free">{t("details.serviceFeeFree")}</strong>
              </div>
              <div className="detail-total">
                <span>{t("details.totalPrice")}</span>
                <strong>€{summary.total}</strong>
              </div>
            </div>

            <button className="btn detail-reserve" type="submit" disabled={!canReserve}>
              {dateConflict
                ? t("details.conflict")
                : t("details.reserveNow")}
            </button>
            <p className="detail-policy">{t("details.policyNote")}</p>

            <button
              type="button"
              className="detail-more-toggle"
              onClick={() => setShowMore((v) => !v)}
            >
              {showMore ? t("details.hideOptions") : t("details.moreOptions")}
            </button>

            {showMore ? (
              <div className="detail-more">
                <label>
                  {t("details.dropoff")}
                  <select value={ret} onChange={(e) => setRet(e.target.value)}>
                    {meta.locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                        {l.fee ? ` (+€${l.fee})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

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
                            <span className="extra-price">
                              +€{ex.price}
                              {t("common.perDay")}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="detail-book-field payment-options">
                  <span>{t("details.payment")}</span>
                  <label className="payment-choice">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="CASH"
                      checked={paymentMethod === "CASH"}
                      onChange={() => setPaymentMethod("CASH")}
                    />
                    <span>{t("labels.payment.CASH")}</span>
                  </label>
                  <label className="payment-choice">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="BANK_TRANSFER"
                      checked={paymentMethod === "BANK_TRANSFER"}
                      onChange={() => setPaymentMethod("BANK_TRANSFER")}
                    />
                    <span>{t("labels.payment.BANK_TRANSFER")}</span>
                  </label>
                  <label
                    className={`payment-choice${
                      meta.cardEnabled ? "" : " is-disabled"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="CARD"
                      disabled={!meta.cardEnabled}
                      checked={paymentMethod === "CARD"}
                      onChange={() => {
                        if (meta.cardEnabled) setPaymentMethod("CARD");
                      }}
                    />
                    <span>
                      {t("labels.payment.CARD")}
                      {!meta.cardEnabled ? (
                        <em className="payment-choice-note">
                          {t("details.cardUnavailable")}
                        </em>
                      ) : null}
                    </span>
                  </label>
                </div>

                <label>
                  {t("details.notes")}
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
              </div>
            ) : null}
          </form>
        </aside>
      </div>
    </div>
  );
}
