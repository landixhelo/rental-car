import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { show, Toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await register({ fullName, email, password, phone });
      show("Llogaria u krijua!");
      navigate("/");
    } catch (err) {
      show(err instanceof Error ? err.message : "Register failed");
    }
  }

  return (
    <div className="auth-page">
      {Toast}
      <form className="panel" onSubmit={onSubmit}>
        <h1>Regjistrohu</h1>
        <input
          placeholder="Emri i plotë"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          placeholder="Telefon"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          type="password"
          placeholder="Fjalëkalimi (min 8, shkronja+numër)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn" type="submit">
          Krijo Llogari
        </button>
        <p>
          Ke llogari? <Link to="/login">Hyr</Link>
        </p>
      </form>
    </div>
  );
}
