import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, type Car } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import CarCard from "../components/CarCard";
import Seo from "../seo/Seo";
import { SITE } from "../seo/site";
import {
  organizationJsonLd,
  websiteJsonLd,
  itemListCarsJsonLd,
} from "../seo/jsonLd";

export default function HomePage() {
  const t = useT();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { show, Toast } = useToast();
  const [cars, setCars] = useState<Car[]>([]);

  async function load() {
    const res = await api.cars();
    setCars(res.cars.slice(0, 6));
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function toggleFavorite(car: Car) {
    if (!user) {
      show(t("common.requiredLogin"));
      return;
    }
    try {
      if (car.isFavorite) await api.removeFavorite(car.id);
      else await api.addFavorite(car.id);
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : t("common.error"));
    }
  }

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
      {Toast}
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
            <CarCard
              key={car.id}
              car={car}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
        <p style={{ marginTop: 20 }}>
          <Link to="/cars" className="btn ghost">
            {t("home.explore")}
          </Link>
        </p>
      </section>
    </div>
  );
}
