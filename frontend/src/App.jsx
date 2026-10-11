import { useEffect, useState } from "react";
import { api, clearToken, getToken, setToken } from "./api.js";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(!!getToken());

  useEffect(() => {
    if (getToken()) {
      api.me().then(setUser).catch(() => clearToken()).finally(() => setChecking(false));
    }
    const expired = () => setUser(null);
    window.addEventListener("auth-expired", expired);
    return () => window.removeEventListener("auth-expired", expired);
  }, []);

  async function handleAuth(mode, form) {
    if (mode === "register") await api.register(form);
    const { access_token } = await api.login(form.email, form.password);
    setToken(access_token);
    setUser(await api.me());
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  if (checking) return <p className="boot">Loading…</p>;
  return user ? <Dashboard user={user} onLogout={logout} /> : <Login onSubmit={handleAuth} />;
}
