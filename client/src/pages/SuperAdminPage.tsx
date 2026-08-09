import { type FormEvent, useEffect, useState } from "react";
import { api, type Account, type SaleListing } from "../lib/api";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { roleLabel, statusLabel } from "../lib/labels";

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
  const t = useT();
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
  const [saleQueue, setSaleQueue] = useState<SaleListing[]>([]);

  async function load() {
    const [ov, list, sales] = await Promise.all([
      api.superOverview(),
      api.superAccounts({ role: filter, q }),
      api.adminMarketplaceSales().catch(() => ({ listings: [] as SaleListing[] })),
    ]);
    setOverview(ov.overview);
    setAccounts(list.accounts);
    setSaleQueue(sales.listings);
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
      show(e instanceof Error ? e.message : t("common.error"));
    }
  }

  async function createAccount(e: FormEvent) {
    e.preventDefault();
    if (form.role === "CONTRACTOR" && !form.companyName.trim()) {
      show(t("superAdmin.companyRequiredToast"));
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
          ? t("superAdmin.contractorCreated")
          : t("superAdmin.accountCreated")
      );
      setFilter(form.role === "CONTRACTOR" ? "contractors" : filter);
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function search(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  return (
    <div className="section">
      {Toast}
      <h1>{t("superAdmin.title")}</h1>
      <p className="muted">{t("superAdmin.subtitle")}</p>

      {overview && (
        <div className="stats-grid">
          <div className="card"><h2>{overview.clients}</h2><p>{t("superAdmin.clients")}</p></div>
          <div className="card"><h2>{overview.contractors}</h2><p>{t("superAdmin.contractors")}</p></div>
          <div className="card"><h2>{overview.admins}</h2><p>{t("superAdmin.admins")}</p></div>
          <div className="card"><h2>{overview.activeUsers}</h2><p>{t("superAdmin.active")}</p></div>
          <div className="card"><h2>{overview.inactiveUsers}</h2><p>{t("superAdmin.suspended")}</p></div>
          <div className="card"><h2>€{overview.revenue}</h2><p>{t("superAdmin.revenue")}</p></div>
        </div>
      )}

      <form className="panel" onSubmit={createAccount}>
        <h2>{t("superAdmin.createTitle")}</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {t("superAdmin.createHint")}
        </p>
        <div className="filters">
          <input
            placeholder={t("admin.name")}
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
            placeholder={t("superAdmin.password")}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <input
            placeholder={t("auth.phone")}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            placeholder={t("superAdmin.companyRequired")}
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
            <option value="USER">{t("roles.USER")}</option>
            <option value="CONTRACTOR">{t("roles.CONTRACTOR")}</option>
            <option value="ADMIN">{t("roles.ADMIN")}</option>
          </select>
        </div>
        <textarea
          placeholder={t("superAdmin.notes")}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" type="submit">
            {form.role === "CONTRACTOR"
              ? t("superAdmin.addContractor")
              : t("superAdmin.createAccount")}
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
            {t("superAdmin.contractorForm")}
          </button>
        </div>
      </form>

      <div className="panel">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <h2>{t("superAdmin.accounts")}</h2>
          <div className="filters" style={{ margin: 0, flex: 1, maxWidth: 520 }}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
            >
              <option value="all">{t("common.all")}</option>
              <option value="clients">{t("superAdmin.clients")}</option>
              <option value="contractors">{t("superAdmin.contractors")}</option>
              <option value="admins">{t("superAdmin.admins")}</option>
            </select>
            <form onSubmit={search} style={{ display: "contents" }}>
              <input
                placeholder={t("superAdmin.searchPh")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button className="btn" type="submit">
                {t("superAdmin.search")}
              </button>
            </form>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("admin.name")}</th>
                <th>{t("admin.role")}</th>
                <th>{t("superAdmin.company")}</th>
                <th>{t("carForm.status")}</th>
                <th>{t("admin.reservations")}</th>
                <th>{t("admin.cars")}</th>
                <th>{t("superAdmin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.fullName}</strong>
                    <div className="muted">{a.email}</div>
                  </td>
                  <td>{roleLabel(t, a.role)}</td>
                  <td>{a.companyName || "-"}</td>
                  <td>
                    <span className={`badge ${a.isActive ? "" : "badge-off"}`}>
                      {a.isActive
                        ? t("superAdmin.activeBadge")
                        : t("superAdmin.suspendedBadge")}
                    </span>
                  </td>
                  <td>{a.reservationsCount || 0}</td>
                  <td>{a.carsCount || 0}</td>
                  <td>
                    <button className="btn ghost" onClick={() => openAccount(a.id)}>
                      {t("superAdmin.open")}
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
                          {a.isActive
                            ? t("superAdmin.suspend")
                            : t("superAdmin.activate")}
                        </button>
                        <button
                          className="btn danger"
                          onClick={async () => {
                            if (!confirm(t("superAdmin.confirmDelete"))) return;
                            await api.deleteAccount(a.id);
                            setSelected(null);
                            setDetails(null);
                            await load();
                          }}
                        >
                          {t("common.delete")}
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
            {t("superAdmin.intervene")}: {selected.fullName} (
            {roleLabel(t, selected.role)})
          </h2>
          <p className="muted">
            {selected.email} · {selected.phone || t("superAdmin.noPhone")} ·{" "}
            {selected.companyName || t("superAdmin.noCompany")}
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
              <option value="USER">{t("roles.USER")}</option>
              <option value="CONTRACTOR">{t("roles.CONTRACTOR")}</option>
              <option value="ADMIN">{t("roles.ADMIN")}</option>
            </select>
            <input
              placeholder={t("superAdmin.changePassword")}
              type="password"
              onBlur={async (e) => {
                if (!e.target.value) return;
                await api.updateAccount(selected.id, { password: e.target.value });
                e.target.value = "";
                show(t("superAdmin.passwordChanged"));
              }}
            />
          </div>

          <textarea
            placeholder={t("superAdmin.notes")}
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
              show(t("superAdmin.notifySent"));
            }}
          >
            <h3>{t("superAdmin.notify")}</h3>
            <input
              placeholder={t("superAdmin.notifyTitle")}
              value={notify.title}
              onChange={(e) => setNotify({ ...notify, title: e.target.value })}
              required
            />
            <textarea
              placeholder={t("superAdmin.notifyMessage")}
              value={notify.message}
              onChange={(e) => setNotify({ ...notify, message: e.target.value })}
              required
            />
            <button className="btn" type="submit">
              {t("common.send")}
            </button>
          </form>

          <h3 style={{ marginTop: 20 }}>{t("superAdmin.recentBookings")}</h3>
          {!details.reservations.length && (
            <p className="muted">{t("superAdmin.noBookings")}</p>
          )}
          {details.reservations.map((r) => (
            <div key={r.id} className="review-item">
              <strong>
                {r.car?.brand} {r.car?.model} · €{r.totalPrice}
              </strong>
              <p>
                {String(r.startDate).slice(0, 10)} → {String(r.endDate).slice(0, 10)} ·{" "}
                {statusLabel(t, r.status)}
              </p>
            </div>
          ))}

          <h3 style={{ marginTop: 20 }}>{t("superAdmin.contractorCars")}</h3>
          {!details.cars.length && (
            <p className="muted">{t("superAdmin.noCars")}</p>
          )}
          {details.cars.map((c) => (
            <div key={c.id} className="review-item">
              <strong>
                {c.brand} {c.model}
              </strong>
              <p>
                €{c.pricePerDay}
                {t("common.perDay")} · {statusLabel(t, c.status)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="panel" style={{ marginTop: 24 }}>
        <h2>{t("marketplace.moderate")}</h2>
        {!saleQueue.length ? (
          <p className="muted">{t("marketplace.noSales")}</p>
        ) : (
          saleQueue.map((s) => (
            <div key={s.id} className="review-item">
              <strong>
                {s.title} · €{s.price.toLocaleString()} · {s.status}
              </strong>
              <p className="muted">
                {s.seller?.name || "-"} · {s.location}
              </p>
              <div className="reservation-actions">
                {s.status !== "PUBLISHED" ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={async () => {
                      await api.adminUpdateSaleStatus(s.id, "PUBLISHED");
                      show(t("marketplace.approve"));
                      await load();
                    }}
                  >
                    {t("marketplace.approve")}
                  </button>
                ) : null}
                {s.status === "PUBLISHED" ? (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={async () => {
                      await api.adminUpdateSaleStatus(s.id, "SUSPENDED");
                      await load();
                    }}
                  >
                    {t("marketplace.suspend")}
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
