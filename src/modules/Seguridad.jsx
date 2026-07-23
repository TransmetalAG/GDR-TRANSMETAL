import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  HardHat,
  UserRoundCheck,
  FileCheck2,
  Plus,
  Trash2,
  Camera,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

function Seguridad({
  gembaData,
  initialData,
  onBack,
  onComplete,
}) {
  const [activeSection, setActiveSection] = useState("condiciones");

  const [condiciones, setCondiciones] = useState(
    initialData?.condiciones || {
      existeDesvio: "",
      hallazgos: [],
    }
  );

  const [comportamiento, setComportamiento] = useState(
    initialData?.comportamiento || {
      existeDesvio: "",
      hallazgos: [],
    }
  );

  const [procedimientos, setProcedimientos] = useState(
    initialData?.procedimientos || {
      existeProcedimiento: "",
      estaActualizado: "",
      reflejaRealidad: "",
      conoceYAplica: "",
      responsable: "",
      tipoAccion: "",
      observaciones: "",
    }
  );

  const [nuevoHallazgoFisico, setNuevoHallazgoFisico] = useState({
    descripcion: "",
    criticidad: "Media",
  });

  const [nuevoHallazgoComportamiento, setNuevoHallazgoComportamiento] =
    useState({
      descripcion: "",
      criticidad: "Media",
    });

  function agregarHallazgoFisico() {
    if (!nuevoHallazgoFisico.descripcion.trim()) {
      alert("Escribí la oportunidad de mejora antes de agregarla.");
      return;
    }

    setCondiciones((previous) => ({
      ...previous,
      hallazgos: [
        ...previous.hallazgos,
        {
          id: Date.now(),
          ...nuevoHallazgoFisico,
        },
      ],
    }));

    setNuevoHallazgoFisico({
      descripcion: "",
      criticidad: "Media",
    });
  }

  function eliminarHallazgoFisico(id) {
    setCondiciones((previous) => ({
      ...previous,
      hallazgos: previous.hallazgos.filter(
        (hallazgo) => hallazgo.id !== id
      ),
    }));
  }

  function agregarHallazgoComportamiento() {
    if (!nuevoHallazgoComportamiento.descripcion.trim()) {
      alert("Escribí el desvío comportamental antes de agregarlo.");
      return;
    }

    setComportamiento((previous) => ({
      ...previous,
      hallazgos: [
        ...previous.hallazgos,
        {
          id: Date.now(),
          ...nuevoHallazgoComportamiento,
        },
      ],
    }));

    setNuevoHallazgoComportamiento({
      descripcion: "",
      criticidad: "Media",
    });
  }

  function eliminarHallazgoComportamiento(id) {
    setComportamiento((previous) => ({
      ...previous,
      hallazgos: previous.hallazgos.filter(
        (hallazgo) => hallazgo.id !== id
      ),
    }));
  }

  function avanzarA(seccion) {
    setActiveSection(seccion);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finalizarSeguridad() {
    if (!condiciones.existeDesvio) {
      alert("Completá la revisión de Condiciones Físicas.");
      avanzarA("condiciones");
      return;
    }

    if (
      condiciones.existeDesvio === "si" &&
      condiciones.hallazgos.length === 0
    ) {
      alert(
        "Indicá al menos una oportunidad de mejora en Condiciones Físicas."
      );
      avanzarA("condiciones");
      return;
    }

    if (!comportamiento.existeDesvio) {
      alert("Completá la revisión de Comportamiento.");
      avanzarA("comportamiento");
      return;
    }

    if (
      comportamiento.existeDesvio === "si" &&
      comportamiento.hallazgos.length === 0
    ) {
      alert("Indicá al menos un desvío comportamental.");
      avanzarA("comportamiento");
      return;
    }

    if (!procedimientos.existeProcedimiento) {
      alert("Indicá si existe un procedimiento para realizar la tarea.");
      avanzarA("procedimientos");
      return;
    }

    if (
      procedimientos.existeProcedimiento === "no" &&
      !procedimientos.responsable.trim()
    ) {
      alert("Indicá un responsable para elaborar el procedimiento.");
      avanzarA("procedimientos");
      return;
    }

    if (procedimientos.existeProcedimiento === "si") {
      if (!procedimientos.estaActualizado) {
        alert("Indicá si el procedimiento está actualizado.");
        avanzarA("procedimientos");
        return;
      }

      if (!procedimientos.reflejaRealidad) {
        alert(
          "Indicá si el procedimiento refleja la forma real en que se ejecuta la tarea."
        );
        avanzarA("procedimientos");
        return;
      }

      if (!procedimientos.conoceYAplica) {
        alert(
          "Indicá si el colaborador conoce y aplica el procedimiento."
        );
        avanzarA("procedimientos");
        return;
      }

      const requiereAccion =
        procedimientos.estaActualizado === "no" ||
        procedimientos.reflejaRealidad === "no" ||
        procedimientos.conoceYAplica === "parcialmente" ||
        procedimientos.conoceYAplica === "no";

      if (requiereAccion && !procedimientos.responsable.trim()) {
        alert("Indicá un responsable para dar seguimiento a la acción.");
        avanzarA("procedimientos");
        return;
      }
    }

    const resultadoSeguridad = {
      condiciones,
      comportamiento,
      procedimientos,
    };

    onComplete(resultadoSeguridad);
  }

  const requiereAccionProcedimiento =
    procedimientos.existeProcedimiento === "no" ||
    procedimientos.estaActualizado === "no" ||
    procedimientos.reflejaRealidad === "no" ||
    procedimientos.conoceYAplica === "parcialmente" ||
    procedimientos.conoceYAplica === "no";

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Gemba · Seguridad</span>
          <h2>Revisión de Seguridad</h2>

          <p>
            Evaluá las condiciones físicas, el comportamiento durante la
            tarea y los procedimientos aplicables.
          </p>
        </div>

        <button className="secondary-button" onClick={onBack}>
          <ArrowLeft size={18} />
          Volver a módulos
        </button>
      </header>

      <section className="gemba-context-card">
        <div className="context-item">
          <span>Máquina</span>
          <strong>{gembaData.maquina}</strong>
        </div>

        <div className="context-item">
          <span>Proceso</span>
          <strong>{gembaData.proceso}</strong>
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

      <section className="safety-progress">
        <button
          className={
            activeSection === "condiciones"
              ? "safety-step active"
              : "safety-step"
          }
          onClick={() => avanzarA("condiciones")}
        >
          <span className="safety-step-number">A</span>

          <div>
            <strong>Condiciones físicas</strong>
            <small>Instalaciones, equipos y entorno</small>
          </div>
        </button>

        <button
          className={
            activeSection === "comportamiento"
              ? "safety-step active"
              : "safety-step"
          }
          onClick={() => avanzarA("comportamiento")}
        >
          <span className="safety-step-number">B</span>

          <div>
            <strong>Comportamiento</strong>
            <small>Actos y prácticas observadas</small>
          </div>
        </button>

        <button
          className={
            activeSection === "procedimientos"
              ? "safety-step active"
              : "safety-step"
          }
          onClick={() => avanzarA("procedimientos")}
        >
          <span className="safety-step-number">C</span>

          <div>
            <strong>Procedimientos</strong>
            <small>Existencia, vigencia y aplicación</small>
          </div>
        </button>
      </section>

      {activeSection === "condiciones" && (
        <section className="audit-section-card">
          <div className="audit-section-header">
            <div className="audit-section-icon safety">
              <HardHat size={25} />
            </div>

            <div>
              <span className="step-label">Sección A</span>
              <h3>Condiciones físicas</h3>

              <p>
                Revisá la máquina, instalaciones, dispositivos de seguridad y
                condiciones del entorno de trabajo.
              </p>
            </div>
          </div>

          <div className="audit-question">
            <div>
              <span className="question-number">1</span>

              <div>
                <strong>
                  ¿Existen desvíos en las condiciones físicas?
                </strong>

                <p>
                  Considerá cualquier condición que pueda representar un
                  riesgo o una oportunidad de mejora.
                </p>
              </div>
            </div>

            <div className="yes-no-group">
              <button
                type="button"
                className={
                  condiciones.existeDesvio === "si"
                    ? "choice-button selected danger"
                    : "choice-button"
                }
                onClick={() =>
                  setCondiciones((previous) => ({
                    ...previous,
                    existeDesvio: "si",
                  }))
                }
              >
                Sí
              </button>

              <button
                type="button"
                className={
                  condiciones.existeDesvio === "no"
                    ? "choice-button selected success"
                    : "choice-button"
                }
                onClick={() =>
                  setCondiciones({
                    existeDesvio: "no",
                    hallazgos: [],
                  })
                }
              >
                No
              </button>
            </div>
          </div>

          {condiciones.existeDesvio === "si" && (
            <div className="conditional-area">
              <div className="conditional-title">
                <span className="question-number">2</span>

                <div>
                  <strong>
                    ¿Qué oportunidades de mejora observaste?
                  </strong>

                  <p>
                    Podés registrar varios hallazgos por separado.
                  </p>
                </div>
              </div>

              <div className="finding-entry-card">
                <label className="form-field">
                  <span>Descripción del hallazgo</span>

                  <textarea
                    value={nuevoHallazgoFisico.descripcion}
                    onChange={(event) =>
                      setNuevoHallazgoFisico((previous) => ({
                        ...previous,
                        descripcion: event.target.value,
                      }))
                    }
                    rows="4"
                  />
                </label>

                <div className="finding-options-grid">
                  <label className="form-field">
                    <span>Criticidad</span>

                    <select
                      value={nuevoHallazgoFisico.criticidad}
                      onChange={(event) =>
                        setNuevoHallazgoFisico((previous) => ({
                          ...previous,
                          criticidad: event.target.value,
                        }))
                      }
                    >
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                      <option value="Crítica">Crítica</option>
                    </select>
                  </label>

                </div>

                <div className="finding-entry-actions">
                  <button
                    type="button"
                    className="evidence-button"
                    onClick={() =>
                      alert(
                        "La carga de fotografías la conectaremos cuando agreguemos almacenamiento."
                      )
                    }
                  >
                    <Camera size={18} />
                    Agregar evidencia
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={agregarHallazgoFisico}
                  >
                    <Plus size={18} />
                    Agregar hallazgo
                  </button>
                </div>
              </div>

              {condiciones.hallazgos.length > 0 && (
                <div className="findings-list">
                  <div className="findings-list-title">
                    <strong>
                      Hallazgos registrados ({condiciones.hallazgos.length})
                    </strong>
                  </div>

                  {condiciones.hallazgos.map((hallazgo, index) => (
                    <article className="finding-item" key={hallazgo.id}>
                      <div className="finding-index">
                        {index + 1}
                      </div>

                      <div className="finding-item-content">
                        <div className="finding-item-top">
                          <p>{hallazgo.descripcion}</p>

                          <button
                            type="button"
                            className="icon-delete-button"
                            onClick={() =>
                              eliminarHallazgoFisico(hallazgo.id)
                            }
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>

                        <div className="finding-tags">
                          <span
                            className={`criticality-tag ${hallazgo.criticidad.toLowerCase()}`}
                          >
                            {hallazgo.criticidad}
                          </span>


                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="audit-navigation">
            <button
              type="button"
              className="secondary-button"
              onClick={onBack}
            >
              <ArrowLeft size={18} />
              Volver
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (!condiciones.existeDesvio) {
                  alert(
                    "Indicá si existen desvíos en las condiciones físicas."
                  );
                  return;
                }

                if (
                  condiciones.existeDesvio === "si" &&
                  condiciones.hallazgos.length === 0
                ) {
                  alert("Agregá al menos un hallazgo.");
                  return;
                }

                avanzarA("comportamiento");
              }}
            >
              Continuar
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      )}

      {activeSection === "comportamiento" && (
        <section className="audit-section-card">
          <div className="audit-section-header">
            <div className="audit-section-icon behavior">
              <UserRoundCheck size={25} />
            </div>

            <div>
              <span className="step-label">Sección B</span>
              <h3>Comportamiento</h3>

              <p>
                Observá cómo se ejecuta realmente la tarea e identificá
                comportamientos que puedan generar exposición al riesgo.
              </p>
            </div>
          </div>

          <div className="audit-question">
            <div>
              <span className="question-number">1</span>

              <div>
                <strong>
                  ¿Existen desvíos comportamentales?
                </strong>

                <p>
                  Evaluá prácticas inseguras o diferencias respecto a la forma
                  segura de realizar la tarea.
                </p>
              </div>
            </div>

            <div className="yes-no-group">
              <button
                type="button"
                className={
                  comportamiento.existeDesvio === "si"
                    ? "choice-button selected danger"
                    : "choice-button"
                }
                onClick={() =>
                  setComportamiento((previous) => ({
                    ...previous,
                    existeDesvio: "si",
                  }))
                }
              >
                Sí
              </button>

              <button
                type="button"
                className={
                  comportamiento.existeDesvio === "no"
                    ? "choice-button selected success"
                    : "choice-button"
                }
                onClick={() =>
                  setComportamiento({
                    existeDesvio: "no",
                    hallazgos: [],
                  })
                }
              >
                No
              </button>
            </div>
          </div>

          {comportamiento.existeDesvio === "si" && (
            <div className="conditional-area">
              <div className="conditional-title">
                <span className="question-number">2</span>

                <div>
                  <strong>
                    ¿Cuáles desvíos comportamentales observaste?
                  </strong>

                  <p>
                    Registrá cada comportamiento como un hallazgo independiente.
                  </p>
                </div>
              </div>

              <div className="finding-entry-card">
                <label className="form-field">
                  <span>Descripción del desvío</span>

                  <textarea
                    value={nuevoHallazgoComportamiento.descripcion}
                    onChange={(event) =>
                      setNuevoHallazgoComportamiento((previous) => ({
                        ...previous,
                        descripcion: event.target.value,
                      }))
                    }
                    rows="4"
                  />
                </label>

                <div className="finding-options-grid single">
                  <label className="form-field">
                    <span>Criticidad</span>

                    <select
                      value={nuevoHallazgoComportamiento.criticidad}
                      onChange={(event) =>
                        setNuevoHallazgoComportamiento((previous) => ({
                          ...previous,
                          criticidad: event.target.value,
                        }))
                      }
                    >
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                      <option value="Crítica">Crítica</option>
                    </select>
                  </label>
                </div>

                <div className="finding-entry-actions">
                  <button
                    type="button"
                    className="evidence-button"
                    onClick={() =>
                      alert(
                        "La carga de fotografías la conectaremos cuando agreguemos almacenamiento."
                      )
                    }
                  >
                    <Camera size={18} />
                    Agregar evidencia
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={agregarHallazgoComportamiento}
                  >
                    <Plus size={18} />
                    Agregar desvío
                  </button>
                </div>
              </div>

              {comportamiento.hallazgos.length > 0 && (
                <div className="findings-list">
                  <div className="findings-list-title">
                    <strong>
                      Desvíos registrados (
                      {comportamiento.hallazgos.length})
                    </strong>
                  </div>

                  {comportamiento.hallazgos.map((hallazgo, index) => (
                    <article className="finding-item" key={hallazgo.id}>
                      <div className="finding-index">
                        {index + 1}
                      </div>

                      <div className="finding-item-content">
                        <div className="finding-item-top">
                          <p>{hallazgo.descripcion}</p>

                          <button
                            type="button"
                            className="icon-delete-button"
                            onClick={() =>
                              eliminarHallazgoComportamiento(
                                hallazgo.id
                              )
                            }
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>

                        <div className="finding-tags">
                          <span
                            className={`criticality-tag ${hallazgo.criticidad.toLowerCase()}`}
                          >
                            {hallazgo.criticidad}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="audit-navigation">
            <button
              type="button"
              className="secondary-button"
              onClick={() => avanzarA("condiciones")}
            >
              <ArrowLeft size={18} />
              Anterior
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (!comportamiento.existeDesvio) {
                  alert(
                    "Indicá si existen desvíos comportamentales."
                  );
                  return;
                }

                if (
                  comportamiento.existeDesvio === "si" &&
                  comportamiento.hallazgos.length === 0
                ) {
                  alert("Agregá al menos un desvío.");
                  return;
                }

                avanzarA("procedimientos");
              }}
            >
              Continuar
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      )}

      {activeSection === "procedimientos" && (
        <section className="audit-section-card">
          <div className="audit-section-header">
            <div className="audit-section-icon procedure">
              <FileCheck2 size={25} />
            </div>

            <div>
              <span className="step-label">Sección C</span>
              <h3>Procedimientos</h3>

              <p>
                Verificá la existencia, vigencia, correspondencia con el
                trabajo real y aplicación del procedimiento.
              </p>
            </div>
          </div>

          <div className="audit-question">
            <div>
              <span className="question-number">1</span>

              <div>
                <strong>
                  ¿Existe un procedimiento para realizar la tarea?
                </strong>

                <p>
                  Verificá que exista un documento o estándar definido para la
                  actividad observada.
                </p>
              </div>
            </div>

            <div className="yes-no-group">
              <button
                type="button"
                className={
                  procedimientos.existeProcedimiento === "si"
                    ? "choice-button selected success"
                    : "choice-button"
                }
                onClick={() =>
                  setProcedimientos((previous) => ({
                    ...previous,
                    existeProcedimiento: "si",
                    responsable: "",
                    tipoAccion: "",
                  }))
                }
              >
                Sí
              </button>

              <button
                type="button"
                className={
                  procedimientos.existeProcedimiento === "no"
                    ? "choice-button selected danger"
                    : "choice-button"
                }
                onClick={() =>
                  setProcedimientos((previous) => ({
                    ...previous,
                    existeProcedimiento: "no",
                    estaActualizado: "",
                    reflejaRealidad: "",
                    conoceYAplica: "",
                    tipoAccion: "Elaborar procedimiento",
                  }))
                }
              >
                No
              </button>
            </div>
          </div>

          {procedimientos.existeProcedimiento === "si" && (
            <>
              <div className="audit-question">
                <div>
                  <span className="question-number">2</span>

                  <div>
                    <strong>
                      ¿El procedimiento está actualizado?
                    </strong>

                    <p>
                      Verificá que la versión vigente corresponda al proceso,
                      equipo y condiciones actuales.
                    </p>
                  </div>
                </div>

                <div className="yes-no-group">
                  <button
                    type="button"
                    className={
                      procedimientos.estaActualizado === "si"
                        ? "choice-button selected success"
                        : "choice-button"
                    }
                    onClick={() =>
                      setProcedimientos((previous) => ({
                        ...previous,
                        estaActualizado: "si",
                      }))
                    }
                  >
                    Sí
                  </button>

                  <button
                    type="button"
                    className={
                      procedimientos.estaActualizado === "no"
                        ? "choice-button selected danger"
                        : "choice-button"
                    }
                    onClick={() =>
                      setProcedimientos((previous) => ({
                        ...previous,
                        estaActualizado: "no",
                        tipoAccion: "Actualizar procedimiento",
                      }))
                    }
                  >
                    No
                  </button>
                </div>
              </div>

              <div className="audit-question">
                <div>
                  <span className="question-number">3</span>

                  <div>
                    <strong>
                      ¿El procedimiento refleja la forma real en que se ejecuta
                      la tarea?
                    </strong>

                    <p>
                      Compará lo documentado con la ejecución observada
                      directamente en el Gemba.
                    </p>
                  </div>
                </div>

                <div className="yes-no-group">
                  <button
                    type="button"
                    className={
                      procedimientos.reflejaRealidad === "si"
                        ? "choice-button selected success"
                        : "choice-button"
                    }
                    onClick={() =>
                      setProcedimientos((previous) => ({
                        ...previous,
                        reflejaRealidad: "si",
                      }))
                    }
                  >
                    Sí
                  </button>

                  <button
                    type="button"
                    className={
                      procedimientos.reflejaRealidad === "no"
                        ? "choice-button selected danger"
                        : "choice-button"
                    }
                    onClick={() =>
                      setProcedimientos((previous) => ({
                        ...previous,
                        reflejaRealidad: "no",
                        tipoAccion:
                          "Adecuar procedimiento al proceso real",
                      }))
                    }
                  >
                    No
                  </button>
                </div>
              </div>

              <div className="audit-question">
                <div>
                  <span className="question-number">4</span>

                  <div>
                    <strong>
                      ¿El colaborador conoce y aplica el procedimiento?
                    </strong>

                    <p>
                      Validá el conocimiento del estándar y su aplicación
                      durante la ejecución de la tarea.
                    </p>
                  </div>
                </div>

                <div className="yes-no-group">
                  <button
                    type="button"
                    className={
                      procedimientos.conoceYAplica === "si"
                        ? "choice-button selected success"
                        : "choice-button"
                    }
                    onClick={() =>
                      setProcedimientos((previous) => ({
                        ...previous,
                        conoceYAplica: "si",
                      }))
                    }
                  >
                    Sí
                  </button>

                  <button
                    type="button"
                    className={
                      procedimientos.conoceYAplica === "parcialmente"
                        ? "choice-button selected danger"
                        : "choice-button"
                    }
                    onClick={() =>
                      setProcedimientos((previous) => ({
                        ...previous,
                        conoceYAplica: "parcialmente",
                        tipoAccion:
                          "Reinducción / capacitación",
                      }))
                    }
                  >
                    Parcialmente
                  </button>

                  <button
                    type="button"
                    className={
                      procedimientos.conoceYAplica === "no"
                        ? "choice-button selected danger"
                        : "choice-button"
                    }
                    onClick={() =>
                      setProcedimientos((previous) => ({
                        ...previous,
                        conoceYAplica: "no",
                        tipoAccion: "Capacitación",
                      }))
                    }
                  >
                    No
                  </button>
                </div>
              </div>
            </>
          )}

          {requiereAccionProcedimiento && (
            <div className="procedure-action-box">
              <AlertTriangle size={22} />

              <div>
                <strong>Se requiere generar una acción.</strong>

                <p>
                  El desvío detectado será incorporado al Plan de Acción para
                  asegurar su seguimiento y cierre.
                </p>

                <div className="form-grid">
                  <label className="form-field">
                    <span>Tipo de acción</span>

                    <select
                      value={procedimientos.tipoAccion}
                      onChange={(event) =>
                        setProcedimientos((previous) => ({
                          ...previous,
                          tipoAccion: event.target.value,
                        }))
                      }
                    >
                      <option value="">Seleccionar acción</option>

                      <option value="Elaborar procedimiento">
                        Elaborar procedimiento
                      </option>

                      <option value="Actualizar procedimiento">
                        Actualizar procedimiento
                      </option>

                      <option value="Adecuar procedimiento al proceso real">
                        Adecuar procedimiento al proceso real
                      </option>

                      <option value="Capacitación">
                        Capacitación
                      </option>

                      <option value="Reinducción / capacitación">
                        Reinducción / capacitación
                      </option>

                      <option value="Revisión con supervisor">
                        Revisión con supervisor
                      </option>

                      <option value="Otra">
                        Otra
                      </option>
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Responsable</span>

                    <input
                      type="text"
                      value={procedimientos.responsable}
                      onChange={(event) =>
                        setProcedimientos((previous) => ({
                          ...previous,
                          responsable: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {procedimientos.existeProcedimiento && (
            <div className="procedure-observations">
              <label className="form-field">
                <span>Observaciones adicionales</span>

                <textarea
                  rows="4"
                  value={procedimientos.observaciones}
                  onChange={(event) =>
                    setProcedimientos((previous) => ({
                      ...previous,
                      observaciones: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
          )}

          <div className="audit-navigation">
            <button
              type="button"
              className="secondary-button"
              onClick={() => avanzarA("comportamiento")}
            >
              <ArrowLeft size={18} />
              Anterior
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={finalizarSeguridad}
            >
              <CheckCircle2 size={18} />
              Completar Seguridad
            </button>
          </div>
        </section>
      )}
    </>
  );
}

export default Seguridad;
