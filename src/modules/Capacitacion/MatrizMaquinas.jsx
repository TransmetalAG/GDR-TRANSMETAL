
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';

import {
  Grid3X3,
  Factory,
  Users,
  ShieldCheck,
  Percent,
  Search,
  RefreshCw,
  Download,
  Award,
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

  PENDIENTE_VOBO: {
    symbol: 'P',
    label: 'Pendiente de VoBo',
    bg: '#fef3c7',
    color: '#92400e'
  },

  PENDIENTE: {
    symbol: 'P',
    label: 'Pendiente',
    bg: '#fef3c7',
    color: '#92400e'
  },

  CAPACITADO: {
    symbol: 'C',
    label: 'Capacitado',
    bg: '#dbeafe',
    color: '#1d4ed8'
  },

  SUSPENDIDO: {
    symbol: 'S',
    label: 'Suspendido',
    bg: '#ffedd5',
    color: '#9a3412'
  },

  REVOCADO: {
    symbol: 'R',
    label: 'Revocado',
    bg: '#fee2e2',
    color: '#991b1b'
  },

  DEVUELTO: {
    symbol: 'D',
    label: 'Devuelto',
    bg: '#fee2e2',
    color: '#991b1b'
  },

  SIN_CAPACITACION: {
    symbol: '—',
    label: 'Sin capacitación',
    bg: '#f1f5f9',
    color: '#64748b'
  },

  SIN_AUTORIZACION: {
    symbol: '—',
    label: 'Sin autorización',
    bg: '#f1f5f9',
    color: '#64748b'
  },

  NO_AUTORIZADO: {
    symbol: '—',
    label: 'No autorizado',
    bg: '#f1f5f9',
    color: '#64748b'
  },

  NO_REQUIERE_AUTORIZACION: {
    symbol: 'N/A',
    label: 'No requiere autorización',
    bg: '#f8fafc',
    color: '#94a3b8'
  },

  INACTIVO: {
    symbol: 'I',
    label: 'Inactivo',
    bg: '#e2e8f0',
    color: '#64748b'
  },

  REQUISITOS_INCOMPLETOS: {
    symbol: '!',
    label: 'Requisitos incompletos',
    bg: '#fee2e2',
    color: '#991b1b'
  },

  NO_DISPONIBLE: {
    symbol: '?',
    label: 'Información no disponible',
    bg: '#f8fafc',
    color: '#64748b'
  }

};

