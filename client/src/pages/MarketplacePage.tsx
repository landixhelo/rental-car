import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  api,
  type MarketplaceShop,
  type SaleListing,
} from "../lib/api";
import { mediaUrl } from "../lib/mediaUrl";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import Seo from "../seo/Seo";
import { SITE } from "../seo/site";

type Tab = "rent" | "buy";

export default function MarketplacePage() {
  const t = useT();
  const { locale } = useLocale();
  const { show, Toast } = useToast();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") === "buy" ? "buy" : "rent") as Tab;
  const [shops, setShops] = useState<MarketplaceShop[]>([]);
  const [sales, setSales] = useState<SaleListing[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const run =
      tab === "rent"
        ? api.marketplaceShops().then((r) => setShops(r.shops))
        : api
            .marketplaceSales(search ? { search } : undefined)
            .then((r) => setSales(r.listings));
    run
      .catch((e) => show(e instanceof Error ? e.message : t("common.error")))
      .finally(() => setLoading(false));
  }, [tab, search]);

  function setTab(next: Tab) {
    setParams(next === "buy" ? { tab: "buy" } : {});
  }

  return (
    <div className="section marketplace-page">
      <Seo
        title={t("marketplace.title")}
        description={SITE.description[locale]}
        path="/marketplace"
        locale={locale}
      />
      {Toast}
      <header className="marketplace-hero">
        <h1>{t("marketplace.title")}</h1>
        <p>{t("marketplace.subtitle")}</p>
        <div className="marketplace-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "rent"}
            className={tab === "rent" ? "active" : undefined}
            onClick={() => setTab("rent")}
          >
            {t("marketplace.tabRent")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "buy"}
            className={tab === "buy" ? "active" : undefined}
            onClick={() => setTab("buy")}
          >
            {t("marketplace.tabBuy")}
          </button>
        </div>
      </header>

      {tab === "buy" ? (
        <form
          className="marketplace-search"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setSearch(String(fd.get("q") || "").trim());
          }}
        >
          <input
            name="q"
            defaultValue={search}
            placeholder={t("marketplace.searchSales")}
          />
          <button className="btn" type="submit">
            {t("common.search")}
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="muted">{t("common.loading")}</p>
      ) : tab === "rent" ? (
        shops.length === 0 ? (
          <div className="panel">
            <p>{t("marketplace.noShops")}</p>
            <Link className="btn" to="/cars">
              {t("marketplace.browseFleet")}
            </Link>
          </div>
        ) : (
          <div className="shop-grid">
            {shops.map((shop) => (
              <Link
                key={shop.slug}
                to={`/shops/${shop.slug}`}
                className="shop-card panel"
              >
                {shop.logoUrl ? (
                  <img src={mediaUrl(shop.logoUrl)} alt="" />
                ) : (
                  <div className="shop-card-fallback" aria-hidden>
                    {shop.name.slice(0, 1)}
                  </div>
                )}
                <div>
                  <h2>{shop.name}</h2>
                  <p className="muted">
                    {shop.city || t("marketplace.albania")}
                    {typeof shop.carsCount === "number"
                      ? ` · ${shop.carsCount} ${t("marketplace.cars")}`
                      : ""}
                  </p>
                  {shop.bio ? <p className="clamp">{shop.bio}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        )
      ) : sales.length === 0 ? (
        <div className="panel">
          <p>{t("marketplace.noSales")}</p>
        </div>
      ) : (
        <div className="sale-grid">
          {sales.map((listing) => (
            <Link
              key={listing.id}
              to={`/marketplace/sales/${listing.id}`}
              className="sale-card"
            >
              <img
                src={mediaUrl(listing.imageUrl || listing.images[0] || "")}
                alt={listing.title}
              />
              <div className="sale-card-body">
                <div className="row-between">
                  <h3>{listing.title}</h3>
                  <strong>€{listing.price.toLocaleString()}</strong>
                </div>
                <p className="muted">
                  {listing.year}
                  {listing.mileage ? ` · ${listing.mileage}` : ""} ·{" "}
                  {listing.location}
                </p>
                {listing.seller ? (
                  <span className="company-chip">{listing.seller.name}</span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === "rent" ? (
        <p className="marketplace-foot muted">
          {t("marketplace.orBrowse")}{" "}
          <Link to="/cars">{t("nav.cars")}</Link>
        </p>
      ) : null}
    </div>
  );
}
