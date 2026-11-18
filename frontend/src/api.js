const BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body == null ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor. Verifica que FastAPI esté iniciado.",
    );
  }
  if (!response.ok) {
    let detail = "No se pudo completar la solicitud";
    try {
      const result = await response.json();
      detail = typeof result.detail === "string" ? result.detail : detail;
    } catch {
      /* respuesta sin JSON */
    }
    throw new Error(detail);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const apiGet = (path) => api(path);
export const apiPost = (path, body) => api(path, { method: "POST", body });
export const apiPut = (path, body) => api(path, { method: "PUT", body });
export const apiDelete = (path) => api(path, { method: "DELETE" });
export const apiPatch = (path, body = {}) =>
  api(path, { method: "PATCH", body });

export const money = (value) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
export const number = (value) =>
  new Intl.NumberFormat("es-MX").format(Number(value || 0));
export const shortDate = (s) =>
  s
    ? new Date(`${s}T12:00:00`).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function monthDates() {
  const now = new Date();
  return {
    start: localDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: localDate(now),
  };
}
export const params = (values) =>
  new URLSearchParams(
    Object.entries(values).filter(([, value]) => value !== "" && value != null),
  ).toString();
