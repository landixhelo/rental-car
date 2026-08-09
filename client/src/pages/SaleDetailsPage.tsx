import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type SaleListing } from "../lib/api";
import { mediaUrl } from "../lib/mediaUrl";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import Seo from "../seo/Seo";

export default function SaleDetailsPage() {
  const { id = "" } = useParams();
  const t = useT();
  const { locale } = useLocale();
  const { show, Toast } = useToast();
  const [listing, setListing] = useState<SaleListing | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .marketplaceSale(id)
      .then((r) => setListing(r.listing))
      .catch((e) => show(e instanceof Error ? e.message : t("common.error")));
  }, [id]);

  if (!listing) {
    return (
      <div className="section">
        {Toast}
        <p className="muted">{t("common.loading")}</p>
      </div>
    );
  }

  const phoneDigits = (listing.seller?.phone || "").replace(/[^\d]/g, "");
  const images =
    listing.images?.length > 0
      ? listing.images
      : listing.imageUrl
        ? [listing.imageUrl]
        : [];

  return (
    <div className="section sale-details">
      <Seo
        title={listing.title}
        description={listing.description.slice(0, 160)}
        path={`/marketplace/sales/${listing.id}`}
        locale={locale}
      />
      {Toast}
      <Link to="/marketplace?tab=buy" className="muted">
        ← {t("marketplace.back")}
      </Link>
      <div className="sale-details-grid">
        <div className="sale-gallery">
          {images.length ? (
            images.map((src) => (
              <img key={src} src={mediaUrl(src)} alt={listing.title} />
            ))
          ) : (
            <div className="panel">{t("marketplace.noPhoto")}</div>
          )}
        </div>
        <div className="panel">
          <h1>{listing.title}</h1>
          <p className="sale-price">€{listing.price.toLocaleString()}</p>
          <p className="muted">
            {listing.brand} {listing.model} · {listing.year}
            {listing.mileage ? ` · ${listing.mileage}` : ""}
            {listing.color ? ` · ${listing.color}` : ""}
          </p>
          <p className="muted">{listing.location}</p>
          <p>{listing.description}</p>
          {listing.seller ? (
            <div className="sale-seller">
              <strong>{listing.seller.name}</strong>
              {listing.seller.shopSlug ? (
                <Link to={`/shops/${listing.seller.shopSlug}`}>
                  {t("marketplace.viewShop")}
                </Link>
              ) : null}
              {listing.seller.phone ? (
                <a href={`tel:${phoneDigits}`}>{listing.seller.phone}</a>
              ) : null}
              {phoneDigits ? (
                <a
                  className="btn"
                  href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(
                    t("marketplace.saleWa", { title: listing.title })
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
