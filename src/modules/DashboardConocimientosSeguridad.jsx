import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Users, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase.js";

const card = { padding: 18, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 };
const promedio = (valores) => valores.length ? valores.reduce((a,b)=>a+b,0)/valores.length : null;
const porcentaje = (n) => n == null ? "—" : `${n.toFixed(1)}%`;

export default function DashboardConocimientosSeguridad({ fechaInicio, fechaFin }) {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const cargar = async () => {
    setCargando(true); setError("");
    try {
      const { data, error: fallo } = await supabase.from("evaluaciones_conocimiento")
        .select("id, colaborador, auditor, fecha, puntaje_obtenido, puntaje_maximo, porcentaje, aprobado")
        .order("fecha", { ascending: false }).limit(1000);
      if (fallo) throw fallo;
      setDatos(data || []);
    } catch(e) { setError(e.message || "No se pudo consultar las evaluaciones."); }
    finally { setCargando(false); }
  };
  useEffect(() => { cargar(); }, []);
  const filtrados = useMemo(() => datos.filter(d => {
    const fecha = String(d.fecha || "").slice(0,10);
    return (!fechaInicio || fecha >= fechaInicio) && (!fechaFin || fecha <= fechaFin);
  }), [datos, fechaInicio, fechaFin]);
  const promedios = filtrados.map(d => d.porcentaje).filter(v => v !== null && v !== undefined && v !== "").map(Number).filter(Number.isFinite);
  const aprobados = filtrados.filter(d => d.aprobado === true).length;
  const personas = new Set(filtrados.map(d => d.colaborador).filter(Boolean)).size;
  return <section className="section-block" style={{ padding:18 }}>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
      <div><span className="eyebrow">Evaluaciones de conocimientos</span><h2 style={{ margin:"6px 0" }}>Seguridad Industrial</h2><p style={{ color:"#64748b" }}>Resultados de las evaluaciones realizadas a colaboradores.</p></div>
      <button className="secondary-button" type="button" onClick={cargar} disabled={cargando}><RefreshCw size={16}/> Actualizar</button>
    </div>
    {error && <p role="alert" style={{ color:"#b91c1c" }}>{error}</p>}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, margin:"20px 0" }}>
      {[ ["Evaluaciones",filtrados.length], ["Puntaje promedio", porcentaje(promedio(promedios))], ["Aprobadas",aprobados], ["Colaboradores evaluados",personas] ].map(([label,value]) => <div style={card} key={label}><div style={{ color:"#64748b", fontSize:13 }}>{label}</div><strong style={{ fontSize:27 }}>{cargando?"—":value}</strong></div>)}
    </div>
    <div style={{ ...card, overflowX:"auto" }}><h3 style={{ marginTop:0 }}>Historial de evaluaciones</h3>
    <table style={{ width:"100%", minWidth:620, borderCollapse:"collapse" }}><thead><tr>{["Fecha","Colaborador","Auditor","Puntaje","Resultado"].map(h=><th key={h} style={{ padding:10, textAlign:"left",borderBottom:"1px solid #e2e8f0" }}>{h}</th>)}</tr></thead><tbody>
    {filtrados.map(d => <tr key={d.id}><td style={{ padding:10 }}>{String(d.fecha || "").slice(0,10)}</td><td style={{ padding:10 }}>{d.colaborador||"—"}</td><td style={{ padding:10 }}>{d.auditor||"—"}</td><td style={{ padding:10 }}>{porcentaje(d.porcentaje != null && Number.isFinite(Number(d.porcentaje)) ? Number(d.porcentaje) : null)}</td><td style={{ padding:10 }}>{d.aprobado === true ? "Aprobado" : d.aprobado === false ? "No aprobado" : "—"}</td></tr>)}
    {!filtrados.length && <tr><td colSpan={5} style={{ padding:18,textAlign:"center",color:"#64748b" }}>{cargando?"Cargando...":"Sin evaluaciones para el período seleccionado"}</td></tr>}
    </tbody></table></div>
    <p style={{ color:"#64748b", fontSize:12 }}>Consulta hasta 1,000 evaluaciones. Los resultados dependen de los registros existentes en Supabase.</p>
  </section>;
}
