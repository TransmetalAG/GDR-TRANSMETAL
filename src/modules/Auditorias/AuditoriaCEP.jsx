
import React, { useMemo, useState } from "react";
import {
  ArrowLeft, CheckCircle2, Save, Plus, Trash2, ShieldCheck
} from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { catalogo } from "../../data/CatalogoMaquinas.js";
import { colaboradores } from "../../data/CatalogoColaboradores.js";

const SECCIONES = [
  {
    id: "personas", titulo: "PERSONAS", prefijo: "P",
    preguntas: [
      "¿Los colaboradores identificaron todas las fuentes de energía presentes en la máquina antes de su intervención? (Entrevistar)",
      "¿Los colaboradores conocen las energías residuales que pueden estar presentes en la máquina?",
      "¿Los colaboradores recibieron capacitación teórica y práctica en Control de Energías Peligrosas?",
      "¿Los colaboradores involucrados se encuentran libres de restricciones para participar en actividades relacionadas con el RC de CEP?",
      "¿Los colaboradores conocen que los bloqueos eléctricos desde la fuente deben ser realizados únicamente por electricistas autorizados?",
      "¿Los colaboradores conocen y pueden explicar correctamente los 6 pasos para el Control de Energías Peligrosas? (Entrevistar)"
    ]
  },
  {
    id: "condiciones", titulo: "CONDICIONES", prefijo: "C",
    preguntas: [
      "¿La etiqueta informativa de los 6 pasos para el CEP se encuentra instalada en un lugar visible y cercano a la máquina?",
      "¿Se cuenta con dispositivos adecuados para bloquear todas las fuentes de energía identificadas en la máquina?",
      "¿Se dispone de dispositivos para bloqueos múltiples cuando la intervención lo requiere?",
      "¿Los dispositivos de bloqueo, candados y etiquetas se encuentran en buenas condiciones de uso?",
      "¿La máquina cuenta con un estándar de bloqueo de energías peligrosas disponible para consulta en el lugar de trabajo?",
      "¿La máquina cuenta con puntos de aislamiento que permiten bloquear todas sus fuentes de energía peligrosa?"
    ]
  },
  {
    id: "procedimientos", titulo: "PROCEDIMIENTOS", prefijo: "PR",
    preguntas: [
      "¿La intervención cuenta con el Permiso de Trabajo correspondiente (validar CEP) y este se encuentra disponible en el lugar de trabajo?",
      "¿El Permiso de Trabajo está correctamente completado y cuenta con las firmas del emisor y aprobador?",
      "¿Todos los colaboradores que participan en la intervención están incluidos en el Permiso de Trabajo?",
      "¿Se completó correctamente la descripción de los 6 pasos para un trabajo seguro con energías (LOTO) en el reverso del Permiso de Trabajo?",
      "¿Se bloquearon todas las fuentes de energía mediante los dispositivos de bloqueo, candados y etiquetas correspondientes?",
      "¿Se liberaron o controlaron de forma segura las energías residuales antes de iniciar la intervención?",
      "¿Todos los participantes colocaron su candado y etiqueta de bloqueo conforme al procedimiento?",
      "¿Los colaboradores realizan el bloqueo conforme al estándar establecido para la máquina?"
    ]
  }
];

const ITEMS = SECCIONES.flatMap(s =>
  s.preguntas.map((pregunta, index) => ({
    id: `${s.prefijo}${index + 1}`,
    categoria: s.id, pregunta,
    admiteNA: s.id === "condiciones" && index === 2
  }))
);

const MAQUINAS = [...new Set(catalogo.map(x => x.maquina))]
  .sort((a, b) => a.localeCompare(b, "es"));

const HOY = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const campo = {
  width:"100%", padding:"11px 12px",
  border:"1px solid #cbd5e1", borderRadius:9,
  boxSizing:"border-box", fontSize:15,
  background:"white", color:"#0f172a"
};
const etiqueta = {
  display:"block", fontWeight:700, fontSize:14,
  marginBottom:7, color:"#334155"
};
const tarjeta = {
  background:"white", border:"1px solid #e2e8f0",
  borderRadius:14, padding:20
};
const buttonStyle = (activo, tipo) => ({
  border:`1px solid ${activo?(tipo==="SI"?"#059669":tipo==="NO"?"#dc2626":"#64748b"):"#cbd5e1"}`,
  background:activo?(tipo==="SI"?"#d1fae5":tipo==="NO"?"#fee2e2":"#e2e8f0"):"white",
  color:"#0f172a", borderRadius:8, padding:"9px 20px",
  fontWeight:700, cursor:"pointer"
});

