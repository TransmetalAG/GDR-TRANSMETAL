
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef
} from 'react';

import {
  LayoutDashboard,
  Users,
  Factory,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  ClipboardCheck,
  Target,
  TrendingUp,
  CalendarClock,
  CalendarX,
  AlertTriangle,
  Award,
  Bell,
  QrCode,
  Clock,
  RefreshCw,
  Download,
  ArrowRight,
  Info
} from 'lucide-react';

import * as XLSX from 'xlsx';

import './capacitacion.css';

// ==========================================
// CONFIGURACIÓN
// ==========================================

const ROLES = {
  JEFE_PRODUCCION: 'Jefe de producción',
  ING_PROCESOS: 'Ingeniero de procesos',
  GESTOR_RC: 'Gestor de riesgos críticos',
  CONSULTA: 'Consulta'
};

const REFRESH_INTERVAL = 60000;
const PAGE_SIZE = 200;

const COLORS = {
  primary: '#164b83',
  success: '#15803d',
  warning: '#b45309',
  orange: '#c2410c',
  danger: '#b91c1c',
  purple: '#7c3aed',
  neutral: '#64748b'
};

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function porcentaje(numerador, denominador) {
  if (denominador <= 0) return null;

  return Math.round(
    numerador / denominador * 1000
  ) / 10;
}

