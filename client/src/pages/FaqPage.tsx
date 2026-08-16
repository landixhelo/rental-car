import { useLocale, useT } from "../context/LocaleContext";
import Seo from "../seo/Seo";
import { SITE } from "../seo/site";
import { breadcrumbJsonLd, faqJsonLd } from "../seo/jsonLd";

export default function FaqPage() {
  const t = useT();
  const { locale } = useLocale();
  const items = [
    { question: t("faq.q1"), answer: t("faq.a1") },
    { question: t("faq.q2"), answer: t("faq.a2") },
    { question: t("faq.q3"), answer: t("faq.a3") },
    { question: t("faq.q4"), answer: t("faq.a4") },
  ];

  return (
    <div className="section narrow">
      <Seo
        title={t("faq.title")}
        description={`${t("faq.q1")} ${t("faq.a1")}`}
        path="/faq"
        locale={locale}
        jsonLd={[
          breadcrumbJsonLd([
            { name: SITE.name, path: "/" },
            { name: t("faq.title"), path: "/faq" },
          ]),
          faqJsonLd(items),
        ]}
      />
      <h1>{t("faq.title")}</h1>
      {items.map((item) => (
        <details key={item.question} className="panel" open>
          <summary>{item.question}</summary>
          <p className="muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
