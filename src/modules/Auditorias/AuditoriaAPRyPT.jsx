import React, { useMemo, useState } from "react";
import { ArrowLeft, ClipboardCheck, Save, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase.js";

// Ruta del archivo: src/modules/Auditorias/AuditoriaAPRyPT.jsx
// Compatible con public.auditorias_apr_pt y public.plan_accion.
// Los IDs se mantienen estables para asociar hallazgos con sus criterios.
const SECCIONES = [
  {
    id: "apr", titulo: "PUNTOS DE VERIFICACIÓN SOBRE CALIDAD DE LLENADO DE APR:",
    preguntas: [
      ["APR6", "¿Se llenó el encabezado y no hay campos vacíos?"],
      ["APR7", "¿Se completó el EPP requerido y principales peligros asociados?"],
      ["APR8", "¿Se llenó el check list de “Planificación del trabajo” y no hay campos vacíos?"],
      ["APR9", "¿Tiene los nombres, áreas y firmas de los ejecutantes?"],
      ["APR10", "¿Tiene nombre y firma del emisor, aprobador y responsable de la tarea?"],
      ["APR11", "¿La tarea se desglosó en actividades?"],
      ["APR12", "¿Se considera en las actividades el ingreso, traslado de herramienta y orden y limpieza al finalizar la tarea?"],
      ["APR13", "¿Se establecieron medidas preventivas para cada riesgo potencial identificado?"],
    ],
  },
  {
    id: "ejecucion", titulo: "PUNTOS DE VERIFICACIÓN EN EJECUCIÓN (SI APLICA)",
    preguntas: [
      ["E14", "¿El emisor del trabajo está en el área de ejecución?", true],
      ["E15", "¿Los involucrados en la tarea demuestran conocimiento de los riesgos potenciales y medidas preventivas identificadas en el APR?", true],
      ["E16", "¿Se cumplen las medidas preventivas identificadas en el APR?", true],
      ["E17", "¿Se realizó la visita al área del trabajo por parte del aprobador? (Por entrevista)", true],
    ],
  },
  {
    id: "pt", titulo: "PUNTOS DE VERIFICACIÓN DE DATOS GENERALES DEL PERMISO DE TRABAJO PT",
    preguntas: [
      ["PT21", "¿Se llenó el encabezado de datos generales y no hay campos vacíos?"],
      ["PT22", "¿Se evaluó o analizó los riesgos asociados de la tarea?"],
      ["PT23", "¿Se completó el EPP requerido?"],
      ["PT24", "¿Se seleccionó las medidas preventivas para ejecutar la tarea?"],
      ["PT25", "¿Se tomaron las medidas preventivas específicas en las tareas de alto riesgo?"],
      ["PT26", "¿Se identificaron y establecieron medidas de los tipo de energía?"],
      ["PT27", "¿Cuenta con firmas de emisor, aprobador y responsable de la tarea?"],
      ["PT28", "¿Cuenta con las firmas de los ejecutantes de la tarea?"],
    ],
  },
  {
    id: "alto_riesgo", titulo: "PUNTOS DE VERIFICACIÓN DE LAS MEDIDAS PREVENTIVAS EN LAS TAREAS DE ALTO RIESGO",
    preguntas: [
      ["AR29", "Trabajos con fuentes de energía", true],
      ["AR30", "Trabajos en caliente", true],
      ["AR31", "Trabajos en altura", true],
      ["AR32", "Trabajos con productos químicos", true],
      ["AR33", "Trabajos de excavaciones y perforaciones", true],
      ["AR34", "Trabajos de izamiento", true],
      ["AR35", "Trabajos en espacios confinados", true],
      ["AR36", "Trabajos con fuentes radioactivas", true],
      ["AR37", "¿En caso de intervenir fuentes de energía, cumplió con los 6 pasos de bloqueo?", true, true],
    ],
  },
];
const EXTRA_DURACION = {
  id: "E18B", categoria: "ejecucion",
  pregunta: "¿Se evidencia la lectura nuevamente del APR en el cuadernillo de los diálogos?",
  admiteNA: false, respuestaBinaria: false,
};
const ITEMS = SECCIONES.flatMap((s) => s.preguntas.map(([id, pregunta, admiteNA = false, respuestaBinaria = false]) => ({
  id, categoria: s.id, pregunta, admiteNA, respuestaBinaria,
})));
const HOY = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const campo = {
  width: "100%", padding: "11px 12px", border: "1px solid #cbd5e1",
  borderRadius: 9, boxSizing: "border-box", fontSize: 15,
  background: "#fff", color: "#0f172a",
};
const etiqueta = { display: "block", fontSize: 14, fontWeight: 700, marginBottom: 7, color: "#334155" };
const tarjeta = { background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20 };
const opciones = (item) => item.respuestaBinaria
  ? [["SI", "Sí"], ["NO", "No"], ["NA", "No aplica"]]
  : [["SI", "Conforme"], ["NO", "No conforme"], ...(item.admiteNA ? [["NA", "No aplica"]] : [])];
const botonRespuesta = (activo, valor) => ({
  cursor: "pointer", padding: "9px 14px", borderRadius: 9, fontWeight: 700,
  border: `1px solid ${activo ? (valor === "SI" ? "#059669" : valor === "NO" ? "#dc2626" : "#64748b") : "#cbd5e1"}`,
  background: activo ? (valor === "SI" ? "#d1fae5" : valor === "NO" ? "#fee2e2" : "#e2e8f0") : "white",
  color: "#0f172a",
});
const porcentaje = (si, no) => si + no > 0 ? Math.round(si / (si + no) * 10000) / 100 : null;
const codigoVisible = (id) => ({ E18B: "18.b" })[id] || id.replace(/^(APR|PT|AR|E)/, "");
const nombreUsuario = (user) => {
  if (typeof user === "string") return user;
  return user?.nombre || user?.name || "";
};

export default function AuditoriaAPRyPT({ currentUser, onBack }) {
  const [fecha, setFecha] = useState(HOY);
  const [seccionTaller, setSeccionTaller] = useState("");
  const [encargado, setEncargado] = useState("");
  const [nombreTarea, setNombreTarea] = useState("");
  const [auditorOtro, setAuditorOtro] = useState(false);
  const [nombreOtro, setNombreOtro] = useState("");
  const [masUnDia, setMasUnDia] = useState(null);
  const [requierePT, setRequierePT] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [notas, setNotas] = useState({});
  const [comentarios, setComentarios] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  // Si se guardó la auditoría pero falló el Plan de Acción, reintentar SIN duplicar la auditoría.
  const [pendienteAcciones, setPendienteAcciones] = useState(null);

  let usuario = nombreUsuario(currentUser);
  if (!usuario) {
    try { usuario = nombreUsuario(JSON.parse(localStorage.getItem("gdr_user") || "null")); }
    catch { /* Sesión local ausente o dañada */ }
  }
  const auditor = auditorOtro ? nombreOtro.trim() : usuario;

  const itemsVisibles = useMemo(() => [
    ...ITEMS.filter((x) => x.categoria === "apr" || x.categoria === "ejecucion"),
    ...(masUnDia === true ? [EXTRA_DURACION] : []),
    ...(requierePT === true ? ITEMS.filter((x) => x.categoria === "pt" || x.categoria === "alto_riesgo") : []),
  ], [masUnDia, requierePT]);

  const resultado = useMemo(() => {
    const categorias = {};
    for (const seccion of SECCIONES) {
      const delGrupo = itemsVisibles.filter((x) => x.categoria === seccion.id);
      const valores = delGrupo.map((x) => respuestas[x.id]);
      const si = valores.filter((x) => x === "SI").length;
      const no = valores.filter((x) => x === "NO").length;
      const na = valores.filter((x) => x === "NA").length;
      categorias[seccion.id] = {
        si, no, na, total: delGrupo.length,
        contestadas: si + no + na, porcentaje: porcentaje(si, no),
      };
    }
    const si = Object.values(categorias).reduce((n, x) => n + x.si, 0);
    const no = Object.values(categorias).reduce((n, x) => n + x.no, 0);
    const na = Object.values(categorias).reduce((n, x) => n + x.na, 0);
    return {
      categorias, si, no, na,
      contestadas: si + no + na,
      total: itemsVisibles.length,
      global: porcentaje(si, no),
    };
  }, [itemsVisibles, respuestas]);

  function limpiar() {
    setFecha(HOY()); setSeccionTaller(""); setEncargado(""); setNombreTarea("");
    setAuditorOtro(false); setNombreOtro(""); setMasUnDia(null);
    setRequierePT(null); setRespuestas({}); setNotas({}); setComentarios("");
    setPendienteAcciones(null);
  }

  function cambiar(id, valor) {
    setRespuestas((prev) => ({ ...prev, [id]: valor }));
    setMensaje(null);
  }

  // Recupera acciones existentes antes de insertar, para evitar duplicados al reintentar.
  async function enviarPlanAccion(auditoria) {
    const noConformes = (auditoria.respuestas || []).filter((r) => r.respuesta === "NO");
    if (!noConformes.length) return 0;
    const prefijo = `APR-PT [${auditoria.id}]`;
    const { data: existentes, error: errorLectura } = await supabase
      .from("plan_accion")
      .select("id, hallazgo")
      .eq("origen", "Auditoría APR-PT")
      .ilike("hallazgo", `${prefijo}%`);
    if (errorLectura) throw errorLectura;
    const idsExistentes = new Set((existentes || []).map((r) => {
      const match = String(r.hallazgo || "").match(/\] \[([^\]]+)\]/);
      return match?.[1];
    }).filter(Boolean));
    const nuevas = noConformes.filter((r) => !idsExistentes.has(r.id));
    if (nuevas.length) {
      const registros = nuevas.map((r) => ({
        origen: "Auditoría APR-PT",
        pilar: "Seguridad",
        auditor: auditoria.auditor,
        maquina: auditoria.seccion_taller,
        hallazgo: `${prefijo} [${r.id}]: ${r.pregunta} | Observación: ${r.observacion}`,
        que: null, como: null, responsable: null,
        fecha_compromiso: null, estado: "Pendiente", fecha_cierre: null,
      }));
      const { error } = await supabase.from("plan_accion").insert(registros);
      if (error) throw error;
    }
    return noConformes.length;
  }

  async function guardar(event) {
    event.preventDefault();
    if (guardando) return;
    setMensaje(null);
    setGuardando(true);
    try {
      if (pendienteAcciones) {
        const total = await enviarPlanAccion(pendienteAcciones);
        limpiar();
        setMensaje({ error: false, texto: `¡Listo! Se completó el envío de ${total} no conformidad(es) al Plan de Acción, sin duplicar la auditoría.` });
        return;
      }
      if (!auditor || !usuario || !fecha || !seccionTaller.trim() || !encargado.trim() || !nombreTarea.trim()) {
        throw new Error("Completa sección/taller, encargado, auditor, fecha y tarea del APR.");
      }
      if (masUnDia === null || requierePT === null) {
        throw new Error("Indica si la tarea dura más de un día y si requiere Permiso de Trabajo.");
      }
      const falta = itemsVisibles.find((x) => !respuestas[x.id]);
      if (falta) throw new Error(`Falta responder el criterio ${codigoVisible(falta.id)}.`);
      const faltaNota = itemsVisibles.find((x) =>
        (respuestas[x.id] === "NO" || respuestas[x.id] === "NA") && !notas[x.id]?.trim()
      );
      if (faltaNota) throw new Error(`Agrega una observación o justificación para el criterio ${codigoVisible(faltaNota.id)}.`);

      const detalle = itemsVisibles.map((x) => ({
        id: x.id, categoria: x.categoria, pregunta: x.pregunta,
        respuesta: respuestas[x.id], observacion: (notas[x.id] || "").trim(),
      }));
      const registro = {
        fecha_auditoria: fecha,
        auditor,
        usuario_registro: usuario,
        seccion_taller: seccionTaller.trim(),
        encargado: encargado.trim(),
        nombre_tarea: nombreTarea.trim(),
        tarea_mas_un_dia: masUnDia,
        requiere_pt: requierePT,
        respuestas: detalle,
        comentarios_apr: comentarios.trim() || null,
        cumplimiento_apr: resultado.categorias.apr.porcentaje,
        cumplimiento_ejecucion: resultado.categorias.ejecucion.porcentaje,
        cumplimiento_pt: resultado.categorias.pt.porcentaje,
        cumplimiento_alto_riesgo: resultado.categorias.alto_riesgo.porcentaje,
        cumplimiento_global: resultado.global,
      };
      const { data, error } = await supabase.from("auditorias_apr_pt")
        .insert(registro).select("id").single();
      if (error) throw error;
      if (!data?.id) throw new Error("No se recibió el ID de la auditoría guardada.");
      const auditoriaGuardada = { ...registro, id: data.id };
      // Marcamos el registro como guardado ANTES de enviar acciones: un reintento no duplica la auditoría.
      setPendienteAcciones(auditoriaGuardada);
      try {
        const total = await enviarPlanAccion(auditoriaGuardada);
        limpiar();
        setMensaje({ error: false, texto: `Auditoría APR y PT guardada correctamente. ${total} no conformidad(es) vinculada(s) al Plan de Acción.` });
      } catch (errorAcciones) {
        setMensaje({ error: true, texto: `La auditoría SÍ se guardó, pero falló el envío al Plan de Acción: ${errorAcciones.message}. Presiona “Reintentar envío” para completar las acciones sin duplicar la auditoría.` });
      }
    } catch (error) {
      setMensaje({ error: true, texto: `No se pudo completar el guardado: ${error.message || String(error)}` });
    } finally {
      setGuardando(false);
    }
  }

  function mostrarPregunta(item) {
    const elegida = respuestas[item.id];
    return (
      <div key={item.id} style={{ borderTop: "1px solid #e2e8f0", padding: "17px 0" }}>
        <div style={{ fontWeight: 650, lineHeight: 1.5, marginBottom: 12 }}>
          <span style={{ color: "#2563eb" }}>{codigoVisible(item.id)}.</span> {item.pregunta}
        </div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          {opciones(item).map(([valor, nombre]) => (
            <button key={valor} type="button" aria-pressed={elegida === valor}
              onClick={() => cambiar(item.id, valor)} style={botonRespuesta(elegida === valor, valor)}>
              {nombre}
            </button>
          ))}
        </div>
        {(elegida === "NO" || elegida === "NA") && (
          <div style={{ marginTop: 12 }}>
            <label style={etiqueta}>{elegida === "NO" ? "Descripción del hallazgo *" : "Justificación de No aplica *"}</label>
            <textarea required rows={2} style={campo} value={notas[item.id] || ""}
              onChange={(e) => setNotas((prev) => ({ ...prev, [item.id]: e.target.value }))}
              placeholder="Describe el hallazgo o el motivo de No aplica..." />
          </div>
        )}
      </div>
    );
  }

  function mostrarSeccion(seccion) {
    const visibles = itemsVisibles.filter((x) => x.categoria === seccion.id && x.id !== "E18B");
    if (!visibles.length) return null;
    const resumen = resultado.categorias[seccion.id];
    return (
      <section key={seccion.id} style={tarjeta}>
        <h2 style={{ margin: "0 0 8px", fontSize: 19, lineHeight: 1.4 }}>{seccion.titulo}</h2>
        <p style={{ margin: "0 0 14px", fontSize: 14, color: "#475569" }}>
          Respondidas: {resumen.contestadas}/{resumen.total} · Cumplimiento: {resumen.porcentaje === null ? "—" : `${resumen.porcentaje}%`}
        </p>
        {visibles.map(mostrarPregunta)}
      </section>
    );
  }

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", paddingBottom: 50 }}>
      {onBack && <button type="button" onClick={onBack}
        style={{ border: 0, background: "transparent", color: "#2563eb", fontWeight: 700, display: "flex", alignItems: "center", gap: 7, cursor: "pointer", marginBottom: 15 }}>
        <ArrowLeft size={18} /> Volver a Auditorías
      </button>}
      <header style={{ background: "linear-gradient(135deg,#0f172a,#1d4ed8)", color: "white", borderRadius: 16, padding: 26, marginBottom: 22 }}>
        <ClipboardCheck size={31} />
        <h1 style={{ margin: "10px 0 5px", fontSize: 26 }}>AUDITORÍA DE APR Y PT TRANSMETAL</h1>
        <p style={{ margin: 0, opacity: 0.85 }}>Análisis Previo de Riesgos · Permiso de Trabajo</p>
      </header>
      <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <section style={tarjeta}>
          <h2 style={{ marginTop: 0 }}>Datos generales</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(225px,1fr))", gap: 16 }}>
            <div><label style={etiqueta}>Sección/Taller donde se revisarán los APR *</label>
              <input required style={campo} value={seccionTaller} onChange={(e) => setSeccionTaller(e.target.value)} placeholder="Ej. Taller de mantenimiento" /></div>
            <div><label style={etiqueta}>Encargado de la sección/taller *</label>
              <input required style={campo} value={encargado} onChange={(e) => setEncargado(e.target.value)} placeholder="Nombre del encargado" /></div>
            <div><label style={etiqueta}>Auditor *</label>
              <select style={campo} value={auditorOtro ? "otro" : "actual"} onChange={(e) => setAuditorOtro(e.target.value === "otro")}>
                <option value="actual">{usuario || "Usuario no identificado"}</option>
                <option value="otro">Otro auditor</option>
              </select>
              {auditorOtro && <input required style={{ ...campo, marginTop: 8 }} value={nombreOtro} onChange={(e) => setNombreOtro(e.target.value)} placeholder="Nombre del auditor" />}
            </div>
            <div><label style={etiqueta}>Fecha *</label>
              <input type="date" required style={campo} value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          </div>
          <div style={{ marginTop: 16 }}><label style={etiqueta}>Nombre de la tarea del APR a evaluar *</label>
            <textarea required rows={2} style={campo} value={nombreTarea} onChange={(e) => setNombreTarea(e.target.value)} placeholder="Describe la tarea..." /></div>
        </section>

        <section style={{ ...tarjeta, background: "#eff6ff", borderColor: "#bfdbfe" }}>
          <strong>Avance: {resultado.contestadas} de {resultado.total} criterios visibles</strong>
          <div style={{ height: 9, background: "#dbeafe", borderRadius: 10, marginTop: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${resultado.total ? resultado.contestadas / resultado.total * 100 : 0}%`, background: "#2563eb", transition: "width .2s" }} />
          </div>
        </section>

        {mostrarSeccion(SECCIONES[0])}
        {mostrarSeccion(SECCIONES[1])}

        <section style={tarjeta}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>18. ¿La duración de la tarea es de más de 1 día? *</div>
          <div style={{ display: "flex", gap: 9 }}>
            {[[true, "Sí"], [false, "No"]].map(([valor, texto]) => (
              <button key={texto} type="button" aria-pressed={masUnDia === valor}
                onClick={() => { setMasUnDia(valor); setMensaje(null); }}
                style={botonRespuesta(masUnDia === valor, valor ? "SI" : "NO")}>{texto}</button>
            ))}
          </div>
          {masUnDia === true && <div style={{ marginTop: 18 }}>{mostrarPregunta(EXTRA_DURACION)}</div>}
        </section>

        <section style={tarjeta}>
          <h2 style={{ marginTop: 0 }}>19. Comentarios sobre hallazgos encontrados en APR</h2>
          <textarea rows={3} style={campo} value={comentarios} onChange={(e) => setComentarios(e.target.value)} placeholder="Comentarios adicionales sobre los hallazgos del APR..." />
        </section>

        <section style={tarjeta}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>20. ¿Requiere permiso de Trabajo? *</div>
          <div style={{ display: "flex", gap: 9 }}>
            {[[true, "Sí"], [false, "No"]].map(([valor, texto]) => (
              <button key={texto} type="button" aria-pressed={requierePT === valor}
                onClick={() => { setRequierePT(valor); setMensaje(null); }}
                style={botonRespuesta(requierePT === valor, valor ? "SI" : "NO")}>{texto}</button>
            ))}
          </div>
          {requierePT === false && <p style={{ color: "#475569", marginBottom: 0, fontSize: 14 }}>Las secciones de PT y alto riesgo no aplican y no se incluyen en el cálculo.</p>}
        </section>

        {requierePT === true && <>{mostrarSeccion(SECCIONES[2])}{mostrarSeccion(SECCIONES[3])}</>}

        <section style={tarjeta}>
          <h2 style={{ marginTop: 0 }}>Resultados de la auditoría</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 12 }}>
            {SECCIONES.map((s) => {
              const c = resultado.categorias[s.id];
              return <div key={s.id} style={{ background: "#f8fafc", padding: 14, borderRadius: 10 }}>
                <small style={{ color: "#64748b" }}>{s.id === "apr" ? "Calidad de APR" : s.id === "ejecucion" ? "Ejecución" : s.id === "pt" ? "Datos del PT" : "Alto riesgo"}</small>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{c.porcentaje === null ? "—" : `${c.porcentaje}%`}</div>
              </div>;
            })}
          </div>
          <p style={{ fontWeight: 700, fontSize: 19 }}>Cumplimiento global: {resultado.global === null ? "—" : `${resultado.global}%`}</p>
          <p style={{ color: "#475569" }}>Conformes: {resultado.si} · No conformes: {resultado.no} · No aplica: {resultado.na}</p>
          <p style={{ fontSize: 13, color: "#64748b" }}>Los criterios No aplica no se incluyen en el denominador del cumplimiento. Cada No conforme se vincula al Plan de Acción.</p>
        </section>

        {mensaje && <div role="status" style={{ padding: 15, borderRadius: 9, background: mensaje.error ? "#fef2f2" : "#f0fdf4", color: mensaje.error ? "#991b1b" : "#166534", whiteSpace: "pre-wrap" }}>{mensaje.texto}</div>}
        <button type="submit" disabled={guardando} style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: 15, border: 0, borderRadius: 10, background: guardando ? "#94a3b8" : "#1d4ed8", color: "white", fontSize: 16, fontWeight: 700, cursor: guardando ? "wait" : "pointer" }}>
          {guardando ? <Save size={18} /> : <CheckCircle2 size={18} />}
          {guardando ? "Guardando..." : pendienteAcciones ? "Reintentar envío al Plan de Acción" : "Guardar auditoría APR y PT"}
        </button>
      </form>
    </div>
  );
}
