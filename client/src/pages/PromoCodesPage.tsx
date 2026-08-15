import { useT } from "../context/LocaleContext";

export default function PromoCodesPage() {
  const t = useT();

  return (
    <div className="ops-page">
      <header className="ops-page-head">
        <div>
          <h1>
            {t("dashboard.navPromo")}{" "}
            <span className="ops-soon-badge">{t("dashboard.soon")}</span>
          </h1>
          <p>{t("opsPages.promoSub")}</p>
        </div>
      </header>

      <div className="ops-coming-soon">
        <div className="ops-coming-soon-icon" aria-hidden>
          %
        </div>
        <h2>{t("opsPages.promoTitle")}</h2>
        <p>{t("opsPages.promoBody")}</p>
      </div>
    </div>
  );
}
