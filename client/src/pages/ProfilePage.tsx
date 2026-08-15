import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { registerPasskey, supportsPasskeys } from "../lib/passkeys";

type PasskeyRow = { id: string; createdAt: string; transports: string[] };

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { show, Toast } = useToast();
  const t = useT();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const canUsePasskey = supportsPasskeys();

  useEffect(() => {
    setFullName(user?.fullName || "");
    setPhone(user?.phone || "");
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
    try {
      const res = await api.updateProfile({
        fullName,
        phone,
        password: password || undefined,
      });
      setUser(res.user);
      setPassword("");
      show(t("profile.saved"));
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
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

  const canManageFleet =
    user?.role === "CONTRACTOR" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN";

  return (
    <div className="ops-page ops-page-narrow">
      {Toast}
      <h1>{t("profile.title")}</h1>

      {canManageFleet ? (
        <div className="panel" style={{ marginBottom: 20 }}>
          <h2>{t("profile.fleetPanel")}</h2>
          <p className="muted">{t("profile.fleetPanelText")}</p>
          <Link to="/contractor" className="btn">
            {t("profile.openFleet")}
          </Link>
        </div>
      ) : null}

      <form className="panel" onSubmit={onSubmit}>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input value={user?.email || ""} disabled />
        <input
          value={phone || ""}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("auth.phone")}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("profile.newPassword")}
        />
        <button className="btn" type="submit">
          {t("common.save")}
        </button>
      </form>

      {canUsePasskey ? (
        <div className="panel" style={{ marginTop: 20 }}>
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

      <div className="panel" style={{ marginTop: 20 }}>
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
