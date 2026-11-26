
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef
} from 'react';

import {
  Factory,
  GraduationCap,
  ClipboardCheck,
  ShieldCheck,
  Users,
  Search,
  RefreshCw,
  Plus,
  UploadCloud,
  FileText,
  ExternalLink,
  Save,
  X,
  AlertTriangle
} from 'lucide-react';

import './capacitacion.css';

// ==========================================
// CONFIGURACIÓN
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

const initialForm = {
  colaborador_id: '',
  maquina_id: '',
  lider_id: '',
  fecha_capacitacion: '',
  firma_lider: false,
  firma_colaborador: false,
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

  const date = String(value).slice(0, 10);

  const [year, month, day] = date.split('-');

  return `${day}/${month}/${year}`;

}

function formatSize(bytes) {

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

}

function safeFileName(name) {

  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-120);

}

function statusClass(estado) {

  if ([
    'VALIDADA',
    'VALIDADO',
    'CAPACITADO',
    'AUTORIZADO',
    'AUTORIZADA'
  ].includes(estado)) {

    return 'cap-status cap-status-success';

  }

  if ([
    'PENDIENTE',
    'PENDIENTE_VOBO'
  ].includes(estado)) {

    return 'cap-status cap-status-warning';

  }

  if ([
    'DEVUELTA',
    'DEVUELTO',
    'SUSPENDIDA',
    'SUSPENDIDO',
    'REVOCADA',
    'REVOCADO',
    'ANULADA',
    'ANULADO',
    'NO_AUTORIZADO'
  ].includes(estado)) {

    return 'cap-status cap-status-danger';

  }

  return 'cap-status cap-status-neutral';

}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function CapacitacionMaquinas({
  client,
  role
}) {

  const canRegister = role === 'ING_PROCESOS';

  const canReadEvidence = [
    'JEFE_PRODUCCION',
    'ING_PROCESOS'
  ].includes(role);

  const fileInputRef = useRef(null);

  const [colaboradores, setColaboradores] =
    useState([]);

  const [maquinas, setMaquinas] = useState([]);

  const [capacitaciones, setCapacitaciones] =
    useState([]);

  const [matriz, setMatriz] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [savingStage, setSavingStage] =
    useState('');

  const [openingId, setOpeningId] =
    useState(null);

  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');

  const [filterMaquina, setFilterMaquina] =
    useState('TODAS');

  const [filterEstado, setFilterEstado] =
    useState('TODOS');

  const [showForm, setShowForm] =
    useState(false);

  const [file, setFile] = useState(null);

  // Conservar referencia del archivo si la carga
  // fue exitosa pero la validación SQL falló.

  const [uploadedEvidence, setUploadedEvidence] =
    useState(null);

  const [form, setForm] = useState({
    ...initialForm
  });

  // ==========================================
  // CONSULTAR DATOS
  // ==========================================

  const cargarDatos = useCallback(async () => {

    if (!client || !role) {

      setLoading(false);
      return;

    }

    setLoading(true);
    setError('');

    try {

      const camposCapacitacion = [
        'id',
        'colaborador_id',
        'maquina_id',
        'lider_id',
        'fecha_capacitacion',
        'firma_lider',
        'firma_colaborador',
        'estado',
        'fecha_validacion',
        'created_at'
      ];

      if (canReadEvidence) {

        camposCapacitacion.push(
          'evidencia_nombre',
          'evidencia_path',
          'observaciones',
          'motivo_devolucion'
        );

      }

      const [
        colaboradoresResponse,
        maquinasResponse,
        capacitacionesResponse,
        matrizResponse
      ] = await Promise.all([

        client
          .from('cap_colaboradores')
          .select(`
            id,
            codigo,
            nombre,
            puesto,
            activo,
            es_lider
          `)
          .order('nombre', {
            ascending: true
          }),

        client
          .from('cap_maquinas')
          .select(`
            id,
            codigo,
            nombre,
            procesos,
            requiere_autorizacion,
            activo
          `)
          .order('nombre', {
            ascending: true
          }),

        client
          .from('cap_maquinas_capacitaciones')
          .select(
            camposCapacitacion.join(',')
          )
          .order('fecha_capacitacion', {
            ascending: false
          })
          .order('created_at', {
            ascending: false
          })
          .range(0, 999),

        client.rpc('cap_matriz_maquinas')

      ]);

      for (const response of [
        colaboradoresResponse,
        maquinasResponse,
        capacitacionesResponse,
        matrizResponse
      ]) {

        if (response.error) {
          throw response.error;
        }

      }

      setColaboradores(
        colaboradoresResponse.data || []
      );

      setMaquinas(
        maquinasResponse.data || []
      );

      setCapacitaciones(
        capacitacionesResponse.data || []
      );

      setMatriz(
        matrizResponse.data || []
      );

    } catch (err) {

      setError(
        'No fue posible consultar las capacitaciones: ' +
        err.message
      );

    } finally {

      setLoading(false);

    }

  }, [client, role, canReadEvidence]);

  useEffect(() => {

    setColaboradores([]);
    setMaquinas([]);
    setCapacitaciones([]);
    setMatriz([]);
    setShowForm(false);
    setSuccess('');
    setFile(null);
    setUploadedEvidence(null);

    cargarDatos();

  }, [cargarDatos]);

  // ==========================================
  // CATÁLOGOS Y RELACIONES
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

  const matrizMap = useMemo(() => {

    return new Map(
      matriz.map(m => [
        `${m.colaborador_id}-${m.maquina_id}`,
        m
      ])
    );

  }, [matriz]);

  const colaboradoresActivos = useMemo(() => {

    return colaboradores.filter(
      c => c.activo === true
    );

  }, [colaboradores]);

  const lideresActivos = useMemo(() => {

    return colaboradores.filter(
      c => c.activo === true &&
           c.es_lider === true
    );

  }, [colaboradores]);

  const maquinasActivas = useMemo(() => {

    return maquinas.filter(
      m => m.activo === true &&
           m.requiere_autorizacion === true
    );

  }, [maquinas]);

  const maquinaSeleccionada =
    maquinasMap.get(form.maquina_id);

  const colaboradorSeleccionado =
    colaboradoresMap.get(form.colaborador_id);

  const estadoSeleccionado = matrizMap.get(
    `${form.colaborador_id}-${form.maquina_id}`
  );

  // ==========================================
  // INDICADORES
  // ==========================================

  const indicadores = useMemo(() => {

    const combinacionesCapacitadas =
      new Set(
        capacitaciones
          .filter(c =>
            [
              'VALIDADA',
              'VALIDADO'
            ].includes(c.estado)
          )
          .map(c =>
            `${c.colaborador_id}-${c.maquina_id}`
          )
      );

    return {

      registros: capacitaciones.length,

      combinaciones:
        combinacionesCapacitadas.size,

      autorizadas: matriz.filter(
        m => m.autorizado === true
      ).length,

      pendientes: matriz.filter(
        m => [
          'CAPACITADO',
          'PENDIENTE_VOBO'
        ].includes(m.estado)
      ).length

    };

  }, [capacitaciones, matriz]);

  // ==========================================
  // BÚSQUEDA Y FILTROS
  // ==========================================

  const filtered = useMemo(() => {

    const term = normalize(search);

    return capacitaciones.filter(c => {

      if (
        filterMaquina !== 'TODAS' &&
        c.maquina_id !== filterMaquina
      ) {

        return false;

      }

      if (
        filterEstado !== 'TODOS' &&
        c.estado !== filterEstado
      ) {

        return false;

      }

      if (!term) return true;

      const colaborador =
        colaboradoresMap.get(c.colaborador_id);

      const maquina =
        maquinasMap.get(c.maquina_id);

      const lider =
        colaboradoresMap.get(c.lider_id);

      return [
        colaborador?.nombre,
        colaborador?.codigo,
        maquina?.nombre,
        maquina?.codigo,
        lider?.nombre,
        c.estado
      ].some(value =>
        normalize(value).includes(term)
      );

    });

  }, [
    capacitaciones,
    colaboradoresMap,
    maquinasMap,
    search,
    filterMaquina,
    filterEstado
  ]);

  const estadosDisponibles = useMemo(() => {

    return [...new Set(
      capacitaciones
        .map(c => c.estado)
        .filter(Boolean)
    )].sort();

  }, [capacitaciones]);

  // ==========================================
  // NUEVA CAPACITACIÓN
  // ==========================================

  function nuevaCapacitacion() {

    if (!canRegister || saving) return;

    setError('');
    setSuccess('');
    setFile(null);
    setUploadedEvidence(null);

    setForm({

      ...initialForm,

      fecha_capacitacion: fechaGuatemala(),

      lider_id:
        lideresActivos.length === 1
          ? lideresActivos[0].id
          : ''

    });

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

    if (uploadedEvidence) {

      const confirmed = window.confirm(
        'Existe una evidencia cargada que aún no ' +
        'se ha asociado a una capacitación. ' +
        'Si cancelas, deberá revisarse posteriormente ' +
        'desde la administración de Storage. ' +
        '¿Deseas continuar?'
      );

      if (!confirmed) return;

    }

    setShowForm(false);
    setForm({ ...initialForm });
    setFile(null);
    setUploadedEvidence(null);
    setError('');

  }

  // ==========================================
  // SELECCIONAR ARCHIVO
  // ==========================================

  function seleccionarArchivo(event) {

    if (saving || uploadedEvidence) return;

    setError('');

    const selected =
      event.target.files?.[0];

    if (!selected) {

      setFile(null);
      return;

    }

    if (selected.size === 0) {

      setError('El archivo está vacío.');
      event.target.value = '';
      setFile(null);

      return;

    }

    if (selected.size > MAX_FILE_SIZE) {

      setError(
        'La evidencia no puede superar los 20 MB.'
      );

      event.target.value = '';
      setFile(null);

      return;

    }

    if (!ALLOWED_TYPES.includes(selected.type)) {

      setError(
        'Formato no permitido. Utiliza PDF, JPG, ' +
        'PNG, WEBP, XLS o XLSX.'
      );

      event.target.value = '';
      setFile(null);

      return;

    }

    setFile(selected);

  }

  function retirarArchivo() {

    if (saving || uploadedEvidence) return;

    setFile(null);

    if (fileInputRef.current) {

      fileInputRef.current.value = '';

    }

  }

  // ==========================================
  // GUARDAR Y VALIDAR CAPACITACIÓN
  // ==========================================

  async function guardarCapacitacion(event) {

    event.preventDefault();

    if (!canRegister || saving || !client) return;

    setError('');
    setSuccess('');

    const colaborador =
      colaboradoresMap.get(form.colaborador_id);

    const maquina =
      maquinasMap.get(form.maquina_id);

    const lider =
      colaboradoresMap.get(form.lider_id);

    // 1. Validaciones locales

    if (!colaborador?.activo) {

      setError(
        'Selecciona un colaborador activo.'
      );

      return;

    }

    if (
      !maquina?.activo ||
      !maquina?.requiere_autorizacion
    ) {

      setError(
        'Selecciona una máquina activa ' +
        'que requiera autorización.'
      );

      return;

    }

    if (!lider?.activo || !lider?.es_lider) {

      setError(
        'Selecciona un líder de capacitación activo.'
      );

      return;

    }

    if (form.colaborador_id === form.lider_id) {

      setError(
        'El líder no puede validar su propia ' +
        'capacitación como instructor.'
      );

      return;

    }

    if (
      !form.fecha_capacitacion ||
      form.fecha_capacitacion > fechaGuatemala()
    ) {

      setError(
        'La fecha de capacitación no es válida.'
      );

      return;

    }

    if (
      !form.firma_lider ||
      !form.firma_colaborador
    ) {

      setError(
        'Debes confirmar las firmas del líder ' +
        'y del colaborador en la evidencia.'
      );

      return;

    }

    if (!file && !uploadedEvidence) {

      setError(
        'Debes adjuntar la evidencia de capacitación.'
      );

      return;

    }

    // 2. Confirmar validación documental

    const confirmed = window.confirm(
      '¿Confirmas que revisaste la evidencia ' +
      'de capacitación de ' +
      colaborador.nombre +
      ' en ' +
      maquina.nombre +
      '? Se registrará la validación del ' +
      'ingeniero de procesos.'
    );

    if (!confirmed) return;

    setSaving(true);

    let evidence = uploadedEvidence;

    try {

      // 3. Verificar sesión y perfil

      setSavingStage('Verificando sesión...');

      const {
        data: userData,
        error: userError
      } = await client.auth.getUser();

      if (userError || !userData?.user) {

        throw new Error(
          'La sesión no está disponible. ' +
          'Inicia sesión nuevamente.'
        );

      }

      const {
        data: actualRole,
        error: roleError
      } = await client.rpc('cap_rol_actual');

      if (
        roleError ||
        actualRole !== 'ING_PROCESOS'
      ) {

        throw new Error(
          'No tienes permisos para registrar ' +
          'capacitaciones de máquinas.'
        );

      }

      // 4. Cargar evidencia en Storage privado

      if (!evidence) {

        setSavingStage('Cargando evidencia...');

        const uniqueId = crypto.randomUUID();

        const path =
          `maquinas/${form.colaborador_id}/` +
          `${form.maquina_id}/${uniqueId}_` +
          safeFileName(file.name);

        const {
          error: uploadError
        } = await client.storage
          .from(BUCKET)
          .upload(path, file, {

            cacheControl: '3600',

            upsert: false,

            contentType: file.type

          });

        if (uploadError) {

          throw uploadError;

        }

        evidence = {

          path,

          nombre: file.name,

          colaborador_id: form.colaborador_id,

          maquina_id: form.maquina_id

        };

        setUploadedEvidence(evidence);

      }

      if (
        evidence.colaborador_id !==
          form.colaborador_id ||
        evidence.maquina_id !==
          form.maquina_id
      ) {

        throw new Error(
          'La evidencia cargada no corresponde ' +
          'al colaborador y máquina seleccionados.'
        );

      }

      // 5. Ejecutar RPC de validación

      setSavingStage('Validando capacitación...');

      const {
        error: rpcError
      } = await client.rpc(

        'cap_validar_capacitacion_maquina',

        {

          p_colaborador_id:
            form.colaborador_id,

          p_maquina_id:
            form.maquina_id,

          p_lider_id:
            form.lider_id,

          p_fecha_capacitacion:
            form.fecha_capacitacion,

          p_evidencia_path:
            evidence.path,

          p_evidencia_nombre:
            evidence.nombre,

          p_firma_lider:
            form.firma_lider,

          p_firma_colaborador:
            form.firma_colaborador,

          p_observaciones:
            form.observaciones.trim() || null

        }

      );

      if (rpcError) {

        throw rpcError;

      }

      // 6. Confirmación

      setSuccess(
        'Capacitación registrada y validada ' +
        'correctamente. Consulta su estado de ' +
        'autorización en el módulo correspondiente.'
      );

      setShowForm(false);

      setForm({
        ...initialForm
      });

      setFile(null);

      setUploadedEvidence(null);

      await cargarDatos();

    } catch (err) {

      setError(
        'No fue posible completar la validación: ' +
        err.message
      );

      // No intentar eliminar objetos directamente.
      // El bucket no permite DELETE a estos perfiles.
      // Se conserva el archivo para reintentar la RPC.

      if (evidence) {

        setUploadedEvidence(evidence);

      }

    } finally {

      setSaving(false);
      setSavingStage('');

    }

  }

  // ==========================================
  // CONSULTAR EVIDENCIA PRIVADA
  // ==========================================

  async function abrirEvidencia(capacitacion) {

    if (
      !canReadEvidence ||
      !client ||
      !capacitacion.evidencia_path ||
      openingId
    ) {

      return;

    }

    setOpeningId(capacitacion.id);
    setError('');

    // Abrir la ventana antes de la consulta
    // para evitar bloqueo de ventanas emergentes.

    const preview = window.open(
      'about:blank',
      '_blank'
    );

    if (!preview) {

      setOpeningId(null);

      setError(
        'Permite las ventanas emergentes ' +
        'para consultar el documento.'
      );

      return;

    }

    preview.opener = null;

    try {

      const {
        data,
        error
      } = await client.storage

        .from(BUCKET)

        .createSignedUrl(
          capacitacion.evidencia_path,
          60
        );

      if (error) throw error;

      if (!data?.signedUrl) {

        throw new Error(
          'No se obtuvo acceso al documento.'
        );

      }

      preview.location.replace(
        data.signedUrl
      );

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

    <div className="cap-capacitacion-maquinas">

      {/* ENCABEZADO */}

      <div className="cap-panel cap-toolbar">

        <div>

          <h2>Capacitación de máquinas</h2>

          <p className="cap-muted">

            Registro, evidencias y validación
            de competencias operativas.

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

          {canRegister && (

            <button
              type="button"
              className="cap-primary"
              onClick={nuevaCapacitacion}
              disabled={
                loading ||
                saving ||
                showForm
              }
            >

              <Plus size={18} />
              Nueva capacitación

            </button>

          )}

        </div>

      </div>

      {/* MENSAJES */}

      {error && (

        <div
          className="cap-error"
          role="alert"
        >

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

          <GraduationCap
            size={24}
            color="#164b83"
          />

          <div className="cap-kpi-label">

            Capacitaciones consultadas

          </div>

          <div className="cap-kpi-value">

            {indicadores.registros}

          </div>

          <div className="cap-kpi-description">

            Registros históricos cargados

          </div>

        </div>

        <div className="cap-kpi">

          <Users
            size={24}
            color="#164b83"
          />

          <div className="cap-kpi-label">

            Combinaciones capacitadas

          </div>

          <div className="cap-kpi-value">

            {indicadores.combinaciones}

          </div>

          <div className="cap-kpi-description">

            Colaborador - máquina

          </div>

        </div>

        <div className="cap-kpi cap-kpi-warning">

          <ClipboardCheck
            size={24}
            color="#b45309"
          />

          <div className="cap-kpi-label">

            Pendientes de autorización

          </div>

          <div className="cap-kpi-value">

            {indicadores.pendientes}

          </div>

          <div className="cap-kpi-description">

            Según estado del motor

          </div>

        </div>

        <div className="cap-kpi cap-kpi-success">

          <ShieldCheck
            size={24}
            color="#15803d"
          />

          <div className="cap-kpi-label">

            Combinaciones autorizadas

          </div>

          <div className="cap-kpi-value">

            {indicadores.autorizadas}

          </div>

          <div className="cap-kpi-description">

            Permisos de operación vigentes

          </div>

        </div>

      </div>

      {/* FORMULARIO */}

      {showForm && canRegister && (

        <form
          className="cap-panel"
          onSubmit={guardarCapacitacion}
        >

          <div className="cap-toolbar">

            <h2>Registrar capacitación</h2>

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

            {/* COLABORADOR */}

            <div className="cap-field">

              <label htmlFor="cap-cmaq-colaborador">

                Colaborador *

              </label>

              <select
                id="cap-cmaq-colaborador"
                value={form.colaborador_id}
                onChange={e => {

                  const id = e.target.value;

                  setForm(previous => ({

                    ...previous,

                    colaborador_id: id,

                    lider_id:
                      previous.lider_id === id
                        ? ''
                        : previous.lider_id

                  }));

                }}
                required
                disabled={
                  saving ||
                  Boolean(uploadedEvidence)
                }
              >

                <option value="">

                  Seleccionar colaborador...

                </option>

                {colaboradoresActivos.map(c => (

                  <option
                    key={c.id}
                    value={c.id}
                  >

                    {c.codigo} - {c.nombre}

                  </option>

                ))}

              </select>

              {colaboradorSeleccionado && (

                <span className="cap-muted">

                  Puesto: {
                    colaboradorSeleccionado.puesto ||
                    'No registrado'
                  }

                </span>

              )}

            </div>

            {/* MÁQUINA */}

            <div className="cap-field">

              <label htmlFor="cap-cmaq-maquina">

                Máquina *

              </label>

              <select
                id="cap-cmaq-maquina"
                value={form.maquina_id}
                onChange={e =>
                  updateField(
                    'maquina_id',
                    e.target.value
                  )
                }
                required
                disabled={
                  saving ||
                  Boolean(uploadedEvidence)
                }
              >

                <option value="">

                  Seleccionar máquina...

                </option>

                {maquinasActivas.map(m => (

                  <option
                    key={m.id}
                    value={m.id}
                  >

                    {m.codigo} - {m.nombre}

                  </option>

                ))}

              </select>

              {maquinaSeleccionada && (

                <span className="cap-muted">

                  Procesos: {
                    (maquinaSeleccionada.procesos || [])
                      .join(', ') ||
                    'No registrados'
                  }

                </span>

              )}

            </div>

            {/* LÍDER */}

            <div className="cap-field">

              <label htmlFor="cap-cmaq-lider">

                Líder de capacitación *

              </label>

              <select
                id="cap-cmaq-lider"
                value={form.lider_id}
                onChange={e =>
                  updateField(
                    'lider_id',
                    e.target.value
                  )
                }
                required
                disabled={saving}
              >

                <option value="">

                  Seleccionar líder...

                </option>

                {lideresActivos
                  .filter(l =>
                    l.id !== form.colaborador_id
                  )
                  .map(l => (

                    <option
                      key={l.id}
                      value={l.id}
                    >

                      {l.codigo} - {l.nombre}

                    </option>

                  ))}

              </select>

              <span className="cap-muted">

                Solo colaboradores activos
                identificados como líderes.

              </span>

            </div>

            {/* FECHA */}

            <div className="cap-field">

              <label htmlFor="cap-cmaq-fecha">

                Fecha de capacitación *

              </label>

              <input
                id="cap-cmaq-fecha"
                type="date"
                max={fechaGuatemala()}
                value={form.fecha_capacitacion}
                onChange={e =>
                  updateField(
                    'fecha_capacitacion',
                    e.target.value
                  )
                }
                required
                disabled={saving}
              />

            </div>

          </div>

          {/* ESTADO ACTUAL */}

          {form.colaborador_id &&
           form.maquina_id && (

            <div className="cap-alert-info">

              <strong>

                Estado actual de la combinación:

              </strong>

              {' '}

              <span className={
                statusClass(
                  estadoSeleccionado?.estado
                )
              }>

                {
                  String(
                    estadoSeleccionado?.estado ||
                    'SIN_CAPACITACION'
                  ).replaceAll('_', ' ')
                }

              </span>

              {estadoSeleccionado?.autorizado && (

                <p>

                  El colaborador ya tiene
                  autorización para esta máquina.
                  Revisa si corresponde registrar
                  una capacitación adicional.

                </p>

              )}

            </div>

          )}

          {/* FIRMAS */}

          <div
            className="cap-field"
            style={{ marginTop: 20 }}
          >

            <h3>Verificación documental</h3>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 0'
            }}>

              <input
                type="checkbox"
                checked={form.firma_lider}
                onChange={e =>
                  updateField(
                    'firma_lider',
                    e.target.checked
                  )
                }
                disabled={saving}
                style={{ width: 18 }}
                required
              />

              La evidencia contiene
              la firma del líder.

            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 0'
            }}>

              <input
                type="checkbox"
                checked={form.firma_colaborador}
                onChange={e =>
                  updateField(
                    'firma_colaborador',
                    e.target.checked
                  )
                }
                disabled={saving}
                style={{ width: 18 }}
                required
              />

              La evidencia contiene
              la firma del colaborador.

            </label>

            <span className="cap-muted">

              Estas casillas confirman la revisión
              de las firmas existentes en el documento.
              No constituyen firmas electrónicas.

            </span>

          </div>

          {/* EVIDENCIA */}

          <div className="cap-field">

            <h3>Evidencia de capacitación *</h3>

            {!uploadedEvidence ? (

              <div className="cap-upload">

                <UploadCloud size={38} />

                <strong>

                  Adjuntar registro de capacitación

                </strong>

                <p className="cap-muted">

                  PDF, JPG, PNG, WEBP, XLS o XLSX.
                  Máximo 20 MB.

                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  aria-label="Adjuntar evidencia"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx"
                  onChange={seleccionarArchivo}
                  disabled={saving}
                />

              </div>

            ) : (

              <div className="cap-alert-warning">

                <strong>

                  Evidencia cargada en Storage.

                </strong>

                <p>

                  El documento ya fue cargado,
                  pero la validación está pendiente.
                  Puedes corregir los demás datos
                  y volver a guardar sin duplicar
                  la carga.

                </p>

              </div>

            )}

            {(file || uploadedEvidence) && (

              <div
                className="cap-toolbar"
                style={{
                  padding: 12,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8
                }}
              >

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  minWidth: 0
                }}>

                  <FileText
                    size={24}
                    color="#164b83"
                  />

                  <div style={{
                    overflowWrap: 'anywhere'
                  }}>

                    <strong>

                      {
                        uploadedEvidence?.nombre ||
                        file?.name
                      }

                    </strong>

                    {file && (

                      <div className="cap-muted">

                        {formatSize(file.size)}

                      </div>

                    )}

                  </div>

                </div>

                {!uploadedEvidence && (

                  <button
                    type="button"
                    className="cap-secondary"
                    onClick={retirarArchivo}
                    disabled={saving}
                  >

                    <X size={16} />
                    Retirar

                  </button>

                )}

              </div>

            )}

          </div>

          {/* OBSERVACIONES */}

          <div className="cap-field">

            <label htmlFor="cap-cmaq-observaciones">

              Observaciones

            </label>

            <textarea
              id="cap-cmaq-observaciones"
              value={form.observaciones}
              onChange={e =>
                updateField(
                  'observaciones',
                  e.target.value
                )
              }
              placeholder={
                'Observaciones de capacitación, ' +
                'evaluación práctica o validación...'
              }
              disabled={saving}
            />

          </div>

          {/* INFORMACIÓN */}

          <div className="cap-alert-info">

            <strong>

              Validación no equivale a autorización.

            </strong>

            <p>

              El ingeniero de procesos valida
              la capacitación y su evidencia.

              El jefe de producción deberá revisar
              y emitir el VoBo correspondiente
              antes de autorizar la operación.

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
                ? savingStage || 'Guardando...'
                : 'Registrar y validar'}

            </button>

          </div>

        </form>

      )}

      {/* HISTORIAL */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>Historial de capacitaciones</h2>

          <span className="cap-muted">

            {filtered.length} registros

          </span>

        </div>

        <div className="cap-search">

          <Search size={18} />

          <input
            value={search}
            onChange={e =>
              setSearch(e.target.value)
            }
            placeholder="Buscar colaborador, máquina o líder..."
            aria-label="Buscar capacitaciones"
          />

        </div>

        {/* FILTROS */}

        <div className="cap-form-grid">

          <div className="cap-field">

            <label htmlFor="cap-cmaq-filtro-maquina">

              Máquina

            </label>

            <select
              id="cap-cmaq-filtro-maquina"
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

          <div className="cap-field">

            <label htmlFor="cap-cmaq-filtro-estado">

              Estado de capacitación

            </label>

            <select
              id="cap-cmaq-filtro-estado"
              value={filterEstado}
              onChange={e =>
                setFilterEstado(e.target.value)
              }
            >

              <option value="TODOS">

                Todos los estados

              </option>

              {estadosDisponibles.map(estado => (

                <option
                  key={estado}
                  value={estado}
                >

                  {estado.replaceAll('_', ' ')}

                </option>

              ))}

            </select>

          </div>

        </div>

        {capacitaciones.length >= 1000 && (

          <div className="cap-alert-warning">

            <AlertTriangle size={18} />

            {' '}

            Se muestran hasta 1,000 registros
            históricos. Será necesario implementar
            paginación para consultar el historial
            completo.

          </div>

        )}

        {/* TABLA */}

        {loading ? (

          <div
            className="cap-welcome"
            role="status"
          >

            <RefreshCw size={32} />

            <p>Cargando capacitaciones...</p>

          </div>

        ) : (

          <div className="cap-table-wrap">

            <table>

              <thead>

                <tr>

                  <th>Fecha</th>
                  <th>Colaborador</th>
                  <th>Máquina</th>
                  <th>Líder</th>
                  <th>Firmas</th>
                  <th>Capacitación</th>
                  <th>Autorización actual</th>

                  {canReadEvidence && (

                    <th>Evidencia</th>

                  )}

                </tr>

              </thead>

              <tbody>

                {filtered.map(c => {

                  const colaborador =
                    colaboradoresMap.get(
                      c.colaborador_id
                    );

                  const maquina =
                    maquinasMap.get(
                      c.maquina_id
                    );

                  const lider =
                    colaboradoresMap.get(
                      c.lider_id
                    );

                  const estadoActual =
                    matrizMap.get(
                      `${c.colaborador_id}-${c.maquina_id}`
                    );

                  return (

                    <tr key={c.id}>

                      <td>

                        {formatDate(
                          c.fecha_capacitacion
                        )}

                      </td>

                      <td>

                        <strong>

                          {colaborador?.nombre || '—'}

                        </strong>

                        <div className="cap-muted">

                          {colaborador?.codigo}

                        </div>

                      </td>

                      <td>

                        {maquina?.nombre || '—'}

                      </td>

                      <td>

                        {lider?.nombre || '—'}

                      </td>

                      <td>

                        <span className={
                          c.firma_lider &&
                          c.firma_colaborador

                            ? 'cap-status cap-status-success'

                            : 'cap-status cap-status-warning'
                        }>

                          {
                            Number(
                              Boolean(c.firma_lider)
                            ) +
                            Number(
                              Boolean(c.firma_colaborador)
                            )
                          }

                          /2

                        </span>

                      </td>

                      <td>

                        <span className={
                          statusClass(c.estado)
                        }>

                          {
                            String(c.estado || '—')
                              .replaceAll('_', ' ')
                          }

                        </span>

                        {canReadEvidence &&
                         c.motivo_devolucion && (

                          <div
                            className="cap-muted"
                            style={{ marginTop: 6 }}
                          >

                            {c.motivo_devolucion}

                          </div>

                        )}

                      </td>

                      <td>

                        <span className={
                          statusClass(
                            estadoActual?.estado
                          )
                        }>

                          {
                            String(
                              estadoActual?.estado ||
                              'NO DISPONIBLE'
                            ).replaceAll('_', ' ')
                          }

                        </span>

                      </td>

                      {canReadEvidence && (

                        <td>

                          {c.evidencia_path ? (

                            <button
                              type="button"
                              className="cap-secondary"
                              disabled={
                                Boolean(openingId)
                              }
                              onClick={() =>
                                abrirEvidencia(c)
                              }
                              title={
                                c.evidencia_nombre ||
                                'Consultar evidencia'
                              }
                            >

                              <ExternalLink size={15} />

                              {
                                openingId === c.id
                                  ? 'Abriendo...'
                                  : 'Ver evidencia'
                              }

                            </button>

                          ) : '—'}

                        </td>

                      )}

                    </tr>

                  );

                })}

                {filtered.length === 0 && (

                  <tr>

                    <td
                      className="cap-empty"
                      colSpan={
                        canReadEvidence ? 8 : 7
                      }
                    >

                      No se encontraron
                      capacitaciones registradas.

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
