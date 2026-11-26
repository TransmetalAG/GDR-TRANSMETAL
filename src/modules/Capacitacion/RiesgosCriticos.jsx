
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';

import {
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  ClipboardCheck,
  HeartPulse,
  Award,
  Users,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Save,
  X,
  UserPlus,
  UserMinus
} from 'lucide-react';

import './capacitacion.css';

// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================

const initialForm = {
  codigo: '',
  nombre: '',
  abreviatura: '',
  descripcion: '',
  requiere_moodle: true,
  requiere_entrenamiento: true,
  requiere_aptitud_medica: true,
  requiere_autorizacion: true,
  requiere_certificacion: false,
  vigencia_moodle_meses: '24',
  vigencia_entrenamiento_meses: '24',
  orden: '1',
  activo: true
};

const initialAsignacion = {
  colaborador_id: '',
  riesgo_critico_id: '',
  observaciones: ''
};

function normalize(value) {

  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

}

function estadoClass(estado) {

  if (estado === 'AUTORIZADO') {
    return 'cap-status cap-status-success';
  }

  if ([
    'PENDIENTE_VOBO',
    'REQUISITOS_PENDIENTES',
    'PROXIMO_A_VENCER'
  ].includes(estado)) {
    return 'cap-status cap-status-warning';
  }

  if ([
    'VENCIDO',
    'CRITICO',
    'SUSPENDIDO',
    'REVOCADO',
    'NO_AUTORIZADO',
    'REQUISITOS_INCOMPLETOS'
  ].includes(estado)) {
    return 'cap-status cap-status-danger';
  }

  return 'cap-status cap-status-neutral';

}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function RiesgosCriticos({
  client,
  role
}) {

  const canEdit = role === 'JEFE_PRODUCCION';

  const [riesgos, setRiesgos] = useState([]);
  const [colaboradores, setColaboradores] =
    useState([]);

  const [asignaciones, setAsignaciones] =
    useState([]);

  const [asignacionesReales, setAsignacionesReales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [tab, setTab] = useState('CATALOGO');

  const [search, setSearch] = useState('');
  const [filterRC, setFilterRC] = useState('TODOS');
  const [filterEstado, setFilterEstado] =
    useState('TODOS');

  const [showForm, setShowForm] = useState(false);

  const [showAsignacion, setShowAsignacion] =
    useState(false);

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    ...initialForm
  });

  const [asignacion, setAsignacion] = useState({
    ...initialAsignacion
  });

  // ==========================================
  // CARGAR INFORMACIÓN
  // ==========================================

  const cargarDatos = useCallback(async () => {

    if (!client || !role) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {

      const [
        rcResponse,
        colaboradoresResponse,
        matrizResponse,
        asignacionesResponse
      ] = await Promise.all([

        client
          .from('cap_riesgos_criticos')
          .select(`
            id,
            codigo,
            nombre,
            abreviatura,
            descripcion,
            requiere_moodle,
            requiere_entrenamiento,
            requiere_aptitud_medica,
            requiere_autorizacion,
            requiere_certificacion,
            vigencia_moodle_meses,
            vigencia_entrenamiento_meses,
            orden,
            activo
          `)
          .order('orden', { ascending: true })
          .order('codigo', { ascending: true }),

        client
          .from('cap_colaboradores')
          .select('id,codigo,nombre,puesto,activo')
          .eq('activo', true)
          .order('nombre', { ascending: true }),

        client.rpc('cap_matriz_rc'),
        client.from('cap_rc_asignaciones')
          .select('id,colaborador_id,riesgo_critico_id,activo,aplica')
          .order('id')

      ]);

      if (rcResponse.error) {
        throw rcResponse.error;
      }

      if (colaboradoresResponse.error) {
        throw colaboradoresResponse.error;
      }

      if (matrizResponse.error) {
        throw matrizResponse.error;
      }

      if (asignacionesResponse.error) throw asignacionesResponse.error;
      if ([rcResponse, colaboradoresResponse, matrizResponse, asignacionesResponse]
          .some(r => (r.data || []).length >= 1000)) {
        throw new Error('Consulta posiblemente incompleta. Se requiere paginación antes de administrar asignaciones.');
      }
      const reales = asignacionesResponse.data || [];
      const mapa = new Map(reales.map(a => [`${a.colaborador_id}-${a.riesgo_critico_id}`, a]));
      setAsignacionesReales(reales);
      setRiesgos(rcResponse.data || []);

      setColaboradores(
        colaboradoresResponse.data || []
      );

      const matriz = matrizResponse.data || [];
      const presentes = new Set(matriz.map(a => `${a.colaborador_id}-${a.riesgo_critico_id}`));
      const personas = new Map((colaboradoresResponse.data || []).map(c => [c.id,c]));
      const catalogoRC = new Map((rcResponse.data || []).filter(r => r.activo).map(r => [r.id,r]));
      const faltantes = reales.filter(a => a.activo === false && !presentes.has(`${a.colaborador_id}-${a.riesgo_critico_id}`) && personas.has(a.colaborador_id) && catalogoRC.has(a.riesgo_critico_id)).map(a => ({
        colaborador_id: a.colaborador_id, riesgo_critico_id: a.riesgo_critico_id,
        colaborador: personas.get(a.colaborador_id).nombre, puesto: personas.get(a.colaborador_id).puesto,
        riesgo_critico: catalogoRC.get(a.riesgo_critico_id).nombre, abreviatura: catalogoRC.get(a.riesgo_critico_id).abreviatura,
        asignacion_id: a.id, aplica: false, estado: 'INACTIVO', autorizado: false
      }));
      setAsignaciones(
        [...matriz, ...faltantes].map(a => {
          const real = mapa.get(`${a.colaborador_id}-${a.riesgo_critico_id}`);
          return { ...a, asignacion_id: real?.id || a.asignacion_id,
            asignacion_activa: real?.activo ?? null,
            aplica: real ? real.aplica : a.aplica,
            estado: real?.activo === false ? 'INACTIVO' : a.estado,
            autorizado: real?.activo === false ? false : a.autorizado };
        })
      );

    } catch (err) {
      setAsignaciones([]);
      setAsignacionesReales([]);
      setRiesgos([]);
      setColaboradores([]);
      setError(
        'No fue posible cargar los riesgos críticos: ' +
        err.message
      );

    } finally {

      setLoading(false);

    }

  }, [client, role]);

  useEffect(() => {

    setRiesgos([]);
    setColaboradores([]);
    setAsignaciones([]);
    setAsignacionesReales([]);
    setShowForm(false);
    setShowAsignacion(false);
    setSuccess('');

    cargarDatos();

  }, [cargarDatos]);

  // ==========================================
  // INDICADORES
  // ==========================================

  const indicadores = useMemo(() => {

    const activas = riesgos.filter(
      rc => rc.activo === true
    );

    const asignadas = asignaciones.filter(
      a => a.asignacion_id && a.aplica === true && a.asignacion_activa === true
    );

    const autorizadas = asignadas.filter(
      a => a.autorizado === true
    );

    return {

      totalRC: riesgos.length,

      activos: activas.length,

      asignaciones: asignadas.length,

      autorizaciones: autorizadas.length,

      pendientes:
        asignadas.length - autorizadas.length

    };

  }, [riesgos, asignaciones]);

  // ==========================================
  // FILTRO DE RIESGOS CRÍTICOS
  // ==========================================

  const riesgosFiltrados = useMemo(() => {

    const term = normalize(search);

    return riesgos.filter(rc => {

      if (
        filterEstado === 'ACTIVOS' &&
        !rc.activo
      ) return false;

      if (
        filterEstado === 'INACTIVOS' &&
        rc.activo
      ) return false;

      if (!term) return true;

      return [
        rc.codigo,
        rc.nombre,
        rc.abreviatura,
        rc.descripcion
      ].some(value =>
        normalize(value).includes(term)
      );

    });

  }, [riesgos, search, filterEstado]);

  // ==========================================
  // FILTRO DE ASIGNACIONES
  // ==========================================

  const asignacionesFiltradas = useMemo(() => {

    const term = normalize(search);

    return asignaciones.filter(a => {

      if (
        filterRC !== 'TODOS' &&
        a.riesgo_critico_id !== filterRC
      ) return false;

      if (
        filterEstado === 'ASIGNADOS' &&
        !(a.asignacion_id && a.aplica && a.asignacion_activa === true)
      ) return false;

      if (
        filterEstado === 'SIN_ASIGNAR' &&
        a.asignacion_id
      ) return false;

      if (filterEstado === 'DESASIGNADOS' && a.asignacion_activa !== false) return false;

      if (
        filterEstado === 'AUTORIZADOS' &&
        !a.autorizado
      ) return false;

      if (
        filterEstado === 'PENDIENTES' &&
        (
          !a.asignacion_id ||
          !a.aplica ||
          a.asignacion_activa !== true ||
          a.autorizado
        )
      ) return false;

      if (!term) return true;

      return [
        a.colaborador,
        a.puesto,
        a.riesgo_critico,
        a.abreviatura,
        a.estado
      ].some(value =>
        normalize(value).includes(term)
      );

    });

  }, [
    asignaciones,
    search,
    filterRC,
    filterEstado
  ]);

  // ==========================================
  // CAMBIAR PESTAÑA
  // ==========================================

  function cambiarTab(value) {

    if (saving) return;

    setTab(value);
    setSearch('');
    setFilterRC('TODOS');
    setFilterEstado('TODOS');
    setShowForm(false);
    setShowAsignacion(false);
    setError('');
    setSuccess('');

  }

  // ==========================================
  // NUEVO RIESGO CRÍTICO
  // ==========================================

  function nuevoRC() {

    if (!canEdit || saving) return;

    setError('');
    setSuccess('');
    setEditingId(null);

    const maxOrden = Math.max(
      0,
      ...riesgos.map(rc =>
        Number(rc.orden || 0)
      )
    );

    setForm({
      ...initialForm,
      orden: String(maxOrden + 1)
    });

    setTab('CATALOGO');
    setShowAsignacion(false);
    setShowForm(true);

  }

  // ==========================================
  // EDITAR RIESGO CRÍTICO
  // ==========================================

  function editarRC(rc) {

    if (!canEdit || saving) return;

    setError('');
    setSuccess('');
    setEditingId(rc.id);

    setForm({

      codigo: rc.codigo ?? '',

      nombre: rc.nombre ?? '',

      abreviatura: rc.abreviatura ?? '',

      descripcion: rc.descripcion ?? '',

      requiere_moodle:
        rc.requiere_moodle === true,

      requiere_entrenamiento:
        rc.requiere_entrenamiento === true,

      requiere_aptitud_medica:
        rc.requiere_aptitud_medica === true,

      requiere_autorizacion:
        rc.requiere_autorizacion === true,

      requiere_certificacion: false,

      vigencia_moodle_meses: String(
        rc.vigencia_moodle_meses ?? 24
      ),

      vigencia_entrenamiento_meses: String(
        rc.vigencia_entrenamiento_meses ?? 24
      ),

      orden: String(rc.orden ?? 1),

      activo: rc.activo === true

    });

    setShowAsignacion(false);
    setShowForm(true);

  }

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
  // GUARDAR CONFIGURACIÓN DEL RC
  // ==========================================

  async function guardarRC(event) {

    event.preventDefault();

    if (!canEdit || saving || !client) return;

    setError('');
    setSuccess('');

    const codigo = form.codigo
      .trim()
      .toUpperCase();

    const nombre = form.nombre.trim();

    const abreviatura = form.abreviatura
      .trim()
      .toUpperCase();

    const vigenciaMoodle =
      Number(form.vigencia_moodle_meses);

    const vigenciaEntrenamiento =
      Number(form.vigencia_entrenamiento_meses);

    const orden = Number(form.orden);

    if (!codigo || !nombre || !abreviatura) {

      setError(
        'Completa el código, nombre y abreviatura.'
      );

      return;

    }

    if (
      !Number.isSafeInteger(vigenciaMoodle) ||
      vigenciaMoodle < 1 ||
      !Number.isSafeInteger(vigenciaEntrenamiento) ||
      vigenciaEntrenamiento < 1
    ) {

      setError(
        'Las vigencias deben expresarse en meses ' +
        'enteros mayores a cero.'
      );

      return;

    }

    if (
      !Number.isSafeInteger(orden) ||
      orden < 1
    ) {

      setError(
        'El orden debe ser un entero mayor a cero.'
      );

      return;

    }

    const duplicado = riesgos.some(rc =>
      normalize(rc.codigo) === normalize(codigo) &&
      rc.id !== editingId
    );

    if (duplicado) {

      setError(
        'Ya existe un riesgo crítico con ese código.'
      );

      return;

    }

    const anterior = riesgos.find(
      rc => rc.id === editingId
    );

    const payload = {

      codigo,
      nombre,
      abreviatura,

      descripcion:
        form.descripcion.trim() || null,

      requiere_moodle:
        Boolean(form.requiere_moodle),

      requiere_entrenamiento:
        Boolean(form.requiere_entrenamiento),

      requiere_aptitud_medica:
        Boolean(form.requiere_aptitud_medica),

      requiere_autorizacion:
        Boolean(form.requiere_autorizacion),

      // REGLA PERMANENTE:
      // La certificación es siempre opcional.

      requiere_certificacion: false,

      vigencia_moodle_meses:
        vigenciaMoodle,

      vigencia_entrenamiento_meses:
        vigenciaEntrenamiento,

      orden,

      activo: Boolean(form.activo)

    };

    // Confirmar eliminación de requisitos

    const requisitos = [
      'requiere_moodle',
      'requiere_entrenamiento',
      'requiere_aptitud_medica',
      'requiere_autorizacion'
    ];

    const requisitosReducidos = requisitos.some(
      key =>
        anterior?.[key] === true &&
        payload[key] === false
    );

    if (requisitosReducidos) {

      const confirmed = window.confirm(
        'Estás retirando requisitos de seguridad. ' +
        'Confirma que el cambio está respaldado ' +
        'por una evaluación de riesgos aprobada.'
      );

      if (!confirmed) return;

    }

    if (anterior?.activo && !payload.activo) {

      const confirmed = window.confirm(
        `¿Deseas desactivar ${anterior.nombre}? ` +
        'Sus registros históricos serán conservados.'
      );

      if (!confirmed) return;

    }

    if (
      anterior &&
      !anterior.activo &&
      payload.activo
    ) {

      const confirmed = window.confirm(
        '¿Deseas reactivar este riesgo crítico? ' +
        'Revisa las autorizaciones anteriores.'
      );

      if (!confirmed) return;

    }

    if (
      anterior &&
      (
        anterior.vigencia_moodle_meses !==
          vigenciaMoodle ||
        anterior.vigencia_entrenamiento_meses !==
          vigenciaEntrenamiento
      )
    ) {

      const confirmed = window.confirm(
        'Estás modificando la vigencia configurada ' +
        'de las capacitaciones. Los registros ya ' +
        'emitidos no se recalculan automáticamente. ' +
        '¿Deseas continuar?'
      );

      if (!confirmed) return;

    }

    setSaving(true);

    try {

      let response;

      if (editingId) {

        response = await client
          .from('cap_riesgos_criticos')
          .update(payload)
          .eq('id', editingId)
          .select('id')
          .single();

      } else {

        response = await client
          .from('cap_riesgos_criticos')
          .insert(payload)
          .select('id')
          .single();

      }

      if (response.error) {
        throw response.error;
      }

      setSuccess(
        editingId
          ? 'Riesgo crítico actualizado correctamente.'
          : 'Riesgo crítico registrado correctamente.'
      );

      setShowForm(false);
      setEditingId(null);
      setForm({ ...initialForm });

      await cargarDatos();

    } catch (err) {

      setError(
        'No fue posible guardar el riesgo crítico: ' +
        err.message
      );

    } finally {

      setSaving(false);

    }

  }

  // ==========================================
  // NUEVA ASIGNACIÓN
  // ==========================================

  function nuevaAsignacion(
    colaboradorId = '',
    riesgoId = ''
  ) {

    if (!canEdit || saving) return;

    setTab('ASIGNACIONES');
    setFilterEstado('TODOS');
    setShowForm(false);
    setError('');
    setSuccess('');

    setAsignacion({
      ...initialAsignacion,
      colaborador_id: colaboradorId,
      riesgo_critico_id: riesgoId
    });

    setShowAsignacion(true);

  }

  const colaboradoresDisponibles =
    useMemo(() => {

      return colaboradores.filter(
        c => c.activo === true
      );

    }, [colaboradores]);

  const riesgosDisponibles = useMemo(() => {

    return riesgos.filter(rc => {

      if (!rc.activo) return false;

      const existe = asignacionesReales.some(a =>
        a.colaborador_id ===
          asignacion.colaborador_id &&
        a.riesgo_critico_id === rc.id &&
        a.activo !== false
      );

      return !existe;

    });

  }, [
    riesgos,
    asignacionesReales,
    asignacion.colaborador_id
  ]);

  // ==========================================
  // GUARDAR ASIGNACIÓN MEDIANTE RPC
  // ==========================================

  async function guardarAsignacion(event) {

    event.preventDefault();

    if (!canEdit || saving || !client) return;

    setError('');
    setSuccess('');

    if (
      !asignacion.colaborador_id ||
      !asignacion.riesgo_critico_id
    ) {

      setError(
        'Selecciona un colaborador y un riesgo crítico.'
      );

      return;

    }

    const existe = asignacionesReales.some(a =>
      a.colaborador_id ===
        asignacion.colaborador_id &&
      a.riesgo_critico_id ===
        asignacion.riesgo_critico_id &&
      a.activo !== false
    );

    if (existe) {

      setError(
        'El colaborador ya tiene una asignación ' +
        'para este riesgo crítico.'
      );

      return;

    }

    setSaving(true);

    try {

      const { error } = await client.rpc(
        'cap_asignar_rc',
        {

          p_colaborador_id:
            asignacion.colaborador_id,

          p_riesgo_critico_id:
            asignacion.riesgo_critico_id,

          p_observaciones:
            asignacion.observaciones.trim() || null

        }
      );

      if (error) throw error;

      setSuccess(
        'Riesgo crítico asignado correctamente. ' +
        'El colaborador deberá completar sus ' +
        'requisitos antes de recibir autorización.'
      );

      setShowAsignacion(false);

      setAsignacion({
        ...initialAsignacion
      });

      await cargarDatos();

    } catch (err) {

      setError(
        'No fue posible asignar el riesgo crítico: ' +
        err.message
      );

    } finally {

      setSaving(false);

    }

  }

  // ==========================================
  // DESASIGNACIÓN MEDIANTE RPC
  // ==========================================

  async function desasignarRC(a) {
    if (!client || !canEdit || saving || loading || a.asignacion_activa !== true) return;
    const motivo = window.prompt(`Motivo de desasignación de ${a.riesgo_critico} para ${a.colaborador}:`);
    if (motivo === null) return;
    if (!motivo.trim()) { setError('Debes indicar el motivo de desasignación.'); return; }
    if (!window.confirm(`¿Desasignar ${a.riesgo_critico} de ${a.colaborador}? Solo se permite si no tiene capacitaciones ni autorizaciones registradas.`)) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { error } = await client.rpc('cap_desasignar_rc', {
        p_asignacion_id: a.asignacion_id,
        p_motivo: motivo.trim()
      });
      if (error) throw error;
      setShowAsignacion(false);
      setFilterEstado('TODOS');
      setSuccess('Riesgo crítico desasignado correctamente. Se conserva el historial.');
      await cargarDatos();
    } catch (err) {
      setError('No fue posible desasignar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // REQUISITO VISUAL
  // ==========================================

  function Requisito({
    icon: Icon,
    nombre,
    obligatorio,
    detalle
  }) {

    return (

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 0',
        borderBottom: '1px solid #e2e8f0'
      }}>

        <Icon
          size={19}
          color={
            obligatorio
              ? '#164b83'
              : '#64748b'
          }
        />

        <div style={{ flex: 1 }}>

          <strong style={{ fontSize: 13 }}>
            {nombre}
          </strong>

          {detalle && (

            <div className="cap-muted">
              {detalle}
            </div>

          )}

        </div>

        <span className={
          obligatorio
            ? 'cap-status cap-status-warning'
            : 'cap-status cap-status-neutral'
        }>

          {obligatorio
            ? 'OBLIGATORIO'
            : 'NO REQUERIDO'}

        </span>

      </div>

    );

  }

  // ==========================================
  // VALIDAR SESIÓN
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

    <div className="cap-riesgos-criticos">

      {/* ENCABEZADO */}

      <div className="cap-panel cap-toolbar">

        <div>

          <h2>Gestión de riesgos críticos</h2>

          <p className="cap-muted">
            Requisitos, vigencias y asignaciones.
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
            onClick={cargarDatos}
            disabled={loading || saving}
          >

            <RefreshCw size={16} />
            Actualizar

          </button>

          {canEdit && (

            <>

              <button
                type="button"
                className="cap-primary"
                onClick={nuevoRC}
                disabled={loading || saving}
              >

                <Plus size={18} />
                Nuevo RC

              </button>

              <button
                type="button"
                className="cap-primary"
                onClick={() => nuevaAsignacion()}
                disabled={loading || saving}
              >

                <UserPlus size={18} />
                Asignar RC

              </button>

            </>

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

          <ShieldCheck size={24} color="#164b83" />

          <div className="cap-kpi-label">
            Riesgos críticos activos
          </div>

          <div className="cap-kpi-value">
            {indicadores.activos}
          </div>

          <div className="cap-kpi-description">
            {indicadores.totalRC} registrados
          </div>

        </div>

        <div className="cap-kpi">

          <Users size={24} color="#164b83" />

          <div className="cap-kpi-label">
            Asignaciones aplicables
          </div>

          <div className="cap-kpi-value">
            {indicadores.asignaciones}
          </div>

          <div className="cap-kpi-description">
            Combinaciones colaborador - RC
          </div>

        </div>

        <div className="cap-kpi cap-kpi-success">

          <ClipboardCheck
            size={24}
            color="#15803d"
          />

          <div className="cap-kpi-label">
            Autorizaciones vigentes
          </div>

          <div className="cap-kpi-value">
            {indicadores.autorizaciones}
          </div>

          <div className="cap-kpi-description">
            Según el motor de autorización
          </div>

        </div>

        <div className="cap-kpi cap-kpi-warning">

          <ShieldAlert size={24} color="#b45309" />

          <div className="cap-kpi-label">
            Asignaciones sin autorización
          </div>

          <div className="cap-kpi-value">
            {indicadores.pendientes}
          </div>

          <div className="cap-kpi-description">
            Requieren seguimiento
          </div>

        </div>

      </div>

      {/* PESTAÑAS */}

      <div
        className="cap-panel"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10
        }}
      >

        <button
          type="button"
          className={
            tab === 'CATALOGO'
              ? 'cap-primary'
              : 'cap-secondary'
          }
          onClick={() => cambiarTab('CATALOGO')}
          aria-pressed={tab === 'CATALOGO'}
          disabled={saving}
        >

          <ShieldCheck size={18} />
          Catálogo de RC

        </button>

        <button
          type="button"
          className={
            tab === 'ASIGNACIONES'
              ? 'cap-primary'
              : 'cap-secondary'
          }
          onClick={() =>
            cambiarTab('ASIGNACIONES')
          }
          aria-pressed={tab === 'ASIGNACIONES'}
          disabled={saving}
        >

          <Users size={18} />
          Asignaciones de RC

        </button>

      </div>

      {/* FORMULARIO DE RIESGO CRÍTICO */}

      {showForm && canEdit && (

        <form
          className="cap-panel"
          onSubmit={guardarRC}
        >

          <div className="cap-toolbar">

            <h2>

              {editingId
                ? 'Editar riesgo crítico'
                : 'Registrar riesgo crítico'}

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

              <label htmlFor="cap-rc-codigo">
                Código *
              </label>

              <input
                id="cap-rc-codigo"
                value={form.codigo}
                placeholder="RC-006"
                onChange={e =>
                  updateField(
                    'codigo', e.target.value
                  )
                }
                required
                disabled={saving}
              />

            </div>

            <div className="cap-field">

              <label htmlFor="cap-rc-abreviatura">
                Abreviatura *
              </label>

              <input
                id="cap-rc-abreviatura"
                value={form.abreviatura}
                placeholder="Ej. CEP"
                onChange={e =>
                  updateField(
                    'abreviatura',
                    e.target.value
                  )
                }
                required
                disabled={saving}
              />

            </div>

            <div className="cap-field cap-field-full">

              <label htmlFor="cap-rc-nombre">
                Nombre del riesgo crítico *
              </label>

              <input
                id="cap-rc-nombre"
                value={form.nombre}
                onChange={e =>
                  updateField(
                    'nombre',
                    e.target.value
                  )
                }
                required
                disabled={saving}
              />

            </div>

            <div className="cap-field cap-field-full">

              <label htmlFor="cap-rc-descripcion">
                Descripción
              </label>

              <textarea
                id="cap-rc-descripcion"
                value={form.descripcion}
                onChange={e =>
                  updateField(
                    'descripcion',
                    e.target.value
                  )
                }
                disabled={saving}
              />

            </div>

            {/* REQUISITOS OBLIGATORIOS */}

            <div className="cap-field cap-field-full">

              <h3>Requisitos de autorización</h3>

              {[
                [
                  'requiere_moodle',
                  'Moodle aprobado'
                ],
                [
                  'requiere_entrenamiento',
                  'Entrenamiento práctico'
                ],
                [
                  'requiere_aptitud_medica',
                  'Aptitud médica'
                ],
                [
                  'requiere_autorizacion',
                  'VoBo del jefe de producción'
                ]
              ].map(([field, label]) => (

                <label
                  key={field}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 0'
                  }}
                >

                  <input
                    type="checkbox"
                    checked={form[field]}
                    onChange={e =>
                      updateField(
                        field,
                        e.target.checked
                      )
                    }
                    disabled={saving}
                    style={{ width: 18 }}
                  />

                  {label}

                </label>

              ))}

            </div>

            {/* VIGENCIAS */}

            <div className="cap-field">

              <label htmlFor="cap-rc-moodle">
                Vigencia Moodle (meses)
              </label>

              <input
                id="cap-rc-moodle"
                type="number"
                min="1"
                step="1"
                value={form.vigencia_moodle_meses}
                onChange={e =>
                  updateField(
                    'vigencia_moodle_meses',
                    e.target.value
                  )
                }
                required
                disabled={saving}
              />

            </div>

            <div className="cap-field">

              <label htmlFor="cap-rc-entrenamiento">
                Vigencia entrenamiento (meses)
              </label>

              <input
                id="cap-rc-entrenamiento"
                type="number"
                min="1"
                step="1"
                value={
                  form.vigencia_entrenamiento_meses
                }
                onChange={e =>
                  updateField(
                    'vigencia_entrenamiento_meses',
                    e.target.value
                  )
                }
                required
                disabled={saving}
              />

            </div>

            <div className="cap-field">

              <label htmlFor="cap-rc-orden">
                Orden de visualización
              </label>

              <input
                id="cap-rc-orden"
                type="number"
                min="1"
                step="1"
                value={form.orden}
                onChange={e =>
                  updateField(
                    'orden',
                    e.target.value
                  )
                }
                required
                disabled={saving}
              />

            </div>

            <div className="cap-field">

              <label htmlFor="cap-rc-activo">
                Estado
              </label>

              <select
                id="cap-rc-activo"
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

          </div>

          {/* CERTIFICACIÓN OPCIONAL */}

          <div className="cap-alert-info">

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>

              <Award size={24} />

              <strong>
                Certificación adicional — Opcional
              </strong>

            </div>

            <p>

              La certificación es un valor agregado
              de competencia profesional.

              Su ausencia, vencimiento o falta de
              diploma no impide la autorización
              operativa del colaborador.

            </p>

            <p>

              Tiene su propio control de vigencias
              y notificaciones independientes.

            </p>

          </div>

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
                : 'Guardar riesgo crítico'}

            </button>

          </div>

        </form>

      )}

      {/* FORMULARIO DE ASIGNACIÓN */}

      {showAsignacion && canEdit && (

        <form
          className="cap-panel"
          onSubmit={guardarAsignacion}
        >

          <div className="cap-toolbar">

            <h2>Asignar riesgo crítico</h2>

            <button
              type="button"
              className="cap-secondary"
              disabled={saving}
              onClick={() =>
                setShowAsignacion(false)
              }
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

              <label htmlFor="cap-rc-colaborador">
                Colaborador *
              </label>

              <select
                id="cap-rc-colaborador"
                value={asignacion.colaborador_id}
                onChange={e =>
                  setAsignacion(previous => ({
                    ...previous,
                    colaborador_id: e.target.value,
                    riesgo_critico_id: ''
                  }))
                }
                required
                disabled={saving}
              >

                <option value="">
                  Seleccionar colaborador...
                </option>

                {colaboradoresDisponibles.map(c => (

                  <option
                    key={c.id}
                    value={c.id}
                  >

                    {c.codigo} - {c.nombre}

                  </option>

                ))}

              </select>

            </div>

            <div className="cap-field">

              <label htmlFor="cap-rc-asignar">
                Riesgo crítico *
              </label>

              <select
                id="cap-rc-asignar"
                value={asignacion.riesgo_critico_id}
                onChange={e =>
                  setAsignacion(previous => ({
                    ...previous,
                    riesgo_critico_id:
                      e.target.value
                  }))
                }
                required
                disabled={
                  saving ||
                  !asignacion.colaborador_id
                }
              >

                <option value="">
                  Seleccionar riesgo crítico...
                </option>

                {riesgosDisponibles.map(rc => (

                  <option
                    key={rc.id}
                    value={rc.id}
                  >

                    {rc.codigo} - {rc.nombre}

                  </option>

                ))}

              </select>

            </div>

            <div className="cap-field cap-field-full">

              <label htmlFor="cap-rc-observaciones">
                Observaciones
              </label>

              <textarea
                id="cap-rc-observaciones"
                value={asignacion.observaciones}
                onChange={e =>
                  setAsignacion(previous => ({
                    ...previous,
                    observaciones: e.target.value
                  }))
                }
                placeholder="Motivo de la asignación..."
                disabled={saving}
              />

            </div>

          </div>

          <div className="cap-alert-info">

            Asignar un riesgo crítico no autoriza
            automáticamente al colaborador.

            Deberá completar los requisitos
            correspondientes y recibir el VoBo
            cuando sea obligatorio.

          </div>

          <div className="cap-form-actions">

            <button
              type="button"
              className="cap-secondary"
              disabled={saving}
              onClick={() =>
                setShowAsignacion(false)
              }
            >

              <X size={16} />
              Cancelar

            </button>

            <button
              type="submit"
              className="cap-primary"
              disabled={saving}
            >

              <UserPlus size={18} />

              {saving
                ? 'Asignando...'
                : 'Confirmar asignación'}

            </button>

          </div>

        </form>

      )}

      {/* BUSCADOR */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>

            {tab === 'CATALOGO'
              ? 'Riesgos críticos registrados'
              : 'Asignaciones por colaborador'}

          </h2>

          <span className="cap-muted">

            {tab === 'CATALOGO'
              ? riesgosFiltrados.length
              : asignacionesFiltradas.length}

            {' '}registros

          </span>

        </div>

        <div className="cap-search">

          <Search size={18} />

          <input
            value={search}
            onChange={e =>
              setSearch(e.target.value)
            }
            placeholder={
              tab === 'CATALOGO'
                ? 'Buscar riesgo crítico...'
                : 'Buscar colaborador o RC...'
            }
            aria-label="Buscar registros"
          />

        </div>

        <div
          className="cap-form-grid"
          style={{ marginBottom: 10 }}
        >

          <div className="cap-field">

            <label htmlFor="cap-rc-filtro">
              Estado
            </label>

            <select
              id="cap-rc-filtro"
              value={filterEstado}
              onChange={e =>
                setFilterEstado(e.target.value)
              }
            >

              <option value="TODOS">
                Todos
              </option>

              {tab === 'CATALOGO' ? (

                <>

                  <option value="ACTIVOS">
                    Activos
                  </option>

                  <option value="INACTIVOS">
                    Inactivos
                  </option>

                </>

              ) : (

                <>

                  <option value="ASIGNADOS">
                    Asignados
                  </option>

                  <option value="SIN_ASIGNAR">
                    Sin asignar
                  </option>

                  <option value="DESASIGNADOS">Desasignados</option>

                  <option value="AUTORIZADOS">
                    Autorizados
                  </option>

                  <option value="PENDIENTES">
                    Asignados sin autorización
                  </option>

                </>

              )}

            </select>

          </div>

          {tab === 'ASIGNACIONES' && (

            <div className="cap-field">

              <label htmlFor="cap-rc-filtro-rc">
                Riesgo crítico
              </label>

              <select
                id="cap-rc-filtro-rc"
                value={filterRC}
                onChange={e =>
                  setFilterRC(e.target.value)
                }
              >

                <option value="TODOS">
                  Todos los RC
                </option>

                {riesgos.map(rc => (

                  <option
                    key={rc.id}
                    value={rc.id}
                  >

                    {rc.nombre}

                  </option>

                ))}

              </select>

            </div>

          )}

        </div>

      </div>

      {/* CARGANDO */}

      {loading ? (

        <div
          className="cap-panel cap-welcome"
          role="status"
        >

          <RefreshCw size={36} />

          <p>Cargando riesgos críticos...</p>

        </div>

      ) : tab === 'CATALOGO' ? (

        /* TARJETAS DE RIESGOS CRÍTICOS */

        <div style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: 16
        }}>

          {riesgosFiltrados.map(rc => (

            <div
              className="cap-panel"
              key={rc.id}
            >

              <div className="cap-toolbar">

                <ShieldCheck
                  size={30}
                  color="#164b83"
                />

                <span className={
                  rc.activo
                    ? 'cap-status cap-status-success'
                    : 'cap-status cap-status-neutral'
                }>

                  {rc.activo
                    ? 'ACTIVO'
                    : 'INACTIVO'}

                </span>

              </div>

              <div
                className="cap-muted"
                style={{ marginTop: 15 }}
              >

                {rc.codigo} · {rc.abreviatura}

              </div>

              <h2 style={{ marginTop: 8 }}>

                {rc.nombre}

              </h2>

              {rc.descripcion && (

                <p className="cap-muted">
                  {rc.descripcion}
                </p>

              )}

              <Requisito
                icon={GraduationCap}
                nombre="Moodle"
                obligatorio={rc.requiere_moodle}
                detalle={
                  rc.requiere_moodle
                    ? `${rc.vigencia_moodle_meses} meses`
                    : null
                }
              />

              <Requisito
                icon={ClipboardCheck}
                nombre="Entrenamiento práctico"
                obligatorio={
                  rc.requiere_entrenamiento
                }
                detalle={
                  rc.requiere_entrenamiento
                    ? `${rc.vigencia_entrenamiento_meses} meses`
                    : null
                }
              />

              <Requisito
                icon={HeartPulse}
                nombre="Aptitud médica"
                obligatorio={
                  rc.requiere_aptitud_medica
                }
                detalle={
                  rc.requiere_aptitud_medica
                    ? 'Según vigencia del documento'
                    : null
                }
              />

              <Requisito
                icon={ShieldCheck}
                nombre="VoBo del jefe de producción"
                obligatorio={
                  rc.requiere_autorizacion
                }
              />

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '16px 0'
              }}>

                <Award
                  size={22}
                  color="#7c3aed"
                />

                <div style={{ flex: 1 }}>

                  <strong style={{ fontSize: 13 }}>
                    Certificación adicional
                  </strong>

                  <div className="cap-muted">
                    No condiciona la autorización
                  </div>

                </div>

                <span className={
                  'cap-status cap-status-optional'
                }>

                  OPCIONAL

                </span>

              </div>

              {canEdit && (

                <div className="cap-form-actions">

                  <button
                    type="button"
                    className="cap-secondary"
                    disabled={saving}
                    onClick={() => editarRC(rc)}
                  >

                    <Pencil size={16} />
                    Editar

                  </button>

                  {rc.activo && (

                    <button
                      type="button"
                      className="cap-primary"
                      disabled={saving}
                      onClick={() =>
                        nuevaAsignacion('', rc.id)
                      }
                    >

                      <UserPlus size={16} />
                      Asignar

                    </button>

                  )}

                </div>

              )}

            </div>

          ))}

          {riesgosFiltrados.length === 0 && (

            <div className="cap-panel cap-welcome">

              <ShieldAlert size={36} />

              <p>No se encontraron riesgos críticos.</p>

            </div>

          )}

        </div>

      ) : (

        /* TABLA DE ASIGNACIONES */

        <div className="cap-panel">

          <div className="cap-table-wrap">

            <table>

              <thead>

                <tr>

                  <th>Colaborador</th>
                  <th>Puesto</th>
                  <th>Riesgo crítico</th>
                  <th>Asignación</th>
                  <th>Estado</th>
                  <th>Autorizado</th>

                  {canEdit && <th>Acciones</th>}

                </tr>

              </thead>

              <tbody>

                {asignacionesFiltradas.map(a => (

                  <tr key={
                    `${a.colaborador_id}-${a.riesgo_critico_id}`
                  }>

                    <td>

                      <strong>{a.colaborador}</strong>

                    </td>

                    <td>{a.puesto || '—'}</td>

                    <td>

                      {a.riesgo_critico}

                      <div className="cap-muted">

                        {a.abreviatura}

                      </div>

                    </td>

                    <td>

                      <span className={
                        a.asignacion_id && a.aplica && a.asignacion_activa === true
                          ? 'cap-status cap-status-success'
                          : 'cap-status cap-status-neutral'
                      }>

                        {!a.asignacion_id
                          ? 'SIN ASIGNAR'
                          : a.asignacion_activa === false
                            ? 'DESASIGNADO'
                            : a.aplica
                            ? 'ASIGNADO'
                            : 'NO APLICA'}

                      </span>

                    </td>

                    <td>

                      <span className={
                        estadoClass(a.estado)
                      }>

                        {String(
                          a.estado || 'SIN ASIGNACION'
                        ).replaceAll('_', ' ')}

                      </span>

                    </td>

                    <td>

                      <span className={
                        a.autorizado
                          ? 'cap-status cap-status-success'
                          : 'cap-status cap-status-neutral'
                      }>

                        {a.autorizado ? 'SÍ' : 'NO'}

                      </span>

                    </td>

                    {canEdit && (

                      <td>

                        {(!a.asignacion_id || a.asignacion_activa === false) ? (

                          <button
                            type="button"
                            className="cap-secondary"
                            disabled={saving}
                            onClick={() =>
                              nuevaAsignacion(
                                a.colaborador_id,
                                a.riesgo_critico_id
                              )
                            }
                          >

                            <UserPlus size={15} />
                            {a.asignacion_activa === false ? 'Reasignar' : 'Asignar'}

                          </button>

                        ) : a.asignacion_activa === true ? (
                          <button type="button" className="cap-secondary"
                            style={{ color: '#b91c1c' }}
                            disabled={saving || loading}
                            onClick={() => desasignarRC(a)}>
                            <UserMinus size={15} /> Desasignar
                          </button>
                        ) : '—'}

                      </td>

                    )}

                  </tr>

                ))}

                {asignacionesFiltradas.length === 0 && (

                  <tr>

                    <td
                      className="cap-empty"
                      colSpan={canEdit ? 7 : 6}
                    >

                      No se encontraron registros.

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

      )}

    </div>

  );

}
