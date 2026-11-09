import React, { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  Wrench,
  ArrowRight,
} from "lucide-react";

import { catalogo } from "../data/CatalogoMaquinas.js";
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

// Fuente visible; conservamos "origen" y "pilar" originales en Supabase.
function mostrarFuente(accion) {
  if (accion.origen === "Gemba") {
    return accion.pilar ? `Gemba – ${accion.pilar}` : "Gemba";
  }
  return accion.origen || "Manual";
}

// Resume en la matriz los hallazgos CEP sin alterar el texto almacenado.
function mostrarCausa(accion) {
  const original = accion.causa || "";
  if (accion.origen !== "Auditoría CEP") return original;
  const match = original.match(/^CEP \[[^\]]+\] \[([^\]]+)\]:[\s\S]*?\s\| Observación:\s*([\s\S]*)$/);
  return match ? `${match[1]} – ${match[2]}` : original;
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
    auditor: row.auditor || "",
    equipo: row.maquina || "",
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
  const currentUser = useMemo(() => {
    try {
      const savedUser = localStorage.getItem("gdr_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  }, []);
