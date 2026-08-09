import { useEffect, useId, useState, type FormEvent } from "react";
import { useT } from "../context/LocaleContext";
import { mediaUrl } from "../lib/mediaUrl";

export type CancelReservationTarget = {
  id: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  returnLocation: string;
  totalPrice: number;
  paymentMethod?: string;
  paymentStatus?: string;
  car: {
    brand: string;
    model: string;
    year?: number;
    imageUrl?: string | null;
    companyName?: string | null;
  };
};

type Props = {
  reservation: CancelReservationTarget | null;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export default function CancelReservationModal({
  reservation,
  submitting = false,
  onClose,
  onConfirm,
}: Props) {
  const t = useT();
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reservation) return;
    setReason("");
    setError(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [reservation]);

  useEffect(() => {
    if (!reservation) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reservation, submitting, onClose]);

  if (!reservation) return null;

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setError(t("reservations.cancelReasonShort"));
      return;
    }
    onConfirm(trimmed);
  }

  const carLabel = `${reservation.car.brand} ${reservation.car.model}`;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="modal-panel cancel-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id={titleId}>{t("reservations.cancelTitle")}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>

        <div className="cancel-modal-car">
          <div className="cancel-modal-media">
            {reservation.car.imageUrl ? (
              <img
                src={mediaUrl(reservation.car.imageUrl)}
                alt={carLabel}
              />
            ) : (
              <div className="fleet-reservation-fallback" />
            )}
          </div>
          <div className="cancel-modal-car-info">
            <h3>{carLabel}</h3>
            {reservation.car.year ? (
              <p className="muted">{reservation.car.year}</p>
            ) : null}
            {reservation.car.companyName ? (
              <span className="company-chip">{reservation.car.companyName}</span>
            ) : null}
          </div>
        </div>

        <dl className="reservation-meta cancel-modal-meta">
          <div>
            <dt>{t("reservations.dates")}</dt>
            <dd>
              {String(reservation.startDate).slice(0, 10)} →{" "}
              {String(reservation.endDate).slice(0, 10)}
            </dd>
          </div>
          <div>
            <dt>{t("reservations.route")}</dt>
            <dd>
              {reservation.pickupLocation} → {reservation.returnLocation}
            </dd>
          </div>
          <div>
            <dt>{t("reservations.total")}</dt>
            <dd className="total">€{reservation.totalPrice}</dd>
          </div>
        </dl>

        <p className="muted cancel-modal-policy">{t("reservations.cancelConfirm")}</p>

        <form onSubmit={submit} className="cancel-modal-form">
          <label htmlFor={reasonId}>
            {t("reservations.cancelReason")}
            <textarea
              id={reasonId}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              rows={4}
              maxLength={500}
              placeholder={t("reservations.cancelReasonPlaceholder")}
              required
              disabled={submitting}
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
            <button type="submit" className="btn danger" disabled={submitting}>
              {submitting
                ? t("common.loading")
                : t("reservations.confirmCancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
