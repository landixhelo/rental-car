import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import CancelReservationModal, {
  type CancelReservationTarget,
} from "../components/CancelReservationModal";
import { consumeFlash } from "../lib/flash";
import { mediaUrl } from "../lib/mediaUrl";
import { carPath } from "../lib/carPath";
import { formatReservationCode, formatShortDate } from "../lib/bookingDraft";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { tiraneToday } from "../lib/dates";

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
] as const;

type Tab = "mine" | "fleet";
type Phase = "upcoming" | "active" | "completed" | "cancelled";

const PAGE_SIZE = 3;

function reservationPhase(r: any, today: string): Phase {
  const start = String(r.startDate).slice(0, 10);
  const end = String(r.endDate).slice(0, 10);
  if (r.status === "CANCELLED" || r.status === "REJECTED") return "cancelled";
  if (r.status === "COMPLETED") return "completed";
  if (end < today) return "completed";
  if (start <= today && today <= end) return "active";
  if (start > today) return "upcoming";
  return "completed";
}

export default function ReservationsPage() {
  const { user } = useAuth();
  const t = useT();
  const { locale } = useLocale();
  const [mine, setMine] = useState<any[]>([]);
  const [fleet, setFleet] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [flash, setFlashState] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [cancelTarget, setCancelTarget] =
    useState<CancelReservationTarget | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const { show, Toast } = useToast();
  const today = tiraneToday();

  const isFleetManager =
    user?.role === "CONTRACTOR" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN";

  const [tab, setTab] = useState<Tab>("mine");

  async function load() {
    setLoading(true);
    try {
      const mineRes = await api.myReservations();
      setMine(mineRes.reservations || []);

      if (isFleetManager) {
        const fleetRes = await api.fleetReservations();
        setFleet(fleetRes.reservations || []);
      } else {
        setFleet([]);
      }

      if (isFleetManager) {
        await api.markReservationNotificationsRead().catch(() => {});
        window.dispatchEvent(new Event("autorent:reservations-seen"));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    setTab("mine");
    load().catch((e) => show(e.message));
  }, [user?.id, user?.role]);

  useEffect(() => {
    const payload = consumeFlash();
    if (!payload) return;
    setFlashState(payload);
    show(payload.message, 7000);
  }, [show]);

  useEffect(() => {
    setPage(1);
  }, [tab, mine.length]);

  function openCancel(r: any) {
    setCancelTarget({
      id: r.id,
      startDate: String(r.startDate).slice(0, 10),
      endDate: String(r.endDate).slice(0, 10),
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
    });
  }

  async function confirmCancel(reason: string) {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await api.cancelReservation(cancelTarget.id, reason);
      setCancelTarget(null);
      setCancelling(false);
      show(res.cancellation?.refundNote || t("status.CANCELLED"), 6000);
      await load().catch(() => {});
    } catch (e) {
      setCancelling(false);
      show(e instanceof Error ? e.message : t("common.error"));
    }
  }

  function statusText(status: string) {
    if (
      status === "PENDING" ||
      status === "CONFIRMED" ||
      status === "COMPLETED" ||
      status === "CANCELLED" ||
      status === "REJECTED"
    ) {
      return t(`status.${status}`);
    }
    return status;
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api.updateReservationStatus(id, status);
      show(statusText(status));
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : t("common.error"));
    }
  }

  async function markPaid(id: string) {
    try {
      await api.updateReservationPayment(id, "PAID");
      show(t("reservations.paidOk"));
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : t("common.error"));
    }
  }

  function openContract(id: string) {
    window.open(api.reservationContractUrl(id), "_blank", "noopener");
  }

  async function setDocument(id: string, documentStatus: string) {
    try {
      await api.updateReservationDocument(id, { documentStatus });
      show(
        documentStatus === "APPROVED"
          ? t("reservations.docApproved")
          : t("reservations.docRejected")
      );
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : t("common.error"));
    }
  }

  async function setDeposit(id: string, depositStatus: string) {
    try {
      await api.updateReservationDeposit(id, { depositStatus });
      show(t("reservations.depositUpdated"));
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : t("common.error"));
    }
  }

  function docLabel(status?: string) {
    if (status === "PENDING") return t("reservations.DOC_PENDING");
    if (status === "APPROVED") return t("reservations.DOC_APPROVED");
    if (status === "REJECTED") return t("reservations.DOC_REJECTED");
    return t("reservations.DOC_NONE");
  }

  function depLabel(status?: string) {
    if (status === "HELD") return t("reservations.DEP_HELD");
    if (status === "RETURNED") return t("reservations.DEP_RETURNED");
    if (status === "FORFEITED") return t("reservations.DEP_FORFEITED");
    return t("reservations.DEP_NONE");
  }

  const stats = useMemo(() => {
    let upcoming = 0;
    let active = 0;
    let completed = 0;
    for (const r of mine) {
      const p = reservationPhase(r, today);
      if (p === "upcoming") upcoming += 1;
      else if (p === "active") active += 1;
      else if (p === "completed") completed += 1;
    }
    return { upcoming, active, completed };
  }, [mine, today]);

  const sortedMine = useMemo(() => {
    const order: Record<Phase, number> = {
      active: 0,
      upcoming: 1,
      completed: 2,
      cancelled: 3,
    };
    return [...mine].sort((a, b) => {
      const pa = reservationPhase(a, today);
      const pb = reservationPhase(b, today);
      if (order[pa] !== order[pb]) return order[pa] - order[pb];
      return String(b.startDate).localeCompare(String(a.startDate));
    });
  }, [mine, today]);

  const totalPages = Math.max(1, Math.ceil(sortedMine.length / PAGE_SIZE));
  const pageItems = sortedMine.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function phaseLabel(phase: Phase) {
    if (phase === "upcoming") return t("reservations.phaseUpcoming");
    if (phase === "active") return t("reservations.phaseActive");
    if (phase === "completed") return t("reservations.phaseCompleted");
    return statusText("CANCELLED");
  }

  function phaseBadge(phase: Phase, status: string) {
    if (phase === "active") return t("reservations.badgeActive");
    if (phase === "upcoming") return statusText(status);
    if (phase === "completed") return t("status.COMPLETED");
    return statusText(status);
  }

  return (
    <div className={`reservations-page${tab === "mine" ? " is-mine" : ""}`}>
      {Toast}
      <CancelReservationModal
        reservation={cancelTarget}
        submitting={cancelling}
        onClose={() => {
          if (!cancelling) setCancelTarget(null);
        }}
        onConfirm={confirmCancel}
      />
      {flash ? (
        <div className="flash-success" role="status">
          <strong>{flash.title}</strong>
          <p>{flash.message}</p>
          <button
            type="button"
            className="link-btn"
            onClick={() => setFlashState(null)}
          >
            {t("common.close")}
          </button>
        </div>
      ) : null}

      {isFleetManager ? (
        <div
          className="reservations-tabs"
          role="tablist"
          aria-label={t("reservations.title")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "mine"}
            className={tab === "mine" ? "active" : undefined}
            onClick={() => setTab("mine")}
          >
            {t("reservations.mine")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "fleet"}
            className={tab === "fleet" ? "active" : undefined}
            onClick={() => setTab("fleet")}
          >
            {t("reservations.fleet")}
          </button>
        </div>
      ) : null}

      {tab === "mine" ? (
        <>
          <div className="res-hero">
            <div>
              <h1>{t("reservations.mineTitle")}</h1>
              <p>{t("reservations.mineSub")}</p>
            </div>
            <Link to="/cars" className="btn res-new">
              + {t("reservations.newReservation")}
            </Link>
          </div>

          <div className="res-stats">
            <div className="res-stat res-stat--upcoming">
              <span className="res-stat-ico" aria-hidden>
                📅
              </span>
              <div>
                <strong>{stats.upcoming}</strong>
                <span>{t("reservations.statUpcoming")}</span>
              </div>
            </div>
            <div className="res-stat res-stat--active">
              <span className="res-stat-ico" aria-hidden>
                🔑
              </span>
              <div>
                <strong>{stats.active}</strong>
                <span>{t("reservations.statActive")}</span>
              </div>
            </div>
            <div className="res-stat res-stat--completed">
              <span className="res-stat-ico" aria-hidden>
                ✓
              </span>
              <div>
                <strong>{stats.completed}</strong>
                <span>{t("reservations.statCompleted")}</span>
              </div>
            </div>
          </div>

          <h2 className="res-section-title">{t("reservations.recent")}</h2>

          {loading ? (
            <p className="muted">{t("common.loading")}</p>
          ) : !sortedMine.length ? (
            <div className="res-empty">
              <p>{t("reservations.empty")}</p>
              <Link className="btn" to="/cars">
                {t("nav.cars")}
              </Link>
            </div>
          ) : (
            <>
              <div className="res-list">
                {pageItems.map((r) => {
                  const phase = reservationPhase(r, today);
                  const start = String(r.startDate).slice(0, 10);
                  const end = String(r.endDate).slice(0, 10);
                  const code = formatReservationCode(r.id, r.createdAt);
                  return (
                    <article
                      key={r.id}
                      className={`res-card phase-${phase}`}
                    >
                      <div className="res-card-media">
                        <img
                          src={mediaUrl(r.car.imageUrl)}
                          alt={`${r.car.brand} ${r.car.model}`}
                        />
                        <span className={`res-phase-tag phase-${phase}`}>
                          {phaseLabel(phase)}
                        </span>
                      </div>
                      <div className="res-card-body">
                        <div className="res-card-top">
                          <div>
                            <h3>
                              {r.car.brand} {r.car.model}
                            </h3>
                            <p className="res-id">
                              ID: {code}
                            </p>
                          </div>
                          <div className="res-price">
                            <strong>€{r.totalPrice}</strong>
                            <span>{t("reservations.totalPrice")}</span>
                          </div>
                        </div>
                        <div className="res-card-meta">
                          <div>
                            <span>{t("reservations.pickup")}</span>
                            <strong>
                              {formatShortDate(start, locale)} · {r.pickupLocation}
                            </strong>
                          </div>
                          <div>
                            <span>{t("reservations.return")}</span>
                            <strong>
                              {formatShortDate(end, locale)} · {r.returnLocation}
                            </strong>
                          </div>
                        </div>
                        <span className={`res-status-pill phase-${phase}`}>
                          {phaseBadge(phase, r.status)}
                        </span>
                        {r.status === "CANCELLED" && r.cancelReason ? (
                          <p className="cancel-reason-note">
                            <strong>{t("reservations.cancelReason")}:</strong>{" "}
                            {r.cancelReason}
                          </p>
                        ) : null}
                      </div>
                      <div className="res-card-actions">
                        {phase === "upcoming" ? (
                          <>
                            <Link
                              to={carPath(r.car)}
                              className="btn"
                            >
                              {t("reservations.viewDetails")}
                            </Link>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => openCancel(r)}
                            >
                              {t("reservations.cancelReservation")}
                            </button>
                          </>
                        ) : null}
                        {phase === "active" ? (
                          <>
                            <Link to={carPath(r.car)} className="btn res-btn-dark">
                              {t("reservations.manageRental")}
                            </Link>
                            <Link to="/terms" className="btn ghost">
                              {t("reservations.extendedPolicy")}
                            </Link>
                          </>
                        ) : null}
                        {phase === "completed" ? (
                          <>
                            <button
                              type="button"
                              className="btn res-btn-muted"
                              onClick={() => openContract(r.id)}
                            >
                              {t("reservations.downloadPdf")}
                            </button>
                            <Link to={carPath(r.car)} className="btn ghost">
                              {t("reservations.rentAgain")}
                            </Link>
                          </>
                        ) : null}
                        {phase === "cancelled" ? (
                          <>
                            <Link to={carPath(r.car)} className="btn ghost">
                              {t("reservations.rentAgain")}
                            </Link>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => openContract(r.id)}
                            >
                              {t("reservations.downloadPdf")}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              {sortedMine.length > PAGE_SIZE ? (
                <nav className="fleet-pager res-pager" aria-label="Pagination">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (n) => (
                      <button
                        key={n}
                        type="button"
                        className={n === page ? "active" : undefined}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    ›
                  </button>
                </nav>
              ) : null}
            </>
          )}
        </>
      ) : loading ? (
        <p className="muted">{t("common.loading")}</p>
      ) : !fleet.length ? (
        <div className="res-empty">
          <p>{t("reservations.empty")}</p>
          <Link className="btn" to="/contractor">
            {t("nav.fleet")}
          </Link>
        </div>
      ) : (
        <div className="reservation-list">
          {fleet.map((r) => (
            <article
              key={r.id}
              className="reservation-card fleet-reservation-card"
            >
              <div className="reservation-card-media">
                {r.car?.imageUrl ? (
                  <img src={mediaUrl(r.car.imageUrl)} alt="" />
                ) : (
                  <div className="fleet-reservation-fallback" />
                )}
              </div>
              <div className="reservation-card-body">
                <div className="reservation-card-head">
                  <h3>
                    {r.car?.brand} {r.car?.model}
                  </h3>
                  <span className={`badge status-${r.status}`}>
                    {statusText(r.status)}
                  </span>
                </div>
                <p className="reservation-customer">
                  <strong>{r.user?.fullName}</strong>
                  {r.user?.email ? (
                    <span className="muted"> · {r.user.email}</span>
                  ) : null}
                  {r.user?.phone ? (
                    <span className="muted"> · {r.user.phone}</span>
                  ) : null}
                </p>
                <dl className="reservation-meta">
                  <div>
                    <dt>{t("reservations.dates")}</dt>
                    <dd>
                      {String(r.startDate).slice(0, 10)} →{" "}
                      {String(r.endDate).slice(0, 10)}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("reservations.route")}</dt>
                    <dd>
                      {r.pickupLocation} → {r.returnLocation}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("reservations.deposit")}</dt>
                    <dd>
                      €{Number(r.depositAmount || 0)} ·{" "}
                      {depLabel(r.depositStatus)}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("reservations.document")}</dt>
                    <dd>
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
                    </dd>
                  </div>
                </dl>
                <p className="total">€{r.totalPrice}</p>
                <label className="fleet-status-label">
                  {t("reservations.status")}
                  <select
                    value={r.status}
                    onChange={(e) => updateStatus(r.id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`status.${s}`)}
                      </option>
                    ))}
                  </select>
                </label>
                {r.documentUrl ? (
                  <label className="fleet-status-label">
                    {t("reservations.docStatus")}
                    <select
                      value={r.documentStatus || "PENDING"}
                      onChange={(e) => setDocument(r.id, e.target.value)}
                    >
                      <option value="PENDING">
                        {t("reservations.DOC_PENDING")}
                      </option>
                      <option value="APPROVED">
                        {t("reservations.DOC_APPROVED")}
                      </option>
                      <option value="REJECTED">
                        {t("reservations.DOC_REJECTED")}
                      </option>
                    </select>
                  </label>
                ) : null}
                <label className="fleet-status-label">
                  {t("reservations.depositStatus")}
                  <select
                    value={r.depositStatus || "NONE"}
                    onChange={(e) => setDeposit(r.id, e.target.value)}
                  >
                    <option value="HELD">{t("reservations.DEP_HELD")}</option>
                    <option value="RETURNED">
                      {t("reservations.DEP_RETURNED")}
                    </option>
                    <option value="FORFEITED">
                      {t("reservations.DEP_FORFEITED")}
                    </option>
                  </select>
                </label>
                <div className="reservation-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => openContract(r.id)}
                  >
                    {t("reservations.downloadPdf")}
                  </button>
                  {r.paymentStatus !== "PAID" ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => markPaid(r.id)}
                    >
                      {t("reservations.markPaid")}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
