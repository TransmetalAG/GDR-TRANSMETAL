import React, { useState } from "react";
import {
  ArrowLeft,
  Gauge,
  Plus,
  Trash2,
  Camera,
  CheckCircle2,
} from "lucide-react";

function Proceso({ gembaData, onBack, onComplete }) {
  const [existenDesperdicios, setExistenDesperdicios] = useState("");
  const [hallazgos, setHallazgos] = useState([]);

  const [nuevoHallazgo, setNuevoHallazgo] = useState({
    tipo: "",
    descripcion: "",
    impacto: "Medio",
    perdidaEstimada: "",
  });

  const desperdiciosLean = [
    "Sobreproducción",
    "Espera",
    "Transporte",
    "Sobreprocesamiento",
    "Inventario",
    "Movimiento",
    "Defectos",
    "Talento no utilizado",
  ];

  function agregarHallazgo() {
    if (!nuevoHallazgo.tipo) {
      alert("Seleccioná el tipo de desperdicio.");
      return;
    }

    if (!nuevoHallazgo.descripcion.trim()) {
      alert("Describí la oportunidad o desperdicio observado.");
      return;
    }

    setHallazgos((previous) => [
      ...previous,
      {
        id: Date.now(),
        ...nuevoHallazgo,
      },
    ]);

    setNuevoHallazgo({
      tipo: "",
      descripcion: "",
      impacto: "Medio",
      perdidaEstimada: "",
    });
  }

  function eliminarHallazgo(id) {
    setHallazgos((previous) =>
      previous.filter((hallazgo) => hallazgo.id !== id)
    );
  }

  function finalizarProceso() {
    if (!existenDesperdicios) {
      alert("Indicá si se observan desperdicios o pérdidas en el proceso.");
      return;
    }

    if (existenDesperdicios === "si" && hallazgos.length === 0) {
      alert("Agregá al menos un desperdicio u oportunidad.");
      return;
    }

    onComplete({
      existenDesperdicios,
      hallazgos,
    });
  }

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Gemba · Proceso / Productividad</span>
          <h2>Revisión de Proceso</h2>

          <p>
            Identificá desperdicios, pérdidas y oportunidades de mejora
            directamente en el flujo real de trabajo.
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

      <section className="audit-section-card">
        <div className="audit-section-header">
          <div className="audit-section-icon behavior">
            <Gauge size={25} />
          </div>

          <div>
            <span className="step-label">Proceso / Productividad</span>
            <h3>Desperdicios Lean</h3>

            <p>
              Observá el proceso e identificá actividades que consumen tiempo,
              movimiento o recursos sin agregar valor.
            </p>
          </div>
        </div>

        <div className="audit-question">
          <div>
            <span className="question-number">1</span>

            <div>
              <strong>
                ¿Se observan desperdicios o pérdidas en el proceso?
              </strong>

              <p>
                Considerá los ocho desperdicios Lean durante la observación.
              </p>
            </div>
          </div>

          <div className="yes-no-group">
            <button
              type="button"
              className={
                existenDesperdicios === "si"
                  ? "choice-button selected danger"
                  : "choice-button"
              }
              onClick={() => setExistenDesperdicios("si")}
            >
              Sí
            </button>

            <button
              type="button"
              className={
                existenDesperdicios === "no"
                  ? "choice-button selected success"
                  : "choice-button"
              }
              onClick={() => {
                setExistenDesperdicios("no");
                setHallazgos([]);
              }}
            >
              No
            </button>
          </div>
        </div>

        {existenDesperdicios === "si" && (
          <div className="conditional-area">
            <div className="conditional-title">
              <span className="question-number">2</span>

              <div>
                <strong>
                  ¿Qué desperdicios u oportunidades observaste?
                </strong>

                <p>
                  Registrá cada oportunidad de forma independiente.
                </p>
              </div>
            </div>

            <div className="finding-entry-card">
              <div className="form-grid">
                <label className="form-field">
                  <span>Tipo de desperdicio</span>

                  <select
                    value={nuevoHallazgo.tipo}
                    onChange={(event) =>
                      setNuevoHallazgo((previous) => ({
                        ...previous,
                        tipo: event.target.value,
                      }))
                    }
                  >
                    <option value="">
                      Seleccionar desperdicio
                    </option>

                    {desperdiciosLean.map((desperdicio) => (
                      <option
                        value={desperdicio}
                        key={desperdicio}
                      >
                        {desperdicio}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Impacto</span>

                  <select
                    value={nuevoHallazgo.impacto}
                    onChange={(event) =>
                      setNuevoHallazgo((previous) => ({
                        ...previous,
                        impacto: event.target.value,
                      }))
                    }
                  >
                    <option value="Bajo">Bajo</option>
                    <option value="Medio">Medio</option>
                    <option value="Alto">Alto</option>
                  </select>
                </label>
              </div>

              <label
                className="form-field"
                style={{ marginTop: "16px" }}
              >
                <span>Descripción de la oportunidad</span>

                <textarea
                  rows="4"
                  value={nuevoHallazgo.descripcion}
                  onChange={(event) =>
                    setNuevoHallazgo((previous) => ({
                      ...previous,
                      descripcion: event.target.value,
                    }))
                  }
                />
              </label>

              <label
                className="form-field"
                style={{ marginTop: "16px" }}
              >
                <span>Estimación de pérdida (opcional)</span>

                <input
                  type="text"
                  value={nuevoHallazgo.perdidaEstimada}
                  onChange={(event) =>
                    setNuevoHallazgo((previous) => ({
                      ...previous,
                      perdidaEstimada: event.target.value,
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
                  onClick={agregarHallazgo}
                >
                  <Plus size={18} />
                  Agregar oportunidad
                </button>
              </div>
            </div>

            {hallazgos.length > 0 && (
              <div className="findings-list">
                <div className="findings-list-title">
                  <strong>
                    Oportunidades registradas ({hallazgos.length})
                  </strong>
                </div>

                {hallazgos.map((hallazgo, index) => (
                  <article className="finding-item" key={hallazgo.id}>
                    <div className="finding-index">{index + 1}</div>

                    <div className="finding-item-content">
                      <div className="finding-item-top">
                        <div>
                          <p>
                            <strong>{hallazgo.tipo}</strong>
                          </p>

                          <p>{hallazgo.descripcion}</p>

                          {hallazgo.perdidaEstimada && (
                            <p>
                              <strong>Pérdida estimada:</strong>{" "}
                              {hallazgo.perdidaEstimada}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          className="icon-delete-button"
                          onClick={() =>
                            eliminarHallazgo(hallazgo.id)
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>

                      <div className="finding-tags">
                        <span
                          className={`criticality-tag ${
                            hallazgo.impacto === "Bajo"
                              ? "baja"
                              : hallazgo.impacto === "Medio"
                                ? "media"
                                : "alta"
                          }`}
                        >
                          Impacto {hallazgo.impacto}
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
            onClick={finalizarProceso}
          >
            <CheckCircle2 size={18} />
            Completar Proceso
          </button>
        </div>
      </section>
    </>
  );
}

export default Proceso;
