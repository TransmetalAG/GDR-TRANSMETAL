import React, { useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck, Save, RotateCcw } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { catalogo } from "../../data/CatalogoMaquinas.js";

// Ubicación: src/modules/Auditorias/AuditoriaDispositivosSeguridad.jsx
// Tablas: public.auditorias_dispositivos_seguridad y public.plan_accion.
const CRITERIOS = [
  ["DS01", "¿Los hongos de emergencia se encuentran instalados, visibles y accesibles?"],
  ["DS02", "¿Los hongos de emergencia están en buenas condiciones físicas, sin daños ni obstrucciones?"],
  ["DS03", "¿Los hongos de emergencia funcionan correctamente al realizar una prueba segura de accionamiento?"],
  ["DS04", "¿Los cilindros de expulsión se encuentran en buenas condiciones físicas, sin fugas ni daños visibles?"],
  ["DS05", "¿Los cilindros de expulsión funcionan correctamente, sin movimientos inesperados?"],
  ["DS06", "¿Las barreras fotoeléctricas se encuentran instaladas, limpias, alineadas y sin daños visibles?"],
  ["DS07", "¿Las barreras fotoeléctricas cumplen correctamente su función de protección durante una prueba segura?"],
  ["DS08", "¿Las guardas de seguridad se encuentran instaladas y correctamente aseguradas?"],
  ["DS09", "¿Las guardas están en buenas condiciones físicas, sin daños ni modificaciones no autorizadas?"],
  ["DS10", "¿Todos los dispositivos de seguridad se encuentran libres de anulaciones, puentes o manipulaciones no autorizadas?"],
].map(([id, pregunta]) => ({ id, pregunta }));

const MAQUINAS = [...new Set((catalogo || [])
  .map((item) => typeof item === "string" ? item : item?.maquina)
  .filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));

