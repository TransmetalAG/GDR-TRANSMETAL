import React, { useMemo, useState } from "react";
import {
  LayoutDashboard, ClipboardCheck, ShieldCheck, FileCheck2, Truck, Siren,
  GraduationCap, Sparkles, KeyRound, ClipboardList, ArrowLeft, CalendarDays,
  AlertCircle, ChevronRight,
} from "lucide-react";
import DashboardGemba from "./DashboardGemba.jsx";
import DashboardCEP from "./DashboardCEP.jsx";
import DashboardAPRPT from "./DashboardAPRPT.jsx";
import DashboardPreusos from "./DashboardPreusos.jsx";
import DashboardDispositivosSeguridad from "./DashboardDispositivosSeguridad.jsx";
import DashboardConocimientosSeguridad from "./DashboardConocimientosSeguridad.jsx";

/* ───────────────────────── Datos ───────────────────────── */

const GEMBA = {
  id: "gemba",
  titulo: "Dashboard Gemba",
  detalle: "Gembas realizados, hallazgos y seguimiento de acciones",
  icono: LayoutDashboard,
};

const categorias = [
  {
    titulo: "Auditorías",
    icono: ClipboardCheck,
    opciones: [
      { id: "apr", titulo: "APR y PT", detalle: "Calidad de llenado, ejecución y permisos de trabajo", icono: FileCheck2 },
      { id: "cep", titulo: "CEP", detalle: "Control de energías peligrosas", icono: ShieldCheck },
      { id: "preusos", titulo: "Pre-usos", detalle: "Verificación de formatos y entrevistas", icono: Truck },
      { id: "dispositivos", titulo: "Dispositivos de seguridad", detalle: "Hongos, cilindros, barreras y guardas", icono: Siren },
    ],
  },
  {
    titulo: "Evaluaciones de conocimientos",
    icono: GraduationCap,
    opciones: [
      { id: "seguridad", titulo: "Seguridad industrial", detalle: "Resultados de conocimientos y aprobaciones", icono: ShieldCheck },
      { id: "5s", titulo: "5S", detalle: "La evaluación aún no está implementada", icono: Sparkles, pendiente: true },
      { id: "bloqueos", titulo: "Conocimiento de bloqueos", detalle: "La evaluación aún no está implementada", icono: KeyRound, pendiente: true },
      { id: "estandares", titulo: "Estándares", detalle: "La evaluación aún no está implementada", icono: ClipboardList, pendiente: true },
    ],
  },
];

/* ───────────────────────── Fechas ───────────────────────── */

const fechaLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const inicioMes = () => { const d = new Date(); return fechaLocal(new Date(d.getFullYear(), d.getMonth(), 1)); };
const finMes = () => { const d = new Date(); return fechaLocal(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };

const PRESETS = [
  { id: "mes", label: "Mes actual", rango: () => [inicioMes(), finMes()] },
  {
    id: "mes-ant", label: "Mes anterior",
    rango: () => { const d = new Date(); return [fechaLocal(new Date(d.getFullYear(), d.getMonth() - 1, 1)), fechaLocal(new Date(d.getFullYear(), d.getMonth(), 0))]; },
  },
  {
    id: "30d", label: "Últimos 30 días",
    rango: () => { const h = new Date(); const i = new Date(h); i.setDate(h.getDate() - 29); return [fechaLocal(i), fechaLocal(h)]; },
  },
  {
    id: "anio", label: "Año actual",
    rango: () => { const y = new Date().getFullYear(); return [`${y}-01-01`, `${y}-12-31`]; },
  },
];

/* ───────────────────────── Componente ───────────────────────── */

export default function DashboardInicio({ modules = [], onNewGemba }) {
  const [seccion, setSeccion] = useState(null);
  const [fechaInicio, setFechaInicio] = useState(inicioMes);
  const [fechaFin, setFechaFin] = useState(finMes);

  const opciones = useMemo(() => [...categorias.flatMap((c) => c.opciones), GEMBA], []);
  const activa = opciones.find((o) => o.id === seccion);

  const abrir = (id) => { setSeccion(id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const rangoInvalido = Boolean(fechaInicio && fechaFin && fechaInicio > fechaFin);
  const presetActivo = PRESETS.find((p) => { const [i, f] = p.rango(); return i === fechaInicio && f === fechaFin; })?.id;

  const aplicarPreset = (p) => { const [i, f] = p.rango(); setFechaInicio(i); setFechaFin(f); };

  /* ── Vista: inicio ── */
  if (!activa) {
    return (
      <div className="di-root">
        <style>{estilos}</style>

        <header className="di-hero">
          <span className="di-hero-icon"><LayoutDashboard size={26} aria-hidden="true" /></span>
          <div>
            <h1 className="di-hero-title">Dashboards</h1>
            <p className="di-hero-sub">Gestión de Rutina Transmetal. Elige el indicador que quieres consultar.</p>
          </div>
        </header>

        <section className="di-section" aria-labelledby="sec-gemba">
          <h2 id="sec-gemba" className="di-h2"><LayoutDashboard size={20} aria-hidden="true" />Gemba</h2>
          <button type="button" className="di-card di-card-featured" onClick={() => abrir(GEMBA.id)}>
            <span className="di-tile di-tile-featured"><GEMBA.icono size={26} aria-hidden="true" /></span>
            <span className="di-card-body">
              <strong className="di-card-title">{GEMBA.titulo}</strong>
              <span className="di-card-detail">{GEMBA.detalle}</span>
            </span>
            <span className="di-card-cta">Abrir<ChevronRight size={18} aria-hidden="true" /></span>
          </button>
        </section>

        {categorias.map((c, idx) => {
          const disponibles = c.opciones.filter((o) => !o.pendiente).length;
          const headingId = `sec-${idx}`;
          return (
            <section key={c.titulo} className="di-section" aria-labelledby={headingId}>
              <div className="di-h2-row">
                <h2 id={headingId} className="di-h2"><c.icono size={20} aria-hidden="true" />{c.titulo}</h2>
                <span className="di-count">{disponibles} de {c.opciones.length} disponibles</span>
              </div>
              <div className="di-grid">
                {c.opciones.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`di-card${o.pendiente ? " di-card-pending" : ""}`}
                    disabled={o.pendiente}
                    onClick={() => abrir(o.id)}
                  >
                    <span className="di-card-top">
                      <span className="di-tile"><o.icono size={22} aria-hidden="true" /></span>
                      {o.pendiente && <span className="di-badge">Próximamente</span>}
                    </span>
                    <span className="di-card-body">
                      <strong className="di-card-title">{o.titulo}</strong>
                      <span className="di-card-detail">{o.detalle}</span>
                    </span>
                    {!o.pendiente && <span className="di-card-cta">Ver tablero<ChevronRight size={16} aria-hidden="true" /></span>}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  /* ── Vista: detalle ── */
  return (
    <div className="di-root di-root-wide">
      <style>{estilos}</style>

      <nav className="di-crumbs" aria-label="Navegación">
        <button type="button" className="di-back" onClick={() => setSeccion(null)}>
          <ArrowLeft size={17} aria-hidden="true" />Volver a Dashboards
        </button>
        <span className="di-crumb-current" aria-current="page">{activa.titulo}</span>
      </nav>

      {seccion !== "gemba" && (
        <div className="di-filters" role="group" aria-label="Rango de fechas">
          <div className="di-dates">
            <label className="di-field">
              <span className="di-label"><CalendarDays size={15} aria-hidden="true" />Desde</span>
              <input type="date" value={fechaInicio} max={fechaFin || undefined} onChange={(e) => setFechaInicio(e.target.value)} />
            </label>
            <label className="di-field">
              <span className="di-label">Hasta</span>
              <input type="date" value={fechaFin} min={fechaInicio || undefined} onChange={(e) => setFechaFin(e.target.value)} />
            </label>
          </div>
          <div className="di-presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`di-chip${presetActivo === p.id ? " di-chip-on" : ""}`}
                aria-pressed={presetActivo === p.id}
                onClick={() => aplicarPreset(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {rangoInvalido && (
            <p className="di-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              La fecha inicial es posterior a la final. Ajusta el rango para ver los datos.
            </p>
          )}
        </div>
      )}

      {seccion === "gemba" && <DashboardGemba modules={modules} onNewGemba={onNewGemba} />}
      {!rangoInvalido && seccion === "apr" && <DashboardAPRPT fechaInicio={fechaInicio} fechaFin={fechaFin} />}
      {!rangoInvalido && seccion === "cep" && <DashboardCEP fechaInicio={fechaInicio} fechaFin={fechaFin} />}
      {!rangoInvalido && seccion === "preusos" && <DashboardPreusos fechaInicio={fechaInicio} fechaFin={fechaFin} />}
      {!rangoInvalido && seccion === "dispositivos" && <DashboardDispositivosSeguridad fechaInicio={fechaInicio} fechaFin={fechaFin} />}
      {!rangoInvalido && seccion === "seguridad" && <DashboardConocimientosSeguridad fechaInicio={fechaInicio} fechaFin={fechaFin} />}
    </div>
  );
}

/* ───────────────────────── Estilos ───────────────────────── */

const estilos = `
.di-root{
  --di-ink:#14212b; --di-steel:#3d5366; --di-muted:#64748b; --di-line:#d5dce2;
  --di-mist:#eef2f5; --di-surface:#fff; --di-accent:#1f5f8b; --di-amber:#e8a317; --di-danger:#b42318;
  max-width:1100px; margin:0 auto; padding-bottom:40px; color:var(--di-ink);
  font-family:"IBM Plex Sans","Segoe UI",system-ui,-apple-system,sans-serif;
}
.di-root-wide{ max-width:1200px; }
.di-root *{ box-sizing:border-box; }

/* Encabezado */
.di-hero{
  display:flex; align-items:center; gap:18px; margin-bottom:28px; padding:26px 28px;
  background:var(--di-ink); color:#fff; border-radius:14px; border-left:6px solid var(--di-amber);
}
.di-hero-icon{ display:grid; place-items:center; width:52px; height:52px; border-radius:12px; background:rgba(255,255,255,.1); flex:none; }
.di-hero-title{ margin:0 0 4px; font-size:28px; line-height:1.15; font-weight:700; letter-spacing:-.01em; }
.di-hero-sub{ margin:0; font-size:15px; line-height:1.5; color:rgba(255,255,255,.78); max-width:60ch; }

/* Secciones */
.di-section{ margin-bottom:30px; }
.di-h2-row{ display:flex; align-items:baseline; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
.di-h2{ display:flex; align-items:center; gap:9px; margin:0 0 14px; font-size:18px; font-weight:650; color:var(--di-ink); }
.di-h2-row .di-h2{ margin:0; }
.di-h2 svg{ color:var(--di-accent); }
.di-count{ font-size:13px; color:var(--di-muted); }

/* Tarjetas */
.di-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px; }
.di-card{
  appearance:none; font:inherit; color:inherit; text-align:left; cursor:pointer;
  display:flex; flex-direction:column; align-items:flex-start; gap:14px;
  min-height:168px; padding:20px; width:100%;
  background:var(--di-surface); border:1px solid var(--di-line); border-radius:12px;
  transition:border-color .15s ease, box-shadow .15s ease;
}
.di-card:hover:not(:disabled){ border-color:var(--di-accent); box-shadow:0 4px 14px rgba(20,33,43,.08); }
.di-card:focus-visible,.di-back:focus-visible,.di-chip:focus-visible,.di-field input:focus-visible{ outline:3px solid var(--di-amber); outline-offset:2px; }
.di-card-top{ display:flex; align-items:flex-start; justify-content:space-between; width:100%; gap:8px; }
.di-tile{ display:grid; place-items:center; width:44px; height:44px; border-radius:10px; background:var(--di-mist); color:var(--di-accent); flex:none; }
.di-card-body{ display:flex; flex-direction:column; gap:6px; flex:1; }
.di-card-title{ font-size:16px; line-height:1.3; font-weight:650; }
.di-card-detail{ font-size:13.5px; line-height:1.5; color:var(--di-muted); }
.di-card-cta{ display:inline-flex; align-items:center; gap:2px; margin-top:auto; font-size:13.5px; font-weight:600; color:var(--di-accent); }

/* Tarjeta destacada (Gemba) */
.di-card-featured{
  flex-direction:row; align-items:center; gap:18px; min-height:0; padding:22px 24px;
  background:var(--di-ink); border-color:var(--di-ink); color:#fff;
}
.di-card-featured:hover:not(:disabled){ border-color:var(--di-amber); box-shadow:0 6px 18px rgba(20,33,43,.22); }
.di-card-featured .di-card-detail{ color:rgba(255,255,255,.75); }
.di-card-featured .di-card-title{ font-size:18px; }
.di-card-featured .di-card-cta{ margin:0 0 0 auto; color:var(--di-amber); }
.di-tile-featured{ width:52px; height:52px; background:var(--di-amber); color:var(--di-ink); }

/* Pendientes */
.di-card-pending{ cursor:not-allowed; background:#f8fafb; border-style:dashed; }
.di-card-pending .di-tile{ background:#e6ebef; color:var(--di-muted); }
.di-card-pending .di-card-title{ color:var(--di-steel); }
.di-badge{ padding:3px 9px; border-radius:999px; background:#fff4d6; color:#7a5200; font-size:12px; font-weight:600; border:1px solid #f1d58a; }

/* Vista detalle */
.di-crumbs{ display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
.di-back{
  appearance:none; font:inherit; cursor:pointer; display:inline-flex; align-items:center; gap:7px;
  padding:9px 14px; min-height:40px; font-size:14px; font-weight:600; color:var(--di-ink);
  background:var(--di-surface); border:1px solid var(--di-line); border-radius:9px;
}
.di-back:hover{ border-color:var(--di-accent); color:var(--di-accent); }
.di-crumb-current{ font-size:18px; font-weight:650; }

/* Filtros */
.di-filters{
  display:flex; flex-wrap:wrap; align-items:flex-end; gap:16px 22px; margin-bottom:20px; padding:16px 18px;
  background:var(--di-surface); border:1px solid var(--di-line); border-radius:12px;
}
.di-dates{ display:flex; gap:14px; flex-wrap:wrap; }
.di-field{ display:flex; flex-direction:column; gap:6px; min-width:170px; }
.di-label{ display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:600; color:var(--di-steel); }
.di-field input{
  font:inherit; font-size:16px; min-height:42px; padding:8px 11px; color:var(--di-ink);
  background:#fff; border:1px solid #b9c4cd; border-radius:8px;
}
.di-presets{ display:flex; gap:8px; flex-wrap:wrap; }
.di-chip{
  appearance:none; font:inherit; cursor:pointer; min-height:40px; padding:8px 14px; font-size:13.5px; font-weight:600;
  color:var(--di-steel); background:var(--di-mist); border:1px solid transparent; border-radius:999px;
}
.di-chip:hover{ border-color:var(--di-accent); }
.di-chip-on{ background:var(--di-accent); color:#fff; }
.di-error{
  display:flex; align-items:center; gap:8px; width:100%; margin:0; padding:10px 12px;
  font-size:14px; color:var(--di-danger); background:#fef3f2; border:1px solid #fecdca; border-radius:8px;
}

/* Móvil */
@media (max-width:640px){
  .di-hero{ padding:20px; gap:14px; }
  .di-hero-title{ font-size:24px; }
  .di-card-featured{ flex-wrap:wrap; }
  .di-card-featured .di-card-cta{ margin-left:0; }
  .di-field{ flex:1; min-width:140px; }
  .di-dates{ width:100%; }
  .di-presets{ width:100%; }
}
@media (prefers-reduced-motion:reduce){ .di-card{ transition:none; } }
`;
