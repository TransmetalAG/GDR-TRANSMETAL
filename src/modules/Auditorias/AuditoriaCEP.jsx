
import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Save,
  Plus,
  Trash2,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";

import { supabase } from "../../lib/supabase.js";
import { catalogo } from "../../data/CatalogoMaquinas.js";
import { colaboradores } from "../../data/CatalogoColaboradores.js";

// =====================================================
// CUESTIONARIO CEP - 20 CRITERIOS
// =====================================================

const SECCIONES = [
  {
    id: "personas",
    titulo: "PERSONAS",
    prefijo: "P",
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
    id: "condiciones",
    titulo: "CONDICIONES",
    prefijo: "C",
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
    id: "procedimientos",
    titulo: "PROCEDIMIENTOS",
    prefijo: "PR",
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

const ITEMS = SECCIONES.flatMap((seccion) =>
  seccion.preguntas.map((pregunta, index) => ({
    id: `${seccion.prefijo}${index + 1}`,
    categoria: seccion.id,
    pregunta,
    admiteNA:
      seccion.id === "condiciones" && index === 2
  }))
);

const MAQUINAS = [
  ...new Set(catalogo.map((x) => x.maquina).filter(Boolean))
].sort((a, b) => a.localeCompare(b, "es"));

function obtenerHoy() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

// =====================================================
// ESTILOS
// =====================================================

const campo = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  boxSizing: "border-box",
  fontSize: 15,
  background: "white",
  color: "#0f172a"
};

const etiqueta = {
  display: "block",
  fontWeight: 700,
  fontSize: 14,
  marginBottom: 7,
  color: "#334155"
};

const tarjeta = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 20
};

