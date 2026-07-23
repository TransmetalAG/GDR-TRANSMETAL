import React, { useEffect, useMemo, useState } from "react";
import {
  Footprints,
  ShieldCheck,
  Award,
  Gauge,
  Wrench,
  CalendarDays,
  RefreshCw,
} from "lucide-react";

import { supabase } from "../lib/supabase.js";

function toLocalDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfWeek(date = new Date()) {
  const copy = startOfWeek(date);
  copy.setDate(copy.getDate() + 6);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date = new Date()) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
}

function formatDate(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function Dashboard({
  modules = [],
  onNewGemba,
}) {
  const [periodo, setPeriodo] = useState("mes");
  const [fechaInicio, setFechaInicio] = useState(() =>
    toLocalDateInput(startOfMonth(new Date()))
  );
  const [fechaFin, setFechaFin] = useState(() =>
    toLocalDateInput(endOfMonth(new Date()))
  );

  const [gembas, setGembas] = useState([]);
  const [accionesPlan, setAccionesPlan] = useState([]);
  const [tareasMantenimiento, setTareasMantenimiento] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  function aplicarPeriodo(nuevoPeriodo) {
    setPeriodo(nuevoPeriodo);

    if (nuevoPeriodo === "semana") {
      setFechaInicio(toLocalDateInput(startOfWeek(new Date())));
      setFechaFin(toLocalDateInput(endOfWeek(new Date())));
      return;
    }

    if (nuevoPeriodo === "mes") {
      setFechaInicio(toLocalDateInput(startOfMonth(new Date())));
      setFechaFin(toLocalDateInput(endOfMonth(new Date())));
    }
  }

  async function cargarDashboard() {
    setCargando(true);
    setError("");

    const [
      { data: gembasData, error: gembasError },
      { data: planData, error: planError },
      { data: mantenimientoData, error: mantenimientoError },
    ] = await Promise.all([
      supabase
        .from("gembas")
        .select(
          "id, fecha, maquina, proceso, colaborador, tarea, auditor, estado"
        )
        .order("fecha", { ascending: false }),

      supabase
        .from("plan_accion")
        .select(
          "id, gemba_id, pilar, maquina, hallazgo, estado, origen, fecha_cierre"
        )
        .eq("origen", "Gemba"),

      supabase
        .from("mantenimiento")
        .select(
          "id, gemba_id, equipo, hallazgo, tarea, estado, origen, fecha_cierre"
        )
        .eq("origen", "Gemba"),
    ]);

    const firstError =
      gembasError || planError || mantenimientoError;

    if (firstError) {
      console.error("Error al cargar Dashboard:", firstError);
      setError(firstError.message);
      setCargando(false);
      return;
    }

    setGembas(gembasData || []);
    setAccionesPlan(planData || []);
    setTareasMantenimiento(mantenimientoData || []);
    setCargando(false);
  }

  useEffect(() => {
    cargarDashboard();
  }, []);

  const rango = useMemo(() => {
    if (!fechaInicio || !fechaFin) {
      return {
        inicio: null,
        fin: null,
      };
    }

    const inicio = new Date(`${fechaInicio}T00:00:00`);
    const fin = new Date(`${fechaFin}T23:59:59.999`);

    return {
      inicio,
      fin,
    };
  }, [fechaInicio, fechaFin]);

  const gembasFiltrados = useMemo(() => {
    if (!rango.inicio || !rango.fin) return [];

    return gembas.filter((gemba) => {
      const fecha = new Date(gemba.fecha);

      return (
        fecha >= rango.inicio &&
        fecha <= rango.fin
      );
    });
  }, [gembas, rango]);

  const idsGembasFiltrados = useMemo(
    () => new Set(gembasFiltrados.map((gemba) => gemba.id)),
    [gembasFiltrados]
  );

  const accionesFiltradas = useMemo(
    () =>
      accionesPlan.filter(
        (accion) =>
          accion.gemba_id &&
          idsGembasFiltrados.has(accion.gemba_id)
      ),
    [accionesPlan, idsGembasFiltrados]
  );

  const mantenimientoFiltrado = useMemo(
    () =>
      tareasMantenimiento.filter(
        (tarea) =>
          tarea.gemba_id &&
          idsGembasFiltrados.has(tarea.gemba_id)
      ),
    [tareasMantenimiento, idsGembasFiltrados]
  );

  const indicadores = useMemo(() => {
    const totalHallazgos =
      accionesFiltradas.length +
      mantenimientoFiltrado.length;

    const cerradosPlan =
      accionesFiltradas.filter(
        (accion) => accion.estado === "Terminada"
      ).length;

    const cerradosMantenimiento =
      mantenimientoFiltrado.filter(
        (tarea) => tarea.estado === "Cerrada"
      ).length;

    const cerrados =
      cerradosPlan + cerradosMantenimiento;

    const porcentaje =
      totalHallazgos > 0
        ? (cerrados / totalHallazgos) * 100
        : 0;

    return {
      gembas: gembasFiltrados.length,
      hallazgos: totalHallazgos,
      cerrados,
      porcentaje,
    };
  }, [
    gembasFiltrados,
    accionesFiltradas,
    mantenimientoFiltrado,
  ]);

  const seguimientoGembas = useMemo(() => {
    return gembasFiltrados.map((gemba) => {
      const acciones =
        accionesFiltradas.filter(
          (accion) => accion.gemba_id === gemba.id
        );

      const mantenimiento =
        mantenimientoFiltrado.filter(
          (tarea) => tarea.gemba_id === gemba.id
        );

      const total =
        acciones.length + mantenimiento.length;

      const cerrados =
        acciones.filter(
          (accion) => accion.estado === "Terminada"
        ).length +
        mantenimiento.filter(
          (tarea) => tarea.estado === "Cerrada"
        ).length;

      const porcentaje =
        total > 0
          ? (cerrados / total) * 100
          : 100;

      return {
        ...gemba,
        totalHallazgos: total,
        cerrados,
        porcentaje,
      };
    });
  }, [
    gembasFiltrados,
    accionesFiltradas,
    mantenimientoFiltrado,
  ]);

  const textoPeriodo =
    periodo === "semana"
      ? "Semana seleccionada"
      : periodo === "mes"
        ? "Mes seleccionado"
        : "Rango seleccionado";

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">
            Gestión de Rutina
          </span>

          <h2>
            Dashboard Gemba
          </h2>

          <p>
            Medí la ejecución de Gembas y el cierre de los
            hallazgos generados.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={onNewGemba}
        >
          <Footprints size={20} />
          Nuevo Gemba Walk
        </button>
      </header>

      <section
        className="section-block"
        style={{
          padding: "16px 18px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "14px",
            alignItems: "end",
            flexWrap: "wrap",
          }}
        >
          <label
            className="form-field"
            style={{
              margin: 0,
              minWidth: "190px",
            }}
          >
            <span>
              <CalendarDays size={17} />
              Período
            </span>

            <select
              value={periodo}
              onChange={(event) =>
                aplicarPeriodo(event.target.value)
              }
            >
              <option value="semana">
                Esta semana
              </option>

              <option value="mes">
                Este mes
              </option>

              <option value="personalizado">
                Personalizado
              </option>
            </select>
          </label>

          <label
            className="form-field"
            style={{
              margin: 0,
              minWidth: "175px",
            }}
          >
            <span>
              Desde
            </span>

            <input
              type="date"
              value={fechaInicio}
              onChange={(event) => {
                setPeriodo("personalizado");
                setFechaInicio(event.target.value);
              }}
            />
          </label>

          <label
            className="form-field"
            style={{
              margin: 0,
              minWidth: "175px",
            }}
          >
            <span>
              Hasta
            </span>

            <input
              type="date"
              value={fechaFin}
              onChange={(event) => {
                setPeriodo("personalizado");
                setFechaFin(event.target.value);
              }}
            />
          </label>

          <button
            type="button"
            className="secondary-button"
            onClick={cargarDashboard}
            disabled={cargando}
            style={{
              minHeight: "44px",
            }}
          >
            <RefreshCw size={17} />
            Actualizar
          </button>
        </div>
      </section>

      {error && (
        <div
          style={{
            padding: "14px 16px",
            marginBottom: "18px",
            borderRadius: "12px",
            background: "#fff1f2",
            color: "#be123c",
            fontWeight: 700,
          }}
        >
          No se pudo cargar el Dashboard: {error}
        </div>
      )}

      <section className="kpi-grid">
        <div className="kpi-card">
          <span>
            Gembas realizados
          </span>

          <strong>
            {cargando ? "—" : indicadores.gembas}
          </strong>

          <small>
            {textoPeriodo}
          </small>
        </div>

        <div className="kpi-card">
          <span>
            Hallazgos detectados
          </span>

          <strong>
            {cargando ? "—" : indicadores.hallazgos}
          </strong>

          <small>
            Generados por los Gembas
          </small>
        </div>

        <div className="kpi-card">
          <span>
            Hallazgos cerrados
          </span>

          <strong>
            {cargando ? "—" : indicadores.cerrados}
          </strong>

          <small>
            Plan + Mantenimiento
          </small>
        </div>

        <div className="kpi-card">
          <span>
            % de cierre
          </span>

          <strong>
            {cargando
              ? "—"
              : `${indicadores.porcentaje.toFixed(1)}%`}
          </strong>

          <small>
            Cerrados / hallazgos detectados
          </small>
        </div>
      </section>

      <section
        className="section-block"
        style={{
          marginTop: "18px",
        }}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              Seguimiento
            </span>

            <h3>
              Gembas del período
            </h3>
          </div>

          <p>
            Seguimiento del cierre de los hallazgos originados
            en cada recorrido.
          </p>
        </div>

        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "880px",
            }}
          >
            <thead>
              <tr>
                {[
                  "Fecha",
                  "Equipo",
                  "Proceso",
                  "Auditor",
                  "Hallazgos",
                  "Cerrados",
                  "% cierre",
                ].map((titulo) => (
                  <th
                    key={titulo}
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      borderBottom:
                        "1px solid #e5e7eb",
                      color: "#344054",
                      fontSize: "12px",
                    }}
                  >
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!cargando &&
                seguimientoGembas.map((gemba) => (
                  <tr key={gemba.id}>
                    <td style={cellStyle}>
                      {formatDate(gemba.fecha)}
                    </td>

                    <td style={cellStyle}>
                      <strong>
                        {gemba.maquina || "—"}
                      </strong>
                    </td>

                    <td style={cellStyle}>
                      {gemba.proceso || "—"}
                    </td>

                    <td style={cellStyle}>
                      {gemba.auditor || "—"}
                    </td>

                    <td style={cellStyle}>
                      {gemba.totalHallazgos}
                    </td>

                    <td style={cellStyle}>
                      {gemba.cerrados}
                    </td>

                    <td style={cellStyle}>
                      <strong>
                        {gemba.porcentaje.toFixed(1)}%
                      </strong>
                    </td>
                  </tr>
                ))}

              {!cargando &&
                seguimientoGembas.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      style={{
                        padding: "28px",
                        textAlign: "center",
                        color: "#667085",
                      }}
                    >
                      No hay Gembas en el período seleccionado.
                    </td>
                  </tr>
                )}

              {cargando && (
                <tr>
                  <td
                    colSpan="7"
                    style={{
                      padding: "28px",
                      textAlign: "center",
                      color: "#667085",
                    }}
                  >
                    Cargando información...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="section-block"
        style={{
          marginTop: "18px",
        }}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              Pilares Gemba
            </span>

            <h3>
              Módulos de observación
            </h3>
          </div>

          <p>
            Cuatro enfoques para observar el trabajo real e
            identificar oportunidades de mejora.
          </p>
        </div>

        <div className="module-grid">
          {modules.map((module) => {
            const Icon =
              module.icon ||
              getIconByModuleId(module.id);

            return (
              <article
                className="module-card"
                key={module.id}
              >
                <div
                  className={`module-icon ${module.id}`}
                >
                  <Icon size={25} />
                </div>

                <div>
                  <h4>
                    {module.name}
                  </h4>

                  <p>
                    {module.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

const cellStyle = {
  padding: "12px",
  borderBottom: "1px solid #eef2f6",
  fontSize: "12px",
  verticalAlign: "top",
};

function getIconByModuleId(moduleId) {
  const icons = {
    seguridad: ShieldCheck,
    calidad: Award,
    proceso: Gauge,
    mantenimiento: Wrench,
  };

  return icons[moduleId] || Footprints;
}

export default Dashboard;
