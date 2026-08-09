import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Car } from "../lib/api";
import { buildCarJsonPayload, uploadCarImageFiles } from "../lib/carMedia";
import FeatureCheckboxes from "../components/FeatureCheckboxes";
import CarImagePicker from "../components/CarImagePicker";
import FleetCalendar from "../components/FleetCalendar";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { statusLabel } from "../lib/labels";

const emptyCar = {
  brand: "",
  model: "",
  year: 2024,
  pricePerDay: 50,
  seats: 5,
  doors: 4,
  luggage: 2,
  horsepower: "",
  color: "",
  mileage: "",
  location: "Tiranë",
  fuel: "Petrol",
  transmission: "Automatic",
  type: "Sedan",
  status: "AVAILABLE" as Car["status"],
  description: "Makinë premium në gjendje të shkëlqyer për qira.",
  features: [] as string[],
  imageUrl: "",
};

export default function ContractorPage() {
  const t = useT();
  const { user } = useAuth();
  const { show, Toast } = useToast();
  const [cars, setCars] = useState<Car[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [form, setForm] = useState({ ...emptyCar });
  const [editId, setEditId] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  async function load() {
    const carsRes = await api.myCars().catch((e) => {
      show(e instanceof Error ? e.message : t("contractor.loadError"));
      return { cars: [] as Car[] };
    });
    setCars(carsRes.cars);

    const fleetRes = await api.fleetReservations().catch(() => ({
      reservations: [] as any[],
    }));
    setReservations(fleetRes.reservations || []);
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const active = reservations.filter((r) =>
      ["PENDING", "CONFIRMED"].includes(r.status)
    ).length;
    const revenue = reservations
      .filter((r) => ["CONFIRMED", "COMPLETED"].includes(r.status))
      .reduce((s, r) => s + Number(r.totalPrice || 0), 0);
    return {
      cars: cars.length,
      active,
      revenue: Math.round(revenue * 100) / 100,
      available: cars.filter((c) => c.status === "AVAILABLE").length,
    };
  }, [cars, reservations]);

  async function saveCar(e: FormEvent) {
    e.preventDefault();
    if (!existingImages.length && !imageFiles.length && !form.imageUrl.trim()) {
      show(t("carForm.needPhoto"));
      return;
    }
    setSaving(true);
    setUploadProgress("");
    try {
      const uploaded = await uploadCarImageFiles(imageFiles, (done, total) => {
        if (total > 0) {
          setUploadProgress(t("carForm.uploadingCount", { done, total }));
        }
      });
      const images = [...existingImages, ...uploaded].slice(0, 8);
      const payload = buildCarJsonPayload(form, images);
      if (editId) await api.updateCar(editId, payload);
      else await api.createCar(payload);
      setForm({ ...emptyCar });
      setEditId(null);
      setExistingImages([]);
      setImageFiles([]);
      show(editId ? t("carForm.updated") : t("carForm.added"));
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
      setUploadProgress("");
    }
  }

  return (
    <div className="section">
      {Toast}
      <h1>{t("contractor.title")}</h1>
      <p className="muted">
        {t("contractor.subtitle", {
          name: user?.companyName || user?.fullName || "",
        })}
      </p>
      <p>
        <Link to="/profile" className="btn ghost">
          {t("contractor.backProfile")}
        </Link>
      </p>

      <div className="stats-grid">
        <div className="card">
          <h2>{stats.cars}</h2>
          <p>{t("contractor.fleetCars")}</p>
        </div>
        <div className="card">
          <h2>{stats.available}</h2>
          <p>{t("contractor.free")}</p>
        </div>
        <div className="card">
          <h2>{stats.active}</h2>
          <p>{t("contractor.activeBookings")}</p>
        </div>
        <div className="card">
          <h2>€{stats.revenue}</h2>
          <p>{t("contractor.revenue")}</p>
        </div>
      </div>

      <p style={{ marginBottom: 20 }}>
        <Link to="/reservations" className="btn">
          {t("contractor.viewBookings")}
        </Link>
      </p>

      <FleetCalendar reservations={reservations} />

      <form className="panel" onSubmit={saveCar} style={{ marginTop: 24 }}>
        <h2>{editId ? t("carForm.editTitle") : t("carForm.addTitle")}</h2>
        <div className="form-fields">
          <label className="field">
            <span>{t("carForm.brand")}</span>
            <input
              placeholder={t("carForm.brandPh")}
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              required
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>{t("carForm.model")}</span>
            <input
              placeholder={t("carForm.modelPh")}
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              required
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>{t("carForm.year")}</span>
            <input
              type="number"
              placeholder="2024"
              min={1990}
              max={2100}
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
              required
            />
          </label>
          <label className="field">
            <span>{t("carForm.price")}</span>
            <input
              type="number"
              placeholder="50"
              min={1}
              value={form.pricePerDay}
              onChange={(e) =>
                setForm({ ...form, pricePerDay: Number(e.target.value) })
              }
              required
            />
          </label>
          <label className="field">
            <span>{t("carForm.seats")}</span>
            <input
              type="number"
              placeholder="5"
              min={1}
              max={20}
              value={form.seats}
              onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>{t("carForm.doors")}</span>
            <input
              type="number"
              placeholder="4"
              min={2}
              max={6}
              value={form.doors}
              onChange={(e) => setForm({ ...form, doors: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>{t("carForm.luggage")}</span>
            <input
              type="number"
              placeholder="2"
              min={0}
              max={10}
              value={form.luggage}
              onChange={(e) =>
                setForm({ ...form, luggage: Number(e.target.value) })
              }
            />
          </label>
          <label className="field">
            <span>{t("carForm.hp")}</span>
            <input
              placeholder={t("carForm.hpPh")}
              value={form.horsepower}
              onChange={(e) => setForm({ ...form, horsepower: e.target.value })}
            />
          </label>
          <label className="field">
            <span>{t("carForm.color")}</span>
            <input
              placeholder={t("carForm.colorPh")}
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </label>
          <label className="field">
            <span>{t("carForm.mileage")}</span>
            <input
              placeholder={t("carForm.mileagePh")}
              value={form.mileage}
              onChange={(e) => setForm({ ...form, mileage: e.target.value })}
            />
          </label>
          <label className="field">
            <span>{t("carForm.location")}</span>
            <input
              placeholder={t("carForm.locationPh")}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </label>
          <label className="field">
            <span>{t("carForm.fuel")}</span>
            <select
              value={form.fuel}
              onChange={(e) => setForm({ ...form, fuel: e.target.value })}
            >
              <option value="Petrol">{t("labels.fuel.Petrol")}</option>
              <option value="Diesel">{t("labels.fuel.Diesel")}</option>
              <option value="Hybrid">{t("labels.fuel.Hybrid")}</option>
              <option value="Electric">{t("labels.fuel.Electric")}</option>
            </select>
          </label>
          <label className="field">
            <span>{t("carForm.transmission")}</span>
            <select
              value={form.transmission}
              onChange={(e) => setForm({ ...form, transmission: e.target.value })}
            >
              <option value="Automatic">{t("labels.transmission.Automatic")}</option>
              <option value="Manual">{t("labels.transmission.Manual")}</option>
            </select>
          </label>
          <label className="field">
            <span>{t("carForm.type")}</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="Sedan">{t("labels.type.Sedan")}</option>
              <option value="SUV">{t("labels.type.SUV")}</option>
              <option value="Sports">{t("labels.type.Sports")}</option>
              <option value="Luxury">{t("labels.type.Luxury")}</option>
            </select>
          </label>
          <label className="field">
            <span>{t("carForm.status")}</span>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as Car["status"] })
              }
            >
              <option value="AVAILABLE">{t("status.AVAILABLE")}</option>
              <option value="RESERVED">{t("status.RESERVED")}</option>
              <option value="MAINTENANCE">{t("status.MAINTENANCE")}</option>
            </select>
          </label>
        </div>

        <FeatureCheckboxes
          value={form.features}
          onChange={(features) => setForm({ ...form, features })}
        />

        <CarImagePicker
          existingImages={existingImages}
          onExistingChange={setExistingImages}
          files={imageFiles}
          onFilesChange={setImageFiles}
          imageUrl={form.imageUrl}
          onImageUrlChange={(url) => setForm({ ...form, imageUrl: url })}
        />

        <label className="field field-wide" style={{ display: "block" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)" }}>
            {t("carForm.description")}
          </span>
          <textarea
            placeholder={t("carForm.descriptionPh")}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" type="submit" disabled={saving}>
            {saving
              ? uploadProgress || t("carForm.uploading")
              : editId
                ? t("carForm.update")
                : t("carForm.add")}
          </button>
          {editId ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setEditId(null);
                setForm({ ...emptyCar });
                setExistingImages([]);
                setImageFiles([]);
              }}
            >
              {t("carForm.cancelEdit")}
            </button>
          ) : null}
        </div>
      </form>

      <div className="panel">
        <h2>{t("contractor.myFleet")}</h2>
        {!cars.length && (
          <p className="muted">{t("contractor.empty")}</p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("admin.cars")}</th>
                <th>{t("admin.price")}</th>
                <th>{t("carForm.status")}</th>
                <th>{t("contractor.bookingsCol")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cars.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.brand} {c.model} ({c.year})
                  </td>
                  <td>€{c.pricePerDay}{t("common.perDay")}</td>
                  <td>{statusLabel(t, c.status)}</td>
                  <td>{(c as any).reservationsCount ?? "-"}</td>
                  <td>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setEditId(c.id);
                        setForm({
                          ...emptyCar,
                          ...c,
                          features: c.features || [],
                          imageUrl: "",
                        } as any);
                        setExistingImages(
                          c.images?.length
                            ? c.images
                            : c.imageUrl
                              ? [c.imageUrl]
                              : []
                        );
                        setImageFiles([]);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      className="btn danger"
                      type="button"
                      onClick={async () => {
                        if (!confirm(t("carForm.confirmDelete"))) return;
                        try {
                          await api.deleteCar(c.id);
                          show(t("carForm.deleted"));
                          await load();
                        } catch (err) {
                          show(err instanceof Error ? err.message : t("common.error"));
                        }
                      }}
                    >
                      {t("common.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
