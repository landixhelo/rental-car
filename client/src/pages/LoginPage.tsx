import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { loginWithPasskey, supportsPasskeys } from "../lib/passkeys";
import Seo from "../seo/Seo";

export default function LoginPage() {
  const { login, setUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { show, Toast } = useToast();
  const t = useT();
  const { locale } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const canUsePasskey = supportsPasskeys();
  const nextPath = searchParams.get("next") || "/";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password, rememberMe);
      show(t("auth.welcome"));
      navigate(nextPath.startsWith("/") ? nextPath : "/");
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function onPasskeyLogin() {
    if (passkeyBusy) return;
    setPasskeyBusy(true);
    try {
      const user = await loginWithPasskey(email);
      setUser(user);
      show(t("auth.welcome"));
      navigate(nextPath.startsWith("/") ? nextPath : "/");
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
          autoComplete="email webauthn"
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
        {canUsePasskey ? (
          <>
            <div className="auth-divider" aria-hidden="true">
              <span>{t("auth.or")}</span>
            </div>
            <button
              className="btn ghost passkey-btn"
              type="button"
              disabled={passkeyBusy}
              onClick={onPasskeyLogin}
            >
              {passkeyBusy ? t("auth.passkeyWaiting") : t("auth.passkeyLogin")}
            </button>
            <p className="muted passkey-hint">{t("auth.passkeyLoginHint")}</p>
          </>
        ) : null}
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
