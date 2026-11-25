import React, { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { catalogo } from '../../data/CatalogoMaquinas.js';
import { colaboradores } from '../../data/CatalogoColaboradores.js';
import { usuarios } from '../../data/CatalogoUsuarios.js';
export const PREGUNTAS_CEP = [
 ['¿Conoce los 6 pasos del Control de Energías Peligrosas?', 'En orden: identificar las energías, apagar localmente, aislar desde la fuente, bloquear y etiquetar, evaluar las energías residuales y probar.'],
 ['¿Conoce los tipos de energía presentes en la máquina o equipo que opera?', 'Identifica todas las energías peligrosas aplicables según el estándar del equipo.'],
 ['¿Sabe cómo apagar localmente la máquina o equipo que opera?', 'Identifica y explica el apagado local.'],
 ['¿Sabe dónde y cómo aislar desde la fuente las energías de la máquina o equipo que opera?', 'Identifica los puntos de aislamiento; distinguir conocimiento de autorización para intervenir.'],
 ['¿Sabe qué es el bloqueo y etiquetado y cuál es su finalidad?', 'Explica correctamente su función.'],
 ['¿Sabe para qué sirve una caja de bloqueo?', 'Comprende su función en un bloqueo grupal.'],
 ['¿Sabe dónde se realiza el bloqueo y etiquetado de la máquina o equipo que opera?', 'Identifica los puntos de bloqueo según el estándar.'],
 ['¿Sabe qué es un DAE y qué tipos existen en la planta?', 'Validar significado, función y tipos según el estándar interno.'],
 ['¿Sabe qué son las energías residuales?', 'Explica el concepto y proporciona ejemplos.'],
 ['¿Sabe cómo comprobar que la máquina o equipo se encuentra en condición de cero energías peligrosas?', 'Explica la verificación aplicable según el estándar.'],
 ['¿Sabe cómo controlar las energías residuales presentes en su máquina?', 'Identifica los métodos de control según el estándar.'],
 ['¿Sabe cuándo debe aplicar el procedimiento CEP?', 'Identifica intervenciones que requieren CEP.'],
 ['¿Sabe quién debe retirar su candado y etiqueta personal?', 'Quien los colocó; excepciones únicamente según procedimiento autorizado.'],
 ['¿Sabe qué hacer si un punto de aislamiento no puede bloquearse correctamente?', 'No iniciar la intervención y reportar la condición.'],
 ['¿Sabe dónde consultar el estándar CEP de la máquina que opera?', 'Identifica la ubicación del estándar correspondiente.']
].map(([pregunta, criterio], i) => ({id: `P${i+1}`, pregunta, criterio}));
const hoy = () => new Date().toLocaleDateString('sv-SE');
const maquinas = [...new Set(catalogo.map(x=>x.maquina))].sort((a,b)=>a.localeCompare(b,'es'));
const campo = {width:'100%',padding:10,border:'1px solid #cbd5e1',borderRadius:8,boxSizing:'border-box',background:'#fff',color:'#0f172a'};
const card = {background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:18,marginBottom:12};
export default function AuditoriaConocimientosCEP({currentUser,onBack}) {
 const inicial = () => ({auditor:currentUser?.nombre || '',fecha:hoy(),colaborador:'',codigo_colaborador:'',maquina:''});
 const [form,setForm] = useState(inicial);
 const [nombreInvitado,setNombreInvitado] = useState('');
 const [respuestas,setRespuestas] = useState({});
 const [guardando,setGuardando] = useState(false);
 const [mensaje,setMensaje] = useState('');
 const [exito,setExito] = useState(false);
 const [registroId,setRegistroId] = useState(()=>crypto.randomUUID());
 const actualizar = (k,v)=>setForm(p=>({...p,[k]:v}));
 const responder = (id,v)=>setRespuestas(p=>({...p,[id]:{...p[id],...v}}));
 const total = Object.values(respuestas).filter(x=>x.respuesta).length;
 const cumple = Object.values(respuestas).filter(x=>x.respuesta==='SI').length;
 const nc = total-cumple;
 const nuevo = ()=>{setForm(inicial());setNombreInvitado('');setRespuestas({});setMensaje('');setExito(false);setRegistroId(crypto.randomUUID());};
 async function guardar(e){
  e.preventDefault(); if(guardando||exito)return;
  const colaborador = form.colaborador === '__invitado__' ? nombreInvitado.trim() : form.colaborador;
  if(!colaborador){setMensaje('Ingresa el nombre del colaborador invitado.');return;}
  if(total!==PREGUNTAS_CEP.length){setMensaje('Responde las 15 preguntas.');return;}
  if(PREGUNTAS_CEP.some(p=>respuestas[p.id].respuesta==='NO'&&!respuestas[p.id].observacion?.trim())){setMensaje('Describe todos los incumplimientos.');return;}
  setGuardando(true);setMensaje('');
  const detalle=PREGUNTAS_CEP.map(p=>({...p,respuesta:respuestas[p.id].respuesta,observacion:respuestas[p.id].respuesta==='NO'?respuestas[p.id].observacion.trim():''}));
  try {
   const {error}=await supabase.from('auditorias_conocimientos_cep').insert({id:registroId,...form,colaborador,codigo_colaborador:form.codigo_colaborador.trim()||null,detalle,total_preguntas:PREGUNTAS_CEP.length,cumple});
   if(error){if(error.code!=='23505')throw error; const {data,error:consulta}=await supabase.from('auditorias_conocimientos_cep').select('id').eq('id',registroId).maybeSingle();if(consulta||!data)throw error;}
   setExito(true);setMensaje('Auditoría guardada correctamente.');
  }catch(err){setMensaje(err.message||'No se pudo guardar.');}finally{setGuardando(false);}
 }
 const opciones=(k,label,values)=> <label>{label}<select style={campo} required value={form[k]} onChange={e=>actualizar(k,e.target.value)}><option value="">Selecciona...</option>{values.map(x=><option key={x} value={x}>{x}</option>)}</select></label>;
 return <section style={{maxWidth:1050,margin:'0 auto',paddingBottom:24}}>
 <button type="button" className="secondary-button" onClick={onBack} disabled={guardando}><ArrowLeft size={16}/> Volver</button>
 <header style={{background:'linear-gradient(120deg,#0f172a,#1d4ed8)',color:'white',padding:24,borderRadius:16,margin:'16px 0'}}><h2 style={{margin:0}}>Auditoría de Conocimientos CEP</h2><p style={{marginBottom:0}}>Transmetal · Gestión preventiva del conocimiento. No certifica ni autoriza intervenciones.</p></header>
 <form onSubmit={guardar}><fieldset disabled={guardando||exito} style={{border:0,padding:0,margin:0,minWidth:0}}>
 <div style={{...card,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
 {opciones('auditor','Auditor *',[...new Set([...usuarios.filter(x=>x.rol!=='Mantenimiento').map(x=>x.nombre),currentUser?.nombre].filter(Boolean))])}
 <label>Fecha *<input type="date" required style={campo} value={form.fecha} onChange={e=>actualizar('fecha',e.target.value)}/></label>
 <label>Colaborador *<select style={campo} required value={form.colaborador} onChange={e=>{actualizar('colaborador',e.target.value);setNombreInvitado('');}}><option value="">Selecciona...</option>{[...colaboradores].sort((a,b)=>a.localeCompare(b,'es')).map(x=><option key={x} value={x}>{x}</option>)}<option value="__invitado__">Colaborador invitado / Otro</option></select></label>
 {form.colaborador==='__invitado__'&&<label>Nombre del colaborador invitado *<input style={campo} required value={nombreInvitado} onChange={e=>setNombreInvitado(e.target.value)} placeholder="Ingresa el nombre completo"/></label>}
 <label>Código (opcional)<input style={campo} value={form.codigo_colaborador} onChange={e=>actualizar('codigo_colaborador',e.target.value)}/></label>
 {opciones('maquina','Máquina / equipo *',maquinas)}
 </div>
 <div style={{...card,position:'sticky',top:0,zIndex:2}}><strong>{total}/15 evaluadas · {cumple} cumple · {nc} no cumple</strong><div style={{height:7,background:'#e2e8f0',borderRadius:6,margin:'8px 0'}}><div style={{height:7,width:`${total/15*100}%`,background:'#2563eb',borderRadius:6}}/></div><small>Resultado {total===15?`${(cumple/15*100).toFixed(1)}%`:'pendiente de completar'} · Meta 100%</small></div>
 {PREGUNTAS_CEP.map((p,i)=>{const r=respuestas[p.id]||{};return <article key={p.id} style={card}><strong>{i+1}. {p.pregunta}</strong><details style={{margin:'8px 0',color:'#475569'}}><summary>Guía del auditor</summary><p>{p.criterio}</p></details><div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{[['SI','Cumple','#15803d'],['NO','No cumple','#b91c1c']].map(([v,label,color])=><button type="button" key={v} aria-pressed={r.respuesta===v} onClick={()=>responder(p.id,{respuesta:v})} style={{padding:'10px 20px',border:`1px solid ${color}`,borderRadius:8,background:r.respuesta===v?color:'white',color:r.respuesta===v?'white':color,cursor:'pointer'}}>{label}</button>)}</div>{r.respuesta==='NO'&&<label style={{display:'block',marginTop:12}}>Descripción del incumplimiento *<textarea required rows={3} style={campo} value={r.observacion||''} onChange={e=>responder(p.id,{observacion:e.target.value})}/></label>}</article>})}
 <button type="submit" className="primary-button" disabled={guardando||total!==15}><Save size={16}/> {guardando?'Guardando...':'Guardar auditoría'}</button></fieldset></form>
 {mensaje&&<p role="status" style={{color:exito?'#15803d':'#b91c1c'}}>{mensaje}</p>}{exito&&<button type="button" className="secondary-button" onClick={nuevo}>Nueva auditoría</button>}
 </section>;
}
