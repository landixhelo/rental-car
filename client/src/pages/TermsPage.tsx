import { useLocale, useT } from "../context/LocaleContext";
import Seo from "../seo/Seo";
import { SITE } from "../seo/site";
import { breadcrumbJsonLd } from "../seo/jsonLd";

const SECTIONS = [
  "s1",
  "s2",
  "s3",
  "s4",
  "s5",
  "s6",
  "s7",
  "s8",
  "s9",
  "s10",
  "s11",
] as const;

export default function TermsPage() {
  const t = useT();
  const { locale } = useLocale();
  return (
    <div className="section narrow">
      <Seo
        title={t("terms.title")}
        description={t("terms.intro")}
        path="/terms"
        locale={locale}
        jsonLd={breadcrumbJsonLd([
          { name: SITE.name, path: "/" },
          { name: t("terms.title"), path: "/terms" },
        ])}
      />
      <h1>{t("terms.title")}</h1>
      <p className="muted">{t("terms.intro")}</p>
      <p className="muted" style={{ marginTop: 0 }}>
        {t("terms.updated")}
      </p>
      <div className="panel terms-panel">
        {SECTIONS.map((key) => (
          <section
            key={key}
            id={key === "s9" ? "privacy" : undefined}
            className="terms-section"
          >
            <h3>{t(`terms.${key}`)}</h3>
            <p className="muted">{t(`terms.${key}Text`)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
