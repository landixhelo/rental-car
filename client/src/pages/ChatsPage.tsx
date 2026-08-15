import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";

type ChatMessage = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};

type Filter = "all" | "New" | "Read" | "Done";

function formatWhen(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusLabel(
  t: (key: string) => string,
  status: string
): string {
  if (status === "New") return t("chats.statusNew");
  if (status === "Read") return t("chats.statusRead");
  if (status === "Done") return t("chats.statusDone");
  return status;
}

export default function ChatsPage() {
  const t = useT();
  const { locale } = useLocale();
  const { show, Toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  async function load() {
    const res = await api.chats();
    setMessages(res.messages);
    return res.messages;
  }

  useEffect(() => {
    setLoading(true);
    load()
      .then((list) => {
        if (list.length && !selectedId) setSelectedId(list[0].id);
      })
      .catch((e) => show(e instanceof Error ? e.message : t("common.error")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return messages;
    return messages.filter((m) => m.status === filter);
  }, [messages, filter]);

  const selected =
    filtered.find((m) => m.id === selectedId) ||
    messages.find((m) => m.id === selectedId) ||
    null;

  const unread = messages.filter((m) => m.status === "New").length;

  async function setStatus(id: string, status: "New" | "Read" | "Done") {
    setUpdating(true);
    try {
      const res = await api.updateChatStatus(id, status);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...res.message } : m))
      );
    } catch (e) {
      show(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setUpdating(false);
    }
  }

  async function openChat(m: ChatMessage) {
    setSelectedId(m.id);
    if (m.status === "New") {
      await setStatus(m.id, "Read");
    }
  }

  const dateLocale =
    locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "sq-AL";

  return (
    <div className="ops-page chats-page">
      {Toast}
      <div className="chats-header">
        <div>
          <h1>{t("chats.title")}</h1>
          <p className="muted">{t("chats.subtitle")}</p>
        </div>
        <div className="chats-header-meta">
          {unread > 0 ? (
            <span className="chats-unread-badge">
              {unread} {t("chats.new")}
            </span>
          ) : null}
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              load().catch((e) =>
                show(e instanceof Error ? e.message : t("common.error"))
              )
            }
          >
            {t("chats.refresh")}
          </button>
        </div>
      </div>

      <div className="chats-filters" role="tablist">
        {(
          [
            ["all", t("chats.filterAll")],
            ["New", t("chats.filterNew")],
            ["Read", t("chats.filterRead")],
            ["Done", t("chats.filterDone")],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={filter === key ? "active" : undefined}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <div className="panel chats-empty">
          <p>{t("chats.empty")}</p>
        </div>
      ) : (
        <div className="chats-layout">
          <aside className="chats-list panel">
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`chats-list-item${
                  selected?.id === m.id ? " active" : ""
                }${m.status === "New" ? " is-new" : ""}`}
                onClick={() => openChat(m)}
              >
                <div className="chats-list-top">
                  <strong>{m.name}</strong>
                  <span className={`chats-status status-${m.status}`}>
                    {statusLabel(t, m.status)}
                  </span>
                </div>
                <p className="chats-list-subject">{m.subject}</p>
                <p className="chats-list-preview">{m.message}</p>
                <time dateTime={m.createdAt}>
                  {formatWhen(m.createdAt, dateLocale)}
                </time>
              </button>
            ))}
          </aside>

          <section className="chats-detail panel">
            {selected ? (
              <>
                <header className="chats-detail-head">
                  <div>
                    <h2>{selected.name}</h2>
                    <p className="muted">
                      {selected.subject} ·{" "}
                      {formatWhen(selected.createdAt, dateLocale)}
                    </p>
                  </div>
                  <div className="chats-detail-actions">
                    {selected.status !== "Done" ? (
                      <button
                        type="button"
                        className="btn"
                        disabled={updating}
                        onClick={() => setStatus(selected.id, "Done")}
                      >
                        {t("chats.markDone")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={updating}
                        onClick={() => setStatus(selected.id, "Read")}
                      >
                        {t("chats.reopen")}
                      </button>
                    )}
                  </div>
                </header>

                <div className="chats-detail-body">
                  <div className="chat-bubble bot">{selected.message}</div>
                </div>

                <footer className="chats-detail-contact">
                  <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  {selected.phone ? (
                    <a href={`tel:${selected.phone.replace(/[^\d+]/g, "")}`}>
                      {selected.phone}
                    </a>
                  ) : null}
                  {selected.phone ? (
                    <a
                      href={`https://wa.me/${selected.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                        t("chats.replyPrefill", { name: selected.name })
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="chats-wa"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </footer>
              </>
            ) : (
              <p className="muted">{t("chats.pick")}</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
