import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { show, Toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      show("Mirësevini!");
      navigate("/");
    } catch (err) {
      show(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="auth-page">
      {Toast}
      <form className="panel" onSubmit={onSubmit}>
        <h1>Hyr</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Fjalëkalimi"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn" type="submit">
          Hyr
        </button>
        <p>
          Nuk ke llogari? <Link to="/register">Regjistrohu</Link>
        </p>
      </form>
    </div>
  );
}
