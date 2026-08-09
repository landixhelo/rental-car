import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "../context/LocaleContext";
import {
  getCookieConsent,
  setCookieConsent,
  type CookieConsentValue,
} from "../lib/cookieConsent";

export default function CookieConsent() {
  const t = useT();
  const [consent, setConsent] = useState<CookieConsentValue>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConsent(getCookieConsent());
    setReady(true);
  }, []);

  if (!ready || consent) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label={t("cookies.title")}>
      <div className="cookie-banner-inner">
        <div className="cookie-banner-text">
          <strong>{t("cookies.title")}</strong>
          <p>
            {t("cookies.body")}{" "}
            <Link to="/terms">{t("cookies.learnMore")}</Link>
          </p>
        </div>
        <div className="cookie-banner-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setCookieConsent("necessary");
              setConsent("necessary");
            }}
          >
            {t("cookies.necessary")}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setCookieConsent("accepted");
              setConsent("accepted");
            }}
          >
            {t("cookies.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
