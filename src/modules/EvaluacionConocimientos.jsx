import React from "react";
import {
  ShieldCheck,
  ClipboardList,
  Sparkles,
  ArrowRight,
  LockKeyhole,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";

const MODULOS = [
  {
    id: "seguridad",
    titulo: "Seguridad Industrial",
    descripcion:
      "Evaluá conocimientos sobre normas, riesgos, EPP y procedimientos críticos de seguridad.",
    icono: ShieldCheck,
    estado: "disponible",
    etiqueta: "Disponible",
    detalle: "9 preguntas · Resultado automático",
  },
  {
    id: "estandares",
    titulo: "Estándares",
    descripcion:
      "Evaluaciones sobre métodos de trabajo, parámetros de operación y cumplimiento de procesos.",
    icono: ClipboardList,
    estado: "proximamente",
    etiqueta: "Próximamente",
    detalle: "En preparación",
  },
  {
    id: "5s",
    titulo: "5S",
    descripcion:
      "Evaluaciones sobre clasificación, orden, limpieza, estandarización y disciplina.",
    icono: Sparkles,
    estado: "proximamente",
    etiqueta: "Próximamente",
    detalle: "En preparación",
  },
];

export default function EvaluacionConocimientos({
  onSeleccionarModulo,
}) {
  function seleccionarModulo(modulo) {
    if (modulo.estado !== "disponible") return;
    onSeleccionarModulo?.(modulo.id);
  }

  return (
    <div style={{ width: "100%" }}>
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          marginBottom: "28px",
          padding: "32px",
          borderRadius: "22px",
          background:
            "linear-gradient(135deg, #0f172a 0%, #172554 52%, #1d4ed8 100%)",
          color: "#ffffff",
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.16)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-90px",
            right: "-60px",
            width: "260px",
            height: "260px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.08)",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: "130px",
            bottom: "-120px",
            width: "220px",
            height: "220px",
            borderRadius: "999px",
            background: "rgba(96,165,250,0.16)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: "720px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "14px",
                padding: "7px 11px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.16)",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <GraduationCap size={16} />
              Gestión del conocimiento
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(30px, 4vw, 46px)",
                lineHeight: 1.08,
                letterSpacing: "-0.035em",
              }}
            >
              Evaluación de Conocimientos
            </h1>

            <p
              style={{
                maxWidth: "650px",
                margin: "14px 0 0",
                color: "rgba(255,255,255,0.78)",
                fontSize: "16px",
                lineHeight: 1.7,
              }}
            >
              Seleccioná el área que deseás evaluar y registrá resultados
              de forma ordenada, trazable y estandarizada.
            </p>
          </div>

          <div
            style={{
              minWidth: "210px",
              padding: "18px 20px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.16)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px",
                color: "#bfdbfe",
                fontSize: "12px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <CheckCircle2 size={16} />
              Módulo activo
            </div>

            <strong style={{ display: "block", fontSize: "18px" }}>
              Seguridad Industrial
            </strong>

            <span
              style={{
                display: "block",
                marginTop: "4px",
                color: "rgba(255,255,255,0.70)",
                fontSize: "13px",
              }}
            >
              Disponible para evaluación
            </span>
          </div>
        </div>
      </section>

      <section>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "18px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                marginBottom: "5px",
                color: "#2563eb",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Áreas de evaluación
            </span>

            <h2
              style={{
                margin: 0,
                color: "#101828",
                fontSize: "24px",
                letterSpacing: "-0.02em",
              }}
            >
              Seleccioná un módulo
            </h2>
          </div>

          <p
            style={{
              margin: 0,
              color: "#667085",
              fontSize: "13px",
            }}
          >
            Los módulos deshabilitados estarán disponibles próximamente.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: "18px",
          }}
        >
          {MODULOS.map((modulo) => {
            const Icono = modulo.icono;
            const disponible = modulo.estado === "disponible";

            return (
              <button
                key={modulo.id}
                type="button"
                onClick={() => seleccionarModulo(modulo)}
                disabled={!disponible}
                aria-disabled={!disponible}
                style={{
                  position: "relative",
                  minHeight: "290px",
                  padding: "24px",
                  borderRadius: "20px",
                  border: disponible
                    ? "1px solid #dbeafe"
                    : "1px solid #e4e7ec",
                  background: disponible
                    ? "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)"
                    : "#f8fafc",
                  boxShadow: disponible
                    ? "0 14px 35px rgba(37, 99, 235, 0.10)"
                    : "none",
                  textAlign: "left",
                  cursor: disponible ? "pointer" : "not-allowed",
                  transition:
                    "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                  opacity: disponible ? 1 : 0.72,
                  overflow: "hidden",
                }}
                onMouseEnter={(event) => {
                  if (!disponible) return;
                  event.currentTarget.style.transform = "translateY(-4px)";
                  event.currentTarget.style.boxShadow =
                    "0 20px 45px rgba(37, 99, 235, 0.16)";
                  event.currentTarget.style.borderColor = "#93c5fd";
                }}
                onMouseLeave={(event) => {
                  if (!disponible) return;
                  event.currentTarget.style.transform = "translateY(0)";
                  event.currentTarget.style.boxShadow =
                    "0 14px 35px rgba(37, 99, 235, 0.10)";
                  event.currentTarget.style.borderColor = "#dbeafe";
                }}
              >
                {disponible && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: "120px",
                      height: "120px",
                      borderRadius: "0 0 0 120px",
                      background:
                        "linear-gradient(135deg, rgba(219,234,254,0.65), rgba(239,246,255,0))",
                    }}
                  />
                )}

                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "16px",
                    marginBottom: "30px",
                  }}
                >
                  <div
                    style={{
                      width: "54px",
                      height: "54px",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "16px",
                      background: disponible ? "#eff6ff" : "#eef2f6",
                      color: disponible ? "#2563eb" : "#98a2b3",
                    }}
                  >
                    <Icono size={28} strokeWidth={2} />
                  </div>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 10px",
                      borderRadius: "999px",
                      background: disponible ? "#ecfdf3" : "#f2f4f7",
                      color: disponible ? "#027a48" : "#667085",
                      fontSize: "11px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {disponible ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <LockKeyhole size={14} />
                    )}
                    {modulo.etiqueta}
                  </span>
                </div>

                <div style={{ position: "relative", zIndex: 1 }}>
                  <h3
                    style={{
                      margin: "0 0 10px",
                      color: disponible ? "#101828" : "#475467",
                      fontSize: "21px",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {modulo.titulo}
                  </h3>

                  <p
                    style={{
                      minHeight: "68px",
                      margin: 0,
                      color: "#667085",
                      fontSize: "14px",
                      lineHeight: 1.65,
                    }}
                  >
                    {modulo.descripcion}
                  </p>
                </div>

                <div
                  style={{
                    position: "absolute",
                    left: "24px",
                    right: "24px",
                    bottom: "22px",
                    zIndex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    paddingTop: "16px",
                    borderTop: "1px solid #eaecf0",
                  }}
                >
                  <span
                    style={{
                      color: "#667085",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {modulo.detalle}
                  </span>

                  <span
                    style={{
                      width: "36px",
                      height: "36px",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "10px",
                      background: disponible ? "#2563eb" : "#e4e7ec",
                      color: disponible ? "#ffffff" : "#98a2b3",
                    }}
                  >
                    {disponible ? (
                      <ArrowRight size={18} />
                    ) : (
                      <LockKeyhole size={16} />
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
