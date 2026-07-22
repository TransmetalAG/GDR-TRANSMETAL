import React, { useEffect, useMemo, useState } from "react";
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
  ClipboardList,
  Pencil,
  X,
  Trash2,
} from "lucide-react";

import { catalogo } from "../data/CatalogoMaquinas.js";
import { supabase } from "../lib/supabase.js";

const TECNICOS = [
  "Edvin Telles",
  "Carlos Carcuz",
  "Erwin Haz",
  "Anderson López",
];

const CAPACIDAD_DEFAULT = 40;
const PORCENTAJE_PROGRAMABLE = 0.8;

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonday(dateValue = new Date()) {
  const date =
    typeof dateValue === "string"
      ? new Date(`${dateValue}T12:00:00`)
      : new Date(dateValue);

  const day = date.getDay();
  const difference = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + difference);
  date.setHours(12, 0, 0, 0);

  return toDateString(date);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

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
    gembaId: row.gemba_id || null,
    observaciones: row.observaciones || "",
    createdAt: row.created_at || null,
  };
}

function GestionMantenimiento() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(null);

  const [semanaSeleccionada, setSemanaSeleccionada] = useState(
    getMonday(new Date())
  );

  const [tareas, setTareas] = useState([]);

  // Referencia temporal para validar la carga semanal.
  // No se guarda en Supabase y vuelve a 40 h al recargar la app.
  const [capacidadSemanal, setCapacidadSemanal] = useState({
    "Edvin Telles": CAPACIDAD_DEFAULT,
    "Carlos Carcuz": CAPACIDAD_DEFAULT,
    "Erwin Haz": CAPACIDAD_DEFAULT,
    "Anderson López": CAPACIDAD_DEFAULT,
  });

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
    observaciones: "",
  });

  const maquinas = useMemo(() => {
    return [...new Set(catalogo.map((item) => item.maquina))].sort((a, b) =>
      a.localeCompare(b, "es")
    );
  }, []);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("mantenimiento")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al cargar mantenimiento:", error);
      alert(`No se pudo cargar la gestión de mantenimiento.\n\n${error.message}`);
      setLoading(false);
      return;
    }

    const registros = data || [];

    const tareasDb = registros
      .filter((row) => row.tipo_registro === "tarea")
      .map(normalizarTarea);

    setTareas(tareasDb);
    setLoading(false);
  }

  function getHorasDisponibles(responsable) {
    return Number(
      capacidadSemanal[responsable] ?? CAPACIDAD_DEFAULT
    );
  }

  function getHorasProgramadas(responsable, semanaInicio, excludeTaskId = null) {
    const finSemana = addDays(semanaInicio, 6);

    return tareas
      .filter((tarea) => {
        if (!tarea.diaProgramado) return false;
        if (tarea.id === excludeTaskId) return false;
        if (tarea.responsable !== responsable) return false;

        return (
          tarea.diaProgramado >= semanaInicio &&
          tarea.diaProgramado <= finSemana
        );
      })
      .reduce(
        (sum, tarea) => sum + Number(tarea.tiempoEstimado || 0),
        0
      );
  }

  const resumenCapacidad = useMemo(() => {
    return TECNICOS.map((tecnico) => {
      const horasDisponibles = getHorasDisponibles(tecnico);

      const maximoProgramable =
        horasDisponibles * PORCENTAJE_PROGRAMABLE;

      const reservaCorrectiva =
        horasDisponibles - maximoProgramable;

      const horasProgramadas = getHorasProgramadas(
        tecnico,
        semanaSeleccionada
      );

      const disponibleProgramable = Math.max(
        0,
        maximoProgramable - horasProgramadas
      );

      const porcentajeProgramado =
        horasDisponibles > 0
          ? (horasProgramadas / horasDisponibles) * 100
          : 0;

      return {
        tecnico,
        horasDisponibles,
        maximoProgramable,
        reservaCorrectiva,
        horasProgramadas,
        disponibleProgramable,
        porcentajeProgramado,
        sobreProgramado: horasProgramadas > maximoProgramable,
      };
    });
  }, [capacidadSemanal, tareas, semanaSeleccionada]);

  const tareasFiltradas = useMemo(() => {
    return tareas.filter((tarea) => {
      const coincideResponsable =
        !filtros.responsable ||
        tarea.responsable === filtros.responsable;

      const coincideEstado =
        !filtros.estado ||
        tarea.estado === filtros.estado;

      const coincidePrioridad =
        !filtros.prioridad ||
        tarea.prioridad === filtros.prioridad;

      const coincideEquipo =
        !filtros.equipo ||
        tarea.equipo === filtros.equipo;

      const textoBusqueda = filtros.busqueda.trim().toLowerCase();

      const coincideBusqueda =
        !textoBusqueda ||
        tarea.tarea.toLowerCase().includes(textoBusqueda) ||
        tarea.equipo.toLowerCase().includes(textoBusqueda);

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
        (tarea) => tarea.estado === "Pendiente de asignación"
      ).length,

      asignadas: tareas.filter(
        (tarea) => tarea.estado === "Asignada"
      ).length,

      enProceso: tareas.filter(
        (tarea) => tarea.estado === "En proceso"
      ).length,

      terminadas: tareas.filter(
        (tarea) => tarea.estado === "Terminada"
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
      observaciones: "",
    });

    setModoEdicion(null);
  }

  function abrirNuevaTarea() {
    limpiarFormulario();
    setMostrarFormulario(true);
  }

  function editarTarea(tarea) {
    setModoEdicion(tarea.id);

    setNuevaTarea({
      equipo: tarea.equipo,
      tarea: tarea.tarea,
      responsable: tarea.responsable,
      diaProgramado: tarea.diaProgramado,
      tiempoEstimado:
        tarea.tiempoEstimado === "" ? "" : String(tarea.tiempoEstimado),
      prioridad: tarea.prioridad,
      observaciones: tarea.observaciones || "",
    });

    setMostrarFormulario(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function validarCargaSemanal() {
    if (
      !nuevaTarea.responsable ||
      !nuevaTarea.diaProgramado ||
      !nuevaTarea.tiempoEstimado
    ) {
      return true;
    }

    const horasTarea = Number(nuevaTarea.tiempoEstimado);

    if (!Number.isFinite(horasTarea) || horasTarea <= 0) {
      return true;
    }

    const semanaInicio = getMonday(nuevaTarea.diaProgramado);

    const horasDisponibles = getHorasDisponibles(
      nuevaTarea.responsable
    );

    const maximoProgramable =
      horasDisponibles * PORCENTAJE_PROGRAMABLE;

    const horasProgramadas = getHorasProgramadas(
      nuevaTarea.responsable,
      semanaInicio,
      modoEdicion
    );

    const totalProyectado = horasProgramadas + horasTarea;

    if (totalProyectado <= maximoProgramable) {
      return true;
    }

    const porcentaje =
      horasDisponibles > 0
        ? (totalProyectado / horasDisponibles) * 100
        : 0;

    return window.confirm(
      `${nuevaTarea.responsable} quedaría con ${totalProyectado.toFixed(
        1
      )} h programadas (${porcentaje.toFixed(
        1
      )}% de su capacidad semanal).\n\n` +
        `El objetivo máximo programable es ${maximoProgramable.toFixed(
          1
        )} h (80%), dejando 20% para correctivos.\n\n` +
        "¿Deseás guardar la tarea de todas formas?"
    );
  }

  async function guardarNuevaTarea(event) {
    event.preventDefault();

    if (!nuevaTarea.equipo) {
      alert("Seleccioná el equipo a intervenir.");
      return;
    }

    if (!nuevaTarea.tarea.trim()) {
      alert("Describí la tarea de mantenimiento.");
      return;
    }

    if (!nuevaTarea.responsable) {
      alert("Seleccioná un responsable.");
      return;
    }

    if (!nuevaTarea.diaProgramado) {
      alert("Seleccioná el día programado.");
      return;
    }

    const horas = Number(nuevaTarea.tiempoEstimado);

    if (!Number.isFinite(horas) || horas <= 0) {
      alert("Ingresá un tiempo estimado válido en horas.");
      return;
    }

    if (!validarCargaSemanal()) {
      return;
    }

    setGuardando(true);

    const payload = {
      tipo_registro: "tarea",
      equipo: nuevaTarea.equipo,
      tarea: nuevaTarea.tarea.trim(),
      responsable: nuevaTarea.responsable,
      dia_programado: nuevaTarea.diaProgramado,
      tiempo_estimado_horas: horas,
      prioridad: nuevaTarea.prioridad,
      estado: "Asignada",
      origen: modoEdicion
        ? tareas.find((item) => item.id === modoEdicion)?.origen || "Manual"
        : "Manual",
      observaciones: nuevaTarea.observaciones.trim() || null,
    };

    let error;

    if (modoEdicion) {
      const response = await supabase
        .from("mantenimiento")
        .update(payload)
        .eq("id", modoEdicion);

      error = response.error;
    } else {
      const response = await supabase
        .from("mantenimiento")
        .insert(payload);

      error = response.error;
    }

    if (error) {
      console.error("Error al guardar tarea:", error);
      alert(`No se pudo guardar la tarea.\n\n${error.message}`);
      setGuardando(false);
      return;
    }

    limpiarFormulario();
    setMostrarFormulario(false);
    setGuardando(false);

    await cargarDatos();
  }

  function actualizarCapacidadLocal(tecnico, value) {
    const horas = value === "" ? "" : Number(value);

    setCapacidadSemanal((previous) => ({
      ...previous,
      [tecnico]: horas,
    }));
  }

  async function eliminarTarea(tarea) {
    const confirmar = window.confirm(
      `¿Seguro que deseás eliminar esta tarea de mantenimiento?\n\n${tarea.equipo} — ${tarea.tarea}\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("mantenimiento")
      .delete()
      .eq("id", tarea.id)
      .eq("tipo_registro", "tarea");

    if (error) {
      console.error("Error al eliminar tarea:", error);
      alert(`No se pudo eliminar la tarea.\n\n${error.message}`);
      return;
    }

    setTareas((previous) =>
      previous.filter((item) => item.id !== tarea.id)
    );

    if (modoEdicion === tarea.id) {
      limpiarFormulario();
      setMostrarFormulario(false);
    }
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
            Planificá, asigná y controlá las tareas de mantenimiento
            provenientes de Gemba o generadas manualmente.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={abrirNuevaTarea}
        >
          <Plus size={19} />
          Nueva tarea
        </button>
      </header>

      <section
        className="section-block"
        style={{ marginBottom: "22px" }}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              Capacidad semanal
            </span>

            <h3>
              Programación por técnico
            </h3>

            <p
              style={{
                margin: "8px 0 0",
                color: "#667085",
                fontSize: "12px",
              }}
            >
              La capacidad es solo una referencia temporal para controlar
              el límite del 80%; no se guarda en Supabase.
            </p>
          </div>

          <label
            className="form-field"
            style={{ minWidth: "220px" }}
          >
            <span>
              <CalendarDays size={17} />
              Semana
            </span>

            <input
              type="date"
              value={semanaSeleccionada}
              onChange={(event) =>
                setSemanaSeleccionada(getMonday(event.target.value))
              }
            />
          </label>
        </div>

        <div className="kpi-grid">
          {resumenCapacidad.map((item) => {
            const valorEditable =
              capacidadSemanal[item.tecnico] ?? CAPACIDAD_DEFAULT;

            return (
              <article
                className="kpi-card"
                key={item.tecnico}
              >
                <span>
                  {item.tecnico}
                </span>

                <div
                  style={{
                    marginTop: "12px",
                  }}
                >
                  <label className="form-field">
                    <span>
                      Capacidad semanal
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={valorEditable}
                      onChange={(event) =>
                        actualizarCapacidadLocal(
                          item.tecnico,
                          event.target.value
                        )
                      }
                    />

                    <small
                      style={{
                        marginTop: "6px",
                        color: "#98a2b3",
                      }}
                    >
                      Valor temporal para validar la programación.
                    </small>
                  </label>
                </div>

                <div
                  style={{
                    marginTop: "14px",
                    display: "grid",
                    gap: "6px",
                    fontSize: "12px",
                    color: "#667085",
                  }}
                >
                  <span>
                    Programado:{" "}
                    <strong>
                      {item.horasProgramadas.toFixed(1)} h
                    </strong>
                  </span>

                  <span>
                    Máximo 80%:{" "}
                    <strong>
                      {item.maximoProgramable.toFixed(1)} h
                    </strong>
                  </span>

                  <span>
                    Disponible para programar:{" "}
                    <strong>
                      {item.disponibleProgramable.toFixed(1)} h
                    </strong>
                  </span>

                  <span>
                    Reserva correctiva 20%:{" "}
                    <strong>
                      {item.reservaCorrectiva.toFixed(1)} h
                    </strong>
                  </span>
                </div>

                <div
                  style={{
                    marginTop: "14px",
                    height: "8px",
                    borderRadius: "999px",
                    background: "#eef2f7",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        item.porcentajeProgramado
                      )}%`,
                      height: "100%",
                      background: item.sobreProgramado
                        ? "#e11d48"
                        : "#2563eb",
                    }}
                  />
                </div>

                <small
                  style={{
                    marginTop: "8px",
                    color: item.sobreProgramado
                      ? "#be123c"
                      : "#98a2b3",
                  }}
                >
                  {item.sobreProgramado
                    ? `⚠ ${item.porcentajeProgramado.toFixed(
                        1
                      )}% programado`
                    : `${item.porcentajeProgramado.toFixed(
                        1
                      )}% programado`}
                </small>
              </article>
            );
          })}
        </div>
      </section>

      <section className="kpi-grid">
        <div className="kpi-card">
          <span>
            Pendientes
          </span>

          <strong>
            {indicadores.pendientes}
          </strong>

          <small>
            Sin planificación completa
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
                {modoEdicion
                  ? "Planificación"
                  : "Nueva intervención"}
              </span>

              <h3>
                {modoEdicion
                  ? "Editar / planificar tarea"
                  : "Crear tarea de mantenimiento"}
              </h3>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                limpiarFormulario();
                setMostrarFormulario(false);
              }}
            >
              <X size={17} />
              Cerrar
            </button>
          </div>

          <form onSubmit={guardarNuevaTarea}>
            <div className="form-grid">
              <label className="form-field">
                <span>
                  <Factory size={17} />
                  Equipo a intervenir
                </span>

                <select
                  name="equipo"
                  value={nuevaTarea.equipo}
                  onChange={handleNuevaTareaChange}
                >
                  <option value="">
                    Seleccionar equipo
                  </option>

                  {maquinas.map((maquina) => (
                    <option
                      key={maquina}
                      value={maquina}
                    >
                      {maquina}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>
                  <User size={17} />
                  Responsable
                </span>

                <select
                  name="responsable"
                  value={nuevaTarea.responsable}
                  onChange={handleNuevaTareaChange}
                >
                  <option value="">
                    Seleccionar responsable
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

              <label className="form-field">
                <span>
                  <CalendarDays size={17} />
                  Día programado
                </span>

                <input
                  type="date"
                  name="diaProgramado"
                  value={nuevaTarea.diaProgramado}
                  onChange={handleNuevaTareaChange}
                />
              </label>

              <label className="form-field">
                <span>
                  <Clock3 size={17} />
                  Tiempo estimado (horas)
                </span>

                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  name="tiempoEstimado"
                  value={nuevaTarea.tiempoEstimado}
                  onChange={handleNuevaTareaChange}
                  placeholder="Ej. 2"
                />
              </label>

              <label className="form-field">
                <span>
                  <AlertTriangle size={17} />
                  Prioridad
                </span>

                <select
                  name="prioridad"
                  value={nuevaTarea.prioridad}
                  onChange={handleNuevaTareaChange}
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
                  value={nuevaTarea.tarea}
                  onChange={handleNuevaTareaChange}
                  placeholder="Describí claramente la intervención requerida."
                />
              </label>

              <label className="form-field form-field-full">
                <span>
                  <ClipboardList size={17} />
                  Observaciones de planificación
                </span>

                <textarea
                  rows="3"
                  name="observaciones"
                  value={nuevaTarea.observaciones}
                  onChange={handleNuevaTareaChange}
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
                disabled={guardando}
              >
                <CheckCircle2 size={18} />
                {guardando
                  ? "Guardando..."
                  : modoEdicion
                    ? "Guardar planificación"
                    : "Crear tarea"}
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
            Filtrá por responsable, estado, prioridad o equipo.
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
              value={filtros.busqueda}
              onChange={handleFiltroChange}
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
              value={filtros.responsable}
              onChange={handleFiltroChange}
            >
              <option value="">
                Todos
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

          <label className="form-field">
            <span>
              <Filter size={17} />
              Estado
            </span>

            <select
              name="estado"
              value={filtros.estado}
              onChange={handleFiltroChange}
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
              value={filtros.prioridad}
              onChange={handleFiltroChange}
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
              value={filtros.equipo}
              onChange={handleFiltroChange}
            >
              <option value="">
                Todos
              </option>

              {maquinas.map((maquina) => (
                <option
                  key={maquina}
                  value={maquina}
                >
                  {maquina}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div
            className="finding-entry-card"
            style={{
              textAlign: "center",
              padding: "30px",
            }}
          >
            <strong>
              Cargando tareas...
            </strong>
          </div>
        ) : tareasFiltradas.length === 0 ? (
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
            {tareasFiltradas.map((tarea) => (
              <article
                key={tarea.id}
                className="finding-item"
              >
                <div className="finding-index">
                  <Wrench size={15} />
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
                        {tarea.responsable ||
                          "Pendiente de asignación"}
                      </p>

                      <p>
                        <strong>
                          Día programado:
                        </strong>{" "}
                        {formatDate(tarea.diaProgramado)}
                      </p>

                      <p>
                        <strong>
                          Tiempo estimado:
                        </strong>{" "}
                        {tarea.tiempoEstimado !== ""
                          ? `${tarea.tiempoEstimado} h`
                          : "Sin definir"}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => editarTarea(tarea)}
                      >
                        <Pencil size={16} />
                        {tarea.estado === "Pendiente de asignación"
                          ? "Planificar"
                          : "Editar"}
                      </button>

                      <button
                        type="button"
                        className="icon-delete-button"
                        onClick={() => eliminarTarea(tarea)}
                        title="Eliminar tarea"
                        aria-label={`Eliminar tarea ${tarea.tarea}`}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="finding-tags">
                    <span
                      className={`criticality-tag ${
                        tarea.prioridad === "Baja"
                          ? "baja"
                          : tarea.prioridad === "Media"
                            ? "media"
                            : tarea.prioridad === "Alta"
                              ? "alta"
                              : "crítica"
                      }`}
                    >
                      {tarea.prioridad}
                    </span>

                    <span className="maintenance-tag">
                      {tarea.estado}
                    </span>

                    <span className="status-pill">
                      Origen: {tarea.origen}
                    </span>
                  </div>

                  {tarea.observaciones && (
                    <p
                      style={{
                        marginTop: "12px",
                        color: "#667085",
                        fontSize: "12px",
                      }}
                    >
                      <strong>
                        Observaciones:
                      </strong>{" "}
                      {tarea.observaciones}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default GestionMantenimiento;
