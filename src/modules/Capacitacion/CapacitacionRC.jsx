
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
  Search,
  RefreshCw,
  UploadCloud,
  FileText,
  ExternalLink,
  Save,
  Plus,
  X
} from 'lucide-react';

import './capacitacion.css';

// ==========================================
// CONFIGURACIÓN GENERAL
// ==========================================

const BUCKET = 'capacitacion-evidencias';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const TIPOS = {
  MOODLE: {
    nombre: 'Moodle',
    icon: GraduationCap,
    responsable: 'GESTOR_RC'
  },
  ENTRENAMIENTO_PRACTICO: {
    nombre: 'Entrenamiento práctico',
    icon: ClipboardCheck,
    responsable: 'GESTOR_RC'
  },
  APTITUD_MEDICA: {
    nombre: 'Aptitud médica',
    icon: HeartPulse,
    responsable: 'ING_PROCESOS'
  }
};

const initialForm = {
  asignacion_id: '',
  fecha_realizacion: '',
  fecha_vencimiento: '',
  resultado_aptitud: '',
  cuenta_certificacion: false,
  institucion: '',
  fecha_certificacion: '',
  vencimiento_certificacion: '',
  observaciones: ''
};

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

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

function formatDate(value) {

  if (!value) return '—';

  const [year, month, day] =
    String(value).slice(0, 10).split('-');

  return `${day}/${month}/${year}`;

}

function safeFileName(name) {

  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-120);

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

function estadoVigencia(fecha) {

  const dias = diasRestantes(fecha);

  if (dias === null) return 'SIN_VENCIMIENTO';

  if (dias < 0) return 'VENCIDO';

  if (dias <= 30) return 'CRITICO';

  if (dias <= 90) return 'PROXIMO_A_VENCER';

  return 'VIGENTE';

}

function statusClass(estado) {

  if ([
    'VALIDADO',
    'AUTORIZADO',
    'VIGENTE',
    'APTO'
  ].includes(estado)) {

    return 'cap-status cap-status-success';

  }

  if ([
    'PENDIENTE',
    'PENDIENTE_VOBO',
    'PROXIMO_A_VENCER',
    'REQUISITOS_PENDIENTES'
  ].includes(estado)) {

    return 'cap-status cap-status-warning';

  }

  if ([
    'VENCIDO',
    'CRITICO',
    'NO_APTO',
    'NO_AUTORIZADO',
    'SUSPENDIDO',
    'REVOCADO',
    'REQUISITOS_INCOMPLETOS',
    'CERTIFICACION_NO_VALIDA',
    'ANULADO',
    'DEVUELTO'
  ].includes(estado)) {

    return 'cap-status cap-status-danger';

  }

  return 'cap-status cap-status-neutral';

}

function Estado({ value, optional = false }) {

  const clase = optional
    ? 'cap-status cap-status-optional'
    : statusClass(value);

  return (
    <span className={clase}>
      {String(value || '—').replaceAll('_', ' ')}
    </span>
  );

}

// ==========================================
// COMPONENTE PARA ADJUNTAR DOCUMENTOS
// ==========================================

