import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, type FormEvent } from "react";
import { api, type Car } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { mediaUrl } from "../lib/mediaUrl";
import { carPath } from "../lib/carPath";
import Seo from "../seo/Seo";
import { SITE } from "../seo/site";
import {
  organizationJsonLd,
  websiteJsonLd,
  itemListCarsJsonLd,
} from "../seo/jsonLd";
import { addDays, clampDate, tiraneToday } from "../lib/dates";

const CATEGORIES = [
  {
    type: "SUV",
    titleKey: "home.catSuv" as const,
    image: "/categories/suv.png",
  },
  {
    type: "Sedan",
    titleKey: "home.catSedan" as const,
    image: "/categories/sedan.png",
  },
  {
    type: "Sports",
    titleKey: "home.catSports" as const,
    image: "/categories/sports.png",
  },
  {
    type: "Luxury",
    titleKey: "home.catLuxury" as const,
    image: "/categories/luxury.png",
  },
];

const FEATURES = [
  {
    titleKey: "home.feature1Title" as const,
    textKey: "home.feature1Text" as const,
    icon: "fleet",
  },
  {
    titleKey: "home.feature2Title" as const,
    textKey: "home.feature2Text" as const,
    icon: "booking",
  },
  {
    titleKey: "home.feature3Title" as const,
    textKey: "home.feature3Text" as const,
    icon: "security",
  },
];

function FeatureIcon({ name }: { name: string }) {
  if (name === "fleet") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 16l1.2-3.6A2 2 0 0 1 8.1 11h7.8a2 2 0 0 1 1.9 1.4L19 16" />
        <path d="M5 16h14v2a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H11a2 2 0 0 1-4 0H6a1 1 0 0 1-1-1v-2z" />
        <path d="M7 11V8a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3" />
      </svg>
    );
  }
  if (name === "booking") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9.5 12l1.8 1.8L15 10" />
    </svg>
  );
}

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
    setCars(res.cars.slice(0, 3));
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
    <div className="home-page pilot-home">
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

        <a className="hero-scroll" href="#fleet" aria-label={t("home.scroll")}>
          {t("home.scroll")}
          <span aria-hidden>↓</span>
        </a>
      </section>

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

      <section id="fleet" className="pilot-section">
        <div className="pilot-wrap">
          <div className="pilot-head row-between pilot-head--row">
            <div>
              <span className="pilot-eyebrow">{t("home.fleetEyebrow")}</span>
              <h2>{t("home.ourCars")}</h2>
            </div>
            <Link to="/cars" className="pilot-link">
              {t("home.viewAllCars")}
            </Link>
          </div>
          <div className="pilot-fleet">
            {cars.length === 0 ? (
              <p className="pilot-empty">{t("home.fleetEmpty")}</p>
            ) : (
              cars.map((car) => (
                <article key={car.id} className="pilot-car">
                  <div className="pilot-car-media">
                    <Link
                      to={carPath(car)}
                      className="pilot-car-photo"
                      aria-label={`${car.brand} ${car.model}`}
                    >
                      <img
                        src={mediaUrl(car.imageUrl)}
                        alt={`${car.brand} ${car.model}`}
                      />
                    </Link>
                    <span className="pilot-car-badge">
                      {t("cars.available")}
                    </span>
                    <button
                      type="button"
                      className={`pilot-fav${car.isFavorite ? " active" : ""}`}
                      onClick={() => toggleFavorite(car)}
                      aria-label={t("nav.favorites")}
                    >
                      ♥
                    </button>
                  </div>
                  <div className="pilot-car-body">
                    <div className="row-between">
                      <h3>
                        <Link to={carPath(car)}>
                          {car.brand} {car.model}
                        </Link>
                      </h3>
                      <strong>
                        €{car.pricePerDay}
                        <small>{t("common.perDay")}</small>
                      </strong>
                    </div>
                    <p className="pilot-car-loc">{car.location}</p>
                    <div className="pilot-car-specs">
                      <span>
                        {t("cars.transmission")}
                        <b>{car.transmission || "—"}</b>
                      </span>
                      <span>
                        {t("cars.seats")}
                        <b>{car.seats || "—"}</b>
                      </span>
                      <span>
                        {t("cars.fuel")}
                        <b>{car.fuel || "—"}</b>
                      </span>
                    </div>
                    <div className="row-between pilot-car-foot">
                      <span className="pilot-rating">
                        ★ {car.ratingAvg || "—"}
                        <small>({car.ratingCount || 0})</small>
                      </span>
                      <Link to={carPath(car)} className="btn">
                        {t("home.viewDetails")}
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section id="why" className="pilot-section pilot-section--grey">
        <div className="pilot-wrap pilot-features">
          {FEATURES.map((f) => (
            <article key={f.titleKey} className="pilot-feature">
              <span className="pilot-feature-icon" aria-hidden>
                <FeatureIcon name={f.icon} />
              </span>
              <h3>{t(f.titleKey)}</h3>
              <p>{t(f.textKey)}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="pilot-section">
        <div className="pilot-wrap">
          <div className="pilot-head">
            <span className="pilot-eyebrow">{t("home.howEyebrow")}</span>
            <h2>{t("home.howTitle")}</h2>
          </div>
          <ol className="pilot-steps">
            <li>
              <span>01</span>
              <h3>{t("home.how1Title")}</h3>
              <p>{t("home.how1Text")}</p>
            </li>
            <li>
              <span>02</span>
              <h3>{t("home.how2Title")}</h3>
              <p>{t("home.how2Text")}</p>
            </li>
            <li>
              <span>03</span>
              <h3>{t("home.how3Title")}</h3>
              <p>{t("home.how3Text")}</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="pilot-section pilot-section--grey">
        <div className="pilot-wrap">
          <div className="pilot-head pilot-head--left">
            <span className="pilot-eyebrow">{t("home.categoriesEyebrow")}</span>
            <h2>{t("home.categoriesTitle")}</h2>
            <p>{t("home.categoriesSub")}</p>
          </div>
          <div className="pilot-cats">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.type}
                to={`/cars?type=${encodeURIComponent(cat.type)}`}
                className="pilot-cat"
              >
                <img src={cat.image} alt={t(cat.titleKey)} />
                <strong>{t(cat.titleKey)}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="cities" className="pilot-stats">
        <div className="pilot-wrap pilot-stats-grid">
          <div>
            <strong>{fleetCount > 0 ? `${fleetCount}+` : "7+"}</strong>
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
          <div>
            <strong>4.9/5</strong>
            <span>{t("home.trustRating")}</span>
          </div>
        </div>
      </section>

      <section className="pilot-cta">
        <div className="pilot-cta-inner">
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
