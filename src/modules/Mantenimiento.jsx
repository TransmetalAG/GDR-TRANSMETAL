import React, { useState } from "react";
import {
  ArrowLeft,
  Wrench,
  Plus,
  Trash2,
  Camera,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

function Mantenimiento({
  gembaData,
  initialData,
  onBack,
  onComplete,
}) {
  const [existenAnomalias, setExistenAnomalias] = useState(
    initialData?.existenAnomalias || ""
  );

  const [hallazgos, setHallazgos] = useState(
    initialData?.hallazgos || []
  );

  const [nuevaAnomalia, setNuevaAnomalia] = useState({
    descripcion: "",
    prioridad: "Media",
  });

  function agregarAnomalia() {
    if (!nuevaAnomalia.descripcion.trim()) {
      alert("Describí la anomalía observada.");
      return;
    }

    setHallazgos((previous) => [
      ...previous,
      {
        id: Date.now(),
        ...nuevaAnomalia,
        descripcion: nuevaAnomalia.descripcion.trim(),
        estado: "Pendiente de planificación",
      },
    ]);

    setNuevaAnomalia({
      descripcion: "",
      prioridad: "Media",
    });
  }

  function eliminarAnomalia(id) {
    setHallazgos((previous) =>
      previous.filter((hallazgo) => hallazgo.id !== id)
    );
  }

  function finalizarMantenimiento() {
    if (!existenAnomalias) {
      alert(
        "Indicá si se observan anomalías en la máquina o equipo."
      );
      return;
    }

    if (
      existenAnomalias === "si" &&
      hallazgos.length === 0
    ) {
      alert("Agregá al menos una anomalía.");
      return;
    }

    onComplete({
      existenAnomalias,
      hallazgos,
    });
  }

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">
            Gemba · Mantenimiento
          </span>

          <h2>Revisión de Mantenimiento</h2>

          <p>
            Identificá anomalías visibles o señales tempranas de
            deterioro que puedan afectar la seguridad,
            confiabilidad o disponibilidad del equipo.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
        >
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

      <section className="audit-section-card">
        <div className="audit-section-header">
          <div className="audit-section-icon safety">
            <Wrench size={25} />
          </div>

          <div>
            <span className="step-label">
              Condición del equipo
            </span>

            <h3>Detección de anomalías</h3>

            <p>
              Observá el equipo durante su operación e identificá
              cualquier condición anormal que requiera revisión o
              intervención de mantenimiento.
            </p>
          </div>
        </div>

        <div className="audit-question">
          <div>
            <span className="question-number">1</span>

            <div>
              <strong>
                ¿Se observan anomalías en la máquina o equipo?
              </strong>

              <p>
                Considerá cualquier condición diferente al
                funcionamiento normal del equipo.
              </p>
            </div>
          </div>

          <div className="yes-no-group">
            <button
              type="button"
              className={
                existenAnomalias === "si"
                  ? "choice-button selected danger"
                  : "choice-button"
              }
              onClick={() =>
                setExistenAnomalias("si")
              }
            >
              Sí
            </button>

            <button
              type="button"
              className={
                existenAnomalias === "no"
                  ? "choice-button selected success"
                  : "choice-button"
              }
              onClick={() => {
                setExistenAnomalias("no");
                setHallazgos([]);

                setNuevaAnomalia({
                  descripcion: "",
                  prioridad: "Media",
                });
              }}
            >
              No
            </button>
          </div>
        </div>

        {existenAnomalias === "si" && (
          <div className="conditional-area">
            <div className="conditional-title">
              <span className="question-number">2</span>

              <div>
                <strong>
                  ¿Qué anomalías observaste?
                </strong>

                <p>
                  Describí cada anomalía de forma independiente
                  para facilitar su posterior planificación,
                  asignación y cierre.
                </p>
              </div>
            </div>

            <div className="finding-entry-card">
              <label className="form-field">
                <span>Descripción de la anomalía</span>

                <textarea
                  rows="4"
                  value={nuevaAnomalia.descripcion}
                  onChange={(event) =>
                    setNuevaAnomalia((previous) => ({
                      ...previous,
                      descripcion: event.target.value,
                    }))
                  }
                />
              </label>

              <div
                className="finding-options-grid single"
                style={{ marginTop: "16px" }}
              >
                <label className="form-field">
                  <span>Prioridad</span>

                  <select
                    value={nuevaAnomalia.prioridad}
                    onChange={(event) =>
                      setNuevaAnomalia((previous) => ({
                        ...previous,
                        prioridad: event.target.value,
                      }))
                    }
                  >
                    <option value="Baja">
                      Baja
                    </option>

                    <option value="Media">
                      Media
                    </option>

                    <option value="Alta">
                      Alta
                    </option>

                    <option value="Crítica">
                      Crítica
                    </option>
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
                  onClick={agregarAnomalia}
                >
                  <Plus size={18} />
                  Agregar anomalía
                </button>
              </div>
            </div>

            {hallazgos.length > 0 && (
              <div className="findings-list">
                <div className="findings-list-title">
                  <strong>
                    Anomalías registradas ({hallazgos.length})
                  </strong>
                </div>

                {hallazgos.map((hallazgo, index) => (
                  <article
                    className="finding-item"
                    key={hallazgo.id}
                  >
                    <div className="finding-index">
                      {index + 1}
                    </div>

                    <div className="finding-item-content">
                      <div className="finding-item-top">
                        <div>
                          <p>
                            {hallazgo.descripcion}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="icon-delete-button"
                          onClick={() =>
                            eliminarAnomalia(
                              hallazgo.id
                            )
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>

                      <div className="finding-tags">
                        <span
                          className={`criticality-tag ${hallazgo.prioridad.toLowerCase()}`}
                        >
                          {hallazgo.prioridad}
                        </span>

                        <span className="maintenance-tag">
                          <Wrench size={13} />
                          Pendiente de planificación
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {hallazgos.length > 0 && (
              <div className="procedure-action-box">
                <AlertTriangle size={22} />

                <div>
                  <strong>
                    Estas anomalías requieren seguimiento.
                  </strong>

                  <p>
                    Al completar el Gemba, las anomalías
                    registradas quedarán disponibles para su
                    planificación, asignación y cierre en el
                    módulo de Mantenimiento.
                  </p>
                </div>
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
            onClick={finalizarMantenimiento}
          >
            <CheckCircle2 size={18} />
            Completar Mantenimiento
          </button>
        </div>
      </section>
    </>
  );
}

export default Mantenimiento;
