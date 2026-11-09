import React, { useState } from 'react';
import { ClipboardCheck, ShieldCheck, FileCheck2, Truck, ArrowLeft, AlertCircle } from 'lucide-react';

const auditorias = [
  { id: 'cep', titulo: 'Control de Energías Peligrosas (CEP)', descripcion: 'Verificación en campo de la aplicación del procedimiento de aislamiento, bloqueo y control de energías peligrosas.', Icono: ShieldCheck },
  { id: 'apr-pt', titulo: 'APR y PT', descripcion: 'Verificación del Análisis Previo de Riesgos y los Permisos de Trabajo aplicables.', Icono: FileCheck2 },
  { id: 'pre-usos', titulo: 'Pre-usos de Equipos', descripcion: 'Verificación del llenado, condición y seguimiento de inspecciones pre-uso.', Icono: Truck },
];

export default function Auditorias() {
  const [seleccionada, setSeleccionada] = useState(null);
  const actual = auditorias.find(a => a.id === seleccionada);
  return (
    <div style={{maxWidth:1100, margin:'0 auto', width:'100%'}}>
      {actual ? (
        <>
          <button type="button" onClick={() => setSeleccionada(null)} style={backButton}><ArrowLeft size={17}/> Volver a auditorías</button>
          <div style={hero}><actual.Icono size={30}/><h1 style={{margin:'12px 0 8px'}}>{actual.titulo}</h1><p style={{margin:0,opacity:.85}}>{actual.descripcion}</p></div>
          <section style={notice}><AlertCircle size={22} style={{flexShrink:0}}/><div><strong>Lista de verificación pendiente de configurar</strong><p style={{margin:'6px 0 0'}}>Antes de habilitar el registro de auditorías, debemos cargar los criterios oficiales de Transmetal, las opciones de respuesta, el manejo de «No aplica», evidencias y reglas de evaluación. Este módulo no registra resultados todavía.</p></div></section>
        </>
      ) : (
        <>
          <div style={hero}><ClipboardCheck size={32}/><h1 style={{margin:'12px 0 8px'}}>Auditorías</h1><p style={{margin:0,opacity:.85}}>Verificación del cumplimiento operativo en campo</p></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:18}}>
            {auditorias.map(a => <button key={a.id} type="button" onClick={() => setSeleccionada(a.id)} style={card}><a.Icono size={30} color="#2563eb"/><strong style={{fontSize:19}}>{a.titulo}</strong><span style={{color:'#475569',lineHeight:1.6}}>{a.descripcion}</span><small style={{color:'#9a6700',fontWeight:700,marginTop:'auto'}}>Pendiente de configurar criterios</small></button>)}
          </div>
        </>
      )}
    </div>
  );
}
const hero = {background:'linear-gradient(135deg,#0f172a,#1d4ed8)',color:'#fff',padding:32,borderRadius:22,marginBottom:24};
const card = {display:'flex',flexDirection:'column',alignItems:'flex-start',gap:15,textAlign:'left',padding:25,border:'1px solid #e2e8f0',borderRadius:18,background:'#fff',minHeight:245,cursor:'pointer'};
const notice = {display:'flex',gap:14,alignItems:'flex-start',background:'#fffbeb',border:'1px solid #fcd34d',padding:22,borderRadius:16,color:'#78350f',lineHeight:1.55};
const backButton = {display:'flex',alignItems:'center',gap:7,background:'none',border:'none',color:'#2563eb',fontWeight:700,marginBottom:16};
