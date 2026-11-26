
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';

import {
  CalendarClock,
  CalendarCheck,
  CalendarX,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  GraduationCap,
  ClipboardCheck,
  HeartPulse,
  Award,
  Users,
  Search,
  RefreshCw,
  Download,
  X
} from 'lucide-react';

import * as XLSX from 'xlsx';

import './capacitacion.css';

// ==========================================
// CONFIGURACIÓN DE ESTADOS
// ==========================================

const ESTADOS = {

  VIGENTE: {
    label: 'Vigente',
    color: '#166534',
    bg: '#dcfce7',
    prioridad: 5
  },

  PROXIMO_A_VENCER: {
    label: 'Próximo a vencer',
    color: '#92400e',
    bg: '#fef3c7',
    prioridad: 4
  },

  CRITICO: {
    label: 'Crítico',
    color: '#9a3412',
    bg: '#ffedd5',
    prioridad: 2
  },

  VENCIDO: {
    label: 'Vencido',
    color: '#991b1b',
    bg: '#fee2e2',
    prioridad: 1
  },

  PENDIENTE: {
    label: 'Pendiente',
    color: '#475569',
    bg: '#f1f5f9',
    prioridad: 3
  },

  SIN_VENCIMIENTO: {
    label: 'Sin vencimiento',
    color: '#475569',
    bg: '#f1f5f9',
    prioridad: 6
  },

  CERTIFICACION_NO_VALIDA: {
    label: 'Certificación no válida',
    color: '#6d28d9',
    bg: '#ede9fe',
    prioridad: 3
  },

  NO_DISPONIBLE: {
    label: 'Información no disponible',
    color: '#64748b',
    bg: '#f1f5f9',
    prioridad: 7
  }

};

const REQUISITOS = {

  MOODLE: {
    label: 'Moodle',
    icon: GraduationCap,
    responsable: 'GESTOR_RC'
  },

  ENTRENAMIENTO: {
    label: 'Entrenamiento práctico',
    icon: ClipboardCheck,
    responsable: 'GESTOR_RC'
  },

  ENTRENAMIENTO_PRACTICO: {
    label: 'Entrenamiento práctico',
    icon: ClipboardCheck,
    responsable: 'GESTOR_RC'
  },

  APTITUD_MEDICA: {
    label: 'Aptitud médica',
    icon: HeartPulse,
    responsable: 'ING_PROCESOS'
  },

  CERTIFICACION: {
    label: 'Certificación adicional',
    icon: Award,
    responsable: 'GESTOR_RC'
  }

};

const RESPONSABLES = {

  JEFE_PRODUCCION:
    'Jefe de producción',

  ING_PROCESOS:
    'Ingeniero de procesos',

  GESTOR_RC:
    'Gestor de riesgos críticos'

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

  const [year, month, day] =
    String(value).slice(0, 10).split('-');

  return `${day}/${month}/${year}`;

}

function getEstado(value) {

  return ESTADOS[value] || {

    label: String(
      value || 'NO_DISPONIBLE'
    ).replaceAll('_', ' '),

    color: '#64748b',

    bg: '#f1f5f9',

    prioridad: 7

  };

}

function getRequisito(value) {

  return REQUISITOS[value] || {

    label: String(
      value || 'NO_DISPONIBLE'
    ).replaceAll('_', ' '),

    icon: CalendarClock,

    responsable: null

  };

}

function getResponsable(value) {

  return RESPONSABLES[value] ||

    String(value || 'NO DISPONIBLE')
      .replaceAll('_', ' ');

}

function isCertification(registro) {

  return registro.requisito ===
    'CERTIFICACION';

}

function textValue(value) {

  const text = String(value ?? '');

  return /^[=+\-@\t\r]/.test(text)

    ? "'" + text

    : text;

}

function diasLabel(value) {

  if (value == null) {

    return 'Sin fecha';

  }

  const dias = Number(value);

  if (!Number.isFinite(dias)) {

    return 'No disponible';

  }

  if (dias < 0) {

    return `${Math.abs(dias)} días vencido`;

  }

  if (dias === 0) {

    return 'Vence hoy';

  }

  if (dias === 1) {

    return '1 día restante';

  }

  return `${dias} días restantes`;

}

function contarEstados(registros) {

  return {

    total: registros.length,

    vigentes: registros.filter(
      r => r.estado_vencimiento === 'VIGENTE'
    ).length,

    proximos: registros.filter(
      r =>
        r.estado_vencimiento ===
        'PROXIMO_A_VENCER'
    ).length,

    criticos: registros.filter(
      r => r.estado_vencimiento === 'CRITICO'
    ).length,

    vencidos: registros.filter(
      r => r.estado_vencimiento === 'VENCIDO'
    ).length,

    pendientes: registros.filter(
      r => r.estado_vencimiento === 'PENDIENTE'
    ).length,

    sinVencimiento: registros.filter(
      r =>
        r.estado_vencimiento ===
        'SIN_VENCIMIENTO'
    ).length,

    noValidos: registros.filter(
      r =>
        r.estado_vencimiento ===
        'CERTIFICACION_NO_VALIDA'
    ).length

  };

}

// ==========================================
// COMPONENTES VISUALES
// ==========================================

