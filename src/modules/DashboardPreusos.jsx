import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase.js";

// Ubicación: src/modules/DashboardPreusos.jsx
const FUENTE = "Auditoría Pre-usos";
const GRUPOS = [
  { nombre: "Calidad de llenado del formato", campo: "cumplimiento_formato" },
  { nombre: "Entrevista a colaboradores", campo: "cumplimiento_entrevista" },
];
const tarjeta = {
  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16,
};
const celda = {
  padding: 10, borderBottom: "1px solid #e2e8f0", textAlign: "left", verticalAlign: "top",
};
const porcentaje = (v) => v == null || !Number.isFinite(Number(v))
  ? "—" : `${Number(v).toFixed(1)}%`;
const respuestasDe = (a) => Array.isArray(a.respuestas) ? a.respuestas : [];
const esNC = (r) => String(r.respuesta || "").toUpperCase() === "NO";
const contarNC = (a) => respuestasDe(a).filter(esNC).length;
function promedio(registros, campo) {
  const valores = registros.map((r) => r[campo]).filter((v) => v != null && Number.isFinite(Number(v)));
  return valores.length ? valores.reduce((s, v) => s + Number(v), 0) / valores.length : null;
}

export default function DashboardPreusos({ fechaInicio, fechaFin }) {
  const [auditorias, setAuditorias] = useState([]);
  const [acciones, setAcciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [detalle, setDetalle] = useState(null);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const [resultadoAuditorias, resultadoAcciones] = await Promise.all([
        supabase.from("auditorias_preusos").select("*")
          .order("fecha_auditoria", { ascending: false }).limit(1000),
        supabase.from("plan_accion").select("id, origen, hallazgo, estado")
          .eq("origen", FUENTE).limit(5000),
      ]);
      if (resultadoAuditorias.error) throw resultadoAuditorias.error;
      if (resultadoAcciones.error) throw resultadoAcciones.error;
      setAuditorias(resultadoAuditorias.data || []);
      setAcciones(resultadoAcciones.data || []);
    } catch (err) {
      console.error("Error al cargar Dashboard Pre-usos:", err);
      setError(err?.message || "No se pudieron consultar las auditorías de Pre-usos.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  const filtradas = useMemo(() => auditorias.filter((a) =>
    (!fechaInicio || a.fecha_auditoria >= fechaInicio) &&
    (!fechaFin || a.fecha_auditoria <= fechaFin)
  ), [auditorias, fechaInicio, fechaFin]);

  const accionesPeriodo = useMemo(() => {
    const ids = new Set(filtradas.map((a) => String(a.id)));
    return acciones.filter((a) => {
      const match = String(a.hallazgo || "").match(/^PREUSO \[([^\]]+)\]/);
      return match && ids.has(match[1]);
    });
  }, [acciones, filtradas]);

  const indicadores = useMemo(() => ({
    total: filtradas.length,
    cumplimiento: promedio(filtradas, "cumplimiento_global"),
    noConformes: filtradas.reduce((s, a) => s + contarNC(a), 0),
    maquinas: new Set(filtradas.map((a) => a.maquina).filter(Boolean)).size,
    pendientes: accionesPeriodo.filter((a) => a.estado !== "Terminada").length,
  }), [filtradas, accionesPeriodo]);

  const porMaquina = useMemo(() => {
    const mapa = new Map();
    filtradas.forEach((a) => {
      const nombre = a.maquina || "Sin identificar";
      if (!mapa.has(nombre)) mapa.set(nombre, []);
      mapa.get(nombre).push(a);
    });
    return [...mapa.entries()].map(([maquina, registros]) => ({
      maquina,
      auditorias: registros.length,
      cumplimiento: promedio(registros, "cumplimiento_global"),
      noConformes: registros.reduce((s, a) => s + contarNC(a), 0),
    })).sort((a, b) => a.maquina.localeCompare(b.maquina, "es"));
  }, [filtradas]);

  const criteriosNC = useMemo(() => {
    const conteos = new Map();
    filtradas.flatMap(respuestasDe).filter(esNC).forEach((r) => {
      const id = String(r.id || "Sin código");
      const previo = conteos.get(id) || { id, pregunta: r.pregunta || "", cantidad: 0 };
      conteos.set(id, { ...previo, cantidad: previo.cantidad + 1 });
    });
    return [...conteos.values()].sort((a, b) => b.cantidad - a.cantidad || a.id.localeCompare(b.id));
  }, [filtradas]);

  const kpis = [
    ["Auditorías realizadas", indicadores.total],
    ["Cumplimiento global", porcentaje(indicadores.cumplimiento)],
    ["No conformidades", indicadores.noConformes],
    ["Máquinas auditadas", indicadores.maquinas],
    ["Acciones pendientes", indicadores.pendientes],
  ];

  return (
    <section className="section-block" style={{ marginTop: 18, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <span className="eyebrow">Auditorías</span>
          <h3 style={{ margin: "5px 0" }}>Auditoría de Pre-usos</h3>
          <p style={{ margin: 0, color: "#64748b" }}>Revisión de formatos y entrevistas a colaboradores · Transmetal</p>
        </div>
        <button type="button" className="secondary-button" onClick={cargar} disabled={cargando}>
          <RefreshCw size={16} /> {cargando ? "Actualizando..." : "Actualizar Pre-usos"}
        </button>
      </div>

      {error && <p role="alert" style={{ color: "#b91c1c", marginTop: 14 }}>Error al consultar Pre-usos: {error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 20 }}>
        {kpis.map(([nombre, valor]) => (
          <div key={nombre} style={tarjeta}>
            <div style={{ color: "#64748b", fontSize: 13 }}>{nombre}</div>
            <strong style={{ display: "block", fontSize: 25, marginTop: 6 }}>{cargando ? "—" : valor}</strong>
          </div>
        ))}
      </div>

      <div style={{ ...tarjeta, marginTop: 14 }}>
        <h4 style={{ marginTop: 0 }}>Cumplimiento por sección</h4>
        {GRUPOS.map((grupo) => {
          const valor = promedio(filtradas, grupo.campo);
          return (
            <div key={grupo.campo} style={{ marginBottom: 15 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                <strong>{grupo.nombre}</strong><strong>{porcentaje(valor)}</strong>
              </div>
              <div style={{ height: 9, background: "#e2e8f0", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, Math.max(0, valor || 0))}%`, height: "100%", background: "#2563eb" }} />
              </div>
            </div>
          );
        })}
        <small style={{ color: "#64748b" }}>Los criterios No aplica se excluyen del cumplimiento. Los grupos sin criterios evaluables muestran —.</small>
      </div>

      <div style={{ ...tarjeta, marginTop: 14, overflowX: "auto" }}>
        <h4 style={{ marginTop: 0 }}>Resultados por máquina</h4>
        <table style={{ width: "100%", minWidth: 580, borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Máquina", "Auditorías", "Cumplimiento promedio", "No conformidades"].map((t) => <th key={t} style={celda}>{t}</th>)}</tr></thead>
          <tbody>
            {porMaquina.map((m) => <tr key={m.maquina}>
              <td style={celda}><strong>{m.maquina}</strong></td>
              <td style={celda}>{m.auditorias}</td>
              <td style={celda}>{porcentaje(m.cumplimiento)}</td>
              <td style={celda}>{m.noConformes}</td>
            </tr>)}
            {!porMaquina.length && <tr><td colSpan={4} style={{ ...celda, textAlign: "center" }}>No hay máquinas auditadas en el período seleccionado.</td></tr>}
          </tbody>
        </table>
      </div>

      {criteriosNC.length > 0 && <div style={{ ...tarjeta, marginTop: 14 }}>
        <h4 style={{ marginTop: 0 }}>Criterios con más incumplimientos</h4>
        {criteriosNC.map((r) => <div key={r.id} style={{ padding: "8px 0", borderBottom: "1px solid #eef2f6", fontSize: 13 }}>
          <strong>{r.id} · {r.cantidad} NC</strong> — {r.pregunta}
        </div>)}
      </div>}

      <div style={{ ...tarjeta, marginTop: 14, overflowX: "auto" }}>
        <h4 style={{ marginTop: 0 }}>Historial de auditorías Pre-usos</h4>
        <table style={{ width: "100%", minWidth: 740, borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Fecha", "Auditor", "Máquina", "Cumplimiento", "NC", "Detalle"].map((t) => <th key={t} style={celda}>{t}</th>)}</tr></thead>
          <tbody>
            {filtradas.map((a) => <React.Fragment key={a.id}>
              <tr>
                <td style={celda}>{a.fecha_auditoria}</td>
                <td style={celda}>{a.auditor}</td>
                <td style={celda}>{a.maquina}</td>
                <td style={celda}>{porcentaje(a.cumplimiento_global)}</td>
                <td style={celda}>{contarNC(a)}</td>
                <td style={celda}>
                  <button type="button" onClick={() => setDetalle((actual) => actual === a.id ? null : a.id)}
                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {detalle === a.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Ver
                  </button>
                </td>
              </tr>
              {detalle === a.id && <tr><td colSpan={6} style={{ padding: 14, background: "#f8fafc" }}>
                <p><strong>Sección/Taller:</strong> {a.seccion_taller || "—"}</p>
                <p><strong>Pre-usos revisados:</strong> {a.detalle_preusos || "—"}</p>
                <p><strong>Cumplimiento formato:</strong> {porcentaje(a.cumplimiento_formato)}</p>
                <p><strong>Cumplimiento entrevista:</strong> {porcentaje(a.cumplimiento_entrevista)}</p>
                {respuestasDe(a).map((r, i) => <div key={r.id || i} style={{ borderTop: "1px solid #e2e8f0", padding: "9px 0" }}>
                  <strong>{r.id} · {r.respuesta === "SI" ? "Conforme" : r.respuesta === "NO" ? "No conforme" : "No aplica"}</strong> — {r.pregunta}
                  {r.observacion && <div style={{ color: "#475569", marginTop: 3 }}>Comentario: {r.observacion}</div>}
                </div>)}
              </td></tr>}
            </React.Fragment>)}
            {!filtradas.length && <tr><td colSpan={6} style={{ ...celda, textAlign: "center" }}>{cargando ? "Cargando auditorías..." : "No hay auditorías de Pre-usos en este período."}</td></tr>}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: "#64748b", marginTop: 12 }}>
        Cumplimiento global: promedio de auditorías con criterios evaluables. Acciones pendientes: hallazgos vinculados a auditorías del período que no están terminados. Hasta 1,000 auditorías y 5,000 acciones por carga.
      </p>
    </section>
  );
}
