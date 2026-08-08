import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Car } from "../lib/api";
import { buildCarJsonPayload, uploadCarImageFiles } from "../lib/carMedia";
import { mediaUrl } from "../lib/mediaUrl";
import Breadcrumbs from "../components/Breadcrumbs";
import FeatureCheckboxes from "../components/FeatureCheckboxes";
import FleetCalendar from "../components/FleetCalendar";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";

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
  const { user } = useAuth();
  const t = useT();
  const { show, Toast } = useToast();
  const [cars, setCars] = useState<Car[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [form, setForm] = useState({ ...emptyCar });
  const [editId, setEditId] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const carsRes = await api.myCars().catch((e) => {
      show(e instanceof Error ? e.message : "Gabim te makinat");
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
      show("Shto të paktën një foto (upload ose URL)");
      return;
    }
    setSaving(true);
    try {
      const uploaded = await uploadCarImageFiles(imageFiles);
      const images = [...existingImages, ...uploaded].slice(0, 8);
      const payload = buildCarJsonPayload(form, images);
      if (editId) await api.updateCar(editId, payload);
      else await api.createCar(payload);
      setForm({ ...emptyCar });
      setEditId(null);
      setExistingImages([]);
      setImageFiles([]);
      show(editId ? "Makina u përditësua" : "Makina u shtua");
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="section">
      {Toast}
      <Breadcrumbs items={[{ label: t("nav.fleet") }]} />
      <h1>Paneli i Kontraktorit</h1>
      <p className="muted">
        Menaxho flotën tënde — {user?.companyName || user?.fullName}.
      </p>
      <p>
        <Link to="/profile" className="btn ghost">
          ← Kthehu te profili
        </Link>
      </p>

      <div className="stats-grid">
        <div className="card">
          <h2>{stats.cars}</h2>
          <p>Makina në flotë</p>
        </div>
        <div className="card">
          <h2>{stats.available}</h2>
          <p>Të lira</p>
        </div>
        <div className="card">
          <h2>{stats.active}</h2>
          <p>Rezervime aktive</p>
        </div>
        <div className="card">
          <h2>€{stats.revenue}</h2>
          <p>Të ardhura (konfirmuara)</p>
        </div>
      </div>

      <p style={{ marginBottom: 20 }}>
        <Link to="/reservations" className="btn">
          Shiko rezervimet e klientëve
        </Link>
      </p>

      <FleetCalendar reservations={reservations} />

      <form className="panel" onSubmit={saveCar} style={{ marginTop: 24 }}>
        <h2>{editId ? "Edito makinën" : "Shto makinë të re"}</h2>
        <div className="filters">
          <input
            placeholder="Brand"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            required
          />
          <input
            placeholder="Model"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Viti"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            required
          />
          <input
            type="number"
            placeholder="Çmimi / ditë"
            value={form.pricePerDay}
            onChange={(e) =>
              setForm({ ...form, pricePerDay: Number(e.target.value) })
            }
            required
          />
          <input
            type="number"
            placeholder="Ndenjëse"
            value={form.seats}
            onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })}
          />
          <input
            placeholder="Ngjyra"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
          />
          <input
            placeholder="Lokacioni"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <select
            value={form.fuel}
            onChange={(e) => setForm({ ...form, fuel: e.target.value })}
          >
            <option>Petrol</option>
            <option>Diesel</option>
            <option>Hybrid</option>
            <option>Electric</option>
          </select>
          <select
            value={form.transmission}
            onChange={(e) => setForm({ ...form, transmission: e.target.value })}
          >
            <option>Automatic</option>
            <option>Manual</option>
          </select>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option>Sedan</option>
            <option>SUV</option>
            <option>Sports</option>
            <option>Luxury</option>
          </select>
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as Car["status"] })
            }
          >
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="RESERVED">RESERVED</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
          </select>
        </div>

        <FeatureCheckboxes
          value={form.features}
          onChange={(features) => setForm({ ...form, features })}
        />

        <div className="image-picker">
          <label className="image-picker-label">
            Foto (deri 8) — zgjidh nga pajisja
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) =>
                setImageFiles(Array.from(e.target.files || []).slice(0, 8))
              }
            />
          </label>
          <input
            placeholder="ose Image URL (opsionale)"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          />
          <div className="image-thumbs">
            {existingImages.map((src) => (
              <div key={src} className="image-thumb">
                <img src={mediaUrl(src)} alt="" />
                <button
                  type="button"
                  className="btn danger"
                  onClick={() =>
                    setExistingImages((prev) => prev.filter((x) => x !== src))
                  }
                >
                  ×
                </button>
              </div>
            ))}
            {imageFiles.map((file) => (
              <div key={file.name + file.size} className="image-thumb">
                <img src={URL.createObjectURL(file)} alt="" />
              </div>
            ))}
          </div>
        </div>

        <textarea
          placeholder="Përshkrimi"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" type="submit" disabled={saving}>
            {saving
              ? "Duke ngarkuar..."
              : editId
                ? "Përditëso"
                : "Shto makinën"}
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
              Anulo editimin
            </button>
          ) : null}
        </div>
      </form>

      <div className="panel">
        <h2>Flota ime</h2>
        {!cars.length && (
          <p className="muted">Nuk ke makina ende. Shto të parën më sipër.</p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Makina</th>
                <th>Çmimi</th>
                <th>Status</th>
                <th>Rezervime</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cars.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.brand} {c.model} ({c.year})
                  </td>
                  <td>€{c.pricePerDay}/ditë</td>
                  <td>{c.status}</td>
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
                      Edit
                    </button>
                    <button
                      className="btn danger"
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Fshi ${c.brand} ${c.model}?`)) return;
                        try {
                          await api.deleteCar(c.id);
                          show("Makina u fshi");
                          await load();
                        } catch (err) {
                          show(err instanceof Error ? err.message : "Error");
                        }
                      }}
                    >
                      Fshi
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
