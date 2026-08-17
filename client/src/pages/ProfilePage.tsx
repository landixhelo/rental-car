import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, type BusinessHourRow, type User } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useUnreadNotifications } from "../context/UnreadContext";
import { useLocale, useT } from "../context/LocaleContext";
import { StaffPushCard } from "../components/StaffPush";
import { useToast } from "../hooks/useToast";
import { registerPasskey, supportsPasskeys } from "../lib/passkeys";
import type { Locale } from "../i18n";
import { LOCALE_LABELS, LOCALES } from "../i18n";
import { roleLabel } from "../lib/labels";
import { mediaUrl } from "../lib/mediaUrl";

type PasskeyRow = { id: string; createdAt: string; transports: string[] };
type TabId =
  | "profile"
  | "security"
  | "company"
  | "rental"
  | "locations"
  | "notifications"
  | "language";

const DEFAULT_HOURS: BusinessHourRow[] = [
  { day: "mon", open: true, from: "08:00", to: "20:00" },
  { day: "tue", open: true, from: "08:00", to: "20:00" },
  { day: "wed", open: true, from: "08:00", to: "20:00" },
  { day: "thu", open: true, from: "08:00", to: "20:00" },
  { day: "fri", open: true, from: "08:00", to: "20:00" },
  { day: "sat", open: true, from: "09:00", to: "18:00" },
  { day: "sun", open: false, from: "09:00", to: "18:00" },
];

function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (score <= 1) return { score, label: "weak" };
  if (score <= 3) return { score, label: "medium" };
  return { score, label: "strong" };
}

