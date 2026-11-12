import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase.js";

// Ubicación: src/modules/DashboardDispositivosSeguridad.jsx
const GRUPOS = [
  { titulo: "Hongos de emergencia", ids: ["DS01", "DS02", "DS03"] },
  { titulo: "Cilindros de expulsión", ids: ["DS04", "DS05"] },
  { titulo: "Barreras fotoeléctricas", ids: ["DS06", "DS07"] },
  { titulo: "Guardas de seguridad", ids: ["DS08", "DS09"] },
  { titulo: "Integridad de dispositivos", ids: ["DS10"] },
];

const tarjeta = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 16,
};
const celda = { padding: "10px", borderBottom: "1px solid #e2e8f0", textAlign: "left", verticalAlign: "top" };
const porcentaje = (valor) => valor == null ? "—" : `${Number(valor).toFixed(1)}%`;
const respuestasDe = (auditoria) => Array.isArray(auditoria.respuestas) ? auditoria.respuestas : [];
const totalNC = (auditoria) => respuestasDe(auditoria).filter((r) => r.respuesta === "NO").length;
const promedio = (valores) => {
  const validos = valores.filter((valor) => valor != null && Number.isFinite(Number(valor)));
  return validos.length ? validos.reduce((suma, valor) => suma + Number(valor), 0) / validos.length : null;
};
const cumplimientoDe = (respuestas) => {
  const conformes = respuestas.filter((r) => r.respuesta === "SI").length;
  const noConformes = respuestas.filter((r) => r.respuesta === "NO").length;
  return conformes + noConformes ? conformes * 100 / (conformes + noConformes) : null;
};

