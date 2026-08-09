import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { consumeFlash } from "../lib/flash";
import { mediaUrl } from "../lib/mediaUrl";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
] as const;

type Tab = "mine" | "fleet";

export default function ReservationsPage() {
  const { user } = useAuth();
  const t = useT();
  const [mine, setMine] = useState<any[]>([]);
  const [fleet, setFleet] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlashState] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const { show, Toast } = useToast();

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

  async function cancel(id: string) {
    if (!confirm(t("reservations.cancelConfirm"))) return;
    try {
      const res = await api.cancelReservation(id);
      show(res.cancellation?.refundNote || t("status.CANCELLED"));
      await load();
    } catch (e) {
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

  const items = tab === "fleet" ? fleet : mine;

  return (
    <div className="section">
      {Toast}
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
      <div className="row-between" style={{ alignItems: "center", gap: 12 }}>
        <h1 style={{ marginBottom: 0 }}>
          {tab === "fleet" ? t("reservations.fleet") : t("reservations.mine")}
        </h1>
        <button className="btn ghost" type="button" onClick={() => load()}>
          ↻
        </button>
      </div>

      {isFleetManager ? (
        <div className="reservations-tabs" role="tablist" aria-label={t("reservations.title")}>
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

      {loading ? (
        <p className="muted">{t("common.loading")}</p>
      ) : !items.length ? (
        <div className="panel" style={{ marginTop: 18 }}>
          <p>{t("reservations.empty")}</p>
          <Link className="btn" to={tab === "fleet" ? "/contractor" : "/cars"}>
            {tab === "fleet" ? t("nav.fleet") : t("nav.cars")}
          </Link>
        </div>
      ) : tab === "fleet" ? (
        <div className="reservation-list">
          {items.map((r) => (
            <article key={r.id} className="reservation-card fleet-reservation-card">
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
                      €{Number(r.depositAmount || 0)} · {depLabel(r.depositStatus)}
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
                      <option value="PENDING">{t("reservations.DOC_PENDING")}</option>
                      <option value="APPROVED">{t("reservations.DOC_APPROVED")}</option>
                      <option value="REJECTED">{t("reservations.DOC_REJECTED")}</option>
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
                    <option value="RETURNED">{t("reservations.DEP_RETURNED")}</option>
                    <option value="FORFEITED">{t("reservations.DEP_FORFEITED")}</option>
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
      ) : (
        <div className="reservation-list">
          {items.map((r) => (
            <article key={r.id} className="reservation-card">
              <div className="reservation-card-media">
                <img
                  src={mediaUrl(r.car.imageUrl)}
                  alt={`${r.car.brand} ${r.car.model}`}
                />
              </div>
              <div className="reservation-card-body">
                <div className="reservation-card-head">
                  <h3>
                    {r.car.brand} {r.car.model}
                  </h3>
                  <span className={`badge status-${r.status}`}>
                    {statusText(r.status)}
                  </span>
                </div>
                <span className="company-chip">
                  {r.car.companyName || "AutoRent"}
                </span>
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
                    <dt>{t("details.payment")}</dt>
                    <dd>
                      {r.paymentMethod} · {r.paymentStatus}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("reservations.deposit")}</dt>
                    <dd>
                      €{Number(r.depositAmount || 0)} · {depLabel(r.depositStatus)}
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
                      ) : null}
                    </dd>
                  </div>
                </dl>
                <p className="total">€{r.totalPrice}</p>
                <div className="reservation-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => openContract(r.id)}
                  >
                    {t("reservations.downloadPdf")}
                  </button>
                  {!["CANCELLED", "COMPLETED", "REJECTED"].includes(r.status) && (
                    <button
                      type="button"
                      className="btn danger"
                      onClick={() => cancel(r.id)}
                    >
                      {t("reservations.cancel")}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
