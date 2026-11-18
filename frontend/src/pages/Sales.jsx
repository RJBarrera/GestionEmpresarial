import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  ShoppingCart,
  X,
  Ban,
  Receipt,
  Package,
} from "lucide-react";
import { apiGet, apiPost, money, number, shortDate, localDate } from "../api";
import { Modal, Empty, Loading, Notice, Field, Status } from "../components/UI";

const emptyItem = () => ({ product_id: "", quantity: 1, unit_price: "" });
const initialForm = () => ({
  sale_date: localDate(),
  customer_id: "",
  seller_id: "",
  notes: "",
  items: [emptyItem()],
});

export default function Sales() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, p, c, v] = await Promise.all([
        apiGet("/sales"),
        apiGet("/products"),
        apiGet("/customers"),
        apiGet("/sellers"),
      ]);
      setRows(s);
      setProducts(p);
      setCustomers(c);
      setSellers(v);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setForm(initialForm());
      setModal(true);
    }
  }, [searchParams]);
  const closeModal = () => {
    setModal(false);
    if (searchParams.get("new") === "1") navigate("/ventas", { replace: true });
  };
  const addNew = () => {
    setForm(initialForm());
    setModal(true);
    setError("");
    setSuccess("");
  };
  const updateItem = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item;
        if (key === "product_id") {
          const product = products.find((p) => p.id === Number(value));
          return {
            ...item,
            product_id: value,
            unit_price: product ? String(product.sale_price) : "",
          };
        }
        return { ...item, [key]: value };
      }),
    }));
  };
  const saleTotal = useMemo(
    () =>
      form.items.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
        0,
      ),
    [form.items],
  );
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (!form.items.every((i) => i.product_id && Number(i.quantity) > 0))
        throw new Error("Selecciona productos y cantidades válidas.");
      await apiPost("/sales", {
        ...form,
        customer_id: Number(form.customer_id),
        seller_id: Number(form.seller_id),
        items: form.items.map((i) => ({
          product_id: Number(i.product_id),
          quantity: Number(i.quantity),
          unit_price: i.unit_price === "" ? null : Number(i.unit_price),
        })),
      });
      closeModal();
      setSuccess("Venta registrada. Se actualizaron las existencias.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  const cancelSale = async (sale) => {
    if (
      !window.confirm(
        `¿Anular la venta #${sale.id}? Se devolverán las unidades al inventario y ya no contará en los resultados.`,
      )
    )
      return;
    try {
      await apiPost(`/sales/${sale.id}/cancel`, {});
      setSuccess("Venta anulada y existencias restauradas.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };
  const filtered = rows.filter((r) =>
    [r.id, r.customer_name, r.seller_name, r.sale_date].some((v) =>
      String(v).toLowerCase().includes(search.toLowerCase()),
    ),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">OPERACIONES COMERCIALES</div>
          <h1>Ventas</h1>
          <p>
            Registra operaciones y controla automáticamente las existencias.
          </p>
        </div>
        <button className="btn btn-primary" onClick={addNew}>
          <Plus size={18} />
          Nueva venta
        </button>
      </div>
      <Notice onClose={() => setError("")}>{error}</Notice>
      <Notice type="success" onClose={() => setSuccess("")}>
        {success}
      </Notice>
      <div className="panel table-panel">
        <div className="table-toolbar">
          <div>
            <h3>Historial de ventas</h3>
            <p>{number(rows.length)} operaciones registradas</p>
          </div>
          <div className="search-box">
            <Search size={18} />
            <input
              placeholder="Buscar venta, cliente o vendedor..."
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
                  <th>FOLIO</th>
                  <th>FECHA</th>
                  <th>CLIENTE</th>
                  <th>VENDEDOR</th>
                  <th>PRODUCTOS</th>
                  <th>TOTAL</th>
                  <th>ESTATUS</th>
                  <th className="actions-heading">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>#{String(r.id).padStart(5, "0")}</strong>
                    </td>
                    <td>{shortDate(r.sale_date)}</td>
                    <td>{r.customer_name}</td>
                    <td>{r.seller_name}</td>
                    <td>
                      {r.items
                        .map((i) => `${i.product_name} × ${i.quantity}`)
                        .join(", ")}
                    </td>
                    <td>
                      <strong>{money(r.total)}</strong>
                    </td>
                    <td>
                      <Status
                        active={r.status === "completed"}
                        activeLabel="Completada"
                        inactiveLabel="Anulada"
                      />
                    </td>
                    <td>
                      {r.status === "completed" && (
                        <button
                          className="icon-button icon-danger"
                          onClick={() => cancelSale(r)}
                          title="Anular venta"
                        >
                          <Ban size={17} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="Registra tu primera venta para comenzar a medir resultados." />
        )}
      </div>
      <Modal
        open={modal}
        title="Registrar nueva venta"
        width="810px"
        onClose={closeModal}
      >
        <form onSubmit={submit}>
          <Notice>{error}</Notice>
          <div className="form-grid three-columns">
            <Field label="Fecha de venta" required>
              <input
                className="control"
                type="date"
                required
                value={form.sale_date}
                onChange={(e) =>
                  setForm({ ...form, sale_date: e.target.value })
                }
              />
            </Field>
            <Field label="Cliente" required>
              <select
                className="control"
                required
                value={form.customer_id}
                onChange={(e) =>
                  setForm({ ...form, customer_id: e.target.value })
                }
              >
                <option value="">Seleccionar cliente</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Vendedor" required>
              <select
                className="control"
                required
                value={form.seller_id}
                onChange={(e) =>
                  setForm({ ...form, seller_id: e.target.value })
                }
              >
                <option value="">Seleccionar vendedor</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {(!products.length || !customers.length || !sellers.length) && (
            <Notice>
              Para registrar ventas necesitas al menos un producto, cliente y
              vendedor activos.
            </Notice>
          )}
          <div className="sale-items-header">
            <h3>Productos de la venta</h3>
            <button
              type="button"
              className="btn btn-outline btn-small"
              onClick={() =>
                setForm({ ...form, items: [...form.items, emptyItem()] })
              }
            >
              <Plus size={15} />
              Agregar producto
            </button>
          </div>
          <div className="sale-items">
            {form.items.map((item, i) => {
              const product = products.find(
                (p) => p.id === Number(item.product_id),
              );
              return (
                <div className="sale-item" key={i}>
                  <div className="sale-item-product">
                    <Field label="Producto" required>
                      <select
                        className="control"
                        value={item.product_id}
                        required
                        onChange={(e) =>
                          updateItem(i, "product_id", e.target.value)
                        }
                      >
                        <option value="">Seleccionar...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · stock {p.stock}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {product && (
                      <small className="stock-hint">
                        Disponibles: {product.stock}
                      </small>
                    )}
                  </div>
                  <Field label="Cantidad" required>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      className="control"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(i, "quantity", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Precio unitario" required>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      className="control"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItem(i, "unit_price", e.target.value)
                      }
                    />
                  </Field>
                  <div className="sale-item-remove">
                    <button
                      type="button"
                      className="icon-button icon-danger"
                      title="Quitar producto"
                      disabled={form.items.length === 1}
                      onClick={() =>
                        setForm({
                          ...form,
                          items: form.items.filter((_, idx) => idx !== i),
                        })
                      }
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="form-grid">
            <Field label="Notas de la venta (opcional)">
              <textarea
                className="control"
                rows="2"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
          <div className="sale-summary">
            <div>
              <span>Artículos</span>
              <strong>
                {number(
                  form.items.reduce((s, i) => s + Number(i.quantity || 0), 0),
                )}
              </strong>
            </div>
            <div className="sale-grand-total">
              <span>Total a registrar</span>
              <strong>{money(saleTotal)}</strong>
            </div>
          </div>
          <div className="form-footer">
            <button
              type="button"
              className="btn btn-quiet"
              onClick={closeModal}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              disabled={
                saving ||
                !products.length ||
                !customers.length ||
                !sellers.length
              }
            >
              {saving ? "Registrando..." : "Guardar venta"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
