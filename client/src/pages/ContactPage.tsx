import { type FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import Seo from "../seo/Seo";
import { SITE, applyBusinessMeta, businessRuntime } from "../seo/site";
import { breadcrumbJsonLd } from "../seo/jsonLd";

export default function ContactPage() {
  const { show, Toast } = useToast();
  const t = useT();
  const { locale } = useLocale();
  const [biz, setBiz] = useState({ ...businessRuntime });
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Rezervim",
    message: "",
  });

  useEffect(() => {
    api
      .meta()
      .then((m) => {
        applyBusinessMeta(m.business);
        setBiz({ ...businessRuntime });
      })
      .catch(() => {});
  }, []);

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
      <Seo
        title={t("contact.title")}
        description={SITE.description[locale]}
        path="/contact"
        locale={locale}
        jsonLd={breadcrumbJsonLd([
            { name: SITE.name, path: "/" },
          { name: t("contact.title"), path: "/contact" },
        ])}
      />
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
        </form>
        <div className="panel contact-details">
          <p>
            <strong>{t("contact.address")}</strong>
            <br />
            {biz.street ? `${biz.street}, ` : ""}
            {biz.address || SITE.address.full}
          </p>
          {biz.phone ? (
            <p>
              <strong>{t("auth.phone")}</strong>
              <br />
              <a href={`tel:${biz.phoneDigits || biz.phone}`}>{biz.phone}</a>
            </p>
          ) : null}
          <p>
            <strong>Email</strong>
            <br />
            <a href={`mailto:${biz.email || SITE.email}`}>
              {biz.email || SITE.email}
            </a>
          </p>
          {biz.nipt ? (
            <p>
              <strong>{t("contact.nipt")}</strong>
              <br />
              {biz.nipt}
            </p>
          ) : null}
          <p>
            <strong>{t("contact.hours")}</strong>
            <br />
            {biz.hours || t("contact.hoursValue")}
          </p>
          {biz.cancellationPolicy ? (
            <p className="muted" style={{ marginTop: 12, fontSize: "0.9rem" }}>
              {biz.cancellationPolicy}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
