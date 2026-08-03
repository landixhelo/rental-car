import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
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

export default function ReservationsPage() {
  const { user } = useAuth();
  const t = useT();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { show, Toast } = useToast();

  const showReservationAlerts =
    user?.role === "CONTRACTOR" || user?.role === "SUPER_ADMIN";

  const isFleetManager =
    user?.role === "CONTRACTOR" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN";

  async function load() {
    setLoading(true);
    try {
      if (isFleetManager) {
        const res = await api.fleetReservations();
        setItems(res.reservations || []);
      } else {
        const res = await api.myReservations();
        setItems(res.reservations || []);
      }

      if (showReservationAlerts) {
        await api.markReservationNotificationsRead().catch(() => {});
        window.dispatchEvent(new Event("autorent:reservations-seen"));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    load().catch((e) => show(e.message));
  }, [user?.id, user?.role]);

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

  return (
    <div className="section">
      {Toast}
      {isFleetManager ? (
        <>
          <div className="row-between" style={{ alignItems: "center" }}>
            <div>
              <h1 style={{ marginBottom: 6 }}>{t("reservations.fleet")}</h1>
            </div>
            <button className="btn ghost" type="button" onClick={() => load()}>
              ↻
            </button>
          </div>

          {loading ? (
            <p className="muted">{t("common.loading")}</p>
          ) : !items.length ? (
            <div className="panel" style={{ marginTop: 18 }}>
              <p>{t("reservations.empty")}</p>
              <Link className="btn" to="/contractor">
                {t("nav.fleet")}
              </Link>
            </div>
          ) : (
            <div className="reservation-list" style={{ marginTop: 18 }}>
              {items.map((r) => (
                <div key={r.id} className="reservation-card fleet-reservation-card">
                  {r.car?.imageUrl ? (
                    <img src={mediaUrl(r.car.imageUrl)} alt="" />
                  ) : (
                    <div className="fleet-reservation-fallback" />
                  )}
                  <div>
                    <div className="row-between">
                      <h3>
                        {r.car?.brand} {r.car?.model}
                      </h3>
                      <span className={`badge status-${r.status}`}>
                        {statusText(r.status)}
                      </span>
                    </div>
                    <p>
                      <strong>{r.user?.fullName}</strong>
                      {r.user?.email ? ` · ${r.user.email}` : ""}
                      {r.user?.phone ? ` · ${r.user.phone}` : ""}
                    </p>
                    <p>
                      {String(r.startDate).slice(0, 10)} →{" "}
                      {String(r.endDate).slice(0, 10)}
                    </p>
                    <p>
                      {r.pickupLocation} → {r.returnLocation}
                    </p>
                    <p className="total">€{r.totalPrice}</p>
                    <p>
                      {t("reservations.deposit")}: €{Number(r.depositAmount || 0)} ·{" "}
                      {depLabel(r.depositStatus)}
                    </p>
                    <p>
                      {t("reservations.document")}: {docLabel(r.documentStatus)}
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
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <h1>{t("reservations.mine")}</h1>
          {loading ? (
            <p className="muted">{t("common.loading")}</p>
          ) : !items.length ? (
            <div className="panel">
              <p>{t("reservations.empty")}</p>
              <Link className="btn" to="/cars">
                {t("nav.cars")}
              </Link>
            </div>
          ) : (
            <div className="reservation-list">
              {items.map((r) => (
                <div key={r.id} className="reservation-card">
                  <img src={mediaUrl(r.car.imageUrl)} alt={t("details.noPhoto")} />
                  <div>
                    <h3>
                      {r.car.brand} {r.car.model}
                    </h3>
                    <span className="company-chip">
                      {r.car.companyName || "AutoRent"}
                    </span>
                    <p>
                      {String(r.startDate).slice(0, 10)} →{" "}
                      {String(r.endDate).slice(0, 10)}
                    </p>
                    <p>
                      {r.pickupLocation} → {r.returnLocation}
                    </p>
                    <p>
                      {r.paymentMethod} · {r.paymentStatus}
                    </p>
                    <p>
                      {t("reservations.deposit")}: €{Number(r.depositAmount || 0)} ·{" "}
                      {depLabel(r.depositStatus)}
                    </p>
                    <p>
                      {t("reservations.document")}: {docLabel(r.documentStatus)}
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
                    </p>
                    <p className="total">€{r.totalPrice}</p>
                    <span className={`badge status-${r.status}`}>
                      {statusText(r.status)}
                    </span>
                    <div className="reservation-actions">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => openContract(r.id)}
                      >
                        {t("reservations.downloadPdf")}
                      </button>
                      {!["CANCELLED", "COMPLETED", "REJECTED"].includes(
                        r.status
                      ) && (
                        <button
                          className="btn danger"
                          onClick={() => cancel(r.id)}
                        >
                          {t("reservations.cancel")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
