import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { show, Toast } = useToast();
  const t = useT();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await register({ fullName, email, password, phone });
      show(t("auth.accountCreated"));
      navigate("/");
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <div className="auth-page">
      {Toast}
      <form className="panel" onSubmit={onSubmit}>
        <h1>{t("auth.registerTitle")}</h1>
        <input
          placeholder={t("auth.fullName")}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder={t("auth.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          placeholder={t("auth.phone")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          type="password"
          placeholder={t("auth.passwordHint")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn" type="submit">
          {t("auth.registerBtn")}
        </button>
        <p>
          {t("auth.hasAccount")} <Link to="/login">{t("nav.login")}</Link>
        </p>
      </form>
    </div>
  );
}
