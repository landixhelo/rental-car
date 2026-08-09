import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Car, type MarketplaceShop } from "../lib/api";
import CarCard from "../components/CarCard";
import { mediaUrl } from "../lib/mediaUrl";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import Seo from "../seo/Seo";

export default function ShopPage() {
  const { slug = "" } = useParams();
  const t = useT();
  const { locale } = useLocale();
  const { show, Toast } = useToast();
  const [shop, setShop] = useState<MarketplaceShop | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .marketplaceShop(slug)
      .then((r) => {
        setShop(r.shop);
        setCars(r.cars);
      })
      .catch((e) => show(e instanceof Error ? e.message : t("common.error")))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="section">
        <p className="muted">{t("common.loading")}</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="section">
        <p>{t("marketplace.shopMissing")}</p>
        <Link to="/marketplace">{t("marketplace.back")}</Link>
      </div>
    );
  }

  return (
    <div className="section shop-page">
      <Seo
        title={shop.name}
        description={shop.bio || SITE_FALLBACK(locale)}
        path={`/shops/${shop.slug}`}
        locale={locale}
      />
      {Toast}
      <Link to="/marketplace" className="muted">
        ← {t("marketplace.back")}
      </Link>
      <header className="shop-header">
        {shop.logoUrl ? (
          <img
            className="shop-logo"
            src={mediaUrl(shop.logoUrl)}
            alt=""
          />
        ) : (
          <div className="shop-card-fallback large" aria-hidden>
            {shop.name.slice(0, 1)}
          </div>
        )}
        <div>
          <h1>{shop.name}</h1>
          <p className="muted">
            {shop.city || t("marketplace.albania")}
            {shop.phone ? ` · ${shop.phone}` : ""}
          </p>
          {shop.bio ? <p>{shop.bio}</p> : null}
        </div>
      </header>

      <h2>{t("marketplace.fleet")}</h2>
      {cars.length === 0 ? (
        <p className="muted">{t("marketplace.shopEmpty")}</p>
      ) : (
        <div className="cars-grid">
          {cars.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      )}
    </div>
  );
}

function SITE_FALLBACK(locale: string) {
  if (locale === "en") return "Partner rental fleet on AutoRent marketplace.";
  if (locale === "it") return "Flotta partner sul marketplace AutoRent.";
  return "Flota partner në marketplace AutoRent.";
}
