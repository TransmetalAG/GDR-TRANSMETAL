import React, { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Save, Plus, Trash2, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { catalogo } from "../../data/CatalogoMaquinas.js";
import { colaboradores } from "../../data/CatalogoColaboradores.js";

// IDs estables: se guardan junto a cada respuesta para permitir futuras versiones del checklist.
const SECCIONES = [
  { id: "personas", titulo: "PERSONAS", prefijo: "P", preguntas: [
    "¿Los colaboradores identificaron todas las fuentes de energía presentes en la máquina antes de su intervención? (Entrevistar)",
    "¿Los colaboradores conocen las energías residuales que pueden estar presentes en la máquina?",
    "¿Los colaboradores recibieron capacitación teórica y práctica en Control de Energías Peligrosas?",
    "¿Los colaboradores involucrados se encuentran libres de restricciones para participar en actividades relacionadas con el RC de CEP?",
    "¿Los colaboradores conocen que los bloqueos eléctricos desde la fuente deben ser realizados únicamente por electricistas autorizados?",
    "¿Los colaboradores conocen y pueden explicar correctamente los 6 pasos para el Control de Energías Peligrosas? (Entrevistar)"
  ]},
  { id: "condiciones", titulo: "CONDICIONES", prefijo: "C", preguntas: [
    "¿La etiqueta informativa de los 6 pasos para el CEP se encuentra instalada en un lugar visible y cercano a la máquina?",
    "¿Se cuenta con dispositivos adecuados para bloquear todas las fuentes de energía identificadas en la máquina?",
    "¿Se dispone de dispositivos para bloqueos múltiples cuando la intervención lo requiere?",
    "¿Los dispositivos de bloqueo, candados y etiquetas se encuentran en buenas condiciones de uso?",
    "¿La máquina cuenta con un estándar de bloqueo de energías peligrosas disponible para consulta en el lugar de trabajo?",
    "¿La máquina cuenta con puntos de aislamiento que permiten bloquear todas sus fuentes de energía peligrosa?"
  ]},
  { id: "procedimientos", titulo: "PROCEDIMIENTOS", prefijo: "PR", preguntas: [
    "¿La intervención cuenta con el Permiso de Trabajo correspondiente (validar CEP) y este se encuentra disponible en el lugar de trabajo?",
    "¿El Permiso de Trabajo está correctamente completado y cuenta con las firmas del emisor y aprobador?",
    "¿Todos los colaboradores que participan en la intervención están incluidos en el Permiso de Trabajo?",
    "¿Se completó correctamente la descripción de los 6 pasos para un trabajo seguro con energías (LOTO) en el reverso del Permiso de Trabajo?",
    "¿Se bloquearon todas las fuentes de energía mediante los dispositivos de bloqueo, candados y etiquetas correspondientes?",
    "¿Se liberaron o controlaron de forma segura las energías residuales antes de iniciar la intervención?",
    "¿Todos los participantes colocaron su candado y etiqueta de bloqueo conforme al procedimiento?",
    "¿Los colaboradores realizan el bloqueo conforme al estándar establecido para la máquina?"
  ]}
];
const ITEMS = SECCIONES.flatMap(s => s.preguntas.map((pregunta, index) => ({
  id: `${s.prefijo}${index + 1}`, categoria: s.id, pregunta,
  admiteNA: s.id === "condiciones" && index === 2
})));
const MAQUINAS = [...new Set(catalogo.map(x => x.maquina))].sort((a,b) => a.localeCompare(b, "es"));
const HOY = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const campo = { width:"100%", padding:"11px 12px", border:"1px solid #cbd5e1", borderRadius:9, boxSizing:"border-box", fontSize:15, background:"white", color:"#0f172a" };
const etiqueta = { display:"block", fontWeight:700, fontSize:14, marginBottom:7, color:"#334155" };
const tarjeta = { background:"white", border:"1px solid #e2e8f0", borderRadius:14, padding:20 };
const buttonStyle = (activo, tipo) => ({ border:`1px solid ${activo?(tipo==="SI"?"#059669":tipo==="NO"?"#dc2626":"#64748b"):"#cbd5e1"}`, background:activo?(tipo==="SI"?"#d1fae5":tipo==="NO"?"#fee2e2":"#e2e8f0"):"white", color:"#0f172a", borderRadius:8, padding:"9px 20px", fontWeight:700, cursor:"pointer" });

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
  const auditor = auditorOtro ? nombreOtro.trim() : (currentUser?.nombre || "");

  const resultado = useMemo(() => {
    const categorias = {};
    for (const s of SECCIONES) {
      const valores = ITEMS.filter(x => x.categoria === s.id).map(x => respuestas[x.id]);
      const si = valores.filter(x => x === "SI").length;
      const no = valores.filter(x => x === "NO").length;
      const na = valores.filter(x => x === "NA").length;
      categorias[s.id] = { si, no, na, respondidas: si+no+na, porcentaje: si+no ? Math.round(si/(si+no)*10000)/100 : null };
    }
    const si = Object.values(categorias).reduce((n,x)=>n+x.si,0);
    const no = Object.values(categorias).reduce((n,x)=>n+x.no,0);
    const respondidas = Object.values(categorias).reduce((n,x)=>n+x.respondidas,0);
    return { categorias, si, no, respondidas, porcentaje: si+no ? Math.round(si/(si+no)*10000)/100 : null };
  }, [respuestas]);

  const cambiarRespuesta = (id, valor) => {
    setRespuestas(prev => ({...prev, [id]:valor}));
    setMensaje(null);
  };
  const cambiarParticipante = (index, valor) => setParticipantes(prev => prev.map((p,i)=>i===index?valor:p));
  const reiniciar = () => {
    setFecha(HOY());setAuditorOtro(false);setNombreOtro("");setMaquina("");
    setParticipantes([""]);setTarea("");setRespuestas({});setNotas({});setObservaciones("");
  };

  async function guardar(event) {
    event.preventDefault();
    if (guardando) return;
    setMensaje(null);
    const personas = participantes.map(p=>p.trim()).filter(Boolean);
    if (!auditor || !fecha || !maquina || !tarea.trim() || !personas.length) {
      setMensaje({error:true,texto:"Completa auditor, fecha, máquina, tarea y al menos un colaborador."});return;
    }
