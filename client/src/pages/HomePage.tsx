import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, type Car } from "../lib/api";
import { mediaUrl } from "../lib/mediaUrl";
import { useLocale, useT } from "../context/LocaleContext";
import Seo from "../seo/Seo";
import { SITE } from "../seo/site";
import { organizationJsonLd, websiteJsonLd, itemListCarsJsonLd } from "../seo/jsonLd";

export default function HomePage() {
  const t = useT();
  const { locale } = useLocale();
  const [cars, setCars] = useState<Car[]>([]);

  useEffect(() => {
    api.cars().then((r) => setCars(r.cars.slice(0, 6))).catch(() => {});
  }, []);

  return (
    <div>
      <Seo
        title={
          locale === "en"
            ? "Premium Car Rental in Albania"
            : locale === "it"
              ? "Noleggio Auto Premium in Albania"
              : "Qira Makinash Premium në Shqipëri"
        }
        description={SITE.description[locale]}
        path="/"
        locale={locale}
        jsonLd={[
          organizationJsonLd(),
          websiteJsonLd(),
          itemListCarsJsonLd(cars),
        ]}
      />
      <section className="hero">
        <div className="hero-inner">
          <span className="eyebrow">{t("home.eyebrow")}</span>
          <h1>
            {t("home.titleBefore")} <span>{t("home.titleAccent")}</span>
          </h1>
          <p>{t("home.subtitle")}</p>
          <div className="hero-actions">
            <Link to="/cars" className="btn">
              {t("home.explore")}
            </Link>
            <Link to="/register" className="btn ghost">
              {t("home.createAccount")}
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>{t("home.why")}</h2>
        <div className="feature-grid">
          <div className="card">
            <h3>{t("home.feature1Title")}</h3>
            <p>{t("home.feature1Text")}</p>
          </div>
          <div className="card">
            <h3>{t("home.feature2Title")}</h3>
            <p>{t("home.feature2Text")}</p>
          </div>
          <div className="card">
            <h3>{t("home.feature3Title")}</h3>
            <p>{t("home.feature3Text")}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>{t("home.ourCars")}</h2>
        <div className="cars-grid">
          {cars.map((car) => (
            <Link key={car.id} to={`/cars/${car.id}`} className="car-card">
              <img src={mediaUrl(car.imageUrl)} alt={`${car.brand} ${car.model}`} />
              <div className="car-card-body">
                <h3>
                  {car.brand} {car.model}
                </h3>
                <span className="company-chip">{car.companyName || "AutoRent"}</span>
                <p className="muted">
                  €{car.pricePerDay}
                  {t("common.perDay")} · ⭐ {car.ratingAvg || "-"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
