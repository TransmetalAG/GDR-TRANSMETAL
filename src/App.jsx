import React, { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Footprints,
  ClipboardList,
  Wrench,
  ListTodo,
  ShieldCheck,
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
} from "lucide-react";

import { catalogo } from "./data/CatalogoMaquinas.js";
import { colaboradores } from "./data/CatalogoColaboradores.js";

import Seguridad from "./modules/Seguridad.jsx";
import Calidad from "./modules/Calidad.jsx";
import Proceso from "./modules/Proceso.jsx";
import Mantenimiento from "./modules/Mantenimiento.jsx";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [gembaStarted, setGembaStarted] = useState(false);
  const [activeGembaModule, setActiveGembaModule] = useState(null);

  const [gembaData, setGembaData] = useState({
    maquina: "",
    proceso: "",
    collaborator: "",
    task: "",
    auditor: "Pablo Hernández",
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
      description: "Condiciones físicas, comportamiento y procedimientos",
      icon: ShieldCheck,
    },
    {
      id: "calidad",
      name: "Calidad",
      description: "Condición del producto y controles del proceso",
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
      description: "Detección y seguimiento de anomalías del equipo",
      icon: Wrench,
    },
  ];

  const modules = baseModules.map((module) => ({
    ...module,
    status: moduleResults[module.id] ? "Completado" : "Pendiente",
  }));

  const navigation = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "nuevo-gemba",
      label: "Nuevo Gemba",
      icon: Footprints,
    },
    {
      id: "plan-accion",
      label: "Plan de Acción",
      icon: ClipboardList,
    },
    {
      id: "mantenimiento",
      label: "Mantenimiento",
      icon: Wrench,
    },
    {
      id: "mis-tareas",
      label: "Mis tareas",
      icon: ListTodo,
    },
  ];

  const maquinas = useMemo(() => {
    return [...new Set(catalogo.map((item) => item.maquina))].sort();
  }, []);

  const procesosDisponibles = useMemo(() => {
    if (!gembaData.maquina) return [];

    return catalogo
      .filter((item) => item.maquina === gembaData.maquina)
      .map((item) => item.proceso);
  }, [gembaData.maquina]);

  const colaboradoresOrdenados = useMemo(() => {
    return [...colaboradores].sort((a, b) =>
      a.localeCompare(b, "es")
    );
  }, []);

  const currentDate = new Intl.DateTimeFormat("es-GT", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  const completedModules =
    Object.values(moduleResults).filter(Boolean).length;

  function getEmptyModuleResults() {
    return {
      seguridad: null,
      calidad: null,
      proceso: null,
      mantenimiento: null,
    };
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    if (name === "maquina") {
      const procesos = catalogo
        .filter((item) => item.maquina === value)
        .map((item) => item.proceso);

      setGembaData((previous) => ({
        ...previous,
        maquina: value,
        proceso: procesos.length === 1 ? procesos[0] : "",
      }));

      return;
    }

    setGembaData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleStartGemba(event) {
    event.preventDefault();

    if (
      !gembaData.maquina ||
      !gembaData.proceso ||
      !gembaData.collaborator ||
      !gembaData.task.trim() ||
      !gembaData.auditor
    ) {
      alert("Completá todos los datos antes de iniciar el Gemba.");
      return;
    }

    setGembaStarted(true);
    setActiveGembaModule(null);
  }

  function handleNewGemba() {
    setCurrentPage("nuevo-gemba");
    setGembaStarted(false);
    setActiveGembaModule(null);

    setModuleResults(getEmptyModuleResults());
  }

  function handleCancelGemba() {
    setGembaStarted(false);
    setActiveGembaModule(null);

    setGembaData({
      maquina: "",
      proceso: "",
      collaborator: "",
      task: "",
      auditor: "Pablo Hernández",
    });

    setModuleResults(getEmptyModuleResults());

    setCurrentPage("dashboard");
  }

  function handleOpenModule(moduleId) {
    if (
      moduleId === "seguridad" ||
      moduleId === "calidad" ||
      moduleId === "proceso" ||
      moduleId === "mantenimiento"
    ) {
      setActiveGembaModule(moduleId);
    }
  }

  function handleCompleteSafety(result) {
    setModuleResults((previous) => ({
      ...previous,
      seguridad: result,
    }));

    setActiveGembaModule(null);
  }

  function handleCompleteQuality(result) {
    setModuleResults((previous) => ({
      ...previous,
      calidad: result,
    }));

    setActiveGembaModule(null);
  }

  function handleCompleteProcess(result) {
    setModuleResults((previous) => ({
      ...previous,
      proceso: result,
    }));

    setActiveGembaModule(null);
  }

  function handleCompleteMaintenance(result) {
    setModuleResults((previous) => ({
      ...previous,
      mantenimiento: result,
    }));

    setActiveGembaModule(null);
  }

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
                onClick={() => {
                  setCurrentPage(item.id);

                  if (item.id === "nuevo-gemba") {
                    setGembaStarted(false);
                    setActiveGembaModule(null);
                  }
                }}
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
          <Dashboard
            modules={modules}
            onNewGemba={handleNewGemba}
          />
        )}

        {currentPage === "nuevo-gemba" &&
          !gembaStarted &&
          !activeGembaModule && (
            <NewGembaForm
              gembaData={gembaData}
              maquinas={maquinas}
              procesosDisponibles={procesosDisponibles}
              colaboradores={colaboradoresOrdenados}
              currentDate={currentDate}
              onChange={handleInputChange}
              onSubmit={handleStartGemba}
              onCancel={() => setCurrentPage("dashboard")}
            />
          )}

        {currentPage === "nuevo-gemba" &&
          gembaStarted &&
          !activeGembaModule && (
            <GembaModules
              gembaData={gembaData}
              modules={modules}
              currentDate={currentDate}
              completedModules={completedModules}
              onBack={() => setGembaStarted(false)}
              onCancel={handleCancelGemba}
              onOpenModule={handleOpenModule}
            />
          )}

        {currentPage === "nuevo-gemba" &&
          gembaStarted &&
          activeGembaModule === "seguridad" && (
            <Seguridad
              gembaData={gembaData}
              onBack={() => setActiveGembaModule(null)}
              onComplete={handleCompleteSafety}
            />
          )}

        {currentPage === "nuevo-gemba" &&
          gembaStarted &&
          activeGembaModule === "calidad" && (
            <Calidad
              gembaData={gembaData}
              onBack={() => setActiveGembaModule(null)}
              onComplete={handleCompleteQuality}
            />
          )}

        {currentPage === "nuevo-gemba" &&
          gembaStarted &&
          activeGembaModule === "proceso" && (
            <Proceso
              gembaData={gembaData}
              onBack={() => setActiveGembaModule(null)}
              onComplete={handleCompleteProcess}
            />
          )}

        {currentPage === "nuevo-gemba" &&
          gembaStarted &&
          activeGembaModule === "mantenimiento" && (
            <Mantenimiento
              gembaData={gembaData}
              onBack={() => setActiveGembaModule(null)}
              onComplete={handleCompleteMaintenance}
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

function Dashboard({ modules, onNewGemba }) {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">
            Gestión de Rutina
          </span>

          <h2>Dashboard Gemba</h2>

          <p>
            Observá, detectá oportunidades y asegurá el cierre
            de las acciones.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={onNewGemba}
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
            <span className="eyebrow">
              Pilares Gemba
            </span>

            <h3>Módulos de observación</h3>
          </div>

          <p>
            Cuatro enfoques para observar el trabajo real e
            identificar oportunidades de mejora.
          </p>
        </div>

        <div className="module-grid">
          {modules.map((module) => {
            const Icon = module.icon;

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
                  <h4>{module.name}</h4>
                  <p>{module.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

function NewGembaForm({
  gembaData,
  maquinas,
  procesosDisponibles,
  colaboradores,
  currentDate,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">
            Nuevo recorrido
          </span>

          <h2>Iniciar Gemba Walk</h2>

          <p>
            Registrá el contexto de la observación antes de
            iniciar el recorrido.
          </p>
        </div>
      </header>

      <section className="gemba-form-layout">
        <form
          className="gemba-form-card"
          onSubmit={onSubmit}
        >
          <div className="form-card-header">
            <div>
              <span className="step-label">
                Paso 1 de 2
              </span>

              <h3>Datos generales</h3>

              <p>
                Esta información quedará asociada a todos los
                hallazgos registrados durante el Gemba.
              </p>
            </div>

            <div className="date-badge">
              <CalendarDays size={18} />
              <span>{currentDate}</span>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>
                <Factory size={17} />
                Máquina / Equipo
              </span>

              <select
                name="maquina"
                value={gembaData.maquina}
                onChange={onChange}
              >
                <option value="">
                  Seleccionar máquina
                </option>

                {maquinas.map((maquina) => (
                  <option
                    value={maquina}
                    key={maquina}
                  >
                    {maquina}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>
                <Workflow size={17} />
                Proceso
              </span>

              <select
                name="proceso"
                value={gembaData.proceso}
                onChange={onChange}
                disabled={!gembaData.maquina}
              >
                <option value="">
                  {!gembaData.maquina
                    ? "Primero seleccioná una máquina"
                    : "Seleccionar proceso"}
                </option>

                {procesosDisponibles.map((proceso) => (
                  <option
                    value={proceso}
                    key={proceso}
                  >
                    {proceso}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>
                <User size={17} />
                Colaborador observado
              </span>

              <select
                name="collaborator"
                value={gembaData.collaborator}
                onChange={onChange}
              >
                <option value="">
                  Seleccionar colaborador
                </option>

                {colaboradores.map((colaborador) => (
                  <option
                    value={colaborador}
                    key={colaborador}
                  >
                    {colaborador}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>
                <Hammer size={17} />
                Tarea observada
              </span>

              <input
                type="text"
                name="task"
                value={gembaData.task}
                onChange={onChange}
              />
            </label>

            <label className="form-field form-field-full">
              <span>
                <User size={17} />
                Auditor
              </span>

              <select
                name="auditor"
                value={gembaData.auditor}
                onChange={onChange}
              >
                <option value="Pablo Hernández">
                  Pablo Hernández
                </option>

                <option value="José Suruy">
                  José Suruy
                </option>

                <option value="Ricardo Estrada">
                  Ricardo Estrada
                </option>
              </select>
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onCancel}
            >
              <ArrowLeft size={18} />
              Cancelar
            </button>

            <button
              type="submit"
              className="primary-button"
            >
              Iniciar Gemba
              <ArrowRight size={18} />
            </button>
          </div>
        </form>

        <aside className="gemba-help-card">
          <div className="help-icon">
            <Footprints size={26} />
          </div>

          <h3>Antes de comenzar</h3>

          <p>
            Identificá claramente la máquina, el proceso y la
            actividad que estás observando.
          </p>

          <div className="help-list">
            <div>
              <CheckCircle2 size={18} />
              <span>Observá el trabajo real.</span>
            </div>

            <div>
              <CheckCircle2 size={18} />
              <span>Conversá con el colaborador.</span>
            </div>

            <div>
              <CheckCircle2 size={18} />
              <span>
                Registrá evidencia cuando aporte valor.
              </span>
            </div>

            <div>
              <CheckCircle2 size={18} />
              <span>
                Buscá oportunidades, no culpables.
              </span>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}

function GembaModules({
  gembaData,
  modules,
  currentDate,
  completedModules,
  onBack,
  onCancel,
  onOpenModule,
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">
            Gemba en curso
          </span>

          <h2>Seleccioná un módulo</h2>

          <p>
            Podrás recorrer los cuatro pilares y registrar las
            observaciones correspondientes.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={onCancel}
        >
          Finalizar después
        </button>
      </header>

      <section className="gemba-context-card">
        <div className="context-item">
          <span>Máquina / Equipo</span>
          <strong>{gembaData.maquina}</strong>
        </div>

        <div className="context-item">
          <span>Proceso</span>
          <strong>{gembaData.proceso}</strong>
        </div>

        <div className="context-item">
          <span>Colaborador</span>
          <strong>
            {gembaData.collaborator}
          </strong>
        </div>

        <div className="context-item">
          <span>Tarea</span>
          <strong>{gembaData.task}</strong>
        </div>

        <div className="context-item">
          <span>Auditor</span>
          <strong>{gembaData.auditor}</strong>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              Paso 2 de 2
            </span>

            <h3>Módulos del Gemba</h3>
          </div>

          <p>{currentDate}</p>
        </div>

        <div className="gemba-module-grid">
          {modules.map((module) => {
            const Icon = module.icon;

            const completed =
              module.status === "Completado";

            return (
              <button
                type="button"
                className={
                  completed
                    ? "gemba-module-card completed"
                    : "gemba-module-card"
                }
                key={module.id}
                onClick={() =>
                  onOpenModule(module.id)
                }
              >
                <div
                  className={`module-icon ${module.id}`}
                >
                  <Icon size={27} />
                </div>

                <div className="gemba-module-content">
                  <div className="module-title-row">
                    <h4>{module.name}</h4>

                    <span
                      className={
                        completed
                          ? "status-pill completed"
                          : "status-pill"
                      }
                    >
                      {completed && (
                        <CheckCircle2 size={13} />
                      )}

                      {module.status}
                    </span>
                  </div>

                  <p>{module.description}</p>

                  <span className="enter-module">
                    {completed
                      ? "Revisar nuevamente"
                      : "Iniciar revisión"}

                    <ArrowRight size={17} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="gemba-bottom-actions">
          <button
            className="secondary-button"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
            Editar datos generales
          </button>

          <div className="gemba-progress">
            <strong>
              {completedModules} de 4
            </strong>

            <span>módulos revisados</span>
          </div>
        </div>
      </section>
    </>
  );
}

function PlaceholderPage({
  title,
  text,
  Icon,
}) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-icon">
        <Icon size={34} />
      </div>

      <span className="eyebrow">
        GDR Gemba
      </span>

      <h2>{title}</h2>

      <p>{text}</p>
    </section>
  );
}

export default App;
