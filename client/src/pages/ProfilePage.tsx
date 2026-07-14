import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { show, Toast } = useToast();
  const t = useT();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    setFullName(user?.fullName || "");
    setPhone(user?.phone || "");
    api
      .notifications()
      .then((r) => setNotifications(r.notifications))
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

  const canManageFleet =
    user?.role === "CONTRACTOR" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN";

  return (
    <div className="section narrow">
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
