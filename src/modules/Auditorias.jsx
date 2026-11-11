import React, { useState } from "react";
import {
  ClipboardCheck,
  ShieldCheck,
  FileCheck2,
  Truck,
  ArrowLeft
} from "lucide-react";

import AuditoriaCEP from "./Auditorias/AuditoriaCEP.jsx";
import AuditoriaAPRyPT from "./Auditorias/AuditoriaAPRyPT.jsx";

const opciones = [
  {
    id: "cep",
    titulo: "Control de Energías Peligrosas (CEP)",
    detalle: "20 criterios: Personas, Condiciones y Procedimientos",
    icono: ShieldCheck
  },
  {
    id: "apr",
    titulo: "Auditoría APR y PT",
    detalle: "Análisis Previo de Riesgos y Permisos de Trabajo",
    icono: FileCheck2
  },
  {
    id: "preuso",
    titulo: "Auditoría de Pre-usos",
    detalle: "Verificación de pre-usos de equipos",
    icono: Truck
  }
];

export default function Auditorias({ currentUser }) {
  const [seccion, setSeccion] = useState(null);

  if (seccion === "cep") {
    return (
      <AuditoriaCEP
        currentUser={currentUser}
        onBack={() => setSeccion(null)}
      />
    );
  }

  if (seccion === "apr") {
    return (
      <AuditoriaAPRyPT
        currentUser={currentUser}
        onBack={() => setSeccion(null)}
      />
    );
  }

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        paddingBottom: 40
      }}
    >
      {seccion && (
        <button
          type="button"
          onClick={() => setSeccion(null)}
          style={{
            border: 0,
            background: "transparent",
            color: "#2563eb",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginBottom: 15
          }}
        >
          <ArrowLeft size={18} />
          Volver a Auditorías
        </button>
      )}

      <header
        style={{
          background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
          color: "white",
          padding: 26,
          borderRadius: 16,
          marginBottom: 23
        }}
      >
        <ClipboardCheck size={30} />

        <h1 style={{ margin: "9px 0" }}>
          Auditorías
        </h1>

        <p style={{ margin: 0, opacity: 0.85 }}>
          Planta Transmetal · Verificaciones de seguridad
        </p>
      </header>

      {!seccion ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16
          }}
        >
          {opciones.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setSeccion(o.id)}
              style={{
                background: "white",
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                padding: 22,
                minHeight: 170,
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                cursor: "pointer"
              }}
            >
              <o.icono size={30} color="#2563eb" />

              <strong style={{ fontSize: 17 }}>
                {o.titulo}
              </strong>

              <span
                style={{
                  color: "#64748b",
                  fontSize: 14
                }}
              >
                {o.detalle}
              </span>

              {o.id === "preuso" && (
                <small>Próximamente</small>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div
          style={{
            background: "white",
            padding: 24,
            borderRadius: 12
          }}
        >
          Este formulario estará disponible cuando
          definamos su cuestionario.
        </div>
      )}
    </div>
  );
}
