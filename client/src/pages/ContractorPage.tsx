import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Car } from "../lib/api";
import { useAuth } from "../context/AuthContext";
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
  status: "AVAILABLE" as const,
  description: "Makinë premium në gjendje të shkëlqyer për qira.",
  features: [] as string[],
  imageUrl:
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
};

export default function ContractorPage() {
  const { user } = useAuth();
  const { show, Toast } = useToast();
  const [cars, setCars] = useState<Car[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [form, setForm] = useState({ ...emptyCar, featuresText: "" });
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    const [c, r] = await Promise.all([
      api.myCars(),
      api.fleetReservations(),
    ]);
    setCars(c.cars);
    setReservations(r.reservations);
  }

  useEffect(() => {
    load().catch((e) => show(e.message));
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
    const payload = {
      ...form,
      features: form.featuresText
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    };
    delete (payload as any).featuresText;

    try {
      if (editId) await api.updateCar(editId, payload);
      else await api.createCar(payload);
      setForm({ ...emptyCar, featuresText: "" });
      setEditId(null);
      show(editId ? "Makina u përditësua" : "Makina u shtua");
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div className="section">
      {Toast}
      <h1>Paneli i Kontraktorit</h1>
      <p className="muted">
        Menaxho flotën tënde dhe rezervimet e makinave —{" "}
        {user?.companyName || user?.fullName}.
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

      <form className="panel" onSubmit={saveCar}>
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
          <input
            placeholder="Image URL"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            required
          />
          <input
            placeholder="Features (ndara me presje)"
            value={form.featuresText}
            onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
          />
        </div>
        <textarea
          placeholder="Përshkrimi"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" type="submit">
            {editId ? "Përditëso" : "Shto makinën"}
          </button>
          {editId ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setEditId(null);
                setForm({ ...emptyCar, featuresText: "" });
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
                          featuresText: (c.features || []).join(", "),
                        } as any);
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

      <div className="panel">
        <h2>Rezervimet e flotës</h2>
        {!reservations.length && (
          <p className="muted">Nuk ka rezervime për makinat e tua.</p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Klient</th>
                <th>Makina</th>
                <th>Data</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.user?.fullName}
                    <br />
                    <span className="muted">{r.user?.email}</span>
                  </td>
                  <td>
                    {r.car?.brand} {r.car?.model}
                  </td>
                  <td>
                    {String(r.startDate).slice(0, 10)} →{" "}
                    {String(r.endDate).slice(0, 10)}
                  </td>
                  <td>€{r.totalPrice}</td>
                  <td>
                    <select
                      value={r.status}
                      onChange={async (e) => {
                        try {
                          await api.updateReservationStatus(
                            r.id,
                            e.target.value
                          );
                          show("Statusi u ndryshua");
                          await load();
                        } catch (err) {
                          show(err instanceof Error ? err.message : "Error");
                        }
                      }}
                    >
                      {[
                        "PENDING",
                        "CONFIRMED",
                        "COMPLETED",
                        "CANCELLED",
                        "REJECTED",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
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
