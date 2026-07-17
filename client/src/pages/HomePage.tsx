import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, type FormEvent } from "react";
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

const CATEGORIES = [
  { type: "SUV", titleKey: "home.catSuv", textKey: "home.catSuvText" },
  { type: "Sedan", titleKey: "home.catSedan", textKey: "home.catSedanText" },
  { type: "Sports", titleKey: "home.catSports", textKey: "home.catSportsText" },
  {
    type: "Luxury",
    titleKey: "home.catLuxury",
    textKey: "home.catLuxuryText",
  },
] as const;

const CITIES = [
  { location: "Tiranë", titleKey: "home.cityTirana" },
  { location: "Durrës", titleKey: "home.cityDurres" },
  { location: "Vlorë", titleKey: "home.cityVlora" },
] as const;

export default function HomePage() {
  const t = useT();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { show, Toast } = useToast();
  const [cars, setCars] = useState<Car[]>([]);
  const [fleetCount, setFleetCount] = useState(0);
  const [search, setSearch] = useState({
    startDate: "",
    endDate: "",
    location: "all",
  });

  async function load() {
    const res = await api.cars();
    setFleetCount(res.cars.length);
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

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.startDate) params.set("startDate", search.startDate);
    if (search.endDate) params.set("endDate", search.endDate);
    if (search.location && search.location !== "all") {
      params.set("location", search.location);
    }
    navigate(`/cars?${params.toString()}`);
  }

  return (
    <div className="home-page">
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

      <section className="section home-reveal home-search-section">
        <div className="section-head">
          <h2>{t("home.searchTitle")}</h2>
          <p className="section-sub">{t("home.searchSub")}</p>
        </div>
        <form className="home-search" onSubmit={onSearch}>
          <label>
            {t("details.startDate")}
            <input
              type="date"
              value={search.startDate}
              onChange={(e) =>
                setSearch({ ...search, startDate: e.target.value })
              }
              required
            />
          </label>
          <label>
            {t("details.endDate")}
            <input
              type="date"
              min={search.startDate || undefined}
              value={search.endDate}
              onChange={(e) =>
                setSearch({ ...search, endDate: e.target.value })
              }
              required
            />
          </label>
          <label>
            {t("cars.location")}
            <select
              value={search.location}
              onChange={(e) =>
                setSearch({ ...search, location: e.target.value })
              }
            >
              <option value="all">{t("cars.location")}</option>
              <option value="Tiranë">Tiranë</option>
              <option value="Durrës">Durrës</option>
              <option value="Vlorë">Vlorë</option>
            </select>
          </label>
          <button className="btn" type="submit">
            {t("home.searchBtn")}
          </button>
        </form>
      </section>

      <section className="section home-reveal">
        <h2>{t("home.why")}</h2>
        <div className="feature-grid home-cards">
          <div className="home-card home-card--rose">
            <h3>{t("home.feature1Title")}</h3>
            <p>{t("home.feature1Text")}</p>
          </div>
          <div className="home-card home-card--amber">
            <h3>{t("home.feature2Title")}</h3>
            <p>{t("home.feature2Text")}</p>
          </div>
          <div className="home-card home-card--teal">
            <h3>{t("home.feature3Title")}</h3>
            <p>{t("home.feature3Text")}</p>
          </div>
        </div>
      </section>

      <section className="section home-reveal">
        <div className="section-head">
          <h2>{t("home.howTitle")}</h2>
          <p className="section-sub">{t("home.howSub")}</p>
        </div>
        <ol className="home-steps home-cards">
          <li className="home-card home-card--coral">
            <span className="home-step-num">01</span>
            <div>
              <h3>{t("home.how1Title")}</h3>
              <p>{t("home.how1Text")}</p>
            </div>
          </li>
          <li className="home-card home-card--gold">
            <span className="home-step-num">02</span>
            <div>
              <h3>{t("home.how2Title")}</h3>
              <p>{t("home.how2Text")}</p>
            </div>
          </li>
          <li className="home-card home-card--mint">
            <span className="home-step-num">03</span>
            <div>
              <h3>{t("home.how3Title")}</h3>
              <p>{t("home.how3Text")}</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="section home-reveal">
        <div className="section-head">
          <h2>{t("home.categoriesTitle")}</h2>
          <p className="section-sub">{t("home.categoriesSub")}</p>
        </div>
        <div className="home-categories home-cards">
          {CATEGORIES.map((cat, i) => (
            <Link
              key={cat.type}
              to={`/cars?type=${encodeURIComponent(cat.type)}`}
              className={`home-card home-category home-card--cat-${i + 1}`}
            >
              <strong>{t(cat.titleKey)}</strong>
              <span>{t(cat.textKey)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section home-reveal">
        <div className="section-head row-between">
          <div>
            <h2>{t("home.ourCars")}</h2>
          </div>
          <Link to="/cars" className="btn ghost">
            {t("home.explore")}
          </Link>
        </div>
        <div className="cars-grid">
          {cars.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      </section>

      <section className="home-band home-reveal">
        <div className="section">
          <div className="section-head">
            <h2>{t("home.citiesTitle")}</h2>
            <p className="section-sub">{t("home.citiesSub")}</p>
          </div>
          <div className="home-cities">
            {CITIES.map((city) => (
              <Link
                key={city.location}
                to={`/cars?location=${encodeURIComponent(city.location)}`}
                className="home-city"
              >
                <strong>{t(city.titleKey)}</strong>
                <span>{t("home.cityHint")}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section home-reveal">
        <div className="section-head">
          <h2>{t("home.trustTitle")}</h2>
          <p className="section-sub">{t("home.trustSub")}</p>
        </div>
        <div className="home-trust">
          <div>
            <strong>{fleetCount || "—"}</strong>
            <span>{t("home.trustCars")}</span>
          </div>
          <div>
            <strong>3</strong>
            <span>{t("home.trustCities")}</span>
          </div>
          <div>
            <strong>{t("home.trustHours")}</strong>
            <span>{t("home.trustSupport")}</span>
          </div>
        </div>
      </section>

      <section className="home-cta home-reveal">
        <div className="home-cta-inner">
          <h2>{t("home.ctaTitle")}</h2>
          <p>{t("home.ctaText")}</p>
          <div className="hero-actions">
            <Link to="/cars" className="btn">
              {t("home.ctaCars")}
            </Link>
            <Link to="/contact" className="btn ghost">
              {t("home.ctaContact")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
