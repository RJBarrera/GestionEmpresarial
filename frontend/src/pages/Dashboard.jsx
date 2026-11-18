import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  Package,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Users,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiGet, money, number, monthDates, params } from "../api";
import { Empty, Loading, Notice } from "../components/UI";

const stats = [
  {
    key: "revenue",
    label: "Ingresos por ventas",
    icon: CircleDollarSign,
    tone: "blue",
    sub: "Ventas completadas",
  },
  {
    key: "cost_of_goods",
    label: "Costo de productos vendidos",
    icon: Package,
    tone: "amber",
    sub: "Costo histórico de venta",
  },
  {
    key: "expenses",
    label: "Gastos operativos",
    icon: ReceiptText,
    tone: "rose",
    sub: "Gastos registrados",
  },
  {
    key: "net_profit",
    label: "Utilidad neta estimada",
    icon: TrendingUp,
    tone: "green",
    sub: "Ingresos − costos − gastos",
  },
];

export default function Dashboard() {
  const [dates, setDates] = useState(monthDates);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!dates.start || !dates.end) return;
    let active = true;
    setLoading(true);
    setError("");
    apiGet(`/dashboard/summary?${params(dates)}`)
      .then((v) => {
        if (active) setData(v);
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
  }, [dates.start, dates.end]);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">RESUMEN DEL NEGOCIO</div>
          <h1>Pantalla Principal</h1>
          <p>Monitorea las operaciones y el desempeño de tu empresa.</p>
        </div>
        <div className="date-filter">
          <span>Periodo</span>
          <input
            type="date"
            value={dates.start}
            max={dates.end}
            onChange={(e) => setDates({ ...dates, start: e.target.value })}
          />
          <span className="date-separator">a</span>
          <input
            type="date"
            value={dates.end}
            min={dates.start}
            onChange={(e) => setDates({ ...dates, end: e.target.value })}
          />
        </div>
      </div>
      <Notice>{error}</Notice>
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="welcome-banner">
              <div>
                <span className="banner-kicker">VISTA GENERAL</span>
                <h2>Tu negocio, en un solo lugar.</h2>
                <p>
                  Gestiona tu negocio con información clave y control total de cada operación.
                </p>
                <Link to="/reportes" className="banner-link">
                  Explorar reportes <ArrowRight size={17} />
                </Link>
              </div>
              <div className="banner-decoration">
                <div className="banner-circle banner-circle-one" />
                <div className="banner-circle banner-circle-two" />
                <ChartNoAxesCombined size={105} strokeWidth={1.15} />
              </div>
            </div>
            <div className="stats-grid">
              {stats.map(({ key, label, sub, icon: Icon, tone }) => (
                <div className="stat-card" key={key}>
                  <div className="stat-card-header">
                    <span>{label}</span>
                    <div className={`stat-icon tone-${tone}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <strong className="stat-value">{money(data[key])}</strong>
                  <div className="stat-footer">
                    <span>{sub}</span>
                    {key === "net_profit" &&
                      (Number(data.net_profit) >= 0 ? (
                        <ArrowUpRight size={16} className="text-green" />
                      ) : (
                        <ArrowDownRight size={16} className="text-red" />
                      ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="dashboard-grid">
              <section className="panel chart-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Resumen de ventas</h3>
                    <p>Ingresos diarios durante el periodo seleccionado</p>
                  </div>
                  <div className="legend">
                    <span className="legend-dot" />
                    Ventas
                  </div>
                </div>
                <div className="chart-container">
                  {data.chart.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={data.chart}
                        margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="salesGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#5267e9"
                              stopOpacity={0.22}
                            />
                            <stop
                              offset="98%"
                              stopColor="#5267e9"
                              stopOpacity={0.01}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          vertical={false}
                          stroke="#ecf0f7"
                          strokeDasharray="4 4"
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => v.slice(5)}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#8993a6", fontSize: 11 }}
                          minTickGap={28}
                        />
                        <YAxis
                          tickFormatter={(v) => `$${number(v)}`}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#8993a6", fontSize: 11 }}
                          width={78}
                        />
                        <Tooltip
                          formatter={(v) => [money(v), "Ventas"]}
                          labelFormatter={(v) => v}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e7ebf3",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="sales"
                          stroke="#5267e9"
                          strokeWidth={3}
                          fill="url(#salesGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Empty small text="Sin ventas en este periodo" />
                  )}
                </div>
              </section>
              <section className="panel ranking-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Mejores vendedores</h3>
                    <p>Por monto de ventas completadas</p>
                  </div>
                  <Link className="subtle-link" to="/vendedores">
                    Ver todos <ArrowRight size={15} />
                  </Link>
                </div>
                <div className="seller-ranking">
                  {!data.top_sellers.length ? (
                    <Empty small text="Aún no se han registrado ventas" />
                  ) : (
                    data.top_sellers.slice(0, 5).map((seller, index) => (
                      <div className="ranking-row" key={seller.id}>
                        <span className="rank-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="avatar avatar-small">
                          {seller.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ranking-info">
                          <strong>{seller.name}</strong>
                          <small>{number(seller.sales_count)} ventas</small>
                        </div>
                        <strong className="ranking-total">
                          {money(seller.revenue)}
                        </strong>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
            <div className="dashboard-grid dashboard-grid-bottom">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>Indicadores operativos</h3>
                    <p>Registros activos y ventas</p>
                  </div>
                </div>
                <div className="mini-stats">
                  <div>
                    <ShoppingCart size={19} />
                    <strong>{number(data.sale_count)}</strong>
                    <span>Ventas realizadas</span>
                  </div>
                  <div>
                    <Package size={19} />
                    <strong>{number(data.active_products)}</strong>
                    <span>Productos activos</span>
                  </div>
                  <div>
                    <Users size={19} />
                    <strong>{number(data.active_customers)}</strong>
                    <span>Clientes activos</span>
                  </div>
                </div>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>Alertas de inventario</h3>
                    <p>Productos con stock bajo o agotado</p>
                  </div>
                  <Link className="subtle-link" to="/inventario">
                    Inventario <ArrowRight size={15} />
                  </Link>
                </div>
                {!data.low_stock.length ? (
                  <div className="all-good">
                    <span>✓</span> Tu inventario no tiene alertas.
                  </div>
                ) : (
                  <div className="alerts-list">
                    {data.low_stock.slice(0, 4).map((p) => (
                      <div className="alert-row" key={p.id}>
                        <div className="alert-icon">
                          <AlertTriangle size={17} />
                        </div>
                        <div>
                          <strong>{p.name}</strong>
                          <small>{p.sku}</small>
                        </div>
                        <span className="stock-low">{p.stock} disponibles</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )
      )}
    </>
  );
}
