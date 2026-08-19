import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { loginWithPasskey, supportsPasskeys } from "../lib/passkeys";
import {
  isStaffOnlyPath,
  isStaffRole,
} from "../components/OpsLayout";
import BrandLockup from "../components/BrandLockup";
import Seo from "../seo/Seo";

function staffNext(raw: string | null) {
  const path = (raw || "/dashboard").split("?")[0];
  if (path.startsWith("/") && isStaffOnlyPath(path)) return raw || "/dashboard";
  return "/dashboard";
}

export default function OpsLoginPage() {
  const { user, login, logout, setUser, loading } = useAuth();
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
  const nextPath = staffNext(searchParams.get("next"));

  async function enterAsStaff(role: string) {
    if (!isStaffRole(role)) {
      await logout();
      show(t("opsLogin.notStaff"));
      return;
    }
    show(t("auth.welcome"));
    navigate(nextPath);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const signedIn = await login(email, password, rememberMe);
      await enterAsStaff(signedIn.role);
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function onPasskeyLogin() {
    if (passkeyBusy) return;
    setPasskeyBusy(true);
    try {
      const signedIn = await loginWithPasskey(email);
      setUser(signedIn);
      await enterAsStaff(signedIn.role);
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

  if (loading) {
    return <div className="section">{t("common.loading")}</div>;
  }

  if (user && isStaffRole(user.role)) {
    return <Navigate to={nextPath} replace />;
  }

  return (
    <div className="auth-page ops-login">
      <Seo title={t("opsLogin.title")} path="/ops" locale={locale} noindex />
      {Toast}
      <form className="panel" onSubmit={onSubmit}>
        <BrandLockup size="ops" />
        <h1>{t("opsLogin.title")}</h1>
        <p className="muted">{t("opsLogin.sub")}</p>
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
          {t("opsLogin.btn")}
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
          </>
        ) : null}
        <p>
          <Link to="/forgot-password">{t("auth.forgotLink")}</Link>
        </p>
      </form>
    </div>
  );
}
