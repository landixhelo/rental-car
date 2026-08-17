import { useEffect, useState } from "react";
import { useT } from "../context/LocaleContext";
import { getCookieConsent } from "../lib/cookieConsent";
import {
  dismissInstallPrompt,
  isAndroidDevice,
  isIosDevice,
  isIosSafari,
  isStandaloneDisplay,
  wasInstallDismissed,
  type BeforeInstallPromptEvent,
} from "../lib/pwa";

export default function PwaInstall() {
  const t = useT();
  const [ready, setReady] = useState(false);
  const [cookiesOk, setCookiesOk] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [hidden, setHidden] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setCookiesOk(Boolean(getCookieConsent()));
    setReady(true);
    const onConsent = () => setCookiesOk(true);
    window.addEventListener("autorent-cookie-consent", onConsent);
    return () =>
      window.removeEventListener("autorent-cookie-consent", onConsent);
  }, []);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setHidden(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const ios = isIosDevice();
  const android = isAndroidDevice();
  const showIosSafari = ios && isIosSafari();
  const showIosOther = ios && !isIosSafari();
  const showAndroidHint = android && !deferred;
  const showChromeInstall = Boolean(deferred);
  const visible =
    ready &&
    cookiesOk &&
    !hidden &&
    !isStandaloneDisplay() &&
    !wasInstallDismissed() &&
    (showChromeInstall || showIosSafari || showIosOther || showAndroidHint);

  if (!visible) return null;

  async function install() {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome !== "accepted") dismissInstallPrompt();
      setDeferred(null);
      setHidden(true);
    } catch {
      setInstalling(false);
    }
  }

  function later() {
    dismissInstallPrompt();
    setHidden(true);
  }

  return (
    <div className="pwa-banner" role="dialog" aria-label={t("pwa.title")}>
      <img
        className="pwa-banner-icon"
        src="/pwa/icon-192.png"
        alt=""
        width={48}
        height={48}
      />
      <div className="pwa-banner-text">
        <strong>{t("pwa.title")}</strong>
        {showIosSafari && !showChromeInstall ? (
          <p>
            {t("pwa.iosBody")}{" "}
            <span className="pwa-ios-steps">
              {t("pwa.iosShare")} → {t("pwa.iosAdd")}
            </span>
          </p>
        ) : showIosOther ? (
          <p>{t("pwa.iosOther")}</p>
        ) : showAndroidHint ? (
          <p>{t("pwa.androidBody")}</p>
        ) : (
          <p>{t("pwa.body")}</p>
        )}
      </div>
      <div className="pwa-banner-actions">
        <button type="button" className="btn ghost" onClick={later}>
          {t("pwa.later")}
        </button>
        {showChromeInstall ? (
          <button
            type="button"
            className="btn"
            onClick={install}
            disabled={installing}
          >
            {t("pwa.install")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