function syncFromUser(user: User | null | undefined) {
  const name = splitName(user?.fullName || "");
  return {
    firstName: name.first,
    lastName: name.last,
    phone: user?.phone || "",
    companyName: user?.companyName || "",
    businessPhone: user?.businessPhone || "",
    businessAddress: user?.businessAddress || "",
    bookingNotifyEmail: user?.bookingNotifyEmail || "",
    notifyBookingEmail: user?.notifyBookingEmail ?? true,
    notifyCancelEmail: user?.notifyCancelEmail ?? true,
    notifyPaymentEmail: user?.notifyPaymentEmail ?? true,
    notifyDocumentEmail: user?.notifyDocumentEmail ?? true,
    minRentalDays: user?.minRentalDays ?? 1,
    maxRentalDays: user?.maxRentalDays ?? 30,
    minDriverAge: user?.minDriverAge ?? 21,
    maxDriverAge: user?.maxDriverAge ?? 75,
    weeklyDiscountPct: user?.weeklyDiscountPct ?? 10,
    monthlyDiscountPct: user?.monthlyDiscountPct ?? 20,
    requireDeposit: user?.requireDeposit ?? true,
    defaultDepositEur: user?.defaultDepositEur ?? 300,
    businessHours:
      user?.businessHours && user.businessHours.length
        ? user.businessHours
        : DEFAULT_HOURS.map((h) => ({ ...h })),
    cancellationPolicyText: user?.cancellationPolicyText || "",
    avatarUrl: user?.avatarUrl || "",
  };
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { count, label, markSeen } = useUnreadNotifications();
  const { show, Toast } = useToast();
  const t = useT();
  const { locale, setLocale } = useLocale();
  const [params, setParams] = useSearchParams();
  const canManageFleet =
    user?.role === "CONTRACTOR" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN";

  const tabParam = (params.get("tab") || "profile") as TabId;
  const tab: TabId =
    !canManageFleet &&
    (tabParam === "company" ||
      tabParam === "rental" ||
      tabParam === "locations")
      ? "profile"
      : tabParam;

  const [form, setForm] = useState(() => syncFromUser(user));
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const canUsePasskey = supportsPasskeys();
  const strength = useMemo(() => passwordStrength(newPassword), [newPassword]);

  useEffect(() => {
    setForm(syncFromUser(user));
  }, [user]);

  useEffect(() => {
    api
      .notifications()
      .then((r) => setNotifications(r.notifications))
      .catch(() => {});
    api
      .passkeys()
      .then((r) => setPasskeys(r.passkeys))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (tab !== "notifications") return;
    markSeen();
  }, [tab, user?.id, markSeen]);

  function setTab(next: TabId) {
    setParams(next === "profile" ? {} : { tab: next });
  }

  function patchForm<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(syncFromUser(user));
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function saveProfile(e?: FormEvent) {
    e?.preventDefault();
    const fullName = `${form.firstName} ${form.lastName}`.trim();
    if (fullName.length < 2) {
      show(t("profile.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await api.updateProfile({
        fullName,
        phone: form.phone,
        avatarUrl: form.avatarUrl || null,
      });
      setUser(res.user);
      show(t("profile.saved"));
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function saveSecurity(e: FormEvent) {
    e.preventDefault();
    if (!newPassword) {
      show(t("profile.passwordRequired"));
      return;
    }
    if (newPassword !== confirmPassword) {
      show(t("profile.passwordMismatch"));
      return;
    }
    setSaving(true);
    try {
      const res = await api.updateProfile({
        fullName: user?.fullName || form.firstName,
        phone: form.phone,
        password: newPassword,
        currentPassword,
      });
      setUser(res.user);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      show(t("profile.passwordUpdated"));
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function saveCompany(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateProfile({
        fullName: user?.fullName || `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone,
        companyName: form.companyName,
        businessPhone: form.businessPhone,
        businessAddress: form.businessAddress,
        bookingNotifyEmail: form.bookingNotifyEmail.trim() || "",
      });
      setUser(res.user);
      show(t("profile.saved"));
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function saveRental(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateProfile({
        fullName: user?.fullName || `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone,
        minRentalDays: form.minRentalDays,
        maxRentalDays: form.maxRentalDays,
        minDriverAge: form.minDriverAge,
        maxDriverAge: form.maxDriverAge,
        weeklyDiscountPct: form.weeklyDiscountPct,
        monthlyDiscountPct: form.monthlyDiscountPct,
        requireDeposit: form.requireDeposit,
        defaultDepositEur: form.defaultDepositEur,
        businessHours: form.businessHours,
        cancellationPolicyText: form.cancellationPolicyText || "",
      });
      setUser(res.user);
      show(t("profile.saved"));
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function saveNotifications(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateProfile({
        fullName: user?.fullName || `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone,
        notifyBookingEmail: form.notifyBookingEmail,
        notifyCancelEmail: form.notifyCancelEmail,
        notifyPaymentEmail: form.notifyPaymentEmail,
        notifyDocumentEmail: form.notifyDocumentEmail,
      });
      setUser(res.user);
      show(t("profile.saved"));
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarChange(file: File | null) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      show(t("profile.avatarTooBig"));
      return;
    }
    setAvatarBusy(true);
    try {
      const res = await api.uploadAvatar(file);
      setUser(res.user);
      patchForm("avatarUrl", res.url);
      show(t("profile.avatarUpdated"));
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setSaving(true);
    try {
      const res = await api.updateProfile({
        fullName: user?.fullName || `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone,
        avatarUrl: "",
      });
      setUser(res.user);
      patchForm("avatarUrl", "");
      show(t("profile.avatarRemoved"));
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function onEnablePasskey() {
    if (passkeyBusy) return;
    setPasskeyBusy(true);
    try {
      const res = await registerPasskey();
      setPasskeys(res.passkeys);
      show(t("profile.passkeyAdded"));
    } catch (err) {
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name: string }).name)
          : "";
      if (name === "NotAllowedError") show(t("auth.passkeyCancelled"));
      else show(err instanceof Error ? err.message : t("auth.passkeyFailed"));
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function onRemovePasskey(id: string) {
    try {
      await api.passkeyDelete(id);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
      show(t("profile.passkeyRemoved"));
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  function applyMondayToWeekdays() {
    const monday = form.businessHours.find((h) => h.day === "mon");
    if (!monday) return;
    patchForm(
      "businessHours",
      form.businessHours.map((h) =>
        ["tue", "wed", "thu", "fri"].includes(h.day)
          ? { ...h, open: monday.open, from: monday.from, to: monday.to }
          : h
      )
    );
  }

  const navGroups: Array<{
    title: string;
    items: Array<{ id: TabId; label: string; staffOnly?: boolean }>;
  }> = [
    {
      title: t("profile.navAccount"),
      items: [
        { id: "profile", label: t("profile.navProfile") },
        { id: "security", label: t("profile.navSecurity") },
      ],
    },
    {
      title: t("profile.navBusiness"),
      items: [
        { id: "company", label: t("profile.navCompany"), staffOnly: true },
        { id: "rental", label: t("profile.navRental"), staffOnly: true },
        { id: "locations", label: t("profile.navLocations"), staffOnly: true },
      ],
    },
    {
      title: t("profile.navPreferences"),
      items: [
        { id: "notifications", label: t("profile.navNotifications") },
        { id: "language", label: t("profile.navLanguage") },
      ],
    },
  ];

  const dayLabel = (day: BusinessHourRow["day"]) => t(`profile.day.${day}`);

  return (
    <div className="settings-layout">
      {Toast}
      <header className="settings-layout-head">
        <div>
          <h1>{t("dashboard.navSettings")}</h1>
          <p>{t("profile.settingsSub")}</p>
        </div>
      </header>

      <div className="settings-layout-body">
        <aside className="settings-side">
          {navGroups.map((group) => {
            const items = group.items.filter(
              (i) => !i.staffOnly || canManageFleet
            );
            if (!items.length) return null;
            return (
              <div key={group.title} className="settings-side-group">
                <p>{group.title}</p>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={tab === item.id ? "active" : undefined}
                    onClick={() => setTab(item.id)}
                  >
                    <span>{item.label}</span>
                    {item.id === "notifications" && count > 0 ? (
                      <span className="nav-badge">{label}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            );
          })}
        </aside>

        <div className="settings-main">
          {tab === "profile" ? (
            <form className="settings-panel" onSubmit={saveProfile}>
              <div className="settings-avatar-card">
                <div className="settings-avatar">
                  {form.avatarUrl ? (
                    <img src={mediaUrl(form.avatarUrl)} alt="" />
                  ) : (
                    <span>
                      {(user?.fullName || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="settings-avatar-meta">
                  <strong>{user?.fullName}</strong>
                  <p>
                    {user?.email} · {roleLabel(t, user?.role)}
                  </p>
                  <small className="muted">{t("profile.avatarHint")}</small>
                </div>
                <div className="settings-avatar-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={!form.avatarUrl || saving}
                    onClick={removeAvatar}
                  >
                    {t("profile.removePhoto")}
                  </button>
                  <label className="btn">
                    {avatarBusy
                      ? t("common.loading")
                      : t("profile.changePhoto")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      hidden
                      onChange={(e) =>
                        onAvatarChange(e.target.files?.[0] || null)
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="settings-card">
                <h2>{t("profile.personalInfo")}</h2>
                <div className="settings-grid-2">
                  <label className="settings-field">
                    <span>{t("profile.firstName")}</span>
                    <input
                      value={form.firstName}
                      onChange={(e) => patchForm("firstName", e.target.value)}
                      required
                    />
                  </label>
                  <label className="settings-field">
                    <span>{t("profile.lastName")}</span>
                    <input
                      value={form.lastName}
                      onChange={(e) => patchForm("lastName", e.target.value)}
                    />
                  </label>
                </div>
                <label className="settings-field">
                  <span>{t("checkout.email")}</span>
                  <input value={user?.email || ""} disabled />
                </label>
                <div className="settings-grid-2">
                  <label className="settings-field">
                    <span>{t("auth.phone")}</span>
                    <input
                      value={form.phone}
                      onChange={(e) => patchForm("phone", e.target.value)}
                    />
                  </label>
                  <label className="settings-field">
                    <span>{t("profile.role")}</span>
                    <input value={roleLabel(t, user?.role)} disabled />
                    <small className="muted">{t("profile.roleHint")}</small>
                  </label>
                </div>
                <div className="settings-form-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={resetForm}
                  >
                    {t("common.cancel")}
                  </button>
                  <button className="btn" type="submit" disabled={saving}>
                    {saving ? t("common.loading") : t("profile.saveChanges")}
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {tab === "security" ? (
            <div className="settings-panel">
              <form className="settings-card" onSubmit={saveSecurity}>
                <h2>{t("profile.changePassword")}</h2>
                <p className="muted">{t("profile.changePasswordHint")}</p>
                <label className="settings-field">
                  <span>{t("profile.currentPassword")}</span>
                  <div className="settings-pw">
                    <input
                      type={showPw.current ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPw((s) => ({ ...s, current: !s.current }))
                      }
                    >
                      {showPw.current ? "🙈" : "👁"}
                    </button>
                  </div>
                </label>
                <label className="settings-field">
                  <span>{t("profile.newPasswordLabel")}</span>
                  <div className="settings-pw">
                    <input
                      type={showPw.next ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPw((s) => ({ ...s, next: !s.next }))
                      }
                    >
                      {showPw.next ? "🙈" : "👁"}
                    </button>
                  </div>
                  <div
                    className={`settings-strength strength-${strength.label}`}
                  >
                    <i style={{ width: `${(strength.score / 5) * 100}%` }} />
                  </div>
                  <small>
                    {t("profile.passwordStrength")}:{" "}
                    {t(`profile.strength.${strength.label}`)}
                  </small>
                </label>
                <label className="settings-field">
                  <span>{t("profile.confirmPassword")}</span>
                  <div className="settings-pw">
                    <input
                      type={showPw.confirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPw((s) => ({ ...s, confirm: !s.confirm }))
                      }
                    >
                      {showPw.confirm ? "🙈" : "👁"}
                    </button>
                  </div>
                </label>
                <button className="btn" type="submit" disabled={saving}>
                  {t("profile.updatePassword")}
                </button>
              </form>

              {canUsePasskey ? (
                <div className="settings-card">
                  <h2>{t("profile.passkeyTitle")}</h2>
                  <p className="muted">{t("profile.passkeyHint")}</p>
                  <button
                    className="btn"
                    type="button"
                    disabled={passkeyBusy}
                    onClick={onEnablePasskey}
                  >
                    {passkeyBusy
                      ? t("auth.passkeyWaiting")
                      : t("profile.passkeyEnable")}
                  </button>
                  {passkeys.length ? (
                    <ul className="passkey-list">
                      {passkeys.map((p, i) => (
                        <li key={p.id}>
                          <span>
                            {t("profile.passkeyDevice")} {i + 1}
                            <small className="muted">
                              {" "}
                              · {new Date(p.createdAt).toLocaleDateString()}
                            </small>
                          </span>
                          <button
                            type="button"
                            className="btn ghost danger-text"
                            onClick={() => onRemovePasskey(p.id)}
                          >
                            {t("common.delete")}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted" style={{ marginTop: 12 }}>
                      {t("profile.passkeyNone")}
                    </p>
                  )}
                </div>
              ) : null}

              <div className="settings-grid-2">
                <div className="settings-card settings-soon-card">
                  <h2>
                    {t("profile.twoFactor")}{" "}
                    <em className="ops-soon-badge">{t("dashboard.soon")}</em>
                  </h2>
                  <p className="muted">{t("profile.twoFactorHint")}</p>
                  <button type="button" className="btn ghost" disabled>
                    {t("profile.enable2fa")}
                  </button>
                </div>
                <div className="settings-card settings-soon-card">
                  <h2>
                    {t("profile.activeSessions")}{" "}
                    <em className="ops-soon-badge">{t("dashboard.soon")}</em>
                  </h2>
                  <p className="muted">{t("profile.activeSessionsHint")}</p>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "company" && canManageFleet ? (
            <form className="settings-panel" onSubmit={saveCompany}>
              <div className="settings-card">
                <h2>{t("profile.businessSection")}</h2>
                <p className="muted">{t("profile.businessHint")}</p>
                <label className="settings-field">
                  <span>{t("profile.company")}</span>
                  <input
                    value={form.companyName}
                    onChange={(e) => patchForm("companyName", e.target.value)}
                  />
                </label>
                <label className="settings-field">
                    <span>{t("profile.businessPhone")}</span>
                    <input
                      value={form.businessPhone}
                      onChange={(e) =>
                        patchForm("businessPhone", e.target.value)
                      }
                    />
                  </label>
                <label className="settings-field">
                  <span>{t("profile.businessAddress")}</span>
                  <input
                    value={form.businessAddress}
                    onChange={(e) =>
                      patchForm("businessAddress", e.target.value)
                    }
                    placeholder={t("profile.businessAddressPh")}
                  />
                </label>
                <label className="settings-field">
                  <span>{t("profile.bookingNotifyEmail")}</span>
                  <input
                    type="email"
                    value={form.bookingNotifyEmail}
                    onChange={(e) =>
                      patchForm("bookingNotifyEmail", e.target.value)
                    }
                  />
                  <small className="muted">
                    {t("profile.bookingNotifyEmailHint")}
                  </small>
                </label>
                <div className="settings-form-actions">
                  <button className="btn" type="submit" disabled={saving}>
                    {saving ? t("common.loading") : t("profile.saveChanges")}
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {tab === "rental" && canManageFleet ? (
            <form className="settings-panel" onSubmit={saveRental}>
              <div className="settings-toolbar">
                <div>
                  <h2>{t("profile.rentalSettings")}</h2>
                  <p className="muted">{t("profile.rentalSettingsHint")}</p>
                </div>
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? t("common.loading") : t("profile.saveChanges")}
                </button>
              </div>

              <div className="settings-card">
                <h2>{t("profile.rentalRules")}</h2>
                <div className="settings-grid-2">
                  <label className="settings-field">
                    <span>{t("profile.minRentalDays")}</span>
                    <select
                      value={form.minRentalDays}
                      onChange={(e) =>
                        patchForm("minRentalDays", Number(e.target.value))
                      }
                    >
                      {[1, 2, 3, 5, 7].map((n) => (
                        <option key={n} value={n}>
                          {n} {t("details.days")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="settings-field">
                    <span>{t("profile.maxRentalDays")}</span>
                    <select
                      value={form.maxRentalDays}
                      onChange={(e) =>
                        patchForm("maxRentalDays", Number(e.target.value))
                      }
                    >
                      {[7, 14, 30, 60, 90].map((n) => (
                        <option key={n} value={n}>
                          {n} {t("details.days")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="settings-field">
                    <span>{t("profile.minDriverAge")}</span>
                    <input
                      type="number"
                      min={16}
                      max={90}
                      value={form.minDriverAge}
                      onChange={(e) =>
                        patchForm("minDriverAge", Number(e.target.value))
                      }
                    />
                  </label>
                  <label className="settings-field">
                    <span>{t("profile.maxDriverAge")}</span>
                    <input
                      type="number"
                      min={18}
                      max={99}
                      value={form.maxDriverAge}
                      onChange={(e) =>
                        patchForm("maxDriverAge", Number(e.target.value))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="settings-card">
                <h2>{t("profile.pricingConfig")}</h2>
                <div className="settings-grid-2">
                  <label className="settings-field">
                    <span>{t("profile.currency")}</span>
                    <input value="EUR (€)" disabled />
                  </label>
                  <label className="settings-field">
                    <span>{t("profile.weeklyDiscount")}</span>
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={form.weeklyDiscountPct}
                      onChange={(e) =>
                        patchForm("weeklyDiscountPct", Number(e.target.value))
                      }
                    />
                  </label>
                  <label className="settings-field">
                    <span>{t("profile.monthlyDiscount")}</span>
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={form.monthlyDiscountPct}
                      onChange={(e) =>
                        patchForm("monthlyDiscountPct", Number(e.target.value))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="settings-card">
                <h2>{t("profile.securityDeposit")}</h2>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={form.requireDeposit}
                    onChange={(e) =>
                      patchForm("requireDeposit", e.target.checked)
                    }
                  />
                  <span>
                    <strong>{t("profile.requireDeposit")}</strong>
                  </span>
                </label>
                <label className="settings-field" style={{ marginTop: 12 }}>
                  <span>{t("profile.defaultDeposit")}</span>
                  <input
                    type="number"
                    min={0}
                    value={form.defaultDepositEur}
                    disabled={!form.requireDeposit}
                    onChange={(e) =>
                      patchForm("defaultDepositEur", Number(e.target.value))
                    }
                  />
                </label>
              </div>

              <div className="settings-card">
                <div className="settings-toolbar tight">
                  <h2>{t("profile.businessHours")}</h2>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={applyMondayToWeekdays}
                  >
                    {t("profile.applyMondayHours")}
                  </button>
                </div>
                <div className="settings-hours">
                  {form.businessHours.map((row, idx) => (
                    <div key={row.day} className="settings-hour-row">
                      <label className="settings-toggle compact">
                        <input
                          type="checkbox"
                          checked={row.open}
                          onChange={(e) => {
                            const next = [...form.businessHours];
                            next[idx] = { ...row, open: e.target.checked };
                            patchForm("businessHours", next);
                          }}
                        />
                        <strong>{dayLabel(row.day)}</strong>
                      </label>
                      {row.open ? (
                        <div className="settings-hour-times">
                          <input
                            type="time"
                            value={row.from || "08:00"}
                            onChange={(e) => {
                              const next = [...form.businessHours];
                              next[idx] = { ...row, from: e.target.value };
                              patchForm("businessHours", next);
                            }}
                          />
                          <span>–</span>
                          <input
                            type="time"
                            value={row.to || "20:00"}
                            onChange={(e) => {
                              const next = [...form.businessHours];
                              next[idx] = { ...row, to: e.target.value };
                              patchForm("businessHours", next);
                            }}
                          />
                        </div>
                      ) : (
                        <span className="muted">{t("profile.closed")}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="settings-card">
                <h2>{t("profile.cancellationPolicy")}</h2>
                <p className="muted">{t("profile.cancellationPolicyHint")}</p>
                <textarea
                  className="settings-textarea"
                  rows={5}
                  value={form.cancellationPolicyText}
                  onChange={(e) =>
                    patchForm("cancellationPolicyText", e.target.value)
                  }
                  placeholder={t("profile.cancellationPolicyPh")}
                />
              </div>
            </form>
          ) : null}

          {tab === "locations" && canManageFleet ? (
            <div className="settings-panel">
              <div className="settings-card">
                <h2>{t("dashboard.navLocations")}</h2>
                <p className="muted">{t("profile.locationsHint")}</p>
                <Link to="/locations" className="btn">
                  {t("profile.openLocations")}
                </Link>
              </div>
            </div>
          ) : null}

          {tab === "notifications" ? (
            <form className="settings-panel" onSubmit={saveNotifications}>
              <StaffPushCard />
              <div className="settings-card">
                <h2>{t("profile.notifySection")}</h2>
                <p className="muted">{t("profile.notifyHint")}</p>
                <div className="settings-toggles">
                  {(
                    [
                      [
                        "notifyBookingEmail",
                        "notifyBooking",
                        "notifyBookingHint",
                      ],
                      [
                        "notifyCancelEmail",
                        "notifyCancel",
                        "notifyCancelHint",
                      ],
                      [
                        "notifyPaymentEmail",
                        "notifyPayment",
                        "notifyPaymentHint",
                      ],
                      [
                        "notifyDocumentEmail",
                        "notifyDocument",
                        "notifyDocumentHint",
                      ],
                    ] as const
                  ).map(([key, title, hint]) => (
                    <label key={key} className="settings-toggle">
                      <input
                        type="checkbox"
                        checked={form[key]}
                        onChange={(e) => patchForm(key, e.target.checked)}
                      />
                      <span>
                        <strong>{t(`profile.${title}`)}</strong>
                        <small>{t(`profile.${hint}`)}</small>
                      </span>
                    </label>
                  ))}
                </div>
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? t("common.loading") : t("profile.saveChanges")}
                </button>
              </div>
              <div className="settings-card">
                <h2>{t("profile.notifications")}</h2>
                {!notifications.length && (
                  <p className="muted">{t("profile.noNotifications")}</p>
                )}
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`review-item${n.read ? "" : " is-unread"}`}
                  >
                    <strong>
                      {n.title}
                      {!n.read ? (
                        <span className="notify-new">{t("profile.unread")}</span>
                      ) : null}
                    </strong>
                    <p>{n.message}</p>
                  </div>
                ))}
              </div>
            </form>
          ) : null}

          {tab === "language" ? (
            <div className="settings-panel">
              <div className="settings-card">
                <h2>{t("nav.language")}</h2>
                <p className="muted">{t("profile.languageHint")}</p>
                <div className="settings-lang" role="group">
                  {LOCALES.map((code) => (
                    <button
                      key={code}
                      type="button"
                      className={locale === code ? "active" : undefined}
                      onClick={() => setLocale(code as Locale)}
                    >
                      {LOCALE_LABELS[code]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
