import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import Seo from "../seo/Seo";

export default function ForgotPasswordPage() {
  const t = useT();
  const { locale } = useLocale();
  const { show, Toast } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await api.forgotPassword(email);
      setSent(true);
      show(res.message || t("auth.resetSent"));
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <div className="auth-page">
      <Seo title={t("auth.forgotTitle")} path="/forgot-password" locale={locale} noindex />
      {Toast}
      <form className="panel" onSubmit={onSubmit}>
        <h1>{t("auth.forgotTitle")}</h1>
        <p className="muted">{t("auth.forgotHint")}</p>
        <input
          type="email"
          placeholder={t("auth.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="btn" type="submit" disabled={sent}>
          {t("auth.sendReset")}
        </button>
        <p>
          <Link to="/login">{t("auth.backToLogin")}</Link>
        </p>
      </form>
    </div>
  );
}
