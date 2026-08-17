import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CancelReservationModal, {
  type CancelReservationTarget,
} from "../components/CancelReservationModal";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { api } from "../lib/api";
import { formatReservationCode, formatShortDate } from "../lib/bookingDraft";
import { carPath } from "../lib/carPath";
import { tiraneToday } from "../lib/dates";
import {
  fuelLabel,
  paymentLabel,
  transmissionLabel,
} from "../lib/labels";
import { mediaUrl } from "../lib/mediaUrl";
import { isPlaceholderGuestEmail } from "../lib/guestEmail";

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
] as const;

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const t = useT();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { show } = useToast();
  const [r, setR] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] =
    useState<CancelReservationTarget | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const today = tiraneToday();

  const isFleetManager =
    user?.role === "CONTRACTOR" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN";

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.getReservation(id);
      setR(res.reservation);
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
      navigate("/reservations", { replace: true });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const extras = useMemo(() => {
    if (!r || !Array.isArray(r.extras)) return [];
    return r.extras as Array<{ name?: string; price?: number; id?: string }>;
  }, [r]);

  const features = useMemo(() => {
    if (!r?.car?.features) return [];
    if (Array.isArray(r.car.features)) return r.car.features as string[];
    return [];
  }, [r]);

  const isOwnBooking = Boolean(r && user && r.userId === user.id);
  const canCancel =
    isOwnBooking &&
    r.status !== "CANCELLED" &&
    r.status !== "REJECTED" &&
    r.status !== "COMPLETED" &&
    String(r.startDate).slice(0, 10) >= today;

  function depLabel(status?: string) {
    if (status === "HELD") return t("reservations.DEP_HELD");
    if (status === "RETURNED") return t("reservations.DEP_RETURNED");
    if (status === "FORFEITED") return t("reservations.DEP_FORFEITED");
    return t("reservations.DEP_NONE");
  }

  function docLabel(status?: string) {
    if (status === "PENDING") return t("reservations.DOC_PENDING");
    if (status === "APPROVED") return t("reservations.DOC_APPROVED");
    if (status === "REJECTED") return t("reservations.DOC_REJECTED");
    return t("reservations.DOC_NONE");
  }

  function payStatusLabel(status?: string) {
    if (status === "PAID") return t("reservations.payPaid");
    if (status === "PENDING") return t("reservations.payPending");
    if (status === "FAILED") return t("reservations.payFailed");
    if (status === "REFUNDED") return t("reservations.payRefunded");
    return status || "—";
  }

  function openContract() {
    if (!r) return;
    window.open(api.reservationContractUrl(r.id), "_blank", "noopener");
  }

  async function updateStatus(status: string) {
    if (!r) return;
    try {
      await api.updateReservationStatus(r.id, status);
      show(t(`status.${status}`));
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function markPaid() {
    if (!r) return;
    try {
      await api.updateReservationPayment(r.id, "PAID");
      show(t("reservations.paidOk"));
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function setDocument(documentStatus: string) {
    if (!r) return;
    try {
      await api.updateReservationDocument(r.id, { documentStatus });
      show(
        documentStatus === "APPROVED"
          ? t("reservations.docApproved")
          : t("reservations.docRejected")
      );
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function setDeposit(depositStatus: string) {
    if (!r) return;
    try {
      await api.updateReservationDeposit(r.id, { depositStatus });
      show(t("reservations.depositUpdated"));
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function confirmCancel(reason: string) {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await api.cancelReservation(cancelTarget.id, reason);
      setCancelTarget(null);
      show(res.cancellation?.refundNote || t("status.CANCELLED"), 6000);
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setCancelling(false);
    }
  }

  if (loading || !r) {
    return (
      <div className="rental-detail">
        <p className="muted">{t("common.loading")}</p>
      </div>
    );
  }

  const code = formatReservationCode(r.id, r.createdAt);
  const start = String(r.startDate).slice(0, 10);
  const end = String(r.endDate).slice(0, 10);
  const typeLabel =
    r.car?.type === "SUV" ||
    r.car?.type === "Sedan" ||
    r.car?.type === "Sports" ||
    r.car?.type === "Luxury"
      ? t(`labels.type.${r.car.type}`)
      : r.car?.type;

  return (
    <div className="rental-detail">
      <div className="rental-detail-top">
        <Link to="/reservations" className="rental-detail-back">
          ← {t("reservations.backToList")}
        </Link>
        <span className={`badge status-${r.status}`}>
          {t(`status.${r.status}`)}
        </span>
      </div>

      <header className="rental-detail-hero">
        <div className="rental-detail-media">
          {r.car?.imageUrl ? (
            <img
              src={mediaUrl(r.car.imageUrl)}
              alt={`${r.car.brand} ${r.car.model}`}
            />
          ) : (
            <div className="fleet-reservation-fallback" />
          )}
        </div>
        <div className="rental-detail-hero-text">
          <p className="rental-detail-code">
            {t("reservations.reservationCode")}: <strong>{code}</strong>
          </p>
          <h1>
            {r.car?.brand} {r.car?.model}
          </h1>
          <p className="muted">
            {r.car?.year}
            {typeLabel ? ` · ${typeLabel}` : ""}
            {r.car?.companyName ? ` · ${r.car.companyName}` : ""}
          </p>
          <p className="rental-detail-total">
            €{Number(r.totalPrice).toFixed(0)}{" "}
            <span>{t("reservations.totalPrice")}</span>
          </p>
        </div>
      </header>

      <div className="rental-detail-grid">
        <section className="rental-detail-card">
          <h2>{t("reservations.bookingDetails")}</h2>
          <dl className="rental-detail-dl">
            <div>
              <dt>{t("reservations.pickup")}</dt>
              <dd>
                {formatShortDate(start, locale)}
                <br />
                {r.pickupLocation}
              </dd>
            </div>
            <div>
              <dt>{t("reservations.return")}</dt>
              <dd>
                {formatShortDate(end, locale)}
                <br />
                {r.returnLocation}
              </dd>
            </div>
            <div>
              <dt>{t("reservations.days")}</dt>
              <dd>
                {r.totalDays} {t("details.days")}
              </dd>
            </div>
            <div>
              <dt>{t("reservations.createdAt")}</dt>
              <dd>
                {formatShortDate(String(r.createdAt).slice(0, 10), locale)}
              </dd>
            </div>
          </dl>
          {r.notes ? (
            <div className="rental-detail-notes">
              <h3>{t("reservations.notes")}</h3>
              <p>{r.notes}</p>
            </div>
          ) : null}
          {r.cancelReason ? (
            <div className="rental-detail-notes">
              <h3>{t("reservations.cancelReason")}</h3>
              <p>{r.cancelReason}</p>
            </div>
          ) : null}
        </section>

        <section className="rental-detail-card">
          <h2>{t("reservations.customerDetails")}</h2>
          <dl className="rental-detail-dl">
            <div>
              <dt>{t("checkout.fullName")}</dt>
              <dd>{r.user?.fullName || "—"}</dd>
            </div>
            <div>
              <dt>{t("checkout.email")}</dt>
              <dd>
                {r.user?.email && !isPlaceholderGuestEmail(r.user.email) ? (
                  <a href={`mailto:${r.user.email}`}>{r.user.email}</a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt>{t("checkout.phone")}</dt>
              <dd>
                {r.user?.phone ? (
                  <a href={`tel:${r.user.phone}`}>{r.user.phone}</a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rental-detail-card">
          <h2>{t("reservations.vehicleDetails")}</h2>
          <dl className="rental-detail-dl">
            <div>
              <dt>{t("reservations.pricePerDay")}</dt>
              <dd>€{Number(r.car?.pricePerDay || 0)}</dd>
            </div>
            <div>
              <dt>{t("details.fuel")}</dt>
              <dd>{fuelLabel(t, r.car?.fuel)}</dd>
            </div>
            <div>
              <dt>{t("details.transmission")}</dt>
              <dd>{transmissionLabel(t, r.car?.transmission)}</dd>
            </div>
            <div>
              <dt>{t("details.seats")}</dt>
              <dd>{r.car?.seats ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("details.location")}</dt>
              <dd>{r.car?.location || "—"}</dd>
            </div>
            {r.car?.color ? (
              <div>
                <dt>{t("details.color")}</dt>
                <dd>{r.car.color}</dd>
              </div>
            ) : null}
          </dl>
          {r.car?.description ? (
            <p className="rental-detail-desc">{r.car.description}</p>
          ) : null}
          {features.length ? (
            <ul className="rental-detail-features">
              {features.map((f) => (
                <li key={String(f)}>{String(f)}</li>
              ))}
            </ul>
          ) : null}
          <Link
            to={carPath(r.car)}
            className="btn ghost rental-detail-car-link"
          >
            {t("reservations.viewCarPage")}
          </Link>
        </section>

        <section className="rental-detail-card">
          <h2>{t("reservations.paymentDetails")}</h2>
          <dl className="rental-detail-dl">
            <div>
              <dt>{t("checkout.paymentMethod")}</dt>
              <dd>{paymentLabel(t, r.paymentMethod)}</dd>
            </div>
            <div>
              <dt>{t("reservations.paymentStatus")}</dt>
              <dd>{payStatusLabel(r.paymentStatus)}</dd>
            </div>
            <div>
              <dt>{t("reservations.carSubtotal")}</dt>
              <dd>€{Number(r.carSubtotal || 0)}</dd>
            </div>
            <div>
              <dt>{t("reservations.extrasTotal")}</dt>
              <dd>€{Number(r.extrasTotal || 0)}</dd>
            </div>
            <div>
              <dt>{t("reservations.locationFees")}</dt>
              <dd>€{Number(r.locationFees || 0)}</dd>
            </div>
            <div>
              <dt>{t("reservations.deposit")}</dt>
              <dd>
                €{Number(r.depositAmount || 0)} · {depLabel(r.depositStatus)}
              </dd>
            </div>
            <div>
              <dt>{t("reservations.total")}</dt>
              <dd>
                <strong>€{Number(r.totalPrice || 0)}</strong>
              </dd>
            </div>
          </dl>
          {extras.length ? (
            <ul className="rental-detail-extras">
              {extras.map((x, i) => (
                <li key={x.id || `${x.name}-${i}`}>
                  {x.name} <span>€{Number(x.price || 0)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="rental-detail-doc">
            <h3>{t("reservations.document")}</h3>
            <p>
              {docLabel(r.documentStatus)}
              {r.documentUrl ? (
                <>
                  {" · "}
                  <a
                    href={mediaUrl(r.documentUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("reservations.viewDocument")}
                  </a>
                </>
              ) : (
                <> · {t("reservations.noDocument")}</>
              )}
            </p>
            {r.documentNote ? <p className="muted">{r.documentNote}</p> : null}
          </div>
        </section>
      </div>

      <div className="rental-detail-actions">
        <button type="button" className="btn ghost" onClick={openContract}>
          {t("reservations.downloadPdf")}
        </button>
        {canCancel ? (
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              setCancelTarget({
                id: r.id,
                startDate: start,
                endDate: end,
                pickupLocation: r.pickupLocation,
                returnLocation: r.returnLocation,
                totalPrice: Number(r.totalPrice),
                paymentMethod: r.paymentMethod,
                paymentStatus: r.paymentStatus,
                car: {
                  brand: r.car.brand,
                  model: r.car.model,
                  year: r.car.year,
                  imageUrl: r.car.imageUrl,
                  companyName: r.car.companyName,
                },
              })
            }
          >
            {t("reservations.cancelReservation")}
          </button>
        ) : null}
      </div>

      {isFleetManager ? (
        <section className="rental-detail-card rental-detail-manage">
          <h2>{t("reservations.manageRental")}</h2>
          <div className="rental-detail-manage-grid">
            <label>
              {t("reservations.status")}
              <select
                value={r.status}
                onChange={(e) => updateStatus(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            {r.documentUrl ? (
              <label>
                {t("reservations.docStatus")}
                <select
                  value={r.documentStatus || "PENDING"}
                  onChange={(e) => setDocument(e.target.value)}
                >
                  <option value="PENDING">{t("reservations.DOC_PENDING")}</option>
                  <option value="APPROVED">
                    {t("reservations.DOC_APPROVED")}
                  </option>
                  <option value="REJECTED">
                    {t("reservations.DOC_REJECTED")}
                  </option>
                </select>
              </label>
            ) : null}
            <label>
              {t("reservations.depositStatus")}
              <select
                value={r.depositStatus || "NONE"}
                onChange={(e) => setDeposit(e.target.value)}
              >
                <option value="NONE">{t("reservations.DEP_NONE")}</option>
                <option value="HELD">{t("reservations.DEP_HELD")}</option>
                <option value="RETURNED">
                  {t("reservations.DEP_RETURNED")}
                </option>
                <option value="FORFEITED">
                  {t("reservations.DEP_FORFEITED")}
                </option>
              </select>
            </label>
          </div>
          {r.paymentStatus !== "PAID" ? (
            <button type="button" className="btn" onClick={markPaid}>
              {t("reservations.markPaid")}
            </button>
          ) : null}
        </section>
      ) : null}

      {cancelTarget ? (
        <CancelReservationModal
          reservation={cancelTarget}
          submitting={cancelling}
          onClose={() => {
            if (!cancelling) setCancelTarget(null);
          }}
          onConfirm={confirmCancel}
        />
      ) : null}
    </div>
  );
}
