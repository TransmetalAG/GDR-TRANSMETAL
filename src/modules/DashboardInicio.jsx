import React, { useState } from "react";
import { LayoutDashboard, ClipboardCheck, ShieldCheck, FileCheck2, Truck, Siren, GraduationCap, Sparkles, KeyRound, ClipboardList, ArrowLeft, CalendarDays } from "lucide-react";
import DashboardGemba from "./DashboardGemba.jsx";
import DashboardCEP from "./DashboardCEP.jsx";
import DashboardAPRPT from "./DashboardAPRPT.jsx";
import DashboardPreusos from "./DashboardPreusos.jsx";
import DashboardDispositivosSeguridad from "./DashboardDispositivosSeguridad.jsx";
import DashboardConocimientosSeguridad from "./DashboardConocimientosSeguridad.jsx";

const categorias = [
  { titulo: "DASHBOARDS AUDITORÍAS", icono: ClipboardCheck, opciones: [
    { id: "apr", titulo: "Dashboard APR y PT", detalle: "Calidad de llenado, ejecución y permisos", icono: FileCheck2 },
    { id: "cep", titulo: "Dashboard CEP", detalle: "Control de energías peligrosas", icono: ShieldCheck },
    { id: "preusos", titulo: "Dashboard Pre-usos", detalle: "Verificación de formatos y entrevistas", icono: Truck },
    { id: "dispositivos", titulo: "Dashboard Dispositivos de Seguridad", detalle: "Hongos, cilindros, barreras y guardas", icono: Siren },
  ] },
  { titulo: "DASHBOARDS EVALUACIONES DE CONOCIMIENTOS", icono: GraduationCap, opciones: [
    { id: "seguridad", titulo: "Dashboard Seguridad Industrial", detalle: "Resultados de conocimientos y aprobaciones", icono: ShieldCheck },
    { id: "5s", titulo: "Dashboard 5S", detalle: "Pendiente de implementar la evaluación", icono: Sparkles, pendiente:true },
    { id: "bloqueos", titulo: "Dashboard Conocimiento de Bloqueos", detalle: "Pendiente de implementar la evaluación", icono: KeyRound, pendiente:true },
    { id: "estandares", titulo: "Dashboard Estándares", detalle: "Pendiente de implementar la evaluación", icono: ClipboardList, pendiente:true },
  ] },
];

function fechaLocal(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function inicioMes() { const d=new Date(); return fechaLocal(new Date(d.getFullYear(),d.getMonth(),1)); }
function finMes() { const d=new Date(); return fechaLocal(new Date(d.getFullYear(),d.getMonth()+1,0)); }

export default function DashboardInicio({ modules=[], onNewGemba }) {
  const [seccion,setSeccion]=useState(null);
  const [fechaInicio,setFechaInicio]=useState(inicioMes);
  const [fechaFin,setFechaFin]=useState(finMes);
  const opciones = [...categorias.flatMap(c=>c.opciones), {id:"gemba",titulo:"Dashboard Gemba",icono:LayoutDashboard}];
  const activa=opciones.find(o=>o.id===seccion);
  const abrir=(id)=>{setSeccion(id); window.scrollTo({top:0,behavior:"smooth"});};
  if (!activa) return <div style={{ maxWidth:1100, margin:"0 auto", paddingBottom:40 }}>
    <header style={{ background:"linear-gradient(135deg,#0f172a,#1d4ed8)", borderRadius:17, padding:28, color:"#fff", marginBottom:24 }}>
      <LayoutDashboard size={30}/><h1 style={{ margin:"10px 0 6px" }}>Dashboards</h1>
      <p style={{ margin:0, opacity:0.88 }}>Gestión de Rutina Transmetal · Selecciona los indicadores que deseas consultar</p>
    </header>
    <section style={{ marginBottom:24 }}><h2 style={{ fontSize:18, margin:"0 0 12px" }}>DASHBOARD GEMBA</h2>
      <button type="button" onClick={()=>abrir("gemba")} style={estiloTarjeta}>
        <LayoutDashboard size={27} color="#2563eb"/><strong style={{ fontSize:16 }}>Dashboard Gemba</strong><span style={estiloDetalle}>Gembas, hallazgos y seguimiento de acciones</span>
      </button></section>
    {categorias.map(c=><section key={c.titulo} style={{ marginBottom:26 }}>
      <h2 style={{ fontSize:18, margin:"0 0 12px", display:"flex", alignItems:"center", gap:9 }}><c.icono size={21} color="#2563eb"/>{c.titulo}</h2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:14 }}>
        {c.opciones.map(o=><button key={o.id} type="button" disabled={o.pendiente} onClick={()=>abrir(o.id)} style={{...estiloTarjeta, width:"100%", opacity:o.pendiente?0.68:1, cursor:o.pendiente?"not-allowed":"pointer" }}>
          <o.icono size={27} color="#2563eb"/><strong style={{ fontSize:16 }}>{o.titulo}</strong><span style={estiloDetalle}>{o.detalle}</span>
          {o.pendiente && <small style={{ color:"#64748b" }}>Próximamente</small>}
        </button>)}
      </div>
    </section>)}
  </div>;
  return <div style={{ maxWidth:1200,margin:"0 auto",paddingBottom:35 }}>
    <button type="button" className="secondary-button" onClick={()=>setSeccion(null)} style={{ display:"inline-flex",alignItems:"center",gap:7,marginBottom:20 }}><ArrowLeft size={17}/> Volver a Dashboards</button>
    {seccion!=="gemba" && <div className="section-block" style={{ padding:15, marginBottom:18, display:"flex",gap:14,alignItems:"end",flexWrap:"wrap" }}>
      <label className="form-field" style={{ minWidth:175,margin:0 }}><span><CalendarDays size={16}/> Desde</span><input type="date" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)}/></label>
      <label className="form-field" style={{ minWidth:175,margin:0 }}><span>Hasta</span><input type="date" value={fechaFin} onChange={e=>setFechaFin(e.target.value)}/></label>
      <button type="button" className="secondary-button" onClick={()=>{setFechaInicio(inicioMes());setFechaFin(finMes());}}>Mes actual</button>
    </div>}
    {seccion==="gemba" && <DashboardGemba modules={modules} onNewGemba={onNewGemba}/>}
    {seccion==="apr" && <DashboardAPRPT fechaInicio={fechaInicio} fechaFin={fechaFin}/>}
    {seccion==="cep" && <DashboardCEP fechaInicio={fechaInicio} fechaFin={fechaFin}/>}
    {seccion==="preusos" && <DashboardPreusos fechaInicio={fechaInicio} fechaFin={fechaFin}/>}
    {seccion==="dispositivos" && <DashboardDispositivosSeguridad fechaInicio={fechaInicio} fechaFin={fechaFin}/>}
    {seccion==="seguridad" && <DashboardConocimientosSeguridad fechaInicio={fechaInicio} fechaFin={fechaFin}/>}
  </div>;
}

const estiloTarjeta={ background:"#fff", border:"1px solid #cbd5e1", borderRadius:13, padding:21, minHeight:150, textAlign:"left", display:"flex", flexDirection:"column", alignItems:"flex-start", gap:12, cursor:"pointer", maxWidth:"100%" };
const estiloDetalle={ fontSize:13, color:"#64748b", lineHeight:1.45 };
