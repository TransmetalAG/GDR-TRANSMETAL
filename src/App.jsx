import React, { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Footprints,
  ClipboardList,
  Wrench,
  ShieldCheck,
  ClipboardCheck,
  Award,
  Gauge,
  ArrowLeft,
  ArrowRight,
  User,
  Factory,
  Hammer,
  CalendarDays,
  CheckCircle2,
  Workflow,
  LogOut,
  LogIn,
} from "lucide-react";

import { catalogo } from "./data/CatalogoMaquinas.js";
import { colaboradores } from "./data/CatalogoColaboradores.js";
import { usuarios } from "./data/CatalogoUsuarios.js";

import Seguridad from "./modules/Seguridad.jsx";
import Calidad from "./modules/Calidad.jsx";
import Proceso from "./modules/Proceso.jsx";
import Mantenimiento from "./modules/Mantenimiento.jsx";
import GestionMantenimiento from "./modules/GestionMantenimiento.jsx";
import EquipoMantenimiento from "./modules/EquipoMantenimiento.jsx";
import PlanAccion from "./modules/PlanAccion.jsx";
import Dashboard from "./modules/Dashboard.jsx";
import EvaluacionConocimientosSeguridad from "./modules/EvaluacionConocimientosSeguridad.jsx";
import EvaluacionConocimientos from "./modules/EvaluacionConocimientos.jsx";
import Auditorias from "./modules/Auditorias.jsx";

import ResumenGemba from "./components/ResumenGemba.jsx";
import { supabase } from "./lib/supabase.js";

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("gdr_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const savedUser = localStorage.getItem("gdr_user");
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;

      return parsedUser?.rol === "Mantenimiento"
        ? "equipo-mantenimiento"
        : "dashboard";
    } catch {
      return "dashboard";
    }
  });

  const [gembaStarted, setGembaStarted] = useState(false);

  const [activeGembaModule, setActiveGembaModule] =
    useState(null);

  const [showGembaSummary, setShowGembaSummary] =
    useState(false);

  const [gembaData, setGembaData] = useState({
    maquina: "",
    proceso: "",
    collaborator: "",
    task: "",
    auditor: currentUser?.rol === "Mantenimiento" ? "" : currentUser?.nombre || "",
  });

  const [moduleResults, setModuleResults] = useState({
    seguridad: null,
    calidad: null,
    proceso: null,
    mantenimiento: null,
  });

  const baseModules = [
    {
      id: "seguridad",
      name: "Seguridad",
      description:
        "Condiciones físicas, comportamiento y procedimientos",
      icon: ShieldCheck,
    },
    {
