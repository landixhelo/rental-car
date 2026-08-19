import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BookingStepper from "../components/BookingStepper";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { api } from "../lib/api";
import {
  clearBookingDraft,
  formatReservationCode,
  formatShortDate,
  loadBookingDraft,
  saveConfirmedBooking,
  type BookingDraft,
} from "../lib/bookingDraft";
import { setFlash } from "../lib/flash";
import { mediaUrl } from "../lib/mediaUrl";
import { transmissionLabel } from "../lib/labels";

export default function CheckoutDetailsPage() {
  const t = useT();
  const { locale } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { show, Toast } = useToast();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+355");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const d = loadBookingDraft();
    if (!d) {
      navigate("/cars", { replace: true });
      return;
    }
    setDraft(d);
    setNotes(d.notes || "");
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    setFullName((current) => current || user.fullName || "");
    setEmail((current) => current || user.email || "");
    const rawPhone = (user.phone || "").replace(/\s/g, "");
    if (!rawPhone) return;
    if (rawPhone.startsWith("+355")) {
      setPhoneCode("+355");
      setPhone(rawPhone.slice(4));
    } else if (rawPhone.startsWith("355")) {
      setPhoneCode("+355");
      setPhone(rawPhone.slice(3));
    } else {
      setPhone(rawPhone.replace(/^\+/, ""));
    }
  }, [user]);

  const dateLabel = useMemo(() => {
    if (!draft) return "";
    return `${formatShortDate(draft.startDate, locale)} – ${formatShortDate(draft.endDate, locale)}`;
  }, [draft, locale]);

  async function onConfirm(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      show(t("checkout.needContact"));
      return;
    }
    setSubmitting(true);
    try {
      const phoneFull = `${phoneCode} ${phone}`.trim();
      if (
        user &&
        (fullName !== user.fullName || phoneFull !== (user.phone || ""))
      ) {
        try {
          await api.updateProfile({
            fullName: fullName.trim(),
            phone: phoneFull,
          });
        } catch {
          // booking can still proceed
        }
      }

      const fd = new FormData();
      fd.append("carId", draft.carId);
      fd.append("startDate", draft.startDate);
      fd.append("endDate", draft.endDate);
      fd.append("pickupLocationId", draft.pickupLocationId);
      fd.append("returnLocationId", draft.returnLocationId);
      fd.append("paymentMethod", draft.paymentMethod || "CASH");
      fd.append("guestFullName", fullName.trim());
      fd.append("guestEmail", email.trim());
      fd.append("guestPhone", phoneFull);
      const noteParts = [notes.trim(), phoneFull ? `Tel: ${phoneFull}` : ""]
        .filter(Boolean)
        .join("\n");
      if (noteParts) fd.append("notes", noteParts);
      draft.extras.forEach((x) => fd.append("extras", x));

      const data = await api.createReservation(fd);
      const reservation = data.reservation as {
        id: string;
        status?: string;
        paymentStatus?: string;
        paymentMethod?: string;
        totalPrice?: number;
        startDate?: string;
        endDate?: string;
        totalDays?: number;
        pickupLocation?: string;
        returnLocation?: string;
        createdAt?: string;
        car?: { brand?: string; model?: string; imageUrl?: string };
        user?: { fullName?: string; email?: string; phone?: string };
      };

      if (data.checkoutUrl) {
        show(t("reservations.payRedirect"), 5000);
        window.location.href = data.checkoutUrl;
        return;
      }

      const successMsg = t("details.success");
      setFlash({
        title: t("checkout.confirmedTitle"),
        message: t("checkout.emailSent", {
          email: data.emailTo || email,
        }),
      });
      show(successMsg, 7000);

      saveConfirmedBooking({
        reservationId: reservation.id,
        code: formatReservationCode(reservation.id, reservation.createdAt),
        status: reservation.status || "CONFIRMED",
        emailTo: data.emailTo || email,
        paymentMethod: reservation.paymentMethod || draft.paymentMethod,
        paymentStatus: reservation.paymentStatus,
        totalPrice: Number(reservation.totalPrice ?? draft.total),
        startDate: draft.startDate,
        endDate: draft.endDate,
        pickupName: reservation.pickupLocation || draft.pickupName,
        returnName: reservation.returnLocation || draft.returnName,
        days: reservation.totalDays || draft.days,
        brand: reservation.car?.brand || draft.brand,
        model: reservation.car?.model || draft.model,
        imageUrl: reservation.car?.imageUrl || draft.imageUrl,
        type: draft.type,
        transmission: draft.transmission,
        customerName: fullName.trim(),
        customerEmail: email.trim(),
        customerPhone: phoneFull,
      });
      clearBookingDraft();
      navigate("/checkout/confirmed", { replace: true });
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"), 7000);
    } finally {
      setSubmitting(false);
    }
  }

  if (!draft) {
    return <div className="section">{t("common.loading")}</div>;
  }

  const typeLabel =
    draft.type === "SUV" ||
    draft.type === "Sedan" ||
    draft.type === "Sports" ||
    draft.type === "Luxury"
      ? t(`labels.type.${draft.type}`)
      : draft.type;

  return (
    <div className="checkout-page">
      {Toast}
      <div className="checkout-top">
        <Link to="/cars" className="checkout-back">
          ← {t("checkout.backToFleet")}
        </Link>
      </div>

      <BookingStepper step={2} />

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={onConfirm}>
          <h1>{t("checkout.customerDetails")}</h1>
          <p className="muted">{t("checkout.guestHint")}</p>
          <div className="checkout-card">
            <label>
              {t("checkout.fullName")}
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
            <label>
              {t("checkout.email")}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label>
              {t("checkout.phone")}
              <div className="checkout-phone">
                <select
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  aria-label={t("checkout.phoneCode")}
                >
                  <option value="+355">+355</option>
                  <option value="+39">+39</option>
                  <option value="+44">+44</option>
                  <option value="+49">+49</option>
                  <option value="+1">+1</option>
                </select>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="69 000 0000"
                  autoComplete="tel-national"
                  required
                />
              </div>
            </label>
            <label>
              {t("checkout.notes")}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("checkout.notesPh")}
                rows={4}
              />
            </label>
          </div>

          <div className="checkout-actions">
            <Link to={draft.returnPath} className="checkout-prev">
              ← {t("checkout.previous")}
            </Link>
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? t("common.loading") : t("checkout.confirm")}
            </button>
          </div>
        </form>

        <aside className="checkout-summary">
          <h2>{t("checkout.summary")}</h2>
          <div className="checkout-car">
            <img
              src={mediaUrl(draft.imageUrl)}
              alt={`${draft.brand} ${draft.model}`}
            />
            <div>
              <strong>
                {draft.brand} {draft.model}
              </strong>
              <p>
                {transmissionLabel(t, draft.transmission)} · {typeLabel}
              </p>
              <span className="checkout-rating">
                ★ {draft.ratingAvg || "—"}
              </span>
            </div>
          </div>
          <dl className="checkout-meta">
            <div>
              <dt>{t("checkout.pickup")}</dt>
              <dd>{draft.pickupName}</dd>
            </div>
            <div>
              <dt>{t("checkout.dates")}</dt>
              <dd>{dateLabel}</dd>
            </div>
            <div>
              <dt>{t("checkout.duration")}</dt>
              <dd>
                {draft.days} {t("details.days")}
              </dd>
            </div>
          </dl>
          <div className="checkout-price">
            <div>
              <span>
                €{draft.pricePerDay} × {draft.days} {t("details.days")}
              </span>
              <strong>€{draft.carSubtotal}</strong>
            </div>
            {draft.extrasTotal > 0 ? (
              <div>
                <span>{t("details.extras")}</span>
                <strong>€{draft.extrasTotal}</strong>
              </div>
            ) : null}
            {draft.locationFees > 0 ? (
              <div>
                <span>{t("details.location")}</span>
                <strong>€{draft.locationFees}</strong>
              </div>
            ) : null}
            <div>
              <span>{t("details.serviceFee")}</span>
              <strong className="free">{t("details.serviceFeeFree")}</strong>
            </div>
            <div className="checkout-total">
              <span>{t("details.totalPrice")}</span>
              <strong>€{draft.total}</strong>
            </div>
          </div>
          <p className="checkout-info">{t("checkout.infoBox")}</p>
        </aside>
      </div>
    </div>
  );
}
