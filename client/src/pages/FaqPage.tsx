import { useT } from "../context/LocaleContext";

export default function FaqPage() {
  const t = useT();
  const items = [
    [t("faq.q1"), t("faq.a1")],
    [t("faq.q2"), t("faq.a2")],
    [t("faq.q3"), t("faq.a3")],
    [t("faq.q4"), t("faq.a4")],
  ];

  return (
    <div className="section narrow">
      <h1>{t("faq.title")}</h1>
      {items.map(([q, a]) => (
        <details key={q} className="panel" open>
          <summary>{q}</summary>
          <p className="muted">{a}</p>
        </details>
      ))}
    </div>
  );
}
