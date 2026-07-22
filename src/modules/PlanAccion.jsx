import React, { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  CalendarDays,
  User,
  Workflow,
  Trash2,
  ChevronDown,
  X,
  CheckCircle2,
  Factory,
} from "lucide-react";

import { catalogo } from "../data/CatalogoMaquinas.js";
import { colaboradores } from "../data/CatalogoColaboradores.js";
import { supabase } from "../lib/supabase.js";

const ESTADOS = [
  "Sin planificar",
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

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "Sin fecha";

  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
  }).format(new Date(`${dateString}T12:00:00`));
}

function getMonday(dateValue = new Date()) {
  const date =
    typeof dateValue === "string"
      ? new Date(`${dateValue}T12:00:00`)
      : new Date(dateValue);

  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + diff);
  date.setHours(12, 0, 0, 0);

  return toDateString(date);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

function getMonthRange(dateValue = new Date()) {
  const date =
    typeof dateValue === "string"
      ? new Date(`${dateValue}T12:00:00`)
      : new Date(dateValue);

  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
    12
  );

  const end = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    12
  );

  return {
    start: toDateString(start),
    end: toDateString(end),
  };
}

function normalizarAccion(row) {
  const sinPlan =
    row.origen === "Gemba" &&
    !row.que &&
    !row.responsable &&
    !row.fecha_compromiso;

  return {
    id: row.id,
    gembaId: row.gemba_id || null,
    origen: row.origen || "Manual",

    pilar: row.pilar || "",
    maquina: row.maquina || "",
    proceso: row.proceso || "",
    auditor: row.auditor || "",
    colaborador: row.colaborador || "",

    causa: row.hallazgo || "",
    que: row.que || "",
    como: row.como || "",
    quien: row.responsable || "",
    cuando: row.fecha_compromiso || "",

    estado:
      sinPlan && row.estado === "Pendiente"
        ? "Sin planificar"
        : row.estado || "Pendiente",

    observaciones: row.observaciones || "",
    evidencia: row.evidencia || "",
    fechaCierre: row.fecha_cierre || null,
    createdAt: row.created_at || null,
  };
}