const LEYENDA = [
  'AUTORIZADO',
  'PENDIENTE_VOBO',
  'CAPACITADO',
  'SUSPENDIDO',
  'REVOCADO',
  'DEVUELTO',
  'SIN_CAPACITACION',
  'NO_REQUIERE_AUTORIZACION'
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

function requiereAutorizacion(registro) {

  return Boolean(

    registro &&

    ![
      'NO_REQUIERE_AUTORIZACION',
      'INACTIVO'
    ].includes(registro.estado)

  );

}

function calcularCobertura(registros) {

  const aplicables = registros.filter(
    requiereAutorizacion
  );

  const autorizadas = aplicables.filter(
    r => r.autorizado === true
  ).length;

  return {

    total: aplicables.length,

    autorizadas,

    porcentaje: porcentaje(
      autorizadas,
      aplicables.length
    )

  };

}

function textValue(value) {

  // Evitar interpretar texto como fórmula
  // al exportar información administrativa.

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
  onClick
}) {

  const estado = registro?.estado ||
    'NO_DISPONIBLE';

  const config = getEstado(estado);

  return (

    <button
      type="button"
      title={config.label}
      aria-label={config.label}
      onClick={onClick}
      style={{

        width: '100%',
        minWidth: 48,
        height: 36,

        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',

        border: '1px solid rgba(0,0,0,0.04)',
        borderRadius: 5,

        background: config.bg,
        color: config.color,

        fontWeight: 700,
        fontSize: 12,
        fontFamily: 'inherit',

        cursor: 'pointer'

      }}
    >

      {config.symbol}

    </button>

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

export default function MatrizMaquinas({
  client,
  role
}) {

  const [matriz, setMatriz] =
    useState([]);

  const [catalogoMaquinas, setCatalogoMaquinas] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [exporting, setExporting] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [filterProceso, setFilterProceso] =
    useState('TODOS');

  const [filterMaquina, setFilterMaquina] =
    useState('TODAS');

  const [filterEstado, setFilterEstado] =
    useState('TODOS');

  const [soloLideres, setSoloLideres] =
    useState(false);

  const [orden, setOrden] =
    useState('NOMBRE');

  const [selected, setSelected] =
    useState(null);

  // ==========================================
  // CONSULTAR MATRIZ DE SUPABASE
  // ==========================================

  const cargarDatos = useCallback(async () => {

    if (!client || !role) {

      setLoading(false);
      return;

    }

    setLoading(true);
    setError('');
    setSelected(null);

    try {

      const [
        matrizResponse,
        maquinasResponse
      ] = await Promise.all([

        client.rpc('cap_matriz_maquinas'),

        client
          .from('cap_maquinas')
          .select(`
            id,
            codigo,
            nombre,
            procesos,
            minimo_operadores,
            requiere_autorizacion,
            activo
          `)
          .eq('activo', true)
          .order('nombre')

      ]);

      if (matrizResponse.error) {

        throw matrizResponse.error;

      }

      if (maquinasResponse.error) {

        throw maquinasResponse.error;

      }

      setMatriz(
        matrizResponse.data || []
      );

      setCatalogoMaquinas(
        maquinasResponse.data || []
      );

    } catch (err) {

      setMatriz([]);
      setCatalogoMaquinas([]);

      setError(
        'No fue posible consultar la matriz: ' +
        err.message
      );

    } finally {

      setLoading(false);

    }

  }, [client, role]);

  useEffect(() => {

    setMatriz([]);
    setCatalogoMaquinas([]);
    setSelected(null);
    setSuccess('');

    cargarDatos();

  }, [cargarDatos]);

  // ==========================================
  // CONSTRUIR LISTA DE COLABORADORES
  // ==========================================

  const colaboradores = useMemo(() => {

    const map = new Map();

    matriz.forEach(r => {

      if (!map.has(r.colaborador_id)) {

        map.set(r.colaborador_id, {

          id: r.colaborador_id,

          nombre: r.colaborador,

          puesto: r.puesto,

          es_lider: r.es_lider === true

        });

      }

    });

    return [...map.values()].sort(
      (a, b) =>
        a.nombre.localeCompare(b.nombre, 'es')
    );

  }, [matriz]);

  // ==========================================
  // CONSTRUIR LISTA DE MÁQUINAS
  // ==========================================

  const maquinas = useMemo(() => {

    const map = new Map();

    catalogoMaquinas.forEach(m => {

      map.set(m.id, m);

    });

    // Mantener referencia de las máquinas
    // incluidas en la RPC.

    matriz.forEach(r => {

      if (!map.has(r.maquina_id)) {

        map.set(r.maquina_id, {

          id: r.maquina_id,

          nombre: r.maquina,

          codigo: '',

          procesos: r.procesos || [],

          minimo_operadores:
            r.minimo_operadores,

          requiere_autorizacion:
            r.estado !==
              'NO_REQUIERE_AUTORIZACION'

        });

      }

    });

    return [...map.values()].sort(
      (a, b) =>
        a.nombre.localeCompare(b.nombre, 'es')
    );

  }, [matriz, catalogoMaquinas]);

  // ==========================================
  // MAPA DE COMBINACIONES
  // ==========================================

  const matrizMap = useMemo(() => {

    return new Map(

      matriz.map(r => [

        `${r.colaborador_id}-${r.maquina_id}`,

        r

      ])

    );

  }, [matriz]);

  // ==========================================
  // CATÁLOGO DE PROCESOS
  // ==========================================

  const procesos = useMemo(() => {

    const valores = new Set();

    maquinas.forEach(m => {

      (m.procesos || []).forEach(p => {

        if (p) valores.add(p);

      });

    });

    return [...valores].sort(
      (a, b) => a.localeCompare(b, 'es')
    );

  }, [maquinas]);

  // ==========================================
  // ESTADOS DISPONIBLES
  // ==========================================

  const estadosDisponibles = useMemo(() => {

    return [...new Set(

      matriz.map(r => r.estado).filter(Boolean)

    )].sort();

  }, [matriz]);

  // ==========================================
  // INDICADORES GENERALES
  // ==========================================

  const indicadores = useMemo(() => {

    const cobertura =
      calcularCobertura(matriz);

    return {

      colaboradores:
        colaboradores.length,

      maquinas:
        maquinas.length,

      combinaciones:
        cobertura.total,

      autorizadas:
        cobertura.autorizadas,

      cobertura:
        cobertura.porcentaje,

      pendientes:
        matriz.filter(r =>

          [
            'PENDIENTE',
            'PENDIENTE_VOBO',
            'CAPACITADO'
          ].includes(r.estado)

        ).length

    };

  }, [matriz, colaboradores, maquinas]);

  // ==========================================
  // FILTRAR MÁQUINAS
  // ==========================================

  const maquinasFiltradas = useMemo(() => {

    return maquinas.filter(m => {

      if (
        filterProceso !== 'TODOS' &&

        !(m.procesos || []).includes(
          filterProceso
        )
      ) {

        return false;

      }

      if (
        filterMaquina !== 'TODAS' &&

        m.id !== filterMaquina
      ) {

        return false;

      }

      return true;

    });

  }, [
    maquinas,
    filterProceso,
    filterMaquina
  ]);

  // ==========================================
  // COBERTURA POR COLABORADOR
  // ==========================================

  const coberturaColaborador = useMemo(() => {

    const map = new Map();

    colaboradores.forEach(c => {

      const registros = maquinasFiltradas

        .map(m =>

          matrizMap.get(
            `${c.id}-${m.id}`
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
    maquinasFiltradas,
    matrizMap
  ]);

  // ==========================================
  // FILTRAR COLABORADORES
  // ==========================================

  const colaboradoresFiltrados = useMemo(() => {

    const term = normalize(search);

    const resultados = colaboradores.filter(c => {

      if (soloLideres && !c.es_lider) {

        return false;

      }

      if (
        term &&

        ![
          c.nombre,
          c.puesto
        ].some(v => normalize(v).includes(term))
      ) {

        return false;

      }

      if (filterEstado !== 'TODOS') {

        const coincide =
          maquinasFiltradas.some(m => {

            const registro = matrizMap.get(
              `${c.id}-${m.id}`
            );

            return registro?.estado ===
              filterEstado;

          });

        if (!coincide) return false;

      }

      return true;

    });

    return resultados.sort((a, b) => {

      const coberturaA =
        coberturaColaborador.get(a.id)
          ?.porcentaje ?? -1;

      const coberturaB =
        coberturaColaborador.get(b.id)
          ?.porcentaje ?? -1;

      if (orden === 'MAYOR_COBERTURA') {

        return coberturaB - coberturaA ||

          a.nombre.localeCompare(
            b.nombre, 'es'
          );

      }

      if (orden === 'MENOR_COBERTURA') {

        return coberturaA - coberturaB ||

          a.nombre.localeCompare(
            b.nombre, 'es'
          );

      }

      return a.nombre.localeCompare(
        b.nombre, 'es'
      );

    });

  }, [

    colaboradores,

    search,

    soloLideres,

    filterEstado,

    maquinasFiltradas,

    matrizMap,

    coberturaColaborador,

    orden

  ]);

  // ==========================================
  // COBERTURA POR MÁQUINA
  // ==========================================

  const coberturaMaquina = useMemo(() => {

    const map = new Map();

    maquinasFiltradas.forEach(m => {

      // La cobertura de operadores por máquina
      // considera a todos los colaboradores,
      // aunque exista un filtro visual aplicado.

      const registros = colaboradores

        .map(c =>

          matrizMap.get(
            `${c.id}-${m.id}`
          )

        )

        .filter(Boolean);

      const autorizados = registros.filter(
        r => r.autorizado === true
      ).length;

      const minimo = Number(
        m.minimo_operadores || 0
      );

      const aplica =
        m.requiere_autorizacion !== false;

      map.set(m.id, {

        autorizados,

        minimo,

        aplica,

        brecha: aplica

          ? Math.max(
              minimo - autorizados,
              0
            )

          : null,

        cumple: aplica &&

          minimo > 0 &&

          autorizados >= minimo

      });

    });

    return map;

  }, [
    maquinasFiltradas,
    colaboradores,
    matrizMap
  ]);

  // ==========================================
  // LIMPIAR FILTROS
  // ==========================================

  function limpiarFiltros() {

    setSearch('');

    setFilterProceso('TODOS');

    setFilterMaquina('TODAS');

    setFilterEstado('TODOS');

    setSoloLideres(false);

    setOrden('NOMBRE');

    setSelected(null);

  }

  // ==========================================
  // DETALLE DE UNA COMBINACIÓN
  // ==========================================

  function mostrarDetalle(
    colaborador,
    maquina
  ) {

    const registro = matrizMap.get(
      `${colaborador.id}-${maquina.id}`
    );

    setSelected({

      colaborador,

      maquina,

      registro

    });

  }

  // ==========================================
  // EXPORTAR MATRIZ A EXCEL
  // ==========================================

  function exportarExcel() {

    if (
      exporting ||
      loading ||
      !colaboradoresFiltrados.length ||
      !maquinasFiltradas.length
    ) {

      return;

    }

    setError('');
    setSuccess('');
    setExporting(true);

    try {

      const wb = XLSX.utils.book_new();

      // ======================================
      // HOJA 1: MATRIZ
      // ======================================

      const headers = [

        'Colaborador',

        'Puesto',

        'Líder',

        ...maquinasFiltradas.map(
          m => textValue(m.nombre)
        ),

        'Autorizadas',

        'Aplicables',

        'Cobertura'

      ];

      const rows = colaboradoresFiltrados.map(c => {

        const cobertura =
          coberturaColaborador.get(c.id);

        return [

          textValue(c.nombre),

          textValue(c.puesto),

          c.es_lider ? 'SÍ' : 'NO',

          ...maquinasFiltradas.map(m => {

            const registro = matrizMap.get(
              `${c.id}-${m.id}`
            );

            return getEstado(
              registro?.estado ||
              'NO_DISPONIBLE'
            ).label;

          }),

          cobertura?.autorizadas ?? 0,

          cobertura?.total ?? 0,

          cobertura?.porcentaje === null

            ? 'N/A'

            : (
                cobertura?.porcentaje || 0
              ) / 100

        ];

      });

      const ws = XLSX.utils.aoa_to_sheet([
        headers,
        ...rows
      ]);

      ws['!cols'] = [

        { wch: 38 },

        { wch: 28 },

        { wch: 10 },

        ...maquinasFiltradas.map(() => ({

          wch: 25

        })),

        { wch: 14 },

        { wch: 14 },

        { wch: 14 }

      ];

      ws['!autofilter'] = {

        ref: ws['!ref']

      };

      const coverageColumn =
        headers.length - 1;

      for (
        let r = 1;
        r <= rows.length;
        r++
      ) {

        const address =
          XLSX.utils.encode_cell({

            r,

            c: coverageColumn

          });

        if (ws[address]?.t === 'n') {

          ws[address].z = '0.0%';

        }

      }

      XLSX.utils.book_append_sheet(

        wb,

        ws,

        'Matriz de maquinas'

      );

      // ======================================
      // HOJA 2: COBERTURA DE MÁQUINAS
      // ======================================

      const resumenMaquinas = [

        [

          'Código',

          'Máquina',

          'Procesos',

          'Mínimo requerido',

          'Operadores autorizados',

          'Brecha',

          'Estado'

        ],

        ...maquinasFiltradas.map(m => {

          const cobertura =
            coberturaMaquina.get(m.id);

          return [

            textValue(m.codigo),

            textValue(m.nombre),

            textValue(
              (m.procesos || []).join(', ')
            ),

            cobertura?.aplica

              ? cobertura.minimo

              : 'N/A',

            cobertura?.autorizados ?? 0,

            cobertura?.brecha ?? 'N/A',

            !cobertura?.aplica

              ? 'NO REQUIERE AUTORIZACIÓN'

              : cobertura.minimo <= 0

                ? 'SIN META CONFIGURADA'

                : cobertura.cumple

                  ? 'CUMPLE'

                  : 'BRECHA'

          ];

        })

      ];

      const wsResumen =
        XLSX.utils.aoa_to_sheet(
          resumenMaquinas
        );

      wsResumen['!cols'] = [

        { wch: 15 },

        { wch: 35 },

        { wch: 35 },

        { wch: 20 },

        { wch: 23 },

        { wch: 12 },

        { wch: 32 }

      ];

      wsResumen['!autofilter'] = {

        ref: wsResumen['!ref']

      };

      XLSX.utils.book_append_sheet(

        wb,

        wsResumen,

        'Cobertura maquinas'

      );

      // ======================================
      // HOJA 3: DETALLE DE COMBINACIONES
      // ======================================

      const detalles = [

        [

          'Colaborador',

          'Puesto',

          'Máquina',

          'Estado',

          'Autorizado'

        ]

      ];

      colaboradoresFiltrados.forEach(c => {

        maquinasFiltradas.forEach(m => {

          const registro = matrizMap.get(
            `${c.id}-${m.id}`
          );

          detalles.push([

            textValue(c.nombre),

            textValue(c.puesto),

            textValue(m.nombre),

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
        XLSX.utils.aoa_to_sheet(detalles);

      wsDetalle['!cols'] = [

        { wch: 38 },

        { wch: 28 },

        { wch: 35 },

        { wch: 32 },

        { wch: 20 }

      ];

      wsDetalle['!autofilter'] = {

        ref: wsDetalle['!ref']

      };

      XLSX.utils.book_append_sheet(

        wb,

        wsDetalle,

        'Detalle'

      );

      // ======================================
      // HOJA 4: RESUMEN GENERAL
      // ======================================

      const wsGeneral =
        XLSX.utils.aoa_to_sheet([

          ['TRANSMETAL'],

          ['MATRIZ DE CAPACITACIÓN DE MÁQUINAS'],

          ['Fecha de consulta', fechaGuatemala()],

          [],

          ['Indicador', 'Valor'],

          [
            'Colaboradores',
            indicadores.colaboradores
          ],

          [
            'Máquinas',
            indicadores.maquinas
          ],

          [
            'Combinaciones aplicables',
            indicadores.combinaciones
          ],

          [
            'Combinaciones autorizadas',
            indicadores.autorizadas
          ],

          [
            'Cobertura general',
            indicadores.cobertura === null
              ? 'N/A'
              : indicadores.cobertura / 100
          ],

          [],

          ['Filtros aplicados'],

          ['Búsqueda', textValue(search)],

          ['Proceso', textValue(filterProceso)],

          [

            'Máquina',

            filterMaquina === 'TODAS'

              ? 'TODAS'

              : textValue(
                  maquinas.find(
                    m => m.id === filterMaquina
                  )?.nombre
                )

          ],

          ['Estado', textValue(filterEstado)],

          ['Solo líderes', soloLideres ? 'SÍ' : 'NO'],

          [],

          [

            'Nota',

            'La cobertura por máquina considera ' +
            'a todos los colaboradores consultados.'

          ],

          [

            'Nota',

            'La matriz y el detalle respetan ' +
            'los filtros visuales aplicados.'

          ],

          [

            'Nota',

            'La información corresponde a una ' +
            'consulta histórica y no sustituye ' +
            'la verificación operativa en tiempo real.'

          ]

        ]);

      wsGeneral['!cols'] = [

        { wch: 35 },

        { wch: 90 }

      ];

      if (wsGeneral.B10?.t === 'n') {

        wsGeneral.B10.z = '0.0%';

      }

      XLSX.utils.book_append_sheet(

        wb,

        wsGeneral,

        'Resumen general'

      );

      // ======================================
      // DESCARGAR ARCHIVO
      // ======================================

      XLSX.writeFile(

        wb,

        `Matriz_Maquinas_Transmetal_${fechaGuatemala()}.xlsx`

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

  // ==========================================
  // ESTILOS DE LA MATRIZ
  // ==========================================

  const borderCell =
    '1px solid #e2e8f0';

  const stickyNameStyle = {

    position: 'sticky',

    left: 0,

    zIndex: 3,

    minWidth: 235,

    maxWidth: 280,

    background: '#ffffff',

    borderRight: borderCell

  };

  const stickyHeaderStyle = {

    position: 'sticky',

    top: 0,

    zIndex: 4,

    background: '#164b83',

    color: '#ffffff'

  };

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (

    <div className="cap-matriz-maquinas">

      {/* ENCABEZADO */}

      <div className="cap-panel cap-toolbar">

        <div>

          <h2>Matriz de capacitación de máquinas</h2>

          <p className="cap-muted">

            Competencias, autorizaciones
            y cobertura operativa.

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

              !colaboradoresFiltrados.length ||

              !maquinasFiltradas.length

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
          value={loading ? '—' : indicadores.colaboradores}
          description="Personal incluido en la matriz"
        />

        <KPI
          icon={Factory}
          label="Máquinas"
          value={loading ? '—' : indicadores.maquinas}
          description="Equipos incluidos en el catálogo"
        />

        <KPI
          icon={Grid3X3}
          label="Combinaciones aplicables"
          value={loading ? '—' : indicadores.combinaciones}
          description="Colaborador - máquina"
        />

        <KPI
          icon={ShieldCheck}
          label="Combinaciones autorizadas"
          value={loading ? '—' : indicadores.autorizadas}
          description="Según el motor de Supabase"
          variant="cap-kpi-success"
          color="#15803d"
        />

        <KPI
          icon={Percent}
          label="Cobertura general"
          value={
            loading
              ? '—'
              : formatPercent(indicadores.cobertura)
          }
          description="Autorizadas / aplicables"
          color={percentColor(indicadores.cobertura)}
        />

      </div>

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
            onChange={e => setSearch(e.target.value)}
          />

        </div>

        <div className="cap-form-grid">

          <div className="cap-field">

            <label htmlFor="cap-mm-proceso">

              Proceso

            </label>

            <select
              id="cap-mm-proceso"
              value={filterProceso}
              onChange={e => {

                setFilterProceso(e.target.value);

                setFilterMaquina('TODAS');

              }}
            >

              <option value="TODOS">

                Todos los procesos

              </option>

              {procesos.map(p => (

                <option key={p} value={p}>

                  {p}

                </option>

              ))}

            </select>

          </div>

          <div className="cap-field">

            <label htmlFor="cap-mm-maquina">

              Máquina

            </label>

            <select
              id="cap-mm-maquina"
              value={filterMaquina}
              onChange={e =>
                setFilterMaquina(e.target.value)
              }
            >

              <option value="TODAS">

                Todas las máquinas

              </option>

              {maquinas

                .filter(m =>

                  filterProceso === 'TODOS' ||

                  (m.procesos || []).includes(
                    filterProceso
                  )

                )

                .map(m => (

                  <option key={m.id} value={m.id}>

                    {m.nombre}

                  </option>

                ))}

            </select>

          </div>

          <div className="cap-field">

            <label htmlFor="cap-mm-estado">

              Estado de autorización

            </label>

            <select
              id="cap-mm-estado"
              value={filterEstado}
              onChange={e =>
                setFilterEstado(e.target.value)
              }
            >

              <option value="TODOS">

                Todos los estados

              </option>

              {estadosDisponibles.map(estado => (

                <option key={estado} value={estado}>

                  {getEstado(estado).label}

                </option>

              ))}

            </select>

          </div>

          <div className="cap-field">

            <label htmlFor="cap-mm-orden">

              Ordenar colaboradores

            </label>

            <select
              id="cap-mm-orden"
              value={orden}
              onChange={e => setOrden(e.target.value)}
            >

              <option value="NOMBRE">

                Nombre alfabético

              </option>

              <option value="MAYOR_COBERTURA">

                Mayor cobertura

              </option>

              <option value="MENOR_COBERTURA">

                Menor cobertura

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
            checked={soloLideres}
            onChange={e =>
              setSoloLideres(e.target.checked)
            }
          />

          <Award size={18} color="#b45309" />

          Mostrar únicamente líderes

        </label>

      </div>

      {/* LEYENDA */}

      <div className="cap-panel">

        <h2>Simbología de estados</h2>

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

                  minWidth: 34,

                  height: 28,

                  padding: '0 6px',

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

      </div>

      {/* DETALLE DE CELDA */}

      {selected && (

        <div className="cap-panel">

          <div className="cap-toolbar">

            <h2>Detalle de competencia</h2>

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

              <label>Máquina</label>

              <strong>

                {selected.maquina.nombre}

              </strong>

              <span className="cap-muted">

                {(selected.maquina.procesos || [])
                  .join(', ')}

              </span>

            </div>

            <div className="cap-field">

              <label>Estado actual</label>

              <div>

                <span style={{

                  display: 'inline-block',

                  padding: '7px 12px',

                  borderRadius: 6,

                  background: getEstado(
                    selected.registro?.estado
                  ).bg,

                  color: getEstado(
                    selected.registro?.estado
                  ).color,

                  fontWeight: 700,

                  fontSize: 13

                }}>

                  {getEstado(
                    selected.registro?.estado
                  ).label}

                </span>

              </div>

            </div>

            <div className="cap-field">

              <label>Autorización operativa</label>

              <strong style={{

                color: selected.registro?.autorizado

                  ? '#15803d'

                  : '#64748b'

              }}>

                {!selected.registro

                  ? 'NO DISPONIBLE'

                  : selected.registro.estado ===
                    'NO_REQUIERE_AUTORIZACION'

                    ? 'NO REQUERIDA'

                    : selected.registro.autorizado

                      ? 'AUTORIZADO'

                      : 'NO AUTORIZADO'}

              </strong>

            </div>

          </div>

          <div className="cap-alert-info">

            <Info size={17} />

            {' '}

            El estado mostrado proviene de la RPC
            cap_matriz_maquinas. Para modificar
            autorizaciones, utiliza los módulos
            correspondientes.

          </div>

        </div>

      )}

      {/* MATRIZ PRINCIPAL */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>Matriz de competencias</h2>

          <span className="cap-muted">

            {colaboradoresFiltrados.length}

            {' colaboradores × '}

            {maquinasFiltradas.length}

            {' máquinas'}

          </span>

        </div>

        <p className="cap-muted">

          Selecciona una celda para consultar
          el estado de la combinación.
          Desplázate horizontalmente para visualizar
          todas las máquinas.

        </p>

        {matriz.length >= 1000 && (

          <div className="cap-alert-warning">

            La consulta alcanzó 1,000 registros.
            Verifica el límite de filas de la API
            antes de interpretar la matriz como completa.

          </div>

        )}

        {loading ? (

          <div className="cap-welcome" role="status">

            <RefreshCw size={32} />

            <p>Cargando matriz de capacitación...</p>

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

              width: 'max-content',

              minWidth: '100%',

              borderCollapse: 'separate',

              borderSpacing: 0,

              margin: 0,

              fontSize: 12

            }}>

              <thead>

                <tr>

                  {/* COLUMNA FIJA DE COLABORADORES */}

                  <th style={{

                    ...stickyHeaderStyle,

                    left: 0,

                    zIndex: 6,

                    minWidth: 235,

                    padding: 14,

                    textAlign: 'left',

                    borderRight: '1px solid #93b4d6'

                  }}>

                    Colaborador

                  </th>

                  {/* ENCABEZADOS DE MÁQUINAS */}

                  {maquinasFiltradas.map(m => (

                    <th
                      key={m.id}
                      title={m.nombre}
                      style={{

                        ...stickyHeaderStyle,

                        minWidth: 64,

                        maxWidth: 64,

                        height: 190,

                        padding: 8,

                        verticalAlign: 'bottom',

                        borderRight:
                          '1px solid #93b4d6'

                      }}
                    >

                      <div style={{

                        writingMode: 'vertical-rl',

                        transform: 'rotate(180deg)',

                        display: 'flex',

                        alignItems: 'center',

                        gap: 6,

                        margin: '0 auto',

                        whiteSpace: 'normal',

                        maxHeight: 175,

                        overflowWrap: 'anywhere',

                        fontWeight: 600

                      }}>

                        {m.nombre}

                        {m.codigo && (

                          <span style={{

                            fontSize: 10,

                            color: '#dbeafe'

                          }}>

                            {m.codigo}

                          </span>

                        )}

                      </div>

                    </th>

                  ))}

                  <th style={{

                    ...stickyHeaderStyle,

                    padding: 12,

                    minWidth: 100,

                    textAlign: 'center'

                  }}>

                    Autorizadas

                  </th>

                  <th style={{

                    ...stickyHeaderStyle,

                    padding: 12,

                    minWidth: 100,

                    textAlign: 'center'

                  }}>

                    Cobertura

                  </th>

                </tr>

              </thead>

              <tbody>

                {colaboradoresFiltrados.map(c => {

                  const cobertura =
                    coberturaColaborador.get(c.id);

                  return (

                    <tr key={c.id}>

                      {/* NOMBRE FIJO */}

                      <td style={{

                        ...stickyNameStyle,

                        padding: 12,

                        borderBottom: borderCell

                      }}>

                        <div style={{

                          display: 'flex',

                          alignItems: 'center',

                          gap: 6

                        }}>

                          {c.es_lider && (

                            <Award

                              size={16}

                              color="#b45309"

                              style={{ flexShrink: 0 }}

                            />

                          )}

                          <strong>

                            {c.nombre}

                          </strong>

                        </div>

                        <div className="cap-muted">

                          {c.puesto}

                        </div>

                      </td>

                      {/* CELDAS DE COMPETENCIAS */}

                      {maquinasFiltradas.map(m => {

                        const registro = matrizMap.get(

                          `${c.id}-${m.id}`

                        );

                        const coincide =

                          filterEstado === 'TODOS' ||

                          registro?.estado === filterEstado;

                        return (

                          <td
                            key={m.id}
                            style={{

                              padding: 4,

                              borderBottom: borderCell,

                              borderRight: borderCell,

                              background: '#ffffff',

                              opacity: coincide ? 1 : 0.35

                            }}
                          >

                            <EstadoCell
                              registro={registro}
                              onClick={() =>
                                mostrarDetalle(c, m)
                              }
                            />

                          </td>

                        );

                      })}

                      {/* TOTAL AUTORIZADO */}

                      <td style={{

                        padding: 12,

                        textAlign: 'center',

                        fontWeight: 700,

                        borderBottom: borderCell,

                        background: '#f8fafc'

                      }}>

                        {cobertura?.autorizadas ?? 0}

                        {' / '}

                        {cobertura?.total ?? 0}

                      </td>

                      {/* PORCENTAJE DE COBERTURA */}

                      <td style={{

                        padding: 12,

                        textAlign: 'center',

                        fontWeight: 700,

                        borderBottom: borderCell,

                        color: percentColor(
                          cobertura?.porcentaje ?? null
                        ),

                        background: '#f8fafc'

                      }}>

                        {formatPercent(
                          cobertura?.porcentaje ?? null
                        )}

                      </td>

                    </tr>

                  );

                })}

                {(!colaboradoresFiltrados.length ||
                  !maquinasFiltradas.length) && (

                  <tr>

                    <td
                      colSpan={
                        maquinasFiltradas.length + 3
                      }
                      style={{

                        padding: 35,

                        textAlign: 'center',

                        color: '#64748b'

                      }}
                    >

                      No se encontraron combinaciones
                      para los filtros seleccionados.

                    </td>

                  </tr>

                )}

              </tbody>

              {/* RESUMEN INFERIOR POR MÁQUINA */}

              {maquinasFiltradas.length > 0 && (

                <tfoot>

                  {/* OPERADORES AUTORIZADOS */}

                  <tr>

                    <td style={{

                      ...stickyNameStyle,

                      padding: 12,

                      background: '#eaf2fa',

                      fontWeight: 700

                    }}>

                      Operadores autorizados

                    </td>

                    {maquinasFiltradas.map(m => {

                      const cobertura =
                        coberturaMaquina.get(m.id);

                      return (

                        <td
                          key={m.id}
                          style={{

                            padding: 12,

                            textAlign: 'center',

                            background: '#eaf2fa',

                            fontWeight: 700,

                            color: '#164b83',

                            borderRight: borderCell

                          }}
                        >

                          {cobertura?.aplica

                            ? cobertura.autorizados

                            : 'N/A'}

                        </td>

                      );

                    })}

                    <td colSpan={2}
                      style={{
                        background: '#eaf2fa'
                      }}
                    />

                  </tr>

                  {/* MÍNIMO REQUERIDO */}

                  <tr>

                    <td style={{

                      ...stickyNameStyle,

                      padding: 12,

                      fontWeight: 700,

                      background: '#f8fafc'

                    }}>

                      Mínimo requerido

                    </td>

                    {maquinasFiltradas.map(m => {

                      const cobertura =
                        coberturaMaquina.get(m.id);

                      return (

                        <td
                          key={m.id}
                          style={{

                            padding: 12,

                            textAlign: 'center',

                            background: '#f8fafc',

                            fontWeight: 700,

                            borderRight: borderCell

                          }}
                        >

                          {cobertura?.aplica

                            ? cobertura.minimo

                            : 'N/A'}

                        </td>

                      );

                    })}

                    <td colSpan={2}
                      style={{
                        background: '#f8fafc'
                      }}
                    />

                  </tr>

                  {/* BRECHA DE OPERADORES */}

                  <tr>

                    <td style={{

                      ...stickyNameStyle,

                      padding: 12,

                      background: '#f1f5f9',

                      fontWeight: 700

                    }}>

                      Brecha de operadores

                    </td>

                    {maquinasFiltradas.map(m => {

                      const cobertura =
                        coberturaMaquina.get(m.id);

                      const sinMeta =

                        !cobertura?.aplica ||

                        cobertura.minimo <= 0;

                      return (

                        <td
                          key={m.id}
                          style={{

                            padding: 12,

                            textAlign: 'center',

                            fontWeight: 700,

                            borderRight: borderCell,

                            background: sinMeta

                              ? '#f1f5f9'

                              : cobertura.cumple

                                ? '#dcfce7'

                                : '#fee2e2',

                            color: sinMeta

                              ? '#64748b'

                              : cobertura.cumple

                                ? '#166534'

                                : '#991b1b'

                          }}
                        >

                          {sinMeta

                            ? 'N/A'

                            : cobertura.brecha}

                        </td>

                      );

                    })}

                    <td colSpan={2}
                      style={{
                        background: '#f1f5f9'
                      }}
                    />

                  </tr>

                </tfoot>

              )}

            </table>

          </div>

        )}

        <p className="cap-muted">

          Los porcentajes por colaborador consideran
          las máquinas seleccionadas. Los totales
          inferiores por máquina consideran a todo
          el personal incluido en la consulta,
          independientemente del filtro visual.

        </p>

      </div>

    </div>

  );

}
