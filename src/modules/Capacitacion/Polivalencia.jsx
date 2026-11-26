
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';

import {
  Users,
  Factory,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Target,
  TrendingUp,
  Search,
  RefreshCw,
  Download,
  GraduationCap,
  Eye,
  X
} from 'lucide-react';

import * as XLSX from 'xlsx';

import './capacitacion.css';

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

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

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

function textValue(value) {

  const text = String(value ?? '');

  return /^[=+\-@\t\r]/.test(text)
    ? "'" + text
    : text;

}

// ==========================================
// CLASIFICACIÓN DE COBERTURA
// ==========================================

const NIVELES = {

  SIN_OPERADORES: {

    label: 'Sin operadores',
    color: '#991b1b',
    bg: '#fee2e2',
    prioridad: 1

  },

  OPERADOR_UNICO: {

    label: 'Operador único',
    color: '#9a3412',
    bg: '#ffedd5',
    prioridad: 2

  },

  BRECHA: {

    label: 'Cobertura insuficiente',
    color: '#92400e',
    bg: '#fef3c7',
    prioridad: 3

  },

  CUMPLE: {

    label: 'Cumple meta',
    color: '#166534',
    bg: '#dcfce7',
    prioridad: 4

  },

  SIN_META: {

    label: 'Sin meta configurada',
    color: '#475569',
    bg: '#f1f5f9',
    prioridad: 5

  },

  NO_APLICA: {

    label: 'No requiere autorización',
    color: '#64748b',
    bg: '#f8fafc',
    prioridad: 6

  },

  NO_DISPONIBLE: {

    label: 'Información no disponible',
    color: '#475569',
    bg: '#f1f5f9',
    prioridad: 7

  }

};

function clasificar(maquina) {

  if (
    maquina.requiere_autorizacion === false
  ) {

    return 'NO_APLICA';

  }

  if (!maquina.datosDisponibles) {

    return 'NO_DISPONIBLE';

  }

  if (maquina.operadores_autorizados === 0) {

    return 'SIN_OPERADORES';

  }

  if (maquina.operadores_autorizados === 1) {

    return 'OPERADOR_UNICO';

  }

  if (maquina.minimo_operadores <= 0) {

    return 'SIN_META';

  }

  if (maquina.brecha > 0) {

    return 'BRECHA';

  }

  return 'CUMPLE';

}

function getColor(cumplimiento) {

  if (cumplimiento == null) return '#64748b';

  if (cumplimiento >= 100) return '#15803d';

  if (cumplimiento >= 75) return '#164b83';

  if (cumplimiento >= 50) return '#b45309';

  return '#b91c1c';

}

// ==========================================
// COMPONENTES VISUALES
// ==========================================

