
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';

import {
  Factory,
  Plus,
  CheckCircle,
  ShieldCheck,
  Users,
  Search,
  RefreshCw,
  Pencil,
  Save,
  X
} from 'lucide-react';

import './capacitacion.css';

// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================

const initialForm = {
  codigo: '',
  nombre: '',
  area: 'TRANSMETAL',
  procesos: [],
  minimo_operadores: '1',
  requiere_autorizacion: true,
  descripcion: '',
  activo: true
};

function normalize(value) {

  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function Maquinas({
  client,
  role
}) {

  const canEdit = role === 'JEFE_PRODUCCION';

  const [maquinas, setMaquinas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ACTIVAS');
  const [filterProceso, setFilterProceso] =
    useState('TODOS');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [nuevoProceso, setNuevoProceso] =
    useState('');

  const [form, setForm] = useState({
    ...initialForm
  });

  // ==========================================
  // CONSULTAR CATÁLOGO
  // ==========================================

  const cargarMaquinas = useCallback(async () => {

    if (!client || !role) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {

      const { data, error } = await client
        .from('cap_maquinas')
        .select(`
          id,
          codigo,
          nombre,
          area,
          procesos,
          minimo_operadores,
          requiere_autorizacion,
          descripcion,
          activo
        `)
        .order('nombre', {
          ascending: true
        });

      if (error) throw error;

      setMaquinas(data || []);

    } catch (err) {

      setError(
        'No fue posible consultar las máquinas: ' +
        err.message
      );

    } finally {

      setLoading(false);

    }

  }, [client, role]);

  useEffect(() => {

    setMaquinas([]);
    setShowForm(false);
    setSuccess('');

    cargarMaquinas();

  }, [cargarMaquinas]);

  // ==========================================
  // INDICADORES
  // ==========================================

  const indicadores = useMemo(() => {

    const activas = maquinas.filter(
      m => m.activo === true
    );

    const requierenAutorizacion = activas.filter(
      m => m.requiere_autorizacion === true
    );

    return {

      total: maquinas.length,

      activas: activas.length,

      inactivas: maquinas.length - activas.length,

      requierenAutorizacion:
        requierenAutorizacion.length,

      posicionesRequeridas:
        requierenAutorizacion.reduce(
          (sum, m) =>
            sum + Number(m.minimo_operadores || 0),
          0
        )

    };

  }, [maquinas]);

  // ==========================================
  // CATÁLOGO DINÁMICO DE PROCESOS
  // ==========================================

  const procesosDisponibles = useMemo(() => {

    const procesos = new Set();

    maquinas.forEach(m => {

      if (Array.isArray(m.procesos)) {

        m.procesos.forEach(proceso => {

          if (proceso) procesos.add(proceso);

        });

      }

    });

    return [...procesos].sort(
      (a, b) => a.localeCompare(b, 'es')
    );

  }, [maquinas]);

  // ==========================================
  // FILTROS
  // ==========================================

  const filtered = useMemo(() => {

    const term = normalize(search);

    return maquinas.filter(m => {

      if (
        filter === 'ACTIVAS' &&
        !m.activo
      ) return false;

      if (
        filter === 'INACTIVAS' &&
        m.activo
      ) return false;

      if (
        filter === 'AUTORIZACION' &&
        (!m.activo || !m.requiere_autorizacion)
      ) return false;

      if (
        filter === 'SIN_AUTORIZACION' &&
        (!m.activo || m.requiere_autorizacion)
      ) return false;

      if (
        filterProceso !== 'TODOS' &&
        !(m.procesos || []).includes(filterProceso)
      ) return false;

      if (!term) return true;

      return [
        m.codigo,
        m.nombre,
        m.area,
        m.descripcion,
        ...(m.procesos || [])
      ].some(value =>
        normalize(value).includes(term)
      );

    });

  }, [
    maquinas,
    search,
    filter,
    filterProceso
  ]);

  // ==========================================
  // NUEVA MÁQUINA
  // ==========================================

  function nuevaMaquina() {

    if (!canEdit || saving) return;

    setError('');
    setSuccess('');
    setEditingId(null);
    setNuevoProceso('');

    setForm({
      ...initialForm,
      procesos: []
    });

    setShowForm(true);

  }

  // ==========================================
  // EDITAR MÁQUINA
  // ==========================================

  function editarMaquina(maquina) {

    if (!canEdit || saving) return;

    setError('');
    setSuccess('');
    setNuevoProceso('');
    setEditingId(maquina.id);

    setForm({

      codigo: maquina.codigo ?? '',

      nombre: maquina.nombre ?? '',

      area: maquina.area ?? '',

      procesos: Array.isArray(maquina.procesos)
        ? [...maquina.procesos]
        : [],

      minimo_operadores: String(
        maquina.minimo_operadores ?? 1
      ),

      requiere_autorizacion:
        maquina.requiere_autorizacion === true,

      descripcion: maquina.descripcion ?? '',

      activo: maquina.activo === true

    });

    setShowForm(true);

  }

  // ==========================================
  // CONTROL DEL FORMULARIO
  // ==========================================

  function updateField(field, value) {

    setForm(previous => ({
      ...previous,
      [field]: value
    }));

  }

  function cancelarFormulario() {

    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setNuevoProceso('');
    setForm({
      ...initialForm,
      procesos: []
    });
    setError('');

  }

  // ==========================================
  // AGREGAR PROCESOS
  // ==========================================

  function agregarProceso(value) {

    if (!canEdit || saving) return;

    const proceso = String(value || '')
      .trim()
      .toUpperCase();

    if (!proceso) return;

    setForm(previous => {

      const existe = previous.procesos.some(
        p => normalize(p) === normalize(proceso)
      );

      if (existe) return previous;

      return {
        ...previous,
        procesos: [
          ...previous.procesos,
          proceso
        ]
      };

    });

    setNuevoProceso('');

  }

  function retirarProceso(proceso) {

    if (!canEdit || saving) return;

    setForm(previous => ({
      ...previous,
      procesos: previous.procesos.filter(
        p => p !== proceso
      )
    }));

  }

  // ==========================================
  // GUARDAR MÁQUINA
  // ==========================================

  async function guardarMaquina(event) {

    event.preventDefault();

    if (!canEdit || saving || !client) return;

    setError('');
    setSuccess('');

    const codigo = form.codigo
      .trim()
      .toUpperCase();

    const nombre = form.nombre
      .trim()
      .toUpperCase();

    const area = form.area
      .trim()
      .toUpperCase();

    const minimo = Number(
      form.minimo_operadores
    );

    if (!codigo || !nombre || !area) {

      setError(
        'Completa el código, nombre y área.'
      );

      return;

    }

    if (
      form.minimo_operadores.trim() === '' ||
      !Number.isSafeInteger(minimo) ||
      minimo < 0
    ) {

      setError(
        'El mínimo de operadores debe ser ' +
        'un número entero no negativo.'
      );

      return;

    }

    if (
      form.requiere_autorizacion &&
      minimo < 1
    ) {

      setError(
        'Una máquina que requiere autorización ' +
        'debe tener al menos un operador requerido.'
      );

      return;

    }

    const duplicado = maquinas.some(m =>
      normalize(m.codigo) === normalize(codigo) &&
      m.id !== editingId
    );

    if (duplicado) {

      setError(
        'Ya existe una máquina con ese código.'
      );

      return;

    }

    const anterior = maquinas.find(
      m => m.id === editingId
    );

    const payload = {

      codigo,

      nombre,

      area,

      procesos: [
        ...new Set(form.procesos)
      ],

      minimo_operadores: minimo,

      requiere_autorizacion:
        Boolean(form.requiere_autorizacion),

      descripcion:
        form.descripcion.trim() || null,

      activo:
        Boolean(form.activo)

    };

    // Confirmar desactivación

    if (anterior?.activo && !payload.activo) {

      const confirmed = window.confirm(
        `¿Deseas desactivar ${anterior.nombre}? ` +
        'El historial será conservado.'
      );

      if (!confirmed) return;

    }

    // Confirmar reactivación

    if (
      anterior &&
      !anterior.activo &&
      payload.activo
    ) {

      const confirmed = window.confirm(
        `¿Deseas reactivar ${anterior.nombre}? ` +
        'Verifica las capacitaciones y autorizaciones ' +
        'existentes antes de habilitar su operación.'
      );

      if (!confirmed) return;

    }

    // Confirmar cambios de requisitos de seguridad

    if (
      anterior?.requiere_autorizacion &&
      !payload.requiere_autorizacion
    ) {

      const confirmed = window.confirm(
        'Estás retirando el requisito de autorización. ' +
        'Confirma que este cambio está respaldado ' +
        'por una evaluación de riesgos aprobada.'
      );

      if (!confirmed) return;

    }

    // Confirmar cambios de polivalencia

    if (
      anterior &&
      Number(anterior.minimo_operadores) !== minimo
    ) {

      const confirmed = window.confirm(
        'El mínimo de operadores cambiará de ' +
        `${anterior.minimo_operadores} a ${minimo}. ` +
        'Esto modificará la meta de polivalencia. ' +
        '¿Deseas continuar?'
      );

      if (!confirmed) return;

    }

    setSaving(true);

    try {

      let response;

      if (editingId) {

        response = await client
          .from('cap_maquinas')
          .update(payload)
          .eq('id', editingId)
          .select('id')
          .single();

      } else {

        response = await client
          .from('cap_maquinas')
          .insert(payload)
          .select('id')
          .single();

      }

      if (response.error) {
        throw response.error;
      }

      setSuccess(
        editingId
          ? 'Máquina actualizada correctamente.'
          : 'Máquina registrada correctamente.'
      );

      setShowForm(false);
      setEditingId(null);
      setNuevoProceso('');

      setForm({
        ...initialForm,
        procesos: []
      });

      await cargarMaquinas();

    } catch (err) {

      if (err.code === '23505') {

        setError(
          'El código de máquina ya está registrado.'
        );

      } else {

        setError(
          'No fue posible guardar la máquina: ' +
          err.message
        );

      }

    } finally {

      setSaving(false);

    }

  }

  // ==========================================
  // VERIFICAR SESIÓN
  // ==========================================

  if (!client || !role) {

    return (

      <div className="cap-alert-warning">
        No hay una sesión autorizada de capacitación.
      </div>

    );

  }

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (

    <div className="cap-maquinas">

      {/* ENCABEZADO */}

      <div className="cap-panel cap-toolbar">

        <div>

          <h2>Catálogo de máquinas</h2>

          <p className="cap-muted">
            Equipos, procesos y requisitos de autorización.
          </p>

        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10
        }}>

          <button
            type="button"
            className="cap-secondary"
            onClick={cargarMaquinas}
            disabled={loading || saving}
          >

            <RefreshCw size={16} />
            Actualizar

          </button>

          {canEdit && (

            <button
              type="button"
              className="cap-primary"
              onClick={nuevaMaquina}
              disabled={loading || saving}
            >

              <Plus size={18} />
              Nueva máquina

            </button>

          )}

        </div>

      </div>

      {/* MENSAJES */}

      {error && (

        <div className="cap-error" role="alert">
          {error}
        </div>

      )}

      {success && (

        <div
          className="cap-alert-success"
          role="status"
        >
          {success}
        </div>

      )}

      {/* INDICADORES */}

      <div className="cap-kpi-grid">

        <div className="cap-kpi">

          <Factory size={24} color="#164b83" />

          <div className="cap-kpi-label">
            Total de máquinas
          </div>

          <div className="cap-kpi-value">
            {indicadores.total}
          </div>

          <div className="cap-kpi-description">
            Equipos registrados
          </div>

        </div>

        <div className="cap-kpi cap-kpi-success">

          <CheckCircle size={24} color="#15803d" />

          <div className="cap-kpi-label">
            Máquinas activas
          </div>

          <div className="cap-kpi-value">
            {indicadores.activas}
          </div>

          <div className="cap-kpi-description">
            {indicadores.inactivas} inactivas
          </div>

        </div>

        <div className="cap-kpi cap-kpi-warning">

          <ShieldCheck size={24} color="#b45309" />

          <div className="cap-kpi-label">
            Requieren autorización
          </div>

          <div className="cap-kpi-value">
            {indicadores.requierenAutorizacion}
          </div>

          <div className="cap-kpi-description">
            Máquinas activas sujetas a autorización
          </div>

        </div>

        <div className="cap-kpi">

          <Users size={24} color="#164b83" />

          <div className="cap-kpi-label">
            Posiciones requeridas
          </div>

          <div className="cap-kpi-value">
            {indicadores.posicionesRequeridas}
          </div>

          <div className="cap-kpi-description">
            Suma de mínimos por máquina
          </div>

        </div>

      </div>

      {/* FORMULARIO */}

      {showForm && canEdit && (

        <form
          className="cap-panel"
          onSubmit={guardarMaquina}
        >

          <div className="cap-toolbar">

            <h2>
              {editingId
                ? 'Editar máquina'
                : 'Registrar máquina'}
            </h2>

            <button
              type="button"
              className="cap-secondary"
              onClick={cancelarFormulario}
              disabled={saving}
            >

              <X size={18} />
              Cerrar

            </button>

          </div>

          <div
            className="cap-form-grid"
            style={{ marginTop: 24 }}
          >

            <div className="cap-field">

              <label htmlFor="cap-maq-codigo">
                Código de máquina *
              </label>

              <input
                id="cap-maq-codigo"
                value={form.codigo}
                onChange={e =>
                  updateField('codigo', e.target.value)
                }
                placeholder="Código del equipo"
                required
                disabled={saving}
              />

            </div>

            <div className="cap-field">

              <label htmlFor="cap-maq-nombre">
                Nombre de máquina *
              </label>

              <input
                id="cap-maq-nombre"
                value={form.nombre}
                onChange={e =>
                  updateField('nombre', e.target.value)
                }
                placeholder="Ej. Embutidora 315 T"
                required
                disabled={saving}
              />

            </div>

            <div className="cap-field">

              <label htmlFor="cap-maq-area">
                Área *
              </label>

              <input
                id="cap-maq-area"
                value={form.area}
                onChange={e =>
                  updateField('area', e.target.value)
                }
                required
                disabled={saving}
              />

            </div>

            <div className="cap-field">

              <label htmlFor="cap-maq-minimo">
                Mínimo de operadores *
              </label>

              <input
                id="cap-maq-minimo"
                type="number"
                min={form.requiere_autorizacion ? 1 : 0}
                step="1"
                value={form.minimo_operadores}
                onChange={e =>
                  updateField(
                    'minimo_operadores',
                    e.target.value
                  )
                }
                required
                disabled={saving}
              />

              <span className="cap-muted">
                Meta mínima de cobertura para esta máquina.
              </span>

            </div>

            <div className="cap-field">

              <label htmlFor="cap-maq-autorizacion">
                ¿Requiere autorización?
              </label>

              <select
                id="cap-maq-autorizacion"
                value={
                  form.requiere_autorizacion
                    ? 'SI'
                    : 'NO'
                }
                onChange={e =>
                  updateField(
                    'requiere_autorizacion',
                    e.target.value === 'SI'
                  )
                }
                disabled={saving}
              >

                <option value="SI">
                  Sí, requiere autorización
                </option>

                <option value="NO">
                  No requiere autorización
                </option>

              </select>

            </div>

            {editingId && (

              <div className="cap-field">

                <label htmlFor="cap-maq-estado">
                  Estado de la máquina
                </label>

                <select
                  id="cap-maq-estado"
                  value={
                    form.activo
                      ? 'ACTIVA'
                      : 'INACTIVA'
                  }
                  onChange={e =>
                    updateField(
                      'activo',
                      e.target.value === 'ACTIVA'
                    )
                  }
                  disabled={saving}
                >

                  <option value="ACTIVA">
                    Activa
                  </option>

                  <option value="INACTIVA">
                    Inactiva
                  </option>

                </select>

              </div>

            )}

            {/* PROCESOS ASOCIADOS */}

            <div className="cap-field cap-field-full">

              <label>
                Procesos asociados a la máquina
              </label>

              <p className="cap-muted">
                Una máquina puede participar en
                varios procesos productivos.
              </p>

              {procesosDisponibles.length > 0 && (

                <select
                  aria-label="Seleccionar proceso existente"
                  value=""
                  disabled={saving}
                  onChange={e =>
                    agregarProceso(e.target.value)
                  }
                >

                  <option value="">
                    Seleccionar proceso existente...
                  </option>

                  {procesosDisponibles.map(proceso => (

                    <option
                      key={proceso}
                      value={proceso}
                    >

                      {proceso}

                    </option>

                  ))}

                </select>

              )}

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10
              }}>

                <input
                  style={{ flex: 1 }}
                  value={nuevoProceso}
                  placeholder="Escribir nuevo proceso"
                  disabled={saving}
                  onChange={e =>
                    setNuevoProceso(e.target.value)
                  }
                  onKeyDown={e => {

                    if (e.key === 'Enter') {

                      e.preventDefault();

                      agregarProceso(nuevoProceso);

                    }

                  }}
                />

                <button
                  type="button"
                  className="cap-secondary"
                  disabled={
                    saving || !nuevoProceso.trim()
                  }
                  onClick={() =>
                    agregarProceso(nuevoProceso)
                  }
                >

                  <Plus size={16} />
                  Agregar proceso

                </button>

              </div>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 10
              }}>

                {form.procesos.map(proceso => (

                  <span
                    key={proceso}
                    className={
                      'cap-status cap-status-neutral'
                    }
                  >

                    {proceso}

                    <button
                      type="button"
                      aria-label={`Retirar ${proceso}`}
                      disabled={saving}
                      onClick={() =>
                        retirarProceso(proceso)
                      }
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'inherit',
                        padding: 0,
                        display: 'inline-flex',
                        cursor: 'pointer'
                      }}
                    >

                      <X size={13} />

                    </button>

                  </span>

                ))}

                {form.procesos.length === 0 && (

                  <span className="cap-muted">
                    No hay procesos asociados.
                  </span>

                )}

              </div>

            </div>

            {/* DESCRIPCIÓN */}

            <div className="cap-field cap-field-full">

              <label htmlFor="cap-maq-descripcion">
                Descripción
              </label>

              <textarea
                id="cap-maq-descripcion"
                value={form.descripcion}
                onChange={e =>
                  updateField(
                    'descripcion',
                    e.target.value
                  )
                }
                placeholder={
                  'Descripción del equipo, función ' +
                  'u observaciones operativas...'
                }
                disabled={saving}
              />

            </div>

          </div>

          {!form.requiere_autorizacion && (

            <div className="cap-alert-warning">

              Esta máquina quedará configurada
              sin requisito de autorización.
              Utiliza esta opción únicamente cuando
              corresponda según la evaluación de riesgos.

            </div>

          )}

          {!form.activo && (

            <div className="cap-alert-warning">

              La máquina quedará inactiva.
              Se conservarán sus registros históricos.

            </div>

          )}

          <div className="cap-form-actions">

            <button
              type="button"
              className="cap-secondary"
              onClick={cancelarFormulario}
              disabled={saving}
            >

              <X size={16} />
              Cancelar

            </button>

            <button
              type="submit"
              className="cap-primary"
              disabled={saving}
            >

              <Save size={18} />

              {saving
                ? 'Guardando...'
                : 'Guardar máquina'}

            </button>

          </div>

        </form>

      )}

      {/* CATÁLOGO */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>Máquinas registradas</h2>

          <span className="cap-muted">

            {filtered.length} de {indicadores.total}
            {' '}máquinas

          </span>

        </div>

        {/* BUSCADOR */}

        <div className="cap-search">

          <Search size={18} />

          <input
            value={search}
            onChange={e =>
              setSearch(e.target.value)
            }
            placeholder="Buscar máquina, código o proceso..."
            aria-label="Buscar máquinas"
          />

        </div>

        {/* FILTROS */}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 20
        }}>

          {[
            ['TODAS', 'Todas'],
            ['ACTIVAS', 'Activas'],
            ['INACTIVAS', 'Inactivas'],
            ['AUTORIZACION', 'Requieren autorización'],
            ['SIN_AUTORIZACION', 'Sin autorización requerida']
          ].map(([value, label]) => (

            <button
              type="button"
              key={value}
              className={
                filter === value
                  ? 'cap-primary'
                  : 'cap-secondary'
              }
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
            >

              {label}

            </button>

          ))}

        </div>

        <div
          className="cap-field"
          style={{ maxWidth: 350 }}
        >

          <label htmlFor="cap-maq-filtro-proceso">
            Filtrar por proceso
          </label>

          <select
            id="cap-maq-filtro-proceso"
            value={filterProceso}
            onChange={e =>
              setFilterProceso(e.target.value)
            }
          >

            <option value="TODOS">
              Todos los procesos
            </option>

            {procesosDisponibles.map(proceso => (

              <option
                key={proceso}
                value={proceso}
              >

                {proceso}

              </option>

            ))}

          </select>

        </div>

        {/* TABLA */}

        {loading ? (

          <div
            className="cap-welcome"
            role="status"
          >

            <RefreshCw size={32} />

            <p>Cargando máquinas...</p>

          </div>

        ) : (

          <div className="cap-table-wrap">

            <table>

              <thead>

                <tr>

                  <th>Código</th>
                  <th>Máquina</th>
                  <th>Área</th>
                  <th>Procesos</th>
                  <th>Mínimo operadores</th>
                  <th>Autorización requerida</th>
                  <th>Estado</th>

                  {canEdit && <th>Acciones</th>}

                </tr>

              </thead>

              <tbody>

                {filtered.map(m => (

                  <tr key={m.id}>

                    <td>{m.codigo}</td>

                    <td>

                      <strong>{m.nombre}</strong>

                      {m.descripcion && (

                        <div
                          className="cap-muted"
                          style={{ marginTop: 5 }}
                        >

                          {m.descripcion}

                        </div>

                      )}

                    </td>

                    <td>{m.area || '—'}</td>

                    <td>

                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 5
                      }}>

                        {(m.procesos || []).map(proceso => (

                          <span
                            key={proceso}
                            className={
                              'cap-status cap-status-neutral'
                            }
                          >

                            {proceso}

                          </span>

                        ))}

                        {(!m.procesos ||
                          m.procesos.length === 0) && '—'}

                      </div>

                    </td>

                    <td>

                      <strong>
                        {m.minimo_operadores ?? '—'}
                      </strong>

                    </td>

                    <td>

                      <span className={
                        m.requiere_autorizacion
                          ? 'cap-status cap-status-warning'
                          : 'cap-status cap-status-neutral'
                      }>

                        {m.requiere_autorizacion
                          ? 'REQUERIDA'
                          : 'NO REQUERIDA'}

                      </span>

                    </td>

                    <td>

                      <span className={
                        m.activo
                          ? 'cap-status cap-status-success'
                          : 'cap-status cap-status-neutral'
                      }>

                        {m.activo
                          ? 'ACTIVA'
                          : 'INACTIVA'}

                      </span>

                    </td>

                    {canEdit && (

                      <td>

                        <button
                          type="button"
                          className="cap-secondary"
                          onClick={() =>
                            editarMaquina(m)
                          }
                          disabled={saving}
                          title={`Editar ${m.nombre}`}
                        >

                          <Pencil size={15} />
                          Editar

                        </button>

                      </td>

                    )}

                  </tr>

                ))}

                {filtered.length === 0 && (

                  <tr>

                    <td
                      className="cap-empty"
                      colSpan={canEdit ? 8 : 7}
                    >

                      No se encontraron máquinas.

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>

  );

}