function formatPercent(value) {
  return value == null
    ? 'N/A'
    : `${Number(value).toFixed(1)}%`;
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

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

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-GT', {
    timeZone: 'America/Guatemala',
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function label(value) {
  return String(value || 'NO DISPONIBLE')
    .replaceAll('_', ' ');
}

function textValue(value) {
  const text = String(value ?? '');

  return /^[=+\-@\t\r]/.test(text)
    ? "'" + text
    : text;
}

function colorPercent(value) {
  if (value == null) return COLORS.neutral;
  if (value >= 100) return COLORS.success;
  if (value >= 90) return COLORS.primary;
  if (value >= 75) return COLORS.warning;

  return COLORS.danger;
}

function maquinaAplicable(registro) {
  return ![
    'NO_REQUIERE_AUTORIZACION',
    'INACTIVO'
  ].includes(registro.estado);
}

function riesgoAplicable(registro) {
  return Boolean(
    registro.asignacion_id &&
    registro.aplica === true &&
    ![
      'INACTIVO',
      'NO_APLICA',
      'SIN_ASIGNACION',
      'NO_REQUIERE_AUTORIZACION'
    ].includes(registro.estado)
  );
}

function certificacionValida(registro) {
  return (
    registro.requisito === 'CERTIFICACION' &&
    [
      'VIGENTE',
      'PROXIMO_A_VENCER',
      'CRITICO',
      'SIN_VENCIMIENTO'
    ].includes(registro.estado_vencimiento)
  );
}

// ==========================================
// CONSULTAS PAGINADAS
// ==========================================

async function consultarPaginas(builder) {
  const registros = [];

  for (
    let offset = 0;
    ;
    offset += PAGE_SIZE
  ) {
    const { data, error } = await builder()
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
  }

  return registros;
}

async function consultarOpcional(
  nombre,
  operation
) {
  try {
    const data = await operation();

    return {
      nombre,
      disponible: true,
      data,
      error: null
    };

  } catch (err) {
    return {
      nombre,
      disponible: false,
      data: [],
      error: err.message
    };
  }
}

// ==========================================
// COMPONENTES VISUALES
// ==========================================

function KPI({
  icon: Icon,
  label,
  value,
  description,
  color = COLORS.primary,
  variant = '',
  onClick
}) {
  return (
    <div className={`cap-kpi ${variant}`}>

      <Icon size={25} color={color} />

      <div className="cap-kpi-label">
        {label}
      </div>

      <div
        className="cap-kpi-value"
        style={{ color }}
      >
        {value}
      </div>

      <div className="cap-kpi-description">
        {description}
      </div>

      {onClick && (
        <button
          type="button"
          className="cap-secondary"
          onClick={onClick}
          style={{
            marginTop: 12,
            fontSize: 12
          }}
        >
          Ver detalle
          <ArrowRight size={14} />
        </button>
      )}

    </div>
  );
}

function ProgressBar({
  value,
  color,
  height = 12
}) {
  const safe = Number.isFinite(Number(value))
    ? Math.min(100, Math.max(0, Number(value)))
    : 0;

  return (
    <div style={{
      height,
      background: '#e2e8f0',
      borderRadius: 20,
      overflow: 'hidden'
    }}>
      <div style={{
        width: `${safe}%`,
        height: '100%',
        background: color || colorPercent(value),
        borderRadius: 20,
        transition: 'width 0.3s ease'
      }}/>
    </div>
  );
}

function IndicadorBarra({
  label,
  value,
  description,
  color
}) {
  return (
    <div style={{ marginBottom: 20 }}>

      <div className="cap-toolbar">
        <strong style={{ fontSize: 13 }}>
          {label}
        </strong>

        <strong style={{
          color: color || colorPercent(value),
          fontSize: 18
        }}>
          {formatPercent(value)}
        </strong>
      </div>

      <ProgressBar
        value={value}
        color={color}
      />

      {description && (
        <p className="cap-muted">
          {description}
        </p>
      )}

    </div>
  );
}

function Estado({ value }) {
  let variant = 'neutral';

  if ([
    'AUTORIZADO',
    'VIGENTE',
    'CUMPLE'
  ].includes(value)) {
    variant = 'success';
  }

  if ([
    'PENDIENTE',
    'PENDIENTE_VOBO',
    'PROXIMO_A_VENCER',
    'CRITICO',
    'BRECHA',
    'OPERADOR_UNICO'
  ].includes(value)) {
    variant = 'warning';
  }

  if ([
    'VENCIDO',
    'SUSPENDIDO',
    'REVOCADO',
    'NO_AUTORIZADO',
    'SIN_OPERADORES'
  ].includes(value)) {
    variant = 'danger';
  }

  return (
    <span className={
      `cap-status cap-status-${variant}`
    }>
      {label(value)}
    </span>
  );
}

function GraficoDona({ items }) {
  const total = items.reduce(
    (sum, item) => sum + item.value,
    0
  );

  let offset = 0;

  const gradient = total > 0
    ? `conic-gradient(${items.map(item => {
        const start = offset;
        offset += item.value / total * 100;

        return `${item.color} ${start}% ${offset}%`;
      }).join(', ')})`
    : '#e2e8f0';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 25
    }}>

      <div style={{
        width: 160,
        height: 160,
        borderRadius: '50%',
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        margin: '0 auto'
      }}>

        <div style={{
          width: 118,
          height: 118,
          borderRadius: '50%',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>

          <strong style={{
            fontSize: 33,
            color: COLORS.primary
          }}>
            {total}
          </strong>

          <span className="cap-muted">
            Total
          </span>

        </div>
      </div>

      <div style={{
        flex: '1 1 180px'
      }}>

        {items.map(item => (
          <div
            key={item.label}
            className="cap-toolbar"
            style={{
              padding: '10px 0',
              borderBottom: '1px solid #e2e8f0'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: item.color
              }}/>

              <span style={{ fontSize: 12 }}>
                {item.label}
              </span>
            </div>

            <strong>{item.value}</strong>
          </div>
        ))}

      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function DashboardCapacitacion({
  client,
  role,
  onNavigate
}) {
  const canRead =
    Object.prototype.hasOwnProperty.call(
      ROLES,
      role
    );

  const isJefe =
    role === 'JEFE_PRODUCCION';

  const canReadVencimientos = [
    'JEFE_PRODUCCION',
    'ING_PROCESOS',
    'GESTOR_RC'
  ].includes(role);

  const canReadCertificaciones = [
    'JEFE_PRODUCCION',
    'GESTOR_RC'
  ].includes(role);

  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState('');

  const [fechaConsulta, setFechaConsulta] =
    useState(null);

  const [autoRefresh, setAutoRefresh] =
    useState(true);

  const requestRef = useRef(0);
  const loadingRef = useRef(false);

  // ==========================================
  // CONSULTAR DASHBOARD
  // ==========================================

  const cargarDatos = useCallback(
    async (silencioso = false) => {

      if (!client || !canRead) {
        setDatos(null);
        setLoading(false);
        return;
      }

      if (loadingRef.current) return;

      loadingRef.current = true;

      const requestId =
        ++requestRef.current;

      if (silencioso) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');
      setWarning('');

      try {

        // Verificar usuario autenticado.

        const {
          data: authData,
          error: authError
        } = await client.auth.getUser();

        if (authError || !authData?.user) {
          throw new Error(
            'La sesión no está disponible.'
          );
        }

        const userId = authData.user.id;

        const {
          data: actualRole,
          error: roleError
        } = await client.rpc('cap_rol_actual');

        if (
          roleError ||
          actualRole !== role
        ) {
          throw new Error(
            'El perfil de capacitación no está vigente.'
          );
        }

        // Consultas generales disponibles
        // para todos los perfiles.

        const [
          colaboradores,
          catalogoMaquinas,
          catalogoRC,
          matrizMaquinas,
          matrizRC,
          polivalencia
        ] = await Promise.all([

          consultarPaginas(() =>
            client
              .from('cap_colaboradores')
              .select('id,nombre,puesto,es_lider,activo')
              .eq('activo', true)
              .order('id')
          ),

          consultarPaginas(() =>
            client
              .from('cap_maquinas')
              .select(`
                id,
                codigo,
                nombre,
                procesos,
                minimo_operadores,
                requiere_autorizacion
              `)
              .eq('activo', true)
              .order('id')
          ),

          consultarPaginas(() =>
            client
              .from('cap_riesgos_criticos')
              .select(`
                id,
                codigo,
                nombre,
                abreviatura,
                orden
              `)
              .eq('activo', true)
              .order('id')
          ),

          consultarPaginas(() =>
            client.rpc('cap_matriz_maquinas')
              .order('colaborador_id')
              .order('maquina_id')
          ),

          consultarPaginas(() =>
            client.rpc('cap_matriz_rc')
              .order('colaborador_id')
              .order('riesgo_critico_id')
          ),

          consultarPaginas(() =>
            client.rpc('cap_polivalencia_maquinas')
              .order('maquina_id')
          )

        ]);

        // Consultas adicionales según perfil.

        const [
          vencimientosResult,
          credencialesResult,
          notificacionesResult,
          lecturasResult
        ] = await Promise.all([

          canReadVencimientos

            ? consultarOpcional(
                'Vencimientos',
                () => consultarPaginas(() =>
                  client
                    .rpc('cap_consultar_vencimientos')
                    .order('registro_id')
                    .order('requisito')
                )
              )

            : Promise.resolve({
                disponible: false,
                data: [],
                error: null
              }),

          isJefe

            ? consultarOpcional(
                'Credenciales QR',
                () => consultarPaginas(() =>
                  client
                    .from('cap_credenciales_qr')
                    .select('id,colaborador_id,activo')
                    .eq('activo', true)
                    .order('id')
                )
              )

            : Promise.resolve({
                disponible: false,
                data: [],
                error: null
              }),

          consultarOpcional(
            'Notificaciones',
            () => consultarPaginas(() =>
              client
                .from('cap_notificaciones')
                .select(`
                  id,
                  tipo,
                  prioridad,
                  activa
                `)
                .eq('rol_destinatario', role)
                .eq('activa', true)
                .order('id')
            )
          ),

          consultarOpcional(
            'Lecturas de notificaciones',
            () => consultarPaginas(() =>
              client
                .from('cap_notificaciones_lecturas')
                .select('notificacion_id')
                .eq('usuario_id', userId)
                .order('notificacion_id')
            )
          )

        ]);

        if (
          requestRef.current !== requestId
        ) return;

        const avisos = [
          vencimientosResult,
          credencialesResult,
          notificacionesResult,
          lecturasResult
        ]
          .filter(r => r.error)
          .map(r =>
            `No fue posible consultar: ${r.nombre}.`
          );

        // Protección adicional de vencimientos.
        // Los permisos efectivos permanecen
        // implementados en Supabase.

        const vencimientos =
          vencimientosResult.data.filter(v => {

            if (isJefe) return true;

            if (role === 'ING_PROCESOS') {
              return v.requisito ===
                'APTITUD_MEDICA';
            }

            if (role === 'GESTOR_RC') {
              return [
                'MOODLE',
                'ENTRENAMIENTO',
                'ENTRENAMIENTO_PRACTICO',
                'CERTIFICACION'
              ].includes(v.requisito);
            }

            return false;
          });

        // Comprobar posibles inconsistencias
        // en el tamaño de las matrices.

        const expectedMaquinas =
          colaboradores.length *
          catalogoMaquinas.length;

        const expectedRC =
          colaboradores.length *
          catalogoRC.length;

        if (
          matrizMaquinas.length !== expectedMaquinas
        ) {
          avisos.push(
            'El tamaño de la matriz de máquinas ' +
            'no coincide con el catálogo activo. ' +
            'Verifica su alcance.'
          );
        }

        if (
          matrizRC.length !== expectedRC
        ) {
          avisos.push(
            'El tamaño de la matriz RC no coincide ' +
            'con el catálogo activo. Verifica su alcance.'
          );
        }

        setDatos({
          colaboradores,
          catalogoMaquinas,
          catalogoRC,
          matrizMaquinas,
          matrizRC,
          polivalencia,
          vencimientos,

          vencimientosDisponibles:
            vencimientosResult.disponible,

          credenciales:
            credencialesResult.data,

          credencialesDisponibles:
            credencialesResult.disponible,

          notificaciones:
            notificacionesResult.data,

          lecturas:
            lecturasResult.data,

          notificacionesDisponibles:
            notificacionesResult.disponible &&
            lecturasResult.disponible
        });

        setFechaConsulta(new Date());
        setWarning(avisos.join(' '));

      } catch (err) {

        if (
          requestRef.current !== requestId
        ) return;

        setDatos(null);
        setFechaConsulta(null);

        setError(
          'No fue posible consultar el dashboard: ' +
          err.message
        );

      } finally {

        if (
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
      isJefe,
      canReadVencimientos
    ]
  );

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  useEffect(() => {
    loadingRef.current = false;

    setDatos(null);
    setFechaConsulta(null);
    setSuccess('');

    cargarDatos();

    return () => {
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
          document.visibilityState === 'visible' &&
          !loadingRef.current
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
  // INDICADORES DE MÁQUINAS
  // ==========================================

  const indicadoresMaquinas = useMemo(() => {

    const registros =
      datos?.matrizMaquinas || [];

    const aplicables = registros.filter(
      maquinaAplicable
    );

    const autorizadas = aplicables.filter(
      m => m.autorizado === true
    ).length;

    return {
      total: aplicables.length,
      autorizadas,

      cobertura: porcentaje(
        autorizadas,
        aplicables.length
      ),

      pendientesVoBo: aplicables.filter(
        m => m.estado === 'PENDIENTE_VOBO'
      ).length,

      suspendidas: aplicables.filter(
        m => m.estado === 'SUSPENDIDO'
      ).length,

      sinCapacitacion: aplicables.filter(
        m => m.estado === 'SIN_CAPACITACION'
      ).length
    };

  }, [datos]);

  // ==========================================
  // INDICADORES DE RIESGOS CRÍTICOS
  // ==========================================

  const indicadoresRC = useMemo(() => {

    const registros =
      datos?.matrizRC || [];

    const aplicables = registros.filter(
      riesgoAplicable
    );

    const autorizados = aplicables.filter(
      r => r.autorizado === true
    ).length;

    return {
      aplicables: aplicables.length,
      autorizados,

      sinAutorizacion:
        aplicables.length - autorizados,

      cumplimiento: porcentaje(
        autorizados,
        aplicables.length
      ),

      pendientesVoBo: aplicables.filter(
        r => r.estado === 'PENDIENTE_VOBO'
      ).length,

      vencidos: aplicables.filter(
        r => r.estado === 'VENCIDO'
      ).length,

      suspendidos: aplicables.filter(
        r => r.estado === 'SUSPENDIDO'
      ).length,

      sinAsignar: registros.filter(
        r => r.estado === 'SIN_ASIGNACION'
      ).length,

      conAlerta: aplicables.filter(
        r =>
          r.autorizado === true &&
          [
            'CRITICO',
            'PROXIMO_A_VENCER'
          ].includes(r.estado)
      ).length
    };

  }, [datos]);

  // ==========================================
  // CUMPLIMIENTO INDIVIDUAL POR RC
  // ==========================================

  const resumenRC = useMemo(() => {

    if (!datos) return [];

    return [...datos.catalogoRC]
      .sort((a, b) =>
        number(a.orden) - number(b.orden)
      )
      .map(rc => {

        const registros =
          datos.matrizRC.filter(
            r => r.riesgo_critico_id === rc.id
          );

        const aplicables =
          registros.filter(riesgoAplicable);

        const autorizados =
          aplicables.filter(
            r => r.autorizado === true
          ).length;

        return {
          id: rc.id,
          nombre: rc.nombre,
          abreviatura: rc.abreviatura,
          aplicables: aplicables.length,
          autorizados,

          pendientes:
            aplicables.length - autorizados,

          cumplimiento: porcentaje(
            autorizados,
            aplicables.length
          )
        };

      });

  }, [datos]);

  // ==========================================
  // POLIVALENCIA POR MÁQUINA
  // ==========================================

  const resumenPolivalencia = useMemo(() => {

    if (!datos) return [];

    const map = new Map(
      datos.polivalencia.map(m => [
        m.maquina_id,
        m
      ])
    );

    return datos.catalogoMaquinas

      .filter(m =>
        m.requiere_autorizacion === true
      )

      .map(m => {

        const registro = map.get(m.id);

        const disponible = Boolean(
          registro &&
          registro.operadores_autorizados != null
        );

        const minimo = number(
          registro?.minimo_operadores ??
          m.minimo_operadores
        );

        const autorizados = disponible
          ? number(registro.operadores_autorizados)
          : null;

        const evaluable =
          disponible && minimo > 0;

        const brecha = evaluable
          ? Math.max(0, minimo - autorizados)
          : null;

        let estado = 'NO_DISPONIBLE';

        if (disponible) {

          if (autorizados === 0) {
            estado = 'SIN_OPERADORES';

          } else if (autorizados === 1) {
            estado = 'OPERADOR_UNICO';

          } else if (!evaluable) {
            estado = 'SIN_META';

          } else if (brecha > 0) {
            estado = 'BRECHA';

          } else {
            estado = 'CUMPLE';
          }
        }

        return {
          id: m.id,
          nombre: m.nombre,
          procesos: m.procesos || [],
          minimo,
          autorizados,
          disponible,
          evaluable,
          brecha,
          estado,

          cumplimiento: evaluable
            ? porcentaje(autorizados, minimo)
            : null
        };

      });

  }, [datos]);

  // ==========================================
  // INDICADORES GLOBALES DE POLIVALENCIA
  // ==========================================

  const indicadoresPolivalencia =
    useMemo(() => {

      const evaluables =
        resumenPolivalencia.filter(
          m => m.evaluable
        );

      const cumplen = evaluables.filter(
        m => m.brecha === 0
      ).length;

      const sinOperadores = evaluables.filter(
        m => m.autorizados === 0
      ).length;

      const conBrecha = evaluables.filter(
        m => m.brecha > 0
      ).length;

      const requeridas = evaluables.reduce(
        (sum, m) => sum + m.minimo,
        0
      );

      // El excedente de una máquina no puede
      // compensar el déficit de otra.

      const cubiertas = evaluables.reduce(
        (sum, m) =>
          sum + Math.min(
            m.autorizados,
            m.minimo
          ),
        0
      );

      return {
        evaluables: evaluables.length,
        cumplen,
        conBrecha,
        sinOperadores,

        brechaConOperadores:
          conBrecha - sinOperadores,

        operadorUnico:
          resumenPolivalencia.filter(
            m =>
              m.disponible &&
              m.autorizados === 1
          ).length,

        requeridas,
        cubiertas,

        brechaTotal:
          requeridas - cubiertas,

        sinDatos:
          resumenPolivalencia.filter(
            m => !m.disponible
          ).length,

        sinMeta:
          resumenPolivalencia.filter(
            m =>
              m.disponible &&
              m.minimo <= 0
          ).length,

        cumplimientoMaquinas:
          porcentaje(
            cumplen,
            evaluables.length
          ),

        cobertura:
          porcentaje(
            cubiertas,
            requeridas
          )
      };

    }, [resumenPolivalencia]);

  // ==========================================
  // PRIORIDADES DE CAPACITACIÓN
  // ==========================================

  const prioridadesMaquinas =
    useMemo(() => {

      function prioridad(m) {
        if (m.autorizados === 0) return 1;
        if (m.autorizados === 1) return 2;
        return 3;
      }

      return resumenPolivalencia

        .filter(m =>
          m.disponible &&
          (
            m.brecha > 0 ||
            m.autorizados <= 1
          )
        )

        .sort((a, b) =>
          prioridad(a) - prioridad(b) ||
          (b.brecha ?? -1) -
          (a.brecha ?? -1) ||
          a.nombre.localeCompare(b.nombre, 'es')
        )

        .slice(0, 5);

    }, [resumenPolivalencia]);

  // ==========================================
  // VENCIMIENTOS
  // ==========================================

  const indicadoresVencimientos =
    useMemo(() => {

      const registros =
        (datos?.vencimientos || []).filter(
          v => v.requisito !== 'CERTIFICACION'
        );

      const contar = estado =>
        registros.filter(
          v => v.estado_vencimiento === estado
        ).length;

      return {
        total: registros.length,

        vigentes: contar('VIGENTE'),

        proximos: contar('PROXIMO_A_VENCER'),

        criticos: contar('CRITICO'),

        vencidos: contar('VENCIDO'),

        pendientes: contar('PENDIENTE')
      };

    }, [datos]);

  // ==========================================
  // CERTIFICACIONES OPCIONALES
  // ==========================================

  const indicadoresCertificaciones =
    useMemo(() => {

      const registros =
        (datos?.vencimientos || []).filter(
          v => v.requisito === 'CERTIFICACION'
        );

      const idsAplicables = new Set(
        (datos?.matrizRC || [])
          .filter(riesgoAplicable)
          .map(r => r.asignacion_id)
      );

      const validas = new Set(
        registros
          .filter(certificacionValida)
          .filter(v =>
            idsAplicables.has(v.asignacion_id)
          )
          .map(v => v.asignacion_id)
      ).size;

      return {
        registradas: registros.length,
        validas,

        vencidas: registros.filter(
          v => v.estado_vencimiento === 'VENCIDO'
        ).length,

        proximas: registros.filter(
          v => [
            'CRITICO',
            'PROXIMO_A_VENCER'
          ].includes(v.estado_vencimiento)
        ).length,

        noValidas: registros.filter(
          v =>
            v.estado_vencimiento ===
            'CERTIFICACION_NO_VALIDA'
        ).length,

        cobertura: porcentaje(
          validas,
          idsAplicables.size
        )
      };

    }, [datos]);

  // ==========================================
  // CREDENCIALES QR
  // ==========================================

  const indicadoresQR = useMemo(() => {

    const activos = new Set(
      (datos?.colaboradores || [])
        .map(c => c.id)
    );

    const credenciales = new Set(
      (datos?.credenciales || [])
        .filter(q =>
          q.activo === true &&
          activos.has(q.colaborador_id)
        )
        .map(q => q.colaborador_id)
    );

    return {
      total: activos.size,
      conQR: credenciales.size,

      sinQR:
        activos.size - credenciales.size,

      cobertura: porcentaje(
        credenciales.size,
        activos.size
      )
    };

  }, [datos]);

  // ==========================================
  // NOTIFICACIONES INDIVIDUALES
  // ==========================================

  const indicadoresNotificaciones =
    useMemo(() => {

      const lecturas = new Set(
        (datos?.lecturas || [])
          .map(l => l.notificacion_id)
      );

      const noLeidas =
        (datos?.notificaciones || [])
          .filter(n =>
            !lecturas.has(n.id)
          );

      const esCertificacion = n =>
        String(n.tipo || '')
          .includes('CERTIFICACION');

      const operativas = noLeidas.filter(
        n => !esCertificacion(n)
      );

      return {
        noLeidas: noLeidas.length,

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

    }, [datos]);

  // ==========================================
  // RANKING DE POLIVALENCIA INDIVIDUAL
  // ==========================================

  const rankingColaboradores =
    useMemo(() => {

      if (!datos) return [];

      const grupos = new Map();

      datos.matrizMaquinas

        .filter(maquinaAplicable)

        .forEach(m => {

          if (!grupos.has(m.colaborador_id)) {
            grupos.set(m.colaborador_id, {
              id: m.colaborador_id,
              nombre: m.colaborador,
              puesto: m.puesto,
              esLider: m.es_lider,
              aplicables: 0,
              autorizadas: 0
            });
          }

          const grupo =
            grupos.get(m.colaborador_id);

          grupo.aplicables += 1;

          if (m.autorizado === true) {
            grupo.autorizadas += 1;
          }

        });

      return [...grupos.values()]

        .map(c => ({
          ...c,

          cobertura: porcentaje(
            c.autorizadas,
            c.aplicables
          )
        }))

        .filter(c => c.autorizadas > 0)

        .sort((a, b) =>
          b.autorizadas - a.autorizadas ||
          (b.cobertura ?? 0) -
          (a.cobertura ?? 0) ||
          a.nombre.localeCompare(b.nombre, 'es')
        )

        .slice(0, 5);

    }, [datos]);

  // ==========================================
  // NAVEGACIÓN
  // ==========================================

  function navegar(modulo) {
    if (typeof onNavigate === 'function') {
      onNavigate(modulo);
    }
  }

  function enlace(modulo) {
    return typeof onNavigate === 'function'
      ? () => navegar(modulo)
      : undefined;
  }

  // ==========================================
  // EXPORTAR DASHBOARD
  // ==========================================

  function exportarExcel() {
    if (
      !datos ||
      loading ||
      refreshing ||
      exporting ||
      error
    ) return;

    setExporting(true);
    setSuccess('');

    try {

      const wb = XLSX.utils.book_new();

      function agregarHoja(
        nombre,
        filas,
        anchos
      ) {
        const ws = XLSX.utils.aoa_to_sheet(
          filas
        );

        ws['!cols'] = anchos.map(
          wch => ({ wch })
        );

        XLSX.utils.book_append_sheet(
          wb,
          ws,
          nombre
        );

        return ws;
      }

      const resumen = [
        ['TRANSMETAL'],
        ['DASHBOARD DE CAPACITACIÓN'],

        ['Fecha de consulta', formatDate(fechaConsulta)],
        ['Perfil', ROLES[role]],

        [],

        ['Indicador', 'Resultado'],

        [
          'Colaboradores activos',
          datos.colaboradores.length
        ],

        [
          'Máquinas activas',
          datos.catalogoMaquinas.length
        ],

        [
          'Líderes de capacitación activos',
          datos.colaboradores.filter(
            c => c.es_lider
          ).length
        ],

        [
          'Cobertura de máquinas',
          formatPercent(
            indicadoresMaquinas.cobertura
          )
        ],

        [
          'Cumplimiento de riesgos críticos',
          formatPercent(
            indicadoresRC.cumplimiento
          )
        ],

        [
          'Cobertura de polivalencia',
          formatPercent(
            indicadoresPolivalencia.cobertura
          )
        ],

        [
          'Cumplimiento por máquinas',
          formatPercent(
            indicadoresPolivalencia
              .cumplimientoMaquinas
          )
        ],

        [
          'Pendientes de VoBo máquinas',
          indicadoresMaquinas.pendientesVoBo
        ],

        [
          'Pendientes de VoBo RC',
          indicadoresRC.pendientesVoBo
        ],

        [
          'RC aplicables sin autorización',
          indicadoresRC.sinAutorizacion
        ],

        [
          'Máquinas sin operadores',
          indicadoresPolivalencia.sinOperadores
        ],

        [
          'Brecha total de posiciones',
          indicadoresPolivalencia.brechaTotal
        ]
      ];

      if (
        canReadVencimientos &&
        datos.vencimientosDisponibles
      ) {
        resumen.push(
          [],
          ['VENCIMIENTOS', 'Cantidad'],

          [
            'Vigentes',
            indicadoresVencimientos.vigentes
          ],

          [
            '31 a 90 días',
            indicadoresVencimientos.proximos
          ],

          [
            '0 a 30 días',
            indicadoresVencimientos.criticos
          ],

          [
            'Vencidos',
            indicadoresVencimientos.vencidos
          ],

          [
            'Pendientes',
            indicadoresVencimientos.pendientes
          ]
        );
      }

      if (
        canReadCertificaciones &&
        datos.vencimientosDisponibles
      ) {
        resumen.push(
          [],
          ['CERTIFICACIONES OPCIONALES'],

          [
            'Certificaciones válidas en asignaciones aplicables',
            indicadoresCertificaciones.validas
          ],

          [
            'Certificaciones vencidas',
            indicadoresCertificaciones.vencidas
          ],

          [
            'Cobertura de certificación',
            formatPercent(
              indicadoresCertificaciones.cobertura
            )
          ]
        );
      }

      if (
        isJefe &&
        datos.credencialesDisponibles
      ) {
        resumen.push(
          [],
          ['CREDENCIALES QR'],

          ['Credenciales activas', indicadoresQR.conQR],

          ['Sin credencial', indicadoresQR.sinQR],

          [
            'Cobertura QR',
            formatPercent(indicadoresQR.cobertura)
          ]
        );
      }

      if (datos.notificacionesDisponibles) {
        resumen.push(
          [],
          ['NOTIFICACIONES'],

          [
            'No leídas',
            indicadoresNotificaciones.noLeidas
          ],

          [
            'Críticas no leídas',
            indicadoresNotificaciones.criticas
          ]
        );
      }

      resumen.push(
        [],
        [
          'Advertencias',
          textValue(warning || 'Ninguna')
        ],

        [
          'Nota',
          'Los indicadores corresponden a la información disponible para el perfil.'
        ],

        [
          'Nota',
          'Las certificaciones no condicionan la autorización operativa.'
        ],

        [
          'Nota',
          'Las posiciones de polivalencia no representan personas únicas.'
        ],

        [
          'Nota',
          'Este reporte no sustituye la verificación actualizada de autorizaciones.'
        ]
      );

      agregarHoja(
        'Resumen ejecutivo',
        resumen,
        [55, 100]
      );

      // Cumplimiento por riesgo crítico.

      const wsRC = agregarHoja(
        'Cumplimiento RC',
        [
          [
            'Riesgo crítico',
            'Aplicables',
            'Autorizados',
            'Pendientes',
            'Cumplimiento'
          ],

          ...resumenRC.map(r => [
            textValue(r.nombre),
            r.aplicables,
            r.autorizados,
            r.pendientes,

            r.cumplimiento == null
              ? 'N/A'
              : r.cumplimiento / 100
          ])
        ],
        [48, 18, 18, 18, 20]
      );

      resumenRC.forEach((r, index) => {
        const cell =
          wsRC[`E${index + 2}`];

        if (cell?.t === 'n') {
          cell.z = '0.0%';
        }
      });

      // Polivalencia por máquina.

      const wsPoli = agregarHoja(
        'Polivalencia',
        [
          [
            'Máquina',
            'Mínimo',
            'Autorizados',
            'Brecha',
            'Cobertura',
            'Estado'
          ],

          ...resumenPolivalencia.map(m => [
            textValue(m.nombre),
            m.minimo,
            m.autorizados ?? 'N/D',
            m.brecha ?? 'N/A',

            m.cumplimiento == null
              ? 'N/A'
              : m.cumplimiento / 100,

            label(m.estado)
          ])
        ],
        [40, 18, 18, 18, 18, 30]
      );

      resumenPolivalencia.forEach(
        (m, index) => {
          const cell =
            wsPoli[`E${index + 2}`];

          if (cell?.t === 'n') {
            cell.z = '0.0%';
          }
        }
      );

      agregarHoja(
        'Prioridades',
        [
          [
            'Prioridad',
            'Máquina',
            'Autorizados',
            'Mínimo',
            'Brecha',
            'Estado'
          ],

          ...prioridadesMaquinas.map(
            (m, index) => [
              index + 1,
              textValue(m.nombre),
              m.autorizados,
              m.minimo,
              m.brecha ?? 'N/A',
              label(m.estado)
            ]
          )
        ],
        [15, 40, 18, 18, 18, 30]
      );

      XLSX.writeFile(
        wb,
        `Dashboard_Capacitacion_${fechaGuatemala()}.xlsx`
      );

      setSuccess(
        'Reporte ejecutivo generado correctamente.'
      );

    } catch (err) {
      setError(
        'No fue posible exportar el reporte: ' +
        err.message
      );

    } finally {
      setExporting(false);
    }
  }

  // ==========================================
  // CONTROL DE ACCESO
  // ==========================================

  if (!client || !canRead) {
    return (
      <div className="cap-panel cap-welcome">
        <ShieldAlert size={45} />

        <h2>Dashboard no disponible</h2>

        <p>
          Se requiere una sesión autorizada
          de capacitación.
        </p>
      </div>
    );
  }

  const busy =
    loading || refreshing || exporting;

  const mostrarValor = value =>
    !datos || loading || error
      ? '—'
      : value;

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (
    <div className="cap-dashboard">

      {/* ENCABEZADO EJECUTIVO */}

      <div style={{
        background: 'linear-gradient(135deg, #12375e, #164b83)',
        color: '#ffffff',
        padding: 25,
        borderRadius: 12,
        marginBottom: 20
      }}>

        <div className="cap-toolbar">

          <div>
            <div style={{
              fontSize: 11,
              letterSpacing: 1.2,
              color: '#dbeafe'
            }}>
              TRANSMETAL · GESTIÓN DE PERSONAS
            </div>

            <h1 style={{
              color: '#ffffff',
              margin: '10px 0'
            }}>
              Dashboard de capacitación
            </h1>

            <p style={{
              color: '#dbeafe',
              fontSize: 13
            }}>
              Competencias, seguridad y continuidad
              operativa.
            </p>

            <div style={{
              color: '#dbeafe',
              fontSize: 12
            }}>
              {ROLES[role]}
            </div>
          </div>

          <LayoutDashboard size={55} />

        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginTop: 15
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
            className="cap-secondary"
            disabled={
              busy ||
              !datos ||
              Boolean(error)
            }
            onClick={exportarExcel}
          >
            <Download size={17} />

            {exporting
              ? 'Exportando...'
              : 'Exportar reporte'}
          </button>

        </div>

        {fechaConsulta && (
          <p style={{
            fontSize: 11,
            marginBottom: 0,
            color: '#dbeafe'
          }}>
            Última consulta: {
              formatDate(fechaConsulta)
            }
          </p>
        )}

      </div>

      {/* MENSAJES */}

      {error && (
        <div className="cap-error" role="alert">
          {error}
        </div>
      )}

      {warning && (
        <div className="cap-alert-warning">
          {warning}
        </div>
      )}

      {success && (
        <div className="cap-alert-success">
          {success}
        </div>
      )}

      {/* ESTADO DE CARGA */}

      {loading && (
        <div
          className="cap-panel cap-welcome"
          role="status"
        >
          <RefreshCw size={40} />

          <h2>Consultando indicadores</h2>

          <p>
            Consolidando la información
            de capacitación.
          </p>
        </div>
      )}

      {datos && !loading && (

        <>

          {/* ALERTAS CRÍTICAS */}

          {datos.notificacionesDisponibles &&
           indicadoresNotificaciones.criticas > 0 && (

            <div className="cap-error">

              <div className="cap-toolbar">

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>

                  <ShieldAlert size={28} />

                  <div>
                    <strong>
                      Alertas críticas pendientes
                    </strong>

                    <p>
                      Tienes {
                        indicadoresNotificaciones.criticas
                      } notificaciones críticas sin leer.
                    </p>
                  </div>

                </div>

                {onNavigate && (
                  <button
                    type="button"
                    className="cap-secondary"
                    onClick={
                      enlace('NOTIFICACIONES')
                    }
                  >
                    Ver notificaciones
                    <ArrowRight size={16} />
                  </button>
                )}

              </div>

            </div>
          )}

          {/* INDICADORES PRINCIPALES */}

          <div className="cap-kpi-grid">

            <KPI
              icon={Users}
              label="Colaboradores activos"
              value={mostrarValor(
                datos.colaboradores.length
              )}
              description={
                `${datos.colaboradores.filter(
                  c => c.es_lider
                ).length} líderes de capacitación`
              }
              onClick={
                enlace('COLABORADORES')
              }
            />

            <KPI
              icon={Factory}
              label="Máquinas activas"
              value={mostrarValor(
                datos.catalogoMaquinas.length
              )}
              description="Equipos registrados"
              onClick={
                enlace('MAQUINAS')
              }
            />

            <KPI
              icon={GraduationCap}
              label="Cobertura de máquinas"
              value={formatPercent(
                indicadoresMaquinas.cobertura
              )}
              color={colorPercent(
                indicadoresMaquinas.cobertura
              )}
              description={
                `${indicadoresMaquinas.autorizadas} ` +
                `de ${indicadoresMaquinas.total} ` +
                'combinaciones aplicables'
              }
              onClick={
                enlace('MATRIZ_MAQUINAS')
              }
            />

            <KPI
              icon={ShieldCheck}
              label="Cumplimiento RC"
              value={formatPercent(
                indicadoresRC.cumplimiento
              )}
              color={colorPercent(
                indicadoresRC.cumplimiento
              )}
              description={
                `${indicadoresRC.autorizados} ` +
                `de ${indicadoresRC.aplicables} ` +
                'asignaciones aplicables'
              }
              onClick={
                enlace('MATRIZ_RC')
              }
            />

            <KPI
              icon={Target}
              label="Cobertura de polivalencia"
              value={formatPercent(
                indicadoresPolivalencia.cobertura
              )}
              color={colorPercent(
                indicadoresPolivalencia.cobertura
              )}
              description={
                `${indicadoresPolivalencia.cubiertas} ` +
                `de ${indicadoresPolivalencia.requeridas} ` +
                'posiciones evaluables'
              }
              onClick={
                enlace('POLIVALENCIA')
              }
            />

            <KPI
              icon={TrendingUp}
              label="Máquinas que cumplen"
              value={formatPercent(
                indicadoresPolivalencia
                  .cumplimientoMaquinas
              )}
              color={colorPercent(
                indicadoresPolivalencia
                  .cumplimientoMaquinas
              )}
              description={
                `${indicadoresPolivalencia.cumplen} ` +
                `de ${indicadoresPolivalencia.evaluables} ` +
                'equipos evaluables'
              }
              onClick={
                enlace('POLIVALENCIA')
              }
            />

            <KPI
              icon={ClipboardCheck}
              label="Pendientes de VoBo"
              value={
                indicadoresMaquinas.pendientesVoBo +
                indicadoresRC.pendientesVoBo
              }
              description="Máquinas y riesgos críticos"
              color={COLORS.warning}
              variant="cap-kpi-warning"
            />

            <KPI
              icon={ShieldAlert}
              label="RC sin autorización"
              value={
                indicadoresRC.sinAutorizacion
              }
              description="Asignaciones aplicables"
              color={COLORS.danger}
              variant="cap-kpi-danger"
              onClick={
                enlace('MATRIZ_RC')
              }
            />

            {datos.notificacionesDisponibles && (
              <KPI
                icon={Bell}
                label="Notificaciones no leídas"
                value={
                  indicadoresNotificaciones.noLeidas
                }
                description={
                  `${indicadoresNotificaciones.criticas} críticas`
                }
                color={COLORS.warning}
                onClick={
                  enlace('NOTIFICACIONES')
                }
              />
            )}

          </div>

          {/* COBERTURA GENERAL */}

          <div className="cap-panel">

            <h2>Cobertura general de competencias</h2>

            <IndicadorBarra
              label="Autorizaciones de máquinas"
              value={
                indicadoresMaquinas.cobertura
              }
              description={
                `${indicadoresMaquinas.autorizadas} ` +
                `de ${indicadoresMaquinas.total} aplicables`
              }
            />

            <IndicadorBarra
              label="Autorizaciones de riesgos críticos"
              value={
                indicadoresRC.cumplimiento
              }
              description={
                `${indicadoresRC.autorizados} ` +
                `de ${indicadoresRC.aplicables} aplicables`
              }
            />

            <IndicadorBarra
              label="Cobertura efectiva de polivalencia"
              value={
                indicadoresPolivalencia.cobertura
              }
              description={
                `${indicadoresPolivalencia.brechaTotal} ` +
                'posiciones adicionales requeridas'
              }
            />

            <IndicadorBarra
              label="Máquinas que alcanzan su meta"
              value={
                indicadoresPolivalencia
                  .cumplimientoMaquinas
              }
            />

          </div>

          {/* DISTRIBUCIÓN POR RIESGO CRÍTICO */}

          <div className="cap-panel">

            <div className="cap-toolbar">

              <h2>
                Cumplimiento por riesgo crítico
              </h2>

              {onNavigate && (
                <button
                  type="button"
                  className="cap-secondary"
                  onClick={enlace('MATRIZ_RC')}
                >
                  Ver matriz
                  <ArrowRight size={15} />
                </button>
              )}

            </div>

            {resumenRC.map(r => (
              <IndicadorBarra
                key={r.id}
                label={
                  `${r.abreviatura || ''} · ${r.nombre}`
                }
                value={r.cumplimiento}
                description={
                  `${r.autorizados} de ` +
                  `${r.aplicables} autorizados · ` +
                  `${r.pendientes} pendientes`
                }
              />
            ))}

            {!resumenRC.length && (
              <p className="cap-muted">
                No hay riesgos críticos disponibles.
              </p>
            )}

            {indicadoresRC.sinAsignar > 0 && (
              <div className="cap-alert-info">

                <Info size={18} />

                {' '}

                Existen {
                  indicadoresRC.sinAsignar
                } combinaciones sin asignación.

                No se incluyen en el porcentaje
                de cumplimiento. Debe verificarse
                que las asignaciones necesarias
                estén configuradas.

              </div>
            )}

          </div>

          {/* ESTADO DE POLIVALENCIA */}

          <div className="cap-panel">

            <div className="cap-toolbar">

              <h2>Estado de polivalencia</h2>

              {onNavigate && (
                <button
                  type="button"
                  className="cap-secondary"
                  onClick={enlace('POLIVALENCIA')}
                >
                  Ver polivalencia
                  <ArrowRight size={15} />
                </button>
              )}

            </div>

            <GraficoDona
              items={[
                {
                  label: 'Cumplen la meta',
                  value:
                    indicadoresPolivalencia.cumplen,
                  color: COLORS.success
                },
                {
                  label: 'Brecha con operadores',
                  value:
                    indicadoresPolivalencia
                      .brechaConOperadores,
                  color: '#d97706'
                },
                {
                  label: 'Sin operadores',
                  value:
                    indicadoresPolivalencia
                      .sinOperadores,
                  color: '#dc2626'
                }
              ]}
            />

            <div
              className="cap-kpi-grid"
              style={{ marginTop: 20 }}
            >

              <KPI
                icon={Users}
                label="Brecha de posiciones"
                value={
                  indicadoresPolivalencia.brechaTotal
                }
                color={COLORS.danger}
              />

              <KPI
                icon={AlertTriangle}
                label="Dependencia de un operador"
                value={
                  indicadoresPolivalencia.operadorUnico
                }
                color={COLORS.warning}
              />

              <KPI
                icon={Target}
                label="Máquinas con brecha"
                value={
                  indicadoresPolivalencia.conBrecha
                }
                color={COLORS.danger}
              />

            </div>

            {(indicadoresPolivalencia.sinDatos > 0 ||
              indicadoresPolivalencia.sinMeta > 0) && (

              <div className="cap-alert-warning">

                {
                  indicadoresPolivalencia.sinDatos
                } equipos sin información y
                {' '}
                {
                  indicadoresPolivalencia.sinMeta
                } equipos sin meta válida.

                Se excluyen de los porcentajes
                de polivalencia.

              </div>
            )}

          </div>

          {/* PRIORIDADES DE CAPACITACIÓN */}

          <div className="cap-panel">

            <h2>
              Top 5 prioridades de capacitación
            </h2>

            <p className="cap-muted">

              Priorización sugerida según ausencia
              de operadores, dependencia de una
              persona y brecha de cobertura.

            </p>

            <div className="cap-table-wrap">

              <table>

                <thead>
                  <tr>
                    <th>Prioridad</th>
                    <th>Máquina</th>
                    <th>Autorizados</th>
                    <th>Mínimo</th>
                    <th>Brecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                <tbody>

                  {prioridadesMaquinas.map(
                    (m, index) => (

                      <tr key={m.id}>

                        <td>
                          <strong style={{
                            color: COLORS.primary
                          }}>
                            #{index + 1}
                          </strong>
                        </td>

                        <td>
                          <strong>{m.nombre}</strong>

                          <div className="cap-muted">
                            {m.procesos.join(', ')}
                          </div>
                        </td>

                        <td>{m.autorizados}</td>

                        <td>{m.minimo}</td>

                        <td>
                          <strong style={{
                            color: m.brecha > 0
                              ? COLORS.danger
                              : COLORS.neutral
                          }}>
                            {m.brecha ?? 'N/A'}
                          </strong>
                        </td>

                        <td>
                          <Estado value={m.estado} />
                        </td>

                      </tr>

                    )
                  )}

                  {!prioridadesMaquinas.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="cap-empty"
                      >
                        No se identificaron prioridades
                        en los equipos consultados.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </div>

          {/* PENDIENTES DE AUTORIZACIÓN */}

          <div className="cap-panel">

            <h2>Pendientes de aprobación</h2>

            <div className="cap-kpi-grid">

              <KPI
                icon={Factory}
                label="VoBo de máquinas"
                value={
                  indicadoresMaquinas.pendientesVoBo
                }
                color={COLORS.warning}
                description="Combinaciones pendientes"
                onClick={
                  isJefe
                    ? enlace('AUTORIZACIONES_MAQUINAS')
                    : enlace('MATRIZ_MAQUINAS')
                }
              />

              <KPI
                icon={ShieldCheck}
                label="VoBo de riesgos críticos"
                value={
                  indicadoresRC.pendientesVoBo
                }
                color={COLORS.warning}
                description="Asignaciones pendientes"
                onClick={
                  isJefe
                    ? enlace('AUTORIZACIONES_RC')
                    : enlace('MATRIZ_RC')
                }
              />

              <KPI
                icon={Clock}
                label="RC vigentes con alerta"
                value={indicadoresRC.conAlerta}
                color={COLORS.orange}
                description="Próximos a vencer"
                onClick={enlace('MATRIZ_RC')}
              />

              <KPI
                icon={ShieldAlert}
                label="RC suspendidos"
                value={indicadoresRC.suspendidos}
                color={COLORS.danger}
                onClick={enlace('MATRIZ_RC')}
              />

            </div>

          </div>

          {/* CONTROL DE VENCIMIENTOS */}

          {canReadVencimientos && (

            <div className="cap-panel">

              <div className="cap-toolbar">

                <h2>Control de vencimientos</h2>

                {onNavigate && (
                  <button
                    type="button"
                    className="cap-secondary"
                    onClick={enlace('VENCIMIENTOS')}
                  >
                    Ver vencimientos
                    <ArrowRight size={15} />
                  </button>
                )}

              </div>

              {!datos.vencimientosDisponibles ? (

                <p className="cap-muted">
                  No fue posible consultar
                  los vencimientos.
                </p>

              ) : (

                <>

                  <p className="cap-muted">
                    Requisitos obligatorios
                    visibles para tu perfil.
                  </p>

                  <div className="cap-kpi-grid">

                    {[
                      {
                        titulo: 'Vigentes',
                        valor:
                          indicadoresVencimientos
                            .vigentes,
                        color: COLORS.success,
                        fondo: '#dcfce7'
                      },
                      {
                        titulo: '31 a 90 días',
                        valor:
                          indicadoresVencimientos
                            .proximos,
                        color: COLORS.warning,
                        fondo: '#fef3c7'
                      },
                      {
                        titulo: '0 a 30 días',
                        valor:
                          indicadoresVencimientos
                            .criticos,
                        color: COLORS.orange,
                        fondo: '#ffedd5'
                      },
                      {
                        titulo: 'Vencidos',
                        valor:
                          indicadoresVencimientos
                            .vencidos,
                        color: COLORS.danger,
                        fondo: '#fee2e2'
                      },
                      {
                        titulo: 'Pendientes',
                        valor:
                          indicadoresVencimientos
                            .pendientes,
                        color: COLORS.neutral,
                        fondo: '#f1f5f9'
                      }
                    ].map(v => (

                      <div
                        key={v.titulo}
                        style={{
                          background: v.fondo,
                          borderRadius: 10,
                          padding: 20,
                          textAlign: 'center'
                        }}
                      >

                        <div style={{
                          fontSize: 32,
                          color: v.color,
                          fontWeight: 700
                        }}>
                          {v.valor}
                        </div>

                        <strong style={{
                          color: v.color,
                          fontSize: 12
                        }}>
                          {v.titulo}
                        </strong>

                      </div>
                    ))}

                  </div>

                  <p className="cap-muted">

                    Total de requisitos consultados:
                    {' '}
                    {indicadoresVencimientos.total}

                  </p>

                </>

              )}

            </div>

          )}

          {/* CERTIFICACIONES ADICIONALES */}

          {canReadCertificaciones && (

            <div className="cap-panel">

              <div className="cap-toolbar">

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <Award
                    size={27}
                    color={COLORS.purple}
                  />

                  <h2>
                    Certificaciones adicionales
                  </h2>
                </div>

                <span className={
                  'cap-status cap-status-optional'
                }>
                  OPCIONAL
                </span>

              </div>

              {!datos.vencimientosDisponibles ? (

                <p className="cap-muted">
                  Información no disponible.
                </p>

              ) : (

                <>

                  <div className="cap-kpi-grid">

                    <KPI
                      icon={Award}
                      label="Certificaciones válidas"
                      value={
                        indicadoresCertificaciones.validas
                      }
                      color={COLORS.purple}
                      variant="cap-kpi-certification"
                    />

                    <KPI
                      icon={Target}
                      label="Cobertura de certificación"
                      value={formatPercent(
                        indicadoresCertificaciones
                          .cobertura
                      )}
                      color={COLORS.purple}
                      variant="cap-kpi-certification"
                    />

                    <KPI
                      icon={Clock}
                      label="Próximas a vencer"
                      value={
                        indicadoresCertificaciones
                          .proximas
                      }
                      color={COLORS.purple}
                      variant="cap-kpi-certification"
                    />

                    <KPI
                      icon={CalendarX}
                      label="Certificaciones vencidas"
                      value={
                        indicadoresCertificaciones
                          .vencidas
                      }
                      color={COLORS.purple}
                      variant="cap-kpi-certification"
                    />

                  </div>

                  <IndicadorBarra
                    label="Cobertura de certificación"
                    value={
                      indicadoresCertificaciones
                        .cobertura
                    }
                    color={COLORS.purple}
                  />

                  <p className="cap-muted">

                    Las certificaciones representan
                    competencias adicionales.

                    Su ausencia o vencimiento
                    no afecta la autorización
                    operativa.

                  </p>

                </>

              )}

            </div>

          )}

          {/* RANKING DE COLABORADORES */}

          <div className="cap-panel">

            <div className="cap-toolbar">

              <h2>
                Top 5 colaboradores polivalentes
              </h2>

              {onNavigate && (
                <button
                  type="button"
                  className="cap-secondary"
                  onClick={
                    enlace('MATRIZ_MAQUINAS')
                  }
                >
                  Ver matriz
                  <ArrowRight size={15} />
                </button>
              )}

            </div>

            <p className="cap-muted">

              Ranking por número de máquinas
              con autorización vigente.

            </p>

            {rankingColaboradores.map(
              (c, index) => (

                <div
                  key={c.id}
                  style={{
                    padding: '16px 0',
                    borderBottom: '1px solid #e2e8f0'
                  }}
                >

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>

                    <div style={{
                      width: 36,
                      height: 36,
                      background: '#eff6ff',
                      borderRadius: 8,
                      color: COLORS.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      #{index + 1}
                    </div>

                    <div style={{
                      flex: 1,
                      minWidth: 0
                    }}>

                      <strong>
                        {c.nombre}
                      </strong>

                      <div className="cap-muted">
                        {c.puesto}
                      </div>

                      {c.esLider && (
                        <span style={{
                          color: COLORS.warning,
                          fontSize: 11
                        }}>
                          LÍDER DE CAPACITACIÓN
                        </span>
                      )}

                    </div>

                    <div style={{
                      textAlign: 'right'
                    }}>
                      <strong style={{
                        fontSize: 21,
                        color: COLORS.primary
                      }}>
                        {c.autorizadas}
                      </strong>

                      <div className="cap-muted">
                        máquinas
                      </div>
                    </div>

                  </div>

                  <div style={{
                    marginTop: 10
                  }}>

                    <ProgressBar
                      value={c.cobertura}
                      color={COLORS.primary}
                      height={8}
                    />

                  </div>

                </div>

              )
            )}

            {!rankingColaboradores.length && (
              <div className="cap-welcome">

                <GraduationCap size={40} />

                <p>
                  Todavía no existen autorizaciones
                  de máquinas para construir el ranking.
                </p>

              </div>
            )}

          </div>

          {/* CREDENCIALES QR */}

          {isJefe && (

            <div className="cap-panel">

              <div className="cap-toolbar">

                <h2>Control de credenciales QR</h2>

                {onNavigate && (
                  <button
                    type="button"
                    className="cap-secondary"
                    onClick={
                      enlace('CREDENCIALES_QR')
                    }
                  >
                    Administrar credenciales
                    <ArrowRight size={15} />
                  </button>
                )}

              </div>

              {!datos.credencialesDisponibles ? (

                <p className="cap-muted">
                  Información no disponible.
                </p>

              ) : (

                <>

                  <div className="cap-kpi-grid">

                    <KPI
                      icon={QrCode}
                      label="Colaboradores con QR"
                      value={indicadoresQR.conQR}
                      color={COLORS.success}
                    />

                    <KPI
                      icon={Users}
                      label="Sin credencial"
                      value={indicadoresQR.sinQR}
                      color={COLORS.warning}
                    />

                    <KPI
                      icon={Target}
                      label="Cobertura QR"
                      value={formatPercent(
                        indicadoresQR.cobertura
                      )}
                      color={COLORS.primary}
                    />

                  </div>

                  <ProgressBar
                    value={indicadoresQR.cobertura}
                    color={COLORS.primary}
                  />

                </>

              )}

            </div>

          )}

          {/* CONFIGURACIÓN DE ACTUALIZACIÓN */}

          <div className="cap-panel cap-toolbar">

            <div>

              <strong>
                Actualización del dashboard
              </strong>

              <p className="cap-muted">
                Consulta automática cada 60 segundos
                mientras la pantalla está visible.
              </p>

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

              Actualización automática

            </label>

          </div>

          {/* NOTA DE SEGURIDAD */}

          <div className="cap-alert-info">

            <ShieldCheck size={20} />

            {' '}

            <strong>
              Alcance de los indicadores
            </strong>

            <p>

              El dashboard consolida información
              administrativa de capacitación.

              Los estados operativos son consultados
              desde el motor de autorización de
              Supabase.

            </p>

            <p>

              La ausencia de alertas o vencimientos
              no implica que todos los colaboradores
              estén autorizados.

              Las consultas se realizan por separado
              y no constituyen una transacción
              simultánea de toda la base de datos.

            </p>

          </div>

        </>

      )}

    </div>
  );
}
