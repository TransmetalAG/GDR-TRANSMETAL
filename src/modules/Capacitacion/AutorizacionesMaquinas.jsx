
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';

import {
  ShieldCheck,
  ShieldAlert,
  ClipboardCheck,
  Clock,
  CheckCircle,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  Ban,
  Search,
  RefreshCw,
  ExternalLink,
  FileText,
  Eye,
  Save,
  X
} from 'lucide-react';

import './capacitacion.css';

// ==========================================
// CONFIGURACIÓN GENERAL
// ==========================================

const BUCKET = 'capacitacion-evidencias';

const ACCIONES = {

  AUTORIZAR: {
    nombre: 'Autorizar operación',
    rpc: 'cap_autorizar_maquina',
    icon: ShieldCheck,
    estados: ['PENDIENTE'],
    requiereMotivo: false,
    mensaje:
      'Se emitirá la autorización de operación ' +
      'para el colaborador y máquina seleccionados.'
  },

  DEVOLVER: {
    nombre: 'Devolver solicitud',
    rpc: 'cap_devolver_maquina',
    icon: RotateCcw,
    estados: ['PENDIENTE'],
    requiereMotivo: true,
    mensaje:
      'La solicitud será devuelta para corregir ' +
      'las observaciones identificadas.'
  },

  SUSPENDER: {
    nombre: 'Suspender autorización',
    rpc: 'cap_suspender_maquina',
    icon: PauseCircle,
    estados: ['AUTORIZADA'],
    requiereMotivo: true,
    mensaje:
      'El colaborador perderá temporalmente ' +
      'la autorización de operación.'
  },

  REACTIVAR: {
    nombre: 'Reactivar autorización',
    rpc: 'cap_reactivar_maquina',
    icon: PlayCircle,
    estados: ['SUSPENDIDA'],
    requiereMotivo: true,
    mensaje:
      'Supabase verificará nuevamente los requisitos ' +
      'antes de restablecer la autorización.'
  },

  REVOCAR: {
    nombre: 'Revocar autorización',
    rpc: 'cap_revocar_maquina',
    icon: Ban,
    estados: ['AUTORIZADA', 'SUSPENDIDA'],
    requiereMotivo: true,
    mensaje:
      'La autorización será revocada definitivamente. ' +
      'No podrá reactivarse mediante este registro.'
  }

};

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function normalize(value) {

  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

}

function formatDate(value) {

  if (!value) return '—';

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {

    const [year, month, day] = text.split('-');

    return `${day}/${month}/${year}`;

  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-GT', {
    timeZone: 'America/Guatemala',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);

}

function formatDateTime(value) {

  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-GT', {
    timeZone: 'America/Guatemala',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);

}

function statusClass(estado) {

  if ([
    'AUTORIZADA',
    'AUTORIZADO',
    'VALIDADA',
    'VALIDADO'
  ].includes(estado)) {

    return 'cap-status cap-status-success';

  }

  if ([
    'PENDIENTE',
    'PENDIENTE_VOBO',
    'CAPACITADO'
  ].includes(estado)) {

    return 'cap-status cap-status-warning';

  }

  if ([
    'SUSPENDIDA',
    'SUSPENDIDO',
    'REVOCADA',
    'REVOCADO',
    'DEVUELTA',
    'DEVUELTO',
    'NO_AUTORIZADO',
    'REQUISITOS_INCOMPLETOS'
  ].includes(estado)) {

    return 'cap-status cap-status-danger';

  }

  return 'cap-status cap-status-neutral';

}

function Estado({ value }) {

  return (

    <span className={statusClass(value)}>

      {String(value || '—').replaceAll('_', ' ')}

    </span>

  );

}

