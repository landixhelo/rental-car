import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, type Car } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import CarCard from "../components/CarCard";
import Seo from "../seo/Seo";
import { SITE } from "../seo/site";
import { breadcrumbJsonLd, itemListCarsJsonLd } from "../seo/jsonLd";

const emptyFilters = {
  search: "",
  type: "all",
  status: "all",
  fuel: "all",
  transmission: "all",
  location: "all",
  minPrice: "",
  maxPrice: "",
};

export default function CarsPage() {
  const [searchParams] = useSearchParams();
  const [cars, setCars] = useState<Car[]>([]);
  const [filters, setFilters] = useState(() => ({
    ...emptyFilters,
    type: searchParams.get("type") || "all",
    location: searchParams.get("location") || "all",
  }));
  const { user } = useAuth();
  const { show, Toast } = useToast();
  const t = useT();
  const { locale } = useLocale();

  async function load(next = filters) {
    const params: Record<string, string> = {};
    Object.entries(next).forEach(([k, v]) => {
      if (v && v !== "all") params[k] = v;
    });
    const res = await api.cars(params);
    setCars(res.cars);
  }

  useEffect(() => {
    const next = {
      ...emptyFilters,
      type: searchParams.get("type") || "all",
      location: searchParams.get("location") || "all",
    };
    setFilters(next);
    load(next).catch((e) => show(e.message));
  }, [searchParams]);
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
    <div className="section">
      <Seo
        title={t("cars.title")}
        description={SITE.description[locale]}
        path="/cars"
        locale={locale}
        keywords={SITE.keywords[locale]}
        jsonLd={[
          breadcrumbJsonLd([
            { name: "AutoRent", path: "/" },
            { name: t("cars.title"), path: "/cars" },
          ]),
          itemListCarsJsonLd(cars),
        ]}
      />
      {Toast}
      <h1>{t("cars.title")}</h1>
      <div className="filters">
        <input
          placeholder={t("common.search")}
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="all">{t("cars.type")}</option>
          <option>SUV</option>
          <option>Sedan</option>
          <option>Sports</option>
          <option>Luxury</option>
        </select>
        <select
          value={filters.fuel}
          onChange={(e) => setFilters({ ...filters, fuel: e.target.value })}
        >
          <option value="all">{t("cars.fuel")}</option>
          <option>Petrol</option>
          <option>Diesel</option>
          <option>Hybrid</option>
          <option>Electric</option>
        </select>
        <select
          value={filters.transmission}
          onChange={(e) =>
            setFilters({ ...filters, transmission: e.target.value })
          }
        >
          <option value="all">{t("cars.transmission")}</option>
          <option>Automatic</option>
          <option>Manual</option>
        </select>
        <select
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
        >
          <option value="all">{t("cars.location")}</option>
          <option>Tiranë</option>
          <option>Durrës</option>
          <option>Vlorë</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="all">{t("cars.status")}</option>
          <option value="AVAILABLE">{t("cars.available")}</option>
          <option value="RESERVED">{t("cars.reserved")}</option>
          <option value="MAINTENANCE">{t("cars.maintenance")}</option>
        </select>
        <input
          type="number"
          placeholder={t("cars.minPrice")}
          value={filters.minPrice}
          onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
        />
        <input
          type="number"
          placeholder={t("cars.maxPrice")}
          value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
        />
        <div className="filters-actions">
          <button className="btn" type="button" onClick={() => load()}>
            {t("cars.filter")}
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              setFilters(emptyFilters);
              load(emptyFilters);
            }}
          >
            {t("cars.clear")}
          </button>
        </div>
      </div>

      <p>{t("cars.found", { count: cars.length })}</p>
      {!cars.length ? <p className="muted">{t("cars.noResults")}</p> : null}
      <div className="cars-grid">
        {cars.map((car) => (
          <CarCard key={car.id} car={car} onToggleFavorite={toggleFavorite} />
        ))}
      </div>
    </div>
  );
}
