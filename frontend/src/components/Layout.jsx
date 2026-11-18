import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  UserRoundCheck,
  ShoppingCart,
  ReceiptText,
  ChartNoAxesCombined,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  BriefcaseBusiness,
  CalendarDays,
  Plus,
} from "lucide-react";

const links = [
  { to: "/", name: "Dashboard", icon: LayoutDashboard },
  { to: "/inventario", name: "Inventario", icon: Package },
  { to: "/clientes", name: "Clientes", icon: Users },
  { to: "/vendedores", name: "Vendedores", icon: UserRoundCheck },
  { to: "/ventas", name: "Ventas", icon: ShoppingCart },
  { to: "/gastos", name: "Gastos", icon: ReceiptText },
  { to: "/reportes", name: "Reportes", icon: ChartNoAxesCombined },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const current = links.find((p) => p.to === location.pathname) || links[0];
  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <div className="app-shell">
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <BriefcaseBusiness size={22} />
          </div>
          <div>
            <strong>
              Gestión<span>Empresarial</span>
            </strong>
            <small>Panel de administración</small>
          </div>
        </div>
        <div className="sidebar-title">MENÚ PRINCIPAL</div>
        <nav className="sidebar-nav">
          {links.map(({ to, name, icon: Icon }) => (
            <NavLink
              key={to}
              end={to === "/"}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-active" : ""}`
              }
            >
              <Icon size={19} strokeWidth={1.9} />
              <span>{name}</span>
              {location.pathname === to && (
                <ChevronRight size={15} className="nav-arrow" />
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-badge">
            <div className="workspace-avatar">GE</div>
            <div>
              <strong>Mi empresa</strong>
              <small>Espacio de trabajo</small>
            </div>
          </div>
          <div className="sidebar-version">Versión inicial · v0.1</div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <PanelLeftOpen size={22} />
            </button>
            <div className="breadcrumb">
              Administración <ChevronRight size={15} />{" "}
              <strong>{current.name}</strong>
            </div>
          </div>
          <div className="topbar-right">
            <div className="today">
              <CalendarDays size={16} />
              <span>{today}</span>
            </div>
            <button
              className="btn btn-primary topbar-new"
              onClick={() => navigate("/ventas?new=1")}
            >
              <Plus size={17} />
              Nueva venta
            </button>
          </div>
        </header>
        <main className="page-content" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
