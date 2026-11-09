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
import DashboardCEP from "./DashboardCEP.jsx";

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
