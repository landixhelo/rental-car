import { type FormEvent, useState } from "react";
import { api } from "../lib/api";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";

export default function ContactPage() {
  const { show, Toast } = useToast();
  const t = useT();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Rezervim",
    message: "",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await api.contact(form);
      show(t("contact.sent"));
      setForm({
        name: "",
        email: "",
        phone: "",
        subject: t("contact.subjectBooking"),
        message: "",
      });
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <div className="section">
      {Toast}
      <h1>{t("contact.title")}</h1>
      <div className="contact-grid">
        <form className="panel" onSubmit={onSubmit}>
          <input
            placeholder={t("contact.name")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder={t("auth.email")}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            placeholder={t("auth.phone")}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <select
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          >
            <option value={t("contact.subjectBooking")}>
              {t("contact.subjectBooking")}
            </option>
            <option value={t("contact.subjectPayment")}>
              {t("contact.subjectPayment")}
            </option>
            <option value={t("contact.subjectCars")}>
              {t("contact.subjectCars")}
            </option>
            <option value={t("contact.subjectOther")}>
              {t("contact.subjectOther")}
            </option>
          </select>
          <textarea
            placeholder={t("contact.message")}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            required
          />
          <button className="btn" type="submit">
            {t("common.send")}
          </button>
          <a
            className="whatsapp"
            href="https://wa.me/355690000000"
            target="_blank"
            rel="noreferrer"
          >
            {t("contact.whatsapp")}
          </a>
        </form>
        <div className="panel">
          <p>📍 Tiranë, Shqipëri</p>
          <p>📞 +355 69 000 0000</p>
          <p>✉️ support@autorent.al</p>
          <p>🕒 {t("contact.hours")}</p>
        </div>
      </div>
    </div>
  );
}
