import { type FormEvent, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../hooks/useToast";

export default function ContactPage() {
  const { show, Toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Rezervim",
    message: "",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await api.contact(form);
      show("Mesazhi u dërgua!");
      setForm({ name: "", email: "", phone: "", subject: "Rezervim", message: "" });
    } catch (err) {
      show(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div className="section">
      {Toast}
      <h1>Na Kontaktoni</h1>
      <div className="contact-grid">
        <form className="panel" onSubmit={onSubmit}>
          <input
            placeholder="Emri"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            placeholder="Telefon"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <select
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          >
            <option>Rezervim</option>
            <option>Pagesa</option>
            <option>Makina</option>
            <option>Tjetër</option>
          </select>
          <textarea
            placeholder="Mesazhi"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            required
          />
          <button className="btn" type="submit">
            Dërgo
          </button>
          <a className="whatsapp" href="https://wa.me/355690000000" target="_blank" rel="noreferrer">
            WhatsApp Support
          </a>
        </form>
        <div className="panel">
          <p>📍 Tiranë, Shqipëri</p>
          <p>📞 +355 69 000 0000</p>
          <p>✉️ support@autorent.al</p>
          <p>🕒 08:00 – 20:00</p>
        </div>
      </div>
    </div>
  );
}
