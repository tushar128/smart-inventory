import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";

const PAGE = 10;
const money = (n) => Number(n).toLocaleString(undefined, { style: "currency", currency: "USD" });
const emptyItem = { sku: "", name: "", category: "General", quantity: 0, reorder_level: 10, unit_price: 0, location: "" };

export default function Dashboard({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [modal, setModal] = useState(null); // {type: 'form'|'adjust', item}
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const params = { skip: page * PAGE, limit: PAGE, low_stock: lowOnly };
      if (q) params.q = q;
      if (category) params.category = category;
      const [list, s, c] = await Promise.all([api.listItems(params), api.stats(), api.categories()]);
      setItems(list.items); setTotal(list.total); setStats(s); setCategories(c); setError("");
    } catch (e) { setError(e.message); }
  }, [q, category, lowOnly, page]);

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  async function remove(item) {
    if (!confirm(`Delete ${item.name}? Its stock history will be deleted too.`)) return;
    try { await api.deleteItem(item.id); load(); } catch (e) { setError(e.message); }
  }

  const closeAndReload = () => { setModal(null); load(); };
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="app">
      <header className="bar">
        <strong className="brand">Smart Inventory</strong>
        <span className="who">{user.full_name}</span>
        <button className="btn" onClick={onLogout}>Sign out</button>
      </header>

      <section className="stats" aria-label="Inventory summary">
        <Stat label="Products" value={stats?.total_items} />
        <Stat label="Units in stock" value={stats?.total_units} />
        <Stat label="Stock value" value={stats && money(stats.total_value)} />
        <Stat label="Need reordering" value={stats?.low_stock_count} warn={stats?.low_stock_count > 0} />
      </section>

      <div className="toolbar">
        <input type="search" placeholder="Search by name or SKU" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="check">
          <input type="checkbox" checked={lowOnly} onChange={(e) => { setLowOnly(e.target.checked); setPage(0); }} /> Low stock only
        </label>
        <button className="btn primary" onClick={() => setModal({ type: "form", item: null })}>Add product</button>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>SKU</th><th>Product</th><th>Category</th><th>Location</th><th className="num">Price</th><th>Stock</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const low = i.quantity <= i.reorder_level;
              const pct = Math.min(100, (i.quantity / Math.max(i.reorder_level * 3, 1)) * 100);
              return (
                <tr key={i.id} className={low ? "low" : ""}>
                  <td className="sku">{i.sku}</td>
                  <td>{i.name}</td>
                  <td>{i.category}</td>
                  <td>{i.location || "—"}</td>
                  <td className="num">{money(i.unit_price)}</td>
                  <td>
                    <div className="level"><span style={{ width: `${pct}%` }} /></div>
                    <small>{i.quantity} {low && `(reorder at ${i.reorder_level})`}</small>
                  </td>
                  <td className="actions">
                    <button className="btn sm" onClick={() => setModal({ type: "adjust", item: i })}>Adjust stock</button>
                    <button className="btn sm" onClick={() => setModal({ type: "form", item: i })}>Edit</button>
                    <button className="btn sm danger" onClick={() => remove(i)}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={7} className="empty">No products found. Add your first product to start tracking stock.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <button className="btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page + 1} of {pages}</span>
        <button className="btn sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>

      {modal?.type === "form" && <ItemForm item={modal.item} onClose={() => setModal(null)} onSaved={closeAndReload} />}
      {modal?.type === "adjust" && <Adjust item={modal.item} onClose={() => setModal(null)} onSaved={closeAndReload} />}
    </div>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div className={`stat ${warn ? "warn" : ""}`}>
      <b>{value ?? "…"}</b>
      <span>{label}</span>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ItemForm({ item, onClose, onSaved }) {
  const editing = !!item;
  const [f, setF] = useState(item ? { ...item, location: item.location || "" } : emptyItem);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const num = { quantity: parseInt(f.quantity || 0), reorder_level: parseInt(f.reorder_level || 0), unit_price: parseFloat(f.unit_price || 0) };
    try {
      if (editing) {
        await api.updateItem(item.id, { name: f.name, category: f.category, location: f.location, reorder_level: num.reorder_level, unit_price: num.unit_price });
      } else {
        await api.createItem({ ...f, ...num });
      }
      onSaved();
    } catch (err) { setError(err.message); }
  }

  return (
    <Modal title={editing ? `Edit ${item.name}` : "Add product"} onClose={onClose}>
      <form onSubmit={submit} className="grid">
        <label>SKU<input required disabled={editing} value={f.sku} onChange={set("sku")} /></label>
        <label>Name<input required value={f.name} onChange={set("name")} /></label>
        <label>Category<input value={f.category} onChange={set("category")} /></label>
        <label>Location<input value={f.location} onChange={set("location")} placeholder="e.g. A1-03" /></label>
        {!editing && <label>Opening quantity<input type="number" min="0" value={f.quantity} onChange={set("quantity")} /></label>}
        <label>Reorder level<input type="number" min="0" value={f.reorder_level} onChange={set("reorder_level")} /></label>
        <label>Unit price<input type="number" min="0" step="0.01" value={f.unit_price} onChange={set("unit_price")} /></label>
        {error && <p className="error full" role="alert">{error}</p>}
        <div className="row full">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary">{editing ? "Save changes" : "Add product"}</button>
        </div>
      </form>
    </Modal>
  );
}

function Adjust({ item, onClose, onSaved }) {
  const [change, setChange] = useState("");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => { api.movements(item.id).then(setHistory).catch(() => {}); }, [item.id]);

  async function submit(e) {
    e.preventDefault();
    try { await api.adjust(item.id, { change: parseInt(change), reason }); onSaved(); }
    catch (err) { setError(err.message); }
  }

  return (
    <Modal title={`Adjust stock: ${item.name}`} onClose={onClose}>
      <p className="muted">Currently {item.quantity} in stock. Use a negative number to remove units.</p>
      <form onSubmit={submit} className="grid">
        <label>Change<input type="number" required autoFocus value={change} onChange={(e) => setChange(e.target.value)} placeholder="+20 or -5" /></label>
        <label>Reason<input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Delivery, sale, damaged…" /></label>
        {error && <p className="error full" role="alert">{error}</p>}
        <div className="row full">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary">Update stock</button>
        </div>
      </form>
      <h3>History</h3>
      <ul className="history">
        {history.slice(0, 8).map((m) => (
          <li key={m.id}>
            <b className={m.change > 0 ? "in" : "out"}>{m.change > 0 ? `+${m.change}` : m.change}</b>
            <span>{m.reason}</span>
            <small>{new Date(m.created_at).toLocaleString()}</small>
          </li>
        ))}
        {history.length === 0 && <li className="muted">No movements yet.</li>}
      </ul>
    </Modal>
  );
}