function Nivel({ value }) {

  const config =
    NIVELES[value] ||
    NIVELES.NO_DISPONIBLE;

  return (

    <span
      className="cap-status"
      style={{
        background: config.bg,
        color: config.color
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

function ProgressBar({ value }) {

  const color = getColor(value);

  return (

    <div style={{ minWidth: 100 }}>

      <div style={{

        fontWeight: 700,

        color,

        marginBottom: 7,

        textAlign: 'center'

      }}>

        {formatPercent(value)}

      </div>

      <div style={{

        height: 9,

        background: '#e2e8f0',

        borderRadius: 10,

        overflow: 'hidden'

      }}>

        <div style={{

          width: `${Math.max(
            0,
            Math.min(100, value ?? 0)
          )}%`,

          background: color,

          height: '100%',

          borderRadius: 10

        }}/>

      </div>

    </div>

  );

}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function Polivalencia({
  client,
  role
}) {

  const [polivalencia, setPolivalencia] =
    useState([]);

  const [catalogo, setCatalogo] =
    useState([]);

  const [matriz, setMatriz] =
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

  const [filterProceso, setFilterProceso] =
    useState('TODOS');

  const [filterNivel, setFilterNivel] =
    useState('TODOS');

  const [orden, setOrden] =
    useState('PRIORIDAD');

  const [selectedId, setSelectedId] =
    useState(null);

  // ==========================================
  // CONSULTAR SUPABASE
  // ==========================================

  const cargarDatos = useCallback(async () => {

    if (!client || !role) {

      setLoading(false);
      return;

    }

    setLoading(true);
    setError('');
    setWarning('');
    setSuccess('');
    setSelectedId(null);
    setMatriz([]);

    try {

      const [
        polivalenciaResponse,
        catalogoResponse,
        matrizResponse
      ] = await Promise.all([

        client.rpc(
          'cap_polivalencia_maquinas'
        ),

        client
          .from('cap_maquinas')
          .select(`
            id,
            codigo,
            nombre,
            area,
            procesos,
            minimo_operadores,
            requiere_autorizacion,
            activo
          `)
          .eq('activo', true)
          .order('nombre'),

        client.rpc(
          'cap_matriz_maquinas'
        )

      ]);

      if (polivalenciaResponse.error) {
        throw polivalenciaResponse.error;
      }

      if (catalogoResponse.error) {
        throw catalogoResponse.error;
      }

      setPolivalencia(
        polivalenciaResponse.data || []
      );

      setCatalogo(
        catalogoResponse.data || []
      );

      const avisos = [];

      if (matrizResponse.error) {

        setMatriz([]);

        avisos.push(
          'No se pudo consultar el detalle ' +
          'individual de los operadores.'
        );

      } else {

        setMatriz(
          matrizResponse.data || []
        );

        if (
          (matrizResponse.data || []).length >= 1000
        ) {

          avisos.push(
            'El detalle de colaboradores alcanzó ' +
            '1,000 combinaciones y podría estar incompleto.'
          );

        }

      }

      if (
        (polivalenciaResponse.data || []).length >= 1000 ||
        (catalogoResponse.data || []).length >= 1000
      ) {

        avisos.push(
          'Verifica el límite de filas de la API ' +
          'antes de interpretar el catálogo como completo.'
        );

      }

      setWarning(avisos.join(' '));

    } catch (err) {

      setPolivalencia([]);
      setCatalogo([]);
      setMatriz([]);

      setError(
        'No fue posible consultar la polivalencia: ' +
        err.message
      );

    } finally {

      setLoading(false);

    }

  }, [client, role]);

  useEffect(() => {

    setPolivalencia([]);
    setCatalogo([]);
    setMatriz([]);
    setSelectedId(null);

    cargarDatos();

  }, [cargarDatos]);

  // ==========================================
  // RELACIONAR CATÁLOGO CON POLIVALENCIA
  // ==========================================

  const maquinas = useMemo(() => {

    const map = new Map(

      polivalencia.map(m => [
        m.maquina_id,
        m
      ])

    );

    return catalogo.map(m => {

      const registro = map.get(m.id);

      const datosDisponibles =
        Boolean(registro) &&
        registro.operadores_autorizados != null;

      const minimo = number(

        registro?.minimo_operadores ??
        m.minimo_operadores

      );

      const autorizados = datosDisponibles

        ? number(
            registro.operadores_autorizados
          )

        : null;

      const pendientes = datosDisponibles

        ? number(
            registro.operadores_pendientes
          )

        : null;

      const aplica =
        m.requiere_autorizacion === true;

      const brecha =

        aplica && datosDisponibles && minimo > 0

          ? Math.max(
              0,
              number(
                registro.brecha ??
                (minimo - autorizados)
              )
            )

          : null;

      const cumplimiento =

        aplica && datosDisponibles && minimo > 0

          ? porcentaje(
              autorizados,
              minimo
            )

          : null;

      const resultado = {

        ...m,

        datosDisponibles,

        minimo_operadores: minimo,

        operadores_autorizados:
          autorizados,

        operadores_pendientes:
          pendientes,

        brecha,

        cumplimiento,

        estado_backend:
          registro?.estado ||
          'NO_DISPONIBLE'

      };

      return {

        ...resultado,

        nivel: clasificar(resultado)

      };

    });

  }, [catalogo, polivalencia]);

  // ==========================================
  // CATÁLOGO DE PROCESOS
  // ==========================================

  const procesos = useMemo(() => {

    const items = new Set();

    maquinas.forEach(m => {

      (m.procesos || []).forEach(p => {

        if (p) items.add(p);

      });

    });

    return [...items].sort(
      (a, b) => a.localeCompare(b, 'es')
    );

  }, [maquinas]);

  // ==========================================
  // INDICADORES GENERALES
  // ==========================================

  const indicadores = useMemo(() => {

    const aplicables = maquinas.filter(

      m => m.requiere_autorizacion === true

    );

    const evaluables = aplicables.filter(

      m =>

        m.datosDisponibles &&

        m.minimo_operadores > 0

    );

    const cumple = evaluables.filter(

      m =>

        m.operadores_autorizados >=
        m.minimo_operadores

    );

    const conBrecha = evaluables.filter(

      m => m.brecha > 0

    );

    const minimoTotal = evaluables.reduce(

      (sum, m) =>
        sum + m.minimo_operadores,

      0

    );

    // Limitar cada máquina a su meta evita
    // compensar brechas con excedentes de otra.

    const posicionesCubiertas =
      evaluables.reduce(

        (sum, m) =>

          sum + Math.min(
            m.operadores_autorizados,
            m.minimo_operadores
          ),

        0

      );

    const brechaTotal = evaluables.reduce(

      (sum, m) => sum + m.brecha,

      0

    );

    return {

      totalMaquinas: maquinas.length,

      aplicables: aplicables.length,

      evaluables: evaluables.length,

      cumplen: cumple.length,

      conBrecha: conBrecha.length,

      sinOperadores: aplicables.filter(

        m =>

          m.datosDisponibles &&

          m.operadores_autorizados === 0

      ).length,

      operadorUnico: aplicables.filter(

        m =>

          m.datosDisponibles &&

          m.operadores_autorizados === 1

      ).length,

      sinMeta: aplicables.filter(

        m => m.minimo_operadores <= 0

      ).length,

      sinDatos: aplicables.filter(

        m => !m.datosDisponibles

      ).length,

      minimoTotal,

      posicionesCubiertas,

      brechaTotal,

      cumplimientoMaquinas:
        porcentaje(
          cumple.length,
          evaluables.length
        ),

      coberturaPosiciones:
        porcentaje(
          posicionesCubiertas,
          minimoTotal
        )

    };

  }, [maquinas]);

  // ==========================================
  // FILTROS Y RANKING
  // ==========================================

  const filtered = useMemo(() => {

    const term = normalize(search);

    const resultado = maquinas.filter(m => {

      if (

        filterProceso !== 'TODOS' &&

        !(m.procesos || []).includes(
          filterProceso
        )

      ) {

        return false;

      }

      if (

        filterNivel === 'CON_BRECHA' &&

        !(m.brecha > 0)

      ) {

        return false;

      }

      if (

        filterNivel === 'META_CUMPLIDA' &&

        !(
          m.requiere_autorizacion &&
          m.datosDisponibles &&
          m.minimo_operadores > 0 &&
          m.brecha === 0
        )

      ) {

        return false;

      }

      if (

        ![
          'TODOS',
          'CON_BRECHA',
          'META_CUMPLIDA'
        ].includes(filterNivel) &&

        m.nivel !== filterNivel

      ) {

        return false;

      }

      if (!term) return true;

      return [

        m.codigo,

        m.nombre,

        m.area,

        ...(m.procesos || [])

      ].some(value =>

        normalize(value).includes(term)

      );

    });

    return resultado.sort((a, b) => {

      if (orden === 'MAYOR_BRECHA') {

        return (

          (b.brecha ?? -1) -
          (a.brecha ?? -1)

        ) || a.nombre.localeCompare(
          b.nombre, 'es'
        );

      }

      if (orden === 'MENOR_COBERTURA') {

        return (

          (a.cumplimiento ?? Infinity) -
          (b.cumplimiento ?? Infinity)

        ) || a.nombre.localeCompare(
          b.nombre, 'es'
        );

      }

      if (orden === 'MAYOR_COBERTURA') {

        return (

          (b.cumplimiento ?? -1) -
          (a.cumplimiento ?? -1)

        ) || a.nombre.localeCompare(
          b.nombre, 'es'
        );

      }

      if (orden === 'NOMBRE') {

        return a.nombre.localeCompare(
          b.nombre, 'es'
        );

      }

      // Primero máquinas sin cobertura,
      // después dependencia de un solo operador,
      // luego equipos con brecha.

      return (

        NIVELES[a.nivel].prioridad -
        NIVELES[b.nivel].prioridad

      ) || (

        (b.brecha ?? -1) -
        (a.brecha ?? -1)

      ) || a.nombre.localeCompare(
        b.nombre, 'es'
      );

    });

  }, [
    maquinas,
    search,
    filterProceso,
    filterNivel,
    orden
  ]);

  // ==========================================
  // PRIORIDADES DE CAPACITACIÓN
  // ==========================================

  const prioridades = useMemo(() => {

    return maquinas

      .filter(m =>

        m.requiere_autorizacion &&

        m.datosDisponibles &&

        (
          m.brecha > 0 ||
          m.operadores_autorizados <= 1
        )

      )

      .sort((a, b) =>

        NIVELES[a.nivel].prioridad -
        NIVELES[b.nivel].prioridad ||

        (b.brecha ?? 0) -
        (a.brecha ?? 0) ||

        a.nombre.localeCompare(
          b.nombre, 'es'
        )

      )

      .slice(0, 10);

  }, [maquinas]);

  // ==========================================
  // DETALLE POR MÁQUINA
  // ==========================================

  const selected = maquinas.find(

    m => m.id === selectedId

  );

  const operadoresDetalle = useMemo(() => {

    if (!selectedId) return [];

    return matriz

      .filter(r =>

        r.maquina_id === selectedId &&

        r.estado !== 'INACTIVO'

      )

      .sort((a, b) =>

        Number(b.autorizado === true) -
        Number(a.autorizado === true) ||

        a.colaborador.localeCompare(
          b.colaborador, 'es'
        )

      );

  }, [matriz, selectedId]);

  const operadoresAutorizados =
    operadoresDetalle.filter(

      r => r.autorizado === true

    );

  const pendientesVoBo =
    operadoresDetalle.filter(

      r =>

        !r.autorizado &&

        [
          'PENDIENTE_VOBO',
          'PENDIENTE',
          'CAPACITADO'
        ].includes(r.estado)

    );

  const candidatos =
    operadoresDetalle.filter(

      r =>

        !r.autorizado &&

        [
          'SIN_CAPACITACION',
          'SIN_AUTORIZACION'
        ].includes(r.estado)

    );

  const requierenRevision =
    operadoresDetalle.filter(

      r =>

        !r.autorizado &&

        !pendientesVoBo.some(
          p => p.colaborador_id ===
            r.colaborador_id
        ) &&

        !candidatos.some(
          p => p.colaborador_id ===
            r.colaborador_id
        ) &&

        r.estado !==
          'NO_REQUIERE_AUTORIZACION'

    );

  function limpiarFiltros() {

    setSearch('');
    setFilterProceso('TODOS');
    setFilterNivel('TODOS');
    setOrden('PRIORIDAD');
    setSelectedId(null);

  }

  // ==========================================
  // EXPORTACIÓN A EXCEL
  // ==========================================

  function exportarExcel() {

    if (

      loading ||

      exporting ||

      error ||

      !filtered.length

    ) return;

    setExporting(true);
    setError('');
    setSuccess('');

    try {

      const wb = XLSX.utils.book_new();

      // ======================================
      // HOJA 1: POLIVALENCIA
      // ======================================

      const filas = [

        [

          'Código',

          'Máquina',

          'Proceso',

          'Mínimo requerido',

          'Operadores autorizados',

          'Brecha',

          'Cumplimiento',

          'Nivel de cobertura',

          'Estado Supabase'

        ],

        ...filtered.map(m => [

          textValue(m.codigo),

          textValue(m.nombre),

          textValue(
            (m.procesos || []).join(', ')
          ),

          m.requiere_autorizacion

            ? m.minimo_operadores

            : 'N/A',

          m.requiere_autorizacion

            ? m.operadores_autorizados ?? 'N/D'

            : 'N/A',

          m.brecha ?? 'N/A',

          m.cumplimiento == null

            ? 'N/A'

            : m.cumplimiento / 100,

          NIVELES[m.nivel].label,

          textValue(m.estado_backend)

        ])

      ];

      const ws = XLSX.utils.aoa_to_sheet(
        filas
      );

      ws['!cols'] = [

        { wch: 15 },

        { wch: 40 },

        { wch: 35 },

        { wch: 20 },

        { wch: 24 },

        { wch: 12 },

        { wch: 18 },

        { wch: 32 },

        { wch: 30 }

      ];

      for (let r = 1; r < filas.length; r++) {

        const address =
          XLSX.utils.encode_cell({

            r,

            c: 6

          });

        if (ws[address]?.t === 'n') {

          ws[address].z = '0.0%';

        }

      }

      ws['!autofilter'] = {

        ref: ws['!ref']

      };

      XLSX.utils.book_append_sheet(

        wb,

        ws,

        'Polivalencia'

      );

      // ======================================
      // HOJA 2: PRIORIDADES
      // ======================================

      const wsPrioridades =
        XLSX.utils.aoa_to_sheet([

          [

            'Prioridad',

            'Máquina',

            'Autorizados',

            'Mínimo requerido',

            'Brecha',

            'Clasificación'

          ],

          ...prioridades.map((m, index) => [

            index + 1,

            textValue(m.nombre),

            m.operadores_autorizados,

            m.minimo_operadores,

            m.brecha ?? 'N/A',

            NIVELES[m.nivel].label

          ])

        ]);

      wsPrioridades['!cols'] = [

        { wch: 12 },

        { wch: 40 },

        { wch: 18 },

        { wch: 22 },

        { wch: 12 },

        { wch: 32 }

      ];

      XLSX.utils.book_append_sheet(

        wb,

        wsPrioridades,

        'Prioridades'

      );

      // ======================================
      // HOJA 3: OPERADORES POR MÁQUINA
      // ======================================

      const idsVisibles = new Set(

        filtered.map(m => m.id)

      );

      const wsOperadores =
        XLSX.utils.aoa_to_sheet([

          [

            'Máquina',

            'Colaborador',

            'Puesto',

            'Líder',

            'Estado',

            'Autorizado'

          ],

          ...matriz

            .filter(r =>
              idsVisibles.has(r.maquina_id)
            )

            .map(r => [

              textValue(r.maquina),

              textValue(r.colaborador),

              textValue(r.puesto),

              r.es_lider ? 'SÍ' : 'NO',

              textValue(r.estado),

              r.autorizado ? 'SÍ' : 'NO'

            ])

        ]);

      wsOperadores['!cols'] = [

        { wch: 35 },

        { wch: 40 },

        { wch: 30 },

        { wch: 12 },

        { wch: 30 },

        { wch: 15 }

      ];

      wsOperadores['!autofilter'] = {

        ref: wsOperadores['!ref']

      };

      XLSX.utils.book_append_sheet(

        wb,

        wsOperadores,

        'Operadores'

      );

      // ======================================
      // HOJA 4: RESUMEN EJECUTIVO
      // ======================================

      const wsResumen =
        XLSX.utils.aoa_to_sheet([

          ['TRANSMETAL'],

          ['REPORTE DE POLIVALENCIA'],

          ['Fecha de consulta', fechaGuatemala()],

          [],

          ['Indicador', 'Valor'],

          [
            'Máquinas registradas',
            indicadores.totalMaquinas
          ],

          [
            'Máquinas sujetas a autorización',
            indicadores.aplicables
          ],

          [
            'Máquinas evaluables',
            indicadores.evaluables
          ],

          [
            'Máquinas que cumplen',
            indicadores.cumplen
          ],

          [
            'Máquinas con brecha',
            indicadores.conBrecha
          ],

          [
            'Sin operadores autorizados',
            indicadores.sinOperadores
          ],

          [
            'Dependencia de un operador',
            indicadores.operadorUnico
          ],

          [
            'Posiciones requeridas',
            indicadores.minimoTotal
          ],

          [
            'Posiciones cubiertas',
            indicadores.posicionesCubiertas
          ],

          [
            'Brecha total',
            indicadores.brechaTotal
          ],

          [

            'Cumplimiento por máquinas',

            indicadores.cumplimientoMaquinas == null

              ? 'N/A'

              : indicadores.cumplimientoMaquinas / 100

          ],

          [

            'Cobertura de posiciones',

            indicadores.coberturaPosiciones == null

              ? 'N/A'

              : indicadores.coberturaPosiciones / 100

          ],

          [
            'Máquinas sin información',
            indicadores.sinDatos
          ],

          [
            'Máquinas sin meta',
            indicadores.sinMeta
          ],

          [],

          ['Filtros aplicados'],

          ['Proceso', textValue(filterProceso)],

          ['Nivel', textValue(filterNivel)],

          ['Búsqueda', textValue(search)],

          [],

          [

            'Advertencias',

            textValue(warning || 'Ninguna')

          ],

          [

            'Nota',

            'Las posiciones representan combinaciones ' +
            'de colaboradores y máquinas, no personas únicas.'

          ],

          [

            'Nota',

            'Los excedentes de una máquina no ' +
            'compensan las brechas de otra.'

          ],

          [

            'Nota',

            'El resumen y las prioridades consideran ' +
            'el catálogo general consultado.'

          ],

          [

            'Nota',

            'Este reporte no sustituye la ' +
            'verificación operativa de autorizaciones.'

          ]

        ]);

      wsResumen['!cols'] = [

        { wch: 45 },

        { wch: 100 }

      ];

      ['B16', 'B17'].forEach(address => {

        if (wsResumen[address]?.t === 'n') {

          wsResumen[address].z = '0.0%';

        }

      });

      XLSX.utils.book_append_sheet(

        wb,

        wsResumen,

        'Resumen ejecutivo'

      );

      XLSX.writeFile(

        wb,

        `Polivalencia_Transmetal_${fechaGuatemala()}.xlsx`

      );

      setSuccess(
        'Reporte de polivalencia generado correctamente.'
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

  const mostrarValor = value =>

    loading || error ? '—' : value;

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (

    <div className="cap-polivalencia">

      {/* ENCABEZADO */}

      <div className="cap-panel cap-toolbar">

        <div>

          <h2>Polivalencia de operadores</h2>

          <p className="cap-muted">

            Cobertura de competencias, continuidad
            operativa y prioridades de capacitación.

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
              !filtered.length
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
          icon={Factory}
          label="Máquinas sujetas a autorización"
          value={mostrarValor(
            indicadores.aplicables
          )}
          description="Equipos activos"
        />

        <KPI
          icon={ShieldCheck}
          label="Máquinas que cumplen"
          value={mostrarValor(
            indicadores.cumplen
          )}
          description={
            `${indicadores.evaluables} evaluables`
          }
          variant="cap-kpi-success"
          color="#15803d"
        />

        <KPI
          icon={Target}
          label="Cumplimiento por máquinas"
          value={mostrarValor(
            formatPercent(
              indicadores.cumplimientoMaquinas
            )
          )}
          description="Máquinas que cumplen / evaluables"
        />

        <KPI
          icon={TrendingUp}
          label="Cobertura de posiciones"
          value={mostrarValor(
            formatPercent(
              indicadores.coberturaPosiciones
            )
          )}
          description="Posiciones cubiertas / requeridas"
        />

        <KPI
          icon={ShieldAlert}
          label="Máquinas con brecha"
          value={mostrarValor(
            indicadores.conBrecha
          )}
          description="Cobertura inferior a la meta"
          variant="cap-kpi-danger"
          color="#b91c1c"
        />

        <KPI
          icon={Users}
          label="Brecha total de posiciones"
          value={mostrarValor(
            indicadores.brechaTotal
          )}
          description="Autorizaciones adicionales requeridas"
          variant="cap-kpi-warning"
          color="#b45309"
        />

        <KPI
          icon={AlertTriangle}
          label="Sin operadores autorizados"
          value={mostrarValor(
            indicadores.sinOperadores
          )}
          description="Máquinas sujetas a autorización"
          variant="cap-kpi-danger"
          color="#b91c1c"
        />

        <KPI
          icon={Users}
          label="Dependencia de un operador"
          value={mostrarValor(
            indicadores.operadorUnico
          )}
          description="Riesgo de continuidad operativa"
          variant="cap-kpi-warning"
          color="#b45309"
        />

      </div>

      {!loading &&
       !error &&
       (
         indicadores.sinDatos > 0 ||
         indicadores.sinMeta > 0
       ) && (

        <div className="cap-alert-warning">

          Existen {indicadores.sinDatos} máquinas
          sin información de polivalencia y
          {' '}{indicadores.sinMeta} máquinas sin
          meta válida.

          Los indicadores de cumplimiento excluyen
          estos casos.

        </div>

      )}

      {/* RESUMEN DE COBERTURA */}

      <div className="cap-panel">

        <h2>Cobertura global de operadores</h2>

        <div className="cap-form-grid">

          <div>

            <h3 style={{ color: '#164b83' }}>

              Posiciones de competencia

            </h3>

            <ProgressBar value={

              loading || error

                ? null

                : indicadores.coberturaPosiciones

            } />

            <p className="cap-muted">

              {mostrarValor(
                indicadores.posicionesCubiertas
              )}

              {' de '}

              {mostrarValor(
                indicadores.minimoTotal
              )}

              {' posiciones cubiertas'}

            </p>

          </div>

          <div>

            <h3 style={{ color: '#164b83' }}>

              Cumplimiento de máquinas

            </h3>

            <ProgressBar value={

              loading || error

                ? null

                : indicadores.cumplimientoMaquinas

            } />

            <p className="cap-muted">

              {mostrarValor(indicadores.cumplen)}

              {' de '}

              {mostrarValor(indicadores.evaluables)}

              {' máquinas cumplen la meta'}

            </p>

          </div>

        </div>

        <div className="cap-alert-info">

          Los operadores adicionales de una máquina
          no compensan el déficit de otra.

          El indicador global considera las
          posiciones cubiertas hasta el mínimo
          requerido de cada equipo.

        </div>

      </div>

      {/* PRIORIDADES */}

      {!loading && !error && (

        <div className="cap-panel">

          <div className="cap-toolbar">

            <h2>

              Prioridades de capacitación

            </h2>

            <span className="cap-muted">

              Hasta 10 equipos prioritarios

            </span>

          </div>

          <p className="cap-muted">

            Orden sugerido según cobertura y
            dependencia de operadores.

            No sustituye la evaluación de criticidad
            productiva o de seguridad del equipo.

          </p>

          {prioridades.length > 0 ? (

            <div className="cap-table-wrap">

              <table>

                <thead>

                  <tr>

                    <th>Prioridad</th>

                    <th>Máquina</th>

                    <th>Autorizados</th>

                    <th>Mínimo</th>

                    <th>Brecha</th>

                    <th>Clasificación</th>

                    <th>Detalle</th>

                  </tr>

                </thead>

                <tbody>

                  {prioridades.map((m, index) => (

                    <tr key={m.id}>

                      <td>

                        <strong>

                          {index + 1}

                        </strong>

                      </td>

                      <td>

                        <strong>

                          {m.nombre}

                        </strong>

                        <div className="cap-muted">

                          {(m.procesos || []).join(', ')}

                        </div>

                      </td>

                      <td>

                        {m.operadores_autorizados}

                      </td>

                      <td>

                        {m.minimo_operadores}

                      </td>

                      <td>

                        <strong style={{
                          color: m.brecha > 0
                            ? '#b91c1c'
                            : '#64748b'
                        }}>

                          {m.brecha ?? 'N/A'}

                        </strong>

                      </td>

                      <td>

                        <Nivel value={m.nivel} />

                      </td>

                      <td>

                        <button
                          type="button"
                          className="cap-secondary"
                          onClick={() =>
                            setSelectedId(m.id)
                          }
                        >

                          <Eye size={16} />

                          Ver operadores

                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          ) : (

            <div className="cap-welcome">

              <ShieldCheck
                size={40}
                color="#15803d"
              />

              <h2>

                Sin prioridades detectadas

              </h2>

              <p>

                No se identificaron brechas ni
                dependencia de un único operador
                en los equipos con datos disponibles.

              </p>

            </div>

          )}

        </div>

      )}

      {/* DETALLE DE OPERADORES */}

      {selected && (

        <div className="cap-panel">

          <div className="cap-toolbar">

            <h2>

              {selected.nombre}

            </h2>

            <button
              type="button"
              className="cap-secondary"
              onClick={() =>
                setSelectedId(null)
              }
            >

              <X size={16} />

              Cerrar

            </button>

          </div>

          <p className="cap-muted">

            {(selected.procesos || []).join(', ')}

          </p>

          <Nivel value={selected.nivel} />

          <div
            className="cap-kpi-grid"
            style={{ marginTop: 20 }}
          >

            <KPI
              icon={Target}
              label="Mínimo requerido"
              value={
                selected.requiere_autorizacion
                  ? selected.minimo_operadores
                  : 'N/A'
              }
            />

            <KPI
              icon={ShieldCheck}
              label="Operadores autorizados"
              value={
                selected.operadores_autorizados ??
                'N/D'
              }
              variant="cap-kpi-success"
              color="#15803d"
            />

            <KPI
              icon={Users}
              label="Brecha"
              value={selected.brecha ?? 'N/A'}
              variant="cap-kpi-warning"
              color="#b45309"
            />

          </div>

          {!selected.requiere_autorizacion ? (

            <div className="cap-alert-info">

              Esta máquina no requiere autorización.
              Se excluye del indicador de polivalencia.

            </div>

          ) : (

            <>

              {warning && (

                <div className="cap-alert-warning">

                  El detalle individual podría estar
                  incompleto. Verifica los datos
                  antes de planificar capacitaciones.

                </div>

              )}

              {operadoresAutorizados.length !==
                selected.operadores_autorizados &&
                selected.datosDisponibles && (

                <div className="cap-alert-warning">

                  El número de operadores del detalle
                  no coincide con la consulta agregada.
                  Actualiza y verifica la información.

                </div>

              )}

              {[

                {

                  titulo: 'Operadores autorizados',

                  registros: operadoresAutorizados,

                  color: '#15803d',

                  icon: ShieldCheck

                },

                {

                  titulo: 'Pendientes de VoBo',

                  registros: pendientesVoBo,

                  color: '#b45309',

                  icon: Target

                },

                {

                  titulo: 'Candidatos potenciales',

                  registros: candidatos,

                  color: '#164b83',

                  icon: GraduationCap

                },

                {

                  titulo: 'Casos que requieren revisión',

                  registros: requierenRevision,

                  color: '#b91c1c',

                  icon: ShieldAlert

                }

              ].map(grupo => {

                const Icon = grupo.icon;

                return (

                  <div
                    key={grupo.titulo}
                    style={{ marginTop: 25 }}
                  >

                    <div style={{

                      display: 'flex',

                      alignItems: 'center',

                      gap: 10,

                      marginBottom: 12

                    }}>

                      <Icon
                        size={22}
                        color={grupo.color}
                      />

                      <h3 style={{
                        margin: 0,
                        color: grupo.color
                      }}>

                        {grupo.titulo}

                        {' ('}

                        {grupo.registros.length}

                        {')'}

                      </h3>

                    </div>

                    {grupo.registros.length ? (

                      <div className="cap-table-wrap">

                        <table>

                          <thead>

                            <tr>

                              <th>Colaborador</th>

                              <th>Puesto</th>

                              <th>Estado</th>

                              <th>Líder</th>

                            </tr>

                          </thead>

                          <tbody>

                            {grupo.registros.map(r => (

                              <tr key={r.colaborador_id}>

                                <td>

                                  <strong>

                                    {r.colaborador}

                                  </strong>

                                </td>

                                <td>

                                  {r.puesto || '—'}

                                </td>

                                <td>

                                  <span className={

                                    r.autorizado

                                      ? 'cap-status cap-status-success'

                                      : 'cap-status cap-status-neutral'

                                  }>

                                    {String(r.estado)
                                      .replaceAll('_', ' ')}

                                  </span>

                                </td>

                                <td>

                                  {r.es_lider ? 'SÍ' : 'NO'}

                                </td>

                              </tr>

                            ))}

                          </tbody>

                        </table>

                      </div>

                    ) : (

                      <p className="cap-muted">

                        No hay registros disponibles
                        en esta categoría.

                      </p>

                    )}

                  </div>

                );

              })}

              <div
                className="cap-alert-info"
                style={{ marginTop: 20 }}
              >

                Los candidatos son colaboradores
                sin capacitación o autorización
                registrada en esta máquina.

                Antes de seleccionarlos, verifica
                su puesto, disponibilidad, aptitud,
                requisitos de seguridad y necesidad
                real de entrenamiento.

              </div>

            </>

          )}

        </div>

      )}

      {/* FILTROS */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>Filtros de polivalencia</h2>

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
            aria-label="Buscar máquinas"
            placeholder="Buscar máquina, código o proceso..."
            onChange={e =>
              setSearch(e.target.value)
            }
          />

        </div>

        <div className="cap-form-grid">

          <div className="cap-field">

            <label htmlFor="cap-poli-proceso">

              Proceso

            </label>

            <select
              id="cap-poli-proceso"
              value={filterProceso}
              onChange={e =>
                setFilterProceso(e.target.value)
              }
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

            <label htmlFor="cap-poli-nivel">

              Nivel de cobertura

            </label>

            <select
              id="cap-poli-nivel"
              value={filterNivel}
              onChange={e =>
                setFilterNivel(e.target.value)
              }
            >

              <option value="TODOS">

                Todos los niveles

              </option>

              <option value="CON_BRECHA">

                Todas las máquinas con brecha

              </option>

              <option value="META_CUMPLIDA">

                Todas las máquinas que cumplen

              </option>

              {Object.entries(NIVELES).map(
                ([value, config]) => (

                  <option
                    key={value}
                    value={value}
                  >

                    {config.label}

                  </option>

                )
              )}

            </select>

          </div>

          <div className="cap-field">

            <label htmlFor="cap-poli-orden">

              Ordenar por

            </label>

            <select
              id="cap-poli-orden"
              value={orden}
              onChange={e =>
                setOrden(e.target.value)
              }
            >

              <option value="PRIORIDAD">

                Prioridad de capacitación

              </option>

              <option value="MAYOR_BRECHA">

                Mayor brecha

              </option>

              <option value="MENOR_COBERTURA">

                Menor cobertura

              </option>

              <option value="MAYOR_COBERTURA">

                Mayor cobertura

              </option>

              <option value="NOMBRE">

                Nombre alfabético

              </option>

            </select>

          </div>

        </div>

      </div>

      {/* TABLA GENERAL */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>Polivalencia por máquina</h2>

          <span className="cap-muted">

            {filtered.length}

            {' de '}

            {maquinas.length}

            {' máquinas'}

          </span>

        </div>

        {loading ? (

          <div className="cap-welcome" role="status">

            <RefreshCw size={32} />

            <p>

              Cargando indicadores de polivalencia...

            </p>

          </div>

        ) : (

          <div className="cap-table-wrap">

            <table>

              <thead>

                <tr>

                  <th>Máquina</th>

                  <th>Procesos</th>

                  <th>Mínimo requerido</th>

                  <th>Autorizados</th>

                  <th>Pendientes</th>

                  <th>Brecha</th>

                  <th>Cumplimiento</th>

                  <th>Nivel</th>

                  <th>Acciones</th>

                </tr>

              </thead>

              <tbody>

                {filtered.map(m => (

                  <tr key={m.id}>

                    <td>

                      <strong>

                        {m.nombre}

                      </strong>

                      <div className="cap-muted">

                        {m.codigo}

                      </div>

                    </td>

                    <td>

                      {(m.procesos || []).join(', ') ||
                        '—'}

                    </td>

                    <td>

                      <strong>

                        {m.requiere_autorizacion

                          ? m.minimo_operadores

                          : 'N/A'}

                      </strong>

                    </td>

                    <td>

                      <strong style={{
                        color: '#15803d'
                      }}>

                        {m.requiere_autorizacion

                          ? m.operadores_autorizados ??
                            'N/D'

                          : 'N/A'}

                      </strong>

                    </td>

                    <td>

                      {m.requiere_autorizacion

                        ? m.operadores_pendientes ??
                          'N/D'

                        : 'N/A'}

                    </td>

                    <td>

                      <strong style={{

                        color: m.brecha > 0

                          ? '#b91c1c'

                          : '#64748b'

                      }}>

                        {m.brecha ?? 'N/A'}

                      </strong>

                    </td>

                    <td>

                      <ProgressBar
                        value={m.cumplimiento}
                      />

                    </td>

                    <td>

                      <Nivel value={m.nivel} />

                      <div className="cap-muted">

                        {String(m.estado_backend)
                          .replaceAll('_', ' ')}

                      </div>

                    </td>

                    <td>

                      <button
                        type="button"
                        className="cap-secondary"
                        onClick={() =>
                          setSelectedId(m.id)
                        }
                      >

                        <Eye size={15} />

                        Ver detalle

                      </button>

                    </td>

                  </tr>

                ))}

                {filtered.length === 0 && (

                  <tr>

                    <td
                      colSpan={9}
                      className="cap-empty"
                    >

                      No se encontraron máquinas
                      para los filtros seleccionados.

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        )}

        <p className="cap-muted">

          La cobertura individual puede superar
          el 100% si existen más operadores
          autorizados que el mínimo requerido.

          La cobertura global está limitada
          a la meta de cada máquina.

        </p>

      </div>

    </div>

  );

}
