import { type FormEvent, useEffect, useId, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LocaleContext";
import { applyBusinessMeta, businessRuntime } from "../seo/site";

const HIDDEN_PREFIXES = [
  "/admin",
  "/super-admin",
  "/contractor",
  "/dashboard",
];

export default function ChatWidget() {
  const t = useT();
  const { user } = useAuth();
  const location = useLocation();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [whatsapp, setWhatsapp] = useState("355689001257");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const hidden = HIDDEN_PREFIXES.some(
    (p) =>
      location.pathname === p || location.pathname.startsWith(`${p}/`)
  );

  useEffect(() => {
    api
      .meta()
      .then((m) => {
        applyBusinessMeta(m.business);
        const wa = (
          m.business?.whatsapp ||
          m.whatsapp ||
          businessRuntime.whatsapp ||
          ""
        ).replace(/[^\d]/g, "");
        if (wa) setWhatsapp(wa);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || user.fullName || "",
      email: f.email || user.email || "",
      phone: f.phone || user.phone || "",
    }));
  }, [user]);

  useEffect(() => {
    setOpen(false);
    setSent(false);
    setError("");
  }, [location.pathname]);

  if (hidden) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await api.contact({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        subject: t("chat.subject"),
        message: form.message.trim(),
      });
      setSent(true);
      setForm((f) => ({ ...f, message: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSending(false);
    }
  }

  const waHref = `https://wa.me/${whatsapp}?text=${encodeURIComponent(
    t("chat.waPrefill")
  )}`;

  return (
    <div className={`chat-widget${open ? " open" : ""}`}>
      {open ? (
        <div
          className="chat-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
        >
          <header className="chat-panel-head">
            <div>
              <strong id={titleId}>{t("chat.title")}</strong>
              <p>{t("chat.subtitle")}</p>
            </div>
            <button
              type="button"
              className="chat-close"
              onClick={() => setOpen(false)}
              aria-label={t("common.close")}
            >
              ✕
            </button>
          </header>

          <div className="chat-body">
            <div className="chat-bubble bot">{t("chat.greeting")}</div>

            {sent ? (
              <div className="chat-bubble bot ok">{t("chat.sent")}</div>
            ) : (
              <form className="chat-form" onSubmit={onSubmit}>
                <input
                  name="name"
                  autoComplete="name"
                  placeholder={t("contact.name")}
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                />
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t("auth.email")}
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  required
                />
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder={t("auth.phone")}
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                />
                <textarea
                  name="message"
                  rows={3}
                  placeholder={t("chat.messagePlaceholder")}
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  required
                />
                {error ? <p className="chat-error">{error}</p> : null}
                <button className="btn" type="submit" disabled={sending}>
                  {sending ? t("common.loading") : t("chat.send")}
                </button>
              </form>
            )}

            <a
              className="chat-whatsapp"
              href={waHref}
              target="_blank"
              rel="noreferrer"
            >
              {t("chat.whatsapp")}
            </a>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? t("common.close") : t("chat.open")}
      >
        {open ? "✕" : t("chat.fab")}
      </button>
    </div>
  );
}
