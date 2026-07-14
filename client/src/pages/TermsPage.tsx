import { useLocale, useT } from "../context/LocaleContext";
import Seo from "../seo/Seo";
import { breadcrumbJsonLd } from "../seo/jsonLd";

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
          { name: "AutoRent", path: "/" },
          { name: t("terms.title"), path: "/terms" },
        ])}
      />
      <h1>{t("terms.title")}</h1>
      <div className="panel">
        <h3>{t("terms.s1")}</h3>
        <p className="muted">{t("terms.s1Text")}</p>
        <h3>{t("terms.s2")}</h3>
        <p className="muted">{t("terms.s2Text")}</p>
        <h3>{t("terms.s3")}</h3>
        <p className="muted">{t("terms.s3Text")}</p>
        <h3>{t("terms.s4")}</h3>
        <p className="muted">{t("terms.s4Text")}</p>
        <h3>{t("terms.s5")}</h3>
        <p className="muted">{t("terms.s5Text")}</p>
      </div>
    </div>
  );
}
