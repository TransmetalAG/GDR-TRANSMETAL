import React, { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CalendarDays,
  User,
  Factory,
  Workflow,
  Pencil,
  Trash2,
  X,
  ChevronDown,
} from "lucide-react";

import { catalogo } from "../data/CatalogoMaquinas.js";
import { colaboradores } from "../data/CatalogoColaboradores.js";
import { supabase } from "../lib/supabase.js";

const ESTADOS = [
  "Pendiente",
  "En proceso",
  "Terminada",
];

const PILARES = [
  "Seguridad",
  "Calidad",
  "Proceso / Productividad",
  "Otro",
];

const PRIORIDADES = [
  "Baja",
  "Media",
  "Alta",
  "Crítica",
];

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat(
    "es-GT",
    {
      dateStyle: "medium",
    }
  ).format(
    new Date(
      `${dateString}T12:00:00`
    )
  );
}

function normalizarAccion(row) {
  return {
    id: row.id,
    gembaId: row.gemba_id || null,
    origen: row.origen || "Manual",

    pilar: row.pilar || "",
    maquina: row.maquina || "",
    proceso: row.proceso || "",
    auditor: row.auditor || "",
    colaborador: row.colaborador || "",

    hallazgo: row.hallazgo || "",
    prioridad: row.prioridad || "Media",

    que: row.que || "",
    porQue: row.por_que || "",
    responsable: row.responsable || "",
    fechaCompromiso:
      row.fecha_compromiso || "",
    como: row.como || "",
    costoEstimado:
      row.costo_estimado !== null &&
      row.costo_estimado !== undefined
        ? Number(row.costo_estimado)
        : "",

    estado: row.estado || "Pendiente",
    observaciones:
      row.observaciones || "",
    evidencia: row.evidencia || "",
    fechaCierre: row.fecha_cierre || null,

    createdAt: row.created_at || null,
  };
}

