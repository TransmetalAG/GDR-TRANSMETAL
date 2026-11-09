                        padding: "28px",
                        textAlign: "center",
                        color: "#667085",
                      }}
                    >
                      No hay Gembas en el período seleccionado.
                    </td>
                  </tr>
                )}

              {cargando && (
                <tr>
                  <td
                    colSpan="7"
                    style={{
                      padding: "28px",
                      textAlign: "center",
                      color: "#667085",
                    }}
                  >
                    Cargando información...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="section-block"
        style={{
          marginTop: "18px",
        }}
      >
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
            Cuatro enfoques para observar el trabajo real e
            identificar oportunidades de mejora.
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

const cellStyle = {
  padding: "12px",
  borderBottom: "1px solid #eef2f6",
  fontSize: "12px",
  verticalAlign: "top",
};

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
