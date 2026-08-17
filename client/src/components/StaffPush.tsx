import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LocaleContext";
import { isIosDevice, isStandaloneDisplay } from "../lib/pwa";
import {
  currentPushSubscription,
  disablePush,
  enablePush,
  pushSupported,
  syncPushIfGranted,
} from "../lib/push";
import { api } from "../lib/api";

const LATER_KEY = "autorent-push-later";

function isStaff(role?: string) {
  return role === "CONTRACTOR" || role === "ADMIN" || role === "SUPER_ADMIN";
}

type Status =
  | "loading"
  | "hidden"
  | "need-install"
  | "off"
  | "on"
  | "denied"
  | "unsupported"
  | "disabled";

async function readStatus(): Promise<Status> {
  if (!pushSupported()) return "unsupported";
  try {
    const { enabled } = await api.pushVapidKey();
    if (!enabled) return "disabled";
  } catch {
    return "disabled";
  }
  if (isIosDevice() && !isStandaloneDisplay()) return "need-install";
  if (Notification.permission === "denied") return "denied";
  const sub = await currentPushSubscription();
  if (sub && Notification.permission === "granted") return "on";
  return "off";
}

export function StaffPushBanner() {
  const { user } = useAuth();
  const t = useT();
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isStaff(user?.role)) {
      setStatus("hidden");
      return;
    }
    if (sessionStorage.getItem(LATER_KEY)) {
      setStatus("hidden");
      return;
    }
    void (async () => {
      await syncPushIfGranted();
      const next = await readStatus();
      setStatus(next === "on" || next === "denied" || next === "disabled" || next === "unsupported" ? "hidden" : next);
    })();
  }, [user?.id, user?.role]);

  if (status === "loading" || status === "hidden" || status === "on") return null;

  async function enable() {
    setBusy(true);
    try {
      await enablePush();
      await api.pushTest().catch(() => {});
      setStatus("hidden");
    } catch {
      setStatus(await readStatus());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="push-banner" role="status">
      <div>
        <strong>{t("push.bannerTitle")}</strong>
        <p>
          {status === "need-install" ? t("push.iosInstall") : t("push.bannerBody")}
        </p>
      </div>
      <div className="push-banner-actions">
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            sessionStorage.setItem(LATER_KEY, "1");
            setStatus("hidden");
          }}
        >
          {t("push.later")}
        </button>
        {status === "need-install" ? (
          <Link to="/profile?tab=notifications" className="btn">
            {t("push.how")}
          </Link>
        ) : (
          <button type="button" className="btn" onClick={enable} disabled={busy}>
            {busy ? t("common.loading") : t("push.enable")}
          </button>
        )}
      </div>
    </div>
  );
}

export function StaffPushCard() {
  const { user } = useAuth();
  const t = useT();
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isStaff(user?.role)) return;
    void (async () => {
      await syncPushIfGranted();
      setStatus(await readStatus());
    })();
  }, [user?.id, user?.role]);

  if (!isStaff(user?.role)) return null;

  async function enable() {
    setBusy(true);
    setError("");
    try {
      await enablePush();
      await api.pushTest();
      setStatus("on");
      setError(t("push.testSent"));
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "denied") setStatus("denied");
      else if (code === "unsupported") setStatus("unsupported");
      else if (code === "disabled") setStatus("disabled");
      else setError(code || t("push.error"));
      setStatus(await readStatus());
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError("");
    try {
      await disablePush();
      setStatus("off");
    } catch {
      setError(t("push.error"));
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setError("");
    try {
      await api.pushTest();
      setError(t("push.testSent"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("push.error"));
    } finally {
      setBusy(false);
    }
  }

  const hint =
    status === "need-install"
      ? t("push.iosInstall")
      : status === "denied"
        ? t("push.denied")
        : status === "unsupported"
          ? t("push.unsupported")
          : status === "disabled"
            ? t("push.disabled")
            : t("push.hint");

  return (
    <div className="settings-card">
      <h2>{t("push.title")}</h2>
      <p className="muted">{hint}</p>
      {error ? <p className="muted">{error}</p> : null}
      {status === "on" ? (
        <div className="push-card-actions">
          <p className="push-on">{t("push.enabled")}</p>
          <button type="button" className="btn" onClick={test} disabled={busy}>
            {t("push.test")}
          </button>
          <button type="button" className="btn ghost" onClick={disable} disabled={busy}>
            {t("push.disable")}
          </button>
        </div>
      ) : status === "off" || status === "need-install" ? (
        <button
          type="button"
          className="btn"
          onClick={enable}
          disabled={busy || status === "need-install"}
        >
          {busy ? t("common.loading") : t("push.enable")}
        </button>
      ) : null}
    </div>
  );
}
