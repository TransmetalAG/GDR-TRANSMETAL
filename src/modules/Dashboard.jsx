import React from "react";
import {
  Footprints,
  ShieldCheck,
  Award,
  Gauge,
  Wrench,
} from "lucide-react";

function Dashboard({
  modules = [],
  onNewGemba,
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">
            Gestión de Rutina
          </span>

          <h2>
            Dashboard Gemba
          </h2>

          <p>
            Observá, detectá oportunidades y asegurá el cierre de
            las acciones.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={onNewGemba}
        >
          <Footprints size={20} />
          Nuevo Gemba Walk
        </button>
      </header>

      <section className="kpi-grid">
        <div className="kpi-card">
          <span>
            Gembas este mes
          </span>

          <strong>
            24
          </strong>

          <small>
            +6 vs. mes anterior
          </small>
        </div>

        <div className="kpi-card">
          <span>
            Hallazgos abiertos
          </span>

          <strong>
            17
          </strong>

          <small>
            5 de prioridad alta
          </small>
        </div>

        <div className="kpi-card">
          <span>
            Acciones cerradas
          </span>

          <strong>
            43
          </strong>

          <small>
            82% de cumplimiento
          </small>
        </div>

        <div className="kpi-card">
          <span>
            Acciones vencidas
          </span>

          <strong>
            6
          </strong>

          <small>
            Requieren seguimiento
          </small>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              Pilares Gemba
            </span>

            <h3>
              Módulos de observación
            </h3>
          </div>

          <p>
            Cuatro enfoques para observar el trabajo real e identificar
            oportunidades de mejora.
          </p>
        </div>

        <div className="module-grid">
          {modules.map((module) => {
            const Icon =
              module.icon ||
              getIconByModuleId(module.id);

            return (
              <article
                className="module-card"
                key={module.id}
              >
                <div
                  className={`module-icon ${module.id}`}
                >
                  <Icon size={25} />
                </div>

                <div>
                  <h4>
                    {module.name}
                  </h4>

                  <p>
                    {module.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

function getIconByModuleId(moduleId) {
  const icons = {
    seguridad: ShieldCheck,
    calidad: Award,
    proceso: Gauge,
    mantenimiento: Wrench,
  };

  return icons[moduleId] || Footprints;
}

export default Dashboard;
