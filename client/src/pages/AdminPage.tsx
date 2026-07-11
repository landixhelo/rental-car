import { type FormEvent, useEffect, useState } from "react";
import { api, type Car } from "../lib/api";
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
  imageUrl: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
};

export default function AdminPage() {
  const { show, Toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [form, setForm] = useState({ ...emptyCar, featuresText: "" });
  const [editId, setEditId] = useState<string | null>(null);

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
      show("Makina u ruajt");
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Error");
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
        <div className="filters">
          <input placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required />
          <input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
          <input type="number" placeholder="Year" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} required />
          <input type="number" placeholder="Price" value={form.pricePerDay} onChange={(e) => setForm({ ...form, pricePerDay: Number(e.target.value) })} required />
          <input type="number" placeholder="Seats" value={form.seats} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} />
          <select value={form.fuel} onChange={(e) => setForm({ ...form, fuel: e.target.value })}>
            <option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Electric</option>
          </select>
          <select value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}>
            <option>Automatic</option><option>Manual</option>
          </select>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option>Sedan</option><option>SUV</option><option>Sports</option><option>Luxury</option>
          </select>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="RESERVED">RESERVED</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
          </select>
          <input placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          <input placeholder="Features (comma)" value={form.featuresText} onChange={(e) => setForm({ ...form, featuresText: e.target.value })} />
        </div>
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
        <button className="btn" type="submit">Ruaj</button>
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
                      ...c,
                      featuresText: (c.features || []).join(", "),
                    } as any);
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
            <tr><th>Klient</th><th>Makina</th><th>Data</th><th>Total</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id}>
                <td>{r.user?.fullName}</td>
                <td>{r.car?.brand} {r.car?.model}</td>
                <td>{String(r.startDate).slice(0,10)} → {String(r.endDate).slice(0,10)}</td>
                <td>€{r.totalPrice}</td>
                <td>
                  <select
                    value={r.status}
                    onChange={async (e) => {
                      await api.updateReservationStatus(r.id, e.target.value);
                      await load();
                    }}
                  >
                    {["PENDING","CONFIRMED","COMPLETED","CANCELLED","REJECTED"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button className="btn danger" onClick={async () => {
                    await api.deleteReservation(r.id);
                    await load();
                  }}>Fshi</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="panel">
        <h2>Përdorues</h2>
        <div className="table-wrap">
        <table>
          <thead><tr><th>Emri</th><th>Email</th><th>Role</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  {u.role !== "ADMIN" && (
                    <button className="btn danger" onClick={async () => {
                      await api.deleteUser(u.id);
                      await load();
                    }}>Fshi</button>
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
        <div className="table-wrap">
        <table>
          <thead><tr><th>Emri</th><th>Subjekti</th><th>Email</th><th>Mesazhi</th></tr></thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.subject}</td>
                <td>{m.email}</td>
                <td>{m.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {stats?.upcoming && (
        <div className="panel">
          <h2>Kalendari</h2>
          {stats.upcoming.map((u: any) => (
            <div key={u.id} className="review-item">
              <strong>{u.car}</strong>
              <p>{String(u.startDate).slice(0,10)} → {String(u.endDate).slice(0,10)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
