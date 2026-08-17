import { useEffect, useId, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useT } from "../context/LocaleContext";
import { applyBusinessMeta, businessRuntime } from "../seo/site";

const HIDDEN_PREFIXES = [
  "/admin",
  "/super-admin",
  "/contractor",
  "/dashboard",
  "/chats",
];

export default function ChatWidget() {
  const t = useT();
  const location = useLocation();
  const titleId = useId();
  const [whatsapp, setWhatsapp] = useState("355689001257");

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

  if (hidden) return null;

  const waHref = `https://wa.me/${whatsapp}?text=${encodeURIComponent(
    t("chat.waPrefill")
  )}`;

  return (
    <div className="chat-widget">
      <a
        id={titleId}
        className="wa-fab"
        href={waHref}
        target="_blank"
        rel="noreferrer"
        aria-label={t("home.ctaWhatsapp")}
      >
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
          <path
            fill="currentColor"
            d="M20 11.5A8.5 8.5 0 0 1 7.4 18.7L4 20l1.4-3.3A8.5 8.5 0 1 1 20 11.5zm-8.5 6.7c1.4 0 2.7-.4 3.8-1.1l.3-.2 2.2.6-.6-2.1.2-.3a6.7 6.7 0 1 0-5.9 3.1zm3.7-5c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1l-.7.8c-.1.2-.3.2-.5.1a5.5 5.5 0 0 1-2.6-2.3c-.2-.3 0-.4.1-.6l.4-.5c.1-.1.1-.3.2-.4 0-.1 0-.3 0-.4l-1.4-3.3c-.2-.4-.3-.3-.5-.3h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.9 1.5 2.2 2.7 3.8 3.5.5.2 1 .4 1.3.5.6.2 1.1.2 1.5.1.5-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1 0-.1-.2-.2-.4-.3z"
          />
        </svg>
        <span>{t("home.ctaWhatsapp")}</span>
      </a>
    </div>
  );
}
