import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { api, type Car } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import Seo from "../seo/Seo";
import { SITE } from "../seo/site";
import { breadcrumbJsonLd, faqJsonLd, localRentalJsonLd } from "../seo/jsonLd";
import FleetCarCard from "../components/FleetCarCard";
import {
  carsForLocation,
  locationBySlug,
  RENTAL_LOCATIONS,
} from "../lib/rentalLocations";
import { whatsappHref } from "../lib/whatsapp";

export default function LocationPage() {
  const { city } = useParams();
  const loc = locationBySlug(city ? `car-rental-${city}` : "");
  const t = useT();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { show, Toast } = useToast();
  const [cars, setCars] = useState<Car[]>([]);

  useEffect(() => {
    api
      .cars()
      .then((r) => setCars(r.cars))
      .catch(() => {});
  }, []);

  const copy = loc?.copy[locale] || loc?.copy.en;
  const fleet = useMemo(
    () => (loc ? carsForLocation(cars, loc).slice(0, 8) : []),
    [cars, loc]
  );

  async function toggleFavorite(car: Car) {
    if (!user) {
      show(t("common.requiredLogin"));
      return;
    }
    try {
      if (car.isFavorite) await api.removeFavorite(car.id);
      else await api.addFavorite(car.id);
      const res = await api.cars();
      setCars(res.cars);
    } catch (e) {
      show(e instanceof Error ? e.message : t("common.error"));
    }
  }

  if (!loc || !copy) {
    return (
      <div className="section">
        <h1>{t("locations.notFound")}</h1>
        <Link to="/cars" className="btn">
          {t("home.viewAllCars")}
        </Link>
      </div>
    );
  }

  const faqItems = [
    { question: t("faq.q4"), answer: t("faq.a4") },
    { question: t("faq.q5"), answer: t("faq.a5") },
    { question: t("faq.q8"), answer: t("faq.a8") },
    { question: t("faq.q1"), answer: t("faq.a1") },
  ];
  const wa = whatsappHref(
    locale === "en"
      ? `Hello, I need a car in ${loc.cityEn}.`
      : locale === "it"
        ? `Salve, vorrei un'auto a ${loc.cityEn}.`
        : `Përshëndetje, dua një makinë në ${loc.citySq}.`
  );

  return (
    <div className="location-page">
      <Seo
        title={copy.title}
        description={copy.description}
        path={loc.path}
        locale={locale}
        keywords={copy.keywords}
        jsonLd={[
          breadcrumbJsonLd([
            { name: SITE.name, path: "/" },
            { name: copy.h1, path: loc.path },
          ]),
          localRentalJsonLd(loc.cityEn, loc.path),
          faqJsonLd(faqItems),
        ]}
      />
      {Toast}

      <section className="location-hero">
        <div className="pilot-wrap">
          <p className="pilot-eyebrow">{SITE.fullName}</p>
          <h1>{copy.h1}</h1>
          <p>{copy.intro}</p>
          <div className="hero-actions">
            <Link to="/cars" className="btn">
              {t("home.explore")}
            </Link>
            <a className="btn btn-wa" href={wa} target="_blank" rel="noreferrer">
              {t("home.ctaWhatsapp")}
            </a>
          </div>
        </div>
      </section>

      <section className="pilot-section">
        <div className="pilot-wrap location-grid">
          <article>
            <h2>{t("locations.pickupTitle")}</h2>
            <p>{copy.pickup}</p>
          </article>
          <article>
            <h2>{t("locations.deliveryTitle")}</h2>
            <p>{copy.delivery}</p>
          </article>
        </div>
      </section>

      <section className="pilot-section pilot-section--grey">
        <div className="pilot-wrap">
          <div className="pilot-head">
            <span className="pilot-eyebrow">{t("home.fleetEyebrow")}</span>
            <h2>{t("home.ourCars")}</h2>
          </div>
          <div className="pilot-fleet">
            {fleet.map((car) => (
              <FleetCarCard
                key={car.id}
                car={car}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
          <p className="location-all">
            <Link to="/cars">{t("home.viewAllCars")}</Link>
          </p>
        </div>
      </section>

      <section className="pilot-section">
        <div className="pilot-wrap">
          <h2>{t("locations.mapTitle")}</h2>
          <iframe
            className="location-map"
            title={copy.h1}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(
              loc.mapsQuery
            )}&z=12&output=embed`}
          />
        </div>
      </section>

      <section className="pilot-section pilot-section--grey">
        <div className="pilot-wrap">
          <h2>{t("home.faqTitle")}</h2>
          {faqItems.map((item) => (
            <details key={item.question} className="home-faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="pilot-cta">
        <div className="pilot-cta-inner">
          <h2>{t("home.ctaTitle")}</h2>
          <div className="hero-actions">
            <a className="btn" href={wa} target="_blank" rel="noreferrer">
              {t("home.ctaWhatsapp")}
            </a>
            <Link to="/cars" className="btn ghost">
              {t("home.ctaCars")}
            </Link>
          </div>
        </div>
      </section>

      <nav className="location-other pilot-wrap">
        {RENTAL_LOCATIONS.filter((l) => l.slug !== loc.slug).map((l) => (
          <Link key={l.slug} to={l.path}>
            {l.copy[locale].h1.replace(" – Via Egnatia", "")}
          </Link>
        ))}
      </nav>
    </div>
  );
}
