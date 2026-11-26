
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';

import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Award,
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
  puesto: '',
  area: 'TRANSMETAL',
  fecha_ingreso: '',
  es_lider: false,
  activo: true,
  observaciones: ''
};

function fechaGuatemala() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const get = type =>
    parts.find(p => p.type === type)?.value;

  return `${get('year')}-${get('month')}-${get('day')}`;
}

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

export default function Colaboradores({
  client,
  role
}) {

  const canEdit = role === 'JEFE_PRODUCCION';

  const [colaboradores, setColaboradores] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ACTIVOS');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    ...initialForm
  });

  // ==========================================
  // CONSULTAR COLABORADORES
  // ==========================================

  const cargarColaboradores = useCallback(async () => {

    if (!client || !role) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {

      const { data, error } = await client
        .from('cap_colaboradores')
        .select(`
          id,
          codigo,
          nombre,
          puesto,
          area,
          fecha_ingreso,
          es_lider,
          activo,
          fecha_baja,
          observaciones
        `)
        .order('nombre', {
          ascending: true
        });

      if (error) throw error;

      setColaboradores(data || []);

    } catch (err) {

      setError(
        'No fue posible consultar los colaboradores: ' +
        err.message
      );

    } finally {

      setLoading(false);

    }

  }, [client, role]);

  useEffect(() => {

    setColaboradores([]);
    setShowForm(false);
    setSuccess('');

    cargarColaboradores();

  }, [cargarColaboradores]);

  // ==========================================
  // INDICADORES
  // ==========================================

  const indicadores = useMemo(() => {

    return {
      total: colaboradores.length,

      activos: colaboradores.filter(
        c => c.activo === true
      ).length,

      inactivos: colaboradores.filter(
        c => c.activo !== true
      ).length,

      lideres: colaboradores.filter(
        c => c.activo && c.es_lider
      ).length
    };

  }, [colaboradores]);

  // ==========================================
  // FILTROS Y BÚSQUEDA
  // ==========================================

  const filtered = useMemo(() => {

    const term = normalize(search);

    return colaboradores.filter(c => {

      if (filter === 'ACTIVOS' && !c.activo) {
        return false;
      }

      if (filter === 'INACTIVOS' && c.activo) {
        return false;
      }

      if (
        filter === 'LIDERES' &&
        (!c.es_lider || !c.activo)
      ) {
        return false;
      }

      if (!term) return true;

      return [
        c.codigo,
        c.nombre,
        c.puesto,
        c.area
      ].some(value =>
        normalize(value).includes(term)
      );

    });

  }, [colaboradores, search, filter]);

  // ==========================================
  // NUEVO COLABORADOR
  // ==========================================

  function nuevoColaborador() {

    if (!canEdit || saving) return;

    setError('');
    setSuccess('');
    setEditingId(null);

    setForm({
      ...initialForm,
      fecha_ingreso: fechaGuatemala()
    });

    setShowForm(true);

  }

  // ==========================================
  // EDITAR COLABORADOR
  // ==========================================

  function editarColaborador(colaborador) {

    if (!canEdit || saving) return;

    setError('');
    setSuccess('');
    setEditingId(colaborador.id);

    setForm({
      codigo: colaborador.codigo ?? '',
      nombre: colaborador.nombre ?? '',
      puesto: colaborador.puesto ?? '',
      area: colaborador.area ?? '',
      fecha_ingreso:
        colaborador.fecha_ingreso ?? '',
      es_lider: colaborador.es_lider === true,
      activo: colaborador.activo === true,
      observaciones:
        colaborador.observaciones ?? ''
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
    setForm({ ...initialForm });
    setError('');

  }

  // ==========================================
  // GUARDAR COLABORADOR
  // ==========================================

  async function guardarColaborador(event) {

    event.preventDefault();

    if (!canEdit || saving || !client) return;

    setError('');
    setSuccess('');

    const codigo = form.codigo.trim();
    const nombre = form.nombre.trim();

    if (
      !codigo ||
      !nombre ||
      !form.puesto.trim() ||
      !form.area.trim()
    ) {

      setError(
        'Completa el código, nombre, puesto y área.'
      );

      return;

    }

    if (
      form.fecha_ingreso &&
      form.fecha_ingreso > fechaGuatemala()
    ) {

      setError(
        'La fecha de ingreso no puede ser futura.'
      );

      return;

    }

    const duplicado = colaboradores.some(c =>
      normalize(c.codigo) === normalize(codigo) &&
      c.id !== editingId
    );

    if (duplicado) {

      setError(
        'Ya existe un colaborador con ese código.'
      );

      return;

    }

    const anterior = colaboradores.find(
      c => c.id === editingId
    );

    const payload = {

      codigo,

      nombre: nombre.toUpperCase(),

      puesto: form.puesto.trim().toUpperCase(),

      area: form.area.trim().toUpperCase(),

      fecha_ingreso:
        form.fecha_ingreso || null,

      es_lider: Boolean(form.es_lider),

      activo: Boolean(form.activo),

      fecha_baja: form.activo
        ? null
        : (
          anterior?.fecha_baja ||
          fechaGuatemala()
        ),

      observaciones:
        form.observaciones.trim() || null

    };

    if (anterior?.activo && !payload.activo) {

      const confirmed = window.confirm(
        `¿Deseas desactivar a ${anterior.nombre}? ` +
        'Sus autorizaciones dejarán de ser operativas.'
      );

      if (!confirmed) return;

    }

    if (anterior && !anterior.activo && payload.activo) {

      const confirmed = window.confirm(
        `¿Deseas reactivar a ${anterior.nombre}? ` +
        'Las autorizaciones anteriores que sigan ' +
        'vigentes podrían volver a ser operativas. ' +
        'Verifica previamente su aptitud y capacitación.'
      );

      if (!confirmed) return;

    }

    setSaving(true);

    try {

      let response;

      if (editingId) {

        response = await client
          .from('cap_colaboradores')
          .update(payload)
          .eq('id', editingId)
          .select('id')
          .single();

      } else {

        response = await client
          .from('cap_colaboradores')
          .insert(payload)
          .select('id')
          .single();

      }

      if (response.error) {
        throw response.error;
      }

      setSuccess(
        editingId
          ? 'Colaborador actualizado correctamente.'
          : 'Colaborador registrado correctamente.'
      );

      setShowForm(false);
      setEditingId(null);
      setForm({ ...initialForm });

      await cargarColaboradores();

    } catch (err) {

      if (err.code === '23505') {

        setError(
          'El código del colaborador ya está registrado.'
        );

      } else {

        setError(
          'No fue posible guardar el colaborador: ' +
          err.message
        );

      }

    } finally {

      setSaving(false);

    }

  }

  // ==========================================
  // FORMATO DE FECHAS
  // ==========================================

  function formatDate(value) {

    if (!value) return '—';

    const [year, month, day] =
      String(value).split('-');

    return `${day}/${month}/${year}`;

  }

  // ==========================================
  // INTERFAZ
  // ==========================================

  if (!client || !role) {

    return (
      <div className="cap-alert-warning">
        No hay una sesión autorizada de capacitación.
      </div>
    );

  }

  return (

    <div className="cap-colaboradores">

      {/* ENCABEZADO */}

      <div className="cap-panel cap-toolbar">

        <div>

          <h2>Gestión de colaboradores</h2>

          <p className="cap-muted">
            Catálogo de personal y líderes de capacitación.
          </p>

        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10
          }}
        >

          <button
            type="button"
            className="cap-secondary"
            disabled={loading || saving}
            onClick={cargarColaboradores}
          >

            <RefreshCw size={16} />
            Actualizar

          </button>

          {canEdit && (

            <button
              type="button"
              className="cap-primary"
              onClick={nuevoColaborador}
              disabled={saving || loading}
            >

              <UserPlus size={18} />
              Nuevo colaborador

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

          <Users size={23} color="#164b83" />

          <div className="cap-kpi-label">
            Total colaboradores
          </div>

          <div className="cap-kpi-value">
            {indicadores.total}
          </div>

          <div className="cap-kpi-description">
            Personal registrado
          </div>

        </div>

        <div className="cap-kpi cap-kpi-success">

          <UserCheck size={23} color="#15803d" />

          <div className="cap-kpi-label">
            Colaboradores activos
          </div>

          <div className="cap-kpi-value">
            {indicadores.activos}
          </div>

          <div className="cap-kpi-description">
            Personal activo en el catálogo
          </div>

        </div>

        <div className="cap-kpi cap-kpi-warning">

          <Award size={23} color="#b45309" />

          <div className="cap-kpi-label">
            Líderes activos
          </div>

          <div className="cap-kpi-value">
            {indicadores.lideres}
          </div>

          <div className="cap-kpi-description">
            Responsables de capacitación
          </div>

        </div>

        <div className="cap-kpi cap-kpi-danger">

          <UserX size={23} color="#b91c1c" />

          <div className="cap-kpi-label">
            Colaboradores inactivos
          </div>

          <div className="cap-kpi-value">
            {indicadores.inactivos}
          </div>

          <div className="cap-kpi-description">
            Historial conservado
          </div>

        </div>

      </div>

      {/* FORMULARIO */}

      {showForm && canEdit && (

        <form
          className="cap-panel"
          onSubmit={guardarColaborador}
        >

          <div className="cap-toolbar">

            <h2>

              {editingId
                ? 'Editar colaborador'
                : 'Registrar colaborador'}

            </h2>

            <button
              type="button"
              className="cap-secondary"
              disabled={saving}
              onClick={cancelarFormulario}
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

              <label htmlFor="cap-col-codigo">
                Código de colaborador *
              </label>

              <input
                id="cap-col-codigo"
                value={form.codigo}
                onChange={e =>
                  updateField('codigo', e.target.value)
                }
                placeholder="Código de empleado"
                required
                disabled={saving}
              />

            </div>

            <div className="cap-field">

              <label htmlFor="cap-col-nombre">
                Nombre completo *
              </label>

              <input
                id="cap-col-nombre"
                value={form.nombre}
                onChange={e =>
                  updateField('nombre', e.target.value)
                }
                placeholder="Nombres y apellidos"
                required
                disabled={saving}
              />

            </div>

            <div className="cap-field">

              <label htmlFor="cap-col-puesto">
                Puesto *
              </label>

              <input
                id="cap-col-puesto"
                value={form.puesto}
                onChange={e =>
                  updateField('puesto', e.target.value)
                }
                placeholder="Puesto de trabajo"
                required
                disabled={saving}
              />

            </div>

            <div className="cap-field">

              <label htmlFor="cap-col-area">
                Área *
              </label>

              <input
                id="cap-col-area"
                value={form.area}
                onChange={e =>
                  updateField('area', e.target.value)
                }
                required
                disabled={saving}
              />

            </div>

            <div className="cap-field">

              <label htmlFor="cap-col-ingreso">
                Fecha de ingreso
              </label>

              <input
                id="cap-col-ingreso"
                type="date"
                value={form.fecha_ingreso}
                max={fechaGuatemala()}
                onChange={e =>
                  updateField(
                    'fecha_ingreso',
                    e.target.value
                  )
                }
                disabled={saving}
              />

            </div>

            <div className="cap-field">

              <label htmlFor="cap-col-lider">
                Clasificación
              </label>

              <select
                id="cap-col-lider"
                value={form.es_lider ? 'SI' : 'NO'}
                onChange={e =>
                  updateField(
                    'es_lider',
                    e.target.value === 'SI'
                  )
                }
                disabled={saving}
              >

                <option value="NO">
                  Colaborador
                </option>

                <option value="SI">
                  Líder de capacitación
                </option>

              </select>

            </div>

            {editingId && (

              <div className="cap-field">

                <label htmlFor="cap-col-estado">
                  Estado del colaborador
                </label>

                <select
                  id="cap-col-estado"
                  value={
                    form.activo
                      ? 'ACTIVO'
                      : 'INACTIVO'
                  }
                  onChange={e =>
                    updateField(
                      'activo',
                      e.target.value === 'ACTIVO'
                    )
                  }
                  disabled={saving}
                >

                  <option value="ACTIVO">
                    Activo
                  </option>

                  <option value="INACTIVO">
                    Inactivo
                  </option>

                </select>

              </div>

            )}

            <div className="cap-field cap-field-full">

              <label htmlFor="cap-col-observaciones">
                Observaciones
              </label>

              <textarea
                id="cap-col-observaciones"
                value={form.observaciones}
                onChange={e =>
                  updateField(
                    'observaciones',
                    e.target.value
                  )
                }
                placeholder="Observaciones administrativas..."
                disabled={saving}
              />

            </div>

          </div>

          {!form.activo && (

            <div className="cap-alert-warning">

              El colaborador quedará inactivo.
              Su historial será conservado y sus
              autorizaciones no serán operativas
              mientras permanezca inactivo.

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
                : 'Guardar colaborador'}

            </button>

          </div>

        </form>

      )}

      {/* CATÁLOGO */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>Catálogo de colaboradores</h2>

          <span className="cap-muted">

            {filtered.length} de {indicadores.total}
            {' '}colaboradores

          </span>

        </div>

        {/* FILTROS */}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10
          }}
        >

          <div className="cap-search">

            <Search size={18} />

            <input
              value={search}
              onChange={e =>
                setSearch(e.target.value)
              }
              placeholder="Buscar nombre, código o puesto..."
              aria-label="Buscar colaboradores"
            />

          </div>

          {[
            ['TODOS', 'Todos'],
            ['ACTIVOS', 'Activos'],
            ['LIDERES', 'Líderes'],
            ['INACTIVOS', 'Inactivos']
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

        {loading ? (

          <div
            className="cap-welcome"
            role="status"
          >

            <RefreshCw size={32} />

            <p>Cargando colaboradores...</p>

          </div>

        ) : (

          <div className="cap-table-wrap">

            <table>

              <thead>

                <tr>
                  <th>Código</th>
                  <th>Nombre completo</th>
                  <th>Puesto</th>
                  <th>Área</th>
                  <th>Fecha de ingreso</th>
                  <th>Clasificación</th>
                  <th>Estado</th>

                  {canEdit && <th>Acciones</th>}

                </tr>

              </thead>

              <tbody>

                {filtered.map(c => (

                  <tr key={c.id}>

                    <td>{c.codigo}</td>

                    <td>
                      <strong>{c.nombre}</strong>
                    </td>

                    <td>{c.puesto || '—'}</td>

                    <td>{c.area || '—'}</td>

                    <td>
                      {formatDate(c.fecha_ingreso)}
                    </td>

                    <td>

                      {c.es_lider ? (

                        <span className={
                          'cap-status cap-status-warning'
                        }>

                          <Award size={13} />
                          LÍDER

                        </span>

                      ) : (

                        <span className={
                          'cap-status cap-status-neutral'
                        }>

                          COLABORADOR

                        </span>

                      )}

                    </td>

                    <td>

                      <span className={
                        c.activo
                          ? 'cap-status cap-status-success'
                          : 'cap-status cap-status-neutral'
                      }>

                        {c.activo
                          ? 'ACTIVO'
                          : 'INACTIVO'}

                      </span>

                    </td>

                    {canEdit && (

                      <td>

                        <button
                          type="button"
                          className="cap-secondary"
                          onClick={() =>
                            editarColaborador(c)
                          }
                          disabled={saving}
                          title={`Editar ${c.nombre}`}
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

                      No se encontraron colaboradores.

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
