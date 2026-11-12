import React, { useMemo, useState } from "react";
import { ArrowLeft, ClipboardCheck, RotateCcw, Save } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { catalogo } from "../../data/CatalogoMaquinas.js";

// Ubicación: src/modules/Auditorias/AuditoriaPreusos.jsx
// Requiere public.auditorias_preusos y public.plan_accion.
const SECCIONES = [
  {
    nombre: "PUNTOS DE VERIFICACIÓN AL REVISAR EL FORMATO PREUSO",
    permiteNA: true,
    criterios: [
      ["PU01", "¿El documento se encuentra en un punto cercano a la máquina o herramienta?"],
      ["PU02", "¿El documento se encuentra actualizado al mes de uso?"],
      ["PU03", "¿El pre-uso se encuentra correctamente completado? (ítems conformes y no conformes marcados correctamente)"],
      ["PU04", "¿Las máquinas y/o herramientas con no conformidades críticas se encuentran bloqueadas para su utilización?"],
      ["PU05", "¿El pre-uso posee el nombre y firma de quien completó el documento?"],
      ["PU06", "¿Las no conformidades se tratan adecuadamente?"],
    ],
  },
  {
    nombre: "PREGUNTAS PARA ENTREVISTAR A COLABORADORES",
    permiteNA: false,
    criterios: [
      ["PU07", "¿Entienden los colaboradores la importancia del llenado del pre-uso?"],
      ["PU08", "¿Se tiene entendido quién es la persona encargada del llenado del pre-uso?"],
      ["PU09", "¿Fueron instruidos los colaboradores por el liderazgo sobre la forma en que se debe de llenar el pre-uso?"],
      ["PU10", "¿Los pre-usos se encuentran bien resguardados y accesibles?"],
    ],
  },
];

const CRITERIOS = SECCIONES.flatMap((seccion) =>
  seccion.criterios.map(([id, pregunta]) => ({ id, pregunta, categoria: seccion.nombre, permiteNA: seccion.permiteNA }))
);
const MAQUINAS = [...new Set((catalogo || [])
  .map((item) => typeof item === "string" ? item : item?.maquina)
  .filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));

