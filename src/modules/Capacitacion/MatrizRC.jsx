
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';

import {
  ShieldCheck,
  ShieldAlert,
  Users,
  ClipboardCheck,
  Clock,
  Percent,
  Award,
  Search,
  RefreshCw,
  Download,
  X,
  Info
} from 'lucide-react';

import * as XLSX from 'xlsx';

import './capacitacion.css';

// ==========================================
// CONFIGURACIÓN DE ESTADOS
// ==========================================

const ESTADOS = {

  AUTORIZADO: {
    symbol: 'A',
    label: 'Autorizado',
    bg: '#dcfce7',
    color: '#166534'
  },

  PROXIMO_A_VENCER: {
    symbol: '90',
    label: 'Próximo a vencer',
    bg: '#fef3c7',
    color: '#92400e'
  },

  CRITICO: {
    symbol: '30',
    label: 'Vencimiento crítico',
    bg: '#ffedd5',
    color: '#9a3412'
  },

  REQUISITOS_PENDIENTES: {
    symbol: 'P',
    label: 'Requisitos pendientes',
    bg: '#dbeafe',
    color: '#1d4ed8'
  },

  REQUISITOS_INCOMPLETOS: {
    symbol: '!',
    label: 'Requisitos incompletos',
    bg: '#fee2e2',
    color: '#991b1b'
  },

  PENDIENTE_VOBO: {
    symbol: 'V',
    label: 'Pendiente de VoBo',
    bg: '#fef3c7',
    color: '#92400e'
  },

  VENCIDO: {
    symbol: 'X',
    label: 'Vencido',
    bg: '#fee2e2',
    color: '#991b1b'
  },

  SUSPENDIDO: {
    symbol: 'S',
    label: 'Suspendido',
    bg: '#fee2e2',
    color: '#991b1b'
  },

  REVOCADO: {
    symbol: 'R',
    label: 'Revocado',
    bg: '#fecaca',
    color: '#991b1b'
  },

  DEVUELTO: {
    symbol: 'D',
    label: 'Devuelto',
    bg: '#ffedd5',
    color: '#9a3412'
  },

  NO_AUTORIZADO: {
    symbol: 'N',
    label: 'No autorizado',
    bg: '#fee2e2',
    color: '#991b1b'
  },

  SIN_AUTORIZACION: {
    symbol: 'N',
    label: 'Sin autorización',
    bg: '#f1f5f9',
    color: '#64748b'
  },

  SIN_ASIGNACION: {
    symbol: '—',
    label: 'Sin asignación',
    bg: '#f1f5f9',
    color: '#64748b'
  },

  NO_APLICA: {
    symbol: 'N/A',
    label: 'No aplica',
    bg: '#f8fafc',
    color: '#94a3b8'
  },

  NO_REQUIERE_AUTORIZACION: {
    symbol: 'N/R',
    label: 'No requiere autorización',
    bg: '#f8fafc',
    color: '#64748b'
  },

  INACTIVO: {
    symbol: 'I',
    label: 'Inactivo',
    bg: '#e2e8f0',
    color: '#64748b'
  },

  NO_DISPONIBLE: {
    symbol: '?',
    label: 'Información no disponible',
    bg: '#f1f5f9',
    color: '#64748b'
  }

};

const LEYENDA = [
  'AUTORIZADO',
  'PROXIMO_A_VENCER',
  'CRITICO',
  'REQUISITOS_PENDIENTES',
  'PENDIENTE_VOBO',
  'REQUISITOS_INCOMPLETOS',
  'VENCIDO',
  'SUSPENDIDO',
  'REVOCADO',
  'DEVUELTO',
  'NO_AUTORIZADO',
  'SIN_AUTORIZACION',
  'SIN_ASIGNACION',
  'NO_APLICA',
  'NO_REQUIERE_AUTORIZACION',
  'INACTIVO'
];

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

