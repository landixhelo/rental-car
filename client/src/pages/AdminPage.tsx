import { type FormEvent, useEffect, useState } from "react";
import { api, type Car } from "../lib/api";
import { buildCarJsonPayload, uploadCarImageFiles } from "../lib/carMedia";
import { mediaUrl } from "../lib/mediaUrl";
import FeatureCheckboxes from "../components/FeatureCheckboxes";
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
  imageUrl: "",
};

export default function AdminPage() {
  const { show, Toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [form, setForm] = useState({ ...emptyCar });
  const [editId, setEditId] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [s, c, r, u, m] = await Promise.all([
      api.adminStats(),
      api.cars(),
      api.allReservations(),
      api.adminUsers(),
      api.adminMessages(),
    ]);
    setStats(s.stats);
    setCars(c.cars);
    setReservations(r.reservations);
    setUsers(u.users);
    setMessages(m.messages);
  }

  useEffect(() => {
    load().catch((e) => show(e.message));
  }, []);

  function resetForm() {
    setForm({ ...emptyCar });
    setEditId(null);
    setExistingImages([]);
    setImageFiles([]);
  }

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
      resetForm();
      show("Makina u ruajt");
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
      <h1>Admin Dashboard</h1>

      {stats && (
        <div className="stats-grid">
          <div className="card"><h2>{stats.cars}</h2><p>Makina</p></div>
          <div className="card"><h2>{stats.reservations}</h2><p>Rezervime aktive</p></div>
          <div className="card"><h2>{stats.users}</h2><p>Përdorues</p></div>
          <div className="card"><h2>€{stats.revenue}</h2><p>Të ardhura</p></div>
          <div className="card"><h2>{stats.topCar?.name || "-"}</h2><p>Top makinë</p></div>
          <div className="card"><h2>{stats.pendingPayments}</h2><p>Pagesa pending</p></div>
        </div>
      )}

      <form className="panel" onSubmit={saveCar}>
        <h2>{editId ? "Edito Makinë" : "Shto Makinë"}</h2>
        <div className="form-fields">
          <label className="field">
            <span>Marka</span>
            <input placeholder="p.sh. BMW, Mercedes" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required autoComplete="off" />
          </label>
          <label className="field">
            <span>Modeli</span>
            <input placeholder="p.sh. X5, C-Class" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required autoComplete="off" />
          </label>
          <label className="field">
            <span>Viti</span>
            <input type="number" placeholder="2024" min={1990} max={2100} value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} required />
          </label>
          <label className="field">
            <span>Çmimi / ditë (€)</span>
            <input type="number" placeholder="50" min={1} value={form.pricePerDay} onChange={(e) => setForm({ ...form, pricePerDay: Number(e.target.value) })} required />
          </label>
          <label className="field">
            <span>Ndenjëse</span>
            <input type="number" placeholder="5" min={1} max={20} value={form.seats} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} />
          </label>
          <label className="field">
            <span>Karburanti</span>
            <select value={form.fuel} onChange={(e) => setForm({ ...form, fuel: e.target.value })}>
              <option value="Petrol">Benzinë</option>
              <option value="Diesel">Naftë</option>
              <option value="Hybrid">Hibrid</option>
              <option value="Electric">Elektrike</option>
            </select>
          </label>
          <label className="field">
            <span>Transmisioni</span>
            <select value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}>
              <option value="Automatic">Automatik</option>
              <option value="Manual">Manual</option>
            </select>
          </label>
          <label className="field">
            <span>Tipi i makinës</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="Sedan">Sedan</option>
              <option value="SUV">SUV</option>
              <option value="Sports">Sportive</option>
              <option value="Luxury">Luksoze</option>
            </select>
          </label>
          <label className="field">
            <span>Statusi</span>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
              <option value="AVAILABLE">E lirë</option>
              <option value="RESERVED">E rezervuar</option>
              <option value="MAINTENANCE">Në mirëmbajtje</option>
            </select>
          </label>
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
          <label className="field" style={{ display: "block", marginTop: 10 }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)" }}>
              ose URL e fotos (opsionale)
            </span>
            <input
              placeholder="https://..."
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
          </label>
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
                <span className="muted">{file.name}</span>
              </div>
            ))}
          </div>
        </div>

        <label className="field field-wide" style={{ display: "block" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)" }}>
            Përshkrimi
          </span>
          <textarea
            placeholder="Shkruaj një përshkrim të shkurtër për makinën"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Duke ngarkuar..." : "Ruaj"}
          </button>
          {editId ? (
            <button type="button" className="btn ghost" onClick={resetForm}>
              Anulo
            </button>
          ) : null}
        </div>
      </form>

      <div className="panel">
        <h2>Makina</h2>
        <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Makina</th><th>Çmimi</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {cars.map((c) => (
              <tr key={c.id}>
                <td>{c.brand} {c.model}</td>
                <td>€{c.pricePerDay}</td>
                <td>{c.status}</td>
                <td>
                  <button className="btn ghost" onClick={() => {
                    setEditId(c.id);
                    setForm({
                      ...emptyCar,
                      ...c,
                      features: c.features || [],
                      imageUrl: "",
                    } as any);
                    setExistingImages(
                      c.images?.length ? c.images : c.imageUrl ? [c.imageUrl] : []
                    );
                    setImageFiles([]);
                  }}>Edit</button>
                  <button className="btn danger" onClick={async () => {
                    if (!confirm("Fshi?")) return;
                    await api.deleteCar(c.id);
                    await load();
                  }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="panel">
        <h2>Rezervime</h2>
        <div className="table-wrap">
        <table>
          <thead>
            <tr><th>User</th><th>Makina</th><th>Data</th><th>Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id}>
                <td>{r.user?.fullName}</td>
                <td>{r.car?.brand} {r.car?.model}</td>
                <td>{String(r.startDate).slice(0, 10)} → {String(r.endDate).slice(0, 10)}</td>
                <td>€{r.totalPrice}</td>
                <td>
                  <select
                    value={r.status}
                    onChange={async (e) => {
                      await api.updateReservationStatus(r.id, e.target.value);
                      await load();
                    }}
                  >
                    {["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "REJECTED"].map((s) => (
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

      <div className="panel">
        <h2>Users</h2>
        <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Emri</th><th>Email</th><th>Roli</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  {u.role !== "ADMIN" && (
                    <button className="btn danger" onClick={async () => {
                      if (!confirm("Fshi user?")) return;
                      await api.deleteUser(u.id);
                      await load();
                    }}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="panel">
        <h2>Mesazhet</h2>
        {messages.map((m) => (
          <div key={m.id} className="review-item">
            <strong>{m.name} · {m.email}</strong>
            <p>{m.subject}</p>
            <p>{m.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
