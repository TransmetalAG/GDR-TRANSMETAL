
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef
} from 'react';

import {
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  ClipboardCheck,
  HeartPulse,
  Award,
  Clock,
  CheckCircle,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  Ban,
  RefreshCw,
  Search,
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

const REQUISITOS = [

  {
    key: 'MOODLE',
    nombre: 'Moodle',
    icon: GraduationCap,
    idField: 'moodle_id',
    reviewField: 'moodle_revisado',
    requiredField: 'requiere_moodle',
    folder: 'moodle'
  },

  {
    key: 'ENTRENAMIENTO',
    nombre: 'Entrenamiento práctico',
    icon: ClipboardCheck,
    idField: 'entrenamiento_id',
    reviewField: 'entrenamiento_revisado',
    requiredField: 'requiere_entrenamiento',
    folder: 'entrenamiento'
  },

  {
    key: 'APTITUD_MEDICA',
    nombre: 'Aptitud médica',
    icon: HeartPulse,
    idField: 'aptitud_medica_id',
    reviewField: 'aptitud_medica_revisada',
    requiredField: 'requiere_aptitud_medica',
    folder: 'aptitud-medica'
  }

];

const ACCIONES = {

  AUTORIZAR: {
    nombre: 'Emitir VoBo',
    rpc: 'cap_autorizar_rc',
    icon: ShieldCheck,
    estados: ['PENDIENTE'],
    requiereMotivo: false,
    mensaje:
      'Se autorizará al colaborador para el riesgo ' +
      'crítico seleccionado, sujeto a los requisitos ' +
      'obligatorios verificados por Supabase.'
  },

  DEVOLVER: {
    nombre: 'Devolver requisito',
    rpc: 'cap_devolver_rc',
    icon: RotateCcw,
    estados: ['PENDIENTE'],
    requiereMotivo: true,
    mensaje:
      'Se devolverá el requisito seleccionado ' +
      'para su corrección y nueva validación.'
  },

  SUSPENDER: {
    nombre: 'Suspender autorización',
    rpc: 'cap_suspender_rc',
    icon: PauseCircle,
    estados: ['AUTORIZADA'],
    requiereMotivo: true,
    mensaje:
      'Se suspenderá temporalmente la autorización ' +
      'operativa correspondiente.'
  },

  REACTIVAR: {
    nombre: 'Reactivar autorización',
    rpc: 'cap_reactivar_rc',
    icon: PlayCircle,
    estados: ['SUSPENDIDA'],
    requiereMotivo: true,
    mensaje:
      'Supabase verificará nuevamente los requisitos ' +
      'antes de permitir la reactivación.'
  },

  REVOCAR: {
    nombre: 'Revocar autorización',
    rpc: 'cap_revocar_rc',
    icon: Ban,
    estados: ['AUTORIZADA', 'SUSPENDIDA'],
    requiereMotivo: true,
    mensaje:
      'Se revocará definitivamente esta autorización. ' +
      'El registro no podrá reactivarse.'
  },

  RECUPERACION: {
    nombre: 'Habilitar recuperación médica',
    rpc: 'cap_habilitar_recuperacion_rc',
    icon: HeartPulse,
    estados: ['SUSPENDIDA'],
    requiereMotivo: true,
    mensaje:
      'Se solicitará habilitar el procedimiento ' +
      'de recuperación posterior a una restricción ' +
      'médica. Esta acción no autoriza la operación.'
  }

};

const initialReviews = {
  MOODLE: false,
  ENTRENAMIENTO: false,
  APTITUD_MEDICA: false
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

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {

    const [year, month, day] = value.split('-');

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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);

}

function diasRestantes(fecha) {

  if (!fecha) return null;

  return Math.round(

    (
      Date.parse(`${fecha}T00:00:00Z`) -
      Date.parse(`${fechaGuatemala()}T00:00:00Z`)
    ) / 86400000

  );

}

function statusClass(estado) {

  if ([
    'AUTORIZADO',
    'AUTORIZADA',
    'VALIDADO',
    'APTO',
    'VIGENTE'
  ].includes(estado)) {

    return 'cap-status cap-status-success';

  }

  if ([
    'PENDIENTE',
    'PENDIENTE_VOBO',
    'PROXIMO_A_VENCER',
    'REQUISITOS_PENDIENTES',
    'DEVUELTA',
    'DEVUELTO'
  ].includes(estado)) {

    return 'cap-status cap-status-warning';

  }

  if ([
    'SUSPENDIDO',
    'SUSPENDIDA',
    'REVOCADO',
    'REVOCADA',
    'NO_APTO',
    'NO_AUTORIZADO',
    'VENCIDO',
    'CRITICO',
    'REQUISITOS_INCOMPLETOS'
  ].includes(estado)) {

    return 'cap-status cap-status-danger';

  }

  return 'cap-status cap-status-neutral';

}

function Estado({
  value,
  optional = false
}) {

  return (

    <span className={
      optional
        ? 'cap-status cap-status-optional'
        : statusClass(value)
    }>

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

export default function AutorizacionesRC({
  client,
  role
}) {

  const canManage =
    role === 'JEFE_PRODUCCION';

  const canReadDetails = [
    'JEFE_PRODUCCION',
    'ING_PROCESOS'
  ].includes(role);

  const [matriz, setMatriz] =
    useState([]);

  const [riesgos, setRiesgos] =
    useState([]);

  const [asignaciones, setAsignaciones] =
    useState([]);

  const [autorizaciones, setAutorizaciones] =
    useState([]);

  const [registros, setRegistros] =
    useState([]);

  const [evidencias, setEvidencias] =
    useState([]);

  const [vencimientos, setVencimientos] =
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

  const [filterRC, setFilterRC] =
    useState('TODOS');

  const [filterEstado, setFilterEstado] =
    useState(
      canManage ? 'PENDIENTE' : 'TODOS'
    );

  const [selectedId, setSelectedId] =
    useState(null);

  const selectionRef = useRef(null);

  const [accion, setAccion] =
    useState(null);

  const [motivo, setMotivo] =
    useState('');

  const [requisitoDevuelto, setRequisitoDevuelto] =
    useState('');

  const [reviews, setReviews] =
    useState({ ...initialReviews });

  const [openedDocuments, setOpenedDocuments] =
    useState([]);

  const [openingId, setOpeningId] =
    useState(null);

  const [confirmacion, setConfirmacion] =
    useState(false);

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
            requiere_moodle,
            requiere_entrenamiento,
            requiere_aptitud_medica,
            requiere_autorizacion,
            activo
          `)
          .order('orden')

      ]);

      if (matrizResponse.error) {
        throw matrizResponse.error;
      }

      if (riesgosResponse.error) {
        throw riesgosResponse.error;
      }

      setMatriz(matrizResponse.data || []);

      setRiesgos(riesgosResponse.data || []);

      // Gestor RC y Consulta únicamente
      // reciben información operativa general.

      if (!canReadDetails) {

        setAutorizaciones([]);
        setAsignaciones([]);
        setRegistros([]);
        setEvidencias([]);
        setVencimientos([]);

        return;

      }

      const [
        autorizacionesResponse,
        vencimientosResponse
      ] = await Promise.all([

        client
          .from('cap_rc_autorizaciones')
          .select(`
            id,
            asignacion_id,
            moodle_id,
            entrenamiento_id,
            aptitud_medica_id,
            moodle_revisado,
            entrenamiento_revisado,
            aptitud_medica_revisada,
            estado,
            tipo_solicitud,
            autorizacion_anterior_id,
            fecha_autorizacion,
            fecha_vencimiento,
            observaciones,
            motivo_devolucion,
            motivo_suspension,
            motivo_revocacion,
            fecha_devolucion,
            requisito_devuelto,
            fecha_suspension,
            fecha_revocacion,
            fecha_reactivacion,
            motivo_reactivacion,
            recuperacion_habilitada_por,
            fecha_habilitacion_recuperacion,
            motivo_recuperacion,
            created_at
          `)
          .order('created_at', {
            ascending: false
          })
          .order('id', {
            ascending: false
          })
          .range(0, 999),

        client.rpc('cap_consultar_vencimientos')

      ]);

      if (autorizacionesResponse.error) {
        throw autorizacionesResponse.error;
      }

      if (vencimientosResponse.error) {
        throw vencimientosResponse.error;
      }

      const autorizacionesData =
        autorizacionesResponse.data || [];

      const asignacionIds = [...new Set(

        autorizacionesData
          .map(a => a.asignacion_id)
          .filter(Boolean)

      )];

      const asignacionesData = [];

      for (
        let i = 0;
        i < asignacionIds.length;
        i += 100
      ) {

        const { data, error } = await client

          .from('cap_rc_asignaciones')

          .select(`
            id,
            colaborador_id,
            riesgo_critico_id,
            aplica,
            activo
          `)

          .in(
            'id',
            asignacionIds.slice(i, i + 100)
          );

        if (error) throw error;

        asignacionesData.push(...(data || []));

      }

      // Consultar colaboradores históricos,
      // incluyendo colaboradores inactivos.

      const colaboradorIds = [...new Set(

        asignacionesData
          .map(a => a.colaborador_id)
          .filter(Boolean)

      )];

      const colaboradoresData = [];

      for (
        let i = 0;
        i < colaboradorIds.length;
        i += 100
      ) {

        const { data, error } = await client

          .from('cap_colaboradores')

          .select('id,codigo,nombre,puesto,activo')

          .in(
            'id',
            colaboradorIds.slice(i, i + 100)
          );

        if (error) throw error;

        colaboradoresData.push(...(data || []));

      }

      const colaboradoresMap = new Map(

        colaboradoresData.map(c => [c.id, c])

      );

      setAsignaciones(

        asignacionesData.map(a => ({

          ...a,

          colaborador:
            colaboradoresMap.get(a.colaborador_id)

        }))

      );

      // Recuperar exclusivamente los requisitos
      // vinculados a cada autorización.

      const registroIds = [...new Set(

        autorizacionesData.flatMap(a => [

          a.moodle_id,

          a.entrenamiento_id,

          a.aptitud_medica_id

        ]).filter(Boolean)

      )];

      const registrosData = [];

      for (
        let i = 0;
        i < registroIds.length;
        i += 100
      ) {

        const { data, error } = await client

          .from('cap_rc_registros')

          .select(`
            id,
            asignacion_id,
            tipo_requisito,
            fecha_realizacion,
            fecha_vencimiento,
            estado,
            resultado_aptitud,
            cuenta_certificacion,
            institucion,
            fecha_certificacion,
            vencimiento_certificacion,
            fecha_validacion,
            observaciones
          `)

          .in(
            'id',
            registroIds.slice(i, i + 100)
          );

        if (error) throw error;

        registrosData.push(...(data || []));

      }

      // El jefe puede consultar todos los documentos.
      // El ingeniero únicamente los médicos.

      const evidenciaIds = registrosData
        .filter(r =>

          canManage ||
          r.tipo_requisito === 'APTITUD_MEDICA'

        )
        .map(r => r.id);

      const evidenciasData = [];

      for (
        let i = 0;
        i < evidenciaIds.length;
        i += 100
      ) {

        const { data, error } = await client

          .from('cap_rc_evidencias')

          .select(`
            id,
            registro_id,
            tipo_evidencia,
            archivo_nombre,
            archivo_path
          `)

          .in(
            'registro_id',
            evidenciaIds.slice(i, i + 100)
          );

        if (error) throw error;

        evidenciasData.push(...(data || []));

      }

      setAutorizaciones(autorizacionesData);
      setRegistros(registrosData);
      setEvidencias(evidenciasData);

      setVencimientos(
        vencimientosResponse.data || []
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
    canManage,
    canReadDetails
  ]);

  useEffect(() => {

    setMatriz([]);
    setRiesgos([]);
    setAsignaciones([]);
    setAutorizaciones([]);
    setRegistros([]);
    setEvidencias([]);
    setVencimientos([]);

    selectionRef.current = null;

    setSelectedId(null);
    setAccion(null);
    setSuccess('');

    setReviews({ ...initialReviews });

    setOpenedDocuments([]);

    setFilterEstado(
      canManage ? 'PENDIENTE' : 'TODOS'
    );

    cargarDatos();

  }, [cargarDatos, canManage]);

  // ==========================================
  // RELACIONES
  // ==========================================

  const riesgosMap = useMemo(() => {

    return new Map(
      riesgos.map(r => [r.id, r])
    );

  }, [riesgos]);

  const asignacionesMap = useMemo(() => {

    return new Map(
      asignaciones.map(a => [a.id, a])
    );

  }, [asignaciones]);

  const registrosMap = useMemo(() => {

    return new Map(
      registros.map(r => [r.id, r])
    );

  }, [registros]);

  const matrizMap = useMemo(() => {

    return new Map(

      matriz
        .filter(a => a.asignacion_id)
        .map(a => [a.asignacion_id, a])

    );

  }, [matriz]);

  const evidenciasMap = useMemo(() => {

    const map = new Map();

    evidencias.forEach(e => {

      if (!map.has(e.registro_id)) {

        map.set(e.registro_id, []);

      }

      map.get(e.registro_id).push(e);

    });

    return map;

  }, [evidencias]);

  const solicitudes = useMemo(() => {

    return autorizaciones.map(a => {

      const asignacion =
        asignacionesMap.get(a.asignacion_id);

      const riesgo =
        riesgosMap.get(
          asignacion?.riesgo_critico_id
        );

      const estadoActual =
        matrizMap.get(a.asignacion_id);

      return {

        ...a,

        asignacion,

        riesgo,

        colaborador:
          asignacion?.colaborador,

        estadoActual

      };

    });

  }, [
    autorizaciones,
    asignacionesMap,
    riesgosMap,
    matrizMap
  ]);

  const selected = solicitudes.find(
    a => a.id === selectedId
  );

  // ==========================================
  // REQUISITOS DE LA SOLICITUD
  // ==========================================

  const requisitosSolicitud = useMemo(() => {

    if (!selected) return [];

    return REQUISITOS.map(req => {

      const registro =
        registrosMap.get(
          selected[req.idField]
        );

      const documentos =
        evidenciasMap.get(registro?.id) || [];

      // Excluir certificaciones adicionales
      // de los documentos obligatorios.

      const documentosObligatorios =
        documentos.filter(e =>

          e.tipo_evidencia !==
            'DIPLOMA_CERTIFICACION' &&

          e.archivo_path?.startsWith(
            `${req.folder}/`
          )

        );

      const obligatorio =
        selected.riesgo
          ? selected.riesgo[req.requiredField] !== false
          : true;

      const dias =
        diasRestantes(
          registro?.fecha_vencimiento
        );

      const vigente = Boolean(

        registro &&

        registro.estado === 'VALIDADO' &&

        dias !== null &&

        dias >= 0 &&

        (
          req.key !== 'APTITUD_MEDICA' ||

          registro.resultado_aptitud === 'APTO'
        )

      );

      const documentoAbierto =
        documentosObligatorios.some(e =>

          openedDocuments.includes(e.id)

        );

      return {

        ...req,

        registro,

        obligatorio,

        documentos:
          documentosObligatorios,

        vigente,

        dias,

        documentoAbierto,

        revisadoAnteriormente:
          Boolean(selected[req.reviewField])

      };

    });

  }, [
    selected,
    registrosMap,
    evidenciasMap,
    openedDocuments
  ]);

  const puedeEmitirVoBo = Boolean(

    selected?.estado === 'PENDIENTE' &&

    selected?.asignacion?.activo &&

    selected?.asignacion?.aplica &&

    selected?.colaborador?.activo &&

    selected?.riesgo?.activo &&

    requisitosSolicitud.every(req =>

      !req.obligatorio ||

      (
        req.vigente &&
        req.documentoAbierto &&
        reviews[req.key]
      )

    )

  );

  // ==========================================
  // CERTIFICACIÓN INDEPENDIENTE
  // ==========================================

  const certificacion = useMemo(() => {

    if (!selected) return null;

    return vencimientos.find(v =>

      v.asignacion_id ===
        selected.asignacion_id &&

      v.requisito === 'CERTIFICACION'

    ) || null;

  }, [selected, vencimientos]);

  const entrenamiento = selected

    ? registrosMap.get(
        selected.entrenamiento_id
      )

    : null;

  const documentosCertificacion = entrenamiento

    ? (
        evidenciasMap.get(entrenamiento.id) ||
        []
      ).filter(e =>

        e.tipo_evidencia ===
          'DIPLOMA_CERTIFICACION' &&

        e.archivo_path?.startsWith(
          'certificaciones/'
        )

      )

    : [];

  // ==========================================
  // INDICADORES
  // ==========================================

  const indicadores = useMemo(() => {

    const aplicables = matriz.filter(a =>

      a.asignacion_id &&

      a.aplica &&

      a.estado !== 'INACTIVO'

    );

    const autorizadas = aplicables.filter(
      a => a.autorizado
    ).length;

    return {

      aplicables: aplicables.length,

      autorizadas,

      pendientes: aplicables.filter(
        a => a.estado === 'PENDIENTE_VOBO'
      ).length,

      suspendidas: aplicables.filter(
        a => a.estado === 'SUSPENDIDO'
      ).length,

      sinAutorizacion:
        aplicables.length - autorizadas,

      revocadas: autorizaciones.filter(
        a => a.estado === 'REVOCADA'
      ).length

    };

  }, [matriz, autorizaciones]);

  // ==========================================
  // FILTROS
  // ==========================================

  const solicitudesFiltradas = useMemo(() => {

    const term = normalize(search);

    return solicitudes.filter(a => {

      if (
        filterEstado !== 'TODOS' &&
        a.estado !== filterEstado
      ) {

        return false;

      }

      if (
        filterRC !== 'TODOS' &&
        a.riesgo?.id !== filterRC
      ) {

        return false;

      }

      if (!term) return true;

      return [

        a.colaborador?.nombre,
        a.colaborador?.codigo,
        a.riesgo?.nombre,
        a.riesgo?.abreviatura,
        a.estado,
        a.tipo_solicitud

      ].some(value =>

        normalize(value).includes(term)

      );

    });

  }, [
    solicitudes,
    search,
    filterEstado,
    filterRC
  ]);

  const matrizFiltrada = useMemo(() => {

    const term = normalize(search);

    return matriz.filter(a => {

      if (
        filterRC !== 'TODOS' &&
        a.riesgo_critico_id !== filterRC
      ) {

        return false;

      }

      if (
        filterEstado === 'AUTORIZADOS' &&
        !a.autorizado
      ) {

        return false;

      }

      if (
        filterEstado === 'NO_AUTORIZADOS' &&
        a.autorizado
      ) {

        return false;

      }

      if (!term) return true;

      return [

        a.colaborador,
        a.riesgo_critico,
        a.abreviatura,
        a.estado

      ].some(value =>

        normalize(value).includes(term)

      );

    });

  }, [
    matriz,
    search,
    filterEstado,
    filterRC
  ]);

  // ==========================================
  // SELECCIONAR SOLICITUD
  // ==========================================

  function seleccionarSolicitud(registro) {

    if (saving) return;

    selectionRef.current = registro.id;

    setSelectedId(registro.id);
    setAccion(null);
    setMotivo('');
    setRequisitoDevuelto('');
    setReviews({ ...initialReviews });
    setOpenedDocuments([]);
    setConfirmacion(false);
    setError('');
    setSuccess('');

  }

  function cerrarDetalle() {

    if (saving) return;

    selectionRef.current = null;

    setSelectedId(null);
    setAccion(null);
    setMotivo('');
    setRequisitoDevuelto('');
    setReviews({ ...initialReviews });
    setOpenedDocuments([]);
    setConfirmacion(false);

  }

  function seleccionarAccion(value) {

    if (
      !canManage ||
      saving ||
      !selected
    ) {

      return;

    }

    const config = ACCIONES[value];

    if (
      !config ||
      !config.estados.includes(selected.estado)
    ) {

      setError(
        'La acción no corresponde al estado actual.'
      );

      return;

    }

    setAccion(value);
    setMotivo('');
    setRequisitoDevuelto('');
    setConfirmacion(false);
    setError('');

  }

  // ==========================================
  // CONSULTAR DOCUMENTO PRIVADO
  // ==========================================

  async function abrirEvidencia(evidencia) {

    if (
      !client ||
      !selected ||
      !evidencia.archivo_path ||
      openingId
    ) {

      return;

    }

    const folder =
      evidencia.archivo_path.split('/')[0];

    const folders = canManage

      ? [
          'moodle',
          'entrenamiento',
          'aptitud-medica',
          'certificaciones'
        ]

      : role === 'ING_PROCESOS'

        ? ['aptitud-medica']

        : [];

    if (!folders.includes(folder)) {

      setError(
        'No tienes permisos para consultar este archivo.'
      );

      return;

    }

    const solicitudId = selected.id;

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

    setOpeningId(evidencia.id);
    setError('');

    try {

      const { data, error } =
        await client.storage

          .from(BUCKET)

          .createSignedUrl(
            evidencia.archivo_path,
            60
          );

      if (error) throw error;

      if (!data?.signedUrl) {

        throw new Error(
          'No se obtuvo acceso al documento.'
        );

      }

      if (preview.closed) {

        throw new Error(
          'La ventana del documento fue cerrada.'
        );

      }

      preview.location.replace(data.signedUrl);

      // No trasladar revisiones documentales
      // a una solicitud distinta.

      if (selectionRef.current === solicitudId) {

        setOpenedDocuments(previous => [

          ...new Set([
            ...previous,
            evidencia.id
          ])

        ]);

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
  // EJECUTAR ACCIONES
  // ==========================================

  async function ejecutarAccion(event) {

    event.preventDefault();

    if (
      !client ||
      !canManage ||
      !selected ||
      !accion ||
      saving ||
      loading
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
        'Debes indicar el motivo de la decisión.'
      );

      return;

    }

    if (
      accion === 'AUTORIZAR' &&
      !puedeEmitirVoBo
    ) {

      setError(
        'Debes verificar todos los requisitos ' +
        'obligatorios antes de emitir el VoBo.'
      );

      return;

    }

    if (accion === 'DEVOLVER') {

      const requisitoValido =
        requisitosSolicitud.some(req =>

          req.key === requisitoDevuelto &&

          req.obligatorio &&

          Boolean(req.registro)

        );

      if (!requisitoValido) {

        setError(
          'Selecciona el requisito que debe corregirse.'
        );

        return;

      }

    }

    if (
      ['REVOCAR', 'RECUPERACION'].includes(accion) &&
      !confirmacion
    ) {

      setError(
        'Debes confirmar expresamente esta decisión.'
      );

      return;

    }

    const confirmed = window.confirm(

      config.nombre + '\n\n' +

      'Colaborador: ' +
      (selected.colaborador?.nombre || '—') +

      '\nRiesgo crítico: ' +
      (selected.riesgo?.nombre || '—') +

      '\n\n' + config.mensaje +

      '\n\n¿Confirmas esta acción?'

    );

    if (!confirmed) return;

    setSaving(true);

    try {

      // Verificación de sesión y perfil.

      const {
        data: authData,
        error: authError
      } = await client.auth.getUser();

      if (authError || !authData?.user) {

        throw new Error(
          'La sesión no está disponible.'
        );

      }

      const {
        data: actualRole,
        error: roleError
      } = await client.rpc('cap_rol_actual');

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

      // Emitir autorización.

      if (accion === 'AUTORIZAR') {

        params = {

          p_autorizacion_id:
            selected.id,

          p_moodle_revisado:
            Boolean(reviews.MOODLE),

          p_entrenamiento_revisado:
            Boolean(reviews.ENTRENAMIENTO),

          // Nombre exacto del parámetro SQL.
          // La columna de la tabla se llama
          // aptitud_medica_revisada.

          p_aptitud_medica_revisado:
            Boolean(reviews.APTITUD_MEDICA),

          p_observaciones:
            motivoFinal || null

        };

      // Devolución de un requisito específico.

      } else if (accion === 'DEVOLVER') {

        params = {

          p_autorizacion_id:
            selected.id,

          p_requisito:
            requisitoDevuelto,

          p_motivo:
            motivoFinal

        };

      // Suspender, reactivar, revocar
      // o habilitar recuperación.

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
          'VoBo emitido correctamente.',

        DEVOLVER:
          'Requisito devuelto correctamente.',

        SUSPENDER:
          'Autorización suspendida correctamente.',

        REACTIVAR:
          'Autorización reactivada correctamente.',

        REVOCAR:
          'Autorización revocada correctamente.',

        RECUPERACION:
          'Recuperación habilitada correctamente. ' +
          'Consulta la nueva solicitud y su estado. ' +
          'La recuperación no equivale a autorización.'

      };

      setSuccess(mensajes[accion]);

      selectionRef.current = null;

      setSelectedId(null);
      setAccion(null);
      setMotivo('');
      setRequisitoDevuelto('');
      setReviews({ ...initialReviews });
      setOpenedDocuments([]);
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
  // RESUMEN DE MOVIMIENTOS
  // ==========================================

  const movimientos = useMemo(() => {

    if (!selected) return [];

    return [

      {
        nombre: 'Solicitud generada',
        fecha: selected.created_at
      },

      {
        nombre: 'VoBo emitido',
        fecha: selected.fecha_autorizacion,
        motivo: selected.observaciones
      },

      {
        nombre: 'Requisito devuelto',
        fecha: selected.fecha_devolucion,
        motivo: selected.motivo_devolucion
      },

      {
        nombre: 'Autorización suspendida',
        fecha: selected.fecha_suspension,
        motivo: selected.motivo_suspension
      },

      {
        nombre: 'Recuperación habilitada',
        fecha:
          selected.fecha_habilitacion_recuperacion,
        motivo: selected.motivo_recuperacion
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

    ].filter(e => e.fecha)

      .sort((a, b) =>

        new Date(a.fecha) -
        new Date(b.fecha)

      );

  }, [selected]);

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
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (

    <div className="cap-autorizaciones-rc">

      {/* ENCABEZADO */}

      <div className="cap-panel cap-toolbar">

        <div>

          <h2>Autorizaciones de riesgos críticos</h2>

          <p className="cap-muted">

            Revisión documental, VoBo,
            suspensiones y recuperación.

          </p>

        </div>

        <button
          type="button"
          className="cap-secondary"
          disabled={
            loading ||
            saving ||
            Boolean(openingId)
          }
          onClick={() => {

            cerrarDetalle();

            cargarDatos();

          }}
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
          icon={ClipboardCheck}
          label="Asignaciones aplicables"
          value={indicadores.aplicables}
          description="Combinaciones colaborador - RC"
        />

        <KPI
          icon={Clock}
          label="Pendientes de VoBo"
          value={indicadores.pendientes}
          description="Pendientes del jefe de producción"
          variant="cap-kpi-warning"
          color="#b45309"
        />

        <KPI
          icon={ShieldCheck}
          label="Autorizaciones vigentes"
          value={indicadores.autorizadas}
          description="Según estado operativo de Supabase"
          variant="cap-kpi-success"
          color="#15803d"
        />

        <KPI
          icon={PauseCircle}
          label="Suspendidas"
          value={indicadores.suspendidas}
          description="Sin permiso operativo por suspensión"
          variant="cap-kpi-danger"
          color="#b91c1c"
        />

        <KPI
          icon={ShieldAlert}
          label="Sin autorización"
          value={indicadores.sinAutorizacion}
          description="Asignaciones aplicables no autorizadas"
          variant="cap-kpi-warning"
          color="#b45309"
        />

      </div>

      {/* DETALLE DE SOLICITUD */}

      {selected && canReadDetails && (

        <div className="cap-panel">

          <div className="cap-toolbar">

            <h2>Detalle de autorización RC</h2>

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

          {/* INFORMACIÓN GENERAL */}

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

              <label>Riesgo crítico</label>

              <strong>

                {selected.riesgo?.nombre || '—'}

              </strong>

              <span className="cap-muted">

                {selected.riesgo?.codigo}

              </span>

            </div>

            <div className="cap-field">

              <label>Tipo de solicitud</label>

              <div>

                <Estado value={selected.tipo_solicitud} />

              </div>

            </div>

            <div className="cap-field">

              <label>Estado de solicitud</label>

              <div>

                <Estado value={selected.estado} />

              </div>

            </div>

            <div className="cap-field">

              <label>Estado operativo actual</label>

              <div>

                <Estado value={
                  selected.estadoActual?.estado ||
                  'NO_DISPONIBLE'
                } />

              </div>

            </div>

            <div className="cap-field">

              <label>Autorización operativa</label>

              <div>

                <Estado value={

                  !selected.estadoActual

                    ? 'NO_DISPONIBLE'

                    : selected.estadoActual.autorizado

                      ? 'AUTORIZADO'

                      : 'NO_AUTORIZADO'

                } />

              </div>

            </div>

            <div className="cap-field">

              <label>Vencimiento de autorización</label>

              <strong>

                {formatDate(
                  selected.fecha_vencimiento
                )}

              </strong>

            </div>

            <div className="cap-field">

              <label>Fecha de autorización</label>

              <strong>

                {formatDate(
                  selected.fecha_autorizacion
                )}

              </strong>

            </div>

          </div>

          {/* REQUISITOS OBLIGATORIOS */}

          <h3>Revisión de requisitos obligatorios</h3>

          {requisitosSolicitud.map(req => {

            const Icon = req.icon;

            const registro = req.registro;

            return (

              <div
                key={req.key}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 20,
                  marginBottom: 16
                }}
              >

                <div className="cap-toolbar">

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>

                    <Icon
                      size={26}
                      color="#164b83"
                    />

                    <strong>

                      {req.nombre}

                    </strong>

                  </div>

                  <Estado value={

                    !req.obligatorio

                      ? 'NO_REQUERIDO'

                      : req.vigente

                        ? 'VIGENTE'

                        : 'NO_VALIDO'

                  } />

                </div>

                {registro ? (

                  <>

                    <div
                      className="cap-form-grid"
                      style={{ marginTop: 20 }}
                    >

                      <div className="cap-field">

                        <label>Fecha de realización</label>

                        <strong>

                          {formatDate(
                            registro.fecha_realizacion
                          )}

                        </strong>

                      </div>

                      <div className="cap-field">

                        <label>Fecha de vencimiento</label>

                        <strong>

                          {formatDate(
                            registro.fecha_vencimiento
                          )}

                        </strong>

                        {req.dias !== null && (

                          <span className="cap-muted">

                            {req.dias} días restantes

                          </span>

                        )}

                      </div>

                      <div className="cap-field">

                        <label>Estado del registro</label>

                        <div>

                          <Estado value={
                            registro.estado
                          } />

                        </div>

                      </div>

                      <div className="cap-field">

                        <label>Revisión anterior del jefe</label>

                        <div>

                          <Estado value={

                            req.revisadoAnteriormente

                              ? 'REVISADO'

                              : 'PENDIENTE'

                          } />

                        </div>

                      </div>

                      {req.key === 'APTITUD_MEDICA' && (

                        <div className="cap-field">

                          <label>Resultado médico</label>

                          <div>

                            <Estado value={
                              registro.resultado_aptitud
                            } />

                          </div>

                        </div>

                      )}

                    </div>

                    {/* DOCUMENTOS DEL REQUISITO */}

                    {req.documentos.map(e => (

                      <div
                        className="cap-toolbar"
                        key={e.id}
                        style={{
                          padding: 12,
                          marginBottom: 10,
                          border: '1px solid #e2e8f0',
                          borderRadius: 8
                        }}
                      >

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          overflowWrap: 'anywhere'
                        }}>

                          <FileText
                            size={22}
                            color="#164b83"
                          />

                          <div>

                            <strong>

                              {e.archivo_nombre}

                            </strong>

                            <div className="cap-muted">

                              {openedDocuments.includes(e.id)

                                ? 'Enlace abierto'

                                : 'Documento privado'}

                            </div>

                          </div>

                        </div>

                        <button
                          type="button"
                          className="cap-secondary"
                          disabled={
                            saving ||
                            Boolean(openingId)
                          }
                          onClick={() =>
                            abrirEvidencia(e)
                          }
                        >

                          <ExternalLink size={15} />

                          {openingId === e.id

                            ? 'Abriendo...'

                            : 'Consultar evidencia'}

                        </button>

                      </div>

                    ))}

                    {req.documentos.length === 0 && (

                      <p className="cap-muted">

                        Evidencia no disponible
                        para este perfil o registro.

                      </p>

                    )}

                    {/* CONFIRMAR REVISIÓN */}

                    {canManage &&
                     selected.estado === 'PENDIENTE' &&
                     req.obligatorio && (

                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginTop: 16
                      }}>

                        <input
                          type="checkbox"
                          checked={reviews[req.key]}
                          disabled={

                            saving ||

                            !req.vigente ||

                            !req.documentoAbierto

                          }
                          onChange={e =>

                            setReviews(previous => ({

                              ...previous,

                              [req.key]:
                                e.target.checked

                            }))

                          }
                        />

                        Confirmo que revisé
                        el requisito y su evidencia.

                      </label>

                    )}

                    {canManage &&
                     selected.estado === 'PENDIENTE' &&
                     req.obligatorio &&
                     !req.documentoAbierto && (

                      <p className="cap-muted">

                        Abre la evidencia antes de
                        confirmar su revisión.

                      </p>

                    )}

                  </>

                ) : (

                  <div
                    className={
                      req.obligatorio
                        ? 'cap-alert-warning'
                        : 'cap-alert-info'
                    }
                    style={{ marginTop: 15 }}
                  >

                    {req.obligatorio

                      ? 'No existe un registro vinculado.'

                      : 'Este requisito no es obligatorio.'}

                  </div>

                )}

              </div>

            );

          })}

          {/* CERTIFICACIÓN ADICIONAL */}

          {canManage && (

            <div style={{
              border: '1px solid #ddd6fe',
              borderRadius: 10,
              background: '#faf8ff',
              padding: 20,
              marginBottom: 20
            }}>

              <div className="cap-toolbar">

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>

                  <Award
                    size={26}
                    color="#7c3aed"
                  />

                  <strong>

                    Certificación adicional

                  </strong>

                </div>

                <Estado value="OPCIONAL" optional />

              </div>

              <p className="cap-muted">

                No condiciona la autorización
                operativa ni su vigencia.

              </p>

              {certificacion ? (

                <div className="cap-form-grid">

                  <div className="cap-field">

                    <label>Estado de certificación actual</label>

                    <div>

                      <Estado
                        value={
                          certificacion.estado_vencimiento
                        }
                        optional
                      />

                    </div>

                  </div>

                  <div className="cap-field">

                    <label>Vencimiento independiente</label>

                    <strong>

                      {certificacion.fecha_vencimiento

                        ? formatDate(
                            certificacion.fecha_vencimiento
                          )

                        : 'Sin vencimiento registrado'}

                    </strong>

                  </div>

                </div>

              ) : (

                <Estado
                  optional
                  value="SIN_CERTIFICACION_VERIFICADA"
                />

              )}

              {entrenamiento?.cuenta_certificacion && (

                <>

                  <h4>

                    Certificación del entrenamiento
                    vinculado a esta solicitud

                  </h4>

                  <div className="cap-form-grid">

                    <div className="cap-field">

                      <label>Institución</label>

                      <strong>

                        {entrenamiento.institucion || '—'}

                      </strong>

                    </div>

                    <div className="cap-field">

                      <label>Fecha de certificación</label>

                      <strong>

                        {formatDate(
                          entrenamiento.fecha_certificacion
                        )}

                      </strong>

                    </div>

                  </div>

                  {documentosCertificacion.map(e => (

                    <button
                      type="button"
                      className="cap-secondary"
                      key={e.id}
                      disabled={
                        saving ||
                        Boolean(openingId)
                      }
                      onClick={() =>
                        abrirEvidencia(e)
                      }
                    >

                      <ExternalLink size={15} />

                      Consultar diploma adicional

                    </button>

                  ))}

                </>

              )}

            </div>

          )}

          {/* RECUPERACIÓN MÉDICA */}

          {selected.estado === 'SUSPENDIDA' && (

            <div className="cap-alert-warning">

              <HeartPulse size={22} />

              {' '}

              <strong>
                Control de recuperación
              </strong>

              <p>

                Si la autorización fue suspendida
                por una restricción médica, la
                recuperación deberá seguir el
                procedimiento establecido en Supabase.

              </p>

              {selected.fecha_habilitacion_recuperacion && (

                <>

                  <p>

                    Recuperación habilitada:

                    {' '}

                    {formatDate(
                      selected.fecha_habilitacion_recuperacion
                    )}

                  </p>

                  <p>

                    {selected.motivo_recuperacion}

                  </p>

                </>

              )}

              <p>

                Habilitar la recuperación no sustituye
                la aptitud médica ni el nuevo VoBo.

              </p>

            </div>

          )}

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

                  .filter(([key, config]) => {

                    if (
                      !config.estados.includes(
                        selected.estado
                      )
                    ) {

                      return false;

                    }

                    if (
                      key === 'RECUPERACION' &&
                      selected.fecha_habilitacion_recuperacion
                    ) {

                      return false;

                    }

                    return true;

                  })

                  .map(([value, config]) => {

                    const Icon = config.icon;

                    return (

                      <button
                        type="button"
                        key={value}
                        className={

                          accion === value

                            ? 'cap-primary'

                            : 'cap-secondary'

                        }
                        disabled={saving || loading}
                        aria-pressed={accion === value}
                        onClick={() =>
                          seleccionarAccion(value)
                        }
                      >

                        <Icon size={17} />

                        {config.nombre}

                      </button>

                    );

                  })}

              </div>

            </>

          )}

          {/* FORMULARIO DE ACCIÓN */}

          {accion && canManage && (

            <form onSubmit={ejecutarAccion}>

              <div className={

                [
                  'REVOCAR',
                  'SUSPENDER',
                  'RECUPERACION'
                ].includes(accion)

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

              {/* RESUMEN DE REVISIONES */}

              {accion === 'AUTORIZAR' && (

                <div style={{
                  padding: 16,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  marginBottom: 20
                }}>

                  <h3>Resumen del VoBo</h3>

                  {requisitosSolicitud.map(req => (

                    <div
                      key={req.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 0'
                      }}
                    >

                      {reviews[req.key] ||
                       !req.obligatorio ? (

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

                        {req.nombre}

                      </span>

                      <Estado value={

                        !req.obligatorio

                          ? 'NO_REQUERIDO'

                          : reviews[req.key]

                            ? 'REVISADO'

                            : 'PENDIENTE'

                      } />

                    </div>

                  ))}

                  {!puedeEmitirVoBo && (

                    <div className="cap-alert-warning">

                      Completa las revisiones
                      obligatorias y verifica que
                      la asignación esté activa.

                    </div>

                  )}

                </div>

              )}

              {/* REQUISITO DEVUELTO */}

              {accion === 'DEVOLVER' && (

                <div className="cap-field">

                  <label htmlFor="cap-autrc-requisito">

                    Requisito que debe corregirse *

                  </label>

                  <select
                    id="cap-autrc-requisito"
                    value={requisitoDevuelto}
                    required
                    disabled={saving}
                    onChange={e =>

                      setRequisitoDevuelto(
                        e.target.value
                      )

                    }
                  >

                    <option value="">

                      Seleccionar requisito...

                    </option>

                    {requisitosSolicitud

                      .filter(req =>

                        req.obligatorio &&
                        req.registro

                      )

                      .map(req => (

                        <option
                          key={req.key}
                          value={req.key}
                        >

                          {req.nombre}

                        </option>

                      ))}

                  </select>

                  <span className="cap-muted">

                    La certificación adicional
                    no forma parte de la devolución
                    de requisitos obligatorios.

                  </span>

                </div>

              )}

              {/* MOTIVO */}

              <div className="cap-field">

                <label htmlFor="cap-autrc-motivo">

                  {ACCIONES[accion].requiereMotivo

                    ? 'Motivo de la decisión *'

                    : 'Observaciones del VoBo'}

                </label>

                <textarea
                  id="cap-autrc-motivo"
                  value={motivo}
                  required={
                    ACCIONES[accion].requiereMotivo
                  }
                  disabled={saving}
                  placeholder={

                    accion === 'DEVOLVER'

                      ? 'Indica qué debe corregirse...'

                      : 'Describe el fundamento de la decisión...'

                  }
                  onChange={e =>
                    setMotivo(e.target.value)
                  }
                />

              </div>

              {/* CONFIRMACIÓN ESPECIAL */}

              {['REVOCAR', 'RECUPERACION']
                .includes(accion) && (

                <div className="cap-alert-warning">

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>

                    <input
                      type="checkbox"
                      checked={confirmacion}
                      required
                      disabled={saving}
                      onChange={e =>
                        setConfirmacion(
                          e.target.checked
                        )
                      }
                    />

                    {accion === 'REVOCAR'

                      ? 'Confirmo que deseo revocar definitivamente esta autorización.'

                      : 'Confirmo que revisé las condiciones de recuperación y comprendo que esta acción no autoriza la operación.'}

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
                    setRequisitoDevuelto('');

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

                    loading ||

                    Boolean(openingId) ||

                    (
                      accion === 'AUTORIZAR' &&
                      !puedeEmitirVoBo
                    ) ||

                    (
                      ['REVOCAR', 'RECUPERACION']
                        .includes(accion) &&
                      !confirmacion
                    )

                  }
                  style={

                    ['REVOCAR', 'SUSPENDER']
                      .includes(accion)

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

                    {formatDate(evento.fecha)}

                  </div>

                  {evento.motivo && (

                    <p>

                      {evento.motivo}

                    </p>

                  )}

                </div>

              </div>

            ))}

            <p className="cap-muted">

              Resumen de los movimientos disponibles
              en este registro. La auditoría completa
              permanece en Supabase.

            </p>

          </div>

        </div>

      )}

      {/* CATÁLOGO DE SOLICITUDES */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>

            {canReadDetails

              ? 'Solicitudes y autorizaciones RC'

              : 'Estado operativo de riesgos críticos'}

          </h2>

          <span className="cap-muted">

            {canReadDetails

              ? solicitudesFiltradas.length

              : matrizFiltrada.length}

            {' '}registros

          </span>

        </div>

        {/* BUSCADOR */}

        <div className="cap-search">

          <Search size={18} />

          <input
            value={search}
            aria-label="Buscar autorizaciones RC"
            placeholder="Buscar colaborador o riesgo crítico..."
            onChange={e =>
              setSearch(e.target.value)
            }
          />

        </div>

        {/* FILTROS */}

        <div className="cap-form-grid">

          <div className="cap-field">

            <label htmlFor="cap-autrc-filter-rc">

              Riesgo crítico

            </label>

            <select
              id="cap-autrc-filter-rc"
              value={filterRC}
              onChange={e =>
                setFilterRC(e.target.value)
              }
            >

              <option value="TODOS">

                Todos los riesgos críticos

              </option>

              {riesgos.map(rc => (

                <option key={rc.id} value={rc.id}>

                  {rc.nombre}

                </option>

              ))}

            </select>

          </div>

          <div className="cap-field">

            <label htmlFor="cap-autrc-filter-estado">

              Estado

            </label>

            <select
              id="cap-autrc-filter-estado"
              value={filterEstado}
              onChange={e =>
                setFilterEstado(e.target.value)
              }
            >

              <option value="TODOS">

                Todos los estados

              </option>

              {canReadDetails ? (

                <>

                  <option value="PENDIENTE">

                    Pendientes

                  </option>

                  <option value="AUTORIZADA">

                    Autorizadas

                  </option>

                  <option value="DEVUELTA">

                    Devueltas

                  </option>

                  <option value="SUSPENDIDA">

                    Suspendidas

                  </option>

                  <option value="REVOCADA">

                    Revocadas

                  </option>

                </>

              ) : (

                <>

                  <option value="AUTORIZADOS">

                    Autorizados

                  </option>

                  <option value="NO_AUTORIZADOS">

                    Sin autorización

                  </option>

                </>

              )}

            </select>

          </div>

        </div>

        {/* AVISO DE PRIVACIDAD */}

        {!canReadDetails && (

          <div className="cap-alert-info">

            Este perfil puede consultar los estados
            operativos, pero no las solicitudes
            administrativas ni los documentos médicos.

          </div>

        )}

        {autorizaciones.length >= 1000 && (

          <div className="cap-alert-warning">

            Se muestran hasta 1,000 solicitudes
            históricas. El historial completo
            requerirá paginación.

          </div>

        )}

        {/* TABLA */}

        {loading ? (

          <div
            className="cap-welcome"
            role="status"
          >

            <RefreshCw size={32} />

            <p>Cargando autorizaciones RC...</p>

          </div>

        ) : (

          <div className="cap-table-wrap">

            {canReadDetails ? (

              <table>

                <thead>

                  <tr>

                    <th>Colaborador</th>
                    <th>Riesgo crítico</th>
                    <th>Tipo de solicitud</th>
                    <th>Estado solicitud</th>
                    <th>Estado operativo</th>
                    <th>Vencimiento</th>
                    <th>Acciones</th>

                  </tr>

                </thead>

                <tbody>

                  {solicitudesFiltradas.map(a => (

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

                        {a.riesgo?.nombre || '—'}

                      </td>

                      <td>

                        <Estado value={
                          a.tipo_solicitud
                        } />

                      </td>

                      <td>

                        <Estado value={a.estado} />

                      </td>

                      <td>

                        <Estado value={

                          a.estadoActual?.estado ||
                          'NO_DISPONIBLE'

                        } />

                      </td>

                      <td>

                        {formatDate(
                          a.fecha_vencimiento
                        )}

                      </td>

                      <td>

                        <button
                          type="button"
                          className="cap-secondary"
                          disabled={

                            saving ||

                            Boolean(openingId)

                          }
                          onClick={() =>

                            seleccionarSolicitud(a)

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

                  {solicitudesFiltradas.length === 0 && (

                    <tr>

                      <td
                        colSpan={7}
                        className="cap-empty"
                      >

                        No se encontraron solicitudes.

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            ) : (

              <table>

                <thead>

                  <tr>

                    <th>Colaborador</th>
                    <th>Puesto</th>
                    <th>Riesgo crítico</th>
                    <th>Estado operativo</th>
                    <th>Autorizado</th>

                  </tr>

                </thead>

                <tbody>

                  {matrizFiltrada.map(a => (

                    <tr key={

                      `${a.colaborador_id}-` +
                      `${a.riesgo_critico_id}`

                    }>

                      <td>

                        <strong>

                          {a.colaborador}

                        </strong>

                      </td>

                      <td>

                        {a.puesto || '—'}

                      </td>

                      <td>

                        {a.riesgo_critico}

                      </td>

                      <td>

                        <Estado value={a.estado} />

                      </td>

                      <td>

                        <Estado value={

                          a.autorizado

                            ? 'AUTORIZADO'

                            : 'NO_AUTORIZADO'

                        } />

                      </td>

                    </tr>

                  ))}

                  {matrizFiltrada.length === 0 && (

                    <tr>

                      <td
                        colSpan={5}
                        className="cap-empty"
                      >

                        No se encontraron registros.

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            )}

          </div>

        )}

      </div>

    </div>

  );

}