function getEstado(value) {

  return ESTADOS[value] || {

    symbol: '?',

    label: String(
      value || 'NO_DISPONIBLE'
    ).replaceAll('_', ' '),

    bg: '#f1f5f9',

    color: '#64748b'

  };

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

function porcentaje(numerador, denominador) {

  if (!denominador) return null;

  return Math.round(
    (numerador / denominador) * 1000
  ) / 10;

}

function formatPercent(value) {

  return value === null

    ? 'N/A'

    : `${value.toFixed(1)}%`;

}

function percentColor(value) {

  if (value === null) return '#64748b';

  if (value >= 100) return '#15803d';

  if (value >= 75) return '#164b83';

  if (value >= 50) return '#b45309';

  return '#b91c1c';

}

function esAplicable(registro) {

  return Boolean(

    registro?.asignacion_id &&

    registro.aplica === true &&

    ![
      'INACTIVO',
      'NO_APLICA',
      'SIN_ASIGNACION',
      'NO_REQUIERE_AUTORIZACION'
    ].includes(registro.estado)

  );

}

function calcularCobertura(registros) {

  const aplicables = registros.filter(
    esAplicable
  );

  const autorizados = aplicables.filter(
    r => r.autorizado === true
  ).length;

  return {

    aplicables: aplicables.length,

    autorizados,

    pendientes:
      aplicables.length - autorizados,

    porcentaje: porcentaje(
      autorizados,
      aplicables.length
    )

  };

}

function textValue(value) {

  const text = String(value ?? '');

  return /^[=+\-@\t\r]/.test(text)

    ? "'" + text

    : text;

}

// ==========================================
// COMPONENTES VISUALES
// ==========================================

function EstadoCell({
  registro,
  onClick,
  label
}) {

  const estado =
    registro?.estado || 'NO_DISPONIBLE';

  const config = getEstado(estado);

  return (

    <button
      type="button"
      title={`${label}: ${config.label}`}
      aria-label={`${label}: ${config.label}`}
      onClick={onClick}
      style={{

        width: '100%',

        minWidth: 65,

        minHeight: 44,

        display: 'flex',

        alignItems: 'center',

        justifyContent: 'center',

        flexDirection: 'column',

        gap: 3,

        border: '1px solid rgba(0,0,0,0.05)',

        borderRadius: 6,

        background: config.bg,

        color: config.color,

        fontWeight: 700,

        fontFamily: 'inherit',

        cursor: 'pointer'

      }}
    >

      <span style={{ fontSize: 14 }}>

        {config.symbol}

      </span>

      {registro?.autorizado === true && (

        <span style={{ fontSize: 9 }}>

          AUTORIZADO

        </span>

      )}

    </button>

  );

}

function Estado({
  value,
  optional = false
}) {

  const config = getEstado(value);

  return (

    <span style={{

      display: 'inline-block',

      padding: '6px 10px',

      borderRadius: 6,

      fontSize: 11,

      fontWeight: 700,

      background: optional
        ? '#ede9fe'
        : config.bg,

      color: optional
        ? '#6d28d9'
        : config.color

    }}>

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
// COMPONENTE PRINCIPAL
// ==========================================

export default function MatrizRC({
  client,
  role
}) {

  const canReadVencimientos = [
    'JEFE_PRODUCCION',
    'ING_PROCESOS',
    'GESTOR_RC'
  ].includes(role);

  const canReadCertificaciones = [
    'JEFE_PRODUCCION',
    'GESTOR_RC'
  ].includes(role);

  const [matriz, setMatriz] =
    useState([]);

  const [catalogoRC, setCatalogoRC] =
    useState([]);

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

  const [search, setSearch] =
    useState('');

  const [filterRC, setFilterRC] =
    useState('TODOS');

  const [filterEstado, setFilterEstado] =
    useState('TODOS');

  const [soloAsignados, setSoloAsignados] =
    useState(false);

  const [orden, setOrden] =
    useState('NOMBRE');

  const [selected, setSelected] =
    useState(null);

  // ==========================================
  // CONSULTAR DATOS DE SUPABASE
  // ==========================================

  const cargarDatos = useCallback(async () => {

    if (!client || !role) {

      setLoading(false);
      return;

    }

    setLoading(true);
    setError('');
    setWarning('');
    setSelected(null);
    setVencimientos([]);

    try {

      const [
        matrizResponse,
        riesgosResponse
      ] = await Promise.all([

        client.rpc('cap_matriz_rc'),

        client
          .from('cap_riesgos_criticos')
          .select(`
            id,
            codigo,
            nombre,
            abreviatura,
            orden,
            activo,
            requiere_autorizacion
          `)
          .eq('activo', true)
          .order('orden')
          .order('codigo')

      ]);

      if (matrizResponse.error) {

        throw matrizResponse.error;

      }

      if (riesgosResponse.error) {

        throw riesgosResponse.error;

      }

      setMatriz(
        matrizResponse.data || []
      );

      setCatalogoRC(
        riesgosResponse.data || []
      );

      // Los vencimientos se consultan
      // según los permisos del perfil.

      if (canReadVencimientos) {

        try {

          const { data, error } =
            await client.rpc(
              'cap_consultar_vencimientos'
            );

          if (error) throw error;

          setVencimientos(data || []);

        } catch (err) {

          setVencimientos([]);

          setWarning(

            'La matriz operativa fue cargada, ' +
            'pero no se pudieron consultar ' +
            'los vencimientos adicionales.'

          );

        }

      }

    } catch (err) {

      setMatriz([]);
      setCatalogoRC([]);
      setVencimientos([]);

      setError(
        'No fue posible consultar la matriz RC: ' +
        err.message
      );

    } finally {

      setLoading(false);

    }

  }, [
    client,
    role,
    canReadVencimientos
  ]);

  useEffect(() => {

    setMatriz([]);
    setCatalogoRC([]);
    setVencimientos([]);
    setSelected(null);
    setSuccess('');

    cargarDatos();

  }, [cargarDatos]);

  // ==========================================
  // COLABORADORES
  // ==========================================

  const colaboradores = useMemo(() => {

    const map = new Map();

    matriz.forEach(r => {

      if (!map.has(r.colaborador_id)) {

        map.set(r.colaborador_id, {

          id: r.colaborador_id,

          nombre: r.colaborador,

          puesto: r.puesto

        });

      }

    });

    return [...map.values()].sort(
      (a, b) =>
        a.nombre.localeCompare(b.nombre, 'es')
    );

  }, [matriz]);

  // ==========================================
  // CATÁLOGO DE RIESGOS CRÍTICOS
  // ==========================================

  const riesgos = useMemo(() => {

    const map = new Map();

    catalogoRC.forEach(rc => {

      map.set(rc.id, rc);

    });

    matriz.forEach(r => {

      if (!map.has(r.riesgo_critico_id)) {

        map.set(r.riesgo_critico_id, {

          id: r.riesgo_critico_id,

          codigo: '',

          nombre: r.riesgo_critico,

          abreviatura: r.abreviatura,

          orden: 999

        });

      }

    });

    return [...map.values()].sort(
      (a, b) =>

        Number(a.orden ?? 999) -
        Number(b.orden ?? 999) ||

        a.nombre.localeCompare(
          b.nombre, 'es'
        )

    );

  }, [catalogoRC, matriz]);

  // ==========================================
  // MAPA DE COMBINACIONES
  // ==========================================

  const matrizMap = useMemo(() => {

    return new Map(

      matriz.map(r => [

        `${r.colaborador_id}-${r.riesgo_critico_id}`,

        r

      ])

    );

  }, [matriz]);

  // ==========================================
  // INDICADORES GENERALES
  // ==========================================

  const indicadores = useMemo(() => {

    const cobertura =
      calcularCobertura(matriz);

    const aplicables =
      matriz.filter(esAplicable);

    return {

      colaboradores:
        colaboradores.length,

      riesgos:
        riesgos.length,

      asignaciones:
        cobertura.aplicables,

      autorizados:
        cobertura.autorizados,

      pendientes:
        cobertura.pendientes,

      cumplimiento:
        cobertura.porcentaje,

      pendientesVoBo:

        aplicables.filter(
          r => r.estado === 'PENDIENTE_VOBO'
        ).length,

      proximosVencer:

        aplicables.filter(
          r =>

            r.autorizado === true &&

            [
              'PROXIMO_A_VENCER',
              'CRITICO'
            ].includes(r.estado)

        ).length,

      vencidos:

        aplicables.filter(
          r => r.estado === 'VENCIDO'
        ).length,

      suspendidos:

        aplicables.filter(
          r => r.estado === 'SUSPENDIDO'
        ).length,

      sinAsignar:

        matriz.filter(
          r => !r.asignacion_id
        ).length

    };

  }, [matriz, colaboradores, riesgos]);

  // ==========================================
  // INDICADORES DE CERTIFICACIÓN
  // ==========================================

  const indicadoresCertificacion = useMemo(() => {

    const certificaciones = vencimientos.filter(

      v => v.requisito === 'CERTIFICACION'

    );

    const validas = certificaciones.filter(v =>

      [
        'VIGENTE',
        'CRITICO',
        'PROXIMO_A_VENCER',
        'SIN_VENCIMIENTO'
      ].includes(v.estado_vencimiento)

    );

    return {

      registradas: certificaciones.length,

      validas: validas.length,

      vencidas: certificaciones.filter(

        v => v.estado_vencimiento === 'VENCIDO'

      ).length,

      cobertura: porcentaje(

        validas.length,

        indicadores.asignaciones

      )

    };

  }, [
    vencimientos,
    indicadores.asignaciones
  ]);

  // ==========================================
  // FILTRAR RIESGOS CRÍTICOS
  // ==========================================

  const riesgosFiltrados = useMemo(() => {

    return riesgos.filter(rc =>

      filterRC === 'TODOS' ||

      rc.id === filterRC

    );

  }, [riesgos, filterRC]);

  // ==========================================
  // COBERTURA POR COLABORADOR
  // ==========================================

  const coberturaColaborador = useMemo(() => {

    const map = new Map();

    colaboradores.forEach(c => {

      const registros = riesgosFiltrados

        .map(rc =>

          matrizMap.get(

            `${c.id}-${rc.id}`

          )

        )

        .filter(Boolean);

      map.set(

        c.id,

        calcularCobertura(registros)

      );

    });

    return map;

  }, [
    colaboradores,
    riesgosFiltrados,
    matrizMap
  ]);

  // ==========================================
  // FILTRAR COLABORADORES
  // ==========================================

  const colaboradoresFiltrados = useMemo(() => {

    const term = normalize(search);

    const resultados = colaboradores.filter(c => {

      if (

        term &&

        ![
          c.nombre,
          c.puesto
        ].some(value =>

          normalize(value).includes(term)

        )

      ) {

        return false;

      }

      const registros = riesgosFiltrados

        .map(rc =>

          matrizMap.get(`${c.id}-${rc.id}`)

        )

        .filter(Boolean);

      if (

        soloAsignados &&

        !registros.some(esAplicable)

      ) {

        return false;

      }

      if (

        filterEstado === 'AUTORIZADOS' &&

        !registros.some(
          r => esAplicable(r) && r.autorizado
        )

      ) {

        return false;

      }

      if (

        filterEstado === 'NO_AUTORIZADOS' &&

        !registros.some(
          r => esAplicable(r) && !r.autorizado
        )

      ) {

        return false;

      }

      if (

        ![
          'TODOS',
          'AUTORIZADOS',
          'NO_AUTORIZADOS'
        ].includes(filterEstado) &&

        !registros.some(
          r => r.estado === filterEstado
        )

      ) {

        return false;

      }

      return true;

    });

    return resultados.sort((a, b) => {

      const coberturaA =
        coberturaColaborador.get(a.id)
          ?.porcentaje;

      const coberturaB =
        coberturaColaborador.get(b.id)
          ?.porcentaje;

      // Colaboradores sin riesgos aplicables
      // se colocan al final de los rankings.

      if (orden !== 'NOMBRE') {

        if (
          coberturaA === null &&
          coberturaB !== null
        ) return 1;

        if (
          coberturaB === null &&
          coberturaA !== null
        ) return -1;

      }

      if (orden === 'MAYOR_COBERTURA') {

        return (

          (coberturaB ?? 0) -
          (coberturaA ?? 0)

        ) || a.nombre.localeCompare(
          b.nombre, 'es'
        );

      }

      if (orden === 'MENOR_COBERTURA') {

        return (

          (coberturaA ?? 0) -
          (coberturaB ?? 0)

        ) || a.nombre.localeCompare(
          b.nombre, 'es'
        );

      }

      return a.nombre.localeCompare(
        b.nombre, 'es'
      );

    });

  }, [
    colaboradores,
    riesgosFiltrados,
    matrizMap,
    coberturaColaborador,
    search,
    filterEstado,
    soloAsignados,
    orden
  ]);

  // ==========================================
  // COBERTURA POR RIESGO CRÍTICO
  // ==========================================

  const coberturaRC = useMemo(() => {

    const map = new Map();

    riesgos.forEach(rc => {

      const registros = matriz.filter(

        r => r.riesgo_critico_id === rc.id

      );

      map.set(

        rc.id,

        calcularCobertura(registros)

      );

    });

    return map;

  }, [riesgos, matriz]);

  // ==========================================
  // DETALLE DE UNA COMBINACIÓN
  // ==========================================

  function mostrarDetalle(colaborador, riesgo) {

    const registro = matrizMap.get(

      `${colaborador.id}-${riesgo.id}`

    );

    setSelected({

      colaborador,

      riesgo,

      registro

    });

  }

  const vencimientosDetalle = useMemo(() => {

    if (

      !canReadVencimientos ||

      !selected?.registro?.asignacion_id

    ) {

      return [];

    }

    return vencimientos.filter(v =>

      v.asignacion_id ===
        selected.registro.asignacion_id &&

      v.requisito !== 'CERTIFICACION'

    );

  }, [
    selected,
    vencimientos,
    canReadVencimientos
  ]);

  const certificacionDetalle = useMemo(() => {

    if (

      !canReadCertificaciones ||

      !selected?.registro?.asignacion_id

    ) {

      return null;

    }

    return vencimientos.find(v =>

      v.asignacion_id ===
        selected.registro.asignacion_id &&

      v.requisito === 'CERTIFICACION'

    ) || null;

  }, [
    selected,
    vencimientos,
    canReadCertificaciones
  ]);

  // ==========================================
  // LIMPIAR FILTROS
  // ==========================================

  function limpiarFiltros() {

    setSearch('');
    setFilterRC('TODOS');
    setFilterEstado('TODOS');
    setSoloAsignados(false);
    setOrden('NOMBRE');
    setSelected(null);

  }

  function coincideFiltro(registro) {

    if (filterEstado === 'TODOS') {

      return true;

    }

    if (filterEstado === 'AUTORIZADOS') {

      return esAplicable(registro) &&
        registro.autorizado === true;

    }

    if (filterEstado === 'NO_AUTORIZADOS') {

      return esAplicable(registro) &&
        registro.autorizado !== true;

    }

    return registro?.estado === filterEstado;

  }

  // ==========================================
  // EXPORTACIÓN A EXCEL
  // ==========================================

  function exportarExcel() {

    if (

      loading ||

      exporting ||

      error ||

      !colaboradoresFiltrados.length ||

      !riesgosFiltrados.length

    ) {

      return;

    }

    setExporting(true);
    setError('');
    setSuccess('');

    try {

      const wb = XLSX.utils.book_new();

      // ======================================
      // HOJA 1: MATRIZ DE RIESGOS CRÍTICOS
      // ======================================

      const headers = [

        'Colaborador',

        'Puesto',

        ...riesgosFiltrados.map(
          rc => textValue(rc.nombre)
        ),

        'RC aplicables',

        'RC autorizados',

        'RC sin autorización',

        'Cumplimiento'

      ];

      const rows = colaboradoresFiltrados.map(c => {

        const cobertura =
          coberturaColaborador.get(c.id);

        return [

          textValue(c.nombre),

          textValue(c.puesto),

          ...riesgosFiltrados.map(rc => {

            const registro = matrizMap.get(

              `${c.id}-${rc.id}`

            );

            return getEstado(
              registro?.estado
            ).label;

          }),

          cobertura?.aplicables ?? 0,

          cobertura?.autorizados ?? 0,

          cobertura?.pendientes ?? 0,

          cobertura?.porcentaje == null

            ? 'N/A'

            : cobertura.porcentaje / 100

        ];

      });

      const ws = XLSX.utils.aoa_to_sheet([

        headers,

        ...rows

      ]);

      ws['!cols'] = [

        { wch: 38 },

        { wch: 28 },

        ...riesgosFiltrados.map(
          () => ({ wch: 32 })
        ),

        { wch: 17 },

        { wch: 17 },

        { wch: 23 },

        { wch: 17 }

      ];

      ws['!autofilter'] = {

        ref: ws['!ref']

      };

      for (let r = 1; r <= rows.length; r++) {

        const address =
          XLSX.utils.encode_cell({

            r,

            c: headers.length - 1

          });

        if (ws[address]?.t === 'n') {

          ws[address].z = '0.0%';

        }

      }

      XLSX.utils.book_append_sheet(

        wb,

        ws,

        'Matriz RC'

      );

      // ======================================
      // HOJA 2: RESUMEN POR RIESGO CRÍTICO
      // ======================================

      const resumen = [

        [

          'Código',

          'Riesgo crítico',

          'Abreviatura',

          'Asignaciones aplicables',

          'Autorizados',

          'Sin autorización',

          'Cumplimiento'

        ],

        ...riesgosFiltrados.map(rc => {

          const cobertura =
            coberturaRC.get(rc.id);

          return [

            textValue(rc.codigo),

            textValue(rc.nombre),

            textValue(rc.abreviatura),

            cobertura?.aplicables ?? 0,

            cobertura?.autorizados ?? 0,

            cobertura?.pendientes ?? 0,

            cobertura?.porcentaje == null

              ? 'N/A'

              : cobertura.porcentaje / 100

          ];

        })

      ];

      const wsResumen =
        XLSX.utils.aoa_to_sheet(resumen);

      wsResumen['!cols'] = [

        { wch: 15 },

        { wch: 45 },

        { wch: 15 },

        { wch: 24 },

        { wch: 17 },

        { wch: 20 },

        { wch: 17 }

      ];

      for (

        let r = 1;

        r < resumen.length;

        r++

      ) {

        const address =
          XLSX.utils.encode_cell({

            r,

            c: 6

          });

        if (wsResumen[address]?.t === 'n') {

          wsResumen[address].z = '0.0%';

        }

      }

      wsResumen['!autofilter'] = {

        ref: wsResumen['!ref']

      };

      XLSX.utils.book_append_sheet(

        wb,

        wsResumen,

        'Resumen por RC'

      );

      // ======================================
      // HOJA 3: DETALLE DE COMBINACIONES
      // ======================================

      const detalle = [

        [

          'Colaborador',

          'Puesto',

          'Riesgo crítico',

          'Asignado',

          'Aplica',

          'Estado operativo',

          'Autorizado'

        ]

      ];

      colaboradoresFiltrados.forEach(c => {

        riesgosFiltrados.forEach(rc => {

          const registro = matrizMap.get(

            `${c.id}-${rc.id}`

          );

          if (!coincideFiltro(registro)) {

            return;

          }

          detalle.push([

            textValue(c.nombre),

            textValue(c.puesto),

            textValue(rc.nombre),

            registro

              ? registro.asignacion_id
                ? 'SÍ'
                : 'NO'

              : 'NO DISPONIBLE',

            registro?.asignacion_id

              ? registro.aplica
                ? 'SÍ'
                : 'NO'

              : 'N/A',

            textValue(

              registro?.estado ||
              'NO_DISPONIBLE'

            ),

            registro

              ? registro.autorizado === true

                ? 'SÍ'

                : 'NO'

              : 'NO DISPONIBLE'

          ]);

        });

      });

      const wsDetalle =
        XLSX.utils.aoa_to_sheet(detalle);

      wsDetalle['!cols'] = [

        { wch: 38 },

        { wch: 28 },

        { wch: 45 },

        { wch: 20 },

        { wch: 12 },

        { wch: 32 },

        { wch: 20 }

      ];

      wsDetalle['!autofilter'] = {

        ref: wsDetalle['!ref']

      };

      XLSX.utils.book_append_sheet(

        wb,

        wsDetalle,

        'Detalle RC'

      );

      // ======================================
      // HOJA 4: INDICADORES GENERALES
      // ======================================

      const general = [

        ['TRANSMETAL'],

        ['MATRIZ DE RIESGOS CRÍTICOS'],

        ['Fecha de consulta', fechaGuatemala()],

        [],

        ['Indicador', 'Valor'],

        ['Colaboradores', indicadores.colaboradores],

        ['Riesgos críticos', indicadores.riesgos],

        [
          'Asignaciones aplicables',
          indicadores.asignaciones
        ],

        [
          'Autorizaciones operativas',
          indicadores.autorizados
        ],

        [
          'Sin autorización',
          indicadores.pendientes
        ],

        [
          'Cumplimiento general',

          indicadores.cumplimiento === null

            ? 'N/A'

            : indicadores.cumplimiento / 100

        ],

        [
          'Pendientes de VoBo',
          indicadores.pendientesVoBo
        ],

        [
          'Autorizaciones próximas a vencer',
          indicadores.proximosVencer
        ],

        ['Vencidos', indicadores.vencidos],

        ['Suspendidos', indicadores.suspendidos],

        ['Sin asignación', indicadores.sinAsignar],

        [],

        ['Filtros aplicados'],

        ['Búsqueda', textValue(search)],

        ['Estado', textValue(filterEstado)],

        [
          'Riesgo crítico',

          filterRC === 'TODOS'

            ? 'TODOS'

            : textValue(
                riesgos.find(
                  rc => rc.id === filterRC
                )?.nombre
              )

        ],

        [
          'Solo asignaciones aplicables',
          soloAsignados ? 'SÍ' : 'NO'
        ],

        [],

        [
          'Nota',
          'La matriz conserva los estados de todos ' +
          'los RC visibles de cada colaborador filtrado.'
        ],

        [
          'Nota',
          'El detalle RC incluye únicamente las ' +
          'combinaciones que coinciden con el filtro.'
        ],

        [
          'Nota',
          'Los indicadores generales corresponden ' +
          'a toda la información consultada.'
        ],

        [
          'Nota',
          'Las certificaciones son independientes ' +
          'de la autorización operativa.'
        ],

        [
          'Nota',
          'Este archivo es una fotografía de la ' +
          'consulta y no una autorización de trabajo.'
        ]

      ];

      const wsGeneral =
        XLSX.utils.aoa_to_sheet(general);

      wsGeneral['!cols'] = [

        { wch: 42 },

        { wch: 100 }

      ];

      if (wsGeneral.B11?.t === 'n') {

        wsGeneral.B11.z = '0.0%';

      }

      XLSX.utils.book_append_sheet(

        wb,

        wsGeneral,

        'Indicadores'

      );

      // ======================================
      // DESCARGAR ARCHIVO
      // ======================================

      XLSX.writeFile(

        wb,

        `Matriz_RC_Transmetal_${fechaGuatemala()}.xlsx`

      );

      setSuccess(

        'Archivo Excel generado correctamente.'

      );

    } catch (err) {

      setError(

        'No fue posible exportar la matriz: ' +
        err.message

      );

    } finally {

      setExporting(false);

    }

  }

  // ==========================================
  // VALIDAR SESIÓN
  // ==========================================

  if (!client || !role) {

    return (

      <div className="cap-alert-warning">

        No hay una sesión autorizada
        de capacitación.

      </div>

    );

  }

  const borderCell = '1px solid #e2e8f0';

  const stickyHeaderStyle = {

    position: 'sticky',

    top: 0,

    zIndex: 4,

    background: '#164b83',

    color: '#ffffff'

  };

  const stickyNameStyle = {

    position: 'sticky',

    left: 0,

    zIndex: 3,

    minWidth: 240,

    background: '#ffffff',

    borderRight: borderCell

  };

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (

    <div className="cap-matriz-rc">

      {/* ENCABEZADO */}

      <div className="cap-panel cap-toolbar">

        <div>

          <h2>Matriz de riesgos críticos</h2>

          <p className="cap-muted">

            Asignaciones, autorizaciones y
            cumplimiento de requisitos de seguridad.

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

              !colaboradoresFiltrados.length ||

              !riesgosFiltrados.length

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

        <div className="cap-alert-success" role="status">

          {success}

        </div>

      )}

      {/* INDICADORES */}

      <div className="cap-kpi-grid">

        <KPI
          icon={Users}
          label="Colaboradores"
          value={
            loading || error
              ? '—'
              : indicadores.colaboradores
          }
          description="Personal incluido en la matriz"
        />

        <KPI
          icon={ClipboardCheck}
          label="Asignaciones aplicables"
          value={
            loading || error
              ? '—'
              : indicadores.asignaciones
          }
          description="Combinaciones colaborador - RC"
        />

        <KPI
          icon={ShieldCheck}
          label="Autorizaciones vigentes"
          value={
            loading || error
              ? '—'
              : indicadores.autorizados
          }
          description="Incluye autorizaciones próximas a vencer"
          variant="cap-kpi-success"
          color="#15803d"
        />

        <KPI
          icon={Percent}
          label="Cumplimiento general"
          value={
            loading || error
              ? '—'
              : formatPercent(
                  indicadores.cumplimiento
                )
          }
          description="Autorizados / aplicables"
          color={
            percentColor(
              indicadores.cumplimiento
            )
          }
        />

        <KPI
          icon={Clock}
          label="Próximos a vencer"
          value={
            loading || error
              ? '—'
              : indicadores.proximosVencer
          }
          description="Autorizaciones vigentes con alerta"
          variant="cap-kpi-warning"
          color="#b45309"
        />

        <KPI
          icon={ShieldAlert}
          label="Sin autorización"
          value={
            loading || error
              ? '—'
              : indicadores.pendientes
          }
          description="Asignaciones aplicables sin permiso"
          variant="cap-kpi-danger"
          color="#b91c1c"
        />

      </div>

      {/* CERTIFICACIONES ADICIONALES */}

      {canReadCertificaciones && (

        <div className="cap-panel">

          <div className="cap-toolbar">

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>

              <Award size={26} color="#7c3aed" />

              <h2>Certificaciones adicionales</h2>

            </div>

            <span className={
              'cap-status cap-status-optional'
            }>

              INDICADOR INDEPENDIENTE

            </span>

          </div>

          <p className="cap-muted">

            Las certificaciones no condicionan
            las autorizaciones operativas.

          </p>

          <div className="cap-kpi-grid">

            <KPI
              icon={Award}
              label="Certificaciones registradas"
              value={
                loading || warning || error
                  ? '—'
                  : indicadoresCertificacion.registradas
              }
              variant="cap-kpi-certification"
              color="#7c3aed"
              description="Última certificación por asignación"
            />

            <KPI
              icon={ShieldCheck}
              label="Certificaciones válidas"
              value={
                loading || warning || error
                  ? '—'
                  : indicadoresCertificacion.validas
              }
              variant="cap-kpi-certification"
              color="#7c3aed"
              description="Según consulta de Supabase"
            />

            <KPI
              icon={Clock}
              label="Certificaciones vencidas"
              value={
                loading || warning || error
                  ? '—'
                  : indicadoresCertificacion.vencidas
              }
              variant="cap-kpi-certification"
              color="#7c3aed"
              description="No afecta la autorización"
            />

            <KPI
              icon={Percent}
              label="Cobertura de certificación"
              value={
                loading || warning || error

                  ? '—'

                  : formatPercent(
                      indicadoresCertificacion.cobertura
                    )
              }
              variant="cap-kpi-certification"
              color="#7c3aed"
              description="Certificaciones válidas / asignaciones aplicables"
            />

          </div>

        </div>

      )}

      {/* FILTROS */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>Filtros de la matriz</h2>

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
            aria-label="Buscar colaboradores"
            placeholder="Buscar colaborador o puesto..."
            onChange={e =>
              setSearch(e.target.value)
            }
          />

        </div>

        <div className="cap-form-grid">

          <div className="cap-field">

            <label htmlFor="cap-mrc-riesgo">

              Riesgo crítico

            </label>

            <select
              id="cap-mrc-riesgo"
              value={filterRC}
              onChange={e =>
                setFilterRC(e.target.value)
              }
            >

              <option value="TODOS">

                Todos los riesgos críticos

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

          <div className="cap-field">

            <label htmlFor="cap-mrc-estado">

              Estado operativo

            </label>

            <select
              id="cap-mrc-estado"
              value={filterEstado}
              onChange={e =>
                setFilterEstado(e.target.value)
              }
            >

              <option value="TODOS">

                Todos los estados

              </option>

              <option value="AUTORIZADOS">

                Todas las autorizaciones vigentes

              </option>

              <option value="NO_AUTORIZADOS">

                Asignados sin autorización

              </option>

              {LEYENDA.map(value => (

                <option
                  key={value}
                  value={value}
                >

                  {getEstado(value).label}

                </option>

              ))}

            </select>

          </div>

          <div className="cap-field">

            <label htmlFor="cap-mrc-orden">

              Ordenar colaboradores

            </label>

            <select
              id="cap-mrc-orden"
              value={orden}
              onChange={e =>
                setOrden(e.target.value)
              }
            >

              <option value="NOMBRE">

                Nombre alfabético

              </option>

              <option value="MAYOR_COBERTURA">

                Mayor cumplimiento

              </option>

              <option value="MENOR_COBERTURA">

                Menor cumplimiento

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
            checked={soloAsignados}
            onChange={e =>
              setSoloAsignados(e.target.checked)
            }
          />

          Mostrar únicamente colaboradores
          con riesgos aplicables

        </label>

      </div>

      {/* LEYENDA */}

      <div className="cap-panel">

        <h2>Simbología</h2>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16
        }}>

          {LEYENDA.map(value => {

            const config = getEstado(value);

            return (

              <div
                key={value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12
                }}
              >

                <span style={{

                  display: 'inline-flex',

                  alignItems: 'center',

                  justifyContent: 'center',

                  minWidth: 36,

                  height: 28,

                  borderRadius: 5,

                  background: config.bg,

                  color: config.color,

                  fontWeight: 700

                }}>

                  {config.symbol}

                </span>

                {config.label}

              </div>

            );

          })}

        </div>

        <p className="cap-muted">

          Los símbolos 90 y 30 representan
          alertas de vencimiento dentro de
          90 y 30 días, respectivamente.

          El permiso operativo se determina
          mediante el estado calculado por Supabase.

        </p>

      </div>

      {/* DETALLE DE UNA COMBINACIÓN */}

      {selected && (

        <div className="cap-panel">

          <div className="cap-toolbar">

            <h2>Detalle del riesgo crítico</h2>

            <button
              type="button"
              className="cap-secondary"
              onClick={() => setSelected(null)}
            >

              <X size={16} />

              Cerrar

            </button>

          </div>

          <div
            className="cap-form-grid"
            style={{ marginTop: 20 }}
          >

            <div className="cap-field">

              <label>Colaborador</label>

              <strong>

                {selected.colaborador.nombre}

              </strong>

              <span className="cap-muted">

                {selected.colaborador.puesto}

              </span>

            </div>

            <div className="cap-field">

              <label>Riesgo crítico</label>

              <strong>

                {selected.riesgo.nombre}

              </strong>

              <span className="cap-muted">

                {selected.riesgo.codigo}

              </span>

            </div>

            <div className="cap-field">

              <label>Estado operativo</label>

              <div>

                <Estado
                  value={selected.registro?.estado}
                />

              </div>

            </div>

            <div className="cap-field">

              <label>Permiso operativo</label>

              <strong style={{

                color: selected.registro?.autorizado

                  ? '#15803d'

                  : '#64748b'

              }}>

                {!selected.registro

                  ? 'NO DISPONIBLE'

                  : selected.registro.estado ===
                    'NO_APLICA'

                    ? 'NO APLICA'

                    : selected.registro.estado ===
                      'NO_REQUIERE_AUTORIZACION'

                      ? 'NO REQUERIDO'

                      : selected.registro.autorizado

                        ? 'AUTORIZADO'

                        : 'NO AUTORIZADO'}

              </strong>

            </div>

          </div>

          {/* VENCIMIENTOS SEGÚN PERFIL */}

          {canReadVencimientos &&
           selected.registro?.asignacion_id && (

            <>

              <h3>Vigencias de requisitos</h3>

              {warning ? (

                <div className="cap-alert-warning">

                  No fue posible consultar
                  los vencimientos adicionales.

                </div>

              ) : vencimientosDetalle.length > 0 ? (

                <div className="cap-table-wrap">

                  <table>

                    <thead>

                      <tr>

                        <th>Requisito</th>

                        <th>Realización</th>

                        <th>Vencimiento</th>

                        <th>Días restantes</th>

                        <th>Estado</th>

                      </tr>

                    </thead>

                    <tbody>

                      {vencimientosDetalle.map(
                        (v, index) => (

                          <tr key={

                            `${v.registro_id}-${v.requisito}-${index}`

                          }>

                            <td>

                              {String(v.requisito)
                                .replaceAll('_', ' ')}

                            </td>

                            <td>

                              {formatDate(
                                v.fecha_realizacion
                              )}

                            </td>

                            <td>

                              {formatDate(
                                v.fecha_vencimiento
                              )}

                            </td>

                            <td>

                              {v.dias_restantes ?? '—'}

                            </td>

                            <td>

                              <Estado
                                value={
                                  v.estado_vencimiento
                                }
                              />

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              ) : (

                <p className="cap-muted">

                  No hay vencimientos disponibles
                  para esta asignación y perfil.

                </p>

              )}

            </>

          )}

          {/* CERTIFICACIÓN OPCIONAL */}

          {canReadCertificaciones &&
           selected.registro?.asignacion_id && (

            <div style={{

              padding: 20,

              marginTop: 20,

              border: '1px solid #ddd6fe',

              borderRadius: 10,

              background: '#faf8ff'

            }}>

              <div className="cap-toolbar">

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>

                  <Award size={24} color="#7c3aed" />

                  <strong>

                    Certificación adicional

                  </strong>

                </div>

                <span className={
                  'cap-status cap-status-optional'
                }>

                  OPCIONAL

                </span>

              </div>

              {certificacionDetalle ? (

                <div
                  className="cap-form-grid"
                  style={{ marginTop: 20 }}
                >

                  <div className="cap-field">

                    <label>Estado de certificación</label>

                    <div>

                      <Estado
                        optional
                        value={
                          certificacionDetalle
                            .estado_vencimiento
                        }
                      />

                    </div>

                  </div>

                  <div className="cap-field">

                    <label>Fecha de vencimiento</label>

                    <strong>

                      {certificacionDetalle.fecha_vencimiento

                        ? formatDate(
                            certificacionDetalle.fecha_vencimiento
                          )

                        : 'Sin vencimiento registrado'}

                    </strong>

                  </div>

                </div>

              ) : (

                <p className="cap-muted">

                  {warning

                    ? 'Información no disponible.'

                    : 'No existe certificación verificable en esta consulta.'}

                </p>

              )}

              <p className="cap-muted">

                La ausencia o vencimiento de esta
                certificación no modifica la
                autorización operativa.

              </p>

            </div>

          )}

          <div
            className="cap-alert-info"
            style={{ marginTop: 20 }}
          >

            <Info size={17} />

            {' '}

            El estado operativo proviene de
            cap_matriz_rc.

            Las modificaciones deben realizarse
            desde los módulos de capacitación
            y autorizaciones.

          </div>

        </div>

      )}

      {/* MATRIZ PRINCIPAL */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>Matriz de autorización RC</h2>

          <span className="cap-muted">

            {colaboradoresFiltrados.length}

            {' colaboradores × '}

            {riesgosFiltrados.length}

            {' RC'}

          </span>

        </div>

        <p className="cap-muted">

          Selecciona una celda para consultar
          su estado operativo y los vencimientos
          disponibles según tu perfil.

        </p>

        {matriz.length >= 1000 && (

          <div className="cap-alert-warning">

            La consulta alcanzó 1,000 combinaciones.
            Verifica el límite de filas de Supabase
            antes de interpretar los indicadores.

          </div>

        )}

        {loading ? (

          <div
            className="cap-welcome"
            role="status"
          >

            <RefreshCw size={32} />

            <p>Cargando matriz RC...</p>

          </div>

        ) : (

          <div style={{

            overflow: 'auto',

            maxHeight: 680,

            maxWidth: '100%',

            border: borderCell,

            borderRadius: 8,

            isolation: 'isolate'

          }}>

            <table style={{

              minWidth: '100%',

              width: 'max-content',

              borderCollapse: 'separate',

              borderSpacing: 0,

              fontSize: 12,

              margin: 0

            }}>

              <thead>

                <tr>

                  <th style={{

                    ...stickyHeaderStyle,

                    left: 0,

                    zIndex: 6,

                    minWidth: 240,

                    padding: 14,

                    textAlign: 'left'

                  }}>

                    Colaborador

                  </th>

                  {riesgosFiltrados.map(rc => (

                    <th
                      key={rc.id}
                      title={rc.nombre}
                      style={{

                        ...stickyHeaderStyle,

                        minWidth: 95,

                        maxWidth: 130,

                        padding: 12,

                        textAlign: 'center',

                        borderRight:
                          '1px solid #93b4d6'

                      }}
                    >

                      <div style={{

                        fontSize: 16,

                        fontWeight: 700

                      }}>

                        {rc.abreviatura ||
                         rc.codigo}

                      </div>

                      <div style={{

                        fontSize: 10,

                        marginTop: 5,

                        color: '#dbeafe',

                        whiteSpace: 'normal'

                      }}>

                        {rc.nombre}

                      </div>

                    </th>

                  ))}

                  <th style={{

                    ...stickyHeaderStyle,

                    minWidth: 105,

                    padding: 12

                  }}>

                    Autorizados

                  </th>

                  <th style={{

                    ...stickyHeaderStyle,

                    minWidth: 110,

                    padding: 12

                  }}>

                    Cumplimiento

                  </th>

                </tr>

              </thead>

              <tbody>

                {colaboradoresFiltrados.map(c => {

                  const cobertura =
                    coberturaColaborador.get(c.id);

                  return (

                    <tr key={c.id}>

                      <td style={{

                        ...stickyNameStyle,

                        padding: 12,

                        borderBottom: borderCell

                      }}>

                        <strong>

                          {c.nombre}

                        </strong>

                        <div className="cap-muted">

                          {c.puesto}

                        </div>

                      </td>

                      {riesgosFiltrados.map(rc => {

                        const registro = matrizMap.get(

                          `${c.id}-${rc.id}`

                        );

                        return (

                          <td
                            key={rc.id}
                            style={{

                              padding: 5,

                              background: '#ffffff',

                              borderRight: borderCell,

                              borderBottom: borderCell,

                              opacity:
                                coincideFiltro(registro)

                                  ? 1

                                  : 0.35

                            }}
                          >

                            <EstadoCell
                              registro={registro}
                              label={
                                `${c.nombre} - ${rc.nombre}`
                              }
                              onClick={() =>
                                mostrarDetalle(c, rc)
                              }
                            />

                          </td>

                        );

                      })}

                      <td style={{

                        padding: 12,

                        textAlign: 'center',

                        background: '#f8fafc',

                        fontWeight: 700,

                        borderBottom: borderCell

                      }}>

                        {cobertura?.autorizados ?? 0}

                        {' / '}

                        {cobertura?.aplicables ?? 0}

                      </td>

                      <td style={{

                        padding: 12,

                        textAlign: 'center',

                        background: '#f8fafc',

                        fontWeight: 700,

                        borderBottom: borderCell,

                        color: percentColor(
                          cobertura?.porcentaje ?? null
                        )

                      }}>

                        {formatPercent(
                          cobertura?.porcentaje ?? null
                        )}

                      </td>

                    </tr>

                  );

                })}

                {(!colaboradoresFiltrados.length ||
                  !riesgosFiltrados.length) && (

                  <tr>

                    <td
                      colSpan={
                        riesgosFiltrados.length + 3
                      }
                      style={{
                        textAlign: 'center',
                        padding: 35,
                        color: '#64748b'
                      }}
                    >

                      No se encontraron combinaciones
                      para los filtros seleccionados.

                    </td>

                  </tr>

                )}

              </tbody>

              {/* RESUMEN INFERIOR */}

              {riesgosFiltrados.length > 0 && (

                <tfoot>

                  {[

                    {
                      key: 'aplicables',
                      label: 'Asignaciones aplicables',
                      bg: '#eaf2fa'
                    },

                    {
                      key: 'autorizados',
                      label: 'Autorizados',
                      bg: '#f0fdf4'
                    },

                    {
                      key: 'pendientes',
                      label: 'Sin autorización',
                      bg: '#fef2f2'
                    },

                    {
                      key: 'porcentaje',
                      label: 'Cumplimiento por RC',
                      bg: '#f1f5f9'
                    }

                  ].map(item => (

                    <tr key={item.key}>

                      <td style={{

                        ...stickyNameStyle,

                        padding: 12,

                        background: item.bg,

                        fontWeight: 700

                      }}>

                        {item.label}

                      </td>

                      {riesgosFiltrados.map(rc => {

                        const cobertura =
                          coberturaRC.get(rc.id);

                        const value =
                          cobertura?.[item.key];

                        return (

                          <td
                            key={rc.id}
                            style={{

                              padding: 12,

                              textAlign: 'center',

                              background: item.bg,

                              fontWeight: 700,

                              borderRight: borderCell,

                              color:

                                item.key === 'porcentaje'

                                  ? percentColor(
                                      value ?? null
                                    )

                                  : item.key === 'pendientes'

                                    ? '#991b1b'

                                    : '#164b83'

                            }}
                          >

                            {item.key === 'porcentaje'

                              ? formatPercent(value ?? null)

                              : value ?? 0}

                          </td>

                        );

                      })}

                      <td
                        colSpan={2}
                        style={{
                          background: item.bg
                        }}
                      />

                    </tr>

                  ))}

                </tfoot>

              )}

            </table>

          </div>

        )}

        <p className="cap-muted">

          Los indicadores por colaborador
          corresponden a los RC seleccionados.

          Los totales inferiores por riesgo crítico
          consideran a todos los colaboradores
          incluidos en la consulta.

          Las combinaciones sin asignación,
          no aplicables o inactivas se excluyen
          del cálculo de cumplimiento.

        </p>

      </div>

      {/* RESUMEN VISUAL POR RC */}

      <div className="cap-panel">

        <h2>Cumplimiento por riesgo crítico</h2>

        <div style={{

          display: 'grid',

          gridTemplateColumns:

            'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',

          gap: 16

        }}>

          {riesgosFiltrados.map(rc => {

            const cobertura =
              coberturaRC.get(rc.id);

            const percent =
              cobertura?.porcentaje ?? null;

            return (

              <div
                key={rc.id}
                style={{

                  padding: 18,

                  border: borderCell,

                  borderRadius: 10,

                  background: '#ffffff'

                }}
              >

                <div className="cap-muted">

                  {rc.codigo} · {rc.abreviatura}

                </div>

                <h3 style={{

                  fontSize: 15,

                  minHeight: 40

                }}>

                  {rc.nombre}

                </h3>

                <div style={{

                  fontSize: 30,

                  fontWeight: 700,

                  color: percentColor(percent)

                }}>

                  {formatPercent(percent)}

                </div>

                <div style={{

                  height: 10,

                  background: '#e2e8f0',

                  borderRadius: 10,

                  overflow: 'hidden',

                  margin: '12px 0'

                }}>

                  <div style={{

                    width: `${Math.min(
                      100,
                      percent ?? 0
                    )}%`,

                    height: '100%',

                    background: percentColor(percent),

                    borderRadius: 10

                  }}/>

                </div>

                <div className="cap-toolbar">

                  <div>

                    <div className="cap-muted">

                      Autorizados

                    </div>

                    <strong>

                      {cobertura?.autorizados ?? 0}

                    </strong>

                  </div>

                  <div>

                    <div className="cap-muted">

                      Aplicables

                    </div>

                    <strong>

                      {cobertura?.aplicables ?? 0}

                    </strong>

                  </div>

                  <div>

                    <div className="cap-muted">

                      Pendientes

                    </div>

                    <strong>

                      {cobertura?.pendientes ?? 0}

                    </strong>

                  </div>

                </div>

              </div>

            );

          })}

        </div>

      </div>

    </div>

  );

}
