import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { registerPasskey, supportsPasskeys } from "../lib/passkeys";
import type { Locale } from "../i18n";
import { LOCALE_LABELS, LOCALES } from "../i18n";

type PasskeyRow = { id: string; createdAt: string; transports: string[] };

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { show, Toast } = useToast();
  const t = useT();
  const { locale, setLocale } = useLocale();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState(user?.companyName || "");
  const [businessPhone, setBusinessPhone] = useState(
    user?.businessPhone || ""
  );
  const [businessWhatsapp, setBusinessWhatsapp] = useState(
    user?.businessWhatsapp || ""
  );
  const [businessAddress, setBusinessAddress] = useState(
    user?.businessAddress || ""
  );
  const [bookingNotifyEmail, setBookingNotifyEmail] = useState(
    user?.bookingNotifyEmail || ""
  );
  const [notifyBookingEmail, setNotifyBookingEmail] = useState(
    user?.notifyBookingEmail ?? true
  );
  const [notifyCancelEmail, setNotifyCancelEmail] = useState(
    user?.notifyCancelEmail ?? true
  );
  const [notifyPaymentEmail, setNotifyPaymentEmail] = useState(
    user?.notifyPaymentEmail ?? true
  );
  const [notifyDocumentEmail, setNotifyDocumentEmail] = useState(
    user?.notifyDocumentEmail ?? true
  );
  const [notifications, setNotifications] = useState<any[]>([]);
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const canUsePasskey = supportsPasskeys();

  const canManageFleet =
    user?.role === "CONTRACTOR" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN";

  useEffect(() => {
    setFullName(user?.fullName || "");
    setPhone(user?.phone || "");
    setCompanyName(user?.companyName || "");
    setBusinessPhone(user?.businessPhone || "");
    setBusinessWhatsapp(user?.businessWhatsapp || "");
    setBusinessAddress(user?.businessAddress || "");
    setBookingNotifyEmail(user?.bookingNotifyEmail || "");
    setNotifyBookingEmail(user?.notifyBookingEmail ?? true);
    setNotifyCancelEmail(user?.notifyCancelEmail ?? true);
    setNotifyPaymentEmail(user?.notifyPaymentEmail ?? true);
    setNotifyDocumentEmail(user?.notifyDocumentEmail ?? true);
    api
      .notifications()
      .then((r) => setNotifications(r.notifications))
      .catch(() => {});
    api
      .passkeys()
      .then((r) => setPasskeys(r.passkeys))
      .catch(() => {});
  }, [user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateProfile({
        fullName,
        phone,
        password: password || undefined,
        notifyBookingEmail,
        notifyCancelEmail,
        notifyPaymentEmail,
        notifyDocumentEmail,
        ...(canManageFleet
          ? {
              companyName,
              businessPhone,
              businessWhatsapp,
              businessAddress,
              bookingNotifyEmail: bookingNotifyEmail.trim() || "",
            }
          : {}),
      });
      setUser(res.user);
      setPassword("");
      show(t("profile.saved"));
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function onEnablePasskey() {
    if (passkeyBusy) return;
    setPasskeyBusy(true);
    try {
      const res = await registerPasskey();
      setPasskeys(res.passkeys);
      show(t("profile.passkeyAdded"));
    } catch (err) {
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name: string }).name)
          : "";
      if (name === "NotAllowedError") {
        show(t("auth.passkeyCancelled"));
      } else {
        show(err instanceof Error ? err.message : t("auth.passkeyFailed"));
      }
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function onRemovePasskey(id: string) {
    try {
      await api.passkeyDelete(id);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
      show(t("profile.passkeyRemoved"));
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <div className="ops-page ops-page-narrow">
      {Toast}
      <header className="ops-page-head">
        <div>
          <h1>{t("dashboard.navSettings")}</h1>
          <p>{t("profile.settingsSub")}</p>
        </div>
      </header>

      <section className="settings-card">
        <h2>{t("nav.language")}</h2>
        <p className="muted">{t("profile.languageHint")}</p>
        <div className="settings-lang" role="group" aria-label={t("nav.language")}>
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              className={locale === code ? "active" : undefined}
              onClick={() => setLocale(code as Locale)}
            >
              {LOCALE_LABELS[code]}
            </button>
          ))}
        </div>
      </section>

      {canManageFleet ? (
        <div className="settings-card">
          <h2>{t("profile.fleetPanel")}</h2>
          <p className="muted">{t("profile.fleetPanelText")}</p>
          <Link to="/contractor" className="btn">
            {t("profile.openFleet")}
          </Link>
        </div>
      ) : null}

      <form className="settings-card" onSubmit={onSubmit}>
        <h2>{t("profile.accountSection")}</h2>
        <label className="settings-field">
          <span>{t("checkout.fullName")}</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </label>
        <label className="settings-field">
          <span>{t("checkout.email")}</span>
          <input value={user?.email || ""} disabled />
        </label>
        <label className="settings-field">
          <span>{t("auth.phone")}</span>
          <input
            value={phone || ""}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("auth.phone")}
          />
        </label>
        <label className="settings-field">
          <span>{t("profile.newPassword")}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("profile.newPassword")}
            autoComplete="new-password"
          />
        </label>

        {canManageFleet ? (
          <>
            <h2 className="settings-subhead">{t("profile.businessSection")}</h2>
            <p className="muted">{t("profile.businessHint")}</p>
            <label className="settings-field">
              <span>{t("profile.company")}</span>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t("profile.company")}
              />
            </label>
            <label className="settings-field">
              <span>{t("profile.businessPhone")}</span>
              <input
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="+355…"
              />
            </label>
            <label className="settings-field">
              <span>{t("profile.businessWhatsapp")}</span>
              <input
                value={businessWhatsapp}
                onChange={(e) => setBusinessWhatsapp(e.target.value)}
                placeholder="3556…"
              />
            </label>
            <label className="settings-field">
              <span>{t("profile.businessAddress")}</span>
              <input
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder={t("profile.businessAddressPh")}
              />
            </label>
            <label className="settings-field">
              <span>{t("profile.bookingNotifyEmail")}</span>
              <input
                type="email"
                value={bookingNotifyEmail}
                onChange={(e) => setBookingNotifyEmail(e.target.value)}
                placeholder={user?.email || "ops@…"}
              />
              <small className="muted">{t("profile.bookingNotifyEmailHint")}</small>
            </label>
          </>
        ) : null}

        <h2 className="settings-subhead">{t("profile.notifySection")}</h2>
        <p className="muted">{t("profile.notifyHint")}</p>
        <div className="settings-toggles">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={notifyBookingEmail}
              onChange={(e) => setNotifyBookingEmail(e.target.checked)}
            />
            <span>
              <strong>{t("profile.notifyBooking")}</strong>
              <small>{t("profile.notifyBookingHint")}</small>
            </span>
          </label>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={notifyCancelEmail}
              onChange={(e) => setNotifyCancelEmail(e.target.checked)}
            />
            <span>
              <strong>{t("profile.notifyCancel")}</strong>
              <small>{t("profile.notifyCancelHint")}</small>
            </span>
          </label>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={notifyPaymentEmail}
              onChange={(e) => setNotifyPaymentEmail(e.target.checked)}
            />
            <span>
              <strong>{t("profile.notifyPayment")}</strong>
              <small>{t("profile.notifyPaymentHint")}</small>
            </span>
          </label>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={notifyDocumentEmail}
              onChange={(e) => setNotifyDocumentEmail(e.target.checked)}
            />
            <span>
              <strong>{t("profile.notifyDocument")}</strong>
              <small>{t("profile.notifyDocumentHint")}</small>
            </span>
          </label>
        </div>

        <button className="btn" type="submit" disabled={saving}>
          {saving ? t("common.loading") : t("common.save")}
        </button>
      </form>

      {canUsePasskey ? (
        <div className="settings-card">
          <h2>{t("profile.passkeyTitle")}</h2>
          <p className="muted">{t("profile.passkeyHint")}</p>
          <button
            className="btn"
            type="button"
            disabled={passkeyBusy}
            onClick={onEnablePasskey}
          >
            {passkeyBusy
              ? t("auth.passkeyWaiting")
              : t("profile.passkeyEnable")}
          </button>
          {passkeys.length ? (
            <ul className="passkey-list">
              {passkeys.map((p, i) => (
                <li key={p.id}>
                  <span>
                    {t("profile.passkeyDevice")} {i + 1}
                    <small className="muted">
                      {" "}
                      · {new Date(p.createdAt).toLocaleDateString()}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="btn ghost danger-text"
                    onClick={() => onRemovePasskey(p.id)}
                  >
                    {t("common.delete")}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ marginTop: 12 }}>
              {t("profile.passkeyNone")}
            </p>
          )}
        </div>
      ) : null}

      <div className="settings-card">
        <h2>{t("profile.notifications")}</h2>
        {!notifications.length && (
          <p className="muted">{t("profile.noNotifications")}</p>
        )}
        {notifications.map((n) => (
          <div key={n.id} className="review-item">
            <strong>{n.title}</strong>
            <p>{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
