import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { useT } from "../context/LocaleContext";
import { api, type Car } from "../lib/api";
import { tiraneToday } from "../lib/dates";

type LocationOpt = { id: string; name: string; fee: number };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayCount(start: string, end: string) {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.ceil((b - a) / 86_400_000);
}

export default function WhatsAppBookingModal({
  open,
  onClose,
  onCreated,
}: Props) {
  const t = useT();
  const titleId = useId();
  const today = tiraneToday();
  const [cars, setCars] = useState<Car[]>([]);
  const [locations, setLocations] = useState<LocationOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [carId, setCarId] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDays(today, 1));
  const [pickupLocationId, setPickupLocationId] = useState("tirane");
  const [returnLocationId, setReturnLocationId] = useState("tirane");
  const [notes, setNotes] = useState("");
  const [totalPrice, setTotalPrice] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setGuestName("");
    setGuestPhone("");
    setGuestEmail("");
    setNotes("");
    setTotalPrice("");
    setStartDate(today);
    setEndDate(addDays(today, 1));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, today]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([api.myCars(), api.meta()])
      .then(([carsRes, meta]) => {
        const list = (carsRes.cars || []).filter(
          (c) => c.status !== "MAINTENANCE"
        );
        setCars(list);
        setCarId((prev) => prev || list[0]?.id || "");
        const locs = meta.locations || [];
        setLocations(locs);
        if (locs[0]) {
          setPickupLocationId((prev) => prev || locs[0].id);
          setReturnLocationId((prev) => prev || locs[0].id);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t("common.error"));
      })
      .finally(() => setLoading(false));
  }, [open, t]);

  const estimate = useMemo(() => {
    const car = cars.find((c) => c.id === carId);
    const days = dayCount(startDate, endDate);
    if (!car || days <= 0) return null;
    const pickup = locations.find((l) => l.id === pickupLocationId);
    const ret = locations.find((l) => l.id === returnLocationId);
    return days * Number(car.pricePerDay) + (pickup?.fee || 0) + (ret?.fee || 0);
  }, [cars, carId, startDate, endDate, locations, pickupLocationId, returnLocationId]);

  if (!open) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const name = guestName.trim();
    const phone = guestPhone.trim();
    if (name.length < 2 || phone.length < 6) {
      setError(t("reservations.whatsAppNeedContact"));
      return;
    }
    if (!carId) {
      setError(t("reservations.whatsAppNoCars"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const custom = totalPrice.trim() ? Number(totalPrice) : undefined;
      await api.createWhatsAppReservation({
        guestName: name,
        guestPhone: phone,
        guestEmail: guestEmail.trim() || undefined,
        carId,
        startDate,
        endDate,
        pickupLocationId,
        returnLocationId,
        notes: notes.trim() || undefined,
        totalPrice:
          custom != null && Number.isFinite(custom) && custom > 0
            ? custom
            : undefined,
      });
      setSubmitting(false);
      await onCreated();
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="modal-panel wa-booking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2 id={titleId}>{t("reservations.whatsAppTitle")}</h2>
            <p className="muted">{t("reservations.whatsAppSub")}</p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>

        {loading ? (
          <p className="muted">{t("common.loading")}</p>
        ) : (
          <form className="cancel-modal-form wa-booking-form" onSubmit={submit}>
            <label>
              {t("checkout.fullName")}
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
            <div className="wa-booking-row">
              <label>
                {t("checkout.phone")}
                <input
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+355 69 …"
                  required
                />
              </label>
              <label>
                {t("checkout.email")}
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  autoComplete="email"
                  placeholder={t("reservations.whatsAppEmailOptional")}
                />
              </label>
            </div>
            <label>
              {t("reservations.car")}
              <select
                value={carId}
                onChange={(e) => setCarId(e.target.value)}
                required
              >
                {cars.length ? (
                  cars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} {c.model} ({c.year}) — €{c.pricePerDay}/
                      {t("details.days")}
                    </option>
                  ))
                ) : (
                  <option value="">{t("reservations.whatsAppNoCars")}</option>
                )}
              </select>
            </label>
            <div className="wa-booking-row">
              <label>
                {t("details.startDate")}
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const next = e.target.value;
                    setStartDate(next);
                    if (endDate <= next) setEndDate(addDays(next, 1));
                  }}
                  required
                />
              </label>
              <label>
                {t("details.endDate")}
                <input
                  type="date"
                  value={endDate}
                  min={addDays(startDate, 1)}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="wa-booking-row">
              <label>
                {t("reservations.pickup")}
                <select
                  value={pickupLocationId}
                  onChange={(e) => setPickupLocationId(e.target.value)}
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                      {l.fee ? ` (+€${l.fee})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("reservations.return")}
                <select
                  value={returnLocationId}
                  onChange={(e) => setReturnLocationId(e.target.value)}
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                      {l.fee ? ` (+€${l.fee})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              {t("reservations.totalPrice")}
              <input
                type="number"
                min={1}
                step={1}
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                placeholder={
                  estimate != null
                    ? `€${estimate} — ${t("reservations.whatsAppPriceHint")}`
                    : t("reservations.whatsAppPriceHint")
                }
              />
            </label>
            <label>
              {t("reservations.notes")}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </label>
            {error ? <p className="booking-conflict">{error}</p> : null}
            <div className="reservation-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={onClose}
                disabled={submitting}
              >
                {t("common.close")}
              </button>
              <button
                type="submit"
                className="btn"
                disabled={submitting || !cars.length}
              >
                {submitting ? t("common.loading") : t("reservations.whatsAppSave")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
