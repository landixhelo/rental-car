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
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await api.forgotPassword(email);
      setSent(true);
      setResetUrl(res.resetUrl || null);
      show(res.message || t("auth.resetSent"));
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function copyLink() {
    if (!resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetUrl);
      show(t("auth.resetLinkCopied"));
    } catch {
      show(t("common.error"));
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
          disabled={sent}
        />
        <button className="btn" type="submit" disabled={sent}>
          {t("auth.sendReset")}
        </button>
        {resetUrl ? (
          <div className="reset-link-box">
            <p className="muted">{t("auth.resetLinkHint")}</p>
            <a href={resetUrl}>{t("auth.openResetLink")}</a>
            <button className="btn ghost" type="button" onClick={copyLink}>
              {t("auth.copyResetLink")}
            </button>
          </div>
        ) : null}
        <p>
          <Link to="/login">{t("auth.backToLogin")}</Link>
        </p>
      </form>
    </div>
  );
}
