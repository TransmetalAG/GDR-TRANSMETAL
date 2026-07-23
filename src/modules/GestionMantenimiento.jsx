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
  ChevronDown,
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
    fechaCierre: row.fecha_cierre || null,
  };
}

function GestionMantenimiento() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(null);
  const [estadoAbiertoId, setEstadoAbiertoId] = useState(null);

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
    fechaInicio: "",
    fechaFin: "",
  });

  const [nuevaTarea, setNuevaTarea] = useState({
    equipo: "",
    tarea: "",
    responsable: "",
    diaProgramado: "",
    tiempoEstimado: "",
    prioridad: "Media",
    estado: "Pendiente de asignación",
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

      const coincideFechaInicio =
        !filtros.fechaInicio ||
        (tarea.diaProgramado &&
          tarea.diaProgramado >= filtros.fechaInicio);

      const coincideFechaFin =
        !filtros.fechaFin ||
        (tarea.diaProgramado &&
          tarea.diaProgramado <= filtros.fechaFin);

      return (
        coincideResponsable &&
        coincideEstado &&
        coincidePrioridad &&
        coincideEquipo &&
        coincideBusqueda &&
        coincideFechaInicio &&
        coincideFechaFin
      );
    });
  }, [tareas, filtros]);

  const indicadores = useMemo(() => {
    const base = tareasFiltradas;

    const pendientes = base.filter(
      (tarea) => tarea.estado === "Pendiente de asignación"
    ).length;

    const asignadas = base.filter(
      (tarea) => tarea.estado === "Asignada"
    ).length;

    const enProceso = base.filter(
      (tarea) => tarea.estado === "En proceso"
    ).length;

    const porVerificar = base.filter(
      (tarea) => tarea.estado === "Terminada"
    ).length;

    const cerradas = base.filter(
      (tarea) => tarea.estado === "Cerrada"
    ).length;

    const total = base.length;

    const porcentajeCierre =
      total > 0
        ? (cerradas / total) * 100
        : 0;

    return {
      pendientes,
      asignadas,
      enProceso,
      porVerificar,
      cerradas,
      total,
      porcentajeCierre,
    };
  }, [tareasFiltradas]);

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
      estado: "Pendiente de asignación",
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
      estado: tarea.estado || "Pendiente de asignación",
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
      estado:
        nuevaTarea.responsable &&
        nuevaTarea.diaProgramado &&
        horas > 0 &&
        nuevaTarea.estado === "Pendiente de asignación"
          ? "Asignada"
          : nuevaTarea.estado,
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

  async function cambiarEstadoDirecto(tareaId, nuevoEstado) {
    // Actualización optimista para que el cambio se vea inmediatamente.
    const estadoAnterior = tareas.find(
      (item) => item.id === tareaId
    )?.estado;

    setTareas((previous) =>
      previous.map((item) =>
        item.id === tareaId
          ? { ...item, estado: nuevoEstado }
          : item
      )
    );

    const payload = {
      estado: nuevoEstado,
    };

    // Solo una tarea verificada por liderazgo queda formalmente cerrada.
    if (nuevoEstado === "Cerrada") {
      payload.fecha_cierre = new Date().toISOString();
    } else {
      payload.fecha_cierre = null;
    }

    const { error } = await supabase
      .from("mantenimiento")
      .update(payload)
      .eq("id", tareaId)
      .eq("tipo_registro", "tarea");

    if (error) {
      console.error("Error al cambiar estado:", error);

      // Revertimos visualmente si Supabase falla.
      setTareas((previous) =>
        previous.map((item) =>
          item.id === tareaId
            ? { ...item, estado: estadoAnterior }
            : item
        )
      );

      alert(
        `No se pudo cambiar el estado de la tarea.\n\n${error.message}`
      );
    }
  }

  async function verificarYCerrar(tarea) {
    const confirmar = window.confirm(
      `¿Confirmás que el trabajo fue verificado y quedó correctamente resuelto?\n\n${tarea.equipo} — ${tarea.tarea}`
    );
    if (!confirmar) return;
    await cambiarEstadoDirecto(tarea.id, "Cerrada");
  }

  async function reabrirTarea(tarea) {
    const confirmar = window.confirm(
      `¿Deseás reabrir esta tarea porque el problema no quedó resuelto?\n\n${tarea.equipo} — ${tarea.tarea}`
    );
    if (!confirmar) return;
    await cambiarEstadoDirecto(tarea.id, "Asignada");
  }

  function getEstiloEstado(estado) {
    if (estado === "Cerrada") {
      return {
        background: "#dcfce7",
        color: "#15803d",
        border: "1px solid #bbf7d0",
      };
    }

    if (estado === "Terminada") {
      return {
        background: "#f3e8ff",
        color: "#7e22ce",
        border: "1px solid #e9d5ff",
      };
    }

    if (estado === "En proceso") {
      return {
        background: "#fef3c7",
        color: "#b45309",
        border: "1px solid #fde68a",
      };
    }

    if (estado === "Asignada") {
      return {
        background: "#dbeafe",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
      };
    }

    return {
      background: "#fee2e2",
      color: "#b91c1c",
      border: "1px solid #fecaca",
    };
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
        style={{ marginBottom: "16px", padding: "14px 16px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "end",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "10px",
          }}
        >
          <div>
            <span className="eyebrow">Capacidad semanal</span>
            <h3 style={{ margin: "2px 0 0", fontSize: "16px" }}>
              Programación por técnico
            </h3>
          </div>

          <label
            className="form-field"
            style={{ minWidth: "170px", margin: 0 }}
          >
            <span style={{ fontSize: "11px" }}>
              <CalendarDays size={14} />
              Semana
            </span>
            <input
              type="date"
              value={semanaSeleccionada}
              onChange={(event) =>
                setSemanaSeleccionada(getMonday(event.target.value))
              }
              style={{ minHeight: "34px", padding: "6px 8px" }}
            />
          </label>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "760px",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr style={{ color: "#667085", textAlign: "left" }}>
                <th style={{ padding: "6px 8px" }}>Técnico</th>
                <th style={{ padding: "6px 8px" }}>Capacidad</th>
                <th style={{ padding: "6px 8px" }}>Programado</th>
                <th style={{ padding: "6px 8px" }}>Máx. 80%</th>
                <th style={{ padding: "6px 8px" }}>Disponible</th>
                <th style={{ padding: "6px 8px" }}>Reserva 20%</th>
                <th style={{ padding: "6px 8px", minWidth: "130px" }}>Uso</th>
              </tr>
            </thead>
            <tbody>
              {resumenCapacidad.map((item) => {
                const valorEditable =
                  capacidadSemanal[item.tecnico] ?? CAPACIDAD_DEFAULT;

                return (
                  <tr
                    key={item.tecnico}
                    style={{ borderTop: "1px solid #eef2f7" }}
                  >
                    <td style={{ padding: "7px 8px", fontWeight: 700 }}>
                      {item.tecnico}
                    </td>
                    <td style={{ padding: "7px 8px" }}>
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
                        style={{
                          width: "64px",
                          minHeight: "30px",
                          padding: "4px 7px",
                          border: "1px solid #d0d5dd",
                          borderRadius: "7px",
                          font: "inherit",
                        }}
                      />{" "}
                      h
                    </td>
                    <td style={{ padding: "7px 8px", fontWeight: 700 }}>
                      {item.horasProgramadas.toFixed(1)} h
                    </td>
                    <td style={{ padding: "7px 8px" }}>
                      {item.maximoProgramable.toFixed(1)} h
                    </td>
                    <td style={{ padding: "7px 8px" }}>
                      {item.disponibleProgramable.toFixed(1)} h
                    </td>
                    <td style={{ padding: "7px 8px" }}>
                      {item.reservaCorrectiva.toFixed(1)} h
                    </td>
                    <td style={{ padding: "7px 8px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "7px",
                        }}
                      >
                        <div
                          style={{
                            width: "72px",
                            height: "6px",
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
                        <span
                          style={{
                            color: item.sobreProgramado
                              ? "#be123c"
                              : "#667085",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.porcentajeProgramado.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <small
          style={{
            display: "block",
            marginTop: "7px",
            color: "#98a2b3",
            fontSize: "10px",
          }}
        >
          Capacidad temporal para validar el límite programable del 80%.
        </small>
      </section>

      <section
        className="section-block"
        style={{
          marginBottom: "12px",
          padding: "10px 14px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            flexWrap: "wrap",
            fontSize: "12px",
          }}
        >
          <span>
            <strong>{indicadores.total}</strong> tareas
          </span>

          <span>
            Pendientes: <strong>{indicadores.pendientes}</strong>
          </span>

          <span>
            Asignadas: <strong>{indicadores.asignadas}</strong>
          </span>

          <span>
            En proceso: <strong>{indicadores.enProceso}</strong>
          </span>

          <span>
            Por verificar: <strong>{indicadores.porVerificar}</strong>
          </span>

          <span>
            Cerradas: <strong>{indicadores.cerradas}</strong>
          </span>

          <span
            style={{
              marginLeft: "auto",
              fontWeight: 800,
              color:
                indicadores.porcentajeCierre >= 80
                  ? "#15803d"
                  : indicadores.porcentajeCierre >= 50
                    ? "#b45309"
                    : "#b91c1c",
            }}
          >
            Cierre: {indicadores.porcentajeCierre.toFixed(1)}%
          </span>
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

              <label className="form-field">
                <span>
                  <Filter size={17} />
                  Estado
                </span>

                <select
                  name="estado"
                  value={nuevaTarea.estado}
                  onChange={handleNuevaTareaChange}
                >
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
                  <option value="Cerrada">
                    Cerrada
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

      <section className="section-block" style={{ padding: "14px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "end",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "12px",
          }}
        >
          <div>
            <span className="eyebrow">Planificación</span>
            <h3 style={{ margin: "2px 0 0" }}>
              Tareas de mantenimiento
            </h3>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: "4px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700 }}>
                Inicio
              </span>
              <input
                type="date"
                name="fechaInicio"
                value={filtros.fechaInicio}
                onChange={handleFiltroChange}
                style={{
                  minHeight: "34px",
                  padding: "5px 8px",
                  border: "1px solid #d0d5dd",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "4px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700 }}>
                Fin
              </span>
              <input
                type="date"
                name="fechaFin"
                value={filtros.fechaFin}
                onChange={handleFiltroChange}
                style={{
                  minHeight: "34px",
                  padding: "5px 8px",
                  border: "1px solid #d0d5dd",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "4px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700 }}>
                Responsable
              </span>
              <select
                name="responsable"
                value={filtros.responsable}
                onChange={handleFiltroChange}
                style={{
                  minHeight: "34px",
                  minWidth: "150px",
                  padding: "5px 8px",
                  border: "1px solid #d0d5dd",
                  borderRadius: "8px",
                  fontSize: "12px",
                  background: "#fff",
                }}
              >
                <option value="">Todos</option>
                {TECNICOS.map((tecnico) => (
                  <option key={tecnico} value={tecnico}>
                    {tecnico}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "4px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700 }}>
                Estado
              </span>
              <select
                name="estado"
                value={filtros.estado}
                onChange={handleFiltroChange}
                style={{
                  minHeight: "34px",
                  minWidth: "140px",
                  padding: "5px 8px",
                  border: "1px solid #d0d5dd",
                  borderRadius: "8px",
                  fontSize: "12px",
                  background: "#fff",
                }}
              >
                <option value="">Todos</option>
                <option value="Pendiente de asignación">
                  Pendiente
                </option>
                <option value="Asignada">Asignada</option>
                <option value="En proceso">En proceso</option>
                <option value="Terminada">Por verificar</option>
                <option value="Cerrada">Cerrada</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: "4px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700 }}>
                Prioridad
              </span>
              <select
                name="prioridad"
                value={filtros.prioridad}
                onChange={handleFiltroChange}
                style={{
                  minHeight: "34px",
                  minWidth: "110px",
                  padding: "5px 8px",
                  border: "1px solid #d0d5dd",
                  borderRadius: "8px",
                  fontSize: "12px",
                  background: "#fff",
                }}
              >
                <option value="">Todas</option>
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
                <option value="Crítica">Crítica</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: "4px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700 }}>
                Equipo
              </span>
              <select
                name="equipo"
                value={filtros.equipo}
                onChange={handleFiltroChange}
                style={{
                  minHeight: "34px",
                  minWidth: "140px",
                  maxWidth: "180px",
                  padding: "5px 8px",
                  border: "1px solid #d0d5dd",
                  borderRadius: "8px",
                  fontSize: "12px",
                  background: "#fff",
                }}
              >
                <option value="">Todos</option>
                {maquinas.map((maquina) => (
                  <option key={maquina} value={maquina}>
                    {maquina}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "4px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700 }}>
                Buscar
              </span>
              <input
                type="text"
                name="busqueda"
                value={filtros.busqueda}
                onChange={handleFiltroChange}
                placeholder="Equipo o tarea"
                style={{
                  minHeight: "34px",
                  width: "160px",
                  padding: "5px 8px",
                  border: "1px solid #d0d5dd",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </label>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "6px",
            marginBottom: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              const inicio = getMonday(new Date());
              setFiltros((previous) => ({
                ...previous,
                fechaInicio: inicio,
                fechaFin: addDays(inicio, 6),
              }));
            }}
            style={{ padding: "6px 10px", fontSize: "11px" }}
          >
            Esta semana
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              const hoy = new Date();
              const inicio = toDateString(
                new Date(hoy.getFullYear(), hoy.getMonth(), 1)
              );
              const fin = toDateString(
                new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
              );

              setFiltros((previous) => ({
                ...previous,
                fechaInicio: inicio,
                fechaFin: fin,
              }));
            }}
            style={{ padding: "6px 10px", fontSize: "11px" }}
          >
            Este mes
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              setFiltros({
                responsable: "",
                estado: "",
                prioridad: "",
                equipo: "",
                busqueda: "",
                fechaInicio: "",
                fechaFin: "",
              })
            }
            style={{ padding: "6px 10px", fontSize: "11px" }}
          >
            Limpiar
          </button>
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

                      {tarea.estado === "Terminada" && (
                        <>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => verificarYCerrar(tarea)}
                            title="Verificar el trabajo y cerrar la tarea"
                          >
                            <CheckCircle2 size={16} />
                            Verificar y cerrar
                          </button>

                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => reabrirTarea(tarea)}
                            title="Reabrir porque el problema no quedó resuelto"
                          >
                            Reabrir
                          </button>
                        </>
                      )}

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

                    <div
                      style={{
                        position: "relative",
                        width: "190px",
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={estadoAbiertoId === tarea.id}
                        aria-label={`Cambiar estado de ${tarea.tarea}`}
                        title="Cambiar estado"
                        onClick={() =>
                          setEstadoAbiertoId((previous) =>
                            previous === tarea.id ? null : tarea.id
                          )
                        }
                        style={{
                          ...getEstiloEstado(tarea.estado),
                          width: "190px",
                          minHeight: "36px",
                          borderRadius: "999px",
                          padding: "6px 34px 6px 16px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          outline: "none",
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            width: "100%",
                            textAlign: "center",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {tarea.estado}
                        </span>

                        <ChevronDown
                          size={16}
                          style={{
                            position: "absolute",
                            right: "11px",
                            top: "50%",
                            transform:
                              estadoAbiertoId === tarea.id
                                ? "translateY(-50%) rotate(180deg)"
                                : "translateY(-50%)",
                            transition: "transform 0.15s ease",
                          }}
                        />
                      </button>

                      {estadoAbiertoId === tarea.id && (
                        <div
                          role="listbox"
                          aria-label={`Estados disponibles para ${tarea.tarea}`}
                          style={{
                            position: "absolute",
                            top: "calc(100% + 6px)",
                            left: 0,
                            width: "190px",
                            zIndex: 50,
                            background: "white",
                            border: "1px solid #dfe4ea",
                            borderRadius: "12px",
                            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.14)",
                            overflow: "hidden",
                          }}
                        >
                          {[
                            "Pendiente de asignación",
                            "Asignada",
                            "En proceso",
                            "Terminada",
                            "Cerrada",
                          ].map((estado) => {
                            const seleccionado = tarea.estado === estado;

                            return (
                              <button
                                key={estado}
                                type="button"
                                role="option"
                                aria-selected={seleccionado}
                                onClick={async () => {
                                  setEstadoAbiertoId(null);

                                  if (!seleccionado) {
                                    await cambiarEstadoDirecto(
                                      tarea.id,
                                      estado
                                    );
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  border: 0,
                                  borderBottom:
                                    estado !== "Cerrada"
                                      ? "1px solid #eef2f7"
                                      : "none",
                                  padding: "10px 12px",
                                  background: seleccionado
                                    ? getEstiloEstado(estado).background
                                    : "white",
                                  color: getEstiloEstado(estado).color,
                                  fontSize: "12px",
                                  fontWeight: seleccionado ? 800 : 700,
                                  cursor: "pointer",
                                  textAlign: "center",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {estado === "Terminada"
                                  ? "Por verificar"
                                  : estado}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

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
