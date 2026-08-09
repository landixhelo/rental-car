import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type MyShop, type SaleListing } from "../lib/api";
import CarImagePicker from "../components/CarImagePicker";
import { uploadCarImageFiles } from "../lib/carMedia";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";

const emptySale = {
  title: "",
  brand: "",
  model: "",
  year: 2018,
  price: 5000,
  mileage: "",
  location: "Tiranë",
  fuel: "Petrol",
  transmission: "Manual",
  type: "Sedan",
  color: "",
  description: "",
};

export default function SellerHubPage() {
  const t = useT();
  const { user } = useAuth();
  const { show, Toast } = useToast();
  const canShop =
    user?.role === "CONTRACTOR" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN";

  const [shop, setShop] = useState<MyShop | null>(null);
  const [sales, setSales] = useState<SaleListing[]>([]);
  const [shopForm, setShopForm] = useState({
    companyName: "",
    shopSlug: "",
    shopBio: "",
    shopCity: "",
    shopLogoUrl: "",
    shopIsPublic: false,
  });
  const [saleForm, setSaleForm] = useState({ ...emptySale });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const mine = await api.mySales();
    setSales(mine.listings);
    if (canShop) {
      const s = await api.myShop();
      setShop(s.shop);
      setShopForm({
        companyName: s.shop.companyName || "",
        shopSlug: s.shop.shopSlug || "",
        shopBio: s.shop.shopBio || "",
        shopCity: s.shop.shopCity || "",
        shopLogoUrl: s.shop.shopLogoUrl || "",
        shopIsPublic: Boolean(s.shop.shopIsPublic),
      });
    }
  }

  useEffect(() => {
    load().catch((e) => show(e instanceof Error ? e.message : t("common.error")));
  }, [user?.id]);

  async function saveShop(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateMyShop({
        companyName: shopForm.companyName || undefined,
        shopSlug: shopForm.shopSlug || undefined,
        shopBio: shopForm.shopBio || null,
        shopCity: shopForm.shopCity || null,
        shopLogoUrl: shopForm.shopLogoUrl || null,
        shopIsPublic: shopForm.shopIsPublic,
      });
      setShop(res.shop);
      show(t("marketplace.shopSaved"));
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function createSale(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const uploaded = await uploadCarImageFiles(imageFiles);
      const images = [
        ...existingImages,
        ...uploaded,
        ...(imageUrl.trim() ? [imageUrl.trim()] : []),
      ].slice(0, 8);
      if (!images.length) {
        show(t("carForm.needPhoto"));
        return;
      }
      await api.createSale({
        ...saleForm,
        mileage: saleForm.mileage || null,
        color: saleForm.color || null,
        images,
      });
      setSaleForm({ ...emptySale });
      setImageFiles([]);
      setExistingImages([]);
      setImageUrl("");
      show(t("marketplace.saleSubmitted"));
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function markSold(id: string) {
    try {
      await api.updateSale(id, { status: "SOLD" });
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function removeSale(id: string) {
    try {
      await api.deleteSale(id);
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <div className="section seller-hub">
      {Toast}
      <p className="product-eyebrow">{t("marketplace.eyebrow")}</p>
      <h1>{t("marketplace.sellerHub")}</h1>
      <p className="muted">{t("marketplace.sellerHubSub")}</p>
      <p className="muted">{t("marketplace.sellerSplitNote")}</p>
      <p>
        <Link to="/marketplace" className="btn ghost">
          {t("marketplace.viewMarketplace")}
        </Link>
        {canShop ? (
          <Link to="/contractor" className="btn ghost" style={{ marginLeft: 8 }}>
            {t("nav.fleet")}
          </Link>
        ) : null}
      </p>

      {canShop ? (
        <form className="panel" onSubmit={saveShop}>
          <h2>{t("marketplace.myShop")}</h2>
          <p className="muted">{t("marketplace.myShopHelp")}</p>
          <input
            placeholder={t("marketplace.company")}
            value={shopForm.companyName}
            onChange={(e) =>
              setShopForm({ ...shopForm, companyName: e.target.value })
            }
          />
          <input
            placeholder={t("marketplace.slug")}
            value={shopForm.shopSlug}
            onChange={(e) =>
              setShopForm({
                ...shopForm,
                shopSlug: e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, ""),
              })
            }
          />
          <input
            placeholder={t("marketplace.city")}
            value={shopForm.shopCity}
            onChange={(e) =>
              setShopForm({ ...shopForm, shopCity: e.target.value })
            }
          />
          <input
            placeholder={t("marketplace.logoUrl")}
            value={shopForm.shopLogoUrl}
            onChange={(e) =>
              setShopForm({ ...shopForm, shopLogoUrl: e.target.value })
            }
          />
          <textarea
            placeholder={t("marketplace.bio")}
            value={shopForm.shopBio}
            onChange={(e) =>
              setShopForm({ ...shopForm, shopBio: e.target.value })
            }
            rows={3}
          />
          <label className="remember-me">
            <input
              type="checkbox"
              checked={shopForm.shopIsPublic}
              onChange={(e) =>
                setShopForm({ ...shopForm, shopIsPublic: e.target.checked })
              }
            />
            {t("marketplace.publishShop")}
          </label>
          {shop?.shopSlug && shop.shopIsPublic ? (
            <p>
              <Link to={`/shops/${shop.shopSlug}`}>
                /shops/{shop.shopSlug}
              </Link>
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={saving}>
            {t("common.save")}
          </button>
        </form>
      ) : null}

      <form className="panel" onSubmit={createSale}>
        <h2>{t("marketplace.sellCar")}</h2>
        <p className="muted">{t("marketplace.sellHelp")}</p>
        <input
          placeholder={t("marketplace.saleTitle")}
          value={saleForm.title}
          onChange={(e) => setSaleForm({ ...saleForm, title: e.target.value })}
          required
        />
        <div className="form-row">
          <input
            placeholder={t("carForm.brand")}
            value={saleForm.brand}
            onChange={(e) =>
              setSaleForm({ ...saleForm, brand: e.target.value })
            }
            required
          />
          <input
            placeholder={t("carForm.model")}
            value={saleForm.model}
            onChange={(e) =>
              setSaleForm({ ...saleForm, model: e.target.value })
            }
            required
          />
        </div>
        <div className="form-row">
          <input
            type="number"
            placeholder={t("carForm.year")}
            value={saleForm.year}
            onChange={(e) =>
              setSaleForm({ ...saleForm, year: Number(e.target.value) })
            }
            required
          />
          <input
            type="number"
            placeholder={t("marketplace.price")}
            value={saleForm.price}
            onChange={(e) =>
              setSaleForm({ ...saleForm, price: Number(e.target.value) })
            }
            required
          />
        </div>
        <input
          placeholder={t("carForm.mileage")}
          value={saleForm.mileage}
          onChange={(e) =>
            setSaleForm({ ...saleForm, mileage: e.target.value })
          }
        />
        <input
          placeholder={t("carForm.location")}
          value={saleForm.location}
          onChange={(e) =>
            setSaleForm({ ...saleForm, location: e.target.value })
          }
          required
        />
        <textarea
          placeholder={t("contact.message")}
          value={saleForm.description}
          onChange={(e) =>
            setSaleForm({ ...saleForm, description: e.target.value })
          }
          required
          rows={4}
        />
        <CarImagePicker
          existingImages={existingImages}
          onExistingChange={setExistingImages}
          files={imageFiles}
          onFilesChange={setImageFiles}
          imageUrl={imageUrl}
          onImageUrlChange={setImageUrl}
        />
        <button className="btn" type="submit" disabled={saving}>
          {t("marketplace.publishSale")}
        </button>
      </form>

      <div className="panel">
        <h2>{t("marketplace.mySales")}</h2>
        {sales.length === 0 ? (
          <p className="muted">{t("marketplace.noMySales")}</p>
        ) : (
          <div className="seller-sales-list">
            {sales.map((s) => (
              <div key={s.id} className="seller-sale-row">
                <div>
                  <strong>{s.title}</strong>
                  <p className="muted">
                    €{s.price.toLocaleString()} · {s.status}
                  </p>
                </div>
                <div className="reservation-actions">
                  {s.status === "PUBLISHED" ? (
                    <Link
                      className="btn ghost"
                      to={`/marketplace/sales/${s.id}`}
                    >
                      {t("marketplace.view")}
                    </Link>
                  ) : null}
                  {s.status !== "SOLD" && s.status !== "ARCHIVED" ? (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => markSold(s.id)}
                    >
                      {t("marketplace.markSold")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => removeSale(s.id)}
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