function KPI({
  icon: Icon,
  label,
  value,
  description,
  variant = '',
  color = '#164b83'
}) {

  return (

    <div className={`cap-kpi ${variant}`}>

      <Icon size={24} color={color} />

      <div className="cap-kpi-label">
        {label}
      </div>

      <div className="cap-kpi-value">
        {value}
      </div>

      <div className="cap-kpi-description">
        {description}
      </div>

    </div>

  );

}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function AutorizacionesMaquinas({
  client,
  role
}) {

  const canManage =
    role === 'JEFE_PRODUCCION';

  const canReadEvidence = [
    'JEFE_PRODUCCION',
    'ING_PROCESOS'
  ].includes(role);

  const [colaboradores, setColaboradores] =
    useState([]);

  const [maquinas, setMaquinas] =
    useState([]);

  const [capacitaciones, setCapacitaciones] =
    useState([]);

  const [autorizaciones, setAutorizaciones] =
    useState([]);

  const [matriz, setMatriz] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [filterEstado, setFilterEstado] =
    useState(
      canManage ? 'PENDIENTE' : 'TODOS'
    );

  const [filterMaquina, setFilterMaquina] =
    useState('TODAS');

  const [selectedId, setSelectedId] =
    useState(null);

  const [accion, setAccion] =
    useState(null);

  const [motivo, setMotivo] =
    useState('');

  const [evidenciaRevisada, setEvidenciaRevisada] =
    useState(false);

  const [documentoAbierto, setDocumentoAbierto] =
    useState(false);

  const [confirmacion, setConfirmacion] =
    useState(false);

  const [openingId, setOpeningId] =
    useState(null);

  // ==========================================
  // CONSULTAR INFORMACIÓN
  // ==========================================

  const cargarDatos = useCallback(async () => {

    if (!client || !role) {

      setLoading(false);
      return;

    }

    setLoading(true);
    setError('');

    try {

      const camposCapacitaciones = [

        'id',
        'colaborador_id',
        'maquina_id',
        'lider_id',
        'fecha_capacitacion',
        'firma_lider',
        'firma_colaborador',
        'estado',
        'fecha_validacion'

      ];

      if (canReadEvidence) {

        camposCapacitaciones.push(

          'evidencia_nombre',
          'evidencia_path',
          'observaciones',
          'motivo_devolucion'

        );

      }

      const camposAutorizaciones = [

        'id',
        'capacitacion_id',
        'estado',
        'evidencia_revisada',
        'fecha_autorizacion',
        'fecha_suspension',
        'fecha_revocacion',
        'fecha_reactivacion',
        'fecha_devolucion',
        'created_at'

      ];

      if (canReadEvidence) {

        camposAutorizaciones.push(

          'observaciones',
          'motivo_devolucion',
          'motivo_suspension',
          'motivo_revocacion',
          'motivo_reactivacion'

        );

      }

      const [
        colaboradoresResponse,
        maquinasResponse,
        autorizacionesResponse,
        matrizResponse
      ] = await Promise.all([

        client
          .from('cap_colaboradores')
          .select('id,codigo,nombre,puesto,activo')
          .order('nombre'),

        client
          .from('cap_maquinas')
          .select('id,codigo,nombre,activo')
          .order('nombre'),

        client
          .from('cap_maquinas_autorizaciones')
          .select(
            camposAutorizaciones.join(',')
          )
          .order('created_at', {
            ascending: false
          })
          .order('id', {
            ascending: false
          })
          .range(0, 999),

        client.rpc('cap_matriz_maquinas')

      ]);

      for (const response of [

        colaboradoresResponse,
        maquinasResponse,
        autorizacionesResponse,
        matrizResponse

      ]) {

        if (response.error) {
          throw response.error;
        }

      }

      const autorizacionesData =
        autorizacionesResponse.data || [];

      // Consultar las capacitaciones relacionadas
      // con las autorizaciones cargadas.

      const capacitacionIds = [...new Set(

        autorizacionesData
          .map(a => a.capacitacion_id)
          .filter(Boolean)

      )];

      const capacitacionesData = [];

      for (
        let i = 0;
        i < capacitacionIds.length;
        i += 100
      ) {

        const ids = capacitacionIds.slice(
          i, i + 100
        );

        const { data, error } = await client

          .from('cap_maquinas_capacitaciones')

          .select(
            camposCapacitaciones.join(',')
          )

          .in('id', ids);

        if (error) throw error;

        capacitacionesData.push(
          ...(data || [])
        );

      }

      setColaboradores(
        colaboradoresResponse.data || []
      );

      setMaquinas(
        maquinasResponse.data || []
      );

      setCapacitaciones(
        capacitacionesData
      );

      setAutorizaciones(
        autorizacionesData
      );

      setMatriz(
        matrizResponse.data || []
      );

    } catch (err) {

      setError(
        'No fue posible cargar las autorizaciones: ' +
        err.message
      );

    } finally {

      setLoading(false);

    }

  }, [
    client,
    role,
    canReadEvidence
  ]);

  useEffect(() => {

    setColaboradores([]);
    setMaquinas([]);
    setCapacitaciones([]);
    setAutorizaciones([]);
    setMatriz([]);

    setSelectedId(null);
    setAccion(null);
    setSuccess('');

    setFilterEstado(
      canManage ? 'PENDIENTE' : 'TODOS'
    );

    cargarDatos();

  }, [cargarDatos, canManage]);

  // ==========================================
  // RELACIONES
  // ==========================================

  const colaboradoresMap = useMemo(() => {

    return new Map(

      colaboradores.map(c => [c.id, c])

    );

  }, [colaboradores]);

  const maquinasMap = useMemo(() => {

    return new Map(

      maquinas.map(m => [m.id, m])

    );

  }, [maquinas]);

  const capacitacionesMap = useMemo(() => {

    return new Map(

      capacitaciones.map(c => [c.id, c])

    );

  }, [capacitaciones]);

  const matrizMap = useMemo(() => {

    return new Map(

      matriz.map(m => [

        `${m.colaborador_id}-${m.maquina_id}`,

        m

      ])

    );

  }, [matriz]);

  const registros = useMemo(() => {

    return autorizaciones.map(a => {

      const capacitacion =
        capacitacionesMap.get(
          a.capacitacion_id
        );

      const colaborador =
        colaboradoresMap.get(
          capacitacion?.colaborador_id
        );

      const maquina =
        maquinasMap.get(
          capacitacion?.maquina_id
        );

      const lider =
        colaboradoresMap.get(
          capacitacion?.lider_id
        );

      const estadoActual =
        matrizMap.get(
          `${capacitacion?.colaborador_id}-` +
          `${capacitacion?.maquina_id}`
        );

      return {

        ...a,

        capacitacion,

        colaborador,

        maquina,

        lider,

        estadoActual

      };

    });

  }, [
    autorizaciones,
    capacitacionesMap,
    colaboradoresMap,
    maquinasMap,
    matrizMap
  ]);

  const selected = registros.find(
    a => a.id === selectedId
  );

  // ==========================================
  // INDICADORES
  // ==========================================

  const indicadores = useMemo(() => {

    return {

      pendientes: autorizaciones.filter(
        a => a.estado === 'PENDIENTE'
      ).length,

      autorizadas: matriz.filter(
        m => m.autorizado === true
      ).length,

      suspendidas: autorizaciones.filter(
        a => a.estado === 'SUSPENDIDA'
      ).length,

      devueltas: autorizaciones.filter(
        a => a.estado === 'DEVUELTA'
      ).length,

      revocadas: autorizaciones.filter(
        a => a.estado === 'REVOCADA'
      ).length

    };

  }, [autorizaciones, matriz]);

  // ==========================================
  // FILTROS
  // ==========================================

  const filtered = useMemo(() => {

    const term = normalize(search);

    return registros.filter(a => {

      if (
        filterEstado !== 'TODOS' &&
        a.estado !== filterEstado
      ) {

        return false;

      }

      if (
        filterMaquina !== 'TODAS' &&
        a.maquina?.id !== filterMaquina
      ) {

        return false;

      }

      if (!term) return true;

      return [

        a.colaborador?.nombre,
        a.colaborador?.codigo,
        a.maquina?.nombre,
        a.maquina?.codigo,
        a.lider?.nombre,
        a.estado

      ].some(value =>

        normalize(value).includes(term)

      );

    });

  }, [
    registros,
    search,
    filterEstado,
    filterMaquina
  ]);

  // ==========================================
  // REVISAR AUTORIZACIÓN
  // ==========================================

  function seleccionarRegistro(registro) {

    if (saving) return;

    setSelectedId(registro.id);

    setAccion(null);

    setMotivo('');

    setEvidenciaRevisada(false);

    setDocumentoAbierto(false);

    setConfirmacion(false);

    setError('');

    setSuccess('');

  }

  function cerrarDetalle() {

    if (saving) return;

    setSelectedId(null);
    setAccion(null);
    setMotivo('');
    setConfirmacion(false);
    setEvidenciaRevisada(false);
    setDocumentoAbierto(false);

  }

  function seleccionarAccion(value) {

    if (!canManage || saving || !selected) {
      return;
    }

    const config = ACCIONES[value];

    if (
      !config ||
      !config.estados.includes(selected.estado)
    ) {

      setError(
        'La acción no está disponible ' +
        'para el estado actual.'
      );

      return;

    }

    setAccion(value);
    setMotivo('');
    setConfirmacion(false);
    setEvidenciaRevisada(false);
    setError('');

  }

  // ==========================================
  // CONSULTAR EVIDENCIA PRIVADA
  // ==========================================

  async function abrirEvidencia(registro) {

    if (
      !canReadEvidence ||
      !registro.capacitacion?.evidencia_path ||
      openingId
    ) {

      return;

    }

    const path =
      registro.capacitacion.evidencia_path;

    if (!path.startsWith('maquinas/')) {

      setError(
        'La ruta del documento no corresponde ' +
        'a una evidencia de máquinas.'
      );

      return;

    }

    const preview = window.open(
      'about:blank',
      '_blank'
    );

    if (!preview) {

      setError(
        'Permite las ventanas emergentes ' +
        'para consultar la evidencia.'
      );

      return;

    }

    preview.opener = null;

    setOpeningId(registro.id);

    setError('');

    try {

      const { data, error } = await client.storage

        .from(BUCKET)

        .createSignedUrl(path, 60);

      if (error) throw error;

      if (!data?.signedUrl) {

        throw new Error(
          'No se obtuvo acceso al documento.'
        );

      }

      if (preview.closed) {

        throw new Error(
          'La ventana de consulta fue cerrada.'
        );

      }

      preview.location.replace(
        data.signedUrl
      );

      if (registro.id === selectedId) {

        setDocumentoAbierto(true);

      }

    } catch (err) {

      preview.close();

      setError(
        'No fue posible consultar la evidencia: ' +
        err.message
      );

    } finally {

      setOpeningId(null);

    }

  }

  // ==========================================
  // EJECUTAR ACCIONES DE AUTORIZACIÓN
  // ==========================================

  async function ejecutarAccion(event) {

    event.preventDefault();

    if (
      !client ||
      !canManage ||
      !selected ||
      !accion ||
      saving
    ) {

      return;

    }

    setError('');
    setSuccess('');

    const config = ACCIONES[accion];

    if (
      !config.estados.includes(selected.estado)
    ) {

      setError(
        'El estado actual no permite esta acción.'
      );

      return;

    }

    const motivoFinal = motivo.trim();

    if (
      config.requiereMotivo &&
      !motivoFinal
    ) {

      setError(
        'Debes indicar el motivo de la acción.'
      );

      return;

    }

    if (accion === 'AUTORIZAR') {

      if (
        !selected.colaborador?.activo ||
        !selected.maquina?.activo
      ) {

        setError(
          'El colaborador y la máquina ' +
          'deben encontrarse activos.'
        );

        return;

      }

      if (
        !selected.capacitacion?.firma_lider ||
        !selected.capacitacion?.firma_colaborador
      ) {

        setError(
          'La capacitación no cuenta con ' +
          'las dos firmas verificadas.'
        );

        return;

      }

      if (
        !documentoAbierto ||
        !evidenciaRevisada
      ) {

        setError(
          'Debes abrir la evidencia y confirmar ' +
          'su revisión documental.'
        );

        return;

      }

    }

    if (
      accion === 'REVOCAR' &&
      !confirmacion
    ) {

      setError(
        'Debes confirmar la revocación definitiva.'
      );

      return;

    }

    const confirmed = window.confirm(

      config.nombre + '\n\n' +

      'Colaborador: ' +
      (selected.colaborador?.nombre || '—') +

      '\nMáquina: ' +
      (selected.maquina?.nombre || '—') +

      '\n\n' + config.mensaje +

      '\n\n¿Confirmas esta acción?'

    );

    if (!confirmed) return;

    setSaving(true);

    try {

      // Verificar identidad y permisos

      const {
        data: userData,
        error: authError
      } = await client.auth.getUser();

      if (authError || !userData?.user) {

        throw new Error(
          'La sesión no está disponible. ' +
          'Inicia sesión nuevamente.'
        );

      }

      const {
        data: actualRole,
        error: roleError
      } = await client.rpc(
        'cap_rol_actual'
      );

      if (
        roleError ||
        actualRole !== 'JEFE_PRODUCCION'
      ) {

        throw new Error(
          'Solo el jefe de producción ' +
          'puede ejecutar esta acción.'
        );

      }

      let params;

      if (accion === 'AUTORIZAR') {

        params = {

          p_autorizacion_id:
            selected.id,

          p_evidencia_revisada:
            true,

          p_observaciones:
            motivoFinal || null

        };

      } else {

        params = {

          p_autorizacion_id:
            selected.id,

          p_motivo:
            motivoFinal

        };

      }

      const { error } = await client.rpc(
        config.rpc,
        params
      );

      if (error) throw error;

      const mensajes = {

        AUTORIZAR:
          'Autorización emitida correctamente.',

        DEVOLVER:
          'Solicitud devuelta correctamente.',

        SUSPENDER:
          'Autorización suspendida correctamente.',

        REACTIVAR:
          'Autorización reactivada correctamente.',

        REVOCAR:
          'Autorización revocada correctamente.'

      };

      setSuccess(
        mensajes[accion]
      );

      setAccion(null);

      setSelectedId(null);

      setMotivo('');

      setEvidenciaRevisada(false);

      setDocumentoAbierto(false);

      setConfirmacion(false);

      await cargarDatos();

    } catch (err) {

      setError(
        'No fue posible completar la acción: ' +
        err.message
      );

    } finally {

      setSaving(false);

    }

  }

  // ==========================================
  // HISTORIAL DE MOVIMIENTOS DEL REGISTRO
  // ==========================================

  const movimientos = useMemo(() => {

    if (!selected) return [];

    const eventos = [

      {
        nombre: 'Solicitud generada',
        fecha: selected.created_at,
        motivo: null
      },

      {
        nombre: 'Autorización emitida',
        fecha: selected.fecha_autorizacion,
        motivo: selected.observaciones
      },

      {
        nombre: 'Solicitud devuelta',
        fecha: selected.fecha_devolucion,
        motivo: selected.motivo_devolucion
      },

      {
        nombre: 'Autorización suspendida',
        fecha: selected.fecha_suspension,
        motivo: selected.motivo_suspension
      },

      {
        nombre: 'Autorización reactivada',
        fecha: selected.fecha_reactivacion,
        motivo: selected.motivo_reactivacion
      },

      {
        nombre: 'Autorización revocada',
        fecha: selected.fecha_revocacion,
        motivo: selected.motivo_revocacion
      }

    ];

    return eventos

      .filter(e => e.fecha)

      .sort((a, b) =>

        new Date(a.fecha) -
        new Date(b.fecha)

      );

  }, [selected]);

  // ==========================================
  // VERIFICAR SESIÓN
  // ==========================================

  if (!client || !role) {

    return (

      <div className="cap-alert-warning">

        No hay una sesión autorizada
        de capacitación.

      </div>

    );

  }

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (

    <div className="cap-autorizaciones-maquinas">

      {/* ENCABEZADO */}

      <div className="cap-panel cap-toolbar">

        <div>

          <h2>Autorizaciones de máquinas</h2>

          <p className="cap-muted">

            Revisión documental, VoBo y control
            de permisos de operación.

          </p>

        </div>

        <button
          type="button"
          className="cap-secondary"
          disabled={loading || saving}
          onClick={cargarDatos}
        >

          <RefreshCw size={16} />
          Actualizar

        </button>

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

        <KPI
          icon={Clock}
          label="Pendientes de VoBo"
          value={indicadores.pendientes}
          description="Solicitudes por revisar"
          variant="cap-kpi-warning"
          color="#b45309"
        />

        <KPI
          icon={ShieldCheck}
          label="Combinaciones autorizadas"
          value={indicadores.autorizadas}
          description="Según motor de autorización"
          variant="cap-kpi-success"
          color="#15803d"
        />

        <KPI
          icon={PauseCircle}
          label="Suspendidas"
          value={indicadores.suspendidas}
          description="Autorizaciones suspendidas"
          variant="cap-kpi-danger"
          color="#b91c1c"
        />

        <KPI
          icon={RotateCcw}
          label="Devueltas"
          value={indicadores.devueltas}
          description="Solicitudes con observaciones"
          variant="cap-kpi-warning"
          color="#b45309"
        />

        <KPI
          icon={Ban}
          label="Revocadas"
          value={indicadores.revocadas}
          description="Revocaciones registradas"
          variant="cap-kpi-danger"
          color="#b91c1c"
        />

      </div>

      {/* DETALLE DE AUTORIZACIÓN */}

      {selected && (

        <div className="cap-panel">

          <div className="cap-toolbar">

            <h2>Detalle de autorización</h2>

            <button
              type="button"
              className="cap-secondary"
              disabled={saving}
              onClick={cerrarDetalle}
            >

              <X size={18} />
              Cerrar

            </button>

          </div>

          {/* DATOS DEL COLABORADOR */}

          <div
            className="cap-form-grid"
            style={{ marginTop: 24 }}
          >

            <div className="cap-field">

              <label>Colaborador</label>

              <strong>

                {selected.colaborador?.nombre || '—'}

              </strong>

              <span className="cap-muted">

                Código: {
                  selected.colaborador?.codigo || '—'
                }

              </span>

              <span className="cap-muted">

                Puesto: {
                  selected.colaborador?.puesto || '—'
                }

              </span>

            </div>

            <div className="cap-field">

              <label>Máquina</label>

              <strong>

                {selected.maquina?.nombre || '—'}

              </strong>

              <span className="cap-muted">

                Código: {
                  selected.maquina?.codigo || '—'
                }

              </span>

            </div>

            <div className="cap-field">

              <label>Líder de capacitación</label>

              <strong>

                {selected.lider?.nombre || '—'}

              </strong>

            </div>

            <div className="cap-field">

              <label>Fecha de capacitación</label>

              <strong>

                {formatDate(
                  selected.capacitacion
                    ?.fecha_capacitacion
                )}

              </strong>

            </div>

            <div className="cap-field">

              <label>Estado de la solicitud</label>

              <div>

                <Estado value={selected.estado} />

              </div>

            </div>

            <div className="cap-field">

              <label>Estado operativo actual</label>

              <div>

                <Estado
                  value={
                    selected.estadoActual?.estado ||
                    'NO_DISPONIBLE'
                  }
                />

              </div>

            </div>

          </div>

          {/* VERIFICACIÓN DOCUMENTAL */}

          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 20,
            margin: '20px 0'
          }}>

            <h3>Verificación documental</h3>

            {[

              {
                label: 'Firma del líder',
                cumple:
                  selected.capacitacion?.firma_lider
              },

              {
                label: 'Firma del colaborador',
                cumple:
                  selected.capacitacion
                    ?.firma_colaborador
              },

              {
                label: 'Validación del ingeniero',
                cumple: [

                  'VALIDADA',
                  'VALIDADO'

                ].includes(
                  selected.capacitacion?.estado
                )
              },

              {
                label: 'Evidencia revisada por el jefe',
                cumple:
                  selected.evidencia_revisada
              }

            ].map(item => (

              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 0',
                  borderBottom: '1px solid #e2e8f0'
                }}
              >

                {item.cumple ? (

                  <CheckCircle
                    size={20}
                    color="#15803d"
                  />

                ) : (

                  <Clock
                    size={20}
                    color="#b45309"
                  />

                )}

                <span style={{ flex: 1 }}>

                  {item.label}

                </span>

                <span className={

                  item.cumple

                    ? 'cap-status cap-status-success'

                    : 'cap-status cap-status-warning'

                }>

                  {item.cumple
                    ? 'VERIFICADO'
                    : 'PENDIENTE'}

                </span>

              </div>

            ))}

            {canReadEvidence && (

              <div style={{ marginTop: 20 }}>

                <div className="cap-toolbar">

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    overflowWrap: 'anywhere'
                  }}>

                    <FileText
                      size={24}
                      color="#164b83"
                    />

                    <div>

                      <strong>

                        Evidencia de capacitación

                      </strong>

                      <div className="cap-muted">

                        {
                          selected.capacitacion
                            ?.evidencia_nombre ||
                          'Documento no disponible'
                        }

                      </div>

                    </div>

                  </div>

                  <button
                    type="button"
                    className="cap-secondary"
                    disabled={
                      !selected.capacitacion
                        ?.evidencia_path ||
                      Boolean(openingId) ||
                      saving
                    }
                    onClick={() =>
                      abrirEvidencia(selected)
                    }
                  >

                    <ExternalLink size={16} />

                    {openingId === selected.id

                      ? 'Abriendo...'

                      : 'Consultar evidencia'}

                  </button>

                </div>

                {documentoAbierto && (

                  <p className="cap-muted">

                    Se abrió el enlace del documento.
                    Confirma su contenido después
                    de revisarlo.

                  </p>

                )}

              </div>

            )}

            {canReadEvidence &&
             selected.capacitacion?.observaciones && (

              <div
                className="cap-alert-info"
                style={{ marginTop: 20 }}
              >

                <strong>

                  Observaciones de capacitación

                </strong>

                <p>

                  {selected.capacitacion.observaciones}

                </p>

              </div>

            )}

          </div>

          {/* ACCIONES DEL JEFE */}

          {canManage && (

            <>

              <h3>Acciones disponibles</h3>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 20
              }}>

                {Object.entries(ACCIONES)

                  .filter(([, config]) =>

                    config.estados.includes(
                      selected.estado
                    )

                  )

                  .map(([value, config]) => {

                    const Icon = config.icon;

                    return (

                      <button
                        type="button"
                        key={value}
                        disabled={saving}
                        className={

                          accion === value

                            ? 'cap-primary'

                            : 'cap-secondary'

                        }
                        onClick={() =>
                          seleccionarAccion(value)
                        }
                        aria-pressed={accion === value}
                      >

                        <Icon size={17} />

                        {config.nombre}

                      </button>

                    );

                  })}

              </div>

              {!Object.values(ACCIONES).some(

                config => config.estados.includes(
                  selected.estado
                )

              ) && (

                <div className="cap-alert-info">

                  Este registro se encuentra cerrado
                  o no dispone de acciones adicionales.

                </div>

              )}

            </>

          )}

          {/* FORMULARIO DE ACCIÓN */}

          {accion && canManage && (

            <form onSubmit={ejecutarAccion}>

              <div className={

                accion === 'REVOCAR' ||
                accion === 'SUSPENDER'

                  ? 'cap-alert-warning'

                  : 'cap-alert-info'

              }>

                <strong>

                  {ACCIONES[accion].nombre}

                </strong>

                <p>

                  {ACCIONES[accion].mensaje}

                </p>

              </div>

              {accion === 'AUTORIZAR' && (

                <div
                  className="cap-field"
                  style={{ marginBottom: 20 }}
                >

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>

                    <input
                      type="checkbox"
                      checked={evidenciaRevisada}
                      disabled={
                        saving ||
                        !documentoAbierto
                      }
                      onChange={e =>
                        setEvidenciaRevisada(
                          e.target.checked
                        )
                      }
                      style={{ width: 18 }}
                      required
                    />

                    Confirmo que revisé la evidencia,
                    las firmas y la documentación de
                    capacitación correspondiente.

                  </label>

                  {!documentoAbierto && (

                    <span className="cap-muted">

                      Primero debes abrir
                      el documento de evidencia.

                    </span>

                  )}

                </div>

              )}

              <div className="cap-field">

                <label htmlFor="cap-autmaq-motivo">

                  {ACCIONES[accion].requiereMotivo

                    ? 'Motivo de la acción *'

                    : 'Observaciones del jefe'}

                </label>

                <textarea
                  id="cap-autmaq-motivo"
                  value={motivo}
                  required={
                    ACCIONES[accion].requiereMotivo
                  }
                  disabled={saving}
                  onChange={e =>
                    setMotivo(e.target.value)
                  }
                  placeholder={

                    accion === 'DEVOLVER'

                      ? 'Indica qué debe corregirse...'

                      : accion === 'AUTORIZAR'

                        ? 'Observaciones del VoBo...'

                        : 'Describe el motivo de la decisión...'

                  }
                />

              </div>

              {accion === 'REVOCAR' && (

                <div className="cap-error">

                  <ShieldAlert size={20} />

                  {' '}

                  <strong>

                    Revocación definitiva

                  </strong>

                  <p>

                    La autorización revocada
                    no podrá reactivarse.
                    El historial será conservado.

                  </p>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>

                    <input
                      type="checkbox"
                      checked={confirmacion}
                      disabled={saving}
                      onChange={e =>
                        setConfirmacion(
                          e.target.checked
                        )
                      }
                      required
                    />

                    Confirmo que deseo revocar
                    definitivamente esta autorización.

                  </label>

                </div>

              )}

              <div className="cap-form-actions">

                <button
                  type="button"
                  className="cap-secondary"
                  disabled={saving}
                  onClick={() => {

                    setAccion(null);
                    setMotivo('');
                    setConfirmacion(false);
                    setEvidenciaRevisada(false);

                  }}
                >

                  <X size={16} />
                  Cancelar

                </button>

                <button
                  type="submit"
                  className="cap-primary"
                  disabled={

                    saving ||

                    (
                      accion === 'AUTORIZAR' &&
                      !evidenciaRevisada
                    ) ||

                    (
                      accion === 'REVOCAR' &&
                      !confirmacion
                    )

                  }
                  style={

                    accion === 'REVOCAR' ||
                    accion === 'SUSPENDER'

                      ? {
                          background: '#b91c1c',
                          borderColor: '#b91c1c'
                        }

                      : undefined

                  }
                >

                  <Save size={18} />

                  {saving

                    ? 'Procesando...'

                    : ACCIONES[accion].nombre}

                </button>

              </div>

            </form>

          )}

          {/* RESUMEN DE MOVIMIENTOS */}

          <div style={{ marginTop: 28 }}>

            <h3>Movimientos del registro</h3>

            {movimientos.map((evento, index) => (

              <div
                key={`${evento.nombre}-${index}`}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '14px 0',
                  borderBottom: '1px solid #e2e8f0'
                }}
              >

                <Clock
                  size={18}
                  color="#64748b"
                />

                <div style={{ flex: 1 }}>

                  <strong>

                    {evento.nombre}

                  </strong>

                  <div className="cap-muted">

                    {formatDateTime(evento.fecha)}

                  </div>

                  {canReadEvidence &&
                   evento.motivo && (

                    <p style={{
                      fontSize: 13,
                      marginBottom: 0
                    }}>

                      {evento.motivo}

                    </p>

                  )}

                </div>

              </div>

            ))}

            <p className="cap-muted">

              Este resumen muestra las fechas
              disponibles del registro.
              La trazabilidad completa se conserva
              en el historial de Supabase.

            </p>

          </div>

        </div>

      )}

      {/* CATÁLOGO DE AUTORIZACIONES */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>Solicitudes y autorizaciones</h2>

          <span className="cap-muted">

            {filtered.length} registros

          </span>

        </div>

        {/* BÚSQUEDA */}

        <div className="cap-search">

          <Search size={18} />

          <input
            value={search}
            placeholder="Buscar colaborador o máquina..."
            aria-label="Buscar autorizaciones"
            onChange={e =>
              setSearch(e.target.value)
            }
          />

        </div>

        {/* FILTROS DE ESTADO */}

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 20
        }}>

          {[

            ['TODOS', 'Todas'],

            ['PENDIENTE', 'Pendientes'],

            ['AUTORIZADA', 'Autorizadas'],

            ['DEVUELTA', 'Devueltas'],

            ['SUSPENDIDA', 'Suspendidas'],

            ['REVOCADA', 'Revocadas']

          ].map(([value, label]) => (

            <button
              key={value}
              type="button"
              className={

                filterEstado === value

                  ? 'cap-primary'

                  : 'cap-secondary'

              }
              aria-pressed={filterEstado === value}
              onClick={() =>
                setFilterEstado(value)
              }
            >

              {label}

            </button>

          ))}

        </div>

        <div
          className="cap-field"
          style={{ maxWidth: 400 }}
        >

          <label htmlFor="cap-autmaq-filtro">

            Filtrar por máquina

          </label>

          <select
            id="cap-autmaq-filtro"
            value={filterMaquina}
            onChange={e =>
              setFilterMaquina(e.target.value)
            }
          >

            <option value="TODAS">

              Todas las máquinas

            </option>

            {maquinas.map(m => (

              <option
                key={m.id}
                value={m.id}
              >

                {m.nombre}

              </option>

            ))}

          </select>

        </div>

        {autorizaciones.length >= 1000 && (

          <div className="cap-alert-warning">

            Se muestran hasta 1,000 autorizaciones.
            Los indicadores históricos corresponden
            a los registros cargados.

          </div>

        )}

        {/* TABLA */}

        {loading ? (

          <div
            className="cap-welcome"
            role="status"
          >

            <RefreshCw size={32} />

            <p>Cargando autorizaciones...</p>

          </div>

        ) : (

          <div className="cap-table-wrap">

            <table>

              <thead>

                <tr>

                  <th>Colaborador</th>

                  <th>Máquina</th>

                  <th>Fecha capacitación</th>

                  <th>Solicitud</th>

                  <th>Estado operativo</th>

                  <th>Fecha autorización</th>

                  <th>Acciones</th>

                </tr>

              </thead>

              <tbody>

                {filtered.map(a => (

                  <tr key={a.id}>

                    <td>

                      <strong>

                        {a.colaborador?.nombre || '—'}

                      </strong>

                      <div className="cap-muted">

                        {a.colaborador?.codigo}

                      </div>

                    </td>

                    <td>

                      {a.maquina?.nombre || '—'}

                    </td>

                    <td>

                      {formatDate(

                        a.capacitacion
                          ?.fecha_capacitacion

                      )}

                    </td>

                    <td>

                      <Estado value={a.estado} />

                    </td>

                    <td>

                      <Estado
                        value={
                          a.estadoActual?.estado ||
                          'NO_DISPONIBLE'
                        }
                      />

                    </td>

                    <td>

                      {formatDate(
                        a.fecha_autorizacion
                      )}

                    </td>

                    <td>

                      <button
                        type="button"
                        className="cap-secondary"
                        disabled={saving}
                        onClick={() =>
                          seleccionarRegistro(a)
                        }
                      >

                        {canManage &&
                         a.estado === 'PENDIENTE'

                          ? <ClipboardCheck size={16} />

                          : <Eye size={16} />}

                        {canManage &&
                         a.estado === 'PENDIENTE'

                          ? 'Revisar'

                          : 'Ver detalle'}

                      </button>

                    </td>

                  </tr>

                ))}

                {filtered.length === 0 && (

                  <tr>

                    <td
                      colSpan={7}
                      className="cap-empty"
                    >

                      No se encontraron
                      autorizaciones para este filtro.

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