const FECHA_HOY = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nombreUsuario = (user) => typeof user === "string" ? user : (user?.nombre || user?.name || "");
const campo = { width: "100%", padding: "11px 12px", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 9, fontSize: 15, background: "#fff", color: "#0f172a" };
const etiqueta = { display: "block", fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: 7 };
const tarjeta = { border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff", padding: 20 };
const estiloOpcion = (activa, valor) => ({
  borderRadius: 9, border: `1px solid ${activa ? (valor === "SI" ? "#059669" : valor === "NO" ? "#dc2626" : "#64748b") : "#cbd5e1"}`,
  background: activa ? (valor === "SI" ? "#d1fae5" : valor === "NO" ? "#fee2e2" : "#e2e8f0") : "#fff",
  color: "#0f172a", cursor: "pointer", padding: "9px 13px", fontWeight: 700, fontSize: 13,
});

export default function AuditoriaDispositivosSeguridad({ currentUser, onBack }) {
  const [fecha, setFecha] = useState(FECHA_HOY);
  const [maquina, setMaquina] = useState("");
  const [auditorOtro, setAuditorOtro] = useState(false);
  const [otroAuditor, setOtroAuditor] = useState("");
  const [respuestas, setRespuestas] = useState({});
  const [notas, setNotas] = useState({});
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [pendienteAcciones, setPendienteAcciones] = useState(null);

  let usuario = nombreUsuario(currentUser);
  if (!usuario) {
    try { usuario = nombreUsuario(JSON.parse(localStorage.getItem("gdr_user") || "null")); }
    catch { /* Sesión local no disponible */ }
  }
  const auditor = auditorOtro ? otroAuditor.trim() : usuario;

  const resumen = useMemo(() => {
    const valores = CRITERIOS.map(({ id }) => respuestas[id]);
    const conformes = valores.filter((v) => v === "SI").length;
    const noConformes = valores.filter((v) => v === "NO").length;
    const noAplica = valores.filter((v) => v === "NA").length;
    const evaluables = conformes + noConformes;
    return {
      conformes, noConformes, noAplica,
      contestadas: conformes + noConformes + noAplica,
      cumplimiento: evaluables ? Math.round(conformes / evaluables * 10000) / 100 : null,
    };
  }, [respuestas]);

  function limpiarFormulario() {
    setFecha(FECHA_HOY()); setMaquina(""); setAuditorOtro(false); setOtroAuditor("");
    setRespuestas({}); setNotas({}); setObservaciones(""); setPendienteAcciones(null);
  }

  // En reintentos, consulta las acciones ya creadas y agrega solo las faltantes.
  async function enviarPlanAccion(auditoria) {
    const hallazgos = auditoria.respuestas.filter((r) => r.respuesta === "NO");
    if (!hallazgos.length) return 0;

    const prefijo = `DISP-SEG [${auditoria.id}]`;
    const { data: existentes, error: errorConsulta } = await supabase
      .from("plan_accion")
      .select("id, hallazgo")
      .eq("origen", "Auditoría Dispositivos de Seguridad")
      .ilike("hallazgo", `${prefijo}%`);
    if (errorConsulta) throw errorConsulta;

    const creados = new Set((existentes || []).map((fila) => {
      const match = String(fila.hallazgo || "").match(/\] \[([^\]]+)\]/);
      return match?.[1];
    }).filter(Boolean));
    const faltantes = hallazgos.filter((r) => !creados.has(r.id));

    if (faltantes.length) {
      const registros = faltantes.map((r) => ({
        origen: "Auditoría Dispositivos de Seguridad",
        pilar: "Seguridad",
        auditor: auditoria.auditor,
        maquina: auditoria.maquina,
        hallazgo: `${prefijo} [${r.id}]: ${r.pregunta} | Observación: ${r.observacion}`,
        que: null,
        como: null,
        responsable: null,
        fecha_compromiso: null,
        estado: "Pendiente",
        fecha_cierre: null,
      }));
      const { error } = await supabase.from("plan_accion").insert(registros);
      if (error) throw error;
    }
    return hallazgos.length;
  }

  async function guardar(e) {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setMensaje(null);
    try {
      if (pendienteAcciones) {
        const total = await enviarPlanAccion(pendienteAcciones);
        limpiarFormulario();
        setMensaje({ error: false, texto: `¡Listo! Se completó el envío de ${total} no conformidad(es), sin duplicar la auditoría.` });
        return;
      }
      if (!fecha || !maquina || !auditor || !usuario) {
        throw new Error("Completa la fecha, el auditor y la máquina. Verifica que hayas iniciado sesión en GDR.");
      }
      const sinResponder = CRITERIOS.find((r) => !respuestas[r.id]);
      if (sinResponder) throw new Error(`Falta responder la pregunta ${sinResponder.id.slice(-2)}.`);
      const sinNota = CRITERIOS.find((r) =>
        (respuestas[r.id] === "NO" || respuestas[r.id] === "NA") && !notas[r.id]?.trim()
      );
      if (sinNota) throw new Error(`Agrega una observación o justificación para la pregunta ${sinNota.id.slice(-2)}.`);

      const detalle = CRITERIOS.map((r) => ({
        id: r.id,
        categoria: "Dispositivos de seguridad",
        pregunta: r.pregunta,
        respuesta: respuestas[r.id],
        observacion: (notas[r.id] || "").trim(),
      }));
      const registro = {
        fecha_auditoria: fecha,
        auditor,
        usuario_registro: usuario,
        maquina,
        respuestas: detalle,
        observaciones: observaciones.trim() || null,
        total_conformes: resumen.conformes,
        total_no_conformes: resumen.noConformes,
        total_no_aplica: resumen.noAplica,
        cumplimiento_global: resumen.cumplimiento,
      };
      const { data, error } = await supabase.from("auditorias_dispositivos_seguridad")
        .insert(registro).select("id").single();
      if (error) throw error;
      if (!data?.id) throw new Error("La auditoría se guardó, pero no se recibió su identificador.");

      const auditoriaGuardada = { ...registro, id: data.id };
      setPendienteAcciones(auditoriaGuardada);
      try {
        const total = await enviarPlanAccion(auditoriaGuardada);
        limpiarFormulario();
        setMensaje({ error: false, texto: `Auditoría guardada correctamente. ${total} no conformidad(es) enviada(s) al Plan de Acción.` });
      } catch (errorAcciones) {
        setMensaje({ error: true, texto: `La auditoría SÍ se guardó, pero falló el envío al Plan de Acción: ${errorAcciones.message}. Usa “Reintentar envío” para completar las acciones sin duplicar la auditoría.` });
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
        <ShieldCheck size={32} />
        <h1 style={{ margin: "10px 0 7px", fontSize: 25 }}>Auditoría de Dispositivos de Seguridad</h1>
        <p style={{ margin: 0, opacity: 0.85 }}>Transmetal · Hongos de emergencia, cilindros de expulsión, barreras fotoeléctricas y guardas</p>
      </header>

      <form onSubmit={guardar}>
        <section style={{ ...tarjeta, marginBottom: 18 }}>
          <h2 style={{ fontSize: 19, marginTop: 0 }}>DATOS GENERALES</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(235px, 1fr))", gap: 17 }}>
            <div><label style={etiqueta} htmlFor="ds-fecha">Fecha *</label><input id="ds-fecha" type="date" required style={campo} value={fecha} disabled={!!pendienteAcciones} onChange={(e) => setFecha(e.target.value)} /></div>
            <div>
              <label style={etiqueta} htmlFor="ds-auditor">Auditor *</label>
              <select id="ds-auditor" style={campo} disabled={!!pendienteAcciones} value={auditorOtro ? "otro" : "actual"} onChange={(e) => setAuditorOtro(e.target.value === "otro")}>
                <option value="actual">{usuario || "Usuario no identificado"}</option>
                <option value="otro">Otro auditor</option>
              </select>
              {auditorOtro && <input required aria-label="Nombre del otro auditor" style={{ ...campo, marginTop: 8 }} placeholder="Nombre del auditor" value={otroAuditor} disabled={!!pendienteAcciones} onChange={(e) => setOtroAuditor(e.target.value)} />}
            </div>
            <div>
              <label style={etiqueta} htmlFor="ds-maquina">Máquina *</label>
              <select id="ds-maquina" required style={campo} value={maquina} disabled={!!pendienteAcciones} onChange={(e) => setMaquina(e.target.value)}>
                <option value="">Seleccionar máquina</option>
                {MAQUINAS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {!MAQUINAS.length && <small style={{ color: "#b45309" }}>No se encontraron máquinas en el catálogo.</small>}
            </div>
          </div>
        </section>

        <section style={{ ...tarjeta, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0, fontSize: 19 }}>PUNTOS DE VERIFICACIÓN DE DISPOSITIVOS DE SEGURIDAD</h2>
          <p style={{ color: "#64748b", fontSize: 14 }}>Selecciona Conforme, No conforme o No aplica. Para No conforme y No aplica, registra una explicación. Las pruebas funcionales deben hacerse solo bajo un procedimiento seguro y autorizado.</p>
          {CRITERIOS.map((item, i) => (
            <div key={item.id} style={{ padding: "17px 0", borderBottom: i === CRITERIOS.length - 1 ? "none" : "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 700, lineHeight: 1.5, marginBottom: 12 }}>{i + 1}. {item.pregunta}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[["SI", "Conforme"], ["NO", "No conforme"], ["NA", "No aplica"]].map(([valor, nombre]) => (
                  <button type="button" key={valor} disabled={!!pendienteAcciones} onClick={() => { setRespuestas((prev) => ({ ...prev, [item.id]: valor })); setMensaje(null); }} style={{ ...estiloOpcion(respuestas[item.id] === valor, valor), opacity: pendienteAcciones ? 0.65 : 1 }} aria-pressed={respuestas[item.id] === valor}>{nombre}</button>
                ))}
              </div>
              {(respuestas[item.id] === "NO" || respuestas[item.id] === "NA") && (
                <div style={{ marginTop: 12 }}>
                  <label htmlFor={`ds-nota-${item.id}`} style={etiqueta}>{respuestas[item.id] === "NO" ? "Descripción del hallazgo *" : "Justificación de No aplica *"}</label>
                  <textarea id={`ds-nota-${item.id}`} style={{ ...campo, minHeight: 75, resize: "vertical" }} disabled={!!pendienteAcciones} value={notas[item.id] || ""} onChange={(e) => setNotas((prev) => ({ ...prev, [item.id]: e.target.value }))} placeholder="Escribe tu observación aquí..." />
                </div>
              )}
            </div>
          ))}
        </section>

        <section style={{ ...tarjeta, marginBottom: 18 }}>
          <h2 style={{ fontSize: 19, marginTop: 0 }}>OBSERVACIONES GENERALES</h2>
          <textarea style={{ ...campo, minHeight: 110, resize: "vertical" }} value={observaciones} disabled={!!pendienteAcciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Comentarios generales sobre los dispositivos de seguridad evaluados..." />
        </section>

        <section style={{ ...tarjeta, marginBottom: 18 }}>
          <h2 style={{ fontSize: 19, marginTop: 0 }}>RESULTADOS</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontWeight: 700 }}>
            <span>Respondidas: {resumen.contestadas}/10</span>
            <span style={{ color: "#047857" }}>Conformes: {resumen.conformes}</span>
            <span style={{ color: "#b91c1c" }}>No conformes: {resumen.noConformes}</span>
            <span>No aplica: {resumen.noAplica}</span>
          </div>
          <div style={{ fontSize: 25, marginTop: 15, fontWeight: 800 }}>Cumplimiento: {resumen.cumplimiento === null ? "—" : `${resumen.cumplimiento.toFixed(2)}%`}</div>
          <div style={{ height: 10, borderRadius: 10, background: "#e2e8f0", overflow: "hidden", marginTop: 10 }}>
            <div style={{ height: "100%", width: `${resumen.cumplimiento || 0}%`, background: "#059669", transition: "width 0.2s" }} />
          </div>
          {resumen.cumplimiento === null && <small style={{ color: "#64748b" }}>Sin criterios evaluables. Los “No aplica” se excluyen del cálculo.</small>}
        </section>

        {mensaje && <div role="status" style={{ padding: 14, borderRadius: 10, marginBottom: 16, border: `1px solid ${mensaje.error ? "#fca5a5" : "#86efac"}`, background: mensaje.error ? "#fef2f2" : "#f0fdf4", color: mensaje.error ? "#991b1b" : "#166534" }}>{mensaje.texto}</div>}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button type="submit" disabled={guardando} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "12px 20px", border: 0, borderRadius: 10, background: "#2563eb", color: "white", fontWeight: 700, cursor: guardando ? "wait" : "pointer", opacity: guardando ? 0.7 : 1 }}>
            <Save size={18} /> {guardando ? "Procesando..." : pendienteAcciones ? "Reintentar envío al Plan de Acción" : "Guardar auditoría"}
          </button>
          {!pendienteAcciones && <button type="button" onClick={() => { limpiarFormulario(); setMensaje(null); }} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 15px", border: "1px solid #cbd5e1", borderRadius: 10, background: "white", color: "#334155", cursor: "pointer" }}><RotateCcw size={16} /> Limpiar formulario</button>}
        </div>
      </form>
    </div>
  );
}
