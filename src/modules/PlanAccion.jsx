import React, { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Plus,
  Trash2,
  X,
  CheckCircle2,
} from "lucide-react";

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

function normalizarAccion(row) {
  const esGembaSinPlan =
    row.origen === "Gemba" &&
    !row.que &&
    !row.como &&
    !row.responsable &&
    !row.fecha_compromiso;

  return {
    id: row.id,
    origen: row.origen || "Manual",
    pilar: row.pilar || "",
    causa: row.hallazgo || "",
    que: row.que || "",
    como: row.como || "",
    quien: row.responsable || "",
    cuando: row.fecha_compromiso || "",
    estado:
      esGembaSinPlan
        ? "Sin planificar"
        : row.estado || "Pendiente",
    fechaCierre: row.fecha_cierre || null,
  };
}

function PlanAccion() {
  const [loading, setLoading] = useState(true);
  const [acciones, setAcciones] = useState([]);

  const [filtrosEncabezado, setFiltrosEncabezado] = useState({
    pilar: "",
    quien: "",
    cuando: "",
    estado: "",
  });

  const [editandoCelda, setEditandoCelda] = useState(null);
  const [valorEdicion, setValorEdicion] = useState("");

  const [mostrandoNuevaFila, setMostrandoNuevaFila] = useState(false);
  const [guardandoNueva, setGuardandoNueva] = useState(false);

  const [nuevaFila, setNuevaFila] = useState({
    pilar: "",
    causa: "",
    que: "",
    como: "",
    quien: "",
    cuando: "",
    estado: "Pendiente",
  });

  const responsables = useMemo(() => {
    const existentes = acciones
      .map((accion) => accion.quien)
      .filter(Boolean);

    return [...new Set([...colaboradores, ...existentes])].sort((a, b) =>
      a.localeCompare(b, "es")
    );
  }, [acciones]);

  const accionesVisibles = useMemo(() => {
    return acciones.filter((accion) => {
      const coincidePilar =
        !filtrosEncabezado.pilar ||
        accion.pilar === filtrosEncabezado.pilar;

      const coincideQuien =
        !filtrosEncabezado.quien ||
        accion.quien === filtrosEncabezado.quien;

      let coincideCuando = true;

      if (filtrosEncabezado.cuando) {
        coincideCuando =
          accion.cuando === filtrosEncabezado.cuando;
      }

      let coincideEstado = true;

      if (filtrosEncabezado.estado === "Atrasada") {
        coincideEstado = estaAtrasada(accion);
      } else if (filtrosEncabezado.estado) {
        coincideEstado =
          accion.estado === filtrosEncabezado.estado;
      }

      return (
        coincidePilar &&
        coincideQuien &&
        coincideCuando &&
        coincideEstado
      );
    });
  }, [acciones, filtrosEncabezado]);

  useEffect(() => {
    cargarAcciones();
  }, []);

  async function cargarAcciones() {
    setLoading(true);

    const { data, error } = await supabase
      .from("plan_accion")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al cargar Plan de Acción:", error);
      alert(`No se pudo cargar el Plan de Acción.\n\n${error.message}`);
      setLoading(false);
      return;
    }

    setAcciones((data || []).map(normalizarAccion));
    setLoading(false);
  }

  function estaAtrasada(accion) {
    if (
      accion.estado === "Terminada" ||
      accion.estado === "Sin planificar" ||
      !accion.cuando
    ) {
      return false;
    }

    return accion.cuando < toDateString(new Date());
  }

  function estadoVisual(accion) {
    return estaAtrasada(accion)
      ? "Atrasada"
      : accion.estado;
  }

  function getColorEstado(estado) {
    if (estado === "Terminada") return "#15803d";
    if (estado === "En proceso") return "#d97706";
    if (estado === "Pendiente") return "#dc2626";
    if (estado === "Atrasada") return "#b91c1c";
    return "#667085";
  }

  function iniciarEdicion(accion, campo) {
    setEditandoCelda({
      id: accion.id,
      campo,
    });

    setValorEdicion(accion[campo] ?? "");
  }

  function cancelarEdicion() {
    setEditandoCelda(null);
    setValorEdicion("");
  }

  async function guardarCelda(accion, campo, valor) {
    const mapaCampos = {
      pilar: "pilar",
      causa: "hallazgo",
      que: "que",
      como: "como",
      quien: "responsable",
      cuando: "fecha_compromiso",
      estado: "estado",
    };

    const columnaDb = mapaCampos[campo];

    if (!columnaDb) {
      cancelarEdicion();
      return;
    }

    const valorLimpio =
      typeof valor === "string"
        ? valor.trim()
        : valor;

    const accionProyectada = {
      ...accion,
      [campo]: valorLimpio,
    };

    const planCompleto =
      Boolean(accionProyectada.que) &&
      Boolean(accionProyectada.como) &&
      Boolean(accionProyectada.quien) &&
      Boolean(accionProyectada.cuando);

    let nuevoEstado = accion.estado;

    if (
      campo !== "estado" &&
      accion.estado === "Sin planificar" &&
      planCompleto
    ) {
      nuevoEstado = "Pendiente";
    }

    if (campo === "estado") {
      nuevoEstado = valorLimpio;
    }

    const payload = {
      [columnaDb]: valorLimpio || null,
    };

    if (nuevoEstado !== accion.estado) {
      payload.estado = nuevoEstado;
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
              estado: nuevoEstado,
              fechaCierre:
                nuevoEstado === "Terminada"
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
      console.error("Error al actualizar celda:", error);
      alert(`No se pudo guardar el cambio.\n\n${error.message}`);
      await cargarAcciones();
    }
  }

  function manejarTeclaEdicion(event, accion, campo) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      guardarCelda(accion, campo, valorEdicion);
    }

    if (event.key === "Escape") {
      cancelarEdicion();
    }
  }

  async function eliminarAccion(accion) {
    const confirmar = window.confirm(
      `¿Seguro que deseás eliminar esta acción?\n\n${accion.causa}\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("plan_accion")
      .delete()
      .eq("id", accion.id);

    if (error) {
      console.error("Error al eliminar acción:", error);
      alert(`No se pudo eliminar la acción.\n\n${error.message}`);
      return;
    }

    setAcciones((previous) =>
      previous.filter((item) => item.id !== accion.id)
    );
  }

  function abrirNuevaFila() {
    setNuevaFila({
      pilar: "",
      causa: "",
      que: "",
      como: "",
      quien: "",
      cuando: "",
      estado: "Pendiente",
    });

    setMostrandoNuevaFila(true);
  }

  function cancelarNuevaFila() {
    setMostrandoNuevaFila(false);

    setNuevaFila({
      pilar: "",
      causa: "",
      que: "",
      como: "",
      quien: "",
      cuando: "",
      estado: "Pendiente",
    });
  }

  function cambiarNuevaFila(campo, valor) {
    setNuevaFila((previous) => ({
      ...previous,
      [campo]: valor,
    }));
  }

  async function guardarNuevaFila() {
    if (!nuevaFila.pilar) {
      alert("Seleccioná el pilar.");
      return;
    }

    if (!nuevaFila.causa.trim()) {
      alert("Ingresá la causa.");
      return;
    }

    setGuardandoNueva(true);

    const { error } = await supabase
      .from("plan_accion")
      .insert({
        origen: "Manual",
        pilar: nuevaFila.pilar,
        hallazgo: nuevaFila.causa.trim(),
        que: nuevaFila.que.trim() || null,
        como: nuevaFila.como.trim() || null,
        responsable: nuevaFila.quien.trim() || null,
        fecha_compromiso: nuevaFila.cuando || null,
        estado: nuevaFila.estado || "Pendiente",
        fecha_cierre:
          nuevaFila.estado === "Terminada"
            ? new Date().toISOString()
            : null,
      });

    if (error) {
      console.error("Error al crear acción:", error);
      alert(`No se pudo crear la acción.\n\n${error.message}`);
      setGuardandoNueva(false);
      return;
    }

    setGuardandoNueva(false);
    cancelarNuevaFila();

    await cargarAcciones();
  }

  const cellBase = {
    padding: "10px",
    border: "1px solid #e5e7eb",
    verticalAlign: "top",
    fontSize: "12px",
    background: "#fff",
  };

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
            Editá directamente la matriz haciendo clic sobre una celda.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={
            mostrandoNuevaFila
              ? cancelarNuevaFila
              : abrirNuevaFila
          }
        >
          {mostrandoNuevaFila ? (
            <>
              <X size={18} />
              Cancelar
            </>
          ) : (
            <>
              <Plus size={18} />
              Agregar acción
            </>
          )}
        </button>
      </header>

      <section
        className="section-block"
        style={{
          padding: "12px",
        }}
      >
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
              minHeight: "520px",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: "1320px",
                borderCollapse: "collapse",
                tableLayout: "fixed",
                background: "#fff",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      width: "150px",
                      padding: "8px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#344054",
                      background: "#f8fafc",
                      border: "1px solid #e5e7eb",
                      position: "sticky",
                      top: 0,
                      zIndex: 3,
                    }}
                  >
                    <div style={{ display: "grid", gap: "6px" }}>
                      <span>Pilar</span>
                      <select
                        value={filtrosEncabezado.pilar}
                        onChange={(event) =>
                          setFiltrosEncabezado((previous) => ({
                            ...previous,
                            pilar: event.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          minHeight: "30px",
                          fontSize: "11px",
                        }}
                      >
                        <option value="">Todos</option>
                        {PILARES.map((pilar) => (
                          <option key={pilar} value={pilar}>
                            {pilar}
                          </option>
                        ))}
                      </select>
                    </div>
                  </th>

                  <th
                    style={{
                      width: "280px",
                      padding: "12px 10px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#344054",
                      background: "#f8fafc",
                      border: "1px solid #e5e7eb",
                      position: "sticky",
                      top: 0,
                      zIndex: 3,
                    }}
                  >
                    Causa
                  </th>

                  <th
                    style={{
                      width: "240px",
                      padding: "12px 10px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#344054",
                      background: "#f8fafc",
                      border: "1px solid #e5e7eb",
                      position: "sticky",
                      top: 0,
                      zIndex: 3,
                    }}
                  >
                    Qué
                  </th>

                  <th
                    style={{
                      width: "280px",
                      padding: "12px 10px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#344054",
                      background: "#f8fafc",
                      border: "1px solid #e5e7eb",
                      position: "sticky",
                      top: 0,
                      zIndex: 3,
                    }}
                  >
                    Cómo
                  </th>

                  <th
                    style={{
                      width: "180px",
                      padding: "8px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#344054",
                      background: "#f8fafc",
                      border: "1px solid #e5e7eb",
                      position: "sticky",
                      top: 0,
                      zIndex: 3,
                    }}
                  >
                    <div style={{ display: "grid", gap: "6px" }}>
                      <span>Quién</span>
                      <select
                        value={filtrosEncabezado.quien}
                        onChange={(event) =>
                          setFiltrosEncabezado((previous) => ({
                            ...previous,
                            quien: event.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          minHeight: "30px",
                          fontSize: "11px",
                        }}
                      >
                        <option value="">Todos</option>
                        {responsables.map((responsable) => (
                          <option
                            key={responsable}
                            value={responsable}
                          >
                            {responsable}
                          </option>
                        ))}
                      </select>
                    </div>
                  </th>

                  <th
                    style={{
                      width: "150px",
                      padding: "8px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#344054",
                      background: "#f8fafc",
                      border: "1px solid #e5e7eb",
                      position: "sticky",
                      top: 0,
                      zIndex: 3,
                    }}
                  >
                    <div style={{ display: "grid", gap: "6px" }}>
                      <span>Cuándo</span>
                      <input
                        type="date"
                        value={filtrosEncabezado.cuando}
                        onChange={(event) =>
                          setFiltrosEncabezado((previous) => ({
                            ...previous,
                            cuando: event.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          minHeight: "30px",
                          fontSize: "11px",
                        }}
                      />
                    </div>
                  </th>

                  <th
                    style={{
                      width: "160px",
                      padding: "8px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#344054",
                      background: "#f8fafc",
                      border: "1px solid #e5e7eb",
                      position: "sticky",
                      top: 0,
                      zIndex: 3,
                    }}
                  >
                    <div style={{ display: "grid", gap: "6px" }}>
                      <span>Estado</span>
                      <select
                        value={filtrosEncabezado.estado}
                        onChange={(event) =>
                          setFiltrosEncabezado((previous) => ({
                            ...previous,
                            estado: event.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          minHeight: "30px",
                          fontSize: "11px",
                        }}
                      >
                        <option value="">Todos</option>
                        <option value="Sin planificar">
                          Sin planificar
                        </option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="En proceso">En proceso</option>
                        <option value="Terminada">Terminada</option>
                        <option value="Atrasada">Atrasada</option>
                      </select>
                    </div>
                  </th>

                  <th
                    style={{
                      width: "90px",
                      padding: "12px 10px",
                      background: "#f8fafc",
                      border: "1px solid #e5e7eb",
                      position: "sticky",
                      top: 0,
                      zIndex: 3,
                    }}
                  />
                </tr>
              </thead>

              <tbody>
                {mostrandoNuevaFila && (
                  <tr
                    style={{
                      background: "#f8fbff",
                    }}
                  >
                    <td style={cellBase}>
                      <select
                        autoFocus
                        value={nuevaFila.pilar}
                        onChange={(event) =>
                          cambiarNuevaFila(
                            "pilar",
                            event.target.value
                          )
                        }
                        style={{
                          width: "100%",
                          minHeight: "38px",
                          border: "1px solid #2563eb",
                          borderRadius: "6px",
                          padding: "6px",
                        }}
                      >
                        <option value="">
                          Seleccionar
                        </option>

                        {PILARES.map((pilar) => (
                          <option
                            key={pilar}
                            value={pilar}
                          >
                            {pilar}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={cellBase}>
                      <textarea
                        value={nuevaFila.causa}
                        onChange={(event) =>
                          cambiarNuevaFila(
                            "causa",
                            event.target.value
                          )
                        }
                        rows="3"
                        placeholder="Causa..."
                        style={{
                          width: "100%",
                          border: "1px solid #2563eb",
                          borderRadius: "6px",
                          padding: "6px",
                          resize: "vertical",
                          font: "inherit",
                        }}
                      />
                    </td>

                    <td style={cellBase}>
                      <textarea
                        value={nuevaFila.que}
                        onChange={(event) =>
                          cambiarNuevaFila(
                            "que",
                            event.target.value
                          )
                        }
                        rows="3"
                        placeholder="Qué..."
                        style={{
                          width: "100%",
                          border: "1px solid #2563eb",
                          borderRadius: "6px",
                          padding: "6px",
                          resize: "vertical",
                          font: "inherit",
                        }}
                      />
                    </td>

                    <td style={cellBase}>
                      <textarea
                        value={nuevaFila.como}
                        onChange={(event) =>
                          cambiarNuevaFila(
                            "como",
                            event.target.value
                          )
                        }
                        rows="3"
                        placeholder="Cómo..."
                        style={{
                          width: "100%",
                          border: "1px solid #2563eb",
                          borderRadius: "6px",
                          padding: "6px",
                          resize: "vertical",
                          font: "inherit",
                        }}
                      />
                    </td>

                    <td style={cellBase}>
                      <input
                        value={nuevaFila.quien}
                        onChange={(event) =>
                          cambiarNuevaFila(
                            "quien",
                            event.target.value
                          )
                        }
                        list="responsables-nueva-fila"
                        placeholder="Responsable"
                        style={{
                          width: "100%",
                          minHeight: "38px",
                          border: "1px solid #2563eb",
                          borderRadius: "6px",
                          padding: "6px",
                        }}
                      />

                      <datalist id="responsables-nueva-fila">
                        {responsables.map((responsable) => (
                          <option
                            key={responsable}
                            value={responsable}
                          />
                        ))}
                      </datalist>
                    </td>

                    <td style={cellBase}>
                      <input
                        type="date"
                        value={nuevaFila.cuando}
                        onChange={(event) =>
                          cambiarNuevaFila(
                            "cuando",
                            event.target.value
                          )
                        }
                        style={{
                          width: "100%",
                          minHeight: "38px",
                          border: "1px solid #2563eb",
                          borderRadius: "6px",
                          padding: "6px",
                        }}
                      />
                    </td>

                    <td style={cellBase}>
                      <select
                        value={nuevaFila.estado}
                        onChange={(event) =>
                          cambiarNuevaFila(
                            "estado",
                            event.target.value
                          )
                        }
                        style={{
                          width: "100%",
                          minHeight: "38px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          background: "#fff",
                          color: getColorEstado(
                            nuevaFila.estado
                          ),
                          fontWeight: 800,
                        }}
                      >
                        <option value="Pendiente">
                          Pendiente
                        </option>

                        <option value="En proceso">
                          En proceso
                        </option>

                        <option value="Terminada">
                          Terminada
                        </option>
                      </select>
                    </td>

                    <td style={cellBase}>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          justifyContent: "center",
                        }}
                      >
                        <button
                          type="button"
                          className="primary-button"
                          onClick={guardarNuevaFila}
                          disabled={guardandoNueva}
                          title="Guardar nueva acción"
                          style={{
                            minWidth: "38px",
                            padding: "8px",
                          }}
                        >
                          <CheckCircle2 size={16} />
                        </button>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={cancelarNuevaFila}
                          title="Cancelar"
                          style={{
                            minWidth: "38px",
                            padding: "8px",
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {accionesVisibles.map((accion) => {
                  const atrasada =
                    estaAtrasada(accion);

                  const estadoMostrado =
                    estadoVisual(accion);

                  return (
                    <tr
                      key={accion.id}
                      style={{
                        background: atrasada
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
                      ].map((campo) => {
                        const editando =
                          editandoCelda?.id === accion.id &&
                          editandoCelda?.campo === campo;

                        const esFecha =
                          campo === "cuando";

                        return (
                          <td
                            key={campo}
                            onClick={() => {
                              if (!editando) {
                                iniciarEdicion(
                                  accion,
                                  campo
                                );
                              }
                            }}
                            style={{
                              ...cellBase,
                              padding: editando
                                ? "4px"
                                : "10px",
                              cursor: "text",
                              color:
                                campo === "cuando" &&
                                atrasada
                                  ? "#b91c1c"
                                  : "#101828",
                              fontWeight:
                                campo === "cuando" &&
                                atrasada
                                  ? 800
                                  : 500,
                            }}
                          >
                            {editando ? (
                              campo === "pilar" ? (
                                <select
                                  autoFocus
                                  value={valorEdicion}
                                  onChange={(event) =>
                                    setValorEdicion(
                                      event.target.value
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
                                    width: "100%",
                                    minHeight: "38px",
                                    border:
                                      "1px solid #2563eb",
                                    borderRadius: "6px",
                                  }}
                                >
                                  {PILARES.map((pilar) => (
                                    <option
                                      key={pilar}
                                      value={pilar}
                                    >
                                      {pilar}
                                    </option>
                                  ))}
                                </select>
                              ) : campo === "quien" ? (
                                <>
                                  <input
                                    autoFocus
                                    value={valorEdicion}
                                    onChange={(event) =>
                                      setValorEdicion(
                                        event.target.value
                                      )
                                    }
                                    onKeyDown={(event) =>
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
                                      width: "100%",
                                      minHeight: "38px",
                                      border:
                                        "1px solid #2563eb",
                                      borderRadius: "6px",
                                      padding: "6px",
                                    }}
                                  />

                                  <datalist id="responsables-inline">
                                    {responsables.map(
                                      (responsable) => (
                                        <option
                                          key={responsable}
                                          value={responsable}
                                        />
                                      )
                                    )}
                                  </datalist>
                                </>
                              ) : esFecha ? (
                                <input
                                  autoFocus
                                  type="date"
                                  value={valorEdicion}
                                  onChange={(event) =>
                                    setValorEdicion(
                                      event.target.value
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
                                    width: "100%",
                                    minHeight: "38px",
                                    border:
                                      "1px solid #2563eb",
                                    borderRadius: "6px",
                                    padding: "6px",
                                  }}
                                />
                              ) : (
                                <textarea
                                  autoFocus
                                  value={valorEdicion}
                                  onChange={(event) =>
                                    setValorEdicion(
                                      event.target.value
                                    )
                                  }
                                  onKeyDown={(event) =>
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
                                    campo === "causa" ||
                                    campo === "como"
                                      ? 3
                                      : 2
                                  }
                                  style={{
                                    width: "100%",
                                    minHeight: "48px",
                                    border:
                                      "1px solid #2563eb",
                                    borderRadius: "6px",
                                    padding: "6px",
                                    resize: "vertical",
                                    font: "inherit",
                                  }}
                                />
                              )
                            ) : (
                              <div
                                style={{
                                  whiteSpace: "pre-wrap",
                                  lineHeight: 1.45,
                                }}
                              >
                                {campo === "cuando"
                                  ? formatDate(
                                      accion[campo]
                                    )
                                  : accion[campo] || "—"}

                                {campo === "causa" &&
                                  accion.origen ===
                                    "Gemba" && (
                                    <div
                                      style={{
                                        marginTop: "6px",
                                        fontSize: "10px",
                                        color: "#667085",
                                        fontWeight: 700,
                                      }}
                                    >
                                      Gemba
                                    </div>
                                  )}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      <td
                        style={{
                          ...cellBase,
                          padding: "6px",
                        }}
                      >
                        <select
                          value={
                            atrasada
                              ? accion.estado
                              : accion.estado
                          }
                          onChange={(event) =>
                            guardarCelda(
                              accion,
                              "estado",
                              event.target.value
                            )
                          }
                          style={{
                            width: "100%",
                            minHeight: "36px",
                            border:
                              "1px solid #e5e7eb",
                            borderRadius: "6px",
                            background: "#fff",
                            color: getColorEstado(
                              estadoMostrado
                            ),
                            fontWeight: 800,
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          {accion.estado ===
                            "Sin planificar" && (
                            <option value="Sin planificar">
                              Sin planificar
                            </option>
                          )}

                          <option value="Pendiente">
                            {atrasada
                              ? "Atrasada"
                              : "Pendiente"}
                          </option>

                          <option value="En proceso">
                            En proceso
                          </option>

                          <option value="Terminada">
                            Terminada
                          </option>
                        </select>
                      </td>

                      <td
                        style={{
                          ...cellBase,
                          padding: "6px",
                          textAlign: "center",
                        }}
                      >
                        <button
                          type="button"
                          className="icon-delete-button"
                          onClick={() =>
                            eliminarAccion(accion)
                          }
                          title="Eliminar acción"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export default PlanAccion;
