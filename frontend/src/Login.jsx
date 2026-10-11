import { useState } from "react";

export default function Login({ onSubmit }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSubmit(mode, form);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <div className="login-side">
        <h1>Know what's on the shelf.</h1>
        <p>Track stock, spot low inventory early, and keep a record of every change.</p>
      </div>
      <form className="login-form" onSubmit={submit}>
        <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
        {mode === "register" && (
          <label>Full name<input required minLength={2} value={form.full_name} onChange={set("full_name")} /></label>
        )}
        <label>Email<input type="email" required value={form.email} onChange={set("email")} /></label>
        <label>Password<input type="password" required minLength={6} value={form.password} onChange={set("password")} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
        <button type="button" className="link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
