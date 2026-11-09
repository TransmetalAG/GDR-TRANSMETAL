            </span>

            <h3>
              Módulos del Gemba
            </h3>
          </div>

          <p>
            {currentDate}
          </p>
        </div>

        <div className="gemba-module-grid">
          {modules.map((module) => {
            const Icon =
              module.icon;

            const completed =
              module.status ===
              "Completado";

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
                  onOpenModule(
                    module.id
                  )
                }
              >
                <div
                  className={`module-icon ${module.id}`}
                >
                  <Icon size={27} />
                </div>

                <div className="gemba-module-content">
                  <div className="module-title-row">
                    <h4>
                      {module.name}
                    </h4>

                    <span
                      className={
                        completed
                          ? "status-pill completed"
                          : "status-pill"
                      }
                    >
                      {completed && (
                        <CheckCircle2
                          size={13}
                        />
                      )}

                      {module.status}
                    </span>
                  </div>

                  <p>
                    {
                      module.description
                    }
                  </p>

                  <span className="enter-module">
                    {completed
                      ? "Revisar nuevamente"
                      : "Iniciar revisión"}

                    <ArrowRight
                      size={17}
                    />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="gemba-bottom-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onBack}
          >
            <ArrowLeft size={18} />

            Editar datos generales
          </button>

          {allModulesCompleted ? (
            <button
              type="button"
              className="primary-button"
              onClick={onFinish}
            >
              <CheckCircle2
                size={18}
              />

              Finalizar Gemba

              <ArrowRight
                size={18}
              />
            </button>
          ) : (
            <div className="gemba-progress">
              <strong>
                {completedModules} de 4
              </strong>

              <span>
                módulos revisados
              </span>
            </div>
          )}
        </div>
      </section>
    </>
  );
