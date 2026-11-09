                  style={{
                    color: "#667085",
                    fontSize: "13px",
                    margin: "6px 0 18px",
                  }}
                >
                  Se creará como Pendiente de asignación.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAccionParaMantenimiento(null)}
                disabled={enviandoMantenimiento}
                style={{
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <strong>Equipo</strong>
                <div>{accionParaMantenimiento.equipo}</div>
              </div>

              <div>
                <strong>Causa / Hallazgo</strong>
                <div>{accionParaMantenimiento.causa}</div>
              </div>

              <div>
                <strong>Qué / Trabajo a realizar</strong>
                <div>{accionParaMantenimiento.que}</div>
              </div>

              <label>
                <strong
                  style={{
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Prioridad
                </strong>

                <select
                  value={prioridadMantenimiento}
                  onChange={(event) =>
                    setPrioridadMantenimiento(event.target.value)
                  }
                  disabled={enviandoMantenimiento}
                  style={{
                    width: "100%",
                    minHeight: "42px",
                    border: "1px solid #d0d5dd",
                    borderRadius: "8px",
                    padding: "0 10px",
                    background: "#fff",
                  }}
                >
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                  <option value="Crítica">Crítica</option>
                </select>
              </label>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={() => setAccionParaMantenimiento(null)}
                disabled={enviandoMantenimiento}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={enviarAMantenimiento}
                disabled={enviandoMantenimiento}
              >
                <Wrench size={17} />
                {enviandoMantenimiento
                  ? "Enviando..."
                  : "Enviar a Mantenimiento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PlanAccion;
