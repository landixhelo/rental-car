import { type FormEvent, useCallback, useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Car } from "../lib/api";
import { buildCarJsonPayload, uploadCarImageFiles } from "../lib/carMedia";
import FleetCarForm, {
  type FleetCarFormState,
} from "../components/FleetCarForm";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { statusLabel } from "../lib/labels";

const emptyCar: FleetCarFormState = {
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
  status: "AVAILABLE",
  description: "Makinë premium në gjendje të shkëlqyer për qira.",
  features: [],
  imageUrl: "",
};

export default function ContractorPage() {
  const t = useT();
  const { user } = useAuth();
  const { show, Toast } = useToast();
  const editTitleId = useId();
  const [cars, setCars] = useState<Car[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [form, setForm] = useState<FleetCarFormState>({ ...emptyCar });
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

  const closeEdit = useCallback(() => {
    if (saving) return;
    setEditId(null);
    setForm({ ...emptyCar });
    setExistingImages([]);
    setImageFiles([]);
  }, [saving]);

  useEffect(() => {
    if (!editId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [editId]);

  useEffect(() => {
    if (!editId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeEdit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editId, closeEdit]);

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
    const wasEdit = Boolean(editId);
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
      show(wasEdit ? t("carForm.updated") : t("carForm.added"));
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
      setUploadProgress("");
    }
  }

  function openEdit(c: Car) {
    setEditId(c.id);
    setForm({
      ...emptyCar,
      brand: c.brand,
      model: c.model,
      year: c.year,
      pricePerDay: Number(c.pricePerDay),
      seats: c.seats,
      doors: c.doors,
      luggage: c.luggage,
      horsepower: c.horsepower || "",
      color: c.color || "",
      mileage: String(c.mileage ?? ""),
      location: c.location || "Tiranë",
      fuel: c.fuel || "Petrol",
      transmission: c.transmission || "Automatic",
      type: c.type || "Sedan",
      status: c.status,
      description: c.description || "",
      features: c.features || [],
      imageUrl: "",
    });
    setExistingImages(
      c.images?.length ? c.images : c.imageUrl ? [c.imageUrl] : []
    );
    setImageFiles([]);
  }

  const formProps = {
    form,
    setForm,
    existingImages,
    onExistingChange: setExistingImages,
    imageFiles,
    onFilesChange: setImageFiles,
    saving,
    uploadProgress,
    onSubmit: saveCar,
  };

  return (
    <div className="ops-page">
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

      <p style={{ marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link to="/reservations" className="btn">
          {t("contractor.viewBookings")}
        </Link>
        <Link to="/calendar" className="btn ghost">
          {t("contractor.openCalendar")}
        </Link>
      </p>

      {!editId ? (
        <div className="panel" style={{ marginTop: 24 }}>
          <h2>{t("carForm.addTitle")}</h2>
          <FleetCarForm {...formProps} isEdit={false} />
        </div>
      ) : null}

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
                  <td>
                    €{c.pricePerDay}
                    {t("common.perDay")}
                  </td>
                  <td>{statusLabel(t, c.status)}</td>
                  <td>{(c as any).reservationsCount ?? "-"}</td>
                  <td>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => openEdit(c)}
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
                          show(
                            err instanceof Error ? err.message : t("common.error")
                          );
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

      {editId ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={closeEdit}
        >
          <div
            className="modal-panel car-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={editTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2 id={editTitleId}>{t("carForm.editTitle")}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeEdit}
                disabled={saving}
                aria-label={t("common.close")}
              >
                ✕
              </button>
            </div>
            <FleetCarForm {...formProps} isEdit onCancel={closeEdit} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
