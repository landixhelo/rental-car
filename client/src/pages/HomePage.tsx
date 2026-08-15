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
import { addDays, clampDate, tiraneToday } from "../lib/dates";

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
  const today = tiraneToday();

  const [search, setSearch] = useState(() => ({
    startDate: today,
    endDate: addDays(today, 1),
    location: "all",
  }));

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
    if (!search.startDate || !search.endDate) {
      show(t("home.searchNeedDates"));
      return;
    }
    if (search.endDate <= search.startDate) {
      show(t("home.searchInvalidDates"));
      return;
    }
    const params = new URLSearchParams();
    params.set("startDate", search.startDate);
    params.set("endDate", search.endDate);
    if (search.location && search.location !== "all") {
      params.set("location", search.location);
    }
    navigate(`/cars?${params.toString()}`);
  }

  function onStartChange(value: string) {
    const start = clampDate(value, today);
    setSearch((prev) => {
      const next = { ...prev, startDate: start };
      if (!prev.endDate || prev.endDate <= start) {
        next.endDate = addDays(start, 1);
      }
      return next;
    });
  }

  function onEndChange(value: string) {
    const minEnd = search.startDate
      ? addDays(search.startDate, 1)
      : addDays(today, 1);
    setSearch((prev) => ({
      ...prev,
      endDate: clampDate(value, minEnd),
    }));
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
            {(() => {
              const after = t("home.titleAfter");
              return after && after !== "home.titleAfter" ? ` ${after}` : "";
            })()}
          </h1>
          <p>{t("home.subtitle")}</p>
          <div className="hero-actions">
            <Link to="/cars" className="btn">
              {t("home.explore")}
            </Link>
            <a href="#how" className="btn ghost">
              {t("home.howCta")}
            </a>
          </div>
        </div>

        <div className="hero-search-wrap">
          <form className="home-search" onSubmit={onSearch}>
            <div className="home-search-head">
              <strong>{t("home.searchTitle")}</strong>
              <span>{t("home.searchSub")}</span>
            </div>
            <label>
              {t("home.searchPickup")}
              <input
                type="date"
                min={today}
                value={search.startDate}
                onChange={(e) => onStartChange(e.target.value)}
                required
              />
            </label>
            <label>
              {t("home.searchReturn")}
              <input
                type="date"
                min={
                  search.startDate
                    ? addDays(search.startDate, 1)
                    : addDays(today, 1)
                }
                value={search.endDate}
                onChange={(e) => onEndChange(e.target.value)}
                required
              />
            </label>
            <label>
              {t("home.searchCity")}
              <select
                value={search.location}
                onChange={(e) =>
                  setSearch({ ...search, location: e.target.value })
                }
              >
                <option value="all">{t("home.searchAnyCity")}</option>
                <option value="Tiranë">Tiranë</option>
                <option value="Durrës">Durrës</option>
                <option value="Vlorë">Vlorë</option>
              </select>
            </label>
            <button className="btn" type="submit">
              {t("home.searchBtn")}
            </button>
          </form>
        </div>
      </section>

      <section id="why" className="section home-reveal">
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

      <section id="how" className="section home-reveal">
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

      <section id="cities" className="home-band home-reveal">
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