function PlanAccion() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [acciones, setAcciones] = useState([]);

  const [mostrarNuevaAccion, setMostrarNuevaAccion] =
    useState(false);

  const [editandoCelda, setEditandoCelda] = useState(null);
  const [valorEdicion, setValorEdicion] = useState("");

  const [filtros, setFiltros] = useState({
    busqueda: "",
    responsable: "",
    pilar: "",
    estado: "",
    periodo: "",
    fechaReferencia: toDateString(new Date()),
  });

  const [nuevaAccion, setNuevaAccion] = useState({
    pilar: "",
    causa: "",
    que: "",
    como: "",
    quien: "",
    cuando: "",
    estado: "Pendiente",
    maquina: "",
    proceso: "",
    observaciones: "",
  });

  const maquinas = useMemo(() => {
    return [
      ...new Set(
        catalogo.map((item) => item.maquina)
      ),
    ].sort((a, b) =>
      a.localeCompare(b, "es")
    );
  }, []);

  const procesosDisponibles = useMemo(() => {
    if (!nuevaAccion.maquina) return [];

    return [
      ...new Set(
        catalogo
          .filter(
            (item) =>
              item.maquina === nuevaAccion.maquina
          )
          .map((item) => item.proceso)
      ),
    ].sort((a, b) =>
      a.localeCompare(b, "es")
    );
  }, [nuevaAccion.maquina]);

  const responsables = useMemo(() => {
    const existentes = acciones
      .map((accion) => accion.quien)
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

    const { data, error } = await supabase
      .from("plan_accion")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Error al cargar Plan de Acción:",
        error
      );

      alert(
        `No se pudo cargar el Plan de Acción.\n\n${error.message}`
      );

      setLoading(false);
      return;
    }

    setAcciones(
      (data || []).map(normalizarAccion)
    );

    setLoading(false);
  }

  function estaVencida(accion) {
    if (
      accion.estado === "Terminada" ||
      accion.estado === "Sin planificar"
    ) {
      return false;
    }

    if (!accion.cuando) {
      return false;
    }

    return (
      accion.cuando <
      toDateString(new Date())
    );
  }

  const indicadores = useMemo(() => {
    return {
      sinPlanificar: acciones.filter(
        (accion) =>
          accion.estado === "Sin planificar"
      ).length,

      pendientes: acciones.filter(
        (accion) =>
          accion.estado === "Pendiente"
      ).length,

      enProceso: acciones.filter(
        (accion) =>
          accion.estado === "En proceso"
      ).length,

      terminadas: acciones.filter(
        (accion) =>
          accion.estado === "Terminada"
      ).length,

      vencidas: acciones.filter(
        estaVencida
      ).length,
    };
  }, [acciones]);

  const accionesFiltradas = useMemo(() => {
    const texto = filtros.busqueda
      .trim()
      .toLowerCase();

    let rangoFecha = null;

    if (filtros.periodo === "semana") {
      const inicio = getMonday(
        filtros.fechaReferencia
      );

      rangoFecha = {
        start: inicio,
        end: addDays(inicio, 6),
      };
    }

    if (filtros.periodo === "mes") {
      rangoFecha = getMonthRange(
        filtros.fechaReferencia
      );
    }

    return acciones.filter((accion) => {
      const coincideBusqueda =
        !texto ||
        accion.pilar
          .toLowerCase()
          .includes(texto) ||
        accion.causa
          .toLowerCase()
          .includes(texto) ||
        accion.que
          .toLowerCase()
          .includes(texto) ||
        accion.como
          .toLowerCase()
          .includes(texto) ||
        accion.quien
          .toLowerCase()
          .includes(texto);

      const coincideResponsable =
        !filtros.responsable ||
        accion.quien ===
          filtros.responsable;

      const coincidePilar =
        !filtros.pilar ||
        accion.pilar === filtros.pilar;

      let coincideEstado = true;

      if (
        filtros.estado === "Atrasadas"
      ) {
        coincideEstado =
          estaVencida(accion);
      } else if (filtros.estado) {
        coincideEstado =
          accion.estado === filtros.estado;
      }

      const coincidePeriodo =
        !rangoFecha ||
        (
          accion.cuando &&
          accion.cuando >=
            rangoFecha.start &&
          accion.cuando <=
            rangoFecha.end
        );

      return (
        coincideBusqueda &&
        coincideResponsable &&
        coincidePilar &&
        coincideEstado &&
        coincidePeriodo
      );
    });
  }, [acciones, filtros]);

  function handleFiltroChange(event) {
    const { name, value } = event.target;

    setFiltros((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function limpiarFiltros() {
    setFiltros({
      busqueda: "",
      responsable: "",
      pilar: "",
      estado: "",
      periodo: "",
      fechaReferencia:
        toDateString(new Date()),
    });
  }

  function iniciarEdicion(
    accion,
    campo
  ) {
    setEditandoCelda({
      id: accion.id,
      campo,
    });

    setValorEdicion(
      accion[campo] ?? ""
    );
  }

  function cancelarEdicion() {
    setEditandoCelda(null);
    setValorEdicion("");
  }

  async function guardarCelda(
    accion,
    campo,
    valor
  ) {
    const mapaCampos = {
      pilar: "pilar",
      causa: "hallazgo",
      que: "que",
      como: "como",
      quien: "responsable",
      cuando: "fecha_compromiso",
      estado: "estado",
    };

    const columnaDb =
      mapaCampos[campo];

    if (!columnaDb) {
      cancelarEdicion();
      return;
    }

    const valorLimpio =
      typeof valor === "string"
        ? valor.trim()
        : valor;

    let nuevoEstado =
      accion.estado;

    const accionProyectada = {
      ...accion,
      [campo]: valorLimpio,
    };

    const tienePlanMinimo =
      accionProyectada.que &&
      accionProyectada.quien &&
      accionProyectada.cuando;

    if (
      campo !== "estado" &&
      accion.estado === "Sin planificar" &&
      tienePlanMinimo
    ) {
      nuevoEstado = "Pendiente";
    }

    if (
      campo === "estado"
    ) {
      nuevoEstado = valorLimpio;
    }

    const payload = {
      [columnaDb]:
        valorLimpio || null,
    };

    if (
      nuevoEstado !== accion.estado
    ) {
      payload.estado =
        nuevoEstado;
    }

    if (
      campo === "estado" ||
      nuevoEstado !== accion.estado
    ) {
      payload.fecha_cierre =
        nuevoEstado === "Terminada"
          ? new Date().toISOString()
          : null;
    }

    setAcciones((previous) =>
      previous.map((item) =>
        item.id === accion.id
          ? {
              ...item,
              [campo]: valorLimpio,
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

    cancelarEdicion();

    const { error } = await supabase
      .from("plan_accion")
      .update(payload)
      .eq("id", accion.id);

    if (error) {
      console.error(
        "Error al actualizar celda:",
        error
      );

      alert(
        `No se pudo guardar el cambio.\n\n${error.message}`
      );

      await cargarAcciones();
    }
  }

  function manejarTeclaEdicion(
    event,
    accion,
    campo
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      guardarCelda(
        accion,
        campo,
        valorEdicion
      );
    }

    if (
      event.key === "Escape"
    ) {
      cancelarEdicion();
    }
  }

  async function eliminarAccion(
    accion
  ) {
    const confirmar =
      window.confirm(
        `¿Seguro que deseás eliminar esta acción?\n\n${accion.causa}\n\nEsta acción no se puede deshacer.`
      );

    if (!confirmar) {
      return;
    }

    const { error } = await supabase
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

    setAcciones((previous) =>
      previous.filter(
        (item) =>
          item.id !== accion.id
      )
    );
  }

  function handleNuevaAccionChange(
    event
  ) {
    const { name, value } =
      event.target;

    if (name === "maquina") {
      const procesos = catalogo
        .filter(
          (item) =>
            item.maquina === value
        )
        .map(
          (item) => item.proceso
        );

      setNuevaAccion(
        (previous) => ({
          ...previous,
          maquina: value,
          proceso:
            procesos.length === 1
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

  async function crearAccionManual(
    event
  ) {
    event.preventDefault();

    if (
      !nuevaAccion.pilar
    ) {
      alert(
        "Seleccioná el pilar."
      );
      return;
    }

    if (
      !nuevaAccion.causa.trim()
    ) {
      alert(
        "Ingresá la causa."
      );
      return;
    }

    setGuardando(true);

    const { error } = await supabase
      .from("plan_accion")
      .insert({
        origen: "Manual",
        pilar:
          nuevaAccion.pilar,
        hallazgo:
          nuevaAccion.causa.trim(),
        que:
          nuevaAccion.que.trim() ||
          null,
        como:
          nuevaAccion.como.trim() ||
          null,
        responsable:
          nuevaAccion.quien.trim() ||
          null,
        fecha_compromiso:
          nuevaAccion.cuando ||
          null,
        estado:
          nuevaAccion.estado ||
          "Pendiente",
        maquina:
          nuevaAccion.maquina ||
          null,
        proceso:
          nuevaAccion.proceso ||
          null,
        observaciones:
          nuevaAccion.observaciones.trim() ||
          null,
      });

    if (error) {
      console.error(
        "Error al crear acción:",
        error
      );

      alert(
        `No se pudo crear la acción.\n\n${error.message}`
      );

      setGuardando(false);
      return;
    }

    setNuevaAccion({
      pilar: "",
      causa: "",
      que: "",
      como: "",
      quien: "",
      cuando: "",
      estado: "Pendiente",
      maquina: "",
      proceso: "",
      observaciones: "",
    });

    setMostrarNuevaAccion(false);
    setGuardando(false);

    await cargarAcciones();
  }

  function getColorEstado(
    estado
  ) {
    if (
      estado === "Terminada"
    ) {
      return "#15803d";
    }

    if (
      estado === "En proceso"
    ) {
      return "#d97706";
    }

    if (
      estado === "Pendiente"
    ) {
      return "#dc2626";
    }

    return "#667085";
  }

  return (
    <>
      <header
        className="page-header"
        style={{
          marginBottom: "14px",
        }}
      >
        <div>
          <span className="eyebrow">
            Gestión de acciones
          </span>

          <h2>
            Plan de Acción
          </h2>

          <p>
            Editá directamente la matriz.
            Hacé clic sobre una celda para modificarla.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            setMostrarNuevaAccion(
              (previous) => !previous
            )
          }
        >
          {mostrarNuevaAccion ? (
            <>
              <X size={18} />
              Cerrar
            </>
          ) : (
            <>
              <Plus size={18} />
              Nueva acción
            </>
          )}
        </button>
      </header>

      <section
        className="kpi-grid"
        style={{
          marginBottom: "14px",
        }}
      >
        <div className="kpi-card">
          <span>Sin planificar</span>
          <strong>
            {
              indicadores.sinPlanificar
            }
          </strong>
        </div>

        <div className="kpi-card">
          <span>Pendientes</span>
          <strong>
            {indicadores.pendientes}
          </strong>
        </div>

        <div className="kpi-card">
          <span>En proceso</span>
          <strong>
            {indicadores.enProceso}
          </strong>
        </div>

        <div className="kpi-card">
          <span>Terminadas</span>
          <strong>
            {indicadores.terminadas}
          </strong>
        </div>

        <div className="kpi-card">
          <span>Atrasadas</span>
          <strong>
            {indicadores.vencidas}
          </strong>
        </div>
      </section>

      {mostrarNuevaAccion && (
        <section
          className="section-block"
          style={{
            marginBottom: "14px",
            padding: "16px",
          }}
        >
          <div
            className="section-heading"
            style={{
              marginBottom: "12px",
            }}
          >
            <div>
              <span className="eyebrow">
                Registro manual
              </span>

              <h3>
                Nueva acción
              </h3>
            </div>
          </div>

          <form
            onSubmit={
              crearAccionManual
            }
          >
            <div
              className="form-grid"
              style={{
                gap: "12px",
              }}
            >
              <label className="form-field">
                <span>Pilar</span>

                <select
                  name="pilar"
                  value={
                    nuevaAccion.pilar
                  }
                  onChange={
                    handleNuevaAccionChange
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
                  Máquina
                </span>

                <select
                  name="maquina"
                  value={
                    nuevaAccion.maquina
                  }
                  onChange={
                    handleNuevaAccionChange
                  }
                >
                  <option value="">
                    Opcional
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
                  Proceso
                </span>

                <select
                  name="proceso"
                  value={
                    nuevaAccion.proceso
                  }
                  onChange={
                    handleNuevaAccionChange
                  }
                  disabled={
                    !nuevaAccion.maquina
                  }
                >
                  <option value="">
                    Opcional
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

              <label className="form-field form-field-full">
                <span>
                  Causa
                </span>

                <input
                  name="causa"
                  value={
                    nuevaAccion.causa
                  }
                  onChange={
                    handleNuevaAccionChange
                  }
                />
              </label>

              <label className="form-field">
                <span>Qué</span>

                <input
                  name="que"
                  value={
                    nuevaAccion.que
                  }
                  onChange={
                    handleNuevaAccionChange
                  }
                />
              </label>

              <label className="form-field">
                <span>Cómo</span>

                <input
                  name="como"
                  value={
                    nuevaAccion.como
                  }
                  onChange={
                    handleNuevaAccionChange
                  }
                />
              </label>

              <label className="form-field">
                <span>Quién</span>

                <input
                  name="quien"
                  value={
                    nuevaAccion.quien
                  }
                  onChange={
                    handleNuevaAccionChange
                  }
                  list="responsables-plan-accion"
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
                <span>Cuándo</span>

                <input
                  type="date"
                  name="cuando"
                  value={
                    nuevaAccion.cuando
                  }
                  onChange={
                    handleNuevaAccionChange
                  }
                />
              </label>
            </div>

            <div
              className="form-actions"
              style={{
                marginTop: "12px",
              }}
            >
              <button
                type="submit"
                className="primary-button"
                disabled={guardando}
              >
                <CheckCircle2
                  size={17}
                />

                {guardando
                  ? "Guardando..."
                  : "Crear acción"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section
        className="section-block"
        style={{
          padding: "16px",
        }}
      >
        <div
          className="section-heading"
          style={{
            marginBottom: "12px",
          }}
        >
          <div>
            <span className="eyebrow">
              Matriz principal
            </span>

            <h3>
              Plan de Acción
            </h3>
          </div>

          <p>
            {accionesFiltradas.length} acciones visibles
          </p>
        </div>

        <div
          className="form-grid"
          style={{
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          <label className="form-field">
            <span>
              <Search size={15} />
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
              placeholder="Causa, acción, responsable..."
            />
          </label>

          <label className="form-field">
            <span>
              <User size={15} />
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
              <Workflow
                size={15}
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
              <Filter size={15} />
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

              <option value="Sin planificar">
                Sin planificar
              </option>

              <option value="Pendiente">
                Pendiente
              </option>

              <option value="En proceso">
                En proceso
              </option>

              <option value="Terminada">
                Terminada
              </option>

              <option value="Atrasadas">
                Atrasadas
              </option>
            </select>
          </label>

          <label className="form-field">
            <span>
              <CalendarDays
                size={15}
              />
              Período
            </span>

            <select
              name="periodo"
              value={
                filtros.periodo
              }
              onChange={
                handleFiltroChange
              }
            >
              <option value="">
                Todas
              </option>

              <option value="semana">
                Semana
              </option>

              <option value="mes">
                Mes
              </option>
            </select>
          </label>

          <label className="form-field">
            <span>
              <CalendarDays
                size={15}
              />
              Fecha
            </span>

            <input
              type="date"
              name="fechaReferencia"
              value={
                filtros.fechaReferencia
              }
              onChange={
                handleFiltroChange
              }
              disabled={
                !filtros.periodo
              }
            />
          </label>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "10px",
          }}
        >
          <button
            type="button"
            className="secondary-button"
            onClick={limpiarFiltros}
            style={{
              padding: "8px 12px",
            }}
          >
            Limpiar filtros
          </button>
        </div>

        {loading ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
            }}
          >
            Cargando acciones...
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              overflowX: "auto",
              minHeight: "460px",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: "1280px",
                borderCollapse:
                  "collapse",
                tableLayout: "fixed",
                background: "#fff",
              }}
            >
              <thead>
                <tr>
                  {[
                    ["Pilar", "140px"],
                    ["Causa", "260px"],
                    ["Qué", "230px"],
                    ["Cómo", "260px"],
                    ["Quién", "170px"],
                    ["Cuándo", "140px"],
                    ["Estado", "150px"],
                    ["", "55px"],
                  ].map(
                    ([titulo, ancho]) => (
                      <th
                        key={
                          titulo ||
                          "acciones"
                        }
                        style={{
                          width: ancho,
                          padding:
                            "12px 10px",
                          textAlign:
                            "left",
                          fontSize:
                            "12px",
                          fontWeight:
                            800,
                          color:
                            "#344054",
                          background:
                            "#f8fafc",
                          border:
                            "1px solid #e5e7eb",
                          position:
                            "sticky",
                          top: 0,
                          zIndex: 3,
                        }}
                      >
                        {titulo}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {accionesFiltradas.map(
                  (accion) => {
                    const vencida =
                      estaVencida(
                        accion
                      );

                    return (
                      <tr
                        key={
                          accion.id
                        }
                        style={{
                          background:
                            vencida
                              ? "#fffafa"
                              : "#fff",
                        }}
                      >
                        {[
                          "pilar",
                          "causa",
                          "que",
                          "como",
                          "quien",
                          "cuando",
                        ].map(
                          (campo) => {
                            const editando =
                              editandoCelda?.id ===
                                accion.id &&
                              editandoCelda?.campo ===
                                campo;

                            const esFecha =
                              campo ===
                              "cuando";

                            const esLista =
                              campo ===
                                "pilar" ||
                              campo ===
                                "quien";

                            return (
                              <td
                                key={
                                  campo
                                }
                                onClick={() => {
                                  if (
                                    !editando
                                  ) {
                                    iniciarEdicion(
                                      accion,
                                      campo
                                    );
                                  }
                                }}
                                style={{
                                  padding:
                                    editando
                                      ? "4px"
                                      : "10px",
                                  border:
                                    "1px solid #e5e7eb",
                                  verticalAlign:
                                    "top",
                                  fontSize:
                                    "12px",
                                  cursor:
                                    "text",
                                  minHeight:
                                    "52px",
                                  color:
                                    campo ===
                                      "cuando" &&
                                    vencida
                                      ? "#b91c1c"
                                      : "#101828",
                                  fontWeight:
                                    campo ===
                                      "cuando" &&
                                    vencida
                                      ? 800
                                      : 500,
                                }}
                              >
                                {editando ? (
                                  esLista &&
                                  campo ===
                                    "pilar" ? (
                                    <select
                                      autoFocus
                                      value={
                                        valorEdicion
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        setValorEdicion(
                                          event
                                            .target
                                            .value
                                        )
                                      }
                                      onBlur={() =>
                                        guardarCelda(
                                          accion,
                                          campo,
                                          valorEdicion
                                        )
                                      }
                                      style={{
                                        width:
                                          "100%",
                                        minHeight:
                                          "38px",
                                        border:
                                          "1px solid #2563eb",
                                        borderRadius:
                                          "6px",
                                      }}
                                    >
                                      {PILARES.map(
                                        (
                                          pilar
                                        ) => (
                                          <option
                                            key={
                                              pilar
                                            }
                                            value={
                                              pilar
                                            }
                                          >
                                            {
                                              pilar
                                            }
                                          </option>
                                        )
                                      )}
                                    </select>
                                  ) : esLista &&
                                    campo ===
                                      "quien" ? (
                                    <>
                                      <input
                                        autoFocus
                                        value={
                                          valorEdicion
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          setValorEdicion(
                                            event
                                              .target
                                              .value
                                          )
                                        }
                                        onKeyDown={(
                                          event
                                        ) =>
                                          manejarTeclaEdicion(
                                            event,
                                            accion,
                                            campo
                                          )
                                        }
                                        onBlur={() =>
                                          guardarCelda(
                                            accion,
                                            campo,
                                            valorEdicion
                                          )
                                        }
                                        list="responsables-inline"
                                        style={{
                                          width:
                                            "100%",
                                          minHeight:
                                            "38px",
                                          border:
                                            "1px solid #2563eb",
                                          borderRadius:
                                            "6px",
                                          padding:
                                            "6px",
                                        }}
                                      />

                                      <datalist id="responsables-inline">
                                        {responsables.map(
                                          (
                                            responsable
                                          ) => (
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
                                    </>
                                  ) : esFecha ? (
                                    <input
                                      autoFocus
                                      type="date"
                                      value={
                                        valorEdicion
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        setValorEdicion(
                                          event
                                            .target
                                            .value
                                        )
                                      }
                                      onBlur={() =>
                                        guardarCelda(
                                          accion,
                                          campo,
                                          valorEdicion
                                        )
                                      }
                                      style={{
                                        width:
                                          "100%",
                                        minHeight:
                                          "38px",
                                        border:
                                          "1px solid #2563eb",
                                        borderRadius:
                                          "6px",
                                        padding:
                                          "6px",
                                      }}
                                    />
                                  ) : (
                                    <textarea
                                      autoFocus
                                      value={
                                        valorEdicion
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        setValorEdicion(
                                          event
                                            .target
                                            .value
                                        )
                                      }
                                      onKeyDown={(
                                        event
                                      ) =>
                                        manejarTeclaEdicion(
                                          event,
                                          accion,
                                          campo
                                        )
                                      }
                                      onBlur={() =>
                                        guardarCelda(
                                          accion,
                                          campo,
                                          valorEdicion
                                        )
                                      }
                                      rows={
                                        campo ===
                                          "causa" ||
                                        campo ===
                                          "como"
                                          ? 3
                                          : 2
                                      }
                                      style={{
                                        width:
                                          "100%",
                                        minHeight:
                                          "48px",
                                        border:
                                          "1px solid #2563eb",
                                        borderRadius:
                                          "6px",
                                        padding:
                                          "6px",
                                        resize:
                                          "vertical",
                                        font:
                                          "inherit",
                                      }}
                                    />
                                  )
                                ) : (
                                  <div
                                    style={{
                                      whiteSpace:
                                        "pre-wrap",
                                      lineHeight:
                                        1.45,
                                    }}
                                  >
                                    {campo ===
                                    "cuando"
                                      ? formatDate(
                                          accion[
                                            campo
                                          ]
                                        )
                                      : accion[
                                          campo
                                        ] ||
                                        "—"}

                                    {campo ===
                                      "causa" &&
                                      accion.origen ===
                                        "Gemba" && (
                                        <div
                                          style={{
                                            marginTop:
                                              "6px",
                                            fontSize:
                                              "10px",
                                            color:
                                              "#667085",
                                            fontWeight:
                                              700,
                                          }}
                                        >
                                          Gemba
                                        </div>
                                      )}

                                    {campo ===
                                      "causa" &&
                                      vencida && (
                                        <div
                                          style={{
                                            marginTop:
                                              "6px",
                                            color:
                                              "#b91c1c",
                                            fontSize:
                                              "10px",
                                            fontWeight:
                                              800,
                                          }}
                                        >
                                          ATRASADA
                                        </div>
                                      )}
                                  </div>
                                )}
                              </td>
                            );
                          }
                        )}

                        <td
                          style={{
                            padding:
                              "6px",
                            border:
                              "1px solid #e5e7eb",
                            verticalAlign:
                              "top",
                          }}
                        >
                          <select
                            value={
                              accion.estado
                            }
                            onChange={(
                              event
                            ) =>
                              guardarCelda(
                                accion,
                                "estado",
                                event
                                  .target
                                  .value
                              )
                            }
                            style={{
                              width:
                                "100%",
                              minHeight:
                                "36px",
                              border:
                                "1px solid #e5e7eb",
                              borderRadius:
                                "6px",
                              background:
                                "#fff",
                              color:
                                getColorEstado(
                                  accion.estado
                                ),
                              fontWeight:
                                800,
                              fontSize:
                                "12px",
                              cursor:
                                "pointer",
                            }}
                          >
                            {ESTADOS.map(
                              (
                                estado
                              ) => (
                                <option
                                  key={
                                    estado
                                  }
                                  value={
                                    estado
                                  }
                                >
                                  {estado}
                                </option>
                              )
                            )}
                          </select>
                        </td>

                        <td
                          style={{
                            padding:
                              "6px",
                            border:
                              "1px solid #e5e7eb",
                            verticalAlign:
                              "top",
                            textAlign:
                              "center",
                          }}
                        >
                          <button
                            type="button"
                            className="icon-delete-button"
                            onClick={() =>
                              eliminarAccion(
                                accion
                              )
                            }
                            title="Eliminar acción"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export default PlanAccion;
