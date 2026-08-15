import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BookingStepper from "../components/BookingStepper";
import { useLocale, useT } from "../context/LocaleContext";
import {
  clearConfirmedBooking,
  formatShortDate,
  loadConfirmedBooking,
  type ConfirmedBooking,
} from "../lib/bookingDraft";
import { mediaUrl } from "../lib/mediaUrl";
import { transmissionLabel } from "../lib/labels";

export default function CheckoutConfirmedPage() {
  const t = useT();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const [data, setData] = useState<ConfirmedBooking | null>(null);

  useEffect(() => {
    const confirmed = loadConfirmedBooking();
    if (!confirmed) {
      navigate("/cars", { replace: true });
      return;
    }
    setData(confirmed);
  }, [navigate]);

  function onPrint() {
    window.print();
  }

  if (!data) {
    return <div className="section">{t("common.loading")}</div>;
  }

  const typeLabel =
    data.type === "SUV" ||
    data.type === "Sedan" ||
    data.type === "Sports" ||
    data.type === "Luxury"
      ? t(`labels.type.${data.type}`)
      : data.type;

  const paymentLabel =
    data.paymentMethod === "CARD"
      ? t("labels.payment.CARD")
      : data.paymentMethod === "BANK_TRANSFER"
        ? t("labels.payment.BANK_TRANSFER")
        : t("labels.payment.CASH");

  return (
    <div className="checkout-page checkout-confirmed">
      <BookingStepper step={3} />

      <div className="confirm-hero">
        <div className="confirm-check" aria-hidden>
          ✓
        </div>
        <h1>{t("checkout.confirmedTitle")}</h1>
        <p>{t("checkout.confirmedSub")}</p>
      </div>

      <article className="confirm-card" id="voucher-print">
        <header className="confirm-card-head">
          <div>
            <span>{t("checkout.reservationId")}</span>
            <strong>{data.code}</strong>
          </div>
          <span className="confirm-badge">{t("checkout.statusConfirmed")}</span>
        </header>

        <div className="confirm-grid">
          <div>
            <span className="confirm-label">{t("checkout.vehicle")}</span>
            <div className="confirm-vehicle">
              <img
                src={mediaUrl(data.imageUrl)}
                alt={`${data.brand} ${data.model}`}
              />
              <div>
                <strong>
                  {data.brand} {data.model}
                </strong>
                <p>
                  {transmissionLabel(t, data.transmission)} · {typeLabel}
                </p>
              </div>
            </div>

            <span className="confirm-label">{t("checkout.pickupLocation")}</span>
            <p className="confirm-value">{data.pickupName}</p>
            <p className="confirm-hint">{t("checkout.pickupHint")}</p>
          </div>

          <div>
            <span className="confirm-label">{t("checkout.reservationDates")}</span>
            <p className="confirm-dates">
              <strong>{formatShortDate(data.startDate, locale)}</strong>
              <span aria-hidden>→</span>
              <strong>{formatShortDate(data.endDate, locale)}</strong>
            </p>
            <p className="confirm-hint">
              {data.days} {t("details.days")}
            </p>

            <span className="confirm-label">{t("checkout.totalPaid")}</span>
            <p className="confirm-total">€{data.totalPrice}</p>
            <p className="confirm-hint">
              {t("checkout.paymentMethod")}: {paymentLabel}
            </p>
          </div>
        </div>

        <footer className="confirm-card-foot">
          <p>
            ✉ {t("checkout.emailSent", { email: data.customerEmail })}
          </p>
          <button type="button" onClick={onPrint}>
            {t("checkout.printVoucher")}
          </button>
        </footer>
      </article>

      <div className="confirm-actions">
        <Link to="/reservations" className="btn" onClick={() => clearConfirmedBooking()}>
          {t("checkout.viewReservations")}
        </Link>
        <Link to="/cars" className="btn ghost" onClick={() => clearConfirmedBooking()}>
          {t("checkout.backToFleet")}
        </Link>
      </div>
    </div>
  );
}
