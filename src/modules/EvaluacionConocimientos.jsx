import React from "react";
import { ShieldCheck, KeyRound, ClipboardList, Sparkles, ArrowRight, LockKeyhole } from "lucide-react";

const modulos = [
  { id: "seguridad", nombre: "Seguridad Industrial", descripcion: "Evaluación actual de conocimientos en seguridad.", icono: ShieldCheck, disponible: true },
  { id: "bloqueos", nombre: "Conocimiento de Bloqueos", descripcion: "Conocimientos sobre bloqueo y control de energías peligrosas.", icono: KeyRound, disponible: false },
  { id: "estandares", nombre: "Estándares", descripcion: "Evaluaciones de estándares y procedimientos de trabajo.", icono: ClipboardList, disponible: false },
  { id: "5s", nombre: "5S", descripcion: "Conocimientos de orden, limpieza y disciplina.", icono: Sparkles, disponible: false },
];

export default function EvaluacionConocimientos({ onSeleccionarModulo }) {
  return (
    <div style={{ width: "100%", paddingBottom: 24 }}>
      <header style={{ background: "linear-gradient(120deg,#0f172a,#1d4ed8)", color: "white", padding: 28, borderRadius: 18, marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 8px" }}>Auditoría de Conocimientos</h2>
        <p style={{ margin: 0, opacity: 0.9 }}>Selecciona la evaluación que deseas realizar.</p>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 18 }}>
        {modulos.map((modulo) => {
          const Icono = modulo.icono;
          return (
            <button
              key={modulo.id}
              type="button"
              disabled={!modulo.disponible}
              onClick={() => onSeleccionarModulo?.(modulo.id)}
              style={{
                textAlign: "left", borderRadius: 16, border: "1px solid #e2e8f0",
                padding: 22, background: "white", color: "#0f172a",
                cursor: modulo.disponible ? "pointer" : "not-allowed",
                opacity: modulo.disponible ? 1 : 0.72, minHeight: 175,
              }}
            >
              <Icono size={30} color="#2563eb" />
              <h3 style={{ margin: "14px 0 8px", fontSize: 18 }}>{modulo.nombre}</h3>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.5 }}>{modulo.descripcion}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: modulo.disponible ? "#2563eb" : "#64748b", fontWeight: 600, fontSize: 13 }}>
                {modulo.disponible ? <ArrowRight size={16} /> : <LockKeyhole size={16} />}
                {modulo.disponible ? "Iniciar evaluación" : "Próximamente"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
