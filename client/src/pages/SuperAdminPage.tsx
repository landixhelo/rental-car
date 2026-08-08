import { type FormEvent, useEffect, useState } from "react";
import { api, type Account } from "../lib/api";
import { useToast } from "../hooks/useToast";

type Filter = "all" | "clients" | "contractors" | "admins";

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  companyName: "",
  role: "USER" as "USER" | "CONTRACTOR" | "ADMIN",
  notes: "",
};

export default function SuperAdminPage() {
  const { show, Toast } = useToast();
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<Account | null>(null);
  const [details, setDetails] = useState<{
    reservations: any[];
    cars: any[];
  } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [notify, setNotify] = useState({ title: "", message: "" });

  async function load() {
    const [ov, list] = await Promise.all([
      api.superOverview(),
      api.superAccounts({ role: filter, q }),
    ]);
    setOverview(ov.overview);
    setAccounts(list.accounts);
  }

  useEffect(() => {
    load().catch((e) => show(e.message));
  }, [filter]);

  async function openAccount(id: string) {
    try {
      const res = await api.superAccount(id);
      setSelected(res.account);
      setDetails({
        reservations: res.reservations,
        cars: res.cars,
      });
    } catch (e) {
      show(e instanceof Error ? e.message : "Error");
    }
  }

  async function createAccount(e: FormEvent) {
    e.preventDefault();
    if (form.role === "CONTRACTOR" && !form.companyName.trim()) {
      show("Për kontraktorin, emri i kompanisë është i detyrueshëm");
      return;
    }
    try {
      await api.createAccount({
        ...form,
        companyName: form.companyName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setForm(emptyForm);
      show(
        form.role === "CONTRACTOR"
          ? "Kontraktori u krijua"
          : "Llogaria u krijua"
      );
      setFilter(form.role === "CONTRACTOR" ? "contractors" : filter);
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Error");
    }
  }

  async function search(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  return (
    <div className="section">
      {Toast}
      <h1>Super Admin Panel</h1>
      <p className="muted">
        Kontroll i plotë mbi klientët, kontraktorët dhe adminët e platformës.
      </p>

      {overview && (
        <div className="stats-grid">
          <div className="card"><h2>{overview.clients}</h2><p>Klientë</p></div>
          <div className="card"><h2>{overview.contractors}</h2><p>Kontraktorë</p></div>
          <div className="card"><h2>{overview.admins}</h2><p>Adminë</p></div>
          <div className="card"><h2>{overview.activeUsers}</h2><p>Aktivë</p></div>
          <div className="card"><h2>{overview.inactiveUsers}</h2><p>Pezulluar</p></div>
          <div className="card"><h2>€{overview.revenue}</h2><p>Të ardhura</p></div>
        </div>
      )}

      <form className="panel" onSubmit={createAccount}>
        <h2>Krijo llogari (klient / kontraktor / admin)</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Për kontraktor: zgjidh rolin <strong>Kontraktor</strong> dhe plotëso
          emrin e kompanisë. Password: min. 10 karaktere, shkronjë e madhe/e vogël,
          numër dhe simbol (p.sh. <code>Contractor@123</code>).
        </p>
        <div className="filters">
          <input
            placeholder="Emri"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <input
            placeholder="Telefon"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            placeholder="Kompania (e detyrueshme për kontraktor)"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            required={form.role === "CONTRACTOR"}
          />
          <select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as typeof form.role })
            }
          >
            <option value="USER">Klient</option>
            <option value="CONTRACTOR">Kontraktor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <textarea
          placeholder="Shënime interne"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" type="submit">
            {form.role === "CONTRACTOR" ? "Shto kontraktor" : "Krijo llogari"}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              setForm({
                ...emptyForm,
                role: "CONTRACTOR",
                companyName: form.companyName || "",
              })
            }
          >
            Formë për kontraktor
          </button>
        </div>
      </form>

      <div className="panel">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <h2>Llogaritë</h2>
          <div className="filters" style={{ margin: 0, flex: 1, maxWidth: 520 }}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
            >
              <option value="all">Të gjitha</option>
              <option value="clients">Klientë</option>
              <option value="contractors">Kontraktorë</option>
              <option value="admins">Adminë</option>
            </select>
            <form onSubmit={search} style={{ display: "contents" }}>
              <input
                placeholder="Kërko emër/email/kompani"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button className="btn" type="submit">
                Kërko
              </button>
            </form>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Emri</th>
                <th>Roli</th>
                <th>Kompania</th>
                <th>Status</th>
                <th>Rezervime</th>
                <th>Makina</th>
                <th>Veprime</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.fullName}</strong>
                    <div className="muted">{a.email}</div>
                  </td>
                  <td>{a.role}</td>
                  <td>{a.companyName || "-"}</td>
                  <td>
                    <span className={`badge ${a.isActive ? "" : "badge-off"}`}>
                      {a.isActive ? "Aktiv" : "Pezulluar"}
                    </span>
                  </td>
                  <td>{a.reservationsCount || 0}</td>
                  <td>{a.carsCount || 0}</td>
                  <td>
                    <button className="btn ghost" onClick={() => openAccount(a.id)}>
                      Hap
                    </button>
                    {a.role !== "SUPER_ADMIN" && (
                      <>
                        <button
                          className="btn ghost"
                          onClick={async () => {
                            await api.toggleAccountActive(a.id);
                            await load();
                            if (selected?.id === a.id) await openAccount(a.id);
                          }}
                        >
                          {a.isActive ? "Pezullo" : "Aktivizo"}
                        </button>
                        <button
                          className="btn danger"
                          onClick={async () => {
                            if (!confirm("Fshi llogarinë?")) return;
                            await api.deleteAccount(a.id);
                            setSelected(null);
                            setDetails(null);
                            await load();
                          }}
                        >
                          Fshi
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && details && (
        <div className="panel">
          <h2>
            Ndërhyrje: {selected.fullName} ({selected.role})
          </h2>
          <p className="muted">
            {selected.email} · {selected.phone || "pa telefon"} ·{" "}
            {selected.companyName || "pa kompani"}
          </p>

          <div className="filters">
            <select
              value={selected.role === "SUPER_ADMIN" ? "ADMIN" : selected.role}
              disabled={selected.role === "SUPER_ADMIN"}
              onChange={async (e) => {
                const role = e.target.value as "USER" | "CONTRACTOR" | "ADMIN";
                const res = await api.updateAccount(selected.id, { role });
                setSelected(res.account);
                await load();
              }}
            >
              <option value="USER">Klient</option>
              <option value="CONTRACTOR">Kontraktor</option>
              <option value="ADMIN">Admin</option>
            </select>
            <input
              placeholder="Ndrysho fjalëkalimin"
              type="password"
              onBlur={async (e) => {
                if (!e.target.value) return;
                await api.updateAccount(selected.id, { password: e.target.value });
                e.target.value = "";
                show("Fjalëkalimi u ndryshua");
              }}
            />
          </div>

          <textarea
            placeholder="Shënime interne"
            defaultValue={selected.notes || ""}
            onBlur={async (e) => {
              const res = await api.updateAccount(selected.id, {
                notes: e.target.value || null,
              });
              setSelected(res.account);
            }}
          />

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await api.notifyAccount(selected.id, notify);
              setNotify({ title: "", message: "" });
              show("Njoftimi u dërgua");
            }}
          >
            <h3>Dërgo njoftim</h3>
            <input
              placeholder="Titulli"
              value={notify.title}
              onChange={(e) => setNotify({ ...notify, title: e.target.value })}
              required
            />
            <textarea
              placeholder="Mesazhi"
              value={notify.message}
              onChange={(e) => setNotify({ ...notify, message: e.target.value })}
              required
            />
            <button className="btn" type="submit">
              Dërgo
            </button>
          </form>

          <h3 style={{ marginTop: 20 }}>Rezervimet e fundit</h3>
          {!details.reservations.length && <p className="muted">Asnjë rezervim</p>}
          {details.reservations.map((r) => (
            <div key={r.id} className="review-item">
              <strong>
                {r.car?.brand} {r.car?.model} · €{r.totalPrice}
              </strong>
              <p>
                {String(r.startDate).slice(0, 10)} → {String(r.endDate).slice(0, 10)} ·{" "}
                {r.status}
              </p>
            </div>
          ))}

          <h3 style={{ marginTop: 20 }}>Makinat e kontraktorit</h3>
          {!details.cars.length && <p className="muted">Asnjë makinë</p>}
          {details.cars.map((c) => (
            <div key={c.id} className="review-item">
              <strong>
                {c.brand} {c.model}
              </strong>
              <p>
                €{c.pricePerDay}/ditë · {c.status}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
