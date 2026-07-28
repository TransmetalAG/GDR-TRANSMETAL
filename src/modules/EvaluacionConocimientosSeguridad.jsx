import React, { useEffect, useMemo, useState } from "react";
import {
  User,
  CalendarDays,
  Play,
  Save,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Loader2,
  History,
  FileSpreadsheet,
} from "lucide-react";

import { supabase } from "../lib/supabase.js";
import * as XLSX from "xlsx";

const PREGUNTAS = [
  {
    numero: 1,
    pregunta: "Mencione las 10 Reglas Generales de Seguridad.",
    tipo: "puntaje",
    maximo: 10,
  },
  {
    numero: 2,
    pregunta:
      "Mencione las 4 Reglas de Oro para el Cuidado de Manos.",
    tipo: "puntaje",
    maximo: 4,
  },
  {
    numero: 3,
    pregunta: "¿Qué es un peligro?",
    tipo: "sabe_no_sabe",
    maximo: 1,
  },
  {
    numero: 4,
    pregunta: "¿Qué es un riesgo?",
    tipo: "sabe_no_sabe",
    maximo: 1,
  },
  {
    numero: 5,
    pregunta:
      "Mencione los principales peligros de su área de trabajo.",
    tipo: "sabe_no_sabe",
    maximo: 1,
  },
  {
    numero: 6,
    pregunta:
      "Mencione los principales riesgos de su área de trabajo.",
    tipo: "sabe_no_sabe",
    maximo: 1,
  },
  {
    numero: 7,
    pregunta: "Mencione la Jerarquía de Controles.",
    tipo: "puntaje",
    maximo: 5,
  },
  {
    numero: 8,
    pregunta: "¿Qué es un paro de tareas?",
    tipo: "sabe_no_sabe",
    maximo: 1,
  },
  {
    numero: 9,
    pregunta: "¿Cuáles son los 4 estados de error?",
    tipo: "puntaje",
    maximo: 4,
  },
];

const PUNTAJE_MAXIMO = PREGUNTAS.reduce(
  (total, pregunta) => total + pregunta.maximo,
  0
);

function crearRespuestasVacias() {
  return PREGUNTAS.reduce((acumulador, pregunta) => {
    acumulador[pregunta.numero] = {
      puntaje:
        pregunta.tipo === "puntaje" ? "" : null,
      seleccion:
        pregunta.tipo === "sabe_no_sabe" ? "" : null,
      respuesta: "",
      observaciones: "",
    };

    return acumulador;
  }, {});
}

function obtenerUsuarioActual(currentUser) {
  if (currentUser?.nombre) return currentUser;

  try {
    const usuarioGuardado = localStorage.getItem("gdr_user");
    return usuarioGuardado
      ? JSON.parse(usuarioGuardado)
      : null;
  } catch {
    return null;
  }
}

