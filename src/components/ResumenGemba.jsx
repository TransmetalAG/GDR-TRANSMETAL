import React from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Award,
  Gauge,
  Wrench,
  ClipboardCheck,
} from "lucide-react";

function ResumenGemba({
  gembaData,
  moduleResults,
  onBack,
  onConfirm,
}) {
  const seguridad = moduleResults.seguridad;
  const calidad = moduleResults.calidad;
  const proceso = moduleResults.proceso;
  const mantenimiento = moduleResults.mantenimiento;

  const hallazgosSeguridadFisicos =
    seguridad?.condiciones?.hallazgos || [];

  const hallazgosSeguridadComportamiento =
    seguridad?.comportamiento?.hallazgos || [];

  const hallazgosCalidadProducto =
    calidad?.producto?.hallazgos || [];

  const hallazgosCalidadControl =
    calidad?.controlProceso?.hallazgos || [];

  const hallazgosProceso =
    proceso?.hallazgos || [];

  const hallazgosMantenimiento =
    mantenimiento?.hallazgos || [];

  const totalHallazgos =
    hallazgosSeguridadFisicos.length +
    hallazgosSeguridadComportamiento.length +
    hallazgosCalidadProducto.length +
    hallazgosCalidadControl.length +
    hallazgosProceso.length +
    hallazgosMantenimiento.length;

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">
            Gemba completado
          </span>

          <h2>Resumen del Gemba</h2>

          <p>
            Revisá la información registrada antes de confirmar
            el cierre definitivo del recorrido.
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
          <span>Máquina / Equipo</span>
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

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              Resultado del recorrido
            </span>

            <h3>
              {totalHallazgos} hallazgo
              {totalHallazgos === 1 ? "" : "s"} registrado
              {totalHallazgos === 1 ? "" : "s"}
            </h3>
          </div>

          <p>
            Los hallazgos que requieran seguimiento serán
            enviados posteriormente al Plan de Acción o al
            flujo de Mantenimiento.
          </p>
        </div>

        <div className="gemba-module-grid">
          <ResumenModulo
            titulo="Seguridad"
            Icon={ShieldCheck}
            clase="seguridad"
          >
            <ResumenGrupo
              titulo="Condiciones físicas"
              items={hallazgosSeguridadFisicos}
              getTitle={(item) => item.descripcion}
              getTag={(item) => item.criticidad}
            />

            <ResumenGrupo
              titulo="Comportamiento"
              items={hallazgosSeguridadComportamiento}
              getTitle={(item) => item.descripcion}
              getTag={(item) => item.criticidad}
            />

            {seguridad?.procedimientos && (
              <div className="summary-subsection">
                <strong>Procedimientos</strong>

                <p>
                  Existe procedimiento:{" "}
                  {seguridad.procedimientos.existeProcedimiento ===
                  "si"
                    ? "Sí"
                    : "No"}
                </p>

                {seguridad.procedimientos.existeProcedimiento ===
                  "si" && (
                  <>
                    <p>
                      Actualizado:{" "}
                      {seguridad.procedimientos.estaActualizado ===
                      "si"
                        ? "Sí"
                        : "No"}
                    </p>

                    <p>
                      Refleja la realidad:{" "}
                      {seguridad.procedimientos.reflejaRealidad ===
                      "si"
                        ? "Sí"
                        : "No"}
                    </p>

                    <p>
                      Conoce y aplica:{" "}
                      {
                        seguridad.procedimientos
                          .conoceYAplica
                      }
                    </p>
                  </>
                )}
              </div>
            )}
          </ResumenModulo>

          <ResumenModulo
            titulo="Calidad"
            Icon={Award}
            clase="calidad"
          >
            <ResumenGrupo
              titulo="Condición del producto"
              items={hallazgosCalidadProducto}
              getTitle={(item) => item.descripcion}
              getTag={(item) => item.criticidad}
            />

            <ResumenGrupo
              titulo="Control del proceso"
              items={hallazgosCalidadControl}
              getTitle={(item) =>
                item.descripcion
                  ? `${item.tipo}: ${item.descripcion}`
                  : item.tipo
              }
              getTag={(item) => item.criticidad}
            />
          </ResumenModulo>

          <ResumenModulo
            titulo="Proceso / Productividad"
            Icon={Gauge}
            clase="proceso"
          >
            <ResumenGrupo
              titulo="Desperdicios / oportunidades"
              items={hallazgosProceso}
              getTitle={(item) =>
                `${item.tipo}: ${item.descripcion}`
              }
              getTag={(item) => `Impacto ${item.impacto}`}
            />
          </ResumenModulo>

          <ResumenModulo
            titulo="Mantenimiento"
            Icon={Wrench}
            clase="mantenimiento"
          >
            <ResumenGrupo
              titulo="Anomalías"
              items={hallazgosMantenimiento}
              getTitle={(item) => item.descripcion}
              getTag={(item) => item.prioridad}
            />
          </ResumenModulo>
        </div>

        <div className="gemba-bottom-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
            Revisar módulos
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={onConfirm}
          >
            <CheckCircle2 size={18} />
            Confirmar y finalizar Gemba
          </button>
        </div>
      </section>
    </>
  );
}

function ResumenModulo({
  titulo,
  Icon,
  clase,
  children,
}) {
  return (
    <article className="gemba-module-card completed">
      <div className={`module-icon ${clase}`}>
        <Icon size={27} />
      </div>

      <div className="gemba-module-content">
        <div className="module-title-row">
          <h4>{titulo}</h4>

          <span className="status-pill completed">
            <CheckCircle2 size={13} />
            Completado
          </span>
        </div>

        <div style={{ marginTop: "14px" }}>
          {children}
        </div>
      </div>
    </article>
  );
}

function ResumenGrupo({
  titulo,
  items,
  getTitle,
  getTag,
}) {
  return (
    <div
      className="summary-subsection"
      style={{ marginBottom: "14px" }}
    >
      <strong>{titulo}</strong>

      {items.length === 0 ? (
        <p style={{ marginTop: "6px" }}>
          Sin hallazgos.
        </p>
      ) : (
        <div style={{ marginTop: "8px" }}>
          {items.map((item, index) => (
            <div
              key={item.id || index}
              className="finding-item"
              style={{
                padding: "10px",
                marginBottom: "8px",
              }}
            >
              <div className="finding-index">
                {index + 1}
              </div>

              <div className="finding-item-content">
                <p style={{ margin: 0 }}>
                  {getTitle(item)}
                </p>

                {getTag && (
                  <div className="finding-tags">
                    <span className="status-pill">
                      {getTag(item)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ResumenGemba;
