import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type Car } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { addDays, clampDate, tiraneToday } from "../lib/dates";
import { RENTAL_LOCATIONS } from "../lib/rentalLocations";
import { whatsappHref } from "../lib/whatsapp";
import FleetCarCard from "../components/FleetCarCard";
import Seo from "../seo/Seo";
import { SITE } from "../seo/site";
import {
  organizationJsonLd,
  websiteJsonLd,
  itemListCarsJsonLd,
  faqJsonLd,
} from "../seo/jsonLd";

const WHY = [
  { icon: "🚗", titleKey: "home.why1Title" as const, textKey: "home.why1Text" as const },
  { icon: "💰", titleKey: "home.why2Title" as const, textKey: "home.why2Text" as const },
  { icon: "✈️", titleKey: "home.why3Title" as const, textKey: "home.why3Text" as const },
  { icon: "📍", titleKey: "home.why4Title" as const, textKey: "home.why4Text" as const },
  { icon: "📞", titleKey: "home.why5Title" as const, textKey: "home.why5Text" as const },
  { icon: "🔑", titleKey: "home.why6Title" as const, textKey: "home.why6Text" as const },
];

type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  userName: string;
  carLabel: string;
};

export default function HomePage() {
  const t = useT();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { show, Toast } = useToast();
  const [cars, setCars] = useState<Car[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [reviewAvg, setReviewAvg] = useState(4.9);
  const [reviewCount, setReviewCount] = useState(0);
  const today = tiraneToday();
  const wa = whatsappHref(t("chat.waPrefill"));

  const [search, setSearch] = useState(() => ({
    startDate: today,
    endDate: addDays(today, 1),
    location: "all",
  }));

  async function load() {
    const res = await api.cars();
    setCars(res.cars.slice(0, 6));
  }

  useEffect(() => {
    load().catch(() => {});
    api
      .publicReviews()
      .then((r) => {
        setReviews(r.reviews || []);
        if (r.count) setReviewCount(r.count);
        if (r.average) setReviewAvg(Number(r.average.toFixed(1)));
      })
      .catch(() => {});
  }, []);

  const fromPrice = useMemo(() => {
    if (!cars.length) return 0;
    return Math.min(...cars.map((c) => Number(c.pricePerDay) || 0));
  }, [cars]);
  const midPrice = fromPrice ? Math.max(1, Math.round(fromPrice * 0.95)) : 0;
  const weekPrice = fromPrice ? Math.max(1, Math.round(fromPrice * 0.9)) : 0;

  const faqItems = [
    { question: t("faq.q1"), answer: t("faq.a1") },
    { question: t("faq.q2"), answer: t("faq.a2") },
    { question: t("faq.q3"), answer: t("faq.a3") },
    { question: t("faq.q4"), answer: t("faq.a4") },
    { question: t("faq.q5"), answer: t("faq.a5") },
    { question: t("faq.q6"), answer: t("faq.a6") },
    { question: t("faq.q7"), answer: t("faq.a7") },
    { question: t("faq.q8"), answer: t("faq.a8") },
  ];

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
            ? "Car Rental in Albania | Tirana, Durrës, Airport"
            : locale === "it"
              ? "Noleggio Auto in Albania | Tirana, Durazzo, Aeroporto"
              : "Qira makinash në Shqipëri | Tiranë, Durrës, Aeroport"
        }
        description={SITE.description[locale]}
        path="/"
        locale={locale}
        jsonLd={[
          organizationJsonLd(),
          websiteJsonLd(),
          itemListCarsJsonLd(cars),
          faqJsonLd(faqItems),
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
            <a className="btn btn-wa" href={wa} target="_blank" rel="noreferrer">
              {t("home.ctaWhatsapp")}
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
              <option value="Sarandë">Sarandë</option>
              <option value="Aeroport">Aeroporti i Tiranës</option>
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
                <FleetCarCard
                  key={car.id}
                  car={car}
                  onToggleFavorite={toggleFavorite}
                />
              ))
            )}
          </div>
        </div>
      </section>

      <section id="pricing" className="pilot-section pilot-section--grey">
        <div className="pilot-wrap">
          <div className="pilot-head">
            <span className="pilot-eyebrow">{t("home.pricingEyebrow")}</span>
            <h2>{t("home.pricingTitle")}</h2>
            <p>{t("home.pricingSub")}</p>
          </div>
          <div className="pricing-grid">
            <article>
              <h3>{t("home.price1Title")}</h3>
              <p>
                {t("cars.fromPrice")}{" "}
                <strong>€{fromPrice || "—"}</strong>
                {t("common.perDay")}
              </p>
            </article>
            <article>
              <h3>{t("home.price3Title")}</h3>
              <p>
                {t("cars.fromPrice")}{" "}
                <strong>€{midPrice || "—"}</strong>
                {t("common.perDay")}
              </p>
            </article>
            <article>
              <h3>{t("home.price7Title")}</h3>
              <p>
                {t("cars.fromPrice")}{" "}
                <strong>€{weekPrice || "—"}</strong>
                {t("common.perDay")}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="why" className="pilot-section">
        <div className="pilot-wrap">
          <div className="pilot-head">
            <span className="pilot-eyebrow">{t("home.whyEyebrow")}</span>
            <h2>{t("home.why")}</h2>
          </div>
          <div className="why-grid">
            {WHY.map((item) => (
              <article key={item.titleKey}>
                <span aria-hidden>{item.icon}</span>
                <h3>{t(item.titleKey)}</h3>
                <p>{t(item.textKey)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="cities" className="pilot-section pilot-section--grey">
        <div className="pilot-wrap">
          <div className="pilot-head">
            <span className="pilot-eyebrow">{t("home.citiesTitle")}</span>
            <h2>{t("home.locationsTitle")}</h2>
            <p>{t("home.citiesSub")}</p>
          </div>
          <div className="location-cards">
            {RENTAL_LOCATIONS.map((loc) => (
              <Link key={loc.slug} to={loc.path} className="location-card">
                <strong>{loc.copy[locale].h1.replace(" – Via Egnatia", "")}</strong>
                <span>{t("home.cityHint")}</span>
              </Link>
            ))}
          </div>
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

      <section id="reviews" className="pilot-section pilot-section--grey">
        <div className="pilot-wrap">
          <div className="pilot-head">
            <span className="pilot-eyebrow">{t("home.reviewsEyebrow")}</span>
            <h2>{t("home.reviewsTitle")}</h2>
            <p>
              ⭐⭐⭐⭐⭐ {reviewAvg || "4.9"}/5
              {reviewCount
                ? ` · ${t("home.reviewsBased")} ${reviewCount}`
                : ` · ${t("home.reviewsFallback")}`}
            </p>
          </div>
          {reviews.length ? (
            <div className="reviews-grid">
              {reviews.slice(0, 5).map((r) => (
                <blockquote key={r.id}>
                  <p>{r.comment}</p>
                  <footer>
                    <strong>{r.userName}</strong>
                    <span>
                      {"★".repeat(r.rating)} · {r.carLabel}
                    </span>
                  </footer>
                </blockquote>
              ))}
            </div>
          ) : (
            <p className="pilot-empty">{t("home.reviewsEmpty")}</p>
          )}
        </div>
      </section>

      <section id="faq" className="pilot-section">
        <div className="pilot-wrap home-faq">
          <div className="pilot-head">
            <span className="pilot-eyebrow">FAQ</span>
            <h2>{t("home.faqTitle")}</h2>
          </div>
          {faqItems.map((item) => (
            <details key={item.question} className="home-faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
          <p className="location-all">
            <Link to="/faq">{t("home.faqAll")}</Link>
          </p>
        </div>
      </section>

      <section className="pilot-cta">
        <div className="pilot-cta-inner">
          <h2>{t("home.finalCtaTitle")}</h2>
          <p>{t("home.ctaText")}</p>
          <div className="hero-actions">
            <Link to="/cars" className="btn">
              {t("home.finalCta")}
            </Link>
            <a className="btn btn-wa" href={wa} target="_blank" rel="noreferrer">
              {t("home.ctaWhatsapp")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
