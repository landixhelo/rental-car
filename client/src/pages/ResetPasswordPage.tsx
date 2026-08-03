import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import Seo from "../seo/Seo";

export default function ResetPasswordPage() {
  const t = useT();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { show, Toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      show(t("auth.resetInvalid"));
      return;
    }
    if (password !== confirm) {
      show(t("auth.passwordMismatch"));
      return;
    }
    try {
      const res = await api.resetPassword(token, password);
      show(res.message || t("auth.resetOk"));
      navigate("/login");
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <div className="auth-page">
      <Seo title={t("auth.resetTitle")} path="/reset-password" locale={locale} noindex />
      {Toast}
      <form className="panel" onSubmit={onSubmit}>
        <h1>{t("auth.resetTitle")}</h1>
        <p className="muted">{t("auth.passwordHint")}</p>
        <input
          type="password"
          placeholder={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder={t("auth.confirmPassword")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <button className="btn" type="submit">
          {t("auth.resetBtn")}
        </button>
        <p>
          <Link to="/login">{t("auth.backToLogin")}</Link>
        </p>
      </form>
    </div>
  );
}
