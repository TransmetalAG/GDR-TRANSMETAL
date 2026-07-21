import React, { useState } from "react";
import {
  LayoutDashboard,
  Footprints,
  ClipboardList,
  Wrench,
  ListTodo,
  ShieldCheck,
  Award,
  Gauge,
  Sparkles,
} from "lucide-react";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const modules = [
    {
      id: "seguridad",
      name: "Seguridad",
      description: "Condiciones físicas, comportamiento y procedimientos",
      icon: ShieldCheck,
    },
    {
      id: "calidad",
      name: "Calidad",
      description: "Producto, controles de proceso y estándares",
      icon: Award,
    },
    {
      id: "proceso",
      name: "Proceso / Productividad",
      description: "Desperdicios Lean y oportunidades de mejora",
      icon: Gauge,
    },
    {
      id: "mantenimiento",
      name: "Mantenimiento",
      description: "Detección y seguimiento de anomalías",
      icon: Wrench,
    },
    {
      id: "cinco-s",
      name: "5S + Gestión Visual",
      description: "Orden, limpieza, estándares y gestión visual",
      icon: Sparkles,
    },
  ];

  const navigation = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "nuevo-gemba", label: "Nuevo Gemba", icon: Footprints },
    { id: "plan-accion", label: "Plan de Acción", icon: ClipboardList },
    { id: "mantenimiento", label: "Mantenimiento", icon: Wrench },
    { id: "mis-tareas", label: "Mis tareas", icon: ListTodo },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Footprints size={24} />
          </div>

          <div>
            <h1>GDR Gemba</h1>
            <span>Gestión de Rutina</span>
          </div>
        </div>

        <nav className="navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={
                  currentPage === item.id
                    ? "nav-button active"
                    : "nav-button"
                }
                onClick={() => setCurrentPage(item.id)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">PH</div>

          <div>
            <strong>Pablo Hernández</strong>
            <span>Auditor / Producción</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {currentPage === "dashboard" && (
          <>
            <header className="page-header">
              <div>
                <span className="eyebrow">Gestión de Rutina</span>
                <h2>Dashboard Gemba</h2>
                <p>
                  Observá, detectá oportunidades y asegurá el cierre de las
                  acciones.
                </p>
              </div>

              <button
                className="primary-button"
                onClick={() => setCurrentPage("nuevo-gemba")}
              >
                <Footprints size={20} />
                Nuevo Gemba Walk
              </button>
            </header>

            <section className="kpi-grid">
              <div className="kpi-card">
                <span>Gembas este mes</span>
                <strong>24</strong>
                <small>+6 vs. mes anterior</small>
              </div>

              <div className="kpi-card">
                <span>Hallazgos abiertos</span>
                <strong>17</strong>
                <small>5 de prioridad alta</small>
              </div>

              <div className="kpi-card">
                <span>Acciones cerradas</span>
                <strong>43</strong>
                <small>82% de cumplimiento</small>
              </div>

              <div className="kpi-card">
                <span>Acciones vencidas</span>
                <strong>6</strong>
                <small>Requieren seguimiento</small>
              </div>
            </section>

            <section className="section-block">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Pilares Gemba</span>
                  <h3>Módulos de observación</h3>
                </div>

                <p>
                  Cinco enfoques para observar el trabajo real e identificar
                  oportunidades de mejora.
                </p>
              </div>

              <div className="module-grid">
                {modules.map((module) => {
                  const Icon = module.icon;

                  return (
                    <article className="module-card" key={module.id}>
                      <div className={`module-icon ${module.id}`}>
                        <Icon size={25} />
                      </div>

                      <div>
                        <h4>{module.name}</h4>
                        <p>{module.description}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {currentPage === "nuevo-gemba" && (
          <PlaceholderPage
            title="Nuevo Gemba Walk"
            text="Aquí iniciaremos un nuevo recorrido seleccionando área, máquina, colaborador y tarea observada."
            Icon={Footprints}
          />
        )}

        {currentPage === "plan-accion" && (
          <PlaceholderPage
            title="Plan de Acción"
            text="Aquí se consolidarán las acciones generadas durante los Gemba Walks."
            Icon={ClipboardList}
          />
        )}

        {currentPage === "mantenimiento" && (
          <PlaceholderPage
            title="Mantenimiento"
            text="Aquí se recibirán, planificarán y asignarán las intervenciones técnicas."
            Icon={Wrench}
          />
        )}

        {currentPage === "mis-tareas" && (
          <PlaceholderPage
            title="Mis tareas"
            text="Aquí cada responsable visualizará y gestionará las actividades que tiene asignadas."
            Icon={ListTodo}
          />
        )}
      </main>
    </div>
  );
}

function PlaceholderPage({ title, text, Icon }) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-icon">
        <Icon size={34} />
      </div>

      <span className="eyebrow">GDR Gemba</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}

export default App;
