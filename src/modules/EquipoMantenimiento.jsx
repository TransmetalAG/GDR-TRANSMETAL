import React, { useEffect, useMemo, useState } from "react";
import {
  Wrench,
  User,
  CalendarDays,
  Clock3,
  AlertTriangle,
  Play,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
} from "lucide-react";

import { supabase } from "../lib/supabase.js";

const TECNICOS = [
  "Edvin Telles",
  "Carlos Carcuz",
  "Erwin Haz",
  "Anderson López",
];

function formatDate(dateString) {
  if (!dateString) return "Sin programar";

  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
  }).format(new Date(`${dateString}T12:00:00`));
}

function normalizarTarea(row) {
  return {
    id: row.id,
    equipo: row.equipo || "",
    tarea: row.tarea || "",
    responsable: row.responsable || "",
    diaProgramado: row.dia_programado || "",
    tiempoEstimado:
      row.tiempo_estimado_horas !== null &&
      row.tiempo_estimado_horas !== undefined
        ? Number(row.tiempo_estimado_horas)
        : "",
    prioridad: row.prioridad || "Media",
    estado: row.estado || "Pendiente de asignación",
    origen: row.origen || "Manual",
    observaciones: row.observaciones || "",
  };
}

function EquipoMantenimiento() {
  const [loading, setLoading] = useState(true);
  const [actualizandoId, setActualizandoId] = useState(null);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState("");
  const [tareas, setTareas] = useState([]);

  useEffect(() => {
    cargarTareas();
  }, []);

  async function cargarTareas() {
    setLoading(true);

    const { data, error } = await supabase
      .from("mantenimiento")
      .select("*")
      .eq("tipo_registro", "tarea")
      .in("estado", ["Asignada", "En proceso", "Terminada"])
      .order("dia_programado", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error al cargar tareas de mantenimiento:", error);

      alert(
        `No se pudieron cargar las tareas de mantenimiento.\n\n${error.message}`
      );

      setLoading(false);
      return;
    }

    setTareas((data || []).map(normalizarTarea));
    setLoading(false);
  }

  const tareasVisibles = useMemo(() => {
    if (!tecnicoSeleccionado) return [];

    return tareas.filter(
      (tarea) => tarea.responsable === tecnicoSeleccionado
    );
  }, [tareas, tecnicoSeleccionado]);

  const resumen = useMemo(() => {
    return {
      asignadas: tareasVisibles.filter(
        (tarea) => tarea.estado === "Asignada"
      ).length,
      enProceso: tareasVisibles.filter(
        (tarea) => tarea.estado === "En proceso"
      ).length,
      terminadas: tareasVisibles.filter(
        (tarea) => tarea.estado === "Terminada"
      ).length,
    };
  }, [tareasVisibles]);

  async function cambiarEstado(tarea, nuevoEstado) {
    if (actualizandoId) return;

    const textoConfirmacion =
      nuevoEstado === "En proceso"
        ? `¿Iniciar esta tarea?\n\n${tarea.equipo} — ${tarea.tarea}`
        : `¿Marcar esta tarea como terminada?\n\n${tarea.equipo} — ${tarea.tarea}\n\nQuedará pendiente de verificación por un líder.`;

    if (!window.confirm(textoConfirmacion)) {
      return;
    }

    setActualizandoId(tarea.id);

    const { error } = await supabase
      .from("mantenimiento")
      .update({
        estado: nuevoEstado,
        // El técnico NO cierra formalmente la tarea.
        // fecha_cierre solo la registra el líder cuando pasa a "Cerrada".
        fecha_cierre: null,
      })
      .eq("id", tarea.id)
      .eq("tipo_registro", "tarea");

    if (error) {
      console.error("Error al actualizar tarea:", error);

      alert(
        `No se pudo actualizar la tarea.\n\n${error.message}`
      );

      setActualizandoId(null);
      return;
    }

    setTareas((previous) =>
      previous.map((item) =>
        item.id === tarea.id
          ? { ...item, estado: nuevoEstado }
          : item
      )
    );

    setActualizandoId(null);
  }

  function getColorPrioridad(prioridad) {
    if (prioridad === "Crítica") {
      return {
        background: "#fee2e2",
        color: "#b91c1c",
      };
    }

    if (prioridad === "Alta") {
      return {
        background: "#ffedd5",
        color: "#c2410c",
      };
    }

    if (prioridad === "Media") {
      return {
        background: "#fef3c7",
        color: "#b45309",
      };
    }

    return {
      background: "#dcfce7",
      color: "#15803d",
    };
  }

  function getColorEstado(estado) {
    if (estado === "Terminada") {
      return {
        background: "#f3e8ff",
        color: "#7e22ce",
      };
    }

    if (estado === "En proceso") {
      return {
        background: "#fef3c7",
        color: "#b45309",
      };
    }

    return {
      background: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">
            Ejecución de mantenimiento
          </span>

          <h2>
            Equipo Mantenimiento
          </h2>

          <p>
            Consultá tus tareas asignadas, iniciá el trabajo y reportalo como
            terminado para verificación del líder.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={cargarTareas}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Actualizar
        </button>
      </header>

      <section
        className="section-block"
        style={{
          padding: "14px",
          marginBottom: "14px",
        }}
      >
        <label
          className="form-field"
          style={{
            maxWidth: "340px",
            margin: 0,
          }}
        >
          <span>
            <User size={17} />
            Técnico
          </span>

          <select
            value={tecnicoSeleccionado}
            onChange={(event) =>
              setTecnicoSeleccionado(event.target.value)
            }
          >
            <option value="">
              Seleccioná tu nombre
            </option>

            {TECNICOS.map((tecnico) => (
              <option
                key={tecnico}
                value={tecnico}
              >
                {tecnico}
              </option>
            ))}
          </select>
        </label>
      </section>

      {tecnicoSeleccionado && (
        <section
          className="section-block"
          style={{
            padding: "10px 14px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "18px",
              flexWrap: "wrap",
              alignItems: "center",
              fontSize: "12px",
            }}
          >
            <span>
              Asignadas: <strong>{resumen.asignadas}</strong>
            </span>

            <span>
              En proceso: <strong>{resumen.enProceso}</strong>
            </span>

            <span>
              Por verificar: <strong>{resumen.terminadas}</strong>
            </span>

            <span
              style={{
                marginLeft: "auto",
                color: "#667085",
              }}
            >
              {tareasVisibles.length} tareas visibles
            </span>
          </div>
        </section>
      )}

      <section
        className="section-block"
        style={{
          padding: "14px",
        }}
      >
        {!tecnicoSeleccionado ? (
          <div
            style={{
              textAlign: "center",
              padding: "46px 20px",
              color: "#667085",
            }}
          >
            <User
              size={34}
              style={{
                marginBottom: "10px",
              }}
            />

            <strong
              style={{
                display: "block",
                marginBottom: "4px",
                color: "#344054",
              }}
            >
              Seleccioná tu nombre
            </strong>

            <span>
              Verás únicamente las tareas que te fueron asignadas.
            </span>
          </div>
        ) : loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
            }}
          >
            Cargando tareas...
          </div>
        ) : tareasVisibles.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "46px 20px",
              color: "#667085",
            }}
          >
            <CheckCircle2
              size={34}
              style={{
                marginBottom: "10px",
              }}
            />

            <strong
              style={{
                display: "block",
                color: "#344054",
              }}
            >
              No tenés tareas activas asignadas.
            </strong>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {tareasVisibles.map((tarea) => {
              const prioridadStyle =
                getColorPrioridad(tarea.prioridad);

              const estadoStyle =
                getColorEstado(tarea.estado);

              return (
                <article
                  key={tarea.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    background: "#fff",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "16px",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        flex: "1 1 520px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                          marginBottom: "10px",
                        }}
                      >
                        <span
                          style={{
                            ...prioridadStyle,
                            borderRadius: "999px",
                            padding: "5px 10px",
                            fontSize: "11px",
                            fontWeight: 800,
                          }}
                        >
                          {tarea.prioridad}
                        </span>

                        <span
                          style={{
                            ...estadoStyle,
                            borderRadius: "999px",
                            padding: "5px 10px",
                            fontSize: "11px",
                            fontWeight: 800,
                          }}
                        >
                          {tarea.estado === "Terminada"
                            ? "Por verificar"
                            : tarea.estado}
                        </span>
                      </div>

                      <h3
                        style={{
                          margin: "0 0 6px",
                          fontSize: "17px",
                        }}
                      >
                        {tarea.equipo}
                      </h3>

                      <p
                        style={{
                          margin: "0 0 14px",
                          color: "#344054",
                          lineHeight: 1.5,
                        }}
                      >
                        {tarea.tarea}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          gap: "16px",
                          flexWrap: "wrap",
                          fontSize: "12px",
                          color: "#667085",
                        }}
                      >
                        <span>
                          <CalendarDays size={14} />
                          {" "}
                          {formatDate(tarea.diaProgramado)}
                        </span>

                        <span>
                          <Clock3 size={14} />
                          {" "}
                          {tarea.tiempoEstimado !== ""
                            ? `${tarea.tiempoEstimado} h`
                            : "Sin tiempo definido"}
                        </span>

                        <span>
                          <ClipboardList size={14} />
                          {" "}
                          Origen: {tarea.origen}
                        </span>
                      </div>

                      {tarea.observaciones && (
                        <p
                          style={{
                            margin: "12px 0 0",
                            padding: "10px 12px",
                            background: "#f8fafc",
                            borderRadius: "8px",
                            color: "#667085",
                            fontSize: "12px",
                          }}
                        >
                          <strong>Observaciones:</strong>{" "}
                          {tarea.observaciones}
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        minWidth: "170px",
                        justifyContent: "flex-end",
                      }}
                    >
                      {tarea.estado === "Asignada" && (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            cambiarEstado(
                              tarea,
                              "En proceso"
                            )
                          }
                          disabled={
                            actualizandoId === tarea.id
                          }
                        >
                          <Play size={17} />
                          {actualizandoId === tarea.id
                            ? "Iniciando..."
                            : "Iniciar tarea"}
                        </button>
                      )}

                      {tarea.estado === "En proceso" && (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            cambiarEstado(
                              tarea,
                              "Terminada"
                            )
                          }
                          disabled={
                            actualizandoId === tarea.id
                          }
                        >
                          <CheckCircle2 size={17} />
                          {actualizandoId === tarea.id
                            ? "Guardando..."
                            : "Terminar tarea"}
                        </button>
                      )}

                      {tarea.estado === "Terminada" && (
                        <div
                          style={{
                            display: "grid",
                            gap: "5px",
                            textAlign: "right",
                            color: "#7e22ce",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle2
                            size={19}
                            style={{
                              marginLeft: "auto",
                            }}
                          />

                          Pendiente de verificación
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

export default EquipoMantenimiento;
