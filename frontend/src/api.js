const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const getToken = () => localStorage.getItem("token");
export const setToken = (t) => localStorage.setItem("token", t);
export const clearToken = () => localStorage.removeItem("token");

async function request(path, { method = "GET", body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    payload = new URLSearchParams(form);
  } else if (body) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  if (res.status === 401 && token) {
    clearToken();
    window.dispatchEvent(new Event("auth-expired"));
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : detail;
    throw new Error(message || "Something went wrong");
  }
  return data;
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", form: { username: email, password } }),
  register: (body) => request("/auth/register", { method: "POST", body }),
  me: () => request("/auth/me"),
  stats: () => request("/items/stats"),
  categories: () => request("/items/categories"),
  listItems: (params) => request(`/items?${new URLSearchParams(params)}`),
  createItem: (body) => request("/items", { method: "POST", body }),
  updateItem: (id, body) => request(`/items/${id}`, { method: "PUT", body }),
  deleteItem: (id) => request(`/items/${id}`, { method: "DELETE" }),
  adjust: (id, body) => request(`/items/${id}/adjust`, { method: "POST", body }),
  movements: (id) => request(`/items/${id}/movements`),
};
