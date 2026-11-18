import { useEffect, useState } from "react";
import { Edit3, Plus, ReceiptText, Search, Trash2 } from "lucide-react";
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  money,
  localDate,
  shortDate,
} from "../api";
import { Empty, Field, Loading, Modal, Notice } from "../components/UI";

const fresh = () => ({
  expense_date: localDate(),
  description: "",
  category: "Operación",
  amount: "",
});

export default function Expenses() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(fresh);
  const [modal, setModal] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      setRows(await apiGet("/expenses"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const open = (row = null) => {
    setEditing(row);
    setForm(
      row
        ? {
            expense_date: row.expense_date,
            description: row.description,
            category: row.category,
            amount: row.amount,
          }
        : fresh(),
    );
    setModal(true);
    setError("");
  };
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) await apiPut(`/expenses/${editing.id}`, form);
      else await apiPost("/expenses", form);
      setModal(false);
      setSuccess("Gasto guardado correctamente.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (row) => {
    if (!window.confirm(`¿Eliminar el gasto "${row.description}"?`)) return;
    try {
      await apiDelete(`/expenses/${row.id}`);
      setSuccess("Gasto eliminado.");
      await load();
    } catch (e) {
      setError(e.message);
    }
  };
  const filtered = rows.filter((r) =>
    `${r.description} ${r.category} ${r.expense_date}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONTROL FINANCIERO</div>
          <h1>Gastos</h1>
          <p>
            Registra los egresos operativos utilizados para calcular la
            utilidad.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => open()}>
          <Plus size={18} />
          Registrar gasto
        </button>
      </div>
      <Notice>{error}</Notice>
      <Notice type="success">{success}</Notice>
      <div className="panel table-panel">
        <div className="table-toolbar">
          <div>
            <h3>Historial de gastos</h3>
            <p>
              Total registrado:{" "}
              {money(rows.reduce((s, r) => s + Number(r.amount), 0))}
            </p>
          </div>
          <div className="search-box">
            <Search size={18} />
            <input
              placeholder="Buscar gasto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {loading ? (
          <Loading />
        ) : filtered.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>FECHA</th>
                  <th>CONCEPTO</th>
                  <th>CATEGORÍA</th>
                  <th>IMPORTE</th>
                  <th className="actions-heading">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{shortDate(r.expense_date)}</td>
                    <td>
                      <strong>{r.description}</strong>
                    </td>
                    <td>{r.category}</td>
                    <td>
                      <strong>{money(r.amount)}</strong>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          title="Editar"
                          onClick={() => open(r)}
                        >
                          <Edit3 size={17} />
                        </button>
                        <button
                          className="icon-button icon-danger"
                          title="Eliminar"
                          onClick={() => remove(r)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="Todavía no hay gastos registrados." />
        )}
      </div>
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Editar gasto" : "Registrar gasto"}
      >
        <form onSubmit={submit}>
          <Notice>{error}</Notice>
          <div className="form-grid">
            <Field label="Fecha" required>
              <input
                className="control"
                type="date"
                required
                value={form.expense_date}
                onChange={(e) =>
                  setForm({ ...form, expense_date: e.target.value })
                }
              />
            </Field>
            <Field label="Categoría" required>
              <select
                className="control"
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option>Operación</option>
                <option>Servicios</option>
                <option>Renta</option>
                <option>Nómina</option>
                <option>Transporte</option>
                <option>Publicidad</option>
                <option>Otros</option>
              </select>
            </Field>
            <Field label="Concepto" required>
              <input
                className="control"
                required
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <Field label="Importe ($ MXN)" required>
              <input
                className="control"
                type="number"
                required
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Field>
          </div>
          <div className="form-footer">
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => setModal(false)}
            >
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar gasto"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
