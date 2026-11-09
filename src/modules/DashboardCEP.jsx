
import React, { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { supabase } from "../lib/supabase.js";

const tarjeta = {
  background: "#ffffff",
  padding: 18,
  borderRadius: 12,
  border: "1px solid #e2e8f0"
};

const formato = (valor) =>
  valor == null || !Number.isFinite(Number(valor))
    ? "—"
    : `${Number(valor).toFixed(1)}%`;

const promedio = (datos, campo) => {
  const valores = datos
    .map((r) => r[campo])
    .filter((v) => v !== null && v !== undefined)
    .map(Number)
    .filter(Number.isFinite);

  return valores.length
    ? valores.reduce((a, b) => a + b, 0) / valores.length
    : null;
};

const obtenerRespuestas = (auditoria) =>
  Array.isArray(auditoria.respuestas)
    ? auditoria.respuestas
    : [];

const contarNC = (auditoria) =>
  obtenerRespuestas(auditoria).filter(
    (r) => String(r.respuesta || "").toUpperCase() === "NO"
  ).length;

const categorias = [
  { nombre: "Personas", campo: "cumplimiento_personas" },
  { nombre: "Condiciones", campo: "cumplimiento_condiciones" },
  { nombre: "Procedimientos", campo: "cumplimiento_procedimientos" }
];

export default function DashboardCEP({ fechaInicio, fechaFin }) {
  const [auditorias, setAuditorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [detalle, setDetalle] = useState(null);

  async function cargarAuditorias() {
    setCargando(true);
    setError("");

    try {
      const { data, error: dbError } = await supabase
        .from("auditorias_cep")
        .select("*")
        .order("fecha_auditoria", { ascending: false })
        .limit(1000);

      if (dbError) throw dbError;

      setAuditorias(data || []);
    } catch (err) {
      setError(err.message || "Error al consultar auditorías");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarAuditorias();
  }, []);

  const filtradas = useMemo(() => {
    return auditorias.filter((a) => {
      const fecha = a.fecha_auditoria;
      return (
        (!fechaInicio || fecha >= fechaInicio) &&
        (!fechaFin || fecha <= fechaFin)
      );
    });
  }, [auditorias, fechaInicio, fechaFin]);

  const totalNC = filtradas.reduce(
    (total, a) => total + contarNC(a),
    0
  );

  const cumplimientoGlobal = promedio(
    filtradas,
    "cumplimiento_global"
  );

  const indicadores = [
    {
      titulo: "Auditorías realizadas",
      valor: filtradas.length,
      icono: ClipboardCheck,
      color: "#2563eb"
    },
    {
      titulo: "Cumplimiento promedio",
      valor: formato(cumplimientoGlobal),
      icono: BarChart3,
      color: "#059669"
    },
    {
      titulo: "No conformidades",
      valor: totalNC,
      icono: AlertTriangle,
      color: "#dc2626"
    }
  ];

  return (
    <section style={{ marginTop: 26, paddingBottom: 30 }}>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 20
      }}>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>
            Auditorías CEP
          </h2>
          <p style={{ color: "#64748b", marginTop: 5 }}>
            Control de Energías Peligrosas · Planta Transmetal
          </p>
        </div>

        <button
          type="button"
          onClick={cargarAuditorias}
          disabled={cargando}
          style={{
            padding: "10px 16px",
            borderRadius: 9,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1d4ed8",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <RefreshCw size={17} />
          {cargando ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {error && (
        <p role="alert" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
        gap: 15,
        marginBottom: 20
      }}>
        {indicadores.map((item) => (
          <div key={item.titulo} style={tarjeta}>
            <item.icono size={25} color={item.color} />

            <div style={{
              fontSize: 28,
              fontWeight: 800,
              marginTop: 12,
              color: item.color
            }}>
              {item.valor}
            </div>

            <div style={{ color: "#64748b", fontSize: 14 }}>
              {item.titulo}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...tarjeta, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>
          Cumplimiento por categoría
        </h3>

        {categorias.map((categoria) => {
          const valor = promedio(filtradas, categoria.campo);

          return (
            <div key={categoria.campo} style={{ marginBottom: 18 }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 7
              }}>
                <strong>{categoria.nombre}</strong>
                <strong>{formato(valor)}</strong>
              </div>

              <div style={{
                height: 12,
                background: "#e2e8f0",
                borderRadius: 8,
                overflow: "hidden"
              }}>
                <div style={{
                  height: "100%",
                  width: `${Math.max(0, Math.min(100, valor || 0))}%`,
                  background: "#2563eb",
                  borderRadius: 8
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ ...tarjeta, overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>
          Historial de auditorías CEP
        </h3>

        <table style={{
          width: "100%",
          minWidth: 650,
          borderCollapse: "collapse",
          fontSize: 14
        }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              {[
                "Fecha",
                "Auditor",
                "Máquina",
                "Cumplimiento",
                "NC",
                "Detalle"
              ].map((col) => (
                <th key={col} style={{
                  padding: 11,
                  textAlign: "left",
                  borderBottom: "1px solid #cbd5e1"
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtradas.map((a) => (
              <React.Fragment key={a.id}>
                <tr>
                  <td style={{ padding: 10 }}>{a.fecha_auditoria}</td>
                  <td style={{ padding: 10 }}>{a.auditor}</td>
                  <td style={{ padding: 10 }}>{a.maquina}</td>

                  <td style={{ padding: 10 }}>
                    <strong>{formato(a.cumplimiento_global)}</strong>
                  </td>

                  <td style={{ padding: 10, color: "#dc2626" }}>
                    {contarNC(a)}
                  </td>

                  <td style={{ padding: 10 }}>
                    <button
                      type="button"
                      onClick={() =>
                        setDetalle(detalle === a.id ? null : a.id)
                      }
                      style={{
                        border: 0,
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        borderRadius: 7,
                        padding: 8,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5
                      }}
                    >
                      {detalle === a.id
                        ? <ChevronUp size={16} />
                        : <ChevronDown size={16} />}
                      Ver
                    </button>
                  </td>
                </tr>

                {detalle === a.id && (
                  <tr>
                    <td colSpan={6} style={{
                      padding: 20,
                      background: "#f8fafc"
                    }}>
                      <p><strong>Auditor:</strong> {a.auditor}</p>
                      <p>
                        <strong>Colaboradores:</strong>{" "}
                        {Array.isArray(a.colaboradores)
                          ? a.colaboradores.join(", ")
                          : "—"}
                      </p>
                      <p><strong>Tarea:</strong> {a.tarea}</p>
                      <p>
                        <strong>Observaciones generales:</strong>{" "}
                        {a.observaciones || "Sin observaciones"}
                      </p>

                      <h4>Resultados de la auditoría</h4>

                      {obtenerRespuestas(a).map((r, index) => (
                        <div
                          key={r.id || index}
                          style={{
                            padding: "12px 0",
                            borderBottom: "1px solid #e2e8f0"
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>
                            {r.id}. {r.pregunta}
                          </div>

                          <div style={{
                            color: r.respuesta === "NO"
                              ? "#dc2626"
                              : r.respuesta === "SI"
                                ? "#059669"
                                : "#64748b",
                            marginTop: 5,
                            fontWeight: 700
                          }}>
                            {r.respuesta === "SI"
                              ? "Sí"
                              : r.respuesta === "NO"
                                ? "No"
                                : "No aplica"}
                          </div>

                          {r.observacion && (
                            <p style={{ marginBottom: 0 }}>
                              <strong>Observación:</strong>{" "}
                              {r.observacion}
                            </p>
                          )}
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}

            {!filtradas.length && (
              <tr>
                <td colSpan={6} style={{
                  padding: 25,
                  textAlign: "center",
                  color: "#64748b"
                }}>
                  {cargando
                    ? "Cargando auditorías..."
                    : "No hay auditorías CEP en el período seleccionado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{
        fontSize: 12,
        color: "#64748b",
        marginTop: 12
      }}>
        Los indicadores utilizan las auditorías del período
        seleccionado en el Dashboard. Se consultan hasta
        1,000 registros por carga.
      </p>
    </section>
  );
}
