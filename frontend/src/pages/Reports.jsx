import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Filter,
  FileBarChart2,
  ChartNoAxesColumn,
} from "lucide-react";
import { apiGet, monthDates, money, params, shortDate } from "../api";
import { Empty, Loading, Notice, Status } from "../components/UI";

function exportCSV(rows) {
  const headers = [
    "Folio",
    "Fecha",
    "Vendedor",
    "Cliente",
    "Total",
    "Costo",
    "Utilidad bruta",
    "Estatus",
  ];
  const quote = (value) => {
    let s = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  const csv =
    "\ufeff" +
    [
      headers,
      ...rows.map((r) => [
        r.id,
        r.date,
        r.seller,
        r.customer,
        r.total,
        r.cost_total,
        r.gross_profit,
        r.status,
      ]),
    ]
      .map((row) => row.map(quote).join(","))
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "reporte-ventas.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function Reports() {
  const [filters, setFilters] = useState({ ...monthDates(), seller_id: "" });
  const [applied, setApplied] = useState(filters);
  const [sellers, setSellers] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiGet("/sellers?include_inactive=true")
      .then(setSellers)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!applied.start || !applied.end) return;
    let active = true;
    setLoading(true);
    setError("");
    apiGet(`/reports/sales?${params(applied)}`)
      .then((result) => {
        if (active) setRows(result);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applied.start, applied.end, applied.seller_id]);
  const completed = useMemo(
    () => rows.filter((r) => r.status === "completed"),
    [rows],
  );
  const total = completed.reduce((s, r) => s + Number(r.total), 0);
  const profit = completed.reduce((s, r) => s + Number(r.gross_profit), 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ANÁLISIS Y REPORTERÍA</div>
          <h1>Reportes</h1>
          <p>
            Consulta tus ventas por fecha y vendedor; exporta los resultados a
            CSV.
          </p>
        </div>
        <button
          className="btn btn-outline"
          disabled={!rows.length || loading}
          onClick={() => exportCSV(rows)}
        >
          <Download size={17} />
          Exportar CSV
        </button>
      </div>
      <Notice>{error}</Notice>
      <div className="panel report-filter">
        <div className="filter-title">
          <Filter size={19} />
          <strong>Filtros de consulta</strong>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setApplied({ ...filters });
          }}
          className="filters-row"
        >
          <label>
            Desde
            <input
              type="date"
              className="control"
              required
              max={filters.end}
              value={filters.start}
              onChange={(e) =>
                setFilters({ ...filters, start: e.target.value })
              }
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              className="control"
              required
              min={filters.start}
              value={filters.end}
              onChange={(e) => setFilters({ ...filters, end: e.target.value })}
            />
          </label>
          <label>
            Vendedor
            <select
              className="control"
              value={filters.seller_id}
              onChange={(e) =>
                setFilters({ ...filters, seller_id: e.target.value })
              }
            >
              <option value="">Todos los vendedores</option>
              {sellers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {!r.active ? " (inactivo)" : ""}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" type="submit">
            Aplicar filtros
          </button>
        </form>
      </div>
      <div className="report-stats">
        <div className="report-stat">
          <span>Ventas completadas</span>
          <strong>{completed.length}</strong>
        </div>
        <div className="report-stat">
          <span>Total vendido</span>
          <strong>{money(total)}</strong>
        </div>
        <div className="report-stat">
          <span>Utilidad bruta</span>
          <strong>{money(profit)}</strong>
        </div>
      </div>
      <div className="panel table-panel">
        <div className="table-toolbar">
          <div>
            <h3>Detalle de ventas</h3>
            <p>Hasta 2,000 operaciones por consulta</p>
          </div>
          <FileBarChart2 size={21} className="muted-icon" />
        </div>
        {loading ? (
          <Loading />
        ) : rows.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>FOLIO</th>
                  <th>FECHA</th>
                  <th>CLIENTE</th>
                  <th>VENDEDOR</th>
                  <th>TOTAL</th>
                  <th>COSTO</th>
                  <th>UTILIDAD BRUTA</th>
                  <th>ESTATUS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>#{String(r.id).padStart(5, "0")}</strong>
                    </td>
                    <td>{shortDate(r.date)}</td>
                    <td>{r.customer}</td>
                    <td>{r.seller}</td>
                    <td>
                      <strong>{money(r.total)}</strong>
                    </td>
                    <td>{money(r.cost_total)}</td>
                    <td>{money(r.gross_profit)}</td>
                    <td>
                      <Status
                        active={r.status === "completed"}
                        activeLabel="Completada"
                        inactiveLabel="Anulada"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No hay ventas en el periodo consultado." />
        )}
      </div>
      <p className="report-note">
        * La utilidad bruta excluye gastos operativos. La utilidad neta estimada
        del negocio se consulta en el Dashboard. Las ventas anuladas no se
        incluyen en los totales.
      </p>
    </>
  );
}