const estiloRespuesta = (activo, tipo) => {
  const color =
    tipo === "SI"
      ? "#059669"
      : tipo === "NO"
        ? "#dc2626"
        : "#64748b";

  const fondo =
    tipo === "SI"
      ? "#d1fae5"
      : tipo === "NO"
        ? "#fee2e2"
        : "#e2e8f0";

  return {
    border: `1px solid ${activo ? color : "#cbd5e1"}`,
    background: activo ? fondo : "white",
    color: "#0f172a",
    borderRadius: 8,
    padding: "9px 20px",
    fontWeight: 700,
    cursor: "pointer"
  };
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function AuditoriaCEP({
  currentUser,
  onBack
}) {
  const [fecha, setFecha] = useState(obtenerHoy);
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

  // Mantiene el registro original si falla el envío de NC.
  const [auditoriaPendiente, setAuditoriaPendiente] =
    useState(null);

  // ===================================================
  // USUARIO CONECTADO
  // ===================================================

  const usuarioGDR = useMemo(() => {
    if (currentUser?.nombre) {
      return currentUser;
    }

    try {
      const guardado = localStorage.getItem("gdr_user");

      return guardado
        ? JSON.parse(guardado)
        : null;
    } catch {
      return null;
    }
  }, [currentUser]);

  const nombreUsuario = usuarioGDR?.nombre || "";

  const auditor = auditorOtro
    ? nombreOtro.trim()
    : nombreUsuario;

  // ===================================================
  // CÁLCULO DE CUMPLIMIENTO
  // ===================================================

  const resultado = useMemo(() => {
    const categorias = {};

    for (const seccion of SECCIONES) {
      const valores = ITEMS
        .filter((item) => item.categoria === seccion.id)
        .map((item) => respuestas[item.id]);

      const si = valores.filter((v) => v === "SI").length;
      const no = valores.filter((v) => v === "NO").length;
      const na = valores.filter((v) => v === "NA").length;

      categorias[seccion.id] = {
        si,
        no,
        na,
        respondidas: si + no + na,
        porcentaje:
          si + no > 0
            ? Math.round((si / (si + no)) * 10000) / 100
            : null
      };
    }

    const totales = Object.values(categorias);

    const si = totales.reduce((n, x) => n + x.si, 0);
    const no = totales.reduce((n, x) => n + x.no, 0);
    const respondidas = totales.reduce(
      (n, x) => n + x.respondidas,
      0
    );

    return {
      categorias,
      si,
      no,
      respondidas,
      porcentaje:
        si + no > 0
          ? Math.round((si / (si + no)) * 10000) / 100
          : null
    };
  }, [respuestas]);

  // ===================================================
  // FUNCIONES DEL FORMULARIO
  // ===================================================

  function cambiarRespuesta(id, valor) {
    if (auditoriaPendiente) return;

    setRespuestas((prev) => ({
      ...prev,
      [id]: valor
    }));

    setMensaje(null);
  }

  function cambiarParticipante(index, valor) {
    setParticipantes((prev) =>
      prev.map((p, i) => (i === index ? valor : p))
    );
  }

  function reiniciarFormulario() {
    setFecha(obtenerHoy());
    setAuditorOtro(false);
    setNombreOtro("");
    setMaquina("");
    setParticipantes([""]);
    setTarea("");
    setRespuestas({});
    setNotas({});
    setObservaciones("");
    setAuditoriaPendiente(null);
  }

  // ===================================================
  // ENVIAR NO CONFORMIDADES AL PLAN DE ACCIÓN
  // ===================================================

  async function enviarNoConformidades(
    auditoriaId,
    detalle,
    datos
  ) {
    const incumplimientos = detalle.filter(
      (item) => item.respuesta === "NO"
    );

    if (!incumplimientos.length) {
      return 0;
    }

    const prefijo = `CEP [${auditoriaId}]`;

    // Consultar las NC que ya fueron enviadas.
    const {
      data: existentes,
      error: errorLectura
    } = await supabase
      .from("plan_accion")
      .select("hallazgo")
      .eq("origen", "Auditoría CEP")
      .like("hallazgo", `${prefijo}%`);

    if (errorLectura) {
      throw new Error(
        `No se pudieron consultar las acciones existentes: ${errorLectura.message}`
      );
    }

    const identificadoresExistentes = new Set(
      (existentes || [])
        .filter((fila) =>
          String(fila.hallazgo || "")
            .startsWith(`${prefijo} [`)
        )
        .map((fila) =>
          String(fila.hallazgo || "")
            .match(/\] \[([^\]]+)\]/)?.[1]
        )
        .filter(Boolean)
    );

    // Crear únicamente las NC que aún no existen.
    const nuevas = incumplimientos
      .filter(
        (item) => !identificadoresExistentes.has(item.id)
      )
      .map((item) => ({
        origen: "Auditoría CEP",
        pilar: "Seguridad",
        auditor: datos.auditor,
        maquina: datos.maquina,

        hallazgo:
          `${prefijo} [${item.id}]: ` +
          `${item.pregunta} | ` +
          `Observación: ${item.observacion}`,

        que: null,
        como: null,
        responsable: null,
        fecha_compromiso: null,
        estado: "Sin planificar",
        fecha_cierre: null
      }));

    if (!nuevas.length) {
      return incumplimientos.length;
    }

    const { error: errorInsercion } = await supabase
      .from("plan_accion")
      .insert(nuevas);

    if (errorInsercion) {
      throw new Error(
        `No se pudieron insertar las NC en plan_accion: ` +
        errorInsercion.message
      );
    }

    return incumplimientos.length;
  }

  // ===================================================
  // GUARDAR AUDITORÍA EN SUPABASE
  // ===================================================

  async function guardar(event) {
    event.preventDefault();

    if (guardando) return;

    setMensaje(null);

    let pendiente = auditoriaPendiente;
    let auditoriaId = pendiente?.id || null;

    if (!pendiente) {
      const personas = participantes
        .map((p) => p.trim())
        .filter(Boolean);

      if (
        !auditor ||
        !fecha ||
        !maquina ||
        !tarea.trim() ||
        !personas.length
      ) {
        setMensaje({
          error: true,
          texto:
            "Completa auditor, fecha, máquina, tarea " +
            "y al menos un colaborador."
        });
        return;
      }

      if (new Set(personas).size !== personas.length) {
        setMensaje({
          error: true,
          texto:
            "No repitas colaboradores en la misma auditoría."
        });
        return;
      }

      if (resultado.respondidas !== ITEMS.length) {
        setMensaje({
          error: true,
          texto:
            `Faltan ${ITEMS.length - resultado.respondidas} ` +
            "respuestas. Completa los 20 criterios."
        });
        return;
      }

      const sinNota = ITEMS.find(
        (item) =>
          (respuestas[item.id] === "NO" ||
            respuestas[item.id] === "NA") &&
          !notas[item.id]?.trim()
      );

      if (sinNota) {
        setMensaje({
          error: true,
          texto:
            `Escribe la observación o justificación de ${sinNota.id}.`
        });
        return;
      }

      const detalle = ITEMS.map((item) => ({
        id: item.id,
        categoria: item.categoria,
        pregunta: item.pregunta,
        respuesta: respuestas[item.id],
        observacion: notas[item.id]?.trim() || ""
      }));

      const registro = {
        fecha_auditoria: fecha,
        auditor,
        usuario_registro: nombreUsuario || auditor,
        maquina,
        colaboradores: personas,
        tarea: tarea.trim(),
        respuestas: detalle,
        observaciones: observaciones.trim() || null,
        cumplimiento_personas:
          resultado.categorias.personas.porcentaje,
        cumplimiento_condiciones:
          resultado.categorias.condiciones.porcentaje,
        cumplimiento_procedimientos:
          resultado.categorias.procedimientos.porcentaje,
        cumplimiento_global: resultado.porcentaje
      };

      pendiente = { registro, detalle };
    }

    setGuardando(true);

    try {
      // Paso 1: guardar la auditoría solamente si
      // todavía no existe en Supabase.
      if (!auditoriaId) {
        const {
          data,
          error
        } = await supabase
          .from("auditorias_cep")
          .insert(pendiente.registro)
          .select("id")
          .single();

        if (error) {
          throw new Error(
            `Error al guardar auditoría CEP: ${error.message}`
          );
        }

        auditoriaId = data.id;

        // Guardamos una copia inmutable para reintentos.
        pendiente = {
          ...pendiente,
          id: auditoriaId
        };

        setAuditoriaPendiente(pendiente);
      }

      // Paso 2: registrar las NC en Plan de Acción.
      const cantidadNC = await enviarNoConformidades(
        auditoriaId,
        pendiente.detalle,
        pendiente.registro
      );

      reiniciarFormulario();

      setMensaje({
        error: false,
        texto:
          `Auditoría CEP guardada correctamente. ` +
          `${cantidadNC} no conformidad(es) ` +
          `registradas o verificadas en Plan de Acción.`
      });

    } catch (error) {
      console.error("Error de auditoría CEP:", error);

      setMensaje({
        error: true,
        texto: auditoriaId
          ? "La auditoría quedó guardada en Supabase, " +
            "pero no se pudo confirmar el envío de todas " +
            "las no conformidades al Plan de Acción. " +
            error.message +
            " Puedes presionar nuevamente Guardar " +
            "para reintentar sin duplicar la auditoría."
          : error.message
      });

    } finally {
      setGuardando(false);
    }
  }

  const formularioBloqueado = Boolean(auditoriaPendiente);

  // ===================================================
  // INTERFAZ
  // ===================================================

  return (
    <div
      style={{
        maxWidth: 1040,
        margin: "0 auto",
        paddingBottom: 50
      }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            border: 0,
            background: "transparent",
            color: "#2563eb",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 7,
            cursor: "pointer",
            marginBottom: 15
          }}
        >
          <ArrowLeft size={18} />
          Volver a Auditorías
        </button>
      )}

      <header
        style={{
          background:
            "linear-gradient(135deg,#0f172a,#1d4ed8)",
          color: "white",
          borderRadius: 16,
          padding: 26,
          marginBottom: 22
        }}
      >
        <ShieldCheck size={31} />

        <h1
          style={{
            margin: "10px 0 5px",
            fontSize: 26
          }}
        >
          Auditoría de Control de Energías Peligrosas
        </h1>

        <p style={{ margin: 0, opacity: 0.85 }}>
          Planta Transmetal · Personas · Condiciones ·
          Procedimientos
        </p>
      </header>

      <form
        onSubmit={guardar}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20
        }}
      >
        {formularioBloqueado && (
          <div
            style={{
              ...tarjeta,
              background: "#fffbeb",
              borderColor: "#fcd34d",
              display: "flex",
              gap: 12
            }}
          >
            <AlertTriangle color="#b45309" />

            <div>
              <strong>
                Auditoría guardada; envío de acciones pendiente
              </strong>

              <p style={{ marginBottom: 0 }}>
                Los datos están protegidos contra cambios
                mientras se reintenta enviar las NC.
              </p>
            </div>
          </div>
        )}

        {/* DATOS GENERALES */}

        <section
          style={{
            ...tarjeta,
            opacity: formularioBloqueado ? 0.8 : 1
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Datos generales
          </h2>

          <fieldset
            disabled={formularioBloqueado}
            style={{
              border: 0,
              margin: 0,
              padding: 0,
              minWidth: 0
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: 16
              }}
            >
              <div>
                <label style={etiqueta}>
                  Auditor *
                </label>

                <select
                  style={campo}
                  value={auditorOtro ? "otro" : "actual"}
                  onChange={(e) =>
                    setAuditorOtro(e.target.value === "otro")
                  }
                >
                  <option value="actual">
                    {nombreUsuario || "Usuario no identificado"}
                  </option>

                  <option value="otro">
                    Otro auditor
                  </option>
                </select>

                {auditorOtro && (
                  <input
                    required
                    style={{
                      ...campo,
                      marginTop: 8
                    }}
                    placeholder="Nombre del auditor"
                    value={nombreOtro}
                    onChange={(e) =>
                      setNombreOtro(e.target.value)
                    }
                  />
                )}
              </div>

              <div>
                <label style={etiqueta}>
                  Fecha de auditoría *
                </label>

                <input
                  required
                  type="date"
                  style={campo}
                  value={fecha}
                  onChange={(e) =>
                    setFecha(e.target.value)
                  }
                />
              </div>

              <div>
                <label style={etiqueta}>
                  Máquina *
                </label>

                <select
                  required
                  style={campo}
                  value={maquina}
                  onChange={(e) =>
                    setMaquina(e.target.value)
                  }
                >
                  <option value="">
                    Seleccionar máquina
                  </option>

                  {MAQUINAS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={etiqueta}>
                Colaboradores involucrados *
              </label>

              {participantes.map((p, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 9,
                    marginBottom: 9
                  }}
                >
                  <select
                    style={{
                      ...campo,
                      flex: 1
                    }}
                    value={p}
                    onChange={(e) =>
                      cambiarParticipante(
                        i,
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Seleccionar colaborador
                    </option>

                    {colaboradores.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {participantes.length > 1 && (
                    <button
                      type="button"
                      aria-label="Quitar colaborador"
                      onClick={() =>
                        setParticipantes((prev) =>
                          prev.filter((_, j) => j !== i)
                        )
                      }
                      style={{
                        border: "1px solid #fecaca",
                        background: "#fff1f2",
                        color: "#be123c",
                        borderRadius: 8,
                        cursor: "pointer"
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setParticipantes((prev) => [
                    ...prev,
                    ""
                  ])
                }
                style={{
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  padding: "9px 12px",
                  borderRadius: 8,
                  color: "#1d4ed8",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <Plus size={16} />
                Agregar colaborador
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={etiqueta}>
                Tarea que se realiza *
              </label>

              <textarea
                required
                style={campo}
                rows={3}
                value={tarea}
                onChange={(e) =>
                  setTarea(e.target.value)
                }
                placeholder="Describe la intervención..."
              />
            </div>
          </fieldset>
        </section>

        {/* AVANCE */}

        <div
          style={{
            ...tarjeta,
            background: "#eff6ff",
            borderColor: "#bfdbfe"
          }}
        >
          <strong>
            Avance de auditoría: {resultado.respondidas}
            {" de "}
            {ITEMS.length} preguntas
          </strong>

          <div
            style={{
              height: 9,
              background: "#dbeafe",
              borderRadius: 10,
              marginTop: 10,
              overflow: "hidden"
            }}
          >
            <div
              style={{
                height: "100%",
                width:
                  `${resultado.respondidas / ITEMS.length * 100}%`,
                background: "#2563eb",
                transition: "width .2s"
              }}
            />
          </div>
        </div>

        {/* CUESTIONARIO */}

        {SECCIONES.map((seccion) => (
          <section key={seccion.id} style={tarjeta}>
            <h2 style={{ margin: "0 0 6px" }}>
              {seccion.titulo}{" "}

              <span
                style={{
                  fontSize: 14,
                  color: "#64748b"
                }}
              >
                ({seccion.preguntas.length} criterios)
              </span>
            </h2>

            <p
              style={{
                fontSize: 14,
                color: "#475569",
                margin: "0 0 14px"
              }}
            >
              Cumplimiento:{" "}
              {resultado.categorias[seccion.id]
                .porcentaje === null
                ? "—"
                : `${resultado.categorias[seccion.id].porcentaje}%`}

              {" · "}

              Respondidas:{" "}
              {resultado.categorias[seccion.id].respondidas}
              /{seccion.preguntas.length}
            </p>

            {ITEMS
              .filter(
                (item) =>
                  item.categoria === seccion.id
              )
              .map((item) => (
                <div
                  key={item.id}
                  style={{
                    borderTop:
                      "1px solid #e2e8f0",
                    padding: "17px 0"
                  }}
                >
                  <div
                    style={{
                      fontWeight: 650,
                      lineHeight: 1.5,
                      marginBottom: 12
                    }}
                  >
                    <span
                      style={{ color: "#2563eb" }}
                    >
                      {item.id}.
                    </span>{" "}
                    {item.pregunta}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 9,
                      flexWrap: "wrap"
                    }}
                  >
                    {[
                      "SI",
                      "NO",
                      ...(item.admiteNA
                        ? ["NA"]
                        : [])
                    ].map((op) => (
                      <button
                        key={op}
                        type="button"
                        disabled={formularioBloqueado}
                        aria-pressed={
                          respuestas[item.id] === op
                        }
                        onClick={() =>
                          cambiarRespuesta(
                            item.id,
                            op
                          )
                        }
                        style={estiloRespuesta(
                          respuestas[item.id] === op,
                          op
                        )}
                      >
                        {op === "SI"
                          ? "Sí"
                          : op === "NO"
                            ? "No"
                            : "N/A"}
                      </button>
                    ))}
                  </div>

                  {(respuestas[item.id] === "NO" ||
                    respuestas[item.id] === "NA") && (
                    <div style={{ marginTop: 12 }}>
                      <label style={etiqueta}>
                        {respuestas[item.id] === "NO"
                          ? "Descripción del incumplimiento *"
                          : "Justificación de no aplica *"}
                      </label>

                      <textarea
                        required
                        disabled={formularioBloqueado}
                        style={campo}
                        rows={2}
                        value={notas[item.id] || ""}
                        onChange={(e) =>
                          setNotas((prev) => ({
                            ...prev,
                            [item.id]: e.target.value
                          }))
                        }
                        placeholder="Escribe aquí la observación..."
                      />
                    </div>
                  )}
                </div>
              ))}
          </section>
        ))}

        {/* OBSERVACIONES GENERALES */}

        <section style={tarjeta}>
          <h2 style={{ marginTop: 0 }}>
            Observaciones generales
          </h2>

          <textarea
            disabled={formularioBloqueado}
            style={campo}
            rows={4}
            value={observaciones}
            onChange={(e) =>
              setObservaciones(e.target.value)
            }
            placeholder="Comentarios adicionales..."
          />
        </section>

        {/* RESULTADOS */}

        <section style={tarjeta}>
          <h2 style={{ marginTop: 0 }}>
            Resultado de la auditoría
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(160px,1fr))",
              gap: 12
            }}
          >
            {SECCIONES.map((seccion) => (
              <div
                key={seccion.id}
                style={{
                  background: "#f8fafc",
                  borderRadius: 10,
                  padding: 15
                }}
              >
                <small
                  style={{ color: "#64748b" }}
                >
                  {seccion.titulo}
                </small>

                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800
                  }}
                >
                  {resultado.categorias[seccion.id]
                    .porcentaje === null
                    ? "—"
                    : `${resultado.categorias[seccion.id].porcentaje}%`}
                </div>
              </div>
            ))}
          </div>

          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 6
            }}
          >
            Cumplimiento global:{" "}
            {resultado.porcentaje === null
              ? "—"
              : `${resultado.porcentaje}%`}
          </p>

          <p
            style={{
              color: "#475569",
              margin: 0
            }}
          >
            Conformes: {resultado.si}
            {" · "}
            No conformes: {resultado.no}
            {" · "}
            No aplica: {resultado.categorias.condiciones.na}
          </p>

          <p
            style={{
              fontSize: 13,
              color: "#64748b"
            }}
          >
            Los porcentajes se calculan sobre criterios
            aplicables respondidos. Los incumplimientos
            críticos deben atenderse independientemente
            del porcentaje.
          </p>
        </section>

        {/* MENSAJES */}

        {mensaje && (
          <div
            role="status"
            style={{
              padding: 14,
              borderRadius: 9,
              background: mensaje.error
                ? "#fef2f2"
                : "#f0fdf4",
              color: mensaje.error
                ? "#991b1b"
                : "#166534",
              whiteSpace: "pre-wrap"
            }}
          >
            {mensaje.texto}
          </div>
        )}

        {/* GUARDAR */}

        <button
          type="submit"
          disabled={guardando}
          style={{
            padding: 15,
            border: 0,
            borderRadius: 10,
            background: guardando
              ? "#94a3b8"
              : "#1d4ed8",
            color: "white",
            fontSize: 16,
            fontWeight: 700,
            display: "flex",
            gap: 9,
            alignItems: "center",
            justifyContent: "center",
            cursor: guardando
              ? "wait"
              : "pointer"
          }}
        >
          {guardando
            ? <Save size={18} />
            : <CheckCircle2 size={18} />}

          {guardando
            ? "Guardando..."
            : formularioBloqueado
              ? "Reintentar envío de NC"
              : "Guardar auditoría y enviar NC"}
        </button>
      </form>
    </div>
  );
}
