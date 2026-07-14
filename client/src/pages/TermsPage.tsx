import { useT } from "../context/LocaleContext";

export default function TermsPage() {
  const t = useT();
  return (
    <div className="section narrow">
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