export default function EvaluacionConocimientosSeguridad({
  currentUser,
  colaboradores = [],
}) {
  const usuario = obtenerUsuarioActual(currentUser);

  const [datosGenerales, setDatosGenerales] = useState({
    colaborador: "",
    observaciones: "",
  });

  const [evaluacionIniciada, setEvaluacionIniciada] =
    useState(false);

  const [respuestas, setRespuestas] = useState(
    crearRespuestasVacias
  );

  const [guardando, setGuardando] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] =
    useState(true);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [mensaje, setMensaje] = useState(null);

  const colaboradoresOrdenados = useMemo(
    () =>
      [...colaboradores].sort((a, b) =>
        a.localeCompare(b, "es")
      ),
    [colaboradores]
  );

  const fechaVisible = useMemo(
    () =>
      new Intl.DateTimeFormat("es-GT", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date()),
    []
  );

  const puntajeObtenido = useMemo(() => {
    return PREGUNTAS.reduce((total, pregunta) => {
      const respuesta = respuestas[pregunta.numero];

      if (pregunta.tipo === "puntaje") {
        const valor = Number(respuesta?.puntaje);
        return total + (Number.isFinite(valor) ? valor : 0);
      }

      return total + (respuesta?.seleccion === "sabe" ? 1 : 0);
    }, 0);
  }, [respuestas]);

  const porcentaje = useMemo(() => {
    return Number(
      ((puntajeObtenido / PUNTAJE_MAXIMO) * 100).toFixed(2)
    );
  }, [puntajeObtenido]);

  const aprobado = porcentaje >= 80;

  const preguntasRespondidas = useMemo(() => {
    return PREGUNTAS.filter((pregunta) => {
      const respuesta = respuestas[pregunta.numero];

      if (pregunta.tipo === "puntaje") {
        return respuesta?.puntaje !== "";
      }

      return Boolean(respuesta?.seleccion);
    }).length;
  }, [respuestas]);

  useEffect(() => {
    cargarHistorial();
  }, []);

  async function cargarHistorial() {
    setCargandoHistorial(true);

    const { data, error } = await supabase
      .from("evaluaciones_conocimiento")
      .select(
        "id, colaborador, auditor, fecha, puntaje_obtenido, puntaje_maximo, porcentaje, aprobado"
      )
      .order("fecha", { ascending: false })
      .limit(25);

    if (error) {
      console.error(
        "Error al cargar el historial de evaluaciones:",
        error
      );
      setHistorial([]);
    } else {
      setHistorial(data || []);
    }

    setCargandoHistorial(false);
  }

  async function exportarAExcel() {
    setExportandoExcel(true);
    setMensaje(null);

    try {
      const evaluaciones = [];
      const tamanoLote = 1000;
      let desde = 0;
      let continuar = true;

      while (continuar) {
        const { data, error } = await supabase
          .from("evaluaciones_conocimiento")
          .select(
            "id, colaborador, auditor, fecha, observaciones, puntaje_obtenido, puntaje_maximo, porcentaje, aprobado"
          )
          .order("fecha", { ascending: false })
          .range(desde, desde + tamanoLote - 1);

        if (error) throw error;

        const lote = data || [];
        evaluaciones.push(...lote);
        continuar = lote.length === tamanoLote;
        desde += tamanoLote;
      }

      if (evaluaciones.length === 0) {
        setMensaje({
          tipo: "error",
          texto: "No hay evaluaciones registradas para exportar.",
        });
        return;
      }

      const encabezados = [
        "ID",
        "Fecha",
        "Colaborador",
        "Auditor",
        "Puntaje obtenido",
        "Puntaje máximo",
        "Porcentaje",
        "Resultado",
        "Observaciones generales",
      ];

      const filas = evaluaciones.map((evaluacion) => {
        const fecha = new Date(evaluacion.fecha);

        return [
          evaluacion.id ?? "",
          Number.isNaN(fecha.getTime()) ? evaluacion.fecha || "" : fecha,
          evaluacion.colaborador || "",
          evaluacion.auditor || "",
          Number(evaluacion.puntaje_obtenido || 0),
          Number(evaluacion.puntaje_maximo || 0),
          Number(evaluacion.porcentaje || 0),
          evaluacion.aprobado ? "Aprobado" : "No aprobado",
          evaluacion.observaciones || "",
        ];
      });

      const datosHoja = [
        ["Evaluaciones de Conocimientos de Seguridad"],
        encabezados,
        ...filas,
      ];

      const hoja = XLSX.utils.aoa_to_sheet(datosHoja, {
        cellDates: true,
      });

      hoja["!merges"] = [
        {
          s: { r: 0, c: 0 },
          e: { r: 0, c: encabezados.length - 1 },
        },
      ];

      hoja["!cols"] = [
        { wch: 12 },
        { wch: 21 },
        { wch: 28 },
        { wch: 28 },
        { wch: 18 },
        { wch: 18 },
        { wch: 15 },
        { wch: 16 },
        { wch: 42 },
      ];

      hoja["!autofilter"] = {
        ref: `A2:I${filas.length + 2}`,
      };

      for (let indice = 0; indice < filas.length; indice += 1) {
        const numeroFilaExcel = indice + 3;
        const celdaFecha = hoja[`B${numeroFilaExcel}`];
        const celdaPuntaje = hoja[`E${numeroFilaExcel}`];
        const celdaMaximo = hoja[`F${numeroFilaExcel}`];
        const celdaPorcentaje = hoja[`G${numeroFilaExcel}`];

        if (celdaFecha && celdaFecha.t === "d") {
          celdaFecha.z = "dd/mm/yyyy hh:mm";
        }

        if (celdaPuntaje) celdaPuntaje.z = "0";
        if (celdaMaximo) celdaMaximo.z = "0";
        if (celdaPorcentaje) celdaPorcentaje.z = "0.00";
      }

      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Evaluaciones");

      const fechaArchivo = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(
        libro,
        `Evaluaciones_Conocimientos_${fechaArchivo}.xlsx`,
        {
          compression: true,
          cellDates: true,
        }
      );

      setMensaje({
        tipo: "exito",
        texto: `Se exportaron ${evaluaciones.length} evaluaciones a Excel.`,
      });
    } catch (error) {
      console.error("Error al exportar las evaluaciones:", error);
      setMensaje({
        tipo: "error",
        texto: `No se pudo exportar el archivo. ${
          error?.message || "Intentá nuevamente."
        }`,
      });
    } finally {
      setExportandoExcel(false);
    }
  }

  function actualizarDatoGeneral(event) {
    const { name, value } = event.target;

    setDatosGenerales((anterior) => ({
      ...anterior,
      [name]: value,
    }));

    setMensaje(null);
  }

  function actualizarPuntaje(numero, valor, maximo) {
    if (valor === "") {
      setRespuestas((anterior) => ({
        ...anterior,
        [numero]: {
          ...anterior[numero],
          puntaje: "",
        },
      }));
      return;
    }

    const numeroConvertido = Number(valor);
    const valorSeguro = Math.min(
      maximo,
      Math.max(0, numeroConvertido)
    );

    setRespuestas((anterior) => ({
      ...anterior,
      [numero]: {
        ...anterior[numero],
        puntaje: valorSeguro,
      },
    }));

    setMensaje(null);
  }

  function actualizarSeleccion(numero, valor) {
    setRespuestas((anterior) => ({
      ...anterior,
      [numero]: {
        ...anterior[numero],
        seleccion: valor,
      },
    }));

    setMensaje(null);
  }

  function actualizarTexto(numero, campo, valor) {
    setRespuestas((anterior) => ({
      ...anterior,
      [numero]: {
        ...anterior[numero],
        [campo]: valor,
      },
    }));
  }

  function iniciarEvaluacion(event) {
    event.preventDefault();

    if (!datosGenerales.colaborador) {
      setMensaje({
        tipo: "error",
        texto:
          "Seleccioná al colaborador antes de iniciar la evaluación.",
      });
      return;
    }

    if (!usuario?.nombre) {
      setMensaje({
        tipo: "error",
        texto:
          "No se pudo identificar al auditor. Cerrá sesión e ingresá nuevamente.",
      });
      return;
    }

    setEvaluacionIniciada(true);
    setMensaje(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function reiniciarFormulario() {
    const confirmar =
      !evaluacionIniciada ||
      window.confirm(
        "¿Deseás limpiar la evaluación actual? Los datos no guardados se perderán."
      );

    if (!confirmar) return;

    setDatosGenerales({
      colaborador: "",
      observaciones: "",
    });
    setRespuestas(crearRespuestasVacias());
    setEvaluacionIniciada(false);
    setMensaje(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function validarEvaluacion() {
    if (!datosGenerales.colaborador) {
      return "Seleccioná al colaborador evaluado.";
    }

    if (!usuario?.nombre) {
      return "No se pudo identificar al auditor.";
    }

    const pendientes = PREGUNTAS.filter((pregunta) => {
      const respuesta = respuestas[pregunta.numero];

      if (pregunta.tipo === "puntaje") {
        return respuesta?.puntaje === "";
      }

      return !respuesta?.seleccion;
    });

    if (pendientes.length > 0) {
      return `Falta responder ${
        pendientes.length === 1
          ? "una pregunta"
          : `${pendientes.length} preguntas`
      }.`;
    }

    return null;
  }

  async function guardarEvaluacion() {
    const errorValidacion = validarEvaluacion();

    if (errorValidacion) {
      setMensaje({
        tipo: "error",
        texto: errorValidacion,
      });
      return;
    }

    setGuardando(true);
    setMensaje(null);

    const fechaIso = new Date().toISOString();

    const { data: evaluacionGuardada, error: errorEvaluacion } =
      await supabase
        .from("evaluaciones_conocimiento")
        .insert({
          colaborador: datosGenerales.colaborador,
          auditor: usuario.nombre,
          fecha: fechaIso,
          observaciones:
            datosGenerales.observaciones.trim() || null,
          puntaje_obtenido: puntajeObtenido,
          puntaje_maximo: PUNTAJE_MAXIMO,
          porcentaje,
          aprobado,
        })
        .select("id")
        .single();

    if (errorEvaluacion) {
      console.error(
        "Error al guardar la evaluación:",
        errorEvaluacion
      );

      setMensaje({
        tipo: "error",
        texto: `No se pudo guardar la evaluación. ${errorEvaluacion.message}`,
      });
      setGuardando(false);
      return;
    }

    const detalle = PREGUNTAS.map((pregunta) => {
      const respuesta = respuestas[pregunta.numero];

      const puntaje =
        pregunta.tipo === "puntaje"
          ? Number(respuesta.puntaje)
          : respuesta.seleccion === "sabe"
            ? 1
            : 0;

      return {
        evaluacion_id: evaluacionGuardada.id,
        numero_pregunta: pregunta.numero,
        pregunta: pregunta.pregunta,
        tipo_respuesta: pregunta.tipo,
        puntaje_obtenido: puntaje,
        puntaje_maximo: pregunta.maximo,
        respuesta:
          pregunta.tipo === "sabe_no_sabe"
            ? respuesta.seleccion === "sabe"
              ? "Sabe"
              : "No sabe"
            : respuesta.respuesta.trim() || null,
        observaciones:
          respuesta.observaciones.trim() || null,
      };
    });

    const { error: errorDetalle } = await supabase
      .from("detalle_evaluacion_conocimiento")
      .insert(detalle);

    if (errorDetalle) {
      console.error(
        "La evaluación se guardó, pero falló el detalle:",
        errorDetalle
      );

      setMensaje({
        tipo: "error",
        texto:
          "La evaluación general quedó guardada, pero no se pudo guardar el detalle de las preguntas. " +
          errorDetalle.message,
      });
      setGuardando(false);
      await cargarHistorial();
      return;
    }

    setMensaje({
      tipo: "exito",
      texto: `Evaluación guardada correctamente: ${puntajeObtenido}/${PUNTAJE_MAXIMO} (${porcentaje} %) — ${
        aprobado ? "APROBADO" : "NO APROBADO"
      }.`,
    });

    setDatosGenerales({
      colaborador: "",
      observaciones: "",
    });
    setRespuestas(crearRespuestasVacias());
    setEvaluacionIniciada(false);
    setGuardando(false);

    await cargarHistorial();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Seguridad</span>

          <h2>Evaluación de Conocimientos</h2>

          <p>
            Evaluá los conocimientos fundamentales de seguridad de
            los colaboradores y registrá automáticamente el resultado.
          </p>
        </div>
      </header>

      {mensaje && (
        <div
          style={{
            marginBottom: "22px",
            padding: "14px 16px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            background:
              mensaje.tipo === "exito" ? "#ecfdf3" : "#fff1f2",
            color:
              mensaje.tipo === "exito" ? "#027a48" : "#be123c",
            border:
              mensaje.tipo === "exito"
                ? "1px solid #abefc6"
                : "1px solid #fecdd3",
            fontWeight: 700,
            fontSize: "13px",
          }}
        >
          {mensaje.tipo === "exito" ? (
            <CheckCircle2 size={19} />
          ) : (
            <XCircle size={19} />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {!evaluacionIniciada && (
        <section>
          <form
            className="gemba-form-card"
            onSubmit={iniciarEvaluacion}
          >
            <div className="form-card-header">
              <div>
                <span className="step-label">
                  Datos generales
                </span>
                <h3>Nueva evaluación</h3>
                <p>
                  Seleccioná al colaborador antes de iniciar las
                  preguntas.
                </p>
              </div>

            </div>

            <div className="form-grid">
              <label className="form-field form-field-full">
                <span>
                  <User size={17} />
                  Colaborador
                </span>

                <select
                  name="colaborador"
                  value={datosGenerales.colaborador}
                  onChange={actualizarDatoGeneral}
                >
                  <option value="">
                    Seleccionar colaborador
                  </option>

                  {colaboradoresOrdenados.map((colaborador) => (
                    <option
                      value={colaborador}
                      key={colaborador}
                    >
                      {colaborador}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field form-field-full">
                <span>
                  <User size={17} />
                  Auditor
                </span>

                <input
                  type="text"
                  value={usuario?.nombre || ""}
                  readOnly
                  disabled
                />
              </label>

              <label className="form-field form-field-full">
                <span>
                  <CalendarDays size={17} />
                  Fecha
                </span>

                <input
                  type="text"
                  value={fechaVisible}
                  readOnly
                  disabled
                />
              </label>

              <label className="form-field form-field-full">
                <span>
                  <ClipboardCheck size={17} />
                  Observaciones generales
                </span>

                <textarea
                  name="observaciones"
                  value={datosGenerales.observaciones}
                  onChange={actualizarDatoGeneral}
                  rows={4}
                  placeholder="Observaciones opcionales sobre la evaluación..."
                  style={{ resize: "vertical" }}
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={reiniciarFormulario}
              >
                <RotateCcw size={18} />
                Limpiar
              </button>

              <button
                type="submit"
                className="primary-button"
              >
                <Play size={18} />
                Iniciar evaluación
              </button>
            </div>
          </form>


        </section>
      )}

      {evaluacionIniciada && (
        <>
          <section className="gemba-context-card">
            <div className="context-item">
              <span>Colaborador</span>
              <strong>{datosGenerales.colaborador}</strong>
            </div>

            <div className="context-item">
              <span>Auditor</span>
              <strong>{usuario?.nombre}</strong>
            </div>

            <div className="context-item">
              <span>Avance</span>
              <strong>
                {preguntasRespondidas} de {PREGUNTAS.length}
              </strong>
            </div>
          </section>

          <section
            className="section-block"
            style={{ marginTop: "22px" }}
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  Evaluación en curso
                </span>
                <h3>Preguntas de seguridad</h3>
              </div>

              <p>
                Puntaje máximo: {PUNTAJE_MAXIMO}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gap: "18px",
              }}
            >
              {PREGUNTAS.map((pregunta) => {
                const respuesta =
                  respuestas[pregunta.numero];

                return (
                  <article
                    key={pregunta.numero}
                    style={{
                      padding: "22px",
                      border: "1px solid #e4e7ec",
                      borderRadius: "14px",
                      background: "#ffffff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "18px",
                        alignItems: "flex-start",
                        marginBottom: "18px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "10px",
                            background: "#eff4ff",
                            color: "#155eef",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {pregunta.numero}
                        </div>

                        <div>
                          <h4
                            style={{
                              margin: "2px 0 5px",
                              fontSize: "16px",
                              lineHeight: 1.45,
                            }}
                          >
                            {pregunta.pregunta}
                          </h4>

                          <span
                            style={{
                              color: "#667085",
                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                          >
                            Máximo: {pregunta.maximo}{" "}
                            {pregunta.maximo === 1
                              ? "punto"
                              : "puntos"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {pregunta.tipo === "puntaje" ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(160px, 220px) 1fr",
                          gap: "16px",
                          alignItems: "end",
                        }}
                      >
                        <label className="form-field">
                          <span>Puntaje obtenido</span>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <input
                              type="number"
                              min="0"
                              max={pregunta.maximo}
                              step="1"
                              value={respuesta.puntaje}
                              onChange={(event) =>
                                actualizarPuntaje(
                                  pregunta.numero,
                                  event.target.value,
                                  pregunta.maximo
                                )
                              }
                              style={{ width: "100%" }}
                            />

                            <strong
                              style={{
                                whiteSpace: "nowrap",
                                color: "#344054",
                              }}
                            >
                              / {pregunta.maximo}
                            </strong>
                          </div>
                        </label>

                        <label className="form-field">
                          <span>
                            Respuesta brindada (opcional)
                          </span>

                          <input
                            type="text"
                            value={respuesta.respuesta}
                            onChange={(event) =>
                              actualizarTexto(
                                pregunta.numero,
                                "respuesta",
                                event.target.value
                              )
                            }
                            placeholder="Resumen de lo indicado por el colaborador..."
                          />
                        </label>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "12px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            actualizarSeleccion(
                              pregunta.numero,
                              "sabe"
                            )
                          }
                          style={{
                            padding: "12px 18px",
                            borderRadius: "10px",
                            border:
                              respuesta.seleccion === "sabe"
                                ? "2px solid #12b76a"
                                : "1px solid #d0d5dd",
                            background:
                              respuesta.seleccion === "sabe"
                                ? "#ecfdf3"
                                : "#ffffff",
                            color:
                              respuesta.seleccion === "sabe"
                                ? "#027a48"
                                : "#344054",
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <CheckCircle2 size={18} />
                          Sabe
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            actualizarSeleccion(
                              pregunta.numero,
                              "no_sabe"
                            )
                          }
                          style={{
                            padding: "12px 18px",
                            borderRadius: "10px",
                            border:
                              respuesta.seleccion === "no_sabe"
                                ? "2px solid #f04438"
                                : "1px solid #d0d5dd",
                            background:
                              respuesta.seleccion === "no_sabe"
                                ? "#fff1f2"
                                : "#ffffff",
                            color:
                              respuesta.seleccion === "no_sabe"
                                ? "#b42318"
                                : "#344054",
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <XCircle size={18} />
                          No sabe
                        </button>
                      </div>
                    )}

                    <label
                      className="form-field"
                      style={{ marginTop: "16px" }}
                    >
                      <span>
                        Observaciones de la pregunta (opcional)
                      </span>

                      <textarea
                        rows={2}
                        value={respuesta.observaciones}
                        onChange={(event) =>
                          actualizarTexto(
                            pregunta.numero,
                            "observaciones",
                            event.target.value
                          )
                        }
                        placeholder="Anotá aclaraciones, dudas o comentarios relevantes..."
                        style={{ resize: "vertical" }}
                      />
                    </label>
                  </article>
                );
              })}
            </div>
          </section>

          <section
            style={{
              marginTop: "22px",
              padding: "24px",
              borderRadius: "16px",
              background: "#ffffff",
              border: "1px solid #e4e7ec",
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              alignItems: "stretch",
            }}
          >
            <div className="context-item">
              <span>Puntaje obtenido</span>
              <strong
                style={{
                  fontSize: "26px",
                  color: "#101828",
                }}
              >
                {puntajeObtenido} / {PUNTAJE_MAXIMO}
              </strong>
            </div>

            <div className="context-item">
              <span>Porcentaje</span>
              <strong
                style={{
                  fontSize: "26px",
                  color: "#101828",
                }}
              >
                {porcentaje.toFixed(2)} %
              </strong>
            </div>

            <div className="context-item">
              <span>Resultado</span>
              <strong
                style={{
                  fontSize: "20px",
                  color: aprobado ? "#027a48" : "#b42318",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {aprobado ? (
                  <CheckCircle2 size={22} />
                ) : (
                  <XCircle size={22} />
                )}
                {aprobado ? "APROBADO" : "NO APROBADO"}
              </strong>
            </div>

            <div className="context-item">
              <span>Preguntas respondidas</span>
              <strong
                style={{
                  fontSize: "26px",
                  color: "#101828",
                }}
              >
                {preguntasRespondidas} / {PREGUNTAS.length}
              </strong>
            </div>
          </section>

          <div
            className="form-actions"
            style={{ marginTop: "22px" }}
          >
            <button
              type="button"
              className="secondary-button"
              onClick={reiniciarFormulario}
              disabled={guardando}
            >
              <RotateCcw size={18} />
              Cancelar evaluación
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={guardarEvaluacion}
              disabled={
                guardando ||
                preguntasRespondidas !== PREGUNTAS.length
              }
            >
              {guardando ? (
                <Loader2
                  size={18}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Save size={18} />
              )}

              {guardando
                ? "Guardando..."
                : "Guardar evaluación"}
            </button>
          </div>
        </>
      )}

      <section
        className="section-block"
        style={{ marginTop: "30px" }}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <History size={14} />
              Historial
            </span>

            <h3>Evaluaciones recientes</h3>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="secondary-button"
              onClick={exportarAExcel}
              disabled={exportandoExcel || cargandoHistorial}
            >
              {exportandoExcel ? (
                <Loader2
                  size={17}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <FileSpreadsheet size={17} />
              )}
              {exportandoExcel ? "Exportando..." : "Exportar a Excel"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={cargarHistorial}
              disabled={cargandoHistorial || exportandoExcel}
            >
              {cargandoHistorial ? (
                <Loader2 size={17} />
              ) : (
                <RotateCcw size={17} />
              )}
              Actualizar
            </button>
          </div>
        </div>

        {cargandoHistorial ? (
          <div
            style={{
              padding: "34px",
              textAlign: "center",
              color: "#667085",
            }}
          >
            Cargando evaluaciones...
          </div>
        ) : historial.length === 0 ? (
          <div
            style={{
              padding: "34px",
              textAlign: "center",
              color: "#667085",
              border: "1px dashed #d0d5dd",
              borderRadius: "12px",
            }}
          >
            Todavía no hay evaluaciones registradas.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "850px",
                background: "#ffffff",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Fecha",
                    "Colaborador",
                    "Auditor",
                    "Puntaje",
                    "Porcentaje",
                    "Resultado",
                  ].map((encabezado) => (
                    <th
                      key={encabezado}
                      style={{
                        padding: "13px 14px",
                        textAlign: "left",
                        fontSize: "12px",
                        color: "#475467",
                        background: "#f9fafb",
                        borderBottom: "1px solid #eaecf0",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {encabezado}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {historial.map((evaluacion) => (
                  <tr key={evaluacion.id}>
                    <td
                      style={{
                        padding: "14px",
                        borderBottom: "1px solid #eaecf0",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {new Intl.DateTimeFormat("es-GT", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(evaluacion.fecha))}
                    </td>

                    <td
                      style={{
                        padding: "14px",
                        borderBottom: "1px solid #eaecf0",
                        fontWeight: 700,
                      }}
                    >
                      {evaluacion.colaborador}
                    </td>

                    <td
                      style={{
                        padding: "14px",
                        borderBottom: "1px solid #eaecf0",
                      }}
                    >
                      {evaluacion.auditor}
                    </td>

                    <td
                      style={{
                        padding: "14px",
                        borderBottom: "1px solid #eaecf0",
                        fontWeight: 700,
                      }}
                    >
                      {evaluacion.puntaje_obtenido} /{" "}
                      {evaluacion.puntaje_maximo}
                    </td>

                    <td
                      style={{
                        padding: "14px",
                        borderBottom: "1px solid #eaecf0",
                        fontWeight: 700,
                      }}
                    >
                      {Number(evaluacion.porcentaje).toFixed(2)} %
                    </td>

                    <td
                      style={{
                        padding: "14px",
                        borderBottom: "1px solid #eaecf0",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 10px",
                          borderRadius: "999px",
                          background: evaluacion.aprobado
                            ? "#ecfdf3"
                            : "#fff1f2",
                          color: evaluacion.aprobado
                            ? "#027a48"
                            : "#b42318",
                          fontSize: "12px",
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {evaluacion.aprobado ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <XCircle size={14} />
                        )}

                        {evaluacion.aprobado
                          ? "Aprobado"
                          : "No aprobado"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
