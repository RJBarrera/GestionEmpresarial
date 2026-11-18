import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Catalog from "./pages/Catalog";
import Sales from "./pages/Sales";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventario" element={<Catalog kind="products" />} />
          <Route path="clientes" element={<Catalog kind="customers" />} />
          <Route path="vendedores" element={<Catalog kind="sellers" />} />
          <Route path="ventas" element={<Sales />} />
          <Route path="gastos" element={<Expenses />} />
          <Route path="reportes" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