export default function DashboardDispositivosSeguridad({ fechaInicio, fechaFin }) {
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
        supabase.from("auditorias_dispositivos_seguridad")
          .select("*")
          .order("fecha_auditoria", { ascending: false })
          .limit(1000),
        supabase.from("plan_accion")
          .select("id, origen, hallazgo, estado")
          .eq("origen", "Auditoría Dispositivos de Seguridad")
          .limit(5000),
      ]);
      if (resultadoAuditorias.error) throw resultadoAuditorias.error;
      if (resultadoAcciones.error) throw resultadoAcciones.error;
      setAuditorias(resultadoAuditorias.data || []);
      setAcciones(resultadoAcciones.data || []);
    } catch (err) {
      console.error("Error al cargar Dashboard de Dispositivos:", err);
      setError(err.message || "No se pudieron consultar las auditorías.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  const filtradas = useMemo(() => auditorias.filter((a) =>
    (!fechaInicio || a.fecha_auditoria >= fechaInicio) &&
    (!fechaFin || a.fecha_auditoria <= fechaFin)
  ), [auditorias, fechaInicio, fechaFin]);

  const ids = useMemo(() => new Set(filtradas.map((a) => String(a.id))), [filtradas]);
  const accionesPeriodo = useMemo(() => acciones.filter((a) => {
    const coincidencia = String(a.hallazgo || "").match(/^DISP-SEG \[([^\]]+)\]/);
    return coincidencia && ids.has(coincidencia[1]);
  }), [acciones, ids]);

  const indicadores = useMemo(() => ({
    total: filtradas.length,
    cumplimiento: promedio(filtradas.map((a) => a.cumplimiento_global)),
    noConformes: filtradas.reduce((suma, a) => suma + totalNC(a), 0),
    maquinas: new Set(filtradas.map((a) => a.maquina).filter(Boolean)).size,
    pendientes: accionesPeriodo.filter((a) => a.estado !== "Terminada").length,
  }), [filtradas, accionesPeriodo]);

  const grupos = useMemo(() => GRUPOS.map((grupo) => {
    const respuestas = filtradas.flatMap((a) => respuestasDe(a).filter((r) => grupo.ids.includes(r.id)));
    return { ...grupo, cumplimiento: cumplimientoDe(respuestas), noConformes: respuestas.filter((r) => r.respuesta === "NO").length };
  }), [filtradas]);

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
      cumplimiento: promedio(registros.map((r) => r.cumplimiento_global)),
      noConformes: registros.reduce((suma, r) => suma + totalNC(r), 0),
    })).sort((a, b) => a.maquina.localeCompare(b.maquina, "es"));
  }, [filtradas]);

  const criteriosNC = useMemo(() => {
    const conteos = new Map();
    filtradas.flatMap(respuestasDe).filter((r) => r.respuesta === "NO").forEach((r) => {
      const anterior = conteos.get(r.id) || { id: r.id, pregunta: r.pregunta, cantidad: 0 };
      conteos.set(r.id, { ...anterior, cantidad: anterior.cantidad + 1 });
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
          <h3 style={{ margin: "5px 0" }}>Dispositivos de Seguridad</h3>
          <p style={{ margin: 0, color: "#64748b" }}>Hongos de emergencia, cilindros de expulsión, barreras fotoeléctricas y guardas.</p>
        </div>
        <button type="button" className="secondary-button" onClick={cargar} disabled={cargando}>
          <RefreshCw size={16} /> {cargando ? "Actualizando..." : "Actualizar dispositivos"}
        </button>
      </div>

      {error && <p role="alert" style={{ color: "#b91c1c", marginTop: 14 }}>Error al consultar Dispositivos de Seguridad: {error}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 20 }}>
        {kpis.map(([nombre, valor]) => (
          <div key={nombre} style={tarjeta}>
            <div style={{ color: "#64748b", fontSize: 13 }}>{nombre}</div>
            <strong style={{ display: "block", fontSize: 25, marginTop: 6 }}>{cargando ? "—" : valor}</strong>
          </div>
        ))}
      </div>

      <div style={{ ...tarjeta, marginTop: 14 }}>
        <h4 style={{ marginTop: 0 }}>Cumplimiento por tipo de dispositivo</h4>
        {grupos.map((grupo) => (
          <div key={grupo.titulo} style={{ marginBottom: 15 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <span>{grupo.titulo}</span>
              <span><strong>{porcentaje(grupo.cumplimiento)}</strong> <small style={{ color: "#64748b" }}>· {grupo.noConformes} NC</small></span>
            </div>
            <div style={{ height: 9, background: "#e2e8f0", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${grupo.cumplimiento || 0}%`, height: "100%", background: "#2563eb" }} />
            </div>
          </div>
        ))}
        <small style={{ color: "#64748b" }}>Los criterios «No aplica» no se incluyen en el cálculo. Los grupos sin criterios evaluables muestran —.</small>
      </div>

      <div style={{ ...tarjeta, marginTop: 14, overflowX: "auto" }}>
        <h4 style={{ marginTop: 0 }}>Resultados por máquina</h4>
        <table style={{ width: "100%", minWidth: 590, borderCollapse: "collapse", fontSize: 13 }}>
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
        <h4 style={{ marginTop: 0 }}>Historial de auditorías de dispositivos</h4>
        <table style={{ width: "100%", minWidth: 740, borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Fecha", "Auditor", "Máquina", "Cumplimiento", "No conformidades", "Detalle"].map((t) => <th key={t} style={celda}>{t}</th>)}</tr></thead>
          <tbody>
            {filtradas.map((a) => <React.Fragment key={a.id}>
              <tr>
                <td style={celda}>{a.fecha_auditoria}</td>
                <td style={celda}>{a.auditor}</td>
                <td style={celda}>{a.maquina}</td>
                <td style={celda}>{porcentaje(a.cumplimiento_global)}</td>
                <td style={celda}>{totalNC(a)}</td>
                <td style={celda}>
                  <button type="button" onClick={() => setDetalle((actual) => actual === a.id ? null : a.id)}
                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {detalle === a.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Ver
                  </button>
                </td>
              </tr>
              {detalle === a.id && <tr><td colSpan={6} style={{ padding: 14, background: "#f8fafc" }}>
                <p style={{ marginTop: 0 }}><strong>Observaciones generales:</strong> {a.observaciones || "—"}</p>
                {respuestasDe(a).map((r) => <div key={r.id} style={{ borderTop: "1px solid #e2e8f0", padding: "9px 0" }}>
                  <strong>{r.id} · {r.respuesta === "SI" ? "Conforme" : r.respuesta === "NO" ? "No conforme" : "No aplica"}</strong> — {r.pregunta}
                  {r.observacion && <div style={{ color: "#475569", marginTop: 3 }}>Observación: {r.observacion}</div>}
                </div>)}
              </td></tr>}
            </React.Fragment>)}
            {!filtradas.length && <tr><td colSpan={6} style={{ ...celda, textAlign: "center" }}>{cargando ? "Cargando auditorías..." : "No hay auditorías de dispositivos en este período."}</td></tr>}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: "#64748b" }}>
        El cumplimiento global es el promedio de las auditorías con criterios evaluables. Las acciones pendientes corresponden a hallazgos vinculados a estas auditorías y no terminados. Hasta 1,000 auditorías y 5,000 acciones por carga.
      </p>
    </section>
  );
}
