
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef
} from 'react';

import {
  Bell,
  BellRing,
  BellOff,
  Check,
  CheckCheck,
  Clock,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Award,
  Search,
  RefreshCw,
  Mail,
  MailOpen,
  X
} from 'lucide-react';

import './capacitacion.css';

// ==========================================
// CONFIGURACIÓN
// ==========================================

const REFRESH_INTERVAL = 60000;

const PAGE_SIZE = 200;

const ROLES = {

  JEFE_PRODUCCION: 'Jefe de producción',

  ING_PROCESOS: 'Ingeniero de procesos',

  GESTOR_RC: 'Gestor de riesgos críticos',

  CONSULTA: 'Consulta'

};

const PRIORIDADES = {

  CRITICA: {

    label: 'Crítica',

    color: '#991b1b',

    background: '#fee2e2',

    border: '#dc2626',

    orden: 1,

    icon: ShieldAlert

  },

  ALTA: {

    label: 'Alta',

    color: '#9a3412',

    background: '#ffedd5',

    border: '#ea580c',

    orden: 2,

    icon: AlertTriangle

  },

  NORMAL: {

    label: 'Normal',

    color: '#164b83',

    background: '#dbeafe',

    border: '#2563eb',

    orden: 3,

    icon: Bell

  },

  BAJA: {

    label: 'Baja',

    color: '#475569',

    background: '#f1f5f9',

    border: '#94a3b8',

    orden: 4,

    icon: Bell

  }

};