function fechaLocal() {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}
function nombreUsuario(user) {
  return typeof user === "string" ? user : (user?.nombre || user?.name || "");
}
function porcentaje(respuestas) {
  const conformes = respuestas.filter((valor) => valor === "SI").length;
  const noConformes = respuestas.filter((valor) => valor === "NO").length;
  return conformes + noConformes ? Math.round((conformes * 10000) / (conformes + noConformes)) / 100 : null;
}
const campo = { width: "100%", padding: "11px 12px", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 9, fontSize: 15, background: "#fff", color: "#0f172a" };
const etiqueta = { display: "block", fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: 7 };
const tarjeta = { border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff", padding: 20, marginBottom: 18 };
function estiloOpcion(seleccionada, valor) {
  const color = valor === "SI" ? "#059669" : valor === "NO" ? "#dc2626" : "#64748b";
  return { borderRadius: 9, border: `1px solid ${seleccionada ? color : "#cbd5e1"}`, background: seleccionada ? (valor === "SI" ? "#d1fae5" : valor === "NO" ? "#fee2e2" : "#e2e8f0") : "#fff", color: "#0f172a", cursor: "pointer", padding: "9px 13px", fontWeight: 700, fontSize: 13 };
}

export default function AuditoriaPreusos({ currentUser, onBack }) {
  const [fecha, setFecha] = useState(fechaLocal);
  const [maquina, setMaquina] = useState("");
  const [seccionTaller, setSeccionTaller] = useState("");
  const [auditorOtro, setAuditorOtro] = useState(false);
  const [otroAuditor, setOtroAuditor] = useState("");
  const [respuestas, setRespuestas] = useState({});
  const [comentarios, setComentarios] = useState({});
  const [detallePreusos, setDetallePreusos] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [pendienteAcciones, setPendienteAcciones] = useState(null);

  let usuario = nombreUsuario(currentUser);
  if (!usuario) {
    try { usuario = nombreUsuario(JSON.parse(localStorage.getItem("gdr_user") || "null")); }
    catch { /* No existe una sesión local válida */ }
  }
  const auditor = auditorOtro ? otroAuditor.trim() : usuario;
  const resumen = useMemo(() => {
    const valores = CRITERIOS.map((criterio) => respuestas[criterio.id]);
    return {
      conformes: valores.filter((valor) => valor === "SI").length,
      noConformes: valores.filter((valor) => valor === "NO").length,
      noAplica: valores.filter((valor) => valor === "NA").length,
      contestadas: valores.filter(Boolean).length,
      global: porcentaje(valores),
      formato: porcentaje(CRITERIOS.slice(0, 6).map((c) => respuestas[c.id])),
      entrevista: porcentaje(CRITERIOS.slice(6).map((c) => respuestas[c.id])),
    };
  }, [respuestas]);

  function limpiar() {
    setFecha(fechaLocal()); setMaquina(""); setSeccionTaller("");
    setAuditorOtro(false); setOtroAuditor(""); setRespuestas({});
    setComentarios({}); setDetallePreusos(""); setPendienteAcciones(null);
  }

  // Reintentos: se buscan acciones ya creadas para no duplicar hallazgos.
  async function enviarAcciones(auditoria) {
    const hallazgos = auditoria.respuestas.filter((r) => r.respuesta === "NO");
    if (!hallazgos.length) return 0;
    const prefijo = `PREUSO [${auditoria.id}]`;
    const { data: existentes, error: errorConsulta } = await supabase
      .from("plan_accion")
      .select("id, hallazgo")
      .eq("origen", "Auditoría Pre-usos")
      .ilike("hallazgo", `${prefijo}%`);
    if (errorConsulta) throw errorConsulta;
    const codigosCreados = new Set((existentes || []).map((fila) =>
      String(fila.hallazgo || "").match(/\] \[([^\]]+)\]/)?.[1]
    ).filter(Boolean));
    const faltantes = hallazgos.filter((r) => !codigosCreados.has(r.id));
    if (faltantes.length) {
      const acciones = faltantes.map((r) => ({
        origen: "Auditoría Pre-usos",
        pilar: "Seguridad",
        auditor: auditoria.auditor,
        maquina: auditoria.maquina,
        hallazgo: `${prefijo} [${r.id}]: ${r.pregunta} | Observación: ${r.observacion}`,
        que: null,
        como: null,
        responsable: null,
        fecha_compromiso: null,
        estado: "Sin planificar",
        fecha_cierre: null,
      }));
      const { error } = await supabase.from("plan_accion").insert(acciones);
      if (error) throw error;
    }
    return hallazgos.length;
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setMensaje(null);
    try {
      if (pendienteAcciones) {
        const total = await enviarAcciones(pendienteAcciones);
        limpiar();
        setMensaje({ error: false, texto: `Envío al Plan de Acción completado. ${total} no conformidad(es) registrada(s) sin duplicar la auditoría.` });
        return;
      }
      if (!usuario || !auditor || !fecha || !maquina || !seccionTaller.trim()) {
        throw new Error("Completa fecha, máquina, sección/taller y auditor; verifica que hayas iniciado sesión en GDR.");
      }
      const pendiente = CRITERIOS.find((criterio) => !respuestas[criterio.id]);
      if (pendiente) throw new Error(`Falta responder el criterio ${pendiente.id}.`);
      const naNoPermitido = CRITERIOS.find((criterio) => !criterio.permiteNA && respuestas[criterio.id] === "NA");
      if (naNoPermitido) throw new Error(`El criterio ${naNoPermitido.id} no admite No aplica.`);
      const sinComentario = CRITERIOS.find((criterio) => respuestas[criterio.id] === "NO" && !comentarios[criterio.id]?.trim());
      if (sinComentario) throw new Error(`Escribe el comentario de la no conformidad ${sinComentario.id}.`);
      if (!detallePreusos.trim()) throw new Error("Detalla los pre-usos revisados en la pregunta 11.");

      const detalle = CRITERIOS.map((criterio) => ({
        id: criterio.id,
        categoria: criterio.categoria,
        pregunta: criterio.pregunta,
        respuesta: respuestas[criterio.id],
        observacion: respuestas[criterio.id] === "NO" ? comentarios[criterio.id].trim() : "",
      }));
      const registro = {
        fecha_auditoria: fecha,
        auditor,
        usuario_registro: usuario,
        maquina,
        seccion_taller: seccionTaller.trim(),
        respuestas: detalle,
        detalle_preusos: detallePreusos.trim(),
        total_conformes: resumen.conformes,
        total_no_conformes: resumen.noConformes,
        total_no_aplica: resumen.noAplica,
        cumplimiento_formato: resumen.formato,
        cumplimiento_entrevista: resumen.entrevista,
        cumplimiento_global: resumen.global,
      };
      const { data, error } = await supabase.from("auditorias_preusos")
        .insert(registro).select("id").single();
      if (error) throw error;
      if (!data?.id) throw new Error("El registro se guardó, pero no se recibió su identificador. Revisa Supabase antes de reintentar.");

      const guardada = { ...registro, id: data.id };
      setPendienteAcciones(guardada);
      try {
        const total = await enviarAcciones(guardada);
        limpiar();
        setMensaje({ error: false, texto: `Auditoría guardada correctamente. ${total} no conformidad(es) enviada(s) al Plan de Acción.` });
      } catch (errorAcciones) {
        setMensaje({ error: true, texto: `La auditoría SÍ se guardó, pero no se pudieron enviar todos los hallazgos: ${errorAcciones.message}. Usa “Reintentar envío al Plan de Acción” para completar sin duplicar auditoría.` });
      }
    } catch (error) {
      setMensaje({ error: true, texto: `No se pudo completar el guardado: ${error.message || String(error)}` });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 45, color: "#0f172a" }}>
      <button type="button" onClick={() => onBack?.()} style={{ display: "flex", gap: 8, alignItems: "center", border: 0, background: "transparent", color: "#2563eb", fontWeight: 700, cursor: "pointer", marginBottom: 15 }}>
        <ArrowLeft size={18} /> Volver a Auditorías
      </button>
      <header style={{ background: "linear-gradient(135deg, #0f172a, #1d4ed8)", color: "#fff", padding: 25, borderRadius: 16, marginBottom: 20 }}>
        <ClipboardCheck size={32} />
        <h1 style={{ margin: "10px 0 7px", fontSize: 25 }}>Auditoría Pre-usos Transmetal</h1>
        <p style={{ margin: 0, opacity: 0.85 }}>Verificación documental y entrevista a colaboradores</p>
      </header>

      <form onSubmit={guardar}>
        <section style={tarjeta}>
          <h2 style={{ marginTop: 0, fontSize: 19 }}>DATOS GENERALES</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(235px, 1fr))", gap: 17 }}>
            <div>
              <label style={etiqueta} htmlFor="pu-fecha">Fecha *</label>
              <input id="pu-fecha" type="date" required style={campo} value={fecha} disabled={!!pendienteAcciones} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div>
              <label style={etiqueta} htmlFor="pu-maquina">Máquina *</label>
              <select id="pu-maquina" required style={campo} value={maquina} disabled={!!pendienteAcciones} onChange={(e) => setMaquina(e.target.value)}>
                <option value="">Seleccionar máquina</option>
                {MAQUINAS.map((valor) => <option key={valor} value={valor}>{valor}</option>)}
              </select>
            </div>
            <div>
              <label style={etiqueta} htmlFor="pu-seccion">Sección / Taller *</label>
              <input id="pu-seccion" style={campo} required placeholder="Nombre de la sección o taller" value={seccionTaller} disabled={!!pendienteAcciones} onChange={(e) => setSeccionTaller(e.target.value)} />
            </div>
            <div>
              <label style={etiqueta} htmlFor="pu-auditor">Auditor *</label>
              <select id="pu-auditor" style={campo} disabled={!!pendienteAcciones} value={auditorOtro ? "otro" : "actual"} onChange={(e) => setAuditorOtro(e.target.value === "otro")}>
                <option value="actual">{usuario || "Usuario no identificado"}</option>
                <option value="otro">Otro auditor</option>
              </select>
              {auditorOtro && <input aria-label="Nombre de otro auditor" required style={{ ...campo, marginTop: 8 }} placeholder="Nombre del auditor" value={otroAuditor} disabled={!!pendienteAcciones} onChange={(e) => setOtroAuditor(e.target.value)} />}
            </div>
          </div>
        </section>

        {SECCIONES.map((seccion) => (
          <section key={seccion.nombre} style={tarjeta}>
            <h2 style={{ marginTop: 0, fontSize: 19 }}>{seccion.nombre}</h2>
            {seccion.criterios.map(([id, pregunta]) => (
              <div key={id} style={{ padding: "17px 0", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 700, lineHeight: 1.5, marginBottom: 12 }}>{Number(id.slice(-2))}. {pregunta}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {[["SI", "Conforme"], ["NO", "No conforme"], ...(seccion.permiteNA ? [["NA", "No aplica"]] : [])].map(([valor, nombre]) => (
                    <button type="button" key={valor} disabled={!!pendienteAcciones} aria-pressed={respuestas[id] === valor}
                      onClick={() => { setRespuestas((prev) => ({ ...prev, [id]: valor })); setMensaje(null); }}
                      style={{ ...estiloOpcion(respuestas[id] === valor, valor), opacity: pendienteAcciones ? 0.65 : 1 }}>
                      {nombre}
                    </button>
                  ))}
                </div>
                {respuestas[id] === "NO" && (
                  <div style={{ marginTop: 12 }}>
                    <label htmlFor={`pu-comentario-${id}`} style={etiqueta}>Comentario de la no conformidad *</label>
                    <textarea id={`pu-comentario-${id}`} style={{ ...campo, minHeight: 75, resize: "vertical" }}
                      disabled={!!pendienteAcciones} value={comentarios[id] || ""} onChange={(e) => setComentarios((prev) => ({ ...prev, [id]: e.target.value }))}
                      placeholder="Describe el hallazgo..." />
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}

        <section style={tarjeta}>
          <h2 style={{ marginTop: 0, fontSize: 19 }}>DETALLE DE LOS PRE-USOS REVISADOS</h2>
          <label htmlFor="pu-detalle" style={etiqueta}>11. Detalle los pre-usos que revisó *</label>
          <textarea id="pu-detalle" required style={{ ...campo, minHeight: 105, resize: "vertical" }}
            disabled={!!pendienteAcciones} value={detallePreusos} onChange={(e) => setDetallePreusos(e.target.value)}
            placeholder="Nombre, código o identificación de los pre-usos revisados..." />
        </section>

        <section style={tarjeta}>
          <h2 style={{ marginTop: 0, fontSize: 19 }}>RESULTADOS</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, fontWeight: 700 }}>
            <span>Respondidas: {resumen.contestadas}/10</span>
            <span style={{ color: "#047857" }}>Conformes: {resumen.conformes}</span>
            <span style={{ color: "#b91c1c" }}>No conformes: {resumen.noConformes}</span>
            <span>No aplica: {resumen.noAplica}</span>
          </div>
          <div style={{ marginTop: 12 }}>Calidad del formato: <strong>{resumen.formato == null ? "—" : `${resumen.formato.toFixed(2)}%`}</strong></div>
          <div>Entrevista: <strong>{resumen.entrevista == null ? "—" : `${resumen.entrevista.toFixed(2)}%`}</strong></div>
          <div style={{ fontSize: 25, marginTop: 15, fontWeight: 800 }}>Cumplimiento global: {resumen.global == null ? "—" : `${resumen.global.toFixed(2)}%`}</div>
          <div style={{ height: 10, borderRadius: 10, background: "#e2e8f0", overflow: "hidden", marginTop: 10 }}>
            <div style={{ height: "100%", width: `${resumen.global || 0}%`, background: "#059669" }} />
          </div>
        </section>

        {mensaje && <div role="status" style={{ padding: 14, borderRadius: 10, marginBottom: 16, border: `1px solid ${mensaje.error ? "#fca5a5" : "#86efac"}`, background: mensaje.error ? "#fef2f2" : "#f0fdf4", color: mensaje.error ? "#991b1b" : "#166534" }}>{mensaje.texto}</div>}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button type="submit" disabled={guardando} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "12px 20px", border: 0, borderRadius: 10, background: "#2563eb", color: "white", fontWeight: 700, cursor: guardando ? "wait" : "pointer" }}>
            <Save size={18} /> {guardando ? "Procesando..." : pendienteAcciones ? "Reintentar envío al Plan de Acción" : "Guardar auditoría"}
          </button>
          {!pendienteAcciones && <button type="button" onClick={() => { limpiar(); setMensaje(null); }} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 15px", border: "1px solid #cbd5e1", borderRadius: 10, background: "white", color: "#334155", cursor: "pointer" }}>
            <RotateCcw size={16} /> Limpiar formulario
          </button>}
        </div>
      </form>
    </div>
  );
}
