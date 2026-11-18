import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Edit3,
  Plus,
  Search,
  Trash2,
  RotateCcw,
  Package,
  Users,
  UserRoundCheck,
} from "lucide-react";
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiPatch,
  money,
  number,
} from "../api";
import { Modal, Empty, Loading, Notice, Field, Status } from "../components/UI";

const configs = {
  products: {
    endpoint: "/products",
    title: "Inventario",
    subtitle: "Administra tus productos, precios y existencias.",
    singular: "producto",
    icon: Package,
    fields: [
      { key: "sku", label: "Código / SKU", required: true },
      { key: "name", label: "Nombre del producto", required: true, wide: true },
      { key: "category", label: "Categoría", initial: "General" },
      {
        key: "cost_price",
        label: "Precio de costo ($)",
        type: "number",
        step: "0.01",
        initial: 0,
        min: 0,
      },
      {
        key: "sale_price",
        label: "Precio de venta ($)",
        type: "number",
        step: "0.01",
        required: true,
        initial: 0,
        min: 0,
      },
      {
        key: "stock",
        label: "Existencias",
        type: "number",
        initial: 0,
        min: 0,
        step: 1,
      },
      {
        key: "min_stock",
        label: "Stock mínimo",
        type: "number",
        initial: 5,
        min: 0,
        step: 1,
      },
    ],
    columns: [
      {
        label: "PRODUCTO",
        render: (r) => (
          <div className="primary-cell">
            <div className="product-icon">
              <Package size={18} />
            </div>
            <div>
              <strong>{r.name}</strong>
              <small>SKU: {r.sku}</small>
            </div>
          </div>
        ),
      },
      { label: "CATEGORÍA", render: (r) => r.category },
      { label: "COSTO", render: (r) => money(r.cost_price) },
      {
        label: "PRECIO DE VENTA",
        render: (r) => <strong>{money(r.sale_price)}</strong>,
      },
      {
        label: "EXISTENCIAS",
        render: (r) => (
          <span
            className={`stock-badge ${r.stock <= r.min_stock ? "stock-warning" : "stock-ok"}`}
          >
            {number(r.stock)} unidades
          </span>
        ),
      },
      { label: "ESTATUS", render: (r) => <Status active={r.active} /> },
    ],
  },
  customers: {
    endpoint: "/customers",
    title: "Clientes",
    subtitle:
      "Organiza la información y el historial comercial de tus clientes.",
    singular: "cliente",
    icon: Users,
    fields: [
      {
        key: "name",
        label: "Nombre completo / Razón social",
        required: true,
        wide: true,
      },
      { key: "email", label: "Correo electrónico", type: "email" },
      { key: "phone", label: "Teléfono", type: "tel" },
      { key: "notes", label: "Notas", wide: true, type: "textarea" },
    ],
    columns: [
      {
        label: "CLIENTE",
        render: (r) => (
          <div className="primary-cell">
            <div className="avatar">{r.name.charAt(0).toUpperCase()}</div>
            <strong>{r.name}</strong>
          </div>
        ),
      },
      { label: "CORREO", render: (r) => r.email || "—" },
      { label: "TELÉFONO", render: (r) => r.phone || "—" },
      { label: "ESTATUS", render: (r) => <Status active={r.active} /> },
    ],
  },
  sellers: {
    endpoint: "/sellers",
    title: "Vendedores",
    subtitle: "Registra a tu equipo comercial y consulta sus resultados.",
    singular: "vendedor",
    icon: UserRoundCheck,
    fields: [
      { key: "name", label: "Nombre completo", required: true, wide: true },
      { key: "email", label: "Correo electrónico", type: "email" },
      { key: "phone", label: "Teléfono", type: "tel" },
    ],
    columns: [
      {
        label: "VENDEDOR",
        render: (r) => (
          <div className="primary-cell">
            <div className="avatar">{r.name.charAt(0).toUpperCase()}</div>
            <strong>{r.name}</strong>
          </div>
        ),
      },
      { label: "CORREO", render: (r) => r.email || "—" },
      { label: "TELÉFONO", render: (r) => r.phone || "—" },
      { label: "ESTATUS", render: (r) => <Status active={r.active} /> },
    ],
  },
};

