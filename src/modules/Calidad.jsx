import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  ClipboardCheck,
  Plus,
  Trash2,
  Camera,
  CheckCircle2,
} from "lucide-react";

function Calidad({
  gembaData,
  initialData,
  onBack,
  onComplete,
}) {
  const [activeSection, setActiveSection] = useState("producto");

  const [producto, setProducto] = useState(
    initialData?.producto || {
      existenDesvios: "",
      hallazgos: [],
    }
  );

  const [controlProceso, setControlProceso] = useState(
    initialData?.controlProceso || {
      controlesCorrectos: "",
      hallazgos: [],
    }
  );

  const [nuevoHallazgoProducto, setNuevoHallazgoProducto] = useState({
    descripcion: "",
    criticidad: "Media",
  });

  const [nuevoHallazgoControl, setNuevoHallazgoControl] = useState({
    tipo: "",
    descripcion: "",
    criticidad: "Media",
  });

  const tiposDesvioControl = [
    "Medición no realizada",
    "Frecuencia de inspección incumplida",
    "Instrumento no disponible",
    "Instrumento inadecuado",
    "Instrumento con calibración vencida",
    "Registro incompleto o inexistente",
    "Parámetro fuera de especificación",
    "Criterio de aceptación no definido",
    "Otro",
  ];

  function avanzarA(seccion) {
    setActiveSection(seccion);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function agregarHallazgoProducto() {
    if (!nuevoHallazgoProducto.descripcion.trim()) {
      alert("Escribí la desviación o defecto antes de agregarlo.");
      return;
    }

    setProducto((previous) => ({
      ...previous,
      hallazgos: [
        ...previous.hallazgos,
        {
          id: Date.now(),
          ...nuevoHallazgoProducto,
        },
      ],
    }));

    setNuevoHallazgoProducto({
      descripcion: "",
      criticidad: "Media",
    });
  }

  function eliminarHallazgoProducto(id) {
    setProducto((previous) => ({
      ...previous,
      hallazgos: previous.hallazgos.filter(
        (hallazgo) => hallazgo.id !== id
      ),
    }));
  }

  function agregarHallazgoControl() {
    if (!nuevoHallazgoControl.tipo) {
      alert("Seleccioná el tipo de desviación.");
      return;
    }

    if (
      nuevoHallazgoControl.tipo === "Otro" &&
      !nuevoHallazgoControl.descripcion.trim()
    ) {
      alert("Describí la desviación observada.");
      return;
    }

    setControlProceso((previous) => ({
      ...previous,
      hallazgos: [
        ...previous.hallazgos,
        {
          id: Date.now(),
          ...nuevoHallazgoControl,
        },
      ],
    }));

    setNuevoHallazgoControl({
      tipo: "",
      descripcion: "",
      criticidad: "Media",
    });
  }

  function eliminarHallazgoControl(id) {
    setControlProceso((previous) => ({
      ...previous,
      hallazgos: previous.hallazgos.filter(
        (hallazgo) => hallazgo.id !== id
      ),
    }));
  }

  function finalizarCalidad() {
    if (!producto.existenDesvios) {
      alert("Completá la revisión de Condición del Producto.");
      avanzarA("producto");
      return;
    }

    if (
      producto.existenDesvios === "si" &&
      producto.hallazgos.length === 0
    ) {
      alert("Agregá al menos un hallazgo de producto.");
      avanzarA("producto");
      return;
    }

    if (!controlProceso.controlesCorrectos) {
      alert("Completá la revisión de Control del Proceso.");
      avanzarA("control");
      return;
    }

    if (
      controlProceso.controlesCorrectos === "no" &&
      controlProceso.hallazgos.length === 0
    ) {
      alert("Agregá al menos una desviación de control del proceso.");
      avanzarA("control");
      return;
    }

    const resultadoCalidad = {
      producto,
      controlProceso,
    };

    onComplete(resultadoCalidad);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Gemba · Calidad</span>
          <h2>Revisión de Calidad</h2>

          <p>
            Evaluá la condición del producto y la correcta ejecución de los
            controles establecidos en el proceso.
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
            activeSection === "producto"
              ? "safety-step active"
              : "safety-step"
          }
          onClick={() => avanzarA("producto")}
        >
          <span className="safety-step-number">A</span>

          <div>
            <strong>Condición del producto</strong>
            <small>Defectos y desviaciones visibles</small>
          </div>
        </button>

        <button
          className={
            activeSection === "control"
              ? "safety-step active"
              : "safety-step"
          }
          onClick={() => avanzarA("control")}
        >
          <span className="safety-step-number">B</span>

          <div>
            <strong>Control del proceso</strong>
            <small>Controles, mediciones y registros</small>
          </div>
        </button>
      </section>

      {activeSection === "producto" && (
        <section className="audit-section-card">
          <div className="audit-section-header">
            <div className="audit-section-icon behavior">
              <Award size={25} />
            </div>

            <div>
              <span className="step-label">Sección A</span>
              <h3>Condición del producto</h3>

              <p>
                Observá el producto y verificá si existen defectos,
                desviaciones o condiciones fuera de lo esperado.
              </p>
            </div>
          </div>

          <div className="audit-question">
            <div>
              <span className="question-number">1</span>

              <div>
                <strong>
                  ¿Se observan desviaciones o defectos en el producto?
                </strong>

                <p>
                  Considerá apariencia, dimensiones, acabado, soldadura,
                  pintura, perforaciones, deformaciones u otras condiciones.
                </p>
              </div>
            </div>

            <div className="yes-no-group">
              <button
                type="button"
                className={
                  producto.existenDesvios === "si"
                    ? "choice-button selected danger"
                    : "choice-button"
                }
                onClick={() =>
                  setProducto((previous) => ({
                    ...previous,
                    existenDesvios: "si",
                  }))
                }
              >
                Sí
              </button>

              <button
                type="button"
                className={
                  producto.existenDesvios === "no"
                    ? "choice-button selected success"
                    : "choice-button"
                }
                onClick={() =>
                  setProducto({
                    existenDesvios: "no",
                    hallazgos: [],
                  })
                }
              >
                No
              </button>
            </div>
          </div>

          {producto.existenDesvios === "si" && (
            <div className="conditional-area">
              <div className="conditional-title">
                <span className="question-number">2</span>

                <div>
                  <strong>
                    ¿Qué desviaciones o defectos observaste?
                  </strong>

                  <p>
                    Registrá cada hallazgo de forma independiente.
                  </p>
                </div>
              </div>

              <div className="finding-entry-card">
                <label className="form-field">
                  <span>Descripción del hallazgo</span>

                  <textarea
                    rows="4"
                    value={nuevoHallazgoProducto.descripcion}
                    onChange={(event) =>
                      setNuevoHallazgoProducto((previous) => ({
                        ...previous,
                        descripcion: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="finding-options-grid single">
                  <label className="form-field">
                    <span>Criticidad</span>

                    <select
                      value={nuevoHallazgoProducto.criticidad}
                      onChange={(event) =>
                        setNuevoHallazgoProducto((previous) => ({
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
                        "La carga de fotografías se conectará posteriormente."
                      )
                    }
                  >
                    <Camera size={18} />
                    Agregar evidencia
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={agregarHallazgoProducto}
                  >
                    <Plus size={18} />
                    Agregar hallazgo
                  </button>
                </div>
              </div>

              {producto.hallazgos.length > 0 && (
                <div className="findings-list">
                  <div className="findings-list-title">
                    <strong>
                      Hallazgos registrados ({producto.hallazgos.length})
                    </strong>
                  </div>

                  {producto.hallazgos.map((hallazgo, index) => (
                    <article className="finding-item" key={hallazgo.id}>
                      <div className="finding-index">{index + 1}</div>

                      <div className="finding-item-content">
                        <div className="finding-item-top">
                          <p>{hallazgo.descripcion}</p>

                          <button
                            type="button"
                            className="icon-delete-button"
                            onClick={() =>
                              eliminarHallazgoProducto(hallazgo.id)
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
                if (!producto.existenDesvios) {
                  alert(
                    "Indicá si existen desviaciones o defectos en el producto."
                  );
                  return;
                }

                if (
                  producto.existenDesvios === "si" &&
                  producto.hallazgos.length === 0
                ) {
                  alert("Agregá al menos un hallazgo.");
                  return;
                }

                avanzarA("control");
              }}
            >
              Continuar
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      )}

      {activeSection === "control" && (
        <section className="audit-section-card">
          <div className="audit-section-header">
            <div className="audit-section-icon procedure">
              <ClipboardCheck size={25} />
            </div>

            <div>
              <span className="step-label">Sección B</span>
              <h3>Control del proceso</h3>

              <p>
                Verificá que los controles de calidad definidos se estén
                ejecutando correctamente durante el proceso.
              </p>
            </div>
          </div>

          <div className="audit-question">
            <div>
              <span className="question-number">1</span>

              <div>
                <strong>
                  ¿Los controles de calidad establecidos se están ejecutando
                  correctamente?
                </strong>

                <p>
                  Revisá mediciones, frecuencias, instrumentos, registros y
                  parámetros de proceso.
                </p>
              </div>
            </div>

            <div className="yes-no-group">
              <button
                type="button"
                className={
                  controlProceso.controlesCorrectos === "si"
                    ? "choice-button selected success"
                    : "choice-button"
                }
                onClick={() =>
                  setControlProceso({
                    controlesCorrectos: "si",
                    hallazgos: [],
                  })
                }
              >
                Sí
              </button>

              <button
                type="button"
                className={
                  controlProceso.controlesCorrectos === "no"
                    ? "choice-button selected danger"
                    : "choice-button"
                }
                onClick={() =>
                  setControlProceso((previous) => ({
                    ...previous,
                    controlesCorrectos: "no",
                  }))
                }
              >
                No
              </button>

              <button
                type="button"
                className={
                  controlProceso.controlesCorrectos === "na"
                    ? "choice-button selected success"
                    : "choice-button"
                }
                onClick={() =>
                  setControlProceso({
                    controlesCorrectos: "na",
                    hallazgos: [],
                  })
                }
              >
                No aplica
              </button>
            </div>
          </div>

          {controlProceso.controlesCorrectos === "no" && (
            <div className="conditional-area">
              <div className="conditional-title">
                <span className="question-number">2</span>

                <div>
                  <strong>
                    ¿Qué desviaciones observaste?
                  </strong>

                  <p>
                    Seleccioná el tipo de desviación y agregá información
                    adicional cuando sea necesario.
                  </p>
                </div>
              </div>

              <div className="finding-entry-card">
                <div className="form-grid">
                  <label className="form-field">
                    <span>Tipo de desviación</span>

                    <select
                      value={nuevoHallazgoControl.tipo}
                      onChange={(event) =>
                        setNuevoHallazgoControl((previous) => ({
                          ...previous,
                          tipo: event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        Seleccionar desviación
                      </option>

                      {tiposDesvioControl.map((tipo) => (
                        <option value={tipo} key={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Criticidad</span>

                    <select
                      value={nuevoHallazgoControl.criticidad}
                      onChange={(event) =>
                        setNuevoHallazgoControl((previous) => ({
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

                <label
                  className="form-field"
                  style={{ marginTop: "16px" }}
                >
                  <span>Descripción / observación</span>

                  <textarea
                    rows="4"
                    value={nuevoHallazgoControl.descripcion}
                    onChange={(event) =>
                      setNuevoHallazgoControl((previous) => ({
                        ...previous,
                        descripcion: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="finding-entry-actions">
                  <button
                    type="button"
                    className="evidence-button"
                    onClick={() =>
                      alert(
                        "La carga de fotografías se conectará posteriormente."
                      )
                    }
                  >
                    <Camera size={18} />
                    Agregar evidencia
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={agregarHallazgoControl}
                  >
                    <Plus size={18} />
                    Agregar desviación
                  </button>
                </div>
              </div>

              {controlProceso.hallazgos.length > 0 && (
                <div className="findings-list">
                  <div className="findings-list-title">
                    <strong>
                      Desviaciones registradas (
                      {controlProceso.hallazgos.length})
                    </strong>
                  </div>

                  {controlProceso.hallazgos.map((hallazgo, index) => (
                    <article className="finding-item" key={hallazgo.id}>
                      <div className="finding-index">{index + 1}</div>

                      <div className="finding-item-content">
                        <div className="finding-item-top">
                          <div>
                            <p>
                              <strong>{hallazgo.tipo}</strong>
                            </p>

                            {hallazgo.descripcion && (
                              <p>{hallazgo.descripcion}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            className="icon-delete-button"
                            onClick={() =>
                              eliminarHallazgoControl(hallazgo.id)
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
              onClick={() => avanzarA("producto")}
            >
              <ArrowLeft size={18} />
              Anterior
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={finalizarCalidad}
            >
              <CheckCircle2 size={18} />
              Completar Calidad
            </button>
          </div>
        </section>
      )}
    </>
  );
}

export default Calidad;
