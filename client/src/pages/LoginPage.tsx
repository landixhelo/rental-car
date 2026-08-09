import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import Seo from "../seo/Seo";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { show, Toast } = useToast();
  const t = useT();
  const { locale } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password, rememberMe);
      show(t("auth.welcome"));
      navigate("/");
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <div className="auth-page">
      <Seo title={t("auth.loginTitle")} path="/login" locale={locale} noindex />
      {Toast}
      <form className="panel" onSubmit={onSubmit}>
        <h1>{t("auth.loginTitle")}</h1>
        <input
          type="email"
          placeholder={t("auth.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          type="password"
          placeholder={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <label className="remember-me">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span>{t("auth.rememberMe")}</span>
        </label>
        <button className="btn" type="submit">
          {t("auth.loginBtn")}
        </button>
        <p>
          <Link to="/forgot-password">{t("auth.forgotLink")}</Link>
        </p>
        <p>
          {t("auth.noAccount")} <Link to="/register">{t("nav.register")}</Link>
        </p>
      </form>
    </div>
  );
}