function Estado({
  value,
  optional = false
}) {

  const config = getEstado(value);

  return (

    <span
      className="cap-status"
      style={{

        background: optional

          ? '#ede9fe'

          : config.bg,

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

function DiasRestantes({
  value,
  estado,
  optional = false
}) {

  const config = getEstado(estado);

  return (

    <div style={{

      fontWeight: 700,

      fontSize: 12,

      color: optional

        ? '#7c3aed'

        : config.color

    }}>

      {diasLabel(value)}

    </div>

  );

}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function Vencimientos({
  client,
  role
}) {

  const canRead = [

    'JEFE_PRODUCCION',

    'ING_PROCESOS',

    'GESTOR_RC'

  ].includes(role);

  const canReadCertificaciones = [

    'JEFE_PRODUCCION',

    'GESTOR_RC'

  ].includes(role);

  const isJefe =
    role === 'JEFE_PRODUCCION';

  const [vencimientos, setVencimientos] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [exporting, setExporting] =
    useState(false);

  const [error, setError] =
    useState('');

  const [warning, setWarning] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [fechaConsulta, setFechaConsulta] =
    useState(null);

  const [tab, setTab] =
    useState('OBLIGATORIOS');

  const [search, setSearch] =
    useState('');

  const [filterRC, setFilterRC] =
    useState('TODOS');

  const [filterRequisito, setFilterRequisito] =
    useState('TODOS');

  const [filterEstado, setFilterEstado] =
    useState('TODOS');

  const [filterResponsable, setFilterResponsable] =
    useState('TODOS');

  const [orden, setOrden] =
    useState('PRIORIDAD');

  // ==========================================
  // CONSULTAR INFORMACIÓN
  // ==========================================

  const cargarDatos = useCallback(async () => {

    if (!client || !canRead) {

      setVencimientos([]);
      setFechaConsulta(null);
      setLoading(false);

      return;

    }

    setLoading(true);
    setError('');
    setWarning('');
    setSuccess('');
    setFechaConsulta(null);
    setVencimientos([]);

    try {

      const { data, error } = await client.rpc(

        'cap_consultar_vencimientos'

      );

      if (error) throw error;

      const registros = data || [];

      // Filtro adicional de interfaz.
      // Los permisos reales se aplican
      // desde la RPC de Supabase.

      const permitidos = registros.filter(r => {

        if (role === 'JEFE_PRODUCCION') {

          return true;

        }

        if (role === 'ING_PROCESOS') {

          return r.requisito ===
            'APTITUD_MEDICA';

        }

        if (role === 'GESTOR_RC') {

          return [

            'MOODLE',

            'ENTRENAMIENTO',

            'ENTRENAMIENTO_PRACTICO',

            'CERTIFICACION'

          ].includes(r.requisito);

        }

        return false;

      });

      setVencimientos(permitidos);

      setFechaConsulta(new Date());

      if (registros.length >= 1000) {

        setWarning(

          'La consulta alcanzó 1,000 registros. ' +
          'La API podría haber limitado los resultados. ' +
          'Verifica la información antes de interpretar ' +
          'los indicadores como completos.'

        );

      }

    } catch (err) {

      setVencimientos([]);
      setFechaConsulta(null);

      setError(

        'No fue posible consultar los vencimientos: ' +
        err.message

      );

    } finally {

      setLoading(false);

    }

  }, [client, role, canRead]);

  useEffect(() => {

    setVencimientos([]);
    setTab('OBLIGATORIOS');
    setSearch('');
    setFilterRC('TODOS');
    setFilterRequisito('TODOS');
    setFilterEstado('TODOS');
    setFilterResponsable('TODOS');

    cargarDatos();

  }, [cargarDatos]);

  // ==========================================
  // SEPARAR REQUISITOS Y CERTIFICACIONES
  // ==========================================

  const obligatorios = useMemo(() => {

    return vencimientos.filter(
      r => !isCertification(r)
    );

  }, [vencimientos]);

  const certificaciones = useMemo(() => {

    return vencimientos.filter(
      isCertification
    );

  }, [vencimientos]);

  // ==========================================
  // INDICADORES GENERALES
  // ==========================================

  const indicadores = useMemo(() => {

    return contarEstados(obligatorios);

  }, [obligatorios]);

  const indicadoresCertificacion = useMemo(() => {

    const resumen =
      contarEstados(certificaciones);

    return {

      ...resumen,

      validas: certificaciones.filter(r =>

        [

          'VIGENTE',

          'CRITICO',

          'PROXIMO_A_VENCER',

          'SIN_VENCIMIENTO'

        ].includes(r.estado_vencimiento)

      ).length

    };

  }, [certificaciones]);

  // ==========================================
  // COLABORADORES CON ALERTAS
  // ==========================================

  const colaboradoresConAlertas = useMemo(() => {

    return new Set(

      obligatorios

        .filter(r =>

          [

            'VENCIDO',

            'CRITICO',

            'PROXIMO_A_VENCER',

            'PENDIENTE'

          ].includes(r.estado_vencimiento)

        )

        .map(r => r.colaborador_id)

        .filter(Boolean)

    ).size;

  }, [obligatorios]);

  // ==========================================
  // RESUMEN POR RESPONSABLE
  // ==========================================

  const resumenResponsables = useMemo(() => {

    const map = new Map();

    obligatorios.forEach(r => {

      const responsable = r.responsable ||

        getRequisito(r.requisito).responsable ||

        'NO_ASIGNADO';

      if (!map.has(responsable)) {

        map.set(responsable, []);

      }

      map.get(responsable).push(r);

    });

    return [...map.entries()]

      .map(([responsable, registros]) => {

        const resumen =
          contarEstados(registros);

        return {

          responsable,

          ...resumen,

          requierenAtencion:

            resumen.vencidos +

            resumen.criticos +

            resumen.proximos +

            resumen.pendientes

        };

      })

      .sort((a, b) =>

        b.vencidos - a.vencidos ||

        b.criticos - a.criticos ||

        b.proximos - a.proximos

      );

  }, [obligatorios]);

  // ==========================================
  // RESUMEN POR RIESGO CRÍTICO
  // ==========================================

  const resumenRC = useMemo(() => {

    const map = new Map();

    obligatorios.forEach(r => {

      const rc =
        r.riesgo_critico || 'Sin identificar';

      if (!map.has(rc)) {

        map.set(rc, []);

      }

      map.get(rc).push(r);

    });

    return [...map.entries()]

      .map(([riesgo, registros]) => ({

        riesgo,

        ...contarEstados(registros)

      }))

      .sort((a, b) =>

        b.vencidos - a.vencidos ||

        b.criticos - a.criticos ||

        b.proximos - a.proximos ||

        a.riesgo.localeCompare(b.riesgo, 'es')

      );

  }, [obligatorios]);

  // ==========================================
  // PRIORIDADES DE RENOVACIÓN
  // ==========================================

  const prioridades = useMemo(() => {

    return obligatorios

      .filter(r =>

        [

          'VENCIDO',

          'CRITICO',

          'PENDIENTE',

          'PROXIMO_A_VENCER'

        ].includes(r.estado_vencimiento)

      )

      .sort((a, b) =>

        getEstado(a.estado_vencimiento).prioridad -

        getEstado(b.estado_vencimiento).prioridad ||

        (a.dias_restantes ?? Infinity) -

        (b.dias_restantes ?? Infinity)

      )

      .slice(0, 10);

  }, [obligatorios]);

  // ==========================================
  // REGISTROS SEGÚN PESTAÑA
  // ==========================================

  const registrosTab =

    tab === 'CERTIFICACIONES'

      ? certificaciones

      : obligatorios;

  const riesgosDisponibles = useMemo(() => {

    return [...new Set(

      registrosTab

        .map(r => r.riesgo_critico)

        .filter(Boolean)

    )].sort((a, b) =>

      a.localeCompare(b, 'es')

    );

  }, [registrosTab]);

  const requisitosDisponibles = useMemo(() => {

    return [...new Set(

      registrosTab

        .map(r => r.requisito)

        .filter(Boolean)

    )];

  }, [registrosTab]);

  const responsablesDisponibles = useMemo(() => {

    return [...new Set(

      registrosTab

        .map(r => r.responsable)

        .filter(Boolean)

    )];

  }, [registrosTab]);

  // ==========================================
  // FILTROS
  // ==========================================

  const filtered = useMemo(() => {

    const term = normalize(search);

    return registrosTab

      .filter(r => {

        if (

          filterRC !== 'TODOS' &&

          r.riesgo_critico !== filterRC

        ) {

          return false;

        }

        if (

          filterRequisito !== 'TODOS' &&

          r.requisito !== filterRequisito

        ) {

          return false;

        }

        if (

          filterResponsable !== 'TODOS' &&

          r.responsable !== filterResponsable

        ) {

          return false;

        }

        if (

          filterEstado === 'REQUIEREN_ATENCION' &&

          ![

            'VENCIDO',

            'CRITICO',

            'PROXIMO_A_VENCER',

            'PENDIENTE',

            'CERTIFICACION_NO_VALIDA'

          ].includes(r.estado_vencimiento)

        ) {

          return false;

        }

        if (

          ![
            'TODOS',
            'REQUIEREN_ATENCION'
          ].includes(filterEstado) &&

          r.estado_vencimiento !== filterEstado

        ) {

          return false;

        }

        if (!term) return true;

        return [

          r.colaborador,

          r.riesgo_critico,

          getRequisito(r.requisito).label,

          getEstado(r.estado_vencimiento).label,

          getResponsable(r.responsable)

        ].some(value =>

          normalize(value).includes(term)

        );

      })

      .sort((a, b) => {

        if (orden === 'COLABORADOR') {

          return String(a.colaborador || '')

            .localeCompare(
              String(b.colaborador || ''),
              'es'
            );

        }

        if (orden === 'RIESGO_CRITICO') {

          return String(a.riesgo_critico || '')

            .localeCompare(
              String(b.riesgo_critico || ''),
              'es'
            );

        }

        if (orden === 'VENCIMIENTO') {

          return (

            (a.dias_restantes ?? Infinity) -

            (b.dias_restantes ?? Infinity)

          );

        }

        return (

          getEstado(a.estado_vencimiento).prioridad -

          getEstado(b.estado_vencimiento).prioridad

        ) || (

          (a.dias_restantes ?? Infinity) -

          (b.dias_restantes ?? Infinity)

        );

      });

  }, [

    registrosTab,

    search,

    filterRC,

    filterRequisito,

    filterResponsable,

    filterEstado,

    orden

  ]);

  // ==========================================
  // CAMBIAR PESTAÑA Y LIMPIAR FILTROS
  // ==========================================

  function limpiarFiltros() {

    setSearch('');
    setFilterRC('TODOS');
    setFilterRequisito('TODOS');
    setFilterEstado('TODOS');
    setFilterResponsable('TODOS');
    setOrden('PRIORIDAD');

  }

  function cambiarTab(value) {

    if (

      value === 'CERTIFICACIONES' &&

      !canReadCertificaciones

    ) return;

    setTab(value);

    limpiarFiltros();

    setSuccess('');

  }

  // ==========================================
  // EXPORTACIÓN A EXCEL
  // ==========================================

  function exportarExcel() {

    if (

      !canRead ||

      loading ||

      exporting ||

      error ||

      !vencimientos.length

    ) return;

    setExporting(true);
    setSuccess('');

    try {

      const wb = XLSX.utils.book_new();

      // Función reutilizable para hojas
      // de vencimientos.

      function agregarHojaRegistros(
        nombre,
        registros
      ) {

        const rows = [

          [

            'Colaborador',

            'Riesgo crítico',

            'Requisito',

            'Fecha de realización',

            'Fecha de vencimiento',

            'Días restantes',

            'Estado',

            'Responsable',

            'Clasificación'

          ],

          ...registros.map(r => [

            textValue(r.colaborador),

            textValue(r.riesgo_critico),

            getRequisito(r.requisito).label,

            r.fecha_realizacion || '—',

            r.fecha_vencimiento ||
              'Sin fecha registrada',

            r.dias_restantes ?? 'N/A',

            getEstado(
              r.estado_vencimiento
            ).label,

            getResponsable(r.responsable),

            isCertification(r)

              ? 'OPCIONAL'

              : 'OBLIGATORIO'

          ])

        ];

        const ws =
          XLSX.utils.aoa_to_sheet(rows);

        ws['!cols'] = [

          { wch: 40 },

          { wch: 45 },

          { wch: 30 },

          { wch: 23 },

          { wch: 23 },

          { wch: 18 },

          { wch: 28 },

          { wch: 35 },

          { wch: 20 }

        ];

        ws['!autofilter'] = {

          ref: ws['!ref']

        };

        XLSX.utils.book_append_sheet(

          wb,

          ws,

          nombre

        );

      }

      // ======================================
      // HOJA 1: RESULTADOS FILTRADOS
      // ======================================

      agregarHojaRegistros(

        'Consulta filtrada',

        filtered

      );

      // ======================================
      // HOJA 2: REQUISITOS OBLIGATORIOS
      // ======================================

      agregarHojaRegistros(

        'Requisitos obligatorios',

        obligatorios

      );

      // ======================================
      // HOJA 3: CERTIFICACIONES OPCIONALES
      // ======================================

      if (canReadCertificaciones) {

        agregarHojaRegistros(

          'Certificaciones',

          certificaciones

        );

      }

      // ======================================
      // HOJA 4: RESUMEN POR RESPONSABLE
      // ======================================

      const wsResponsables =
        XLSX.utils.aoa_to_sheet([

          [

            'Responsable',

            'Total registros',

            'Vigentes',

            '31 a 90 días',

            '0 a 30 días',

            'Vencidos',

            'Pendientes',

            'Requieren atención'

          ],

          ...resumenResponsables.map(r => [

            getResponsable(r.responsable),

            r.total,

            r.vigentes,

            r.proximos,

            r.criticos,

            r.vencidos,

            r.pendientes,

            r.requierenAtencion

          ])

        ]);

      wsResponsables['!cols'] = [

        { wch: 35 },

        { wch: 20 },

        { wch: 15 },

        { wch: 15 },

        { wch: 15 },

        { wch: 15 },

        { wch: 15 },

        { wch: 22 }

      ];

      XLSX.utils.book_append_sheet(

        wb,

        wsResponsables,

        'Responsables'

      );

      // ======================================
      // HOJA 5: RESUMEN POR RC
      // ======================================

      const wsRC =
        XLSX.utils.aoa_to_sheet([

          [

            'Riesgo crítico',

            'Total',

            'Vigentes',

            '31 a 90 días',

            '0 a 30 días',

            'Vencidos',

            'Pendientes'

          ],

          ...resumenRC.map(r => [

            textValue(r.riesgo),

            r.total,

            r.vigentes,

            r.proximos,

            r.criticos,

            r.vencidos,

            r.pendientes

          ])

        ]);

      wsRC['!cols'] = [

        { wch: 48 },

        { wch: 15 },

        { wch: 15 },

        { wch: 15 },

        { wch: 15 },

        { wch: 15 },

        { wch: 15 }

      ];

      XLSX.utils.book_append_sheet(

        wb,

        wsRC,

        'Resumen por RC'

      );

      // ======================================
      // HOJA 6: RESUMEN EJECUTIVO
      // ======================================

      const resumen = [

        ['TRANSMETAL'],

        ['CONTROL DE VENCIMIENTOS'],

        ['Fecha de exportación', fechaGuatemala()],

        [

          'Fecha de consulta',

          fechaConsulta

            ? new Intl.DateTimeFormat('es-GT', {

                timeZone: 'America/Guatemala',

                dateStyle: 'short',

                timeStyle: 'short'

              }).format(fechaConsulta)

            : 'No disponible'

        ],

        ['Perfil', getResponsable(role)],

        [],

        ['REQUISITOS OBLIGATORIOS', 'Cantidad'],

        ['Total registros', indicadores.total],

        ['Vigentes', indicadores.vigentes],

        ['Próximos a vencer', indicadores.proximos],

        ['Críticos', indicadores.criticos],

        ['Vencidos', indicadores.vencidos],

        ['Pendientes', indicadores.pendientes],

        [

          'Colaboradores con alertas',

          colaboradoresConAlertas

        ]

      ];

      if (canReadCertificaciones) {

        resumen.push(

          [],

          ['CERTIFICACIONES OPCIONALES', 'Cantidad'],

          [

            'Registradas',

            indicadoresCertificacion.total

          ],

          [

            'Válidas',

            indicadoresCertificacion.validas

          ],

          [

            'Vencidas',

            indicadoresCertificacion.vencidos

          ],

          [

            'No válidas',

            indicadoresCertificacion.noValidos

          ],

          [

            'Sin vencimiento',

            indicadoresCertificacion.sinVencimiento

          ]

        );

      }

      resumen.push(

        [],

        ['FILTROS APLICADOS'],

        ['Pestaña', tab],

        ['Búsqueda', textValue(search)],

        ['Riesgo crítico', textValue(filterRC)],

        ['Requisito', textValue(filterRequisito)],

        ['Estado', textValue(filterEstado)],

        ['Responsable', textValue(filterResponsable)],

        [],

        ['Advertencias', textValue(warning || 'Ninguna')],

        [

          'Nota',

          'Los registros corresponden únicamente ' +

          'a la información permitida para el perfil.'

        ],

        [

          'Nota',

          'Las certificaciones adicionales no ' +

          'condicionan la autorización operativa.'

        ],

        [

          'Nota',

          'El reporte contiene vencimientos ' +

          'consultados, no todos los requisitos ' +

          'de capacitación pendientes de realizar.'

        ],

        [

          'Nota',

          'La ausencia de registros no demuestra ' +

          'que todos los colaboradores estén autorizados.'

        ],

        [

          'Nota',

          'Documento de seguimiento administrativo. ' +

          'Verificar el estado operativo actualizado.'

        ]

      );

      const wsResumen =
        XLSX.utils.aoa_to_sheet(resumen);

      wsResumen['!cols'] = [

        { wch: 45 },

        { wch: 105 }

      ];

      XLSX.utils.book_append_sheet(

        wb,

        wsResumen,

        'Resumen ejecutivo'

      );

      XLSX.writeFile(

        wb,

        `Vencimientos_Transmetal_${fechaGuatemala()}.xlsx`

      );

      setSuccess(

        'Reporte Excel generado correctamente.'

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
  // VALIDAR SESIÓN Y PERMISOS
  // ==========================================

  if (!client || !role) {

    return (

      <div className="cap-alert-warning">

        No hay una sesión autorizada
        de capacitación.

      </div>

    );

  }

  if (!canRead) {

    return (

      <div className="cap-panel cap-welcome">

        <ShieldCheck size={42} />

        <h2>Consulta restringida</h2>

        <p>

          El detalle de vencimientos está
          disponible únicamente para los
          responsables de capacitación.

          Puedes consultar los estados operativos
          desde la matriz de riesgos críticos.

        </p>

      </div>

    );

  }

  const mostrarValor = value =>

    loading || error ? '—' : value;

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (

    <div className="cap-vencimientos">

      {/* ENCABEZADO */}

      <div className="cap-panel cap-toolbar">

        <div>

          <h2>Control de vencimientos</h2>

          <p className="cap-muted">

            Seguimiento preventivo de requisitos
            y certificaciones de riesgos críticos.

          </p>

          {fechaConsulta && (

            <span className="cap-muted">

              Última consulta: {

                new Intl.DateTimeFormat('es-GT', {

                  timeZone: 'America/Guatemala',

                  dateStyle: 'short',

                  timeStyle: 'short'

                }).format(fechaConsulta)

              }

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
            disabled={loading || exporting}
            onClick={cargarDatos}
          >

            <RefreshCw size={16} />

            Actualizar

          </button>

          <button
            type="button"
            className="cap-primary"
            disabled={

              loading ||

              exporting ||

              Boolean(error) ||

              !vencimientos.length

            }
            onClick={exportarExcel}
          >

            <Download size={18} />

            {exporting

              ? 'Exportando...'

              : 'Exportar Excel'}

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

        <div className="cap-alert-warning">

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

      {/* INDICADORES OBLIGATORIOS */}

      <div className="cap-kpi-grid">

        <KPI
          icon={CalendarClock}
          label="Requisitos consultados"
          value={mostrarValor(indicadores.total)}
          description="Registros visibles según el perfil"
        />

        <KPI
          icon={CalendarCheck}
          label="Vigentes"
          value={mostrarValor(indicadores.vigentes)}
          description="Más de 90 días de vigencia"
          variant="cap-kpi-success"
          color="#15803d"
        />

        <KPI
          icon={Clock}
          label="Próximos a vencer"
          value={mostrarValor(indicadores.proximos)}
          description="Entre 31 y 90 días"
          variant="cap-kpi-warning"
          color="#b45309"
        />

        <KPI
          icon={AlertTriangle}
          label="Vencimientos críticos"
          value={mostrarValor(indicadores.criticos)}
          description="Entre 0 y 30 días"
          variant="cap-kpi-warning"
          color="#c2410c"
        />

        <KPI
          icon={CalendarX}
          label="Vencidos"
          value={mostrarValor(indicadores.vencidos)}
          description="Fecha de vencimiento superada"
          variant="cap-kpi-danger"
          color="#b91c1c"
        />

        <KPI
          icon={ClipboardCheck}
          label="Pendientes"
          value={mostrarValor(indicadores.pendientes)}
          description="Vigencia pendiente de resolver"
          variant="cap-kpi-warning"
          color="#b45309"
        />

        <KPI
          icon={Users}
          label="Colaboradores con alertas"
          value={mostrarValor(
            colaboradoresConAlertas
          )}
          description="Personas únicas con seguimiento"
        />

      </div>

      {/* RESUMEN DE VENCIMIENTOS */}

      <div className="cap-panel">

        <h2>Distribución de vencimientos</h2>

        {[

          {
            label: 'Vencidos',
            value: indicadores.vencidos,
            color: '#dc2626'
          },

          {
            label: 'Críticos: 0 a 30 días',
            value: indicadores.criticos,
            color: '#ea580c'
          },

          {
            label: 'Próximos: 31 a 90 días',
            value: indicadores.proximos,
            color: '#d97706'
          },

          {
            label: 'Vigentes: más de 90 días',
            value: indicadores.vigentes,
            color: '#16a34a'
          },

          {
            label: 'Pendientes',
            value: indicadores.pendientes,
            color: '#64748b'
          }

        ].map(item => (

          <div
            key={item.label}
            style={{ marginBottom: 18 }}
          >

            <div className="cap-toolbar">

              <strong style={{ fontSize: 13 }}>

                {item.label}

              </strong>

              <span style={{

                fontWeight: 700,

                color: item.color

              }}>

                {mostrarValor(item.value)}

              </span>

            </div>

            <div style={{

              height: 10,

              marginTop: 8,

              background: '#e2e8f0',

              borderRadius: 8,

              overflow: 'hidden'

            }}>

              <div style={{

                height: '100%',

                background: item.color,

                width: `${

                  indicadores.total

                    ? item.value /
                      indicadores.total * 100

                    : 0

                }%`,

                borderRadius: 8

              }}/>

            </div>

          </div>

        ))}

        <p className="cap-muted">

          Los indicadores cuentan requisitos,
          no autorizaciones individuales.

          Un mismo colaborador puede tener
          varios requisitos próximos a vencer.

        </p>

      </div>

      {/* PRIORIDADES DE RENOVACIÓN */}

      {!loading && !error && (

        <div className="cap-panel">

          <div className="cap-toolbar">

            <h2>Prioridades de renovación</h2>

            <span className="cap-muted">

              Hasta 10 requisitos prioritarios

            </span>

          </div>

          {prioridades.length > 0 ? (

            <div className="cap-table-wrap">

              <table>

                <thead>

                  <tr>

                    <th>Prioridad</th>

                    <th>Colaborador</th>

                    <th>Riesgo crítico</th>

                    <th>Requisito</th>

                    <th>Vencimiento</th>

                    <th>Estado</th>

                    <th>Responsable</th>

                  </tr>

                </thead>

                <tbody>

                  {prioridades.map((r, index) => (

                    <tr key={

                      `${r.registro_id}-${r.requisito}-${index}`

                    }>

                      <td>

                        <strong>

                          {index + 1}

                        </strong>

                      </td>

                      <td>

                        <strong>

                          {r.colaborador}

                        </strong>

                      </td>

                      <td>

                        {r.riesgo_critico}

                      </td>

                      <td>

                        {getRequisito(r.requisito).label}

                      </td>

                      <td>

                        {formatDate(r.fecha_vencimiento)}

                        <DiasRestantes
                          value={r.dias_restantes}
                          estado={r.estado_vencimiento}
                        />

                      </td>

                      <td>

                        <Estado
                          value={r.estado_vencimiento}
                        />

                      </td>

                      <td>

                        {getResponsable(r.responsable)}

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          ) : (

            <div className="cap-welcome">

              <CalendarCheck size={42} />

              <h2>Sin alertas de vencimiento</h2>

              <p>

                No se encontraron requisitos
                vencidos o próximos a vencer
                en los registros consultados.

              </p>

              <p>

                Esto no implica que todos los
                colaboradores estén capacitados
                o autorizados.

              </p>

            </div>

          )}

        </div>

      )}

      {/* RESUMEN POR RESPONSABLE */}

      {isJefe && (

        <div className="cap-panel">

          <h2>Seguimiento por responsable</h2>

          <p className="cap-muted">

            Distribución de la carga de seguimiento
            de requisitos obligatorios.

          </p>

          <div style={{

            display: 'grid',

            gridTemplateColumns:

              'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',

            gap: 16

          }}>

            {resumenResponsables.map(r => (

              <div
                key={r.responsable}
                style={{

                  border: '1px solid #e2e8f0',

                  borderRadius: 10,

                  padding: 20

                }}
              >

                <Users size={25} color="#164b83" />

                <h3>

                  {getResponsable(r.responsable)}

                </h3>

                <div style={{

                  fontSize: 32,

                  color: '#164b83',

                  fontWeight: 700

                }}>

                  {r.requierenAtencion}

                </div>

                <div className="cap-muted">

                  Requisitos que requieren atención

                </div>

                {[

                  {
                    label: 'Vencidos',
                    value: r.vencidos,
                    color: '#b91c1c'
                  },

                  {
                    label: 'Críticos',
                    value: r.criticos,
                    color: '#c2410c'
                  },

                  {
                    label: 'Próximos a vencer',
                    value: r.proximos,
                    color: '#b45309'
                  },

                  {
                    label: 'Pendientes',
                    value: r.pendientes,
                    color: '#64748b'
                  },

                  {
                    label: 'Vigentes',
                    value: r.vigentes,
                    color: '#15803d'
                  }

                ].map(item => (

                  <div
                    className="cap-toolbar"
                    key={item.label}
                    style={{

                      padding: '10px 0',

                      borderBottom:

                        '1px solid #e2e8f0'

                    }}
                  >

                    <span className="cap-muted">

                      {item.label}

                    </span>

                    <strong style={{

                      color: item.color

                    }}>

                      {item.value}

                    </strong>

                  </div>

                ))}

                <button
                  type="button"
                  className="cap-secondary"
                  style={{ marginTop: 16 }}
                  onClick={() => {

                    cambiarTab('OBLIGATORIOS');

                    setFilterResponsable(
                      r.responsable
                    );

                    setFilterEstado(
                      'REQUIEREN_ATENCION'
                    );

                  }}
                >

                  Ver pendientes

                </button>

              </div>

            ))}

            {!resumenResponsables.length && (

              <p className="cap-muted">

                No existen vencimientos asignados
                a responsables en esta consulta.

              </p>

            )}

          </div>

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

              <Award size={28} color="#7c3aed" />

              <h2>Certificaciones adicionales</h2>

            </div>

            <span className={

              'cap-status cap-status-optional'

            }>

              INDEPENDIENTE

            </span>

          </div>

          <p className="cap-muted">

            Las certificaciones son opcionales.

            Su ausencia, vencimiento o falta de
            validación no suspende ni impide
            la autorización operativa.

          </p>

          <div className="cap-kpi-grid">

            <KPI
              icon={Award}
              label="Certificaciones válidas"
              value={mostrarValor(
                indicadoresCertificacion.validas
              )}
              color="#7c3aed"
              variant="cap-kpi-certification"
            />

            <KPI
              icon={Clock}
              label="Próximas a vencer"
              value={mostrarValor(

                indicadoresCertificacion.proximos +

                indicadoresCertificacion.criticos

              )}
              color="#7c3aed"
              variant="cap-kpi-certification"
              description="Dentro de los próximos 90 días"
            />

            <KPI
              icon={CalendarX}
              label="Certificaciones vencidas"
              value={mostrarValor(
                indicadoresCertificacion.vencidos
              )}
              color="#7c3aed"
              variant="cap-kpi-certification"
            />

            <KPI
              icon={AlertTriangle}
              label="Certificaciones no válidas"
              value={mostrarValor(
                indicadoresCertificacion.noValidos
              )}
              color="#7c3aed"
              variant="cap-kpi-certification"
            />

            <KPI
              icon={CalendarCheck}
              label="Sin vencimiento registrado"
              value={mostrarValor(
                indicadoresCertificacion.sinVencimiento
              )}
              color="#7c3aed"
              variant="cap-kpi-certification"
            />

          </div>

          <button
            type="button"
            className="cap-secondary"
            onClick={() =>

              cambiarTab('CERTIFICACIONES')

            }
          >

            <Award size={16} />

            Consultar certificaciones

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

        <button
          type="button"
          className={

            tab === 'OBLIGATORIOS'

              ? 'cap-primary'

              : 'cap-secondary'

          }
          onClick={() =>

            cambiarTab('OBLIGATORIOS')

          }
          aria-pressed={tab === 'OBLIGATORIOS'}
        >

          <ShieldCheck size={18} />

          Requisitos obligatorios

        </button>

        {canReadCertificaciones && (

          <button
            type="button"
            className={

              tab === 'CERTIFICACIONES'

                ? 'cap-primary'

                : 'cap-secondary'

            }
            onClick={() =>

              cambiarTab('CERTIFICACIONES')

            }
            aria-pressed={tab === 'CERTIFICACIONES'}
            style={

              tab === 'CERTIFICACIONES'

                ? {

                    background: '#7c3aed',

                    borderColor: '#7c3aed'

                  }

                : undefined

            }
          >

            <Award size={18} />

            Certificaciones opcionales

          </button>

        )}

      </div>

      {/* FILTROS */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>Filtros de vencimientos</h2>

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
            placeholder="Buscar colaborador o riesgo crítico..."
            aria-label="Buscar vencimientos"
            onChange={e =>
              setSearch(e.target.value)
            }
          />

        </div>

        <div className="cap-form-grid">

          <div className="cap-field">

            <label htmlFor="cap-venc-rc">

              Riesgo crítico

            </label>

            <select
              id="cap-venc-rc"
              value={filterRC}
              onChange={e =>
                setFilterRC(e.target.value)
              }
            >

              <option value="TODOS">

                Todos los riesgos críticos

              </option>

              {riesgosDisponibles.map(rc => (

                <option key={rc} value={rc}>

                  {rc}

                </option>

              ))}

            </select>

          </div>

          <div className="cap-field">

            <label htmlFor="cap-venc-requisito">

              Requisito

            </label>

            <select
              id="cap-venc-requisito"
              value={filterRequisito}
              onChange={e =>
                setFilterRequisito(e.target.value)
              }
            >

              <option value="TODOS">

                Todos los requisitos

              </option>

              {requisitosDisponibles.map(r => (

                <option key={r} value={r}>

                  {getRequisito(r).label}

                </option>

              ))}

            </select>

          </div>

          <div className="cap-field">

            <label htmlFor="cap-venc-estado">

              Estado

            </label>

            <select
              id="cap-venc-estado"
              value={filterEstado}
              onChange={e =>
                setFilterEstado(e.target.value)
              }
            >

              <option value="TODOS">

                Todos los estados

              </option>

              <option value="REQUIEREN_ATENCION">

                Requieren atención

              </option>

              <option value="VENCIDO">

                Vencidos

              </option>

              <option value="CRITICO">

                Críticos — 0 a 30 días

              </option>

              <option value="PROXIMO_A_VENCER">

                Próximos — 31 a 90 días

              </option>

              <option value="VIGENTE">

                Vigentes

              </option>

              <option value="PENDIENTE">

                Pendientes

              </option>

              {tab === 'CERTIFICACIONES' && (

                <>

                  <option value="SIN_VENCIMIENTO">

                    Sin vencimiento

                  </option>

                  <option value="CERTIFICACION_NO_VALIDA">

                    Certificación no válida

                  </option>

                </>

              )}

            </select>

          </div>

          {isJefe && (

            <div className="cap-field">

              <label htmlFor="cap-venc-responsable">

                Responsable

              </label>

              <select
                id="cap-venc-responsable"
                value={filterResponsable}
                onChange={e =>

                  setFilterResponsable(
                    e.target.value
                  )

                }
              >

                <option value="TODOS">

                  Todos los responsables

                </option>

                {responsablesDisponibles.map(r => (

                  <option key={r} value={r}>

                    {getResponsable(r)}

                  </option>

                ))}

              </select>

            </div>

          )}

          <div className="cap-field">

            <label htmlFor="cap-venc-orden">

              Ordenar por

            </label>

            <select
              id="cap-venc-orden"
              value={orden}
              onChange={e =>
                setOrden(e.target.value)
              }
            >

              <option value="PRIORIDAD">

                Prioridad de seguimiento

              </option>

              <option value="VENCIMIENTO">

                Fecha de vencimiento

              </option>

              <option value="COLABORADOR">

                Nombre del colaborador

              </option>

              <option value="RIESGO_CRITICO">

                Riesgo crítico

              </option>

            </select>

          </div>

        </div>

      </div>

      {/* TABLA PRINCIPAL */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>

            {tab === 'CERTIFICACIONES'

              ? 'Vencimientos de certificaciones'

              : 'Vencimientos de requisitos obligatorios'}

          </h2>

          <span className="cap-muted">

            {filtered.length}

            {' de '}

            {registrosTab.length}

            {' registros'}

          </span>

        </div>

        {tab === 'CERTIFICACIONES' && (

          <div className="cap-alert-info">

            Los estados de esta pestaña corresponden
            exclusivamente al seguimiento
            de certificaciones adicionales.

            No representan restricciones
            de autorización operativa.

          </div>

        )}

        {loading ? (

          <div
            className="cap-welcome"
            role="status"
          >

            <RefreshCw size={32} />

            <p>Cargando vencimientos...</p>

          </div>

        ) : (

          <div className="cap-table-wrap">

            <table>

              <thead>

                <tr>

                  <th>Colaborador</th>

                  <th>Riesgo crítico</th>

                  <th>Requisito</th>

                  <th>Realización</th>

                  <th>Vencimiento</th>

                  <th>Días restantes</th>

                  <th>Estado</th>

                  <th>Responsable</th>

                </tr>

              </thead>

              <tbody>

                {filtered.map((r, index) => {

                  const requisito =
                    getRequisito(r.requisito);

                  const Icon = requisito.icon;

                  const optional =
                    isCertification(r);

                  return (

                    <tr key={

                      `${r.registro_id}-${r.requisito}-${index}`

                    }>

                      <td>

                        <strong>

                          {r.colaborador}

                        </strong>

                      </td>

                      <td>

                        {r.riesgo_critico}

                      </td>

                      <td>

                        <div style={{

                          display: 'flex',

                          alignItems: 'center',

                          gap: 8

                        }}>

                          <Icon
                            size={17}
                            color={

                              optional

                                ? '#7c3aed'

                                : '#164b83'

                            }
                          />

                          {requisito.label}

                        </div>

                      </td>

                      <td>

                        {formatDate(r.fecha_realizacion)}

                      </td>

                      <td>

                        {formatDate(r.fecha_vencimiento)}

                      </td>

                      <td>

                        <DiasRestantes
                          value={r.dias_restantes}
                          estado={r.estado_vencimiento}
                          optional={optional}
                        />

                      </td>

                      <td>

                        <Estado
                          value={r.estado_vencimiento}
                          optional={optional}
                        />

                      </td>

                      <td>

                        {getResponsable(r.responsable)}

                      </td>

                    </tr>

                  );

                })}

                {filtered.length === 0 && (

                  <tr>

                    <td
                      className="cap-empty"
                      colSpan={8}
                    >

                      No se encontraron vencimientos
                      para los filtros seleccionados.

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        )}

        <p className="cap-muted">

          Los estados y días restantes son
          proporcionados por Supabase al momento
          de realizar la consulta.

          Actualiza la información antes de
          tomar decisiones operativas.

        </p>

      </div>

      {/* RESUMEN POR RIESGO CRÍTICO */}

      <div className="cap-panel">

        <h2>Vencimientos por riesgo crítico</h2>

        <p className="cap-muted">

          Resumen de requisitos obligatorios
          visibles para el perfil actual.

        </p>

        <div className="cap-table-wrap">

          <table>

            <thead>

              <tr>

                <th>Riesgo crítico</th>

                <th>Vigentes</th>

                <th>31 a 90 días</th>

                <th>0 a 30 días</th>

                <th>Vencidos</th>

                <th>Pendientes</th>

              </tr>

            </thead>

            <tbody>

              {resumenRC.map(r => (

                <tr key={r.riesgo}>

                  <td>

                    <strong>{r.riesgo}</strong>

                  </td>

                  <td style={{ color: '#15803d' }}>

                    {r.vigentes}

                  </td>

                  <td style={{ color: '#b45309' }}>

                    {r.proximos}

                  </td>

                  <td style={{ color: '#c2410c' }}>

                    {r.criticos}

                  </td>

                  <td style={{

                    color: '#b91c1c',

                    fontWeight: 700

                  }}>

                    {r.vencidos}

                  </td>

                  <td>

                    {r.pendientes}

                  </td>

                </tr>

              ))}

              {!resumenRC.length && (

                <tr>

                  <td
                    colSpan={6}
                    className="cap-empty"
                  >

                    No existen registros
                    para resumir.

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* ALCANCE DEL MÓDULO */}

      <div className="cap-alert-info">

        <ShieldAlert size={19} />

        {' '}

        <strong>

          Control preventivo de vencimientos

        </strong>

        <p>

          Este módulo consulta los registros
          disponibles desde cap_consultar_vencimientos.

          Las renovaciones se registran desde
          los módulos de capacitación.

          La autorización definitiva se determina
          mediante el motor de seguridad de Supabase.

        </p>

      </div>

    </div>

  );

}
