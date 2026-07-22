import React, { useMemo, useState } from "react";
import {
  Wrench,
  Plus,
  Search,
  CalendarDays,
  Clock3,
  User,
  Factory,
  Filter,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  ClipboardList,
} from "lucide-react";

import { catalogo } from "../data/CatalogoMaquinas.js";

function GestionMantenimiento() {
  const tecnicos = [
    "Edvin Telles",
    "Carlos Carcuz",
    "Erwin Haz",
    "Anderson López",
  ];

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [filtros, setFiltros] = useState({
    responsable: "",
    estado: "",
    prioridad: "",
    equipo: "",
    busqueda: "",
  });

  const [nuevaTarea, setNuevaTarea] = useState({
    equipo: "",
    tarea: "",
    responsable: "",
    diaProgramado: "",
    tiempoEstimado: "",
    prioridad: "Media",
  });

  /*
    Por ahora usamos datos temporales únicamente
    para construir y validar la interfaz.

    Después conectaremos esta pantalla con Supabase.
  */
  const [tareas, setTareas] = useState([
    {
      id: 1,
      equipo: "Caiman",
      tarea: "Revisar fuga de aceite en sistema hidráulico.",
      responsable: "Edvin Telles",
      diaProgramado: "2026-07-23",
      tiempoEstimado: "2 horas",
      prioridad: "Alta",
      estado: "Asignada",
      origen: "Gemba",
    },
    {
      id: 2,
      equipo: "Troqueladora 3",
      tarea: "Revisar ruido anormal durante operación.",
      responsable: "Carlos Carcuz",
      diaProgramado: "2026-07-24",
      tiempoEstimado: "1 hora",
      prioridad: "Media",
      estado: "En proceso",
      origen: "Manual",
    },
    {
      id: 3,
      equipo: "Pintura Electroestatica",
      tarea: "Inspección preventiva de ventiladores.",
      responsable: "Erwin Haz",
      diaProgramado: "2026-07-25",
      tiempoEstimado: "3 horas",
      prioridad: "Baja",
      estado: "Terminada",
      origen: "Manual",
    },
  ]);

  const maquinas = useMemo(() => {
    return [
      ...new Set(
        catalogo.map((item) => item.maquina)
      ),
    ].sort((a, b) =>
      a.localeCompare(b, "es")
    );
  }, []);

  const tareasFiltradas = useMemo(() => {
    return tareas.filter((tarea) => {
      const coincideResponsable =
        !filtros.responsable ||
        tarea.responsable ===
          filtros.responsable;

      const coincideEstado =
        !filtros.estado ||
        tarea.estado === filtros.estado;

      const coincidePrioridad =
        !filtros.prioridad ||
        tarea.prioridad ===
          filtros.prioridad;

      const coincideEquipo =
        !filtros.equipo ||
        tarea.equipo === filtros.equipo;

      const textoBusqueda =
        filtros.busqueda
          .trim()
          .toLowerCase();

      const coincideBusqueda =
        !textoBusqueda ||
        tarea.tarea
          .toLowerCase()
          .includes(textoBusqueda) ||
        tarea.equipo
          .toLowerCase()
          .includes(textoBusqueda);

      return (
        coincideResponsable &&
        coincideEstado &&
        coincidePrioridad &&
        coincideEquipo &&
        coincideBusqueda
      );
    });
  }, [tareas, filtros]);

  const indicadores = useMemo(() => {
    return {
      pendientes: tareas.filter(
        (tarea) =>
          tarea.estado ===
          "Pendiente de asignación"
      ).length,

      asignadas: tareas.filter(
        (tarea) =>
          tarea.estado === "Asignada"
      ).length,

      enProceso: tareas.filter(
        (tarea) =>
          tarea.estado === "En proceso"
      ).length,

      terminadas: tareas.filter(
        (tarea) =>
          tarea.estado === "Terminada"
      ).length,
    };
  }, [tareas]);

  function handleNuevaTareaChange(event) {
    const { name, value } = event.target;

    setNuevaTarea((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleFiltroChange(event) {
    const { name, value } = event.target;

    setFiltros((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function limpiarFormulario() {
    setNuevaTarea({
      equipo: "",
      tarea: "",
      responsable: "",
      diaProgramado: "",
      tiempoEstimado: "",
      prioridad: "Media",
    });
  }

  function guardarNuevaTarea(event) {
    event.preventDefault();

    if (!nuevaTarea.equipo) {
      alert(
        "Seleccioná el equipo a intervenir."
      );
      return;
    }

    if (!nuevaTarea.tarea.trim()) {
      alert(
        "Describí la tarea de mantenimiento."
      );
      return;
    }

    if (!nuevaTarea.responsable) {
      alert(
        "Seleccioná un responsable."
      );
      return;
    }

    if (!nuevaTarea.diaProgramado) {
      alert(
        "Seleccioná el día programado."
      );
      return;
    }

    if (
      !nuevaTarea.tiempoEstimado.trim()
    ) {
      alert(
        "Indicá el tiempo estimado."
      );
      return;
    }

    const tarea = {
      id: Date.now(),
      equipo: nuevaTarea.equipo,
      tarea:
        nuevaTarea.tarea.trim(),
      responsable:
        nuevaTarea.responsable,
      diaProgramado:
        nuevaTarea.diaProgramado,
      tiempoEstimado:
        nuevaTarea.tiempoEstimado.trim(),
      prioridad:
        nuevaTarea.prioridad,
      estado: "Asignada",
      origen: "Manual",
    };

    setTareas((previous) => [
      tarea,
      ...previous,
    ]);

    limpiarFormulario();

    setMostrarFormulario(false);
  }

  function cambiarEstado(
    tareaId,
    nuevoEstado
  ) {
    setTareas((previous) =>
      previous.map((tarea) =>
        tarea.id === tareaId
          ? {
              ...tarea,
              estado: nuevoEstado,
            }
          : tarea
      )
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">
            Gestión operativa
          </span>

          <h2>
            Gestión de Mantenimiento
          </h2>

          <p>
            Planificá, asigná y controlá
            las tareas de mantenimiento
            provenientes de Gemba o
            generadas manualmente.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            setMostrarFormulario(true)
          }
        >
          <Plus size={19} />
          Nueva tarea
        </button>
      </header>

      <section className="kpi-grid">
        <div className="kpi-card">
          <span>
            Pendientes
          </span>

          <strong>
            {indicadores.pendientes}
          </strong>

          <small>
            Sin responsable asignado
          </small>
        </div>

        <div className="kpi-card">
          <span>
            Asignadas
          </span>

          <strong>
            {indicadores.asignadas}
          </strong>

          <small>
            Programadas para ejecución
          </small>
        </div>

        <div className="kpi-card">
          <span>
            En proceso
          </span>

          <strong>
            {indicadores.enProceso}
          </strong>

          <small>
            Trabajos actualmente activos
          </small>
        </div>

        <div className="kpi-card">
          <span>
            Terminadas
          </span>

          <strong>
            {indicadores.terminadas}
          </strong>

          <small>
            Tareas finalizadas
          </small>
        </div>
      </section>

      {mostrarFormulario && (
        <section
          className="section-block"
          style={{
            marginBottom: "22px",
          }}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                Nueva intervención
              </span>

              <h3>
                Crear tarea de mantenimiento
              </h3>
            </div>

            <p>
              Registrá la planificación
              inicial de la intervención.
            </p>
          </div>

          <form
            onSubmit={guardarNuevaTarea}
          >
            <div className="form-grid">
              <label className="form-field">
                <span>
                  <Factory size={17} />
                  Equipo a intervenir
                </span>

                <select
                  name="equipo"
                  value={
                    nuevaTarea.equipo
                  }
                  onChange={
                    handleNuevaTareaChange
                  }
                >
                  <option value="">
                    Seleccionar equipo
                  </option>

                  {maquinas.map(
                    (maquina) => (
                      <option
                        key={maquina}
                        value={maquina}
                      >
                        {maquina}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="form-field">
                <span>
                  <User size={17} />
                  Responsable
                </span>

                <select
                  name="responsable"
                  value={
                    nuevaTarea.responsable
                  }
                  onChange={
                    handleNuevaTareaChange
                  }
                >
                  <option value="">
                    Seleccionar responsable
                  </option>

                  {tecnicos.map(
                    (tecnico) => (
                      <option
                        key={tecnico}
                        value={tecnico}
                      >
                        {tecnico}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="form-field">
                <span>
                  <CalendarDays size={17} />
                  Día programado
                </span>

                <input
                  type="date"
                  name="diaProgramado"
                  value={
                    nuevaTarea.diaProgramado
                  }
                  onChange={
                    handleNuevaTareaChange
                  }
                />
              </label>

              <label className="form-field">
                <span>
                  <Clock3 size={17} />
                  Tiempo estimado
                </span>

                <input
                  type="text"
                  name="tiempoEstimado"
                  value={
                    nuevaTarea.tiempoEstimado
                  }
                  onChange={
                    handleNuevaTareaChange
                  }
                  placeholder="Ej. 2 horas"
                />
              </label>

              <label className="form-field">
                <span>
                  <AlertTriangle size={17} />
                  Prioridad
                </span>

                <select
                  name="prioridad"
                  value={
                    nuevaTarea.prioridad
                  }
                  onChange={
                    handleNuevaTareaChange
                  }
                >
                  <option value="Baja">
                    Baja
                  </option>

                  <option value="Media">
                    Media
                  </option>

                  <option value="Alta">
                    Alta
                  </option>

                  <option value="Crítica">
                    Crítica
                  </option>
                </select>
              </label>

              <label className="form-field form-field-full">
                <span>
                  <Wrench size={17} />
                  Tarea de mantenimiento
                </span>

                <textarea
                  rows="4"
                  name="tarea"
                  value={
                    nuevaTarea.tarea
                  }
                  onChange={
                    handleNuevaTareaChange
                  }
                  placeholder="Describí claramente la intervención requerida."
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  limpiarFormulario();
                  setMostrarFormulario(false);
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="primary-button"
              >
                <CheckCircle2
                  size={18}
                />
                Crear tarea
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              Planificación
            </span>

            <h3>
              Tareas de mantenimiento
            </h3>
          </div>

          <p>
            Filtrá por responsable,
            estado, prioridad o equipo.
          </p>
        </div>

        <div
          className="form-grid"
          style={{
            marginBottom: "22px",
          }}
        >
          <label className="form-field">
            <span>
              <Search size={17} />
              Buscar
            </span>

            <input
              type="text"
              name="busqueda"
              value={
                filtros.busqueda
              }
              onChange={
                handleFiltroChange
              }
              placeholder="Buscar equipo o tarea"
            />
          </label>

          <label className="form-field">
            <span>
              <User size={17} />
              Responsable
            </span>

            <select
              name="responsable"
              value={
                filtros.responsable
              }
              onChange={
                handleFiltroChange
              }
            >
              <option value="">
                Todos
              </option>

              {tecnicos.map(
                (tecnico) => (
                  <option
                    key={tecnico}
                    value={tecnico}
                  >
                    {tecnico}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="form-field">
            <span>
              <Filter size={17} />
              Estado
            </span>

            <select
              name="estado"
              value={filtros.estado}
              onChange={
                handleFiltroChange
              }
            >
              <option value="">
                Todos
              </option>

              <option value="Pendiente de asignación">
                Pendiente de asignación
              </option>

              <option value="Asignada">
                Asignada
              </option>

              <option value="En proceso">
                En proceso
              </option>

              <option value="Terminada">
                Terminada
              </option>
            </select>
          </label>

          <label className="form-field">
            <span>
              <AlertTriangle size={17} />
              Prioridad
            </span>

            <select
              name="prioridad"
              value={
                filtros.prioridad
              }
              onChange={
                handleFiltroChange
              }
            >
              <option value="">
                Todas
              </option>

              <option value="Baja">
                Baja
              </option>

              <option value="Media">
                Media
              </option>

              <option value="Alta">
                Alta
              </option>

              <option value="Crítica">
                Crítica
              </option>
            </select>
          </label>

          <label className="form-field">
            <span>
              <Factory size={17} />
              Equipo
            </span>

            <select
              name="equipo"
              value={
                filtros.equipo
              }
              onChange={
                handleFiltroChange
              }
            >
              <option value="">
                Todos
              </option>

              {maquinas.map(
                (maquina) => (
                  <option
                    key={maquina}
                    value={maquina}
                  >
                    {maquina}
                  </option>
                )
              )}
            </select>
          </label>
        </div>

        {tareasFiltradas.length === 0 ? (
          <div
            className="finding-entry-card"
            style={{
              textAlign: "center",
              padding: "30px",
            }}
          >
            <ClipboardList
              size={32}
              style={{
                marginBottom: "10px",
              }}
            />

            <strong>
              No hay tareas con estos filtros.
            </strong>
          </div>
        ) : (
          <div className="findings-list">
            {tareasFiltradas.map(
              (tarea) => (
                <article
                  key={tarea.id}
                  className="finding-item"
                >
                  <div className="finding-index">
                    <Wrench
                      size={15}
                    />
                  </div>

                  <div className="finding-item-content">
                    <div className="finding-item-top">
                      <div>
                        <p>
                          <strong>
                            {tarea.equipo}
                          </strong>
                        </p>

                        <p>
                          {tarea.tarea}
                        </p>

                        <p>
                          <strong>
                            Responsable:
                          </strong>{" "}
                          {
                            tarea.responsable
                          }
                        </p>

                        <p>
                          <strong>
                            Día programado:
                          </strong>{" "}
                          {
                            tarea.diaProgramado
                          }
                        </p>

                        <p>
                          <strong>
                            Tiempo estimado:
                          </strong>{" "}
                          {
                            tarea.tiempoEstimado
                          }
                        </p>
                      </div>
                    </div>

                    <div className="finding-tags">
                      <span
                        className={`criticality-tag ${
                          tarea.prioridad ===
                          "Baja"
                            ? "baja"
                            : tarea.prioridad ===
                                "Media"
                              ? "media"
                              : tarea.prioridad ===
                                  "Alta"
                                ? "alta"
                                : "crítica"
                        }`}
                      >
                        {
                          tarea.prioridad
                        }
                      </span>

                      <span className="maintenance-tag">
                        {
                          tarea.estado
                        }
                      </span>

                      <span className="status-pill">
                        Origen:{" "}
                        {
                          tarea.origen
                        }
                      </span>
                    </div>

                    <div
                      className="finding-entry-actions"
                      style={{
                        justifyContent:
                          "flex-start",
                      }}
                    >
                      {tarea.estado ===
                        "Pendiente de asignación" && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            cambiarEstado(
                              tarea.id,
                              "Asignada"
                            )
                          }
                        >
                          <ClipboardList
                            size={17}
                          />
                          Marcar asignada
                        </button>
                      )}

                      {tarea.estado ===
                        "Asignada" && (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            cambiarEstado(
                              tarea.id,
                              "En proceso"
                            )
                          }
                        >
                          <PlayCircle
                            size={17}
                          />
                          Iniciar tarea
                        </button>
                      )}

                      {tarea.estado ===
                        "En proceso" && (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            cambiarEstado(
                              tarea.id,
                              "Terminada"
                            )
                          }
                        >
                          <CheckCircle2
                            size={17}
                          />
                          Finalizar tarea
                        </button>
                      )}

                      {tarea.estado ===
                        "Terminada" && (
                        <span className="status-pill completed">
                          <CheckCircle2
                            size={14}
                          />
                          Trabajo terminado
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </>
  );
}

export default GestionMantenimiento;
