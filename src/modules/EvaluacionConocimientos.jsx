import React from "react";
import {
  ShieldCheck,
  ClipboardList,
  Sparkles,
  ArrowRight,
  LockKeyhole,
  GraduationCap,
  CheckCircle2,
  KeyRound,
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
    id: "bloqueos",
    titulo: "Conocimiento de Bloqueos",
    descripcion:
      "Evalúa lo que el colaborador conoce sobre el procedimiento de bloqueo y control de energías peligrosas.",
    icono: KeyRound,
    estado: "proximamente",
    etiqueta: "Por configurar",
    detalle: "Pendiente de preguntas y criterios oficiales",
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