export default function Catalog({ kind }) {
  const config = configs[kind];
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(
        await apiGet(
          `${config.endpoint}${showInactive ? "?include_inactive=true" : ""}`,
        ),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, showInactive]);
  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        Object.values(r).some((v) =>
          String(v ?? "")
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
      ),
    [rows, search],
  );
  const openForm = (row = null) => {
    setEditing(row);
    setForm(
      Object.fromEntries(
        config.fields.map((f) => [
          f.key,
          row ? (row[f.key] ?? "") : (f.initial ?? ""),
        ]),
      ),
    );
    setModal(true);
    setError("");
    setSuccess("");
  };
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) await apiPut(`${config.endpoint}/${editing.id}`, form);
      else await apiPost(config.endpoint, form);
      setModal(false);
      setEditing(null);
      setSuccess(
        `Se ${editing ? "actualizó" : "registró"} el ${config.singular} correctamente.`,
      );
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  const restore = async (row) => {
    try {
      await apiPatch(`${config.endpoint}/${row.id}/restore`);
      setSuccess("Registro reactivado.");
      await load();
    } catch (e) {
      setError(e.message);
    }
  };
  const remove = async (row) => {
    if (
      !window.confirm(
        `¿Desactivar ${row.name}? Dejará de estar disponible en nuevos registros, pero se conservará su historial.`,
      )
    )
      return;
    try {
      await apiDelete(`${config.endpoint}/${row.id}`);
      setSuccess("Registro desactivado.");
      await load();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ADMINISTRACIÓN / CATÁLOGOS</div>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()}>
          <Plus size={18} />
          Agregar {config.singular}
        </button>
      </div>
      <Notice onClose={() => setError("")}>{error}</Notice>
      <Notice type="success" onClose={() => setSuccess("")}>
        {success}
      </Notice>
      <div className="panel table-panel">
        <div className="table-toolbar">
          <div>
            <h3>Listado de {config.title.toLowerCase()}</h3>
            <p>
              {number(rows.length)} registros{" "}
              {showInactive ? "incluyendo inactivos" : "activos"}
            </p>
          </div>
          <div className="search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar ${config.singular}...`}
            />
          </div>
          <label className="show-inactive">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Mostrar inactivos
          </label>
        </div>
        {loading ? (
          <Loading />
        ) : filtered.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {config.columns.map((c) => (
                    <th key={c.label}>{c.label}</th>
                  ))}
                  <th className="actions-heading">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    {config.columns.map((c) => (
                      <td key={c.label}>{c.render(row)}</td>
                    ))}
                    <td>
                      <div className="row-actions">
                        {row.active ? (
                          <>
                            <button
                              className="icon-button"
                              title="Editar"
                              aria-label={`Editar ${row.name}`}
                              onClick={() => openForm(row)}
                            >
                              <Edit3 size={17} />
                            </button>
                            <button
                              className="icon-button icon-danger"
                              title="Desactivar"
                              aria-label={`Desactivar ${row.name}`}
                              onClick={() => remove(row)}
                            >
                              <Trash2 size={17} />
                            </button>
                          </>
                        ) : (
                          <button
                            className="icon-button"
                            title="Reactivar"
                            aria-label={`Reactivar ${row.name}`}
                            onClick={() => restore(row)}
                          >
                            <RotateCcw size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            text={
              search
                ? "No se encontraron coincidencias."
                : `Agrega tu primer ${config.singular} para comenzar.`
            }
          />
        )}
      </div>
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={`${editing ? "Editar" : "Agregar"} ${config.singular}`}
      >
        <form onSubmit={submit}>
          <Notice>{error}</Notice>
          <div className="form-grid">
            {config.fields.map((field) => (
              <div key={field.key} className={field.wide ? "field-wide" : ""}>
                <Field label={field.label} required={field.required}>
                  {field.type === "textarea" ? (
                    <textarea
                      className="control"
                      rows="3"
                      value={form[field.key] ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, [field.key]: e.target.value })
                      }
                    />
                  ) : (
                    <input
                      className="control"
                      type={field.type || "text"}
                      step={field.step}
                      min={field.min}
                      required={field.required}
                      value={form[field.key] ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, [field.key]: e.target.value })
                      }
                    />
                  )}
                </Field>
              </div>
            ))}
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
              {saving
                ? "Guardando..."
                : editing
                  ? "Guardar cambios"
                  : "Registrar"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