const TIPOS = {

  ALERTA_VENCIMIENTO_CERTIFICACION:
    'Vencimiento de certificación adicional',

  ALERTA_VENCIMIENTO:
    'Alerta de vencimiento'

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

function getPrioridad(value) {

  return PRIORIDADES[value] || {

    label: String(
      value || 'Sin prioridad'
    ).replaceAll('_', ' '),

    color: '#64748b',

    background: '#f1f5f9',

    border: '#94a3b8',

    orden: 5,

    icon: Bell

  };

}

function getTipo(value) {

  return TIPOS[value] ||

    String(value || 'Notificación')
      .replaceAll('_', ' ');

}

function esCertificacion(notificacion) {

  return String(
    notificacion.tipo || ''
  ).includes('CERTIFICACION');

}

function formatDate(value) {

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

function fechaRelativa(value) {

  if (!value) return '—';

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {

    return '—';

  }

  const minutos = Math.floor(

    (Date.now() - timestamp) / 60000

  );

  if (minutos < 0) {

    return formatDate(value);

  }

  if (minutos < 1) {

    return 'Ahora mismo';

  }

  if (minutos < 60) {

    return `Hace ${minutos} min`;

  }

  const horas = Math.floor(minutos / 60);

  if (horas < 24) {

    return horas === 1

      ? 'Hace 1 hora'

      : `Hace ${horas} horas`;

  }

  const dias = Math.floor(horas / 24);

  if (dias < 7) {

    return dias === 1

      ? 'Hace 1 día'

      : `Hace ${dias} días`;

  }

  return formatDate(value);

}

// ==========================================
// COMPONENTES VISUALES
// ==========================================

function Prioridad({ value, optional }) {

  const config = getPrioridad(value);

  return (

    <span
      className="cap-status"
      style={{

        background: optional

          ? '#ede9fe'

          : config.background,

        color: optional

          ? '#6d28d9'

          : config.color

      }}
    >

      {config.label}

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
// TARJETA DE NOTIFICACIÓN
// ==========================================

function NotificationCard({
  item,
  busy,
  onRead
}) {

  const optional = esCertificacion(item);

  const config = getPrioridad(
    item.prioridad
  );

  const Icon = optional

    ? Award

    : config.icon;

  return (

    <article style={{

      background: item.leida

        ? '#ffffff'

        : optional

          ? '#faf8ff'

          : '#f8fbff',

      border: '1px solid #e2e8f0',

      borderLeft: `4px solid ${

        optional

          ? '#7c3aed'

          : config.border

      }`,

      borderRadius: 10,

      padding: 18,

      marginBottom: 12

    }}>

      <div style={{

        display: 'flex',

        alignItems: 'flex-start',

        gap: 14

      }}>

        {/* ICONO */}

        <div style={{

          width: 44,

          height: 44,

          borderRadius: 10,

          display: 'flex',

          alignItems: 'center',

          justifyContent: 'center',

          flexShrink: 0,

          background: optional

            ? '#ede9fe'

            : config.background,

          color: optional

            ? '#7c3aed'

            : config.color

        }}>

          <Icon size={23} />

        </div>

        {/* CONTENIDO */}

        <div style={{

          flex: 1,

          minWidth: 0

        }}>

          <div style={{

            display: 'flex',

            flexWrap: 'wrap',

            alignItems: 'center',

            gap: 8,

            marginBottom: 8

          }}>

            <Prioridad

              value={item.prioridad}

              optional={optional}

            />

            {!item.leida && (

              <span className={

                'cap-status cap-status-warning'

              }>

                NO LEÍDA

              </span>

            )}

            {optional && (

              <span className={

                'cap-status cap-status-optional'

              }>

                CERTIFICACIÓN OPCIONAL

              </span>

            )}

          </div>

          <h3 style={{

            margin: '0 0 8px',

            fontSize: 16,

            color: '#164b83',

            overflowWrap: 'anywhere'

          }}>

            {item.titulo || 'Notificación'}

          </h3>

          <p style={{

            margin: '0 0 12px',

            fontSize: 14,

            lineHeight: 1.6,

            whiteSpace: 'pre-wrap',

            overflowWrap: 'anywhere',

            color: '#334155'

          }}>

            {item.mensaje}

          </p>

          {optional && (

            <p style={{

              color: '#7c3aed',

              fontSize: 12,

              marginBottom: 12

            }}>

              No afecta la autorización operativa.

            </p>

          )}

          <div style={{

            display: 'flex',

            flexWrap: 'wrap',

            gap: 12,

            alignItems: 'center'

          }}>

            <span
              className="cap-muted"
              title={formatDate(item.created_at)}
            >

              <Clock size={13} />

              {' '}

              {fechaRelativa(item.created_at)}

            </span>

            <span className="cap-muted">

              {getTipo(item.tipo)}

            </span>

          </div>

          {item.leida &&
           item.fecha_lectura && (

            <div
              className="cap-muted"
              style={{ marginTop: 10 }}
            >

              <CheckCheck size={15} />

              {' '}

              Leída: {formatDate(
                item.fecha_lectura
              )}

            </div>

          )}

          {!item.leida && (

            <div style={{ marginTop: 14 }}>

              <button
                type="button"
                className="cap-secondary"
                disabled={busy}
                onClick={() => onRead(item.id)}
              >

                <Check size={16} />

                Marcar como leída

              </button>

            </div>

          )}

        </div>

      </div>

    </article>

  );

}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function Notificaciones({
  client,
  role
}) {

  const canRead = Object.prototype
    .hasOwnProperty.call(ROLES, role);

  const [notificaciones, setNotificaciones] =
    useState([]);

  const [lecturas, setLecturas] =
    useState([]);

  const [userId, setUserId] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [warning, setWarning] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [filterLectura, setFilterLectura] =
    useState('NO_LEIDAS');

  const [filterPrioridad, setFilterPrioridad] =
    useState('TODAS');

  const [filterTipo, setFilterTipo] =
    useState('TODOS');

  const [filterCategoria, setFilterCategoria] =
    useState('TODAS');

  const [orden, setOrden] =
    useState('PRIORIDAD');

  const [ultimaConsulta, setUltimaConsulta] =
    useState(null);

  const [autoRefresh, setAutoRefresh] =
    useState(true);

  const [visibleCount, setVisibleCount] =
    useState(30);

  const mountedRef = useRef(false);

  const requestRef = useRef(0);

  const loadingRef = useRef(false);

  const savingRef = useRef(false);

  // ==========================================
  // CONSULTA PAGINADA
  // ==========================================

  const consultarPaginas = useCallback(
    async (queryBuilder) => {

      const registros = [];

      let offset = 0;

      while (true) {

        const { data, error } =
          await queryBuilder()

            .range(
              offset,
              offset + PAGE_SIZE - 1
            );

        if (error) throw error;

        const page = data || [];

        registros.push(...page);

        if (page.length < PAGE_SIZE) {

          break;

        }

        offset += PAGE_SIZE;

      }

      return registros;

    },
    []
  );

  // ==========================================
  // CARGAR NOTIFICACIONES Y LECTURAS
  // ==========================================

  const cargarDatos = useCallback(
    async (silencioso = false) => {

      if (!client || !canRead) {

        setNotificaciones([]);
        setLecturas([]);
        setUserId(null);
        setLoading(false);

        return;

      }

      if (
        loadingRef.current ||
        savingRef.current
      ) return;

      loadingRef.current = true;

      const requestId = ++requestRef.current;

      if (silencioso) {

        setRefreshing(true);

      } else {

        setLoading(true);

      }

      setError('');
      setWarning('');

      try {

        // 1. Identificar al usuario autenticado.

        const {
          data: authData,
          error: authError
        } = await client.auth.getUser();

        if (authError || !authData?.user) {

          throw new Error(

            'La sesión no está disponible. ' +
            'Inicia sesión nuevamente.'

          );

        }

        const currentUser =
          authData.user.id;

        // 2. Comprobar perfil vigente.

        const {
          data: actualRole,
          error: roleError
        } = await client.rpc(
          'cap_rol_actual'
        );

        if (
          roleError ||
          actualRole !== role
        ) {

          throw new Error(

            'El perfil de capacitación ' +
            'no se encuentra vigente.'

          );

        }

        // 3. Consultar notificaciones activas
        // destinadas al perfil actual.
        //
        // RLS continúa siendo la protección
        // principal de la información.

        const notificacionesData =
          await consultarPaginas(() =>

            client

              .from('cap_notificaciones')

              .select(`
                id,
                created_at,
                rol_destinatario,
                tipo,
                titulo,
                mensaje,
                prioridad,
                colaborador_id,
                tabla_origen,
                registro_id,
                activa
              `)

              .eq('rol_destinatario', role)

              .eq('activa', true)

              .order('created_at', {

                ascending: false

              })

              .order('id', {

                ascending: false

              })

          );

        // 4. Consultar únicamente lecturas
        // correspondientes al usuario actual.

        const lecturasData =
          await consultarPaginas(() =>

            client

              .from(
                'cap_notificaciones_lecturas'
              )

              .select(`
                notificacion_id,
                usuario_id,
                fecha_lectura
              `)

              .eq('usuario_id', currentUser)

              .order('notificacion_id', {

                ascending: true

              })

          );

        // 5. Evitar actualizar un componente
        // desmontado o una consulta obsoleta.

        if (

          !mountedRef.current ||

          requestRef.current !== requestId

        ) return;

        setUserId(currentUser);

        setNotificaciones(
          notificacionesData
        );

        setLecturas(lecturasData);

        setUltimaConsulta(new Date());

      } catch (err) {

        if (

          !mountedRef.current ||

          requestRef.current !== requestId

        ) return;

        setNotificaciones([]);

        setLecturas([]);

        setUserId(null);

        setUltimaConsulta(null);

        setError(

          'No fue posible consultar las ' +
          'notificaciones: ' + err.message

        );

      } finally {

        if (

          mountedRef.current &&

          requestRef.current === requestId

        ) {

          loadingRef.current = false;

          setLoading(false);

          setRefreshing(false);

        }

      }

    },
    [
      client,
      role,
      canRead,
      consultarPaginas
    ]
  );

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  useEffect(() => {

    mountedRef.current = true;

    loadingRef.current = false;

    savingRef.current = false;

    setNotificaciones([]);

    setLecturas([]);

    setUserId(null);

    setSuccess('');

    setSaving(false);

    setSearch('');

    setFilterLectura('NO_LEIDAS');

    setFilterPrioridad('TODAS');

    setFilterTipo('TODOS');

    setFilterCategoria('TODAS');

    cargarDatos();

    return () => {

      mountedRef.current = false;

      requestRef.current += 1;

      loadingRef.current = false;

    };

  }, [cargarDatos]);

  // ==========================================
  // ACTUALIZACIÓN AUTOMÁTICA
  // ==========================================

  useEffect(() => {

    if (!autoRefresh || !canRead) {

      return;

    }

    const interval = window.setInterval(
      () => {

        if (

          document.visibilityState ===
            'visible' &&

          !loadingRef.current &&

          !savingRef.current

        ) {

          cargarDatos(true);

        }

      },
      REFRESH_INTERVAL
    );

    return () => {

      window.clearInterval(interval);

    };

  }, [
    autoRefresh,
    canRead,
    cargarDatos
  ]);

  // ==========================================
  // RELACIONAR NOTIFICACIONES CON LECTURAS
  // ==========================================

  const lecturasMap = useMemo(() => {

    return new Map(

      lecturas.map(l => [

        l.notificacion_id,

        l

      ])

    );

  }, [lecturas]);

  const registros = useMemo(() => {

    return notificaciones.map(n => {

      const lectura =
        lecturasMap.get(n.id);

      return {

        ...n,

        leida: Boolean(lectura),

        fecha_lectura:
          lectura?.fecha_lectura || null

      };

    });

  }, [notificaciones, lecturasMap]);

  // ==========================================
  // INDICADORES
  // ==========================================

  const indicadores = useMemo(() => {

    const noLeidas = registros.filter(

      n => !n.leida

    );

    const operativas = noLeidas.filter(

      n => !esCertificacion(n)

    );

    return {

      total: registros.length,

      noLeidas: noLeidas.length,

      leidas:

        registros.length -

        noLeidas.length,

      criticas: operativas.filter(

        n => n.prioridad === 'CRITICA'

      ).length,

      altas: operativas.filter(

        n => n.prioridad === 'ALTA'

      ).length,

      certificaciones: noLeidas.filter(

        esCertificacion

      ).length

    };

  }, [registros]);

  // ==========================================
  // TIPOS DE NOTIFICACIONES DISPONIBLES
  // ==========================================

  const tiposDisponibles = useMemo(() => {

    return [...new Set(

      registros

        .map(n => n.tipo)

        .filter(Boolean)

    )].sort((a, b) =>

      getTipo(a).localeCompare(
        getTipo(b),
        'es'
      )

    );

  }, [registros]);

  // ==========================================
  // FILTROS
  // ==========================================

  const filtered = useMemo(() => {

    const term = normalize(search);

    return registros

      .filter(n => {

        if (

          filterLectura === 'NO_LEIDAS' &&

          n.leida

        ) return false;

        if (

          filterLectura === 'LEIDAS' &&

          !n.leida

        ) return false;

        if (

          filterPrioridad !== 'TODAS' &&

          n.prioridad !== filterPrioridad

        ) return false;

        if (

          filterTipo !== 'TODOS' &&

          n.tipo !== filterTipo

        ) return false;

        if (

          filterCategoria === 'OPERATIVAS' &&

          esCertificacion(n)

        ) return false;

        if (

          filterCategoria ===
            'CERTIFICACIONES' &&

          !esCertificacion(n)

        ) return false;

        if (!term) return true;

        return [

          n.titulo,

          n.mensaje,

          getTipo(n.tipo),

          getPrioridad(n.prioridad).label

        ].some(value =>

          normalize(value).includes(term)

        );

      })

      .sort((a, b) => {

        if (orden === 'ANTIGUAS') {

          return (

            new Date(a.created_at) -

            new Date(b.created_at)

          );

        }

        if (orden === 'RECIENTES') {

          return (

            new Date(b.created_at) -

            new Date(a.created_at)

          );

        }

        // Primero operativas no leídas.
        // Las certificaciones opcionales
        // se mantienen en un nivel separado.

        return (

          Number(a.leida) -

          Number(b.leida)

        ) || (

          Number(esCertificacion(a)) -

          Number(esCertificacion(b))

        ) || (

          getPrioridad(a.prioridad).orden -

          getPrioridad(b.prioridad).orden

        ) || (

          new Date(b.created_at) -

          new Date(a.created_at)

        );

      });

  }, [

    registros,

    search,

    filterLectura,

    filterPrioridad,

    filterTipo,

    filterCategoria,

    orden

  ]);

  useEffect(() => {

    setVisibleCount(30);

  }, [

    search,

    filterLectura,

    filterPrioridad,

    filterTipo,

    filterCategoria,

    orden

  ]);

  // ==========================================
  // LIMPIAR FILTROS
  // ==========================================

  function limpiarFiltros() {

    setSearch('');

    setFilterLectura('TODAS');

    setFilterPrioridad('TODAS');

    setFilterTipo('TODOS');

    setFilterCategoria('TODAS');

    setOrden('PRIORIDAD');

    setVisibleCount(30);

  }

  // ==========================================
  // REGISTRAR LECTURAS MEDIANTE RPC
  // ==========================================

  async function registrarLecturas(ids) {

    if (

      !client ||

      !userId ||

      !canRead ||

      savingRef.current ||

      loadingRef.current ||

      !ids.length

    ) return;

    savingRef.current = true;

    setSaving(true);

    setError('');

    setSuccess('');

    setWarning('');

    const operationId =
      requestRef.current;

    let completadas = 0;

    try {

      // Confirmar identidad y perfil.

      const {
        data: authData,
        error: authError
      } = await client.auth.getUser();

      if (

        authError ||

        authData?.user?.id !== userId

      ) {

        throw new Error(

          'La sesión ha cambiado. ' +
          'Actualiza las notificaciones.'

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
        actualRole !== role
      ) {

        throw new Error(

          'El perfil actual no tiene ' +
          'acceso a esta operación.'

        );

      }

      // Limitar la operación a las
      // notificaciones visibles y no leídas.

      const permitidas = new Set(

        registros

          .filter(n => !n.leida)

          .map(n => n.id)

      );

      const pendientes = [...new Set(ids)]

        .filter(id =>

          permitidas.has(id)

        );

      // Ejecutar secuencialmente.
      // No modificar directamente la tabla.

      for (const id of pendientes) {

        if (

          !mountedRef.current ||

          requestRef.current !== operationId

        ) break;

        const { error } = await client.rpc(

          'cap_marcar_notificacion_leida',

          {

            p_notificacion_id: id

          }

        );

        if (error) throw error;

        completadas += 1;

      }

      if (

        mountedRef.current &&

        requestRef.current === operationId

      ) {

        setSuccess(

          completadas === 1

            ? 'Notificación marcada como leída.'

            : `${completadas} notificaciones marcadas como leídas.`

        );

      }

    } catch (err) {

      if (

        mountedRef.current &&

        requestRef.current === operationId

      ) {

        setWarning(

          `Lecturas registradas: ${completadas}. ` +

          'No fue posible completar toda ' +

          'la operación: ' + err.message

        );

      }

    } finally {

      if (

        mountedRef.current &&

        requestRef.current === operationId

      ) {

        savingRef.current = false;

        setSaving(false);

        // Consultar nuevamente Supabase.
        // No asumir que todas las lecturas
        // se registraron correctamente.

        await cargarDatos(true);

      }

    }

  }

  // ==========================================
  // MARCAR UNA NOTIFICACIÓN
  // ==========================================

  function marcarLeida(id) {

    registrarLecturas([id]);

  }

  // ==========================================
  // MARCAR TODAS LAS NO LEÍDAS
  // ==========================================

  function marcarTodasLeidas() {

    const pendientes = registros

      .filter(n => !n.leida)

      .map(n => n.id);

    if (

      !pendientes.length ||

      saving ||

      loading ||

      refreshing

    ) return;

    const confirmed = window.confirm(

      `¿Marcar ${pendientes.length} ` +

      'notificaciones como leídas?\n\n' +

      'Esta acción incluye todas las ' +

      'notificaciones activas de tu perfil, ' +

      'aunque no coincidan con los filtros.\n\n' +

      'No modifica autorizaciones ni ' +

      'resuelve requisitos de seguridad.'

    );

    if (!confirmed) return;

    registrarLecturas(pendientes);

  }

  // ==========================================
  // VALIDAR SESIÓN
  // ==========================================

  if (!client || !canRead) {

    return (

      <div className="cap-panel cap-welcome">

        <BellOff size={40} />

        <h2>Notificaciones no disponibles</h2>

        <p>

          No hay una sesión autorizada
          de capacitación.

        </p>

      </div>

    );

  }

  const busy =

    loading ||

    refreshing ||

    saving;

  const mostrarValor = value =>

    loading || error ? '—' : value;

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (

    <div className="cap-notificaciones">

      {/* ENCABEZADO */}

      <div className="cap-panel cap-toolbar">

        <div>

          <div style={{

            display: 'flex',

            alignItems: 'center',

            gap: 12

          }}>

            <BellRing

              size={28}

              color="#164b83"

            />

            <h2 style={{ margin: 0 }}>

              Centro de notificaciones

            </h2>

            {indicadores.noLeidas > 0 &&
             !loading &&
             !error && (

              <span style={{

                background: '#dc2626',

                color: '#ffffff',

                borderRadius: 20,

                padding: '4px 10px',

                fontWeight: 700,

                fontSize: 12

              }}>

                {indicadores.noLeidas > 99

                  ? '99+'

                  : indicadores.noLeidas}

              </span>

            )}

          </div>

          <p className="cap-muted">

            Alertas, solicitudes y seguimiento

            {' · '}

            {ROLES[role]}

          </p>

          {ultimaConsulta && (

            <span className="cap-muted">

              Última actualización:

              {' '}

              {formatDate(ultimaConsulta)}

            </span>

          )}

        </div>

        <div style={{

          display: 'flex',

          flexWrap: 'wrap',

          gap: 10

        }}>

          <button
            type="button"
            className="cap-secondary"
            disabled={busy}
            onClick={() => cargarDatos()}
          >

            <RefreshCw size={16} />

            {refreshing

              ? 'Actualizando...'

              : 'Actualizar'}

          </button>

          <button
            type="button"
            className="cap-primary"
            disabled={

              busy ||

              Boolean(error) ||

              indicadores.noLeidas === 0

            }
            onClick={marcarTodasLeidas}
          >

            <CheckCheck size={18} />

            {saving

              ? 'Registrando lecturas...'

              : 'Marcar todas como leídas'}

          </button>

        </div>

      </div>

      {/* MENSAJES */}

      {error && (

        <div className="cap-error" role="alert">

          {error}

        </div>

      )}

      {warning && (

        <div
          className="cap-alert-warning"
          role="alert"
        >

          {warning}

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

          icon={Bell}

          label="Notificaciones activas"

          value={mostrarValor(
            indicadores.total
          )}

          description="Eventos disponibles para tu perfil"

        />

        <KPI

          icon={Mail}

          label="No leídas"

          value={mostrarValor(
            indicadores.noLeidas
          )}

          description="Pendientes de revisión"

          variant="cap-kpi-warning"

          color="#b45309"

        />

        <KPI

          icon={ShieldAlert}

          label="Críticas no leídas"

          value={mostrarValor(
            indicadores.criticas
          )}

          description="Alertas operativas prioritarias"

          variant="cap-kpi-danger"

          color="#b91c1c"

        />

        <KPI

          icon={AlertTriangle}

          label="Prioridad alta"

          value={mostrarValor(
            indicadores.altas
          )}

          description="Alertas operativas no leídas"

          variant="cap-kpi-warning"

          color="#c2410c"

        />

        <KPI

          icon={Award}

          label="Alertas de certificación"

          value={mostrarValor(
            indicadores.certificaciones
          )}

          description="Seguimiento opcional no leído"

          variant="cap-kpi-certification"

          color="#7c3aed"

        />

        <KPI

          icon={MailOpen}

          label="Leídas"

          value={mostrarValor(
            indicadores.leidas
          )}

          description="Notificaciones activas revisadas"

          variant="cap-kpi-success"

          color="#15803d"

        />

      </div>

      {/* ALERTA DE PRIORIDAD CRÍTICA */}

      {!loading &&
       !error &&
       indicadores.criticas > 0 && (

        <div className="cap-error">

          <div style={{

            display: 'flex',

            alignItems: 'center',

            gap: 12

          }}>

            <ShieldAlert size={25} />

            <div style={{ flex: 1 }}>

              <strong>

                Tienes {indicadores.criticas}

                {' '}

                notificaciones críticas sin leer.

              </strong>

              <p>

                Revisa los eventos y realiza

                las acciones correspondientes

                desde los módulos de capacitación

                y autorizaciones.

              </p>

            </div>

          </div>

          <button
            type="button"
            className="cap-secondary"
            onClick={() => {

              limpiarFiltros();

              setFilterLectura('NO_LEIDAS');

              setFilterPrioridad('CRITICA');

              setFilterCategoria('OPERATIVAS');

            }}
          >

            Ver alertas críticas

          </button>

        </div>

      )}

      {/* PESTAÑAS */}

      <div
        className="cap-panel"
        style={{

          display: 'flex',

          flexWrap: 'wrap',

          gap: 10

        }}
      >

        {[

          {

            value: 'TODAS',

            label: 'Todas',

            count: indicadores.total,

            icon: Bell

          },

          {

            value: 'NO_LEIDAS',

            label: 'No leídas',

            count: indicadores.noLeidas,

            icon: Mail

          },

          {

            value: 'LEIDAS',

            label: 'Leídas',

            count: indicadores.leidas,

            icon: MailOpen

          }

        ].map(item => {

          const Icon = item.icon;

          return (

            <button
              key={item.value}
              type="button"
              className={

                filterLectura === item.value

                  ? 'cap-primary'

                  : 'cap-secondary'

              }
              aria-pressed={

                filterLectura === item.value

              }
              onClick={() =>

                setFilterLectura(item.value)

              }
            >

              <Icon size={17} />

              {item.label}

              {' ('}

              {mostrarValor(item.count)}

              {')'}

            </button>

          );

        })}

      </div>

      {/* FILTROS */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>Filtros de notificaciones</h2>

          <button
            type="button"
            className="cap-secondary"
            onClick={limpiarFiltros}
          >

            <X size={16} />

            Limpiar filtros

          </button>

        </div>

        <div className="cap-search">

          <Search size={18} />

          <input
            value={search}
            aria-label="Buscar notificaciones"
            placeholder="Buscar evento, colaborador o mensaje..."
            onChange={e =>

              setSearch(e.target.value)

            }
          />

        </div>

        <div className="cap-form-grid">

          <div className="cap-field">

            <label htmlFor="cap-not-prioridad">

              Prioridad

            </label>

            <select
              id="cap-not-prioridad"
              value={filterPrioridad}
              onChange={e =>

                setFilterPrioridad(
                  e.target.value
                )

              }
            >

              <option value="TODAS">

                Todas las prioridades

              </option>

              {Object.entries(PRIORIDADES)

                .map(([value, config]) => (

                  <option

                    key={value}

                    value={value}

                  >

                    {config.label}

                  </option>

                ))}

            </select>

          </div>

          <div className="cap-field">

            <label htmlFor="cap-not-tipo">

              Tipo de evento

            </label>

            <select
              id="cap-not-tipo"
              value={filterTipo}
              onChange={e =>

                setFilterTipo(e.target.value)

              }
            >

              <option value="TODOS">

                Todos los eventos

              </option>

              {tiposDisponibles.map(tipo => (

                <option

                  key={tipo}

                  value={tipo}

                >

                  {getTipo(tipo)}

                </option>

              ))}

            </select>

          </div>

          <div className="cap-field">

            <label htmlFor="cap-not-categoria">

              Categoría

            </label>

            <select
              id="cap-not-categoria"
              value={filterCategoria}
              onChange={e =>

                setFilterCategoria(
                  e.target.value
                )

              }
            >

              <option value="TODAS">

                Todas las categorías

              </option>

              <option value="OPERATIVAS">

                Eventos operativos

              </option>

              <option value="CERTIFICACIONES">

                Certificaciones adicionales

              </option>

            </select>

          </div>

          <div className="cap-field">

            <label htmlFor="cap-not-orden">

              Ordenar por

            </label>

            <select
              id="cap-not-orden"
              value={orden}
              onChange={e =>

                setOrden(e.target.value)

              }
            >

              <option value="PRIORIDAD">

                Prioridad y estado de lectura

              </option>

              <option value="RECIENTES">

                Más recientes

              </option>

              <option value="ANTIGUAS">

                Más antiguas

              </option>

            </select>

          </div>

        </div>

        <label style={{

          display: 'flex',

          alignItems: 'center',

          gap: 10

        }}>

          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={e =>

              setAutoRefresh(e.target.checked)

            }
          />

          Actualizar automáticamente

          cada 60 segundos

        </label>

      </div>

      {/* BANDEJA DE NOTIFICACIONES */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>Bandeja de notificaciones</h2>

          <span className="cap-muted">

            {filtered.length}

            {' de '}

            {registros.length}

            {' notificaciones'}

          </span>

        </div>

        {loading ? (

          <div
            className="cap-welcome"
            role="status"
          >

            <RefreshCw size={35} />

            <p>Cargando notificaciones...</p>

          </div>

        ) : error ? (

          <div className="cap-welcome">

            <AlertTriangle size={40} />

            <h2>Consulta no disponible</h2>

            <p>

              Actualiza la información

              para volver a consultar

              las notificaciones.

            </p>

          </div>

        ) : filtered.length > 0 ? (

          <>

            {filtered

              .slice(0, visibleCount)

              .map(item => (

                <NotificationCard

                  key={item.id}

                  item={item}

                  busy={busy}

                  onRead={marcarLeida}

                />

              ))}

            {filtered.length > visibleCount && (

              <div style={{

                display: 'flex',

                justifyContent: 'center',

                marginTop: 20

              }}>

                <button
                  type="button"
                  className="cap-secondary"
                  onClick={() =>

                    setVisibleCount(

                      previous => previous + 30

                    )

                  }
                >

                  Mostrar más notificaciones

                  {' ('}

                  {filtered.length - visibleCount}

                  {' restantes)'}

                </button>

              </div>

            )}

          </>

        ) : (

          <div className="cap-welcome">

            {indicadores.noLeidas === 0 ? (

              <CheckCheck

                size={48}

                color="#15803d"

              />

            ) : (

              <BellOff size={48} />

            )}

            <h2>

              {indicadores.noLeidas === 0

                ? 'No tienes notificaciones pendientes'

                : 'No hay resultados para estos filtros'}

            </h2>

            <p>

              {indicadores.noLeidas === 0

                ? 'No se encontraron notificaciones activas sin leer.'

                : 'Modifica los filtros para consultar otros eventos.'}

            </p>

          </div>

        )}

      </div>

      {/* INFORMACIÓN DEL SISTEMA */}

      <div className="cap-alert-info">

        <ShieldCheck size={20} />

        {' '}

        <strong>

          Control de lectura individual

        </strong>

        <p>

          Marcar una notificación como leída

          únicamente registra que el usuario

          ha revisado el aviso.

          No modifica su prioridad, no elimina

          el evento y no resuelve automáticamente

          los requisitos de capacitación.

        </p>

        <p>

          Las alertas de vencimiento se generan

          mediante las funciones programadas

          de Supabase.

          Las certificaciones adicionales

          no condicionan la autorización operativa.

        </p>

      </div>

    </div>

  );

}
