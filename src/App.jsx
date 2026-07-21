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
  ArrowLeft,
  ArrowRight,
  MapPin,
  User,
  Factory,
  Hammer,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [gembaStarted, setGembaStarted] = useState(false);

  const [gembaData, setGembaData] = useState({
    area: "",
    machine: "",
    collaborator: "",
    task: "",
    auditor: "Pablo Hernández",
  });

  const areas = [
    "Prensas",
    "Pintura Electrostática",
    "Tubo",
    "Soldadura",
    "Lámina Plástica",
  ];

  const machinesByArea = {
    Prensas: ["Prensa 304", "Prensa 305", "Prensa 309"],
    "Pintura Electrostática": [
      "Cabina de pintura",
      "Horno",
      "Transportador",
    ],
    Tubo: ["Dobladora", "Formadora", "Perforadora"],
    Soldadura: ["Estación de soldadura 1", "Estación de soldadura 2"],
    "Lámina Plástica": [
      "Línea de laminado",
      "Horno",
      "Cortadora automática",
    ],
  };

  const modules = [
    {
      id: "seguridad",
      name: "Seguridad",
      description: "Condiciones físicas, comportamiento y procedimientos",
      icon: ShieldCheck,
      status: "Pendiente",
    },
    {
      id: "calidad",
      name: "Calidad",
      description: "Producto, controles de proceso y estándares",
      icon: Award,
      status: "Pendiente",
    },
    {
      id: "proceso",
      name: "Proceso / Productividad",
      description: "Desperdicios Lean y oportunidades de mejora",
      icon: Gauge,
      status: "Pendiente",
    },
    {
      id: "mantenimiento",
      name: "Mantenimiento",
      description: "Detección y seguimiento de anomalías",
      icon: Wrench,
      status: "Pendiente",
    },
    {
      id: "cinco-s",
      name: "5S + Gestión Visual",
      description: "Orden, limpieza, estándares y gestión visual",
      icon: Sparkles,
      status: "Pendiente",
    },
  ];

  const navigation = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "nuevo-gemba", label: "Nuevo Gemba", icon: Footprints },
    { id: "plan-accion", label: "Plan de Acción", icon: ClipboardList },
    { id: "mantenimiento", label: "Mantenimiento", icon: Wrench },
    { id: "mis-tareas", label: "Mis tareas", icon: ListTodo },
  ];

  const currentDate = new Intl.DateTimeFormat("es-GT", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  function handleInputChange(event) {
    const { name, value } = event.target;

    setGembaData((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "area" ? { machine: "" } : {}),
    }));
  }

  function handleStartGemba(event) {
    event.preventDefault();

    if (
      !gembaData.area ||
      !gembaData.machine ||
      !gembaData.collaborator.trim() ||
      !gembaData.task.trim() ||
      !gembaData.auditor.trim()
    ) {
      alert("Completá todos los datos antes de iniciar el Gemba.");
      return;
    }

    setGembaStarted(true);
  }

  function handleNewGemba() {
    setCurrentPage("nuevo-gemba");
    setGembaStarted(false);
  }

  function handleCancelGemba() {
    setGembaStarted(false);

    setGembaData({
      area: "",
      machine: "",
      collaborator: "",
      task: "",
      auditor: "Pablo Hernández",
    });

    setCurrentPage("dashboard");
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

        {currentPage === "nuevo-gemba" && !gembaStarted && (
          <NewGembaForm
            gembaData={gembaData}
            areas={areas}
            machinesByArea={machinesByArea}
            currentDate={currentDate}
            onChange={handleInputChange}
            onSubmit={handleStartGemba}
            onCancel={() => setCurrentPage("dashboard")}
          />
        )}

        {currentPage === "nuevo-gemba" && gembaStarted && (
          <GembaModules
            gembaData={gembaData}
            modules={modules}
            currentDate={currentDate}
            onBack={() => setGembaStarted(false)}
            onCancel={handleCancelGemba}
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
          <span className="eyebrow">Gestión de Rutina</span>
          <h2>Dashboard Gemba</h2>

          <p>
            Observá, detectá oportunidades y asegurá el cierre de las acciones.
          </p>
        </div>

        <button className="primary-button" onClick={onNewGemba}>
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
  );
}

function NewGembaForm({
  gembaData,
  areas,
  machinesByArea,
  currentDate,
  onChange,
  onSubmit,
  onCancel,
}) {
  const availableMachines = gembaData.area
    ? machinesByArea[gembaData.area] || []
    : [];

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Nuevo recorrido</span>
          <h2>Iniciar Gemba Walk</h2>

          <p>
            Registrá el contexto de la observación antes de iniciar el
            recorrido.
          </p>
        </div>
      </header>

      <section className="gemba-form-layout">
        <form className="gemba-form-card" onSubmit={onSubmit}>
          <div className="form-card-header">
            <div>
              <span className="step-label">Paso 1 de 2</span>
              <h3>Datos generales</h3>
              <p>
                Esta información quedará asociada a todos los hallazgos
                registrados durante el Gemba.
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
                Área
              </span>

              <select
                name="area"
                value={gembaData.area}
                onChange={onChange}
              >
                <option value="">Seleccionar área</option>

                {areas.map((area) => (
                  <option value={area} key={area}>
                    {area}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>
                <Wrench size={17} />
                Máquina / Equipo
              </span>

              <select
                name="machine"
                value={gembaData.machine}
                onChange={onChange}
                disabled={!gembaData.area}
              >
                <option value="">
                  {gembaData.area
                    ? "Seleccionar máquina"
                    : "Primero seleccioná un área"}
                </option>

                {availableMachines.map((machine) => (
                  <option value={machine} key={machine}>
                    {machine}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>
                <User size={17} />
                Colaborador observado
              </span>

              <input
                type="text"
                name="collaborator"
                value={gembaData.collaborator}
                onChange={onChange}
                placeholder="Ej. Juan Pérez"
              />
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
                placeholder="Ej. Cambio de troquel"
              />
            </label>

            <label className="form-field form-field-full">
              <span>
                <User size={17} />
                Auditor
              </span>

              <input
                type="text"
                name="auditor"
                value={gembaData.auditor}
                onChange={onChange}
                placeholder="Nombre del auditor"
              />
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

            <button type="submit" className="primary-button">
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
            Identificá claramente dónde y qué actividad estás observando.
            Esto permitirá relacionar correctamente los hallazgos y acciones.
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
              <span>Registrá evidencia cuando aporte valor.</span>
            </div>

            <div>
              <CheckCircle2 size={18} />
              <span>Buscá oportunidades, no culpables.</span>
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
  onBack,
  onCancel,
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Gemba en curso</span>
          <h2>Seleccioná un módulo</h2>

          <p>
            Podrás recorrer los cinco pilares y registrar las observaciones
            correspondientes.
          </p>
        </div>

        <button className="secondary-button" onClick={onCancel}>
          Finalizar después
        </button>
      </header>

      <section className="gemba-context-card">
        <div className="context-item">
          <span>Área</span>
          <strong>{gembaData.area}</strong>
        </div>

        <div className="context-item">
          <span>Máquina / Equipo</span>
          <strong>{gembaData.machine}</strong>
        </div>

        <div className="context-item">
          <span>Colaborador</span>
          <strong>{gembaData.collaborator}</strong>
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
            <span className="eyebrow">Paso 2 de 2</span>
            <h3>Módulos del Gemba</h3>
          </div>

          <p>{currentDate}</p>
        </div>

        <div className="gemba-module-grid">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <button
                type="button"
                className="gemba-module-card"
                key={module.id}
                onClick={() =>
                  alert(
                    `El módulo ${module.name} será el siguiente que construiremos.`
                  )
                }
              >
                <div className={`module-icon ${module.id}`}>
                  <Icon size={27} />
                </div>

                <div className="gemba-module-content">
                  <div className="module-title-row">
                    <h4>{module.name}</h4>

                    <span className="status-pill">
                      {module.status}
                    </span>
                  </div>

                  <p>{module.description}</p>

                  <span className="enter-module">
                    Iniciar revisión
                    <ArrowRight size={17} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="gemba-bottom-actions">
          <button className="secondary-button" onClick={onBack}>
            <ArrowLeft size={18} />
            Editar datos generales
          </button>

          <div className="gemba-progress">
            <strong>0 de 5</strong>
            <span>módulos revisados</span>
          </div>
        </div>
      </section>
    </>
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