function EvidenceInput({
  label,
  file,
  uploaded,
  disabled,
  onChange
}) {

  return (

    <div className="cap-field">

      <strong>{label}</strong>

      {uploaded ? (

        <div className="cap-alert-info">

          <FileText size={19} />

          {' '}{uploaded.nombre}

          <p>
            Archivo cargado. Disponible para
            reintentar la validación.
          </p>

        </div>

      ) : (

        <div className="cap-upload">

          <UploadCloud size={32} />

          <p className="cap-muted">

            PDF, imágenes o Excel.
            Máximo 20 MB.

          </p>

          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx"
            aria-label={label}
            disabled={disabled}
            onChange={onChange}
          />

          {file && (

            <p style={{
              overflowWrap: 'anywhere'
            }}>

              <FileText size={16} />

              {' '}{file.name}

              {' · '}

              {(file.size / 1048576).toFixed(2)} MB

            </p>

          )}

        </div>

      )}

    </div>

  );

}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function CapacitacionRC({
  client,
  role
}) {

  const canManageRC = role === 'GESTOR_RC';

  const canManageMedical = role === 'ING_PROCESOS';

  const isJefe = role === 'JEFE_PRODUCCION';

  const canReadMedical =
    isJefe || canManageMedical;

  const canReadTraining =
    isJefe || canManageRC;

  const canReadRecords =
    isJefe || canManageRC || canManageMedical;

  const [tipo, setTipo] = useState(
    canManageMedical
      ? 'APTITUD_MEDICA'
      : 'MOODLE'
  );

  const [matriz, setMatriz] = useState([]);
  const [riesgos, setRiesgos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [evidencias, setEvidencias] = useState([]);
  const [vencimientos, setVencimientos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStage, setSavingStage] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [filterRC, setFilterRC] = useState('TODOS');

  const [showForm, setShowForm] = useState(false);

  const [openingId, setOpeningId] = useState(null);

  const [form, setForm] = useState({
    ...initialForm
  });

  const [file, setFile] = useState(null);
  const [certFile, setCertFile] = useState(null);

  const [uploaded, setUploaded] = useState({
    principal: null,
    certificacion: null
  });

  const canRegister =
    TIPOS[tipo]?.responsable === role;

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
            vigencia_moodle_meses,
            vigencia_entrenamiento_meses,
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

      // CONSULTA no recibe registros documentales.

      if (!canReadRecords) {

        setRegistros([]);
        setEvidencias([]);
        setVencimientos([]);

        return;

      }

      let registrosQuery = client
        .from('cap_rc_registros')
        .select(`
          id,
          asignacion_id,
          tipo_requisito,
          fecha_realizacion,
          fecha_vencimiento,
          institucion,
          cuenta_certificacion,
          fecha_certificacion,
          vencimiento_certificacion,
          resultado_aptitud,
          estado,
          fecha_validacion,
          created_at
        `)
        .order('fecha_realizacion', {
          ascending: false
        })
        .order('created_at', {
          ascending: false
        })
        .order('id', {
          ascending: false
        })
        .range(0, 999);

      if (!canReadMedical) {

        registrosQuery = registrosQuery.in(
          'tipo_requisito',
          ['MOODLE', 'ENTRENAMIENTO_PRACTICO']
        );

      }

      const [
        registrosResponse,
        vencimientosResponse
      ] = await Promise.all([

        registrosQuery,

        client.rpc('cap_consultar_vencimientos')

      ]);

      if (registrosResponse.error) {
        throw registrosResponse.error;
      }

      if (vencimientosResponse.error) {
        throw vencimientosResponse.error;
      }

      const registrosData =
        registrosResponse.data || [];

      setRegistros(registrosData);

      setVencimientos(
        vencimientosResponse.data || []
      );

      // Consultar solo las evidencias necesarias
      // y permitidas para el perfil.

      const idsPermitidos = registrosData
        .filter(r => {

          if (r.tipo_requisito === 'APTITUD_MEDICA') {
            return canReadMedical;
          }

          return canReadTraining;

        })
        .map(r => r.id);

      const archivos = [];

      for (
        let i = 0;
        i < idsPermitidos.length;
        i += 100
      ) {

        const ids = idsPermitidos.slice(i, i + 100);

        const { data, error } = await client
          .from('cap_rc_evidencias')
          .select(`
            id,
            registro_id,
            tipo_evidencia,
            archivo_nombre,
            archivo_path
          `)
          .in('registro_id', ids);

        if (error) throw error;

        archivos.push(...(data || []));

      }

      setEvidencias(archivos);

    } catch (err) {

      setError(
        'No fue posible cargar la información: ' +
        err.message
      );

    } finally {

      setLoading(false);

    }

  }, [
    client,
    role,
    canReadRecords,
    canReadMedical,
    canReadTraining
  ]);

  useEffect(() => {

    setMatriz([]);
    setRegistros([]);
    setEvidencias([]);
    setVencimientos([]);
    setShowForm(false);
    setSuccess('');
    setFile(null);
    setCertFile(null);

    setUploaded({
      principal: null,
      certificacion: null
    });

    setTipo(
      canManageMedical
        ? 'APTITUD_MEDICA'
        : 'MOODLE'
    );

    cargarDatos();

  }, [cargarDatos, canManageMedical]);

  // ==========================================
  // RELACIONES Y CATÁLOGOS
  // ==========================================

  const asignacionesMap = useMemo(() => {

    return new Map(
      matriz
        .filter(a => a.asignacion_id)
        .map(a => [a.asignacion_id, a])
    );

  }, [matriz]);

  const riesgosMap = useMemo(() => {

    return new Map(
      riesgos.map(rc => [rc.id, rc])
    );

  }, [riesgos]);

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

  const asignacionesDisponibles = useMemo(() => {

    return matriz.filter(a => {

      if (!a.asignacion_id || !a.aplica) {
        return false;
      }

      if (a.estado === 'INACTIVO') {
        return false;
      }

      const rc = riesgosMap.get(
        a.riesgo_critico_id
      );

      if (!rc?.activo) return false;

      if (tipo === 'MOODLE') {
        return rc.requiere_moodle;
      }

      if (tipo === 'ENTRENAMIENTO_PRACTICO') {
        return rc.requiere_entrenamiento;
      }

      if (tipo === 'APTITUD_MEDICA') {
        return rc.requiere_aptitud_medica;
      }

      return false;

    }).sort((a, b) =>
      `${a.colaborador} ${a.riesgo_critico}`
        .localeCompare(
          `${b.colaborador} ${b.riesgo_critico}`,
          'es'
        )
    );

  }, [matriz, riesgosMap, tipo]);

  const asignacionActual =
    asignacionesMap.get(form.asignacion_id);

  const riesgoActual = riesgosMap.get(
    asignacionActual?.riesgo_critico_id
  );

  // ==========================================
  // INDICADORES
  // ==========================================

  const indicadores = useMemo(() => {

    const asignadas = matriz.filter(
      a =>
        a.asignacion_id &&
        a.aplica &&
        a.estado !== 'INACTIVO'
    );

    const certificados = vencimientos.filter(
      r =>
        r.requisito === 'CERTIFICACION' &&
        [
          'VIGENTE',
          'CRITICO',
          'PROXIMO_A_VENCER',
          'SIN_VENCIMIENTO'
        ].includes(r.estado_vencimiento)
    );

    const alertasObligatorias =
      vencimientos.filter(
        r =>
          r.requisito !== 'CERTIFICACION' &&
          [
            'VENCIDO',
            'CRITICO'
          ].includes(r.estado_vencimiento)
      );

    return {

      asignadas: asignadas.length,

      autorizadas: asignadas.filter(
        a => a.autorizado
      ).length,

      pendientesVoBo: asignadas.filter(
        a => a.estado === 'PENDIENTE_VOBO'
      ).length,

      certificados: certificados.length,

      alertasObligatorias:
        alertasObligatorias.length

    };

  }, [matriz, vencimientos]);

  // ==========================================
  // FILTROS
  // ==========================================

  const registrosFiltrados = useMemo(() => {

    const term = normalize(search);

    return registros.filter(r => {

      if (r.tipo_requisito !== tipo) {
        return false;
      }

      if (
        tipo === 'APTITUD_MEDICA' &&
        !canReadMedical
      ) {

        return false;

      }

      const a = asignacionesMap.get(
        r.asignacion_id
      );

      if (
        filterRC !== 'TODOS' &&
        a?.riesgo_critico_id !== filterRC
      ) {

        return false;

      }

      if (!term) return true;

      return [
        a?.colaborador,
        a?.riesgo_critico,
        r.estado,
        r.institucion
      ].some(value =>
        normalize(value).includes(term)
      );

    });

  }, [
    registros,
    tipo,
    canReadMedical,
    asignacionesMap,
    search,
    filterRC
  ]);

  // ==========================================
  // CONTROL DEL FORMULARIO
  // ==========================================

  function updateField(field, value) {

    setForm(previous => ({
      ...previous,
      [field]: value
    }));

  }

  function iniciarRegistro() {

    if (!canRegister || saving) return;

    setError('');
    setSuccess('');

    setForm({
      ...initialForm,
      fecha_realizacion: fechaGuatemala()
    });

    setFile(null);
    setCertFile(null);

    setUploaded({
      principal: null,
      certificacion: null
    });

    setShowForm(true);

  }

  function cancelarFormulario() {

    if (saving) return false;

    if (
      uploaded.principal ||
      uploaded.certificacion
    ) {

      const confirmed = window.confirm(
        'Existen archivos cargados que todavía ' +
        'podrían no estar asociados a un registro. ' +
        'Si cancelas, será necesario revisarlos ' +
        'desde la administración de Storage. ' +
        '¿Deseas continuar?'
      );

      if (!confirmed) return false;

    }

    setShowForm(false);
    setFile(null);
    setCertFile(null);
    setError('');

    setUploaded({
      principal: null,
      certificacion: null
    });

    return true;

  }

  function cambiarTipo(value) {

    if (saving) return;

    if (showForm && !cancelarFormulario()) {
      return;
    }

    setTipo(value);
    setSearch('');
    setSuccess('');
    setError('');

  }

  // ==========================================
  // VALIDAR ARCHIVOS
  // ==========================================

  function seleccionarArchivo(event, setter) {

    if (saving) return;

    const selected = event.target.files?.[0];

    setError('');

    if (!selected) {

      setter(null);
      return;

    }

    if (
      selected.size === 0 ||
      selected.size > MAX_FILE_SIZE ||
      !ALLOWED_TYPES.includes(selected.type)
    ) {

      setError(
        'Archivo inválido. Utiliza PDF, JPG, PNG, ' +
        'WEBP, XLS o XLSX de hasta 20 MB.'
      );

      event.target.value = '';
      setter(null);

      return;

    }

    setter(selected);

  }

  // ==========================================
  // CARGAR DOCUMENTO EN STORAGE
  // ==========================================

  async function cargarArchivo(
    archivo,
    carpeta,
    asignacionId
  ) {

    const path =
      `${carpeta}/${asignacionId}/` +
      `${crypto.randomUUID()}_` +
      safeFileName(archivo.name);

    const { error } = await client.storage
      .from(BUCKET)
      .upload(path, archivo, {

        cacheControl: '3600',
        upsert: false,
        contentType: archivo.type

      });

    if (error) throw error;

    return {

      path,
      nombre: archivo.name

    };

  }

  // ==========================================
  // GUARDAR Y VALIDAR REQUISITO
  // ==========================================

  async function guardarRegistro(event) {

    event.preventDefault();

    if (!client || !canRegister || saving) {
      return;
    }

    setError('');
    setSuccess('');

    const hoy = fechaGuatemala();

    const asignacionValida =
      asignacionesDisponibles.some(
        a => a.asignacion_id === form.asignacion_id
      );

    if (!asignacionValida) {

      setError(
        'Selecciona una asignación activa y aplicable.'
      );

      return;

    }

    if (
      !form.fecha_realizacion ||
      form.fecha_realizacion > hoy
    ) {

      setError(
        'La fecha de realización no es válida.'
      );

      return;

    }

    if (!file && !uploaded.principal) {

      setError(
        'Debes adjuntar la evidencia obligatoria.'
      );

      return;

    }

    // Validación de aptitud médica

    if (tipo === 'APTITUD_MEDICA') {

      if (!['APTO', 'NO_APTO'].includes(
        form.resultado_aptitud
      )) {

        setError(
          'Selecciona el resultado de aptitud médica.'
        );

        return;

      }

      if (
        !form.fecha_vencimiento ||
        form.fecha_vencimiento < form.fecha_realizacion
      ) {

        setError(
          'La fecha de vencimiento médico no es válida.'
        );

        return;

      }

      if (
        form.resultado_aptitud === 'APTO' &&
        form.fecha_vencimiento < hoy
      ) {

        setError(
          'No se puede validar como vigente ' +
          'un documento médico vencido.'
        );

        return;

      }

    }

    // La certificación es opcional.

    const incluirCertificacion =
      tipo === 'ENTRENAMIENTO_PRACTICO' &&
      form.cuenta_certificacion;

    if (incluirCertificacion) {

      if (
        !form.institucion.trim() ||
        !form.fecha_certificacion ||
        (!certFile && !uploaded.certificacion)
      ) {

        setError(
          'Completa la institución, fecha y diploma ' +
          'de la certificación adicional.'
        );

        return;

      }

      if (form.fecha_certificacion > hoy) {

        setError(
          'La fecha de certificación no puede ser futura.'
        );

        return;

      }

      if (
        form.vencimiento_certificacion &&
        form.vencimiento_certificacion <=
          form.fecha_certificacion
      ) {

        setError(
          'El vencimiento de certificación debe ser ' +
          'posterior a su fecha de emisión.'
        );

        return;

      }

    }

    const mensaje =
      tipo === 'APTITUD_MEDICA' &&
      form.resultado_aptitud === 'NO_APTO'

        ? 'Estás registrando un resultado NO APTO. ' +
          'El backend suspenderá las autorizaciones ' +
          'que corresponda. ¿Confirmas el resultado?'

        : '¿Confirmas que revisaste la documentación ' +
          'y que corresponde al colaborador y riesgo ' +
          'crítico seleccionados?';

    if (!window.confirm(mensaje)) return;

    setSaving(true);

    let principal = uploaded.principal;
    let certificacion = uploaded.certificacion;

    try {

      // 1. Verificar sesión y permisos actuales

      setSavingStage('Verificando permisos...');

      const { data, error: authError } =
        await client.auth.getUser();

      if (authError || !data?.user) {

        throw new Error(
          'La sesión ha expirado. Inicia sesión nuevamente.'
        );

      }

      const {
        data: actualRole,
        error: roleError
      } = await client.rpc('cap_rol_actual');

      if (
        roleError ||
        actualRole !== TIPOS[tipo].responsable
      ) {

        throw new Error(
          'No tienes permisos para validar este requisito.'
        );

      }

      // 2. Cargar evidencia obligatoria

      const carpetas = {

        MOODLE: 'moodle',

        ENTRENAMIENTO_PRACTICO: 'entrenamiento',

        APTITUD_MEDICA: 'aptitud-medica'

      };

      if (!principal) {

        setSavingStage('Cargando evidencia...');

        principal = await cargarArchivo(
          file,
          carpetas[tipo],
          form.asignacion_id
        );

        setUploaded(previous => ({
          ...previous,
          principal
        }));

      }

      // 3. Cargar certificación, si corresponde

      if (
        incluirCertificacion &&
        !certificacion
      ) {

        setSavingStage('Cargando certificación...');

        certificacion = await cargarArchivo(
          certFile,
          'certificaciones',
          form.asignacion_id
        );

        setUploaded(previous => ({
          ...previous,
          certificacion
        }));

      }

      // 4. Ejecutar RPC correspondiente

      setSavingStage('Validando requisito...');

      const observaciones =
        form.observaciones.trim() || null;

      let response;

      if (tipo === 'MOODLE') {

        response = await client.rpc(
          'cap_validar_moodle',
          {

            p_asignacion_id:
              form.asignacion_id,

            p_fecha_realizacion:
              form.fecha_realizacion,

            p_archivo_nombre:
              principal.nombre,

            p_archivo_path:
              principal.path,

            p_observaciones:
              observaciones

          }
        );

      } else if (
        tipo === 'ENTRENAMIENTO_PRACTICO'
      ) {

        response = await client.rpc(
          'cap_validar_entrenamiento',
          {

            p_asignacion_id:
              form.asignacion_id,

            p_fecha_realizacion:
              form.fecha_realizacion,

            p_asistencia_nombre:
              principal.nombre,

            p_asistencia_path:
              principal.path,

            p_certificacion_nombre:
              incluirCertificacion
                ? certificacion.nombre
                : null,

            p_certificacion_path:
              incluirCertificacion
                ? certificacion.path
                : null,

            p_institucion:
              incluirCertificacion
                ? form.institucion.trim()
                : null,

            p_fecha_certificacion:
              incluirCertificacion
                ? form.fecha_certificacion
                : null,

            p_vencimiento_certificacion:
              incluirCertificacion
                ? (
                  form.vencimiento_certificacion ||
                  null
                )
                : null,

            p_observaciones:
              observaciones

          }
        );

      } else if (tipo === 'APTITUD_MEDICA') {

        response = await client.rpc(
          'cap_validar_aptitud_medica',
          {

            p_asignacion_id:
              form.asignacion_id,

            p_fecha_emision:
              form.fecha_realizacion,

            p_fecha_vencimiento:
              form.fecha_vencimiento,

            p_resultado_aptitud:
              form.resultado_aptitud,

            p_archivo_nombre:
              principal.nombre,

            p_archivo_path:
              principal.path,

            p_observaciones:
              observaciones

          }
        );

      } else {

        throw new Error(
          'Tipo de requisito no reconocido.'
        );

      }

      if (response.error) {

        throw response.error;

      }

      // 5. Confirmar resultado

      if (
        tipo === 'APTITUD_MEDICA' &&
        form.resultado_aptitud === 'NO_APTO'
      ) {

        setSuccess(
          'Resultado médico NO APTO registrado. ' +
          'Consulta el estado actualizado de autorización.'
        );

      } else {

        setSuccess(
          'Requisito registrado correctamente. ' +
          'El motor evaluará los requisitos pendientes ' +
          'y la generación de la solicitud de VoBo.'
        );

      }

      setShowForm(false);
      setForm({ ...initialForm });
      setFile(null);
      setCertFile(null);

      setUploaded({
        principal: null,
        certificacion: null
      });

      await cargarDatos();

    } catch (err) {

      setError(
        'No fue posible completar el registro: ' +
        err.message
      );

      // Conservar documentos para reintentar.
      // No eliminar archivos directamente de Storage.

      setUploaded({
        principal,
        certificacion
      });

    } finally {

      setSaving(false);
      setSavingStage('');

    }

  }

  // ==========================================
  // CONSULTAR EVIDENCIAS PRIVADAS
  // ==========================================

  async function abrirEvidencia(evidencia) {

    if (
      !client ||
      !evidencia.archivo_path ||
      openingId
    ) {

      return;

    }

    const carpeta =
      evidencia.archivo_path.split('/')[0];

    const permitidas = isJefe

      ? [
          'moodle',
          'entrenamiento',
          'certificaciones',
          'aptitud-medica'
        ]

      : canManageRC

        ? [
            'moodle',
            'entrenamiento',
            'certificaciones'
          ]

        : canManageMedical

          ? ['aptitud-medica']

          : [];

    if (!permitidas.includes(carpeta)) {

      setError(
        'No tienes permiso para consultar este documento.'
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

    setOpeningId(evidencia.id);
    setError('');

    try {

      const { data, error } = await client.storage
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

      preview.location.replace(data.signedUrl);

    } catch (err) {

      preview.close();

      setError(
        'No fue posible abrir el documento: ' +
        err.message
      );

    } finally {

      setOpeningId(null);

    }

  }

  // ==========================================
  // VERIFICAR SESIÓN
  // ==========================================

  if (!client || !role) {

    return (

      <div className="cap-alert-warning">

        No hay una sesión autorizada de capacitación.

      </div>

    );

  }

  const tabsDisponibles = [

    'MOODLE',

    'ENTRENAMIENTO_PRACTICO',

    ...(canReadMedical
      ? ['APTITUD_MEDICA']
      : [])

  ];

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (

    <div className="cap-capacitacion-rc">

      {/* ENCABEZADO */}

      <div className="cap-panel cap-toolbar">

        <div>

          <h2>Capacitación de riesgos críticos</h2>

          <p className="cap-muted">

            Requisitos de seguridad y certificaciones
            adicionales.

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

        <div className="cap-alert-success" role="status">
          {success}
        </div>

      )}

      {/* INDICADORES */}

      <div className="cap-kpi-grid">

        <div className="cap-kpi">

          <Users size={24} color="#164b83" />

          <div className="cap-kpi-label">
            Asignaciones RC
          </div>

          <div className="cap-kpi-value">
            {indicadores.asignadas}
          </div>

          <div className="cap-kpi-description">
            Combinaciones colaborador - RC
          </div>

        </div>

        <div className="cap-kpi cap-kpi-success">

          <ShieldCheck size={24} color="#15803d" />

          <div className="cap-kpi-label">
            Autorizaciones vigentes
          </div>

          <div className="cap-kpi-value">
            {indicadores.autorizadas}
          </div>

          <div className="cap-kpi-description">
            Según motor de autorización
          </div>

        </div>

        <div className="cap-kpi cap-kpi-warning">

          <ClipboardCheck size={24} color="#b45309" />

          <div className="cap-kpi-label">
            Pendientes de VoBo
          </div>

          <div className="cap-kpi-value">
            {indicadores.pendientesVoBo}
          </div>

          <div className="cap-kpi-description">
            Pendientes del jefe de producción
          </div>

        </div>

        {canReadTraining && (

          <div className="cap-kpi cap-kpi-certification">

            <Award size={24} color="#7c3aed" />

            <div className="cap-kpi-label">
              Certificaciones válidas
            </div>

            <div className="cap-kpi-value">
              {indicadores.certificados}
            </div>

            <div className="cap-kpi-description">
              Indicador adicional e independiente
            </div>

          </div>

        )}

        {canReadRecords && (

          <div className="cap-kpi cap-kpi-danger">

            <ShieldAlert size={24} color="#b91c1c" />

            <div className="cap-kpi-label">
              Requisitos críticos o vencidos
            </div>

            <div className="cap-kpi-value">
              {indicadores.alertasObligatorias}
            </div>

            <div className="cap-kpi-description">
              Según vencimientos visibles del perfil
            </div>

          </div>

        )}

      </div>

      {/* PERFIL DE CONSULTA */}

      {!canReadRecords ? (

        <div className="cap-panel">

          <h2>Estado general de riesgos críticos</h2>

          <p className="cap-muted">

            Este perfil puede consultar el estado
            operativo, pero no los expedientes
            documentales ni médicos.

          </p>

          {loading ? (

            <p role="status">
              Cargando información...
            </p>

          ) : (

            <div className="cap-table-wrap">

              <table>

                <thead>

                  <tr>
                    <th>Colaborador</th>
                    <th>Riesgo crítico</th>
                    <th>Estado</th>
                    <th>Autorizado</th>
                  </tr>

                </thead>

                <tbody>

                  {matriz.map(a => (

                    <tr key={
                      `${a.colaborador_id}-${a.riesgo_critico_id}`
                    }>

                      <td>{a.colaborador}</td>

                      <td>{a.riesgo_critico}</td>

                      <td>
                        <Estado value={a.estado} />
                      </td>

                      <td>
                        {a.autorizado ? 'SÍ' : 'NO'}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </div>

      ) : (

        <>

          {/* PESTAÑAS */}

          <div
            className="cap-menu"
            style={{ marginBottom: 18 }}
          >

            {tabsDisponibles.map(value => {

              const Icon = TIPOS[value].icon;

              return (

                <button
                  key={value}
                  type="button"
                  className={
                    tipo === value
                      ? 'cap-tile cap-selected'
                      : 'cap-tile'
                  }
                  disabled={saving}
                  onClick={() => cambiarTipo(value)}
                >

                  <Icon size={26} />

                  <strong>
                    {TIPOS[value].nombre}
                  </strong>

                  <span>

                    {value === 'MOODLE' &&

                      'Diplomas de capacitación teórica.'}

                    {value === 'ENTRENAMIENTO_PRACTICO' &&

                      'Asistencia práctica y certificación opcional.'}

                    {value === 'APTITUD_MEDICA' &&

                      'Control de aptitud y vigencia médica.'}

                  </span>

                </button>

              );

            })}

          </div>

          {/* ACCIONES */}

          <div className="cap-panel cap-toolbar">

            <div>

              <h2>{TIPOS[tipo].nombre}</h2>

              <p className="cap-muted">

                {canRegister
                  ? 'Registro y validación documental'
                  : 'Consulta de registros'}

              </p>

            </div>

            {canRegister && (

              <button
                type="button"
                className="cap-primary"
                disabled={
                  saving ||
                  loading ||
                  showForm
                }
                onClick={iniciarRegistro}
              >

                <Plus size={18} />
                Nuevo registro

              </button>

            )}

          </div>

          {/* FORMULARIO DE REGISTRO */}

          {showForm && canRegister && (

            <form
              className="cap-panel"
              onSubmit={guardarRegistro}
            >

              <div className="cap-toolbar">

                <h2>
                  Registrar {TIPOS[tipo].nombre}
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

                <div className="cap-field cap-field-full">

                  <label htmlFor="cap-crc-asignacion">

                    Colaborador y riesgo crítico *

                  </label>

                  <select
                    id="cap-crc-asignacion"
                    value={form.asignacion_id}
                    required
                    disabled={
                      saving ||
                      Boolean(uploaded.principal) ||
                      Boolean(uploaded.certificacion)
                    }
                    onChange={e =>
                      updateField(
                        'asignacion_id',
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Seleccionar asignación...
                    </option>

                    {asignacionesDisponibles.map(a => (

                      <option
                        key={a.asignacion_id}
                        value={a.asignacion_id}
                      >

                        {a.colaborador}
                        {' — '}
                        {a.riesgo_critico}

                      </option>

                    ))}

                  </select>

                  {asignacionesDisponibles.length === 0 && (

                    <span className="cap-muted">

                      No hay asignaciones disponibles
                      para este requisito.

                    </span>

                  )}

                </div>

                <div className="cap-field">

                  <label htmlFor="cap-crc-fecha">

                    {tipo === 'APTITUD_MEDICA'
                      ? 'Fecha de emisión *'
                      : 'Fecha de realización *'}

                  </label>

                  <input
                    id="cap-crc-fecha"
                    type="date"
                    value={form.fecha_realizacion}
                    max={fechaGuatemala()}
                    required
                    disabled={saving}
                    onChange={e =>
                      updateField(
                        'fecha_realizacion',
                        e.target.value
                      )
                    }
                  />

                </div>

                {/* VIGENCIA AUTOMÁTICA */}

                {riesgoActual &&
                 tipo !== 'APTITUD_MEDICA' && (

                  <div className="cap-field">

                    <label>Vigencia configurada</label>

                    <div className="cap-alert-info">

                      {tipo === 'MOODLE'

                        ? riesgoActual.vigencia_moodle_meses

                        : riesgoActual.vigencia_entrenamiento_meses}

                      {' meses'}

                      <p>

                        Supabase calculará automáticamente
                        la fecha de vencimiento.

                      </p>

                    </div>

                  </div>

                )}

                {/* APTITUD MÉDICA */}

                {tipo === 'APTITUD_MEDICA' && (

                  <>

                    <div className="cap-field">

                      <label htmlFor="cap-crc-venc-medico">

                        Vencimiento del documento *

                      </label>

                      <input
                        id="cap-crc-venc-medico"
                        type="date"
                        value={form.fecha_vencimiento}
                        min={
                          form.fecha_realizacion ||
                          undefined
                        }
                        required
                        disabled={saving}
                        onChange={e =>
                          updateField(
                            'fecha_vencimiento',
                            e.target.value
                          )
                        }
                      />

                    </div>

                    <div className="cap-field cap-field-full">

                      <label htmlFor="cap-crc-aptitud">

                        Resultado de aptitud *

                      </label>

                      <select
                        id="cap-crc-aptitud"
                        value={form.resultado_aptitud}
                        required
                        disabled={saving}
                        onChange={e =>
                          updateField(
                            'resultado_aptitud',
                            e.target.value
                          )
                        }
                      >

                        <option value="">
                          Seleccionar resultado...
                        </option>

                        <option value="APTO">
                          APTO
                        </option>

                        <option value="NO_APTO">
                          NO APTO
                        </option>

                      </select>

                    </div>

                  </>

                )}

              </div>

              {/* ESTADO ACTUAL */}

              {asignacionActual && (

                <div className="cap-alert-info">

                  <strong>
                    Estado operativo actual:
                  </strong>

                  {' '}

                  <Estado
                    value={asignacionActual.estado}
                  />

                </div>

              )}

              {/* ALERTA MÉDICA */}

              {tipo === 'APTITUD_MEDICA' &&
               form.resultado_aptitud === 'NO_APTO' && (

                <div className="cap-error">

                  <ShieldAlert size={20} />

                  {' '}

                  <strong>
                    Resultado NO APTO
                  </strong>

                  <p>

                    El registro podrá provocar la
                    suspensión automática de la
                    autorización correspondiente.

                    La recuperación requerirá una
                    nueva revisión según el flujo
                    establecido en Supabase.

                  </p>

                </div>

              )}

              {/* DOCUMENTO OBLIGATORIO */}

              <EvidenceInput
                label={
                  tipo === 'MOODLE'
                    ? 'Diploma Moodle *'
                    : tipo === 'ENTRENAMIENTO_PRACTICO'
                      ? 'Registro de asistencia *'
                      : 'Documento de aptitud médica *'
                }
                file={file}
                uploaded={uploaded.principal}
                disabled={saving}
                onChange={e =>
                  seleccionarArchivo(e, setFile)
                }
              />

              {/* CERTIFICACIÓN ADICIONAL */}

              {tipo === 'ENTRENAMIENTO_PRACTICO' && (

                <div
                  style={{
                    border: '1px solid #ddd6fe',
                    background: '#faf8ff',
                    borderRadius: 10,
                    padding: 20,
                    marginBottom: 20
                  }}
                >

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>

                    <Award size={28} color="#7c3aed" />

                    <div>

                      <h3 style={{ margin: 0 }}>

                        Certificación adicional

                      </h3>

                      <span className="cap-muted">

                        Valor agregado de competencia

                      </span>

                    </div>

                    <Estado value="OPCIONAL" optional />

                  </div>

                  <p className="cap-muted">

                    La ausencia o vencimiento de la
                    certificación no impide la autorización.

                  </p>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    margin: '18px 0'
                  }}>

                    <input
                      type="checkbox"
                      checked={form.cuenta_certificacion}
                      disabled={
                        saving ||
                        Boolean(uploaded.certificacion)
                      }
                      onChange={e =>
                        updateField(
                          'cuenta_certificacion',
                          e.target.checked
                        )
                      }
                    />

                    El colaborador cuenta con
                    certificación adicional.

                  </label>

                  {form.cuenta_certificacion && (

                    <>

                      <div className="cap-form-grid">

                        <div className="cap-field cap-field-full">

                          <label htmlFor="cap-crc-institucion">

                            Institución certificadora *

                          </label>

                          <input
                            id="cap-crc-institucion"
                            value={form.institucion}
                            required
                            disabled={saving}
                            placeholder="Nombre de la institución"
                            onChange={e =>
                              updateField(
                                'institucion',
                                e.target.value
                              )
                            }
                          />

                        </div>

                        <div className="cap-field">

                          <label htmlFor="cap-crc-cert-fecha">

                            Fecha de certificación *

                          </label>

                          <input
                            id="cap-crc-cert-fecha"
                            type="date"
                            value={form.fecha_certificacion}
                            max={fechaGuatemala()}
                            required
                            disabled={saving}
                            onChange={e =>
                              updateField(
                                'fecha_certificacion',
                                e.target.value
                              )
                            }
                          />

                        </div>

                        <div className="cap-field">

                          <label htmlFor="cap-crc-cert-venc">

                            Vencimiento de certificación

                          </label>

                          <input
                            id="cap-crc-cert-venc"
                            type="date"
                            value={
                              form.vencimiento_certificacion
                            }
                            min={
                              form.fecha_certificacion ||
                              undefined
                            }
                            disabled={saving}
                            onChange={e =>
                              updateField(
                                'vencimiento_certificacion',
                                e.target.value
                              )
                            }
                          />

                          <span className="cap-muted">

                            Dejar vacío si el documento
                            no establece vencimiento.

                          </span>

                        </div>

                      </div>

                      <EvidenceInput
                        label="Diploma de certificación *"
                        file={certFile}
                        uploaded={uploaded.certificacion}
                        disabled={saving}
                        onChange={e =>
                          seleccionarArchivo(
                            e,
                            setCertFile
                          )
                        }
                      />

                    </>

                  )}

                </div>

              )}

              {/* OBSERVACIONES */}

              <div className="cap-field">

                <label htmlFor="cap-crc-observaciones">

                  Observaciones

                </label>

                <textarea
                  id="cap-crc-observaciones"
                  value={form.observaciones}
                  disabled={saving}
                  placeholder={
                    tipo === 'APTITUD_MEDICA'
                      ? 'Observaciones administrativas. No incluir diagnósticos clínicos.'
                      : 'Observaciones de capacitación...'
                  }
                  onChange={e =>
                    updateField(
                      'observaciones',
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="cap-alert-info">

                Registrar un requisito no equivale
                a autorizar al colaborador.

                El motor de Supabase verificará
                automáticamente el cumplimiento de
                los requisitos obligatorios y generará
                la solicitud de autorización cuando
                corresponda.

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

                    ? savingStage || 'Guardando...'

                    : 'Registrar requisito'}

                </button>

              </div>

            </form>

          )}

          {/* HISTORIAL DE REQUISITOS */}

          <div className="cap-panel">

            <div className="cap-toolbar">

              <h2>Historial de {TIPOS[tipo].nombre}</h2>

              <span className="cap-muted">

                {registrosFiltrados.length} registros

              </span>

            </div>

            <div className="cap-search">

              <Search size={18} />

              <input
                value={search}
                placeholder="Buscar colaborador o riesgo crítico..."
                aria-label="Buscar requisitos"
                onChange={e =>
                  setSearch(e.target.value)
                }
              />

            </div>

            <div
              className="cap-field"
              style={{ maxWidth: 400 }}
            >

              <label htmlFor="cap-crc-filter">

                Filtrar riesgo crítico

              </label>

              <select
                id="cap-crc-filter"
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

            {registros.length >= 1000 && (

              <div className="cap-alert-warning">

                Se muestran hasta 1,000 registros.
                El historial completo requerirá paginación.

              </div>

            )}

            {loading ? (

              <div
                className="cap-welcome"
                role="status"
              >

                <RefreshCw size={32} />

                <p>Cargando registros...</p>

              </div>

            ) : (

              <div className="cap-table-wrap">

                <table>

                  <thead>

                    <tr>

                      <th>Colaborador</th>
                      <th>Riesgo crítico</th>
                      <th>Realización</th>
                      <th>Vencimiento</th>
                      <th>Estado registro</th>
                      <th>Vigencia</th>
                      <th>Detalle adicional</th>
                      <th>Autorización actual</th>
                      <th>Evidencias</th>

                    </tr>

                  </thead>

                  <tbody>

                    {registrosFiltrados.map(r => {

                      const a = asignacionesMap.get(
                        r.asignacion_id
                      );

                      const documentos =
                        evidenciasMap.get(r.id) || [];

                      const certificacion =
                        vencimientos.find(v =>
                          v.registro_id === r.id &&
                          v.requisito === 'CERTIFICACION'
                        );

                      return (

                        <tr key={r.id}>

                          <td>

                            <strong>

                              {
                                a?.colaborador ||
                                'Asignación no disponible'
                              }

                            </strong>

                          </td>

                          <td>

                            {a?.riesgo_critico || '—'}

                          </td>

                          <td>

                            {formatDate(r.fecha_realizacion)}

                          </td>

                          <td>

                            {formatDate(r.fecha_vencimiento)}

                            {r.fecha_vencimiento && (

                              <div className="cap-muted">

                                {diasRestantes(
                                  r.fecha_vencimiento
                                )}

                                {' días'}

                              </div>

                            )}

                          </td>

                          <td>

                            <Estado value={r.estado} />

                          </td>

                          <td>

                            <Estado value={
                              r.estado === 'VALIDADO'

                                ? estadoVigencia(
                                    r.fecha_vencimiento
                                  )

                                : 'NO_VALIDADO'
                            } />

                          </td>

                          <td>

                            {r.tipo_requisito ===
                              'APTITUD_MEDICA' &&

                              canReadMedical && (

                                <Estado
                                  value={r.resultado_aptitud}
                                />

                              )}

                            {r.tipo_requisito ===
                              'ENTRENAMIENTO_PRACTICO' && (

                              <>

                                {r.cuenta_certificacion ? (

                                  <div>

                                    <Estado
                                      optional
                                      value={
                                        certificacion
                                          ?.estado_vencimiento ||
                                        'CERTIFICACION_REGISTRADA'
                                      }
                                    />

                                    <div className="cap-muted">

                                      {r.institucion}

                                    </div>

                                    <div className="cap-muted">

                                      {r.vencimiento_certificacion

                                        ? formatDate(
                                            r.vencimiento_certificacion
                                          )

                                        : 'Sin vencimiento registrado'}

                                    </div>

                                  </div>

                                ) : (

                                  <Estado
                                    optional
                                    value="SIN_CERTIFICACION"
                                  />

                                )}

                              </>

                            )}

                            {r.tipo_requisito === 'MOODLE' &&

                              '—'}

                          </td>

                          <td>

                            <Estado
                              value={
                                a?.estado ||
                                'NO_DISPONIBLE'
                              }
                            />

                          </td>

                          <td>

                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6
                            }}>

                              {documentos.map(e => (

                                <button
                                  key={e.id}
                                  type="button"
                                  className="cap-secondary"
                                  disabled={Boolean(openingId)}
                                  title={e.archivo_nombre}
                                  onClick={() =>
                                    abrirEvidencia(e)
                                  }
                                >

                                  <ExternalLink size={14} />

                                  {openingId === e.id

                                    ? 'Abriendo...'

                                    : e.tipo_evidencia ===
                                      'DIPLOMA_CERTIFICACION'

                                      ? 'Certificación'

                                      : 'Ver evidencia'}

                                </button>

                              ))}

                              {documentos.length === 0 && (

                                <span className="cap-muted">

                                  Sin acceso o evidencia
                                  no disponible

                                </span>

                              )}

                            </div>

                          </td>

                        </tr>

                      );

                    })}

                    {registrosFiltrados.length === 0 && (

                      <tr>

                        <td
                          colSpan={9}
                          className="cap-empty"
                        >

                          No se encontraron registros
                          para este requisito.

                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </>

      )}

    </div>

  );

}
