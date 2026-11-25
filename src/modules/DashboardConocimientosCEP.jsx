import React, {useEffect,useMemo,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {supabase} from '../lib/supabase.js';
import {colaboradores} from '../data/CatalogoColaboradores.js';
import {PREGUNTAS_CEP} from './Auditorias/AuditoriaConocimientosCEP.jsx';
const card={background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:16,marginBottom:14};
const pct=n=>n==null?'—':`${n.toFixed(1)}%`;
const promedio=rows=>rows.length?rows.reduce((s,r)=>s+Number(r.porcentaje),0)/rows.length:null;
const td={padding:8,borderBottom:'1px solid #e2e8f0',textAlign:'left'};
function tabla(headers,rows){return <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{headers.map((h,i)=><th key={i} style={td}>{h}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j} style={td}>{c}</td>)}</tr>):<tr><td colSpan={headers.length} style={td}>Sin registros en el período.</td></tr>}</tbody></table></div>;}
function agrupar(rows,key){const map=new Map();for(const r of rows){const k=key(r);if(!map.has(k))map.set(k,[]);map.get(k).push(r);}return [...map.entries()];}
export default function DashboardConocimientosCEP({fechaInicio,fechaFin}){
 const [datos,setDatos]=useState([]),[error,setError]=useState(''),[cargando,setCargando]=useState(true),[recarga,setRecarga]=useState(0),[maquina,setMaquina]=useState('');
 useEffect(()=>{let activo=true;(async()=>{setCargando(true);setError('');setDatos([]);try{const todas=[];for(let offset=0;;offset+=500){let q=supabase.from('auditorias_conocimientos_cep').select('*').order('fecha',{ascending:false}).order('created_at',{ascending:false}).order('id').range(offset,offset+499);if(fechaInicio)q=q.gte('fecha',fechaInicio);if(fechaFin)q=q.lte('fecha',fechaFin);const {data,error}=await q;if(error)throw error;todas.push(...data);if(data.length<500)break;}if(activo)setDatos(todas);}catch(e){if(activo)setError(e.message||'No se pudieron consultar las auditorías.');}finally{if(activo)setCargando(false);}})();return()=>{activo=false;};},[fechaInicio,fechaFin,recarga]);
 const maquinas=[...new Set(datos.map(r=>r.maquina))].sort();
 const filas=useMemo(()=>datos.filter(r=>!maquina||r.maquina===maquina),[datos,maquina]);
 const ultimas=useMemo(()=>[...new Map([...filas].reverse().map(r=>[r.colaborador,r])).values()].sort((a,b)=>a.colaborador.localeCompare(b.colaborador,'es')),[filas]);
 const cobertura=new Set(ultimas.filter(r=>colaboradores.includes(r.colaborador)).map(r=>r.colaborador)).size;
 const incumplimientos=filas.reduce((s,r)=>s+Number(r.no_cumple),0);
 const preguntas=PREGUNTAS_CEP.map(p=>{const respuestas=filas.flatMap(r=>(r.detalle||[]).filter(d=>d.id===p.id));const c=respuestas.filter(d=>d.respuesta==='SI').length;return {...p,n:respuestas.length,c,valor:respuestas.length?100*c/respuestas.length:null};});
 return <section className="section-block" style={{padding:18}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}><div><span className="eyebrow">Gestión preventiva</span><h2>Conocimientos CEP</h2><p>Meta: 100% · No constituye certificación ni autorización.</p></div><button type="button" className="secondary-button" disabled={cargando} onClick={()=>setRecarga(x=>x+1)}><RefreshCw size={16}/> Actualizar</button></div>
 <label>Máquina / equipo <select value={maquina} onChange={e=>setMaquina(e.target.value)}><option value="">Todas</option>{[...new Set([...maquinas,...(maquina?[maquina]:[])])].map(m=><option key={m}>{m}</option>)}</select></label>
 {error?<p role="alert" style={{color:'#b91c1c'}}>{error}</p>:cargando?<p>Cargando auditorías...</p>:<>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:12,marginTop:16}}>{[['Auditorías',filas.length],['Conocimiento promedio',pct(promedio(filas))],['Cobertura del catálogo',`${cobertura}/${colaboradores.length} (${pct(100*cobertura/colaboradores.length)})`],['Personas con brechas (última evaluación)',ultimas.filter(r=>r.no_cumple>0).length],['Incumplimientos detectados',incumplimientos]].map(([label,v])=><div style={card} key={label}><div style={{color:'#64748b',fontSize:13}}>{label}</div><strong style={{fontSize:23}}>{v}</strong></div>)}</div>
 <div style={card}><h3>Cumplimiento por pregunta</h3>{preguntas.map(p=><div key={p.id} style={{margin:'12px 0'}}><div style={{display:'flex',justifyContent:'space-between',gap:12,fontSize:13}}><span>{p.id}. {p.pregunta}</span><strong>{pct(p.valor)} ({p.c}/{p.n})</strong></div><div style={{background:'#e2e8f0',height:9,borderRadius:6,marginTop:5}}><div style={{height:9,borderRadius:6,width:`${p.valor||0}%`,background:p.valor===100?'#15803d':'#2563eb'}}/></div></div>)}</div>
 <div style={card}><h3>Matriz de conocimientos por colaborador</h3><p>Última evaluación de cada persona dentro del período y filtro seleccionados. C = cumple; NC = no cumple.</p>{tabla(['Colaborador','Máquina',...PREGUNTAS_CEP.map(p=>p.id),'Resultado'],ultimas.map(r=>[r.colaborador,r.maquina,...PREGUNTAS_CEP.map(p=>{const d=r.detalle?.find(x=>x.id===p.id);return <span title={`${p.pregunta} ${d?.observacion||''}`} style={{display:'inline-block',padding:'4px 6px',borderRadius:4,background:d?.respuesta==='SI'?'#dcfce7':d?.respuesta==='NO'?'#fee2e2':'#f1f5f9',color:d?.respuesta==='SI'?'#166534':'#991b1b'}}>{d?.respuesta==='SI'?'C':d?.respuesta==='NO'?'NC':'—'}</span>;}),pct(Number(r.porcentaje))]))}</div>
 <div style={card}><h3>Resultados por máquina</h3>{tabla(['Máquina','Auditorías','Promedio'],agrupar(filas,r=>r.maquina).sort((a,b)=>promedio(a[1])-promedio(b[1])).map(([k,v])=>[k,v.length,pct(promedio(v))]))}</div>
 <div style={card}><h3>Tendencia mensual</h3>{tabla(['Mes','Auditorías','Promedio'],agrupar(filas,r=>r.fecha.slice(0,7)).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>[k,v.length,pct(promedio(v))]))}</div>
 <div style={card}><h3>Historial de auditorías</h3>{tabla(['Fecha','Colaborador','Máquina','Auditor','Resultado','Brechas'],filas.map(r=>[r.fecha,r.colaborador,r.maquina,r.auditor,pct(Number(r.porcentaje)),<details><summary>{r.no_cumple} incumplimientos</summary>{r.detalle?.filter(d=>d.respuesta==='NO').map(d=><p key={d.id}><strong>{d.id}:</strong> {d.observacion}</p>)}</details>]))}</div>
 </>}
 </section>;
}