export default function AuditoriaCEP({ currentUser, onBack }) {
  const [fecha, setFecha] = useState(HOY);
  const [auditorOtro, setAuditorOtro] = useState(false);
  const [nombreOtro, setNombreOtro] = useState("");
  const [maquina, setMaquina] = useState("");
  const [participantes, setParticipantes] = useState([""]);
  const [tarea, setTarea] = useState("");
  const [respuestas, setRespuestas] = useState({});
  const [notas, setNotas] = useState({});
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [auditoriaGuardada, setAuditoriaGuardada] = useState(null);

  const auditor = auditorOtro
    ? nombreOtro.trim()
    : (currentUser?.nombre || "");

  const resultado = useMemo(() => {
    const categorias = {};
    for (const s of SECCIONES) {
      const valores = ITEMS.filter(x => x.categoria === s.id)
        .map(x => respuestas[x.id]);
      const si = valores.filter(x => x === "SI").length;
      const no = valores.filter(x => x === "NO").length;
      const na = valores.filter(x => x === "NA").length;
      categorias[s.id] = {
        si, no, na, respondidas: si+no+na,
        porcentaje: si+no ? Math.round(si/(si+no)*10000)/100 : null
      };
    }
    const si = Object.values(categorias).reduce((n,x)=>n+x.si,0);
    const no = Object.values(categorias).reduce((n,x)=>n+x.no,0);
    const respondidas = Object.values(categorias).reduce((n,x)=>n+x.respondidas,0);
    return {
      categorias, si, no, respondidas,
      porcentaje: si+no ? Math.round(si/(si+no)*10000)/100 : null
    };
  }, [respuestas]);

  const cambiarRespuesta = (id, valor) => {
    setRespuestas(prev => ({...prev, [id]:valor}));
    setMensaje(null);
  };

  const cambiarParticipante = (index, valor) =>
    setParticipantes(prev =>
      prev.map((p,i)=>i===index?valor:p)
    );

  const reiniciar = () => {
    setFecha(HOY()); setAuditorOtro(false);
    setNombreOtro(""); setMaquina("");
    setParticipantes([""]); setTarea("");
    setRespuestas({}); setNotas({}); setObservaciones("");
  };

  async function guardar(event) {
    event.preventDefault();
    if (guardando) return;
    setMensaje(null);

    const personas = participantes.map(p=>p.trim()).filter(Boolean);

    if (!auditor || !fecha || !maquina || !tarea.trim() || !personas.length) {
      setMensaje({error:true,texto:"Completa auditor, fecha, máquina, tarea y al menos un colaborador."});
      return;
    }
    if (new Set(personas).size !== personas.length) {
      setMensaje({error:true,texto:"No repitas colaboradores en la misma auditoría."});
      return;
    }
    if (resultado.respondidas !== ITEMS.length) {
      setMensaje({error:true,texto:`Faltan ${ITEMS.length-resultado.respondidas} respuestas. Completa los 20 criterios.`});
      return;
    }
    const sinNota = ITEMS.find(x =>
      (respuestas[x.id] === "NO" || respuestas[x.id] === "NA") &&
      !notas[x.id]?.trim()
    );
    if (sinNota) {
      setMensaje({error:true,texto:`Escribe la observación o justificación de ${sinNota.id}.`});
      return;
    }

    const detalle = ITEMS.map(x => ({
      id:x.id, categoria:x.categoria, pregunta:x.pregunta,
      respuesta:respuestas[x.id], observacion:notas[x.id]?.trim() || ""
    }));

    const registro = {
      fecha_auditoria:fecha,
      auditor,
      usuario_registro:currentUser?.nombre || auditor,
      maquina,
      colaboradores:personas,
      tarea:tarea.trim(),
      respuestas:detalle,
      observaciones:observaciones.trim() || null,
      cumplimiento_personas:resultado.categorias.personas.porcentaje,
      cumplimiento_condiciones:resultado.categorias.condiciones.porcentaje,
      cumplimiento_procedimientos:resultado.categorias.procedimientos.porcentaje,
      cumplimiento_global:resultado.porcentaje
    };

    setGuardando(true);
    let id = auditoriaGuardada?.id;

    try {
      if (!id) {
        const { data, error } = await supabase
          .from("auditorias_cep")
          .insert(registro)
          .select("id")
          .single();

        if (error) throw error;
        id = data.id;
        setAuditoriaGuardada({ id });
      }

      const nc = detalle.filter(x=>x.respuesta==="NO");

      if (nc.length) {
        const prefijo = `CEP [${id}]`;

        const { data: existentes, error: lecturaError } = await supabase
          .from("plan_accion")
          .select("hallazgo")
          .eq("origen","Auditoría CEP")
          .ilike("hallazgo",`${prefijo}%`);

        if (lecturaError) throw lecturaError;

        const ids = new Set(
          (existentes||[])
            .map(x=>String(x.hallazgo||"").match(/\] \[([^\]]+)\]/)?.[1])
            .filter(Boolean)
        );

        const nuevas = nc
          .filter(x=>!ids.has(x.id))
          .map(x=>({
            origen:"Auditoría CEP",
            pilar:"Seguridad",
            auditor,
            maquina,
            hallazgo:`${prefijo} [${x.id}]: ${x.pregunta} | Observación: ${x.observacion}`,
            que:null,
            como:null,
            responsable:null,
            fecha_compromiso:null,
            estado:"Sin planificar",
            fecha_cierre:null
          }));

        if (nuevas.length) {
          const { error: accionError } = await supabase
            .from("plan_accion")
            .insert(nuevas);

          if (accionError) throw accionError;
        }
      }

      reiniciar();
      setAuditoriaGuardada(null);
      setMensaje({
        error:false,
        texto:`Auditoría CEP guardada. ${nc.length} no conformidad(es) registradas en Plan de Acción.`
      });
    } catch(error) {
      setMensaje({
        error:true,
        texto:id
          ? `La auditoría quedó guardada, pero ocurrió un error al enviar las NC: ${error.message}. Pulsa Guardar nuevamente para reintentar.`
          : `Error al guardar auditoría: ${error.message}`
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{maxWidth:1040,margin:"0 auto",paddingBottom:50}}>
      {onBack && (
        <button type="button" onClick={onBack}
          style={{border:0,background:"transparent",color:"#2563eb",fontWeight:700,display:"flex",alignItems:"center",gap:7,cursor:"pointer",marginBottom:15}}>
          <ArrowLeft size={18}/> Volver a Auditorías
        </button>
      )}

      <header style={{background:"linear-gradient(135deg,#0f172a,#1d4ed8)",color:"white",borderRadius:16,padding:26,marginBottom:22}}>
        <ShieldCheck size={31}/>
        <h1 style={{margin:"10px 0 5px",fontSize:26}}>Auditoría de Control de Energías Peligrosas</h1>
        <p style={{margin:0,opacity:.85}}>Planta Transmetal · Personas · Condiciones · Procedimientos</p>
      </header>

      <form onSubmit={guardar} style={{display:"flex",flexDirection:"column",gap:20}}>
        <section style={tarjeta}>
          <h2 style={{marginTop:0}}>Datos generales</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
            <div>
              <label style={etiqueta}>Auditor *</label>
              <select style={campo} value={auditorOtro?"otro":"actual"}
                onChange={e=>setAuditorOtro(e.target.value==="otro")}>
                <option value="actual">{currentUser?.nombre || "Usuario no identificado"}</option>
                <option value="otro">Otro auditor</option>
              </select>
              {auditorOtro && (
                <input required style={{...campo,marginTop:8}}
                  placeholder="Nombre del auditor" value={nombreOtro}
                  onChange={e=>setNombreOtro(e.target.value)}/>
              )}
            </div>
            <div>
              <label style={etiqueta}>Fecha de auditoría *</label>
              <input required type="date" style={campo} value={fecha}
                onChange={e=>setFecha(e.target.value)}/>
            </div>
            <div>
              <label style={etiqueta}>Máquina *</label>
              <select required style={campo} value={maquina}
                onChange={e=>setMaquina(e.target.value)}>
                <option value="">Seleccionar máquina</option>
                {MAQUINAS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div style={{marginTop:16}}>
            <label style={etiqueta}>Colaboradores involucrados *</label>
            {participantes.map((p,i)=>(
              <div key={i} style={{display:"flex",gap:9,marginBottom:9}}>
                <select style={{...campo,flex:1}} value={p}
                  onChange={e=>cambiarParticipante(i,e.target.value)}>
                  <option value="">Seleccionar colaborador</option>
                  {colaboradores.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                {participantes.length>1 && (
                  <button type="button" aria-label="Quitar colaborador"
                    onClick={()=>setParticipantes(a=>a.filter((_,j)=>j!==i))}
                    style={{border:"1px solid #fecaca",background:"#fff1f2",color:"#be123c",borderRadius:8,cursor:"pointer"}}>
                    <Trash2 size={18}/>
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={()=>setParticipantes(a=>[...a,""])}
              style={{border:"1px solid #bfdbfe",background:"#eff6ff",padding:"9px 12px",borderRadius:8,color:"#1d4ed8",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <Plus size={16}/> Agregar colaborador
            </button>
          </div>

          <div style={{marginTop:16}}>
            <label style={etiqueta}>Tarea que se realiza *</label>
            <textarea required style={campo} rows={3} value={tarea}
              onChange={e=>setTarea(e.target.value)}
              placeholder="Describe la intervención..."/>
          </div>
        </section>

        <div style={{...tarjeta,background:"#eff6ff",borderColor:"#bfdbfe"}}>
          <strong>Avance de auditoría: {resultado.respondidas} de 20 preguntas</strong>
          <div style={{height:9,background:"#dbeafe",borderRadius:10,marginTop:10,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${resultado.respondidas/20*100}%`,background:"#2563eb",transition:"width .2s"}}/>
          </div>
        </div>

        {SECCIONES.map(sec=>(
          <section key={sec.id} style={tarjeta}>
            <h2 style={{margin:"0 0 6px"}}>
              {sec.titulo}{" "}
              <span style={{fontSize:14,color:"#64748b"}}>({sec.preguntas.length} criterios)</span>
            </h2>
            <p style={{fontSize:14,color:"#475569",margin:"0 0 14px"}}>
              Cumplimiento: {resultado.categorias[sec.id].porcentaje===null?"—":`${resultado.categorias[sec.id].porcentaje}%`}
              {" · "} Respondidas: {resultado.categorias[sec.id].respondidas}/{sec.preguntas.length}
            </p>

            {ITEMS.filter(x=>x.categoria===sec.id).map(item=>(
              <div key={item.id} style={{borderTop:"1px solid #e2e8f0",padding:"17px 0"}}>
                <div style={{fontWeight:650,lineHeight:1.5,marginBottom:12}}>
                  <span style={{color:"#2563eb"}}>{item.id}.</span> {item.pregunta}
                </div>

                <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
                  {["SI","NO",...(item.admiteNA?["NA"]:[])].map(op=>(
                    <button key={op} type="button"
                      aria-pressed={respuestas[item.id]===op}
                      onClick={()=>cambiarRespuesta(item.id,op)}
                      style={buttonStyle(respuestas[item.id]===op,op)}>
                      {op==="SI"?"Sí":op==="NO"?"No":"N/A"}
                    </button>
                  ))}
                </div>

                {(respuestas[item.id]==="NO" || respuestas[item.id]==="NA") && (
                  <div style={{marginTop:12}}>
                    <label style={etiqueta}>
                      {respuestas[item.id]==="NO"
                        ? "Descripción del incumplimiento *"
                        : "Justificación de no aplica *"}
                    </label>
                    <textarea required style={campo} rows={2}
                      value={notas[item.id]||""}
                      onChange={e=>setNotas(prev=>({...prev,[item.id]:e.target.value}))}
                      placeholder="Escribe aquí la observación..."/>
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}

        <section style={tarjeta}>
          <h2 style={{marginTop:0}}>Observaciones generales</h2>
          <textarea style={campo} rows={4} value={observaciones}
            onChange={e=>setObservaciones(e.target.value)}
            placeholder="Comentarios adicionales (sin fotografías)..."/>
        </section>

        <section style={tarjeta}>
          <h2 style={{marginTop:0}}>Resultado de la auditoría</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>
            {SECCIONES.map(sec=>(
              <div key={sec.id} style={{background:"#f8fafc",borderRadius:10,padding:15}}>
                <small style={{color:"#64748b"}}>{sec.titulo}</small>
                <div style={{fontSize:24,fontWeight:800}}>
                  {resultado.categorias[sec.id].porcentaje===null
                    ? "—"
                    : `${resultado.categorias[sec.id].porcentaje}%`}
                </div>
              </div>
            ))}
          </div>

          <p style={{fontSize:18,fontWeight:700,marginBottom:6}}>
            Cumplimiento global: {resultado.porcentaje===null?"—":`${resultado.porcentaje}%`}
          </p>
          <p style={{color:"#475569",margin:0}}>
            Conformes: {resultado.si} · No conformes: {resultado.no} · No aplica: {resultado.categorias.condiciones.na}
          </p>
          <p style={{fontSize:13,color:"#64748b"}}>
            Los porcentajes se calculan sobre criterios aplicables respondidos.
            Los incumplimientos críticos deben atenderse independientemente del porcentaje.
          </p>
        </section>

        {mensaje && (
          <div role="status" style={{
            padding:14,borderRadius:9,
            background:mensaje.error?"#fef2f2":"#f0fdf4",
            color:mensaje.error?"#991b1b":"#166534"
          }}>
            {mensaje.texto}
          </div>
        )}

        <button type="submit" disabled={guardando}
          style={{
            padding:15,border:0,borderRadius:10,
            background:guardando?"#94a3b8":"#1d4ed8",
            color:"white",fontSize:16,fontWeight:700,
            display:"flex",gap:9,alignItems:"center",
            justifyContent:"center",cursor:guardando?"wait":"pointer"
          }}>
          {guardando?<Save size={18}/>:<CheckCircle2 size={18}/>}
          {guardando?"Guardando...":"Guardar auditoría y enviar NC"}
        </button>
      </form>
    </div>
  );
}