function PlanAccion() {
  const [loading, setLoading] =
    useState(true);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    mostrarFormulario,
    setMostrarFormulario,
  ] = useState(false);

  const [
    modoEdicion,
    setModoEdicion,
  ] = useState(null);

  const [
    estadoAbiertoId,
    setEstadoAbiertoId,
  ] = useState(null);

  const [acciones, setAcciones] =
    useState([]);

  const [filtros, setFiltros] =
    useState({
      busqueda: "",
      pilar: "",
      responsable: "",
      estado: "",
      prioridad: "",
      maquina: "",
      origen: "",
    });

  const [nuevaAccion, setNuevaAccion] =
    useState({
      origen: "Manual",

      pilar: "",
      maquina: "",
      proceso: "",
      auditor: "",
      colaborador: "",

      hallazgo: "",
      prioridad: "Media",

      que: "",
      porQue: "",
      responsable: "",
      fechaCompromiso: "",
      como: "",
      costoEstimado: "",

      estado: "Pendiente",
      observaciones: "",
      evidencia: "",
    });

  const maquinas = useMemo(() => {
    return [
      ...new Set(
        catalogo.map(
          (item) => item.maquina
        )
      ),
    ].sort((a, b) =>
      a.localeCompare(b, "es")
    );
  }, []);

  const procesosDisponibles =
    useMemo(() => {
      if (!nuevaAccion.maquina) {
        return [];
      }

      return [
        ...new Set(
          catalogo
            .filter(
              (item) =>
                item.maquina ===
                nuevaAccion.maquina
            )
            .map(
              (item) => item.proceso
            )
        ),
      ].sort((a, b) =>
        a.localeCompare(b, "es")
      );
    }, [nuevaAccion.maquina]);

  const responsables = useMemo(() => {
    const existentes = acciones
      .map(
        (accion) =>
          accion.responsable
      )
      .filter(Boolean);

    return [
      ...new Set([
        ...colaboradores,
        ...existentes,
      ]),
    ].sort((a, b) =>
      a.localeCompare(b, "es")
    );
  }, [acciones]);

  useEffect(() => {
    cargarAcciones();
  }, []);

  async function cargarAcciones() {
    setLoading(true);

    const { data, error } =
      await supabase
        .from("plan_accion")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (error) {
      console.error(
        "Error al cargar plan de acción:",
        error
      );

      alert(
        `No se pudo cargar el Plan de Acción.\n\n${error.message}`
      );

      setLoading(false);
      return;
    }

    setAcciones(
      (data || []).map(
        normalizarAccion
      )
    );

    setLoading(false);
  }

  function estaVencida(accion) {
    if (
      accion.estado ===
      "Terminada"
    ) {
      return false;
    }

    if (
      !accion.fechaCompromiso
    ) {
      return false;
    }

    const hoy = toDateString(
      new Date()
    );

    return (
      accion.fechaCompromiso <
      hoy
    );
  }

  const indicadores = useMemo(() => {
    return {
      pendientes:
        acciones.filter(
          (accion) =>
            accion.estado ===
            "Pendiente"
        ).length,

      enProceso:
        acciones.filter(
          (accion) =>
            accion.estado ===
            "En proceso"
        ).length,

      terminadas:
        acciones.filter(
          (accion) =>
            accion.estado ===
            "Terminada"
        ).length,

      vencidas:
        acciones.filter(
          estaVencida
        ).length,
    };
  }, [acciones]);

  const accionesFiltradas =
    useMemo(() => {
      const texto =
        filtros.busqueda
          .trim()
          .toLowerCase();

      return acciones.filter(
        (accion) => {
          const coincideBusqueda =
            !texto ||
            accion.hallazgo
              .toLowerCase()
              .includes(texto) ||
            accion.que
              .toLowerCase()
              .includes(texto) ||
            accion.maquina
              .toLowerCase()
              .includes(texto) ||
            accion.proceso
              .toLowerCase()
              .includes(texto) ||
            accion.responsable
              .toLowerCase()
              .includes(texto);

          const coincidePilar =
            !filtros.pilar ||
            accion.pilar ===
              filtros.pilar;

          const coincideResponsable =
            !filtros.responsable ||
            accion.responsable ===
              filtros.responsable;

          const coincideEstado =
            !filtros.estado ||
            accion.estado ===
              filtros.estado;

          const coincidePrioridad =
            !filtros.prioridad ||
            accion.prioridad ===
              filtros.prioridad;

          const coincideMaquina =
            !filtros.maquina ||
            accion.maquina ===
              filtros.maquina;

          const coincideOrigen =
            !filtros.origen ||
            accion.origen ===
              filtros.origen;

          return (
            coincideBusqueda &&
            coincidePilar &&
            coincideResponsable &&
            coincideEstado &&
            coincidePrioridad &&
            coincideMaquina &&
            coincideOrigen
          );
        }
      );
    }, [acciones, filtros]);

  function limpiarFormulario() {
    setNuevaAccion({
      origen: "Manual",

      pilar: "",
      maquina: "",
      proceso: "",
      auditor: "",
      colaborador: "",

      hallazgo: "",
      prioridad: "Media",

      que: "",
      porQue: "",
      responsable: "",
      fechaCompromiso: "",
      como: "",
      costoEstimado: "",

      estado: "Pendiente",
      observaciones: "",
      evidencia: "",
    });

    setModoEdicion(null);
  }

  function abrirNuevaAccion() {
    limpiarFormulario();

    setMostrarFormulario(
      true
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function editarAccion(accion) {
    setModoEdicion(
      accion.id
    );

    setNuevaAccion({
      origen:
        accion.origen ||
        "Manual",

      pilar:
        accion.pilar || "",
      maquina:
        accion.maquina || "",
      proceso:
        accion.proceso || "",
      auditor:
        accion.auditor || "",
      colaborador:
        accion.colaborador || "",

      hallazgo:
        accion.hallazgo || "",
      prioridad:
        accion.prioridad ||
        "Media",

      que:
        accion.que || "",
      porQue:
        accion.porQue || "",
      responsable:
        accion.responsable || "",
      fechaCompromiso:
        accion.fechaCompromiso ||
        "",
      como:
        accion.como || "",
      costoEstimado:
        accion.costoEstimado ===
        ""
          ? ""
          : String(
              accion.costoEstimado
            ),

      estado:
        accion.estado ||
        "Pendiente",
      observaciones:
        accion.observaciones ||
        "",
      evidencia:
        accion.evidencia || "",
    });

    setMostrarFormulario(
      true
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleAccionChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    if (name === "maquina") {
      const procesos = catalogo
        .filter(
          (item) =>
            item.maquina ===
            value
        )
        .map(
          (item) => item.proceso
        );

      setNuevaAccion(
        (previous) => ({
          ...previous,
          maquina: value,
          proceso:
            procesos.length ===
            1
              ? procesos[0]
              : "",
        })
      );

      return;
    }

    setNuevaAccion(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  }

  function handleFiltroChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setFiltros(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  }

  async function guardarAccion(
    event
  ) {
    event.preventDefault();

    if (
      !nuevaAccion.hallazgo.trim()
    ) {
      alert(
        "Describí el hallazgo o situación."
      );
      return;
    }

    if (!nuevaAccion.pilar) {
      alert(
        "Seleccioná el pilar o categoría."
      );
      return;
    }

    if (
      !nuevaAccion.que.trim()
    ) {
      alert(
        "Indicá qué acción se realizará."
      );
      return;
    }

    if (
      !nuevaAccion.responsable.trim()
    ) {
      alert(
        "Indicá el responsable de la acción."
      );
      return;
    }

    if (
      !nuevaAccion.fechaCompromiso
    ) {
      alert(
        "Seleccioná una fecha compromiso."
      );
      return;
    }

    const costo =
      nuevaAccion.costoEstimado ===
      ""
        ? null
        : Number(
            nuevaAccion.costoEstimado
          );

    if (
      costo !== null &&
      (!Number.isFinite(costo) ||
        costo < 0)
    ) {
      alert(
        "Ingresá un costo estimado válido."
      );
      return;
    }

    setGuardando(true);

    const payload = {
      origen:
        nuevaAccion.origen ||
        "Manual",

      pilar:
        nuevaAccion.pilar,

      maquina:
        nuevaAccion.maquina ||
        null,

      proceso:
        nuevaAccion.proceso ||
        null,

      auditor:
        nuevaAccion.auditor ||
        null,

      colaborador:
        nuevaAccion.colaborador ||
        null,

      hallazgo:
        nuevaAccion.hallazgo.trim(),

      prioridad:
        nuevaAccion.prioridad,

      que:
        nuevaAccion.que.trim(),

      por_que:
        nuevaAccion.porQue.trim() ||
        null,

      responsable:
        nuevaAccion.responsable.trim(),

      fecha_compromiso:
        nuevaAccion.fechaCompromiso,

      como:
        nuevaAccion.como.trim() ||
        null,

      costo_estimado: costo,

      estado:
        nuevaAccion.estado,

      observaciones:
        nuevaAccion.observaciones.trim() ||
        null,

      evidencia:
        nuevaAccion.evidencia.trim() ||
        null,

      fecha_cierre:
        nuevaAccion.estado ===
        "Terminada"
          ? new Date().toISOString()
          : null,
    };

    let error;

    if (modoEdicion) {
      const response =
        await supabase
          .from("plan_accion")
          .update(payload)
          .eq(
            "id",
            modoEdicion
          );

      error = response.error;
    } else {
      const response =
        await supabase
          .from("plan_accion")
          .insert(payload);

      error = response.error;
    }

    if (error) {
      console.error(
        "Error al guardar acción:",
        error
      );

      alert(
        `No se pudo guardar la acción.\n\n${error.message}`
      );

      setGuardando(false);
      return;
    }

    limpiarFormulario();

    setMostrarFormulario(
      false
    );

    setGuardando(false);

    await cargarAcciones();
  }

  async function eliminarAccion(
    accion
  ) {
    const confirmar =
      window.confirm(
        `¿Seguro que deseás eliminar esta acción?\n\n${accion.hallazgo}\n\nEsta acción no se puede deshacer.`
      );

    if (!confirmar) {
      return;
    }

    const { error } =
      await supabase
        .from("plan_accion")
        .delete()
        .eq("id", accion.id);

    if (error) {
      console.error(
        "Error al eliminar acción:",
        error
      );

      alert(
        `No se pudo eliminar la acción.\n\n${error.message}`
      );

      return;
    }

    setAcciones(
      (previous) =>
        previous.filter(
          (item) =>
            item.id !== accion.id
        )
    );

    if (
      modoEdicion ===
      accion.id
    ) {
      limpiarFormulario();

      setMostrarFormulario(
        false
      );
    }
  }

  async function cambiarEstadoDirecto(
    accionId,
    nuevoEstado
  ) {
    const accionAnterior =
      acciones.find(
        (item) =>
          item.id === accionId
      );

    if (!accionAnterior) {
      return;
    }

    setAcciones(
      (previous) =>
        previous.map(
          (item) =>
            item.id === accionId
              ? {
                  ...item,
                  estado:
                    nuevoEstado,
                  fechaCierre:
                    nuevoEstado ===
                    "Terminada"
                      ? new Date().toISOString()
                      : null,
                }
              : item
        )
    );

    const {
      error,
    } = await supabase
      .from("plan_accion")
      .update({
        estado:
          nuevoEstado,

        fecha_cierre:
          nuevoEstado ===
          "Terminada"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", accionId);

    if (error) {
      console.error(
        "Error al cambiar estado:",
        error
      );

      setAcciones(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              accionId
                ? accionAnterior
                : item
          )
      );

      alert(
        `No se pudo cambiar el estado.\n\n${error.message}`
      );
    }
  }

  function getEstiloEstado(
    estado
  ) {
    if (
      estado === "Terminada"
    ) {
      return {
        background:
          "#dcfce7",
        color: "#15803d",
        border:
          "1px solid #bbf7d0",
      };
    }

    if (
      estado ===
      "En proceso"
    ) {
      return {
        background:
          "#fef3c7",
        color: "#b45309",
        border:
          "1px solid #fde68a",
      };
    }

    return {
      background:
        "#fee2e2",
      color: "#b91c1c",
      border:
        "1px solid #fecaca",
    };
  }

  function getClasePrioridad(
    prioridad
  ) {
    if (
      prioridad === "Baja"
    ) {
      return "baja";
    }

    if (
      prioridad === "Media"
    ) {
      return "media";
    }

    if (
      prioridad === "Alta"
    ) {
      return "alta";
    }

    return "crítica";
  }

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">
            Gestión de acciones
          </span>

          <h2>
            Plan de Acción
          </h2>

          <p>
            Convertí los hallazgos
            del Gemba y las
            oportunidades manuales
            en acciones con
            responsable, fecha y
            seguimiento.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={
            abrirNuevaAccion
          }
        >
          <Plus size={19} />
          Nueva acción
        </button>
      </header>

      <section className="kpi-grid">
        <div className="kpi-card">
          <span>
            Pendientes
          </span>

          <strong>
            {
              indicadores.pendientes
            }
          </strong>

          <small>
            Aún no iniciadas
          </small>
        </div>

        <div className="kpi-card">
          <span>
            En proceso
          </span>

          <strong>
            {
              indicadores.enProceso
            }
          </strong>

          <small>
            Acciones activas
          </small>
        </div>

        <div className="kpi-card">
          <span>
            Terminadas
          </span>

          <strong>
            {
              indicadores.terminadas
            }
          </strong>

          <small>
            Acciones cerradas
          </small>
        </div>

        <div className="kpi-card">
          <span>
            Vencidas
          </span>

          <strong>
            {
              indicadores.vencidas
            }
          </strong>

          <small>
            Fecha compromiso vencida
          </small>
        </div>
      </section>

      {mostrarFormulario && (
        <section
          className="section-block"
          style={{
            marginBottom:
              "22px",
          }}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                {modoEdicion
                  ? "Seguimiento"
                  : "Nueva acción"}
              </span>

              <h3>
                {modoEdicion
                  ? "Editar Plan de Acción"
                  : "Crear acción manual"}
              </h3>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                limpiarFormulario();

                setMostrarFormulario(
                  false
                );
              }}
            >
              <X size={17} />
              Cerrar
            </button>
          </div>

          <form
            onSubmit={
              guardarAccion
            }
          >
            <div className="form-grid">
              <label className="form-field">
                <span>
                  <ClipboardList
                    size={17}
                  />
                  Origen
                </span>

                <input
                  type="text"
                  value={
                    nuevaAccion.origen
                  }
                  readOnly
                  disabled
                />
              </label>

              <label className="form-field">
                <span>
                  <Workflow
                    size={17}
                  />
                  Pilar / Categoría
                </span>

                <select
                  name="pilar"
                  value={
                    nuevaAccion.pilar
                  }
                  onChange={
                    handleAccionChange
                  }
                >
                  <option value="">
                    Seleccionar
                  </option>

                  {PILARES.map(
                    (pilar) => (
                      <option
                        key={pilar}
                        value={pilar}
                      >
                        {pilar}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="form-field">
                <span>
                  <Factory
                    size={17}
                  />
                  Máquina / Equipo
                </span>

                <select
                  name="maquina"
                  value={
                    nuevaAccion.maquina
                  }
                  onChange={
                    handleAccionChange
                  }
                >
                  <option value="">
                    Sin equipo específico
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
                  <Workflow
                    size={17}
                  />
                  Proceso
                </span>

                <select
                  name="proceso"
                  value={
                    nuevaAccion.proceso
                  }
                  onChange={
                    handleAccionChange
                  }
                  disabled={
                    !nuevaAccion.maquina
                  }
                >
                  <option value="">
                    {!nuevaAccion.maquina
                      ? "Seleccioná primero una máquina"
                      : "Seleccionar proceso"}
                  </option>

                  {procesosDisponibles.map(
                    (proceso) => (
                      <option
                        key={proceso}
                        value={proceso}
                      >
                        {proceso}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="form-field">
                <span>
                  <AlertTriangle
                    size={17}
                  />
                  Prioridad
                </span>

                <select
                  name="prioridad"
                  value={
                    nuevaAccion.prioridad
                  }
                  onChange={
                    handleAccionChange
                  }
                >
                  {PRIORIDADES.map(
                    (prioridad) => (
                      <option
                        key={
                          prioridad
                        }
                        value={
                          prioridad
                        }
                      >
                        {
                          prioridad
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="form-field">
                <span>
                  <Filter
                    size={17}
                  />
                  Estado
                </span>

                <select
                  name="estado"
                  value={
                    nuevaAccion.estado
                  }
                  onChange={
                    handleAccionChange
                  }
                >
                  {ESTADOS.map(
                    (estado) => (
                      <option
                        key={estado}
                        value={estado}
                      >
                        {estado}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="form-field form-field-full">
                <span>
                  <AlertTriangle
                    size={17}
                  />
                  Hallazgo / Situación
                </span>

                <textarea
                  rows="3"
                  name="hallazgo"
                  value={
                    nuevaAccion.hallazgo
                  }
                  onChange={
                    handleAccionChange
                  }
                  placeholder="Describí la situación detectada."
                />
              </label>

              <label className="form-field form-field-full">
                <span>
                  <CheckCircle2
                    size={17}
                  />
                  What · ¿Qué se hará?
                </span>

                <textarea
                  rows="3"
                  name="que"
                  value={
                    nuevaAccion.que
                  }
                  onChange={
                    handleAccionChange
                  }
                  placeholder="Definí claramente la acción."
                />
              </label>

              <label className="form-field form-field-full">
                <span>
                  <ClipboardList
                    size={17}
                  />
                  Why · ¿Por qué?
                </span>

                <textarea
                  rows="3"
                  name="porQue"
                  value={
                    nuevaAccion.porQue
                  }
                  onChange={
                    handleAccionChange
                  }
                  placeholder="Justificación o causa que se desea corregir."
                />
              </label>

              <label className="form-field">
                <span>
                  <User size={17} />
                  Who · Responsable
                </span>

                <input
                  type="text"
                  name="responsable"
                  value={
                    nuevaAccion.responsable
                  }
                  onChange={
                    handleAccionChange
                  }
                  list="responsables-plan-accion"
                  placeholder="Nombre del responsable"
                />

                <datalist id="responsables-plan-accion">
                  {responsables.map(
                    (responsable) => (
                      <option
                        key={
                          responsable
                        }
                        value={
                          responsable
                        }
                      />
                    )
                  )}
                </datalist>
              </label>

              <label className="form-field">
                <span>
                  <CalendarDays
                    size={17}
                  />
                  When · Fecha compromiso
                </span>

                <input
                  type="date"
                  name="fechaCompromiso"
                  value={
                    nuevaAccion.fechaCompromiso
                  }
                  onChange={
                    handleAccionChange
                  }
                />
              </label>

              <label className="form-field form-field-full">
                <span>
                  <Workflow
                    size={17}
                  />
                  How · ¿Cómo se realizará?
                </span>

                <textarea
                  rows="3"
                  name="como"
                  value={
                    nuevaAccion.como
                  }
                  onChange={
                    handleAccionChange
                  }
                  placeholder="Método o forma de ejecución."
                />
              </label>

              <label className="form-field">
                <span>
                  <ClipboardList
                    size={17}
                  />
                  How much · Costo estimado
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="costoEstimado"
                  value={
                    nuevaAccion.costoEstimado
                  }
                  onChange={
                    handleAccionChange
                  }
                  placeholder="Opcional"
                />
              </label>

              <label className="form-field">
                <span>
                  <User size={17} />
                  Auditor / Solicitante
                </span>

                <input
                  type="text"
                  name="auditor"
                  value={
                    nuevaAccion.auditor
                  }
                  onChange={
                    handleAccionChange
                  }
                  placeholder="Opcional"
                />
              </label>

              <label className="form-field form-field-full">
                <span>
                  <ClipboardList
                    size={17}
                  />
                  Observaciones
                </span>

                <textarea
                  rows="3"
                  name="observaciones"
                  value={
                    nuevaAccion.observaciones
                  }
                  onChange={
                    handleAccionChange
                  }
                />
              </label>

              <label className="form-field form-field-full">
                <span>
                  <CheckCircle2
                    size={17}
                  />
                  Evidencia / Cierre
                </span>

                <textarea
                  rows="3"
                  name="evidencia"
                  value={
                    nuevaAccion.evidencia
                  }
                  onChange={
                    handleAccionChange
                  }
                  placeholder="Descripción de evidencia o resultado final."
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  limpiarFormulario();

                  setMostrarFormulario(
                    false
                  );
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={
                  guardando
                }
              >
                <CheckCircle2
                  size={18}
                />

                {guardando
                  ? "Guardando..."
                  : modoEdicion
                    ? "Guardar cambios"
                    : "Crear acción"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              Seguimiento
            </span>

            <h3>
              Acciones
            </h3>
          </div>

          <p>
            Filtrá las acciones
            por origen, pilar,
            responsable, estado,
            prioridad o equipo.
          </p>
        </div>

        <div
          className="form-grid"
          style={{
            marginBottom:
              "22px",
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
              placeholder="Buscar hallazgo, acción, equipo..."
            />
          </label>

          <label className="form-field">
            <span>
              <ClipboardList
                size={17}
              />
              Origen
            </span>

            <select
              name="origen"
              value={
                filtros.origen
              }
              onChange={
                handleFiltroChange
              }
            >
              <option value="">
                Todos
              </option>

              <option value="Gemba">
                Gemba
              </option>

              <option value="Manual">
                Manual
              </option>
            </select>
          </label>

          <label className="form-field">
            <span>
              <Workflow
                size={17}
              />
              Pilar
            </span>

            <select
              name="pilar"
              value={
                filtros.pilar
              }
              onChange={
                handleFiltroChange
              }
            >
              <option value="">
                Todos
              </option>

              {PILARES.map(
                (pilar) => (
                  <option
                    key={pilar}
                    value={pilar}
                  >
                    {pilar}
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
                filtros.responsable
              }
              onChange={
                handleFiltroChange
              }
            >
              <option value="">
                Todos
              </option>

              {responsables.map(
                (responsable) => (
                  <option
                    key={
                      responsable
                    }
                    value={
                      responsable
                    }
                  >
                    {
                      responsable
                    }
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
              value={
                filtros.estado
              }
              onChange={
                handleFiltroChange
              }
            >
              <option value="">
                Todos
              </option>

              {ESTADOS.map(
                (estado) => (
                  <option
                    key={estado}
                    value={estado}
                  >
                    {estado}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="form-field">
            <span>
              <AlertTriangle
                size={17}
              />
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

              {PRIORIDADES.map(
                (prioridad) => (
                  <option
                    key={
                      prioridad
                    }
                    value={
                      prioridad
                    }
                  >
                    {
                      prioridad
                    }
                  </option>
                )
              )}
            </select>
          </label>

          <label className="form-field">
            <span>
              <Factory
                size={17}
              />
              Equipo
            </span>

            <select
              name="maquina"
              value={
                filtros.maquina
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

        {loading ? (
          <div
            className="finding-entry-card"
            style={{
              textAlign:
                "center",
              padding:
                "30px",
            }}
          >
            <strong>
              Cargando acciones...
            </strong>
          </div>
        ) : accionesFiltradas.length ===
          0 ? (
          <div
            className="finding-entry-card"
            style={{
              textAlign:
                "center",
              padding:
                "30px",
            }}
          >
            <ClipboardList
              size={32}
              style={{
                marginBottom:
                  "10px",
              }}
            />

            <strong>
              No hay acciones con
              estos filtros.
            </strong>
          </div>
        ) : (
          <div className="findings-list">
            {accionesFiltradas.map(
              (accion) => {
                const vencida =
                  estaVencida(
                    accion
                  );

                return (
                  <article
                    key={
                      accion.id
                    }
                    className="finding-item"
                    style={
                      vencida
                        ? {
                            borderColor:
                              "#fecaca",
                            background:
                              "#fffafa",
                          }
                        : undefined
                    }
                  >
                    <div className="finding-index">
                      <ClipboardList
                        size={15}
                      />
                    </div>

                    <div className="finding-item-content">
                      <div className="finding-item-top">
                        <div>
                          <p>
                            <strong>
                              {
                                accion.hallazgo
                              }
                            </strong>
                          </p>

                          {accion.que && (
                            <p>
                              <strong>
                                Acción:
                              </strong>{" "}
                              {
                                accion.que
                              }
                            </p>
                          )}

                          <p>
                            <strong>
                              Responsable:
                            </strong>{" "}
                            {accion.responsable ||
                              "Sin asignar"}
                          </p>

                          <p>
                            <strong>
                              Fecha compromiso:
                            </strong>{" "}
                            {formatDate(
                              accion.fechaCompromiso
                            )}
                          </p>

                          {(accion.maquina ||
                            accion.proceso) && (
                            <p>
                              <strong>
                                Contexto:
                              </strong>{" "}
                              {[
                                accion.maquina,
                                accion.proceso,
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  " · "
                                )}
                            </p>
                          )}
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "8px",
                            alignItems:
                              "center",
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              editarAccion(
                                accion
                              )
                            }
                          >
                            <Pencil
                              size={16}
                            />
                            Editar
                          </button>

                          <button
                            type="button"
                            className="icon-delete-button"
                            onClick={() =>
                              eliminarAccion(
                                accion
                              )
                            }
                            title="Eliminar acción"
                            aria-label={`Eliminar acción ${accion.hallazgo}`}
                          >
                            <Trash2
                              size={17}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="finding-tags">
                        <span
                          className={`criticality-tag ${getClasePrioridad(
                            accion.prioridad
                          )}`}
                        >
                          {
                            accion.prioridad
                          }
                        </span>

                        <span className="status-pill">
                          {
                            accion.pilar
                          }
                        </span>

                        <span className="status-pill">
                          Origen:{" "}
                          {
                            accion.origen
                          }
                        </span>

                        {vencida && (
                          <span
                            className="criticality-tag crítica"
                          >
                            Vencida
                          </span>
                        )}

                        <div
                          style={{
                            position:
                              "relative",
                            width:
                              "170px",
                            flexShrink:
                              0,
                          }}
                        >
                          <button
                            type="button"
                            aria-haspopup="listbox"
                            aria-expanded={
                              estadoAbiertoId ===
                              accion.id
                            }
                            onClick={() =>
                              setEstadoAbiertoId(
                                (
                                  previous
                                ) =>
                                  previous ===
                                  accion.id
                                    ? null
                                    : accion.id
                              )
                            }
                            style={{
                              ...getEstiloEstado(
                                accion.estado
                              ),
                              width:
                                "170px",
                              minHeight:
                                "34px",
                              borderRadius:
                                "999px",
                              padding:
                                "6px 32px 6px 14px",
                              fontSize:
                                "12px",
                              fontWeight:
                                700,
                              cursor:
                                "pointer",
                              outline:
                                "none",
                              position:
                                "relative",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                            }}
                          >
                            <span
                              style={{
                                width:
                                  "100%",
                                textAlign:
                                  "center",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {
                                accion.estado
                              }
                            </span>

                            <ChevronDown
                              size={16}
                              style={{
                                position:
                                  "absolute",
                                right:
                                  "10px",
                                top:
                                  "50%",
                                transform:
                                  estadoAbiertoId ===
                                  accion.id
                                    ? "translateY(-50%) rotate(180deg)"
                                    : "translateY(-50%)",
                              }}
                            />
                          </button>

                          {estadoAbiertoId ===
                            accion.id && (
                            <div
                              role="listbox"
                              style={{
                                position:
                                  "absolute",
                                top:
                                  "calc(100% + 6px)",
                                left: 0,
                                width:
                                  "170px",
                                zIndex:
                                  50,
                                background:
                                  "white",
                                border:
                                  "1px solid #dfe4ea",
                                borderRadius:
                                  "12px",
                                boxShadow:
                                  "0 12px 30px rgba(15, 23, 42, 0.14)",
                                overflow:
                                  "hidden",
                              }}
                            >
                              {ESTADOS.map(
                                (
                                  estado
                                ) => {
                                  const seleccionado =
                                    accion.estado ===
                                    estado;

                                  return (
                                    <button
                                      key={
                                        estado
                                      }
                                      type="button"
                                      role="option"
                                      aria-selected={
                                        seleccionado
                                      }
                                      onClick={async () => {
                                        setEstadoAbiertoId(
                                          null
                                        );

                                        if (
                                          !seleccionado
                                        ) {
                                          await cambiarEstadoDirecto(
                                            accion.id,
                                            estado
                                          );
                                        }
                                      }}
                                      style={{
                                        width:
                                          "100%",
                                        border:
                                          0,
                                        borderBottom:
                                          estado !==
                                          "Terminada"
                                            ? "1px solid #eef2f7"
                                            : "none",
                                        padding:
                                          "10px 12px",
                                        background:
                                          seleccionado
                                            ? getEstiloEstado(
                                                estado
                                              )
                                                .background
                                            : "white",
                                        color:
                                          getEstiloEstado(
                                            estado
                                          )
                                            .color,
                                        fontSize:
                                          "12px",
                                        fontWeight:
                                          seleccionado
                                            ? 800
                                            : 700,
                                        cursor:
                                          "pointer",
                                        textAlign:
                                          "center",
                                      }}
                                    >
                                      {
                                        estado
                                      }
                                    </button>
                                  );
                                }
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {accion.observaciones && (
                        <p
                          style={{
                            marginTop:
                              "12px",
                            color:
                              "#667085",
                            fontSize:
                              "12px",
                          }}
                        >
                          <strong>
                            Observaciones:
                          </strong>{" "}
                          {
                            accion.observaciones
                          }
                        </p>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </>
  );
}

export default PlanAccion;
