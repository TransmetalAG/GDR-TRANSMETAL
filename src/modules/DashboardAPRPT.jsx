import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase.js";

// src/modules/DashboardAPRPT.jsx
const FUENTE = "Auditoría APR-PT";
const SECCIONES = [
  { id: "apr", titulo: "PUNTOS DE VERIFICACIÓN SOBRE CALIDAD DE LLENADO DE APR:", campo: "cumplimiento_apr" },
  { id: "ejecucion", titulo: "PUNTOS DE VERIFICACIÓN EN EJECUCIÓN (SI APLICA)", campo: "cumplimiento_ejecucion" },
  { id: "pt", titulo: "PUNTOS DE VERIFICACIÓN DE DATOS GENERALES DEL PERMISO DE TRABAJO PT", campo: "cumplimiento_pt" },
  { id: "alto_riesgo", titulo: "PUNTOS DE VERIFICACIÓN DE LAS MEDIDAS PREVENTIVAS EN LAS TAREAS DE ALTO RIESGO", campo: "cumplimiento_alto_riesgo" },
];
const tarjeta = { background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" };
const celda = { padding: "10px", borderBottom: "1px solid #e2e8f0", textAlign: "left", verticalAlign: "top" };
const porcentaje = (valor) => valor == null || !Number.isFinite(Number(valor)) ? "—" : `${Number(valor).toFixed(1)}%`;
const respuestasDe = (a) => Array.isArray(a.respuestas) ? a.respuestas : [];
const esNC = (r) => String(r.respuesta || "").toUpperCase() === "NO";
const contarNC = (a) => respuestasDe(a).filter(esNC).length;
const promedio = (registros, campo) => {
  const validos = registros.map((r) => r[campo]).filter((v) => v != null && Number.isFinite(Number(v))).map(Number);
  return validos.length ? validos.reduce((s, v) => s + v, 0) / validos.length : null;
};
const etiquetaRespuesta = (respuesta) => {
  const valor = String(respuesta || "").toUpperCase();
  if (valor === "SI") return "Conforme / Sí";
  if (valor === "NO") return "No conforme / No";
  return "No aplica";
};

export default function DashboardAPRPT({ fechaInicio, fechaFin }) {
  const [auditorias, setAuditorias] = useState([]);
  const [acciones, setAcciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [detalle, setDetalle] = useState(null);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const [consultaAuditorias, consultaAcciones] = await Promise.all([
        supabase.from("auditorias_apr_pt").select("*")
          .order("fecha_auditoria", { ascending: false }).limit(1000),
        supabase.from("plan_accion").select("id, hallazgo, estado")
          .eq("origen", FUENTE).limit(5000),
      ]);
      if (consultaAuditorias.error) throw consultaAuditorias.error;
      if (consultaAcciones.error) throw consultaAcciones.error;
      setAuditorias(consultaAuditorias.data || []);
      setAcciones(consultaAcciones.data || []);
    } catch (err) {
      console.error("Error al cargar Dashboard APR-PT:", err);
      setError(err?.message || "No se pudieron cargar las auditorías APR y PT.");
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
      const match = String(a.hallazgo || "").match(/^APR-PT \[([^\]]+)\]/);
      return match && ids.has(match[1]);
    });
  }, [filtradas, acciones]);

  const indicadores = useMemo(() => ({
    total: filtradas.length,
    cumplimiento: promedio(filtradas, "cumplimiento_global"),
    noConformes: filtradas.reduce((s, a) => s + contarNC(a), 0),
    talleres: new Set(filtradas.map((a) => a.seccion_taller).filter(Boolean)).size,
    conPT: filtradas.filter((a) => a.requiere_pt === true).length,
    pendientes: accionesPeriodo.filter((a) => a.estado !== "Terminada").length,
  }), [filtradas, accionesPeriodo]);

  const porSeccion = useMemo(() => {
    const agrupadas = new Map();
    filtradas.forEach((a) => {
      const seccion = a.seccion_taller || "Sin identificar";
      if (!agrupadas.has(seccion)) agrupadas.set(seccion, []);
      agrupadas.get(seccion).push(a);
    });
    return [...agrupadas].map(([nombre, registros]) => ({
      nombre,
      cantidad: registros.length,
      cumplimiento: promedio(registros, "cumplimiento_global"),
      noConformes: registros.reduce((s, a) => s + contarNC(a), 0),
    })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [filtradas]);

  const criteriosNC = useMemo(() => {
    const conteo = new Map();
    filtradas.flatMap(respuestasDe).filter(esNC).forEach((r) => {
      const id = String(r.id || "Sin código");
      const previo = conteo.get(id) || { id, pregunta: r.pregunta || "", cantidad: 0 };
      conteo.set(id, { ...previo, cantidad: previo.cantidad + 1 });
    });
    return [...conteo.values()].sort((a, b) => b.cantidad - a.cantidad || a.id.localeCompare(b.id));
  }, [filtradas]);

  const kpis = [
    ["Auditorías realizadas", indicadores.total],
    ["Cumplimiento global", porcentaje(indicadores.cumplimiento)],
    ["No conformidades", indicadores.noConformes],
    ["Secciones / talleres", indicadores.talleres],
    ["Auditorías con PT", indicadores.conPT],
    ["Acciones pendientes", indicadores.pendientes],
  ];

  return (
    <section className="section-block" style={{ marginTop: 18, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <span className="eyebrow">Auditorías</span>
          <h3 style={{ margin: "5px 0" }}>Auditorías APR y PT</h3>
          <p style={{ margin: 0, color: "#64748b" }}>Análisis Previo de Riesgos y Permiso de Trabajo · Transmetal</p>
        </div>
        <button type="button" className="secondary-button" onClick={cargar} disabled={cargando}>
          <RefreshCw size={16} /> {cargando ? "Actualizando..." : "Actualizar APR y PT"}
        </button>
      </div>

      {error && <p role="alert" style={{ color: "#b91c1c", marginTop: 14 }}>Error al consultar APR y PT: {error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 20 }}>
        {kpis.map(([nombre, valor]) => (
          <div key={nombre} style={tarjeta}>
            <div style={{ color: "#64748b", fontSize: 13 }}>{nombre}</div>
            <strong style={{ display: "block", fontSize: 25, marginTop: 6 }}>{cargando ? "—" : valor}</strong>
          </div>
        ))}
      </div>

      <div style={{ ...tarjeta, marginTop: 14 }}>
        <h4 style={{ marginTop: 0 }}>Cumplimiento por sección de la auditoría</h4>
        {SECCIONES.map((seccion) => {
          const valor = promedio(filtradas, seccion.campo);
          return <div key={seccion.id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{seccion.titulo}</span>
              <strong>{porcentaje(valor)}</strong>
            </div>
            <div style={{ height: 9, borderRadius: 6, background: "#e2e8f0", overflow: "hidden" }}>
              <div style={{ width: `${Math.max(0, Math.min(100, valor || 0))}%`, height: "100%", background: "#2563eb" }} />
            </div>
          </div>;
        })}
        <small style={{ color: "#64748b" }}>Los criterios «No aplica» y las secciones no evaluadas no se incluyen en los promedios.</small>
      </div>

      <div style={{ ...tarjeta, marginTop: 14, overflowX: "auto" }}>
        <h4 style={{ marginTop: 0 }}>Resultados por sección / taller</h4>
        <table style={{ width: "100%", minWidth: 580, borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Sección / taller", "Auditorías", "Cumplimiento promedio", "No conformidades"].map((t) => <th key={t} style={celda}>{t}</th>)}</tr></thead>
          <tbody>
            {porSeccion.map((r) => <tr key={r.nombre}>
              <td style={celda}><strong>{r.nombre}</strong></td>
              <td style={celda}>{r.cantidad}</td>
              <td style={celda}>{porcentaje(r.cumplimiento)}</td>
              <td style={celda}>{r.noConformes}</td>
            </tr>)}
            {!porSeccion.length && <tr><td colSpan={4} style={{ ...celda, textAlign: "center" }}>No hay auditorías APR y PT en el período.</td></tr>}
          </tbody>
        </table>
      </div>

      {criteriosNC.length > 0 && <div style={{ ...tarjeta, marginTop: 14 }}>
        <h4 style={{ marginTop: 0 }}>Criterios con más incumplimientos</h4>
        {criteriosNC.map((r) => <div key={r.id} style={{ borderBottom: "1px solid #eef2f6", padding: "9px 0", fontSize: 13 }}>
          <strong>{r.id} · {r.cantidad} NC</strong> — {r.pregunta}
        </div>)}
      </div>}

      <div style={{ ...tarjeta, marginTop: 14, overflowX: "auto" }}>
        <h4 style={{ marginTop: 0 }}>Historial de auditorías APR y PT</h4>
        <table style={{ width: "100%", minWidth: 830, borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Fecha", "Auditor", "Sección / taller", "Tarea", "¿PT?", "Cumplimiento", "NC", "Detalle"].map((t) => <th key={t} style={celda}>{t}</th>)}</tr></thead>
          <tbody>
            {filtradas.map((a) => <React.Fragment key={a.id}>
              <tr>
                <td style={celda}>{a.fecha_auditoria}</td>
                <td style={celda}>{a.auditor}</td>
                <td style={celda}>{a.seccion_taller}</td>
                <td style={celda}>{a.nombre_tarea}</td>
                <td style={celda}>{a.requiere_pt ? "Sí" : "No"}</td>
                <td style={celda}><strong>{porcentaje(a.cumplimiento_global)}</strong></td>
                <td style={celda}>{contarNC(a)}</td>
                <td style={celda}><button type="button" onClick={() => setDetalle((prev) => prev === a.id ? null : a.id)} style={{ cursor: "pointer", display: "inline-flex", gap: 5, alignItems: "center" }}>
                  {detalle === a.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Ver
                </button></td>
              </tr>
              {detalle === a.id && <tr><td colSpan={8} style={{ padding: 16, background: "#f8fafc" }}>
                <p><strong>Encargado:</strong> {a.encargado || "—"}</p>
                <p><strong>Tarea de más de un día:</strong> {a.tarea_mas_un_dia ? "Sí" : "No"}</p>
                <p><strong>Comentarios sobre APR:</strong> {a.comentarios_apr || "Sin comentarios"}</p>
                {SECCIONES.map((seccion) => {
                  const registros = respuestasDe(a).filter((r) => r.categoria === seccion.id);
                  if (!registros.length) return null;
                  return <div key={seccion.id} style={{ marginTop: 15 }}>
                    <strong style={{ display: "block", marginBottom: 7 }}>{seccion.titulo}</strong>
                    {registros.map((r, i) => <div key={`${r.id}-${i}`} style={{ borderTop: "1px solid #e2e8f0", padding: "9px 0" }}>
                      <div><strong>{r.id}.</strong> {r.pregunta}</div>
                      <div style={{ color: esNC(r) ? "#b91c1c" : r.respuesta === "SI" ? "#047857" : "#64748b", fontWeight: 700, marginTop: 3 }}>{etiquetaRespuesta(r.respuesta)}</div>
                      {r.observacion && <div style={{ color: "#475569", marginTop: 4 }}><strong>Observación:</strong> {r.observacion}</div>}
                    </div>)}
                  </div>;
                })}
              </td></tr>}
            </React.Fragment>)}
            {!filtradas.length && <tr><td colSpan={8} style={{ ...celda, textAlign: "center" }}>{cargando ? "Cargando..." : "No hay auditorías APR y PT para el período seleccionado."}</td></tr>}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: "#64748b", marginTop: 12 }}>
        Los indicadores usan las auditorías del período seleccionado. Se consultan hasta 1,000 auditorías y 5,000 acciones por carga.
        El promedio global es el promedio de los resultados de auditoría con criterios evaluables.
      </p>
    </section>
  );
}
