import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { show, Toast } = useToast();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    setFullName(user?.fullName || "");
    setPhone(user?.phone || "");
    api.notifications().then((r) => setNotifications(r.notifications)).catch(() => {});
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
      show("Profili u përditësua");
    } catch (err) {
      show(err instanceof Error ? err.message : "Error");
    }
  }

  const canManageFleet =
    user?.role === "CONTRACTOR" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN";

  return (
    <div className="section narrow">
      {Toast}
      <h1>Profili Im</h1>

      {canManageFleet ? (
        <div className="panel" style={{ marginBottom: 20 }}>
          <h2>Paneli i flotës</h2>
          <p className="muted">
            Shto, edito ose fshi makinat e tua dhe menaxho rezervimet e tyre.
          </p>
          <Link to="/contractor" className="btn">
            Hap panelin e kontraktorit
          </Link>
        </div>
      ) : null}

      <form className="panel" onSubmit={onSubmit}>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input value={user?.email || ""} disabled />
        <input value={phone || ""} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Fjalëkalimi i ri (opsionale)"
        />
        <button className="btn" type="submit">
          Ruaj
        </button>
      </form>

      <div className="panel" style={{ marginTop: 20 }}>
        <h2>Njoftimet</h2>
        {!notifications.length && <p className="muted">Nuk ka njoftime.</p>}
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
