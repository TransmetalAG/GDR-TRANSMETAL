
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef
} from 'react';

import {
  User,
  Users,
  UserCheck,
  Camera,
  Factory,
  ShieldCheck,
  ShieldAlert,
  Award,
  GraduationCap,
  CalendarClock,
  QrCode,
  Search,
  RefreshCw,
  Download,
  ExternalLink,
  FileText,
  Save,
  X
} from 'lucide-react';

import * as XLSX from 'xlsx';

import './capacitacion.css';

// ==========================================
// CONFIGURACIÓN
// ==========================================

const BUCKET = 'capacitacion-evidencias';

const MAX_PHOTO_SIZE = 20 * 1024 * 1024;

const PHOTO_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const CAMPOS_COLABORADOR = [
  'id',
  'codigo',
  'nombre',
  'puesto',
  'area',
  'fecha_ingreso',
  'es_lider',
  'fotografia_path',
  'activo',
  'fecha_baja',
  'observaciones'
].join(',');

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
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);

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

  return denominador > 0
    ? Math.round(numerador / denominador * 1000) / 10
    : null;

}

function formatPercent(value) {

  return value == null
    ? 'N/A'
    : `${value.toFixed(1)}%`;

}

function textValue(value) {

  const text = String(value ?? '');

  return /^[=+\-@\t\r]/.test(text)
    ? "'" + text
    : text;

}

function estadoLabel(value) {

  const labels = {
    CRITICO: 'Vencimiento crítico',
    PROXIMO_A_VENCER: 'Próximo a vencer',
    PENDIENTE_VOBO: 'Pendiente de VoBo',
    NO_REQUIERE_AUTORIZACION: 'No requiere autorización',
    CERTIFICACION_NO_VALIDA: 'Certificación no válida',
    SIN_VENCIMIENTO: 'Sin vencimiento',
    APTITUD_MEDICA: 'Aptitud médica',
    ENTRENAMIENTO: 'Entrenamiento práctico',
    ENTRENAMIENTO_PRACTICO: 'Entrenamiento práctico',
    CERTIFICACION: 'Certificación adicional'
  };

  return labels[value] ||
    String(value || 'NO_DISPONIBLE')
      .replaceAll('_', ' ');

}

function statusClass(estado) {

  if ([
    'AUTORIZADO',
    'AUTORIZADA',
    'VALIDADO',
    'VALIDADA',
    'VIGENTE',
    'ACTIVO',
    'APTO'
  ].includes(estado)) {

    return 'cap-status cap-status-success';

  }

  if ([
    'PENDIENTE',
    'PENDIENTE_VOBO',
    'CAPACITADO',
    'CRITICO',
    'PROXIMO_A_VENCER',
    'REQUISITOS_PENDIENTES'
  ].includes(estado)) {

    return 'cap-status cap-status-warning';

  }

  if ([
    'VENCIDO',
    'NO_AUTORIZADO',
    'SUSPENDIDO',
    'REVOCADO',
    'REVOCADA',
    'SUSPENDIDA',
    'DEVUELTO',
    'DEVUELTA',
    'REQUISITOS_INCOMPLETOS',
    'NO_APTO'
  ].includes(estado)) {

    return 'cap-status cap-status-danger';

  }

  return 'cap-status cap-status-neutral';

}

function Estado({ value, optional = false }) {

  return (
    <span className={
      optional
        ? 'cap-status cap-status-optional'
        : statusClass(value)
    }>
      {estadoLabel(value)}
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

function ProgressBar({ value, color = '#164b83' }) {

  return (
    <div>
      <strong style={{ color, fontSize: 24 }}>
        {formatPercent(value)}
      </strong>

      <div style={{
        height: 10,
        background: '#e2e8f0',
        borderRadius: 10,
        overflow: 'hidden',
        margin: '10px 0'
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, value ?? 0))}%`,
          background: color,
          borderRadius: 10
        }}/>
      </div>
    </div>
  );

}

// ==========================================
// CONSULTA PAGINADA
// ==========================================

async function consultarPaginas(builder) {

  const pageSize = 200;
  const registros = [];

  for (let offset = 0; ; offset += pageSize) {

    const { data, error } = await builder()
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const page = data || [];

    registros.push(...page);

    if (page.length < pageSize) {
      break;
    }

  }

  return registros;

}

async function consultarPorIds(
  client,
  tabla,
  campos,
  columna,
  ids
) {

  const registros = [];

  for (let i = 0; i < ids.length; i += 100) {

    const page = await consultarPaginas(() =>
      client
        .from(tabla)
        .select(campos)
        .in(columna, ids.slice(i, i + 100))
        .order('id')
    );

    registros.push(...page);

  }

  return registros;

}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function ExpedienteColaborador({
  client,
  role
}) {

  const canRead =
    role === 'JEFE_PRODUCCION';

  const [colaboradores, setColaboradores] =
    useState([]);

  const [selectedId, setSelectedId] =
    useState('');

  const [expediente, setExpediente] =
    useState(null);

  const [perfil, setPerfil] =
    useState(null);

  const [maquinas, setMaquinas] =
    useState([]);

  const [riesgos, setRiesgos] =
    useState([]);

  const [vencimientos, setVencimientos] =
    useState([]);

  const [capacitaciones, setCapacitaciones] =
    useState([]);

  const [registrosRC, setRegistrosRC] =
    useState([]);

  const [evidenciasRC, setEvidenciasRC] =
    useState([]);

  const [credenciales, setCredenciales] =
    useState([]);

  const [asignaciones, setAsignaciones] =
    useState([]);

  const [photoUrl, setPhotoUrl] =
    useState('');

  const [photoFile, setPhotoFile] =
    useState(null);

  const [photoPreview, setPhotoPreview] =
    useState('');

  const [uploadedPhoto, setUploadedPhoto] =
    useState(null);

  const [loadingCatalogo, setLoadingCatalogo] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [opening, setOpening] =
    useState(false);

  const [error, setError] =
    useState('');

  const [warning, setWarning] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [includeInactive, setIncludeInactive] =
    useState(false);

  const [tab, setTab] =
    useState('RESUMEN');

  const [soloAutorizadas, setSoloAutorizadas] =
    useState(false);

  const [searchMaquina, setSearchMaquina] =
    useState('');

  const [fechaConsulta, setFechaConsulta] =
    useState(null);

  const requestRef = useRef(0);

  const selectionRef = useRef('');

  const savingRef = useRef(false);

  const mountedRef = useRef(false);

  const fileRef = useRef(null);

  // ==========================================
  // VERIFICACIÓN DE PERMISOS
  // ==========================================

  const verificarPermisos = useCallback(async () => {

    if (!client || !canRead) {
      throw new Error('Acceso restringido.');
    }

    const { data: authData, error: authError } =
      await client.auth.getUser();

    if (authError || !authData?.user) {
      throw new Error('La sesión no está disponible.');
    }

    const { data: actualRole, error: roleError } =
      await client.rpc('cap_rol_actual');

    if (
      roleError ||
      actualRole !== 'JEFE_PRODUCCION'
    ) {
      throw new Error(
        'El expediente administrativo requiere el perfil Jefe de producción.'
      );
    }

    return authData.user.id;

  }, [client, canRead]);

  // ==========================================
  // CATÁLOGO DE COLABORADORES
  // ==========================================

  const cargarCatalogo = useCallback(async () => {

    if (!client || !canRead) {
      setLoadingCatalogo(false);
      return;
    }

    setLoadingCatalogo(true);

    try {

      await verificarPermisos();

      const data = await consultarPaginas(() =>
        client
          .from('cap_colaboradores')
          .select(CAMPOS_COLABORADOR)
          .order('nombre')
          .order('id')
      );

      if (mountedRef.current) {
        setColaboradores(data);
      }

    } catch (err) {

      if (mountedRef.current) {
        setColaboradores([]);
        setError(
          'No fue posible consultar los colaboradores: ' +
          err.message
        );
      }

    } finally {

      if (mountedRef.current) {
        setLoadingCatalogo(false);
      }

    }

  }, [client, canRead, verificarPermisos]);

  // ==========================================
  // LIMPIAR EXPEDIENTE
  // ==========================================

  const limpiarExpediente = useCallback(() => {

    setExpediente(null);
    setPerfil(null);
    setMaquinas([]);
    setRiesgos([]);
    setVencimientos([]);
    setCapacitaciones([]);
    setRegistrosRC([]);
    setEvidenciasRC([]);
    setCredenciales([]);
    setAsignaciones([]);
    setPhotoUrl('');
    setFechaConsulta(null);

  }, []);

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  useEffect(() => {

    mountedRef.current = true;
    selectionRef.current = '';

    setSelectedId('');
    setColaboradores([]);
    setPhotoFile(null);
    setUploadedPhoto(null);
    setSuccess('');
    setError('');
    setWarning('');

    limpiarExpediente();
    cargarCatalogo();

    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      selectionRef.current = '';
    };

  }, [
    cargarCatalogo,
    limpiarExpediente
  ]);

  // ==========================================
  // CONSULTAR EXPEDIENTE ADMINISTRATIVO
  // ==========================================

  const cargarExpediente = useCallback(async (id) => {

    if (!client || !canRead || !id) {
      return;
    }

    const requestId = ++requestRef.current;

    setLoading(true);
    setError('');
    setWarning('');

    limpiarExpediente();

    const isCurrent = () =>
      mountedRef.current &&
      requestRef.current === requestId &&
      selectionRef.current === id;

    try {

      await verificarPermisos();

      // 1. Consultar expediente y datos operativos.

      const [
        expedienteResponse,
        perfilResponse,
        maquinasData,
        riesgosData,
        vencimientosData,
        capacitacionesData,
        asignacionesData,
        credencialesData
      ] = await Promise.all([

        client.rpc(
          'cap_expediente_administrativo',
          {
            p_colaborador_id: id
          }
        ),

        client
          .from('cap_colaboradores')
          .select(CAMPOS_COLABORADOR)
          .eq('id', id)
          .single(),

        consultarPaginas(() =>
          client.rpc('cap_matriz_maquinas')
            .eq('colaborador_id', id)
            .order('maquina_id')
        ),

        consultarPaginas(() =>
          client.rpc('cap_matriz_rc')
            .eq('colaborador_id', id)
            .order('riesgo_critico_id')
        ),

        consultarPaginas(() =>
          client.rpc('cap_consultar_vencimientos')
            .eq('colaborador_id', id)
            .order('registro_id')
            .order('requisito')
        ),

        consultarPaginas(() =>
          client
            .from('cap_maquinas_capacitaciones')
            .select(`
              id,
              colaborador_id,
              maquina_id,
              lider_id,
              fecha_capacitacion,
              evidencia_path,
              evidencia_nombre,
              firma_lider,
              firma_colaborador,
              estado,
              fecha_validacion
            `)
            .eq('colaborador_id', id)
            .order('fecha_capacitacion', {
              ascending: false
            })
            .order('id')
        ),

        consultarPaginas(() =>
          client
            .from('cap_rc_asignaciones')
            .select(`
              id,
              colaborador_id,
              riesgo_critico_id,
              aplica,
              activo
            `)
            .eq('colaborador_id', id)
            .order('id')
        ),

        consultarPaginas(() =>
          client
            .from('cap_credenciales_qr')
            .select(`
              id,
              colaborador_id,
              created_at,
              activo,
              fecha_revocacion
            `)
            .eq('colaborador_id', id)
            .order('created_at', {
              ascending: false
            })
            .order('id')
        )

      ]);

      if (expedienteResponse.error) {
        throw expedienteResponse.error;
      }

      if (perfilResponse.error) {
        throw perfilResponse.error;
      }

      if (!expedienteResponse.data) {
        throw new Error('Expediente no disponible.');
      }

      if (!isCurrent()) return;

      // 2. Consultar registros históricos de RC.

      const asignacionIds = asignacionesData.map(
        a => a.id
      );

      const registrosData = await consultarPorIds(
        client,
        'cap_rc_registros',
        `
          id,
          asignacion_id,
          tipo_requisito,
          fecha_realizacion,
          fecha_vencimiento,
          estado,
          cuenta_certificacion,
          institucion,
          fecha_certificacion,
          vencimiento_certificacion
        `,
        'asignacion_id',
        asignacionIds
      );

      // No se consultan diagnósticos clínicos.

      const evidenciasData = await consultarPorIds(
        client,
        'cap_rc_evidencias',
        `
          id,
          registro_id,
          tipo_evidencia,
          archivo_nombre,
          archivo_path
        `,
        'registro_id',
        registrosData.map(r => r.id)
      );

      if (!isCurrent()) return;

      // 3. Consultar catálogos históricos.
      // Permite identificar equipos y RC inactivos.

      const [catalogoMaquinas, catalogoRC] =
        await Promise.all([

          consultarPaginas(() =>
            client
              .from('cap_maquinas')
              .select('id,nombre,codigo,activo')
              .order('id')
          ),

          consultarPaginas(() =>
            client
              .from('cap_riesgos_criticos')
              .select('id,nombre,abreviatura,activo')
              .order('id')
          )

        ]);

      if (!isCurrent()) return;

      const maquinasMap = new Map(
        catalogoMaquinas.map(m => [m.id, m])
      );

      const riesgosMap = new Map(
        catalogoRC.map(r => [r.id, r])
      );

      const asignacionesMap = new Map(
        asignacionesData.map(a => [a.id, a])
      );

      // 4. Consultar fotografía privada.

      let fotografia = '';
      const avisos = [];

      const path =
        perfilResponse.data.fotografia_path;

      if (path) {

        if (!path.startsWith('fotografias/')) {

          avisos.push(
            'La ruta de fotografía no corresponde al directorio autorizado.'
          );

        } else {

          const { data, error } =
            await client.storage
              .from(BUCKET)
              .createSignedUrl(path, 300);

          if (error) {

            avisos.push(
              'No fue posible cargar la fotografía privada.'
            );

          } else {

            fotografia = data?.signedUrl || '';

          }

        }

      }

      if (!isCurrent()) return;

      // 5. Consolidar expediente.

      setExpediente(expedienteResponse.data);

      setPerfil(perfilResponse.data);

      setMaquinas(maquinasData);

      setRiesgos(riesgosData);

      setVencimientos(vencimientosData);

      setCapacitaciones(
        capacitacionesData.map(r => ({
          ...r,
          maquinaNombre:
            maquinasMap.get(r.maquina_id)?.nombre ||
            'Máquina no identificada'
        }))
      );

      setAsignaciones(asignacionesData);

      setRegistrosRC(
        registrosData.map(r => {

          const asignacion =
            asignacionesMap.get(r.asignacion_id);

          return {
            ...r,
            riesgoNombre:
              riesgosMap.get(
                asignacion?.riesgo_critico_id
              )?.nombre || 'Riesgo no identificado'
          };

        }).sort((a, b) =>
          String(b.fecha_realizacion || '')
            .localeCompare(
              String(a.fecha_realizacion || '')
            )
        )
      );

      setEvidenciasRC(evidenciasData);

      setCredenciales(credencialesData);

      setPhotoUrl(fotografia);

      setFechaConsulta(new Date());

      setWarning(avisos.join(' '));

    } catch (err) {

      if (!isCurrent()) return;

      limpiarExpediente();

      setError(
        'No fue posible consultar el expediente: ' +
        err.message
      );

    } finally {

      if (isCurrent()) {
        setLoading(false);
      }

    }

  }, [
    client,
    canRead,
    verificarPermisos,
    limpiarExpediente
  ]);

  // ==========================================
  // SELECCIONAR COLABORADOR
  // ==========================================

  function seleccionarColaborador(id) {

    if (savingRef.current) return;

    if (uploadedPhoto) {

      const confirmed = window.confirm(
        'Existe una fotografía cargada que todavía ' +
        'no se ha asociado al colaborador. ' +
        '¿Deseas abandonar esta operación?'
      );

      if (!confirmed) return;

    }

    requestRef.current += 1;

    selectionRef.current = id;

    setSelectedId(id);
    setPhotoFile(null);
    setUploadedPhoto(null);
    setSuccess('');
    setError('');
    setWarning('');
    setTab('RESUMEN');
    setSearchMaquina('');
    setSoloAutorizadas(false);

    limpiarExpediente();

    if (id) {

      cargarExpediente(id);

    } else {

      setLoading(false);

    }

  }

  const colaboradoresFiltrados = useMemo(() => {

    const term = normalize(search);

    return colaboradores.filter(c => {

      if (
        !includeInactive &&
        !c.activo
      ) return false;

      if (!term) return true;

      return [
        c.codigo,
        c.nombre,
        c.puesto,
        c.area
      ].some(value =>
        normalize(value).includes(term)
      );

    });

  }, [
    colaboradores,
    search,
    includeInactive
  ]);

  // ==========================================
  // INDICADORES DEL COLABORADOR
  // ==========================================

  const indicadores = useMemo(() => {

    const maquinasAplicables = maquinas.filter(
      m => ![
        'NO_REQUIERE_AUTORIZACION',
        'INACTIVO'
      ].includes(m.estado)
    );

    const maquinasAutorizadas =
      maquinasAplicables.filter(
        m => m.autorizado === true
      ).length;

    const riesgosAplicables = riesgos.filter(
      r =>
        r.asignacion_id &&
        r.aplica === true &&
        ![
          'INACTIVO',
          'NO_APLICA',
          'NO_REQUIERE_AUTORIZACION'
        ].includes(r.estado)
    );

    const riesgosAutorizados =
      riesgosAplicables.filter(
        r => r.autorizado === true
      ).length;

    const certificaciones =
      vencimientos.filter(
        v =>
          v.requisito === 'CERTIFICACION' &&
          [
            'VIGENTE',
            'CRITICO',
            'PROXIMO_A_VENCER',
            'SIN_VENCIMIENTO'
          ].includes(v.estado_vencimiento)
      ).length;

    const alertas = vencimientos.filter(
      v =>
        v.requisito !== 'CERTIFICACION' &&
        [
          'VENCIDO',
          'CRITICO',
          'PROXIMO_A_VENCER',
          'PENDIENTE'
        ].includes(v.estado_vencimiento)
    ).length;

    return {
      maquinasAplicables: maquinasAplicables.length,
      maquinasAutorizadas,
      coberturaMaquinas: porcentaje(
        maquinasAutorizadas,
        maquinasAplicables.length
      ),
      riesgosAplicables: riesgosAplicables.length,
      riesgosAutorizados,
      cumplimientoRC: porcentaje(
        riesgosAutorizados,
        riesgosAplicables.length
      ),
      certificaciones,
      alertas
    };

  }, [maquinas, riesgos, vencimientos]);

  const qrActivo = credenciales.find(
    q => q.activo === true
  );

  const maquinaFiltradas = useMemo(() => {

    const term = normalize(searchMaquina);

    return maquinas.filter(m => {

      if (
        soloAutorizadas &&
        !m.autorizado
      ) return false;

      if (!term) return true;

      return [
        m.maquina,
        m.estado,
        ...(m.procesos || [])
      ].some(value =>
        normalize(value).includes(term)
      );

    }).sort((a, b) =>
      String(a.maquina || '')
        .localeCompare(
          String(b.maquina || ''),
          'es'
        )
    );

  }, [
    maquinas,
    soloAutorizadas,
    searchMaquina
  ]);

  const documentosMap = useMemo(() => {

    const map = new Map();

    evidenciasRC.forEach(e => {

      if (!map.has(e.registro_id)) {
        map.set(e.registro_id, []);
      }

      map.get(e.registro_id).push(e);

    });

    return map;

  }, [evidenciasRC]);

  const requisitosObligatorios =
    vencimientos.filter(
      v => v.requisito !== 'CERTIFICACION'
    );

  const certificaciones =
    vencimientos.filter(
      v => v.requisito === 'CERTIFICACION'
    );

  // ==========================================
  // PREVISUALIZACIÓN LOCAL DE FOTOGRAFÍA
  // ==========================================

  useEffect(() => {

    if (!photoFile) {
      setPhotoPreview('');
      return;
    }

    const url = URL.createObjectURL(photoFile);

    setPhotoPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };

  }, [photoFile]);

  function seleccionarFoto(event) {

    if (saving || uploadedPhoto) return;

    const file = event.target.files?.[0];

    setError('');
    setSuccess('');

    if (!file) {
      setPhotoFile(null);
      return;
    }

    if (
      !PHOTO_TYPES[file.type] ||
      file.size === 0 ||
      file.size > MAX_PHOTO_SIZE
    ) {

      setError(
        'Selecciona una imagen JPG, PNG o WEBP ' +
        'de hasta 20 MB.'
      );

      event.target.value = '';
      setPhotoFile(null);

      return;

    }

    setPhotoFile(file);

  }

  function cancelarFoto() {

    if (saving) return;

    if (uploadedPhoto) {

      const confirmed = window.confirm(
        'La fotografía ya está cargada en Storage. ' +
        'Si cancelas, quedará pendiente de revisión administrativa. ' +
        '¿Deseas continuar?'
      );

      if (!confirmed) return;

    }

    setPhotoFile(null);
    setUploadedPhoto(null);

    if (fileRef.current) {
      fileRef.current.value = '';
    }

  }

  // ==========================================
  // GUARDAR FOTOGRAFÍA
  // ==========================================

  async function guardarFoto() {

    if (
      !perfil ||
      !canRead ||
      savingRef.current ||
      loading ||
      (!photoFile && !uploadedPhoto)
    ) return;

    const colaboradorId = perfil.id;

    const previousPath =
      perfil.fotografia_path;

    if (!window.confirm(
      `¿Actualizar la fotografía de ${perfil.nombre}?`
    )) return;

    savingRef.current = true;

    setSaving(true);
    setError('');
    setSuccess('');

    let uploaded = uploadedPhoto;

    try {

      await verificarPermisos();

      if (!uploaded) {

        const extension =
          PHOTO_TYPES[photoFile.type];

        const path =
          `fotografias/${colaboradorId}/` +
          `${crypto.randomUUID()}.${extension}`;

        const { error } =
          await client.storage
            .from(BUCKET)
            .upload(path, photoFile, {
              upsert: false,
              cacheControl: '300',
              contentType: photoFile.type
            });

        if (error) throw error;

        uploaded = {
          path,
          colaboradorId
        };

        setUploadedPhoto(uploaded);

      }

      if (uploaded.colaboradorId !== colaboradorId) {
        throw new Error(
          'La fotografía pertenece a otro expediente.'
        );
      }

      await verificarPermisos();

      // Evitar sobrescribir una fotografía
      // modificada desde otra sesión.

      let query = client
        .from('cap_colaboradores')
        .update({
          fotografia_path: uploaded.path
        })
        .eq('id', colaboradorId);

      query = previousPath == null
        ? query.is('fotografia_path', null)
        : query.eq('fotografia_path', previousPath);

      const { error } = await query
        .select('id')
        .single();

      if (error) throw error;

      setSuccess(
        'Fotografía actualizada correctamente.'
      );

      setPhotoFile(null);
      setUploadedPhoto(null);

      if (fileRef.current) {
        fileRef.current.value = '';
      }

      // Los archivos anteriores no se eliminan.
      // Storage no concede permiso DELETE.

      await cargarCatalogo();

      await cargarExpediente(colaboradorId);

    } catch (err) {

      setError(
        'No fue posible guardar la fotografía: ' +
        err.message
      );

      if (uploaded) {
        setUploadedPhoto(uploaded);
      }

    } finally {

      savingRef.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }

    }

  }

  // ==========================================
  // CONSULTAR DOCUMENTOS PRIVADOS
  // ==========================================

  async function abrirDocumento(path) {

    if (
      !client ||
      !canRead ||
      !path ||
      opening
    ) return;

    const carpetasPermitidas = [
      'maquinas',
      'moodle',
      'entrenamiento',
      'aptitud-medica',
      'certificaciones'
    ];

    const folder = path.split('/')[0];

    if (!carpetasPermitidas.includes(folder)) {

      setError(
        'La ruta del documento no está permitida.'
      );

      return;

    }

    const preview = window.open(
      'about:blank',
      '_blank'
    );

    if (!preview) {

      setError(
        'Permite las ventanas emergentes para consultar el documento.'
      );

      return;

    }

    preview.opener = null;

    setOpening(true);
    setError('');

    try {

      await verificarPermisos();

      const { data, error } =
        await client.storage
          .from(BUCKET)
          .createSignedUrl(path, 60);

      if (error) throw error;

      if (!data?.signedUrl || preview.closed) {
        throw new Error(
          'No fue posible abrir el documento.'
        );
      }

      preview.location.replace(data.signedUrl);

    } catch (err) {

      preview.close();

      setError(
        'No fue posible consultar la evidencia: ' +
        err.message
      );

    } finally {

      setOpening(false);

    }

  }

  // ==========================================
  // EXPORTAR RESUMEN OPERATIVO
  // ==========================================

  function exportarExcel() {

    if (
      !perfil ||
      !expediente ||
      !canRead ||
      loading ||
      saving
    ) return;

    try {

      const wb = XLSX.utils.book_new();

      function agregarHoja(nombre, rows, widths) {

        const ws = XLSX.utils.aoa_to_sheet(rows);

        ws['!cols'] = widths.map(
          wch => ({ wch })
        );

        XLSX.utils.book_append_sheet(
          wb,
          ws,
          nombre
        );

        return ws;

      }

      agregarHoja(
        'Ficha del colaborador',
        [
          ['TRANSMETAL'],
          ['EXPEDIENTE DE CAPACITACIÓN'],
          ['Fecha de consulta', formatDate(fechaConsulta)],
          [],
          ['Código', textValue(perfil.codigo)],
          ['Nombre', textValue(perfil.nombre)],
          ['Puesto', textValue(perfil.puesto)],
          ['Área', textValue(perfil.area)],
          ['Fecha de ingreso', perfil.fecha_ingreso || '—'],
          ['Estado', perfil.activo ? 'ACTIVO' : 'INACTIVO'],
          ['Líder', perfil.es_lider ? 'SÍ' : 'NO'],
          [],
          ['Máquinas aplicables', indicadores.maquinasAplicables],
          ['Máquinas autorizadas', indicadores.maquinasAutorizadas],
          ['Cobertura máquinas', formatPercent(indicadores.coberturaMaquinas)],
          ['RC aplicables', indicadores.riesgosAplicables],
          ['RC autorizados', indicadores.riesgosAutorizados],
          ['Cumplimiento RC', formatPercent(indicadores.cumplimientoRC)],
          ['Certificaciones válidas', indicadores.certificaciones],
          ['Credencial QR activa', qrActivo ? 'SÍ' : 'NO'],
          [],
          [
            'Nota',
            'Resumen administrativo. No sustituye la consulta operativa actualizada.'
          ],
          [
            'Nota',
            'No contiene documentos médicos, tokens QR ni enlaces privados.'
          ]
        ],
        [38, 85]
      );

      agregarHoja(
        'Maquinas',
        [
          [
            'Máquina',
            'Procesos',
            'Estado',
            'Autorizado'
          ],
          ...maquinas.map(m => [
            textValue(m.maquina),
            textValue((m.procesos || []).join(', ')),
            estadoLabel(m.estado),
            m.autorizado === true ? 'SÍ' : 'NO'
          ])
        ],
        [40, 40, 35, 18]
      );

      agregarHoja(
        'Riesgos criticos',
        [
          [
            'Riesgo crítico',
            'Abreviatura',
            'Aplica',
            'Estado',
            'Autorizado'
          ],
          ...riesgos.map(r => [
            textValue(r.riesgo_critico),
            textValue(r.abreviatura),
            r.asignacion_id
              ? r.aplica ? 'SÍ' : 'NO'
              : 'SIN ASIGNACIÓN',
            estadoLabel(r.estado),
            r.autorizado === true ? 'SÍ' : 'NO'
          ])
        ],
        [48, 15, 22, 35, 18]
      );

      agregarHoja(
        'Certificaciones',
        [
          [
            'Riesgo crítico',
            'Fecha de realización',
            'Vencimiento',
            'Estado'
          ],
          ...certificaciones.map(v => [
            textValue(v.riesgo_critico),
            v.fecha_realizacion || '—',
            v.fecha_vencimiento || 'Sin vencimiento',
            estadoLabel(v.estado_vencimiento)
          ])
        ],
        [48, 22, 25, 35]
      );

      const codigo = String(perfil.codigo || 'COL')
        .replace(/[^a-zA-Z0-9_-]/g, '_');

      XLSX.writeFile(
        wb,
        `Expediente_${codigo}_${fechaGuatemala()}.xlsx`
      );

      setSuccess(
        'Resumen operativo exportado correctamente.'
      );

    } catch (err) {

      setError(
        'No fue posible exportar el expediente: ' +
        err.message
      );

    }

  }

  // ==========================================
  // CONTROL DE ACCESO
  // ==========================================

  if (!client || !canRead) {

    return (
      <div className="cap-panel cap-welcome">
        <ShieldAlert size={45} />

        <h2>Expediente administrativo restringido</h2>

        <p>
          Esta información está disponible
          exclusivamente para el jefe de producción.
        </p>
      </div>
    );

  }

  const tabs = [
    {
      id: 'RESUMEN',
      label: 'Resumen',
      icon: UserCheck
    },
    {
      id: 'MAQUINAS',
      label: 'Máquinas',
      icon: Factory
    },
    {
      id: 'RC',
      label: 'Riesgos críticos',
      icon: ShieldCheck
    },
    {
      id: 'VENCIMIENTOS',
      label: 'Vencimientos',
      icon: CalendarClock
    },
    {
      id: 'EVIDENCIAS',
      label: 'Evidencias',
      icon: FileText
    },
    {
      id: 'QR',
      label: 'Credencial QR',
      icon: QrCode
    }
  ];

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (

    <div className="cap-expediente">

      {/* ENCABEZADO */}

      <div className="cap-panel cap-toolbar">

        <div>

          <h2>Expediente del colaborador</h2>

          <p className="cap-muted">
            Gestión individual de competencias,
            capacitación y autorizaciones.
          </p>

        </div>

        <button
          type="button"
          className="cap-primary"
          disabled={
            !perfil ||
            loading ||
            saving
          }
          onClick={exportarExcel}
        >
          <Download size={18} />
          Exportar resumen
        </button>

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

      {/* SELECTOR DE COLABORADOR */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>Seleccionar colaborador</h2>

          <button
            type="button"
            className="cap-secondary"
            disabled={loadingCatalogo || saving}
            onClick={cargarCatalogo}
          >
            <RefreshCw size={16} />
            Actualizar catálogo
          </button>

        </div>

        <div className="cap-search">

          <Search size={18} />

          <input
            value={search}
            aria-label="Buscar colaborador"
            placeholder="Buscar nombre, código o puesto..."
            onChange={e => setSearch(e.target.value)}
          />

        </div>

        <div className="cap-field">

          <label htmlFor="cap-exp-colaborador">
            Colaborador
          </label>

          <select
            id="cap-exp-colaborador"
            value={selectedId}
            disabled={loadingCatalogo || saving}
            onChange={e =>
              seleccionarColaborador(e.target.value)
            }
          >

            <option value="">
              Seleccionar colaborador...
            </option>

            {selectedId &&
             !colaboradoresFiltrados.some(
               c => c.id === selectedId
             ) && (

              <option value={selectedId}>
                {
                  colaboradores.find(
                    c => c.id === selectedId
                  )?.nombre || 'Colaborador seleccionado'
                }
              </option>

            )}

            {colaboradoresFiltrados.map(c => (

              <option key={c.id} value={c.id}>

                {c.codigo} - {c.nombre}

                {!c.activo ? ' (INACTIVO)' : ''}

              </option>

            ))}

          </select>

        </div>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>

          <input
            type="checkbox"
            checked={includeInactive}
            onChange={e =>
              setIncludeInactive(e.target.checked)
            }
          />

          Incluir colaboradores inactivos

        </label>

      </div>

      {/* ESTADO INICIAL */}

      {!selectedId && (

        <div className="cap-panel cap-welcome">

          <Users size={48} />

          <h2>Consulta de expediente individual</h2>

          <p>
            Selecciona un colaborador para consultar
            su ficha completa de capacitación.
          </p>

        </div>

      )}

      {loading && (

        <div className="cap-panel cap-welcome" role="status">

          <RefreshCw size={40} />

          <p>Cargando expediente...</p>

        </div>

      )}

      {/* EXPEDIENTE */}

      {perfil && expediente && !loading && (

        <>

          {/* FICHA PRINCIPAL */}

          <div className="cap-panel">

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              gap: 25
            }}>

              {/* FOTOGRAFÍA */}

              <div style={{
                width: 170,
                flexShrink: 0
              }}>

                <div style={{
                  width: 160,
                  height: 180,
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  background: '#f1f5f9',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>

                  {photoPreview || photoUrl ? (

                    <img
                      src={photoPreview || photoUrl}
                      alt={`Fotografía de ${perfil.nombre}`}
                      onError={() => {

                        if (!photoPreview) {
                          setPhotoUrl('');
                        }

                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />

                  ) : (

                    <User
                      size={85}
                      color="#94a3b8"
                    />

                  )}

                </div>

                <button
                  type="button"
                  className="cap-secondary"
                  style={{
                    width: '100%',
                    marginTop: 10
                  }}
                  disabled={saving || Boolean(uploadedPhoto)}
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera size={16} />

                  {perfil.fotografia_path
                    ? 'Cambiar foto'
                    : 'Cargar foto'}

                </button>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={seleccionarFoto}
                  style={{ display: 'none' }}
                />

              </div>

              {/* INFORMACIÓN GENERAL */}

              <div style={{
                flex: '1 1 280px'
              }}>

                <div className="cap-toolbar">

                  <div>

                    <div className="cap-muted">
                      TRANSMETAL · {perfil.codigo}
                    </div>

                    <h2 style={{
                      fontSize: 24,
                      color: '#164b83',
                      margin: '8px 0'
                    }}>
                      {perfil.nombre}
                    </h2>

                    <p style={{
                      color: '#475569',
                      fontSize: 16
                    }}>
                      {perfil.puesto}
                    </p>

                  </div>

                  <button
                    type="button"
                    className="cap-secondary"
                    disabled={saving}
                    onClick={() =>
                      cargarExpediente(perfil.id)
                    }
                  >
                    <RefreshCw size={16} />
                    Actualizar
                  </button>

                </div>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  marginBottom: 20
                }}>

                  <Estado value={
                    perfil.activo
                      ? 'ACTIVO'
                      : 'INACTIVO'
                  } />

                  {perfil.es_lider && (

                    <span className="cap-status cap-status-warning">
                      <Award size={15} />
                      LÍDER DE CAPACITACIÓN
                    </span>

                  )}

                </div>

                <div className="cap-form-grid">

                  <div className="cap-field">
                    <label>Código de colaborador</label>
                    <strong>{perfil.codigo}</strong>
                  </div>

                  <div className="cap-field">
                    <label>Área</label>
                    <strong>{perfil.area || '—'}</strong>
                  </div>

                  <div className="cap-field">
                    <label>Fecha de ingreso</label>
                    <strong>
                      {formatDate(perfil.fecha_ingreso)}
                    </strong>
                  </div>

                  <div className="cap-field">
                    <label>Credencial QR</label>
                    <Estado value={
                      qrActivo
                        ? 'ACTIVO'
                        : 'SIN_CREDENCIAL_ACTIVA'
                    } />
                  </div>

                  {!perfil.activo && (

                    <div className="cap-field">
                      <label>Fecha de baja</label>
                      <strong>
                        {formatDate(perfil.fecha_baja)}
                      </strong>
                    </div>

                  )}

                </div>

                {perfil.observaciones && (

                  <p className="cap-muted">
                    {perfil.observaciones}
                  </p>

                )}

              </div>

            </div>

            {/* GUARDAR FOTOGRAFÍA */}

            {(photoFile || uploadedPhoto) && (

              <div
                className="cap-alert-info"
                style={{ marginTop: 20 }}
              >

                <strong>
                  Actualización de fotografía
                </strong>

                <p>
                  {
                    uploadedPhoto
                      ? 'Fotografía cargada. Pendiente de asociación al expediente.'
                      : photoFile.name
                  }
                </p>

                <div className="cap-form-actions">

                  <button
                    type="button"
                    className="cap-secondary"
                    disabled={saving}
                    onClick={cancelarFoto}
                  >
                    <X size={16} />
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="cap-primary"
                    disabled={saving}
                    onClick={guardarFoto}
                  >
                    <Save size={16} />
                    {saving ? 'Guardando...' : 'Guardar fotografía'}
                  </button>

                </div>

              </div>

            )}

          </div>

          {/* COLABORADOR INACTIVO */}

          {!perfil.activo && (

            <div className="cap-alert-warning">

              Este colaborador está inactivo.
              Su expediente permanece disponible
              para consulta histórica.

              No debe utilizarse como acreditación
              de autorización operativa.

            </div>

          )}

          {/* INDICADORES */}

          <div className="cap-kpi-grid">

            <KPI
              icon={Factory}
              label="Máquinas autorizadas"
              value={indicadores.maquinasAutorizadas}
              description={
                `De ${indicadores.maquinasAplicables} aplicables`
              }
              variant="cap-kpi-success"
              color="#15803d"
            />

            <KPI
              icon={ShieldCheck}
              label="RC autorizados"
              value={indicadores.riesgosAutorizados}
              description={
                `De ${indicadores.riesgosAplicables} aplicables`
              }
              variant="cap-kpi-success"
              color="#15803d"
            />

            <KPI
              icon={Award}
              label="Certificaciones válidas"
              value={indicadores.certificaciones}
              description="Competencias adicionales"
              variant="cap-kpi-certification"
              color="#7c3aed"
            />

            <KPI
              icon={CalendarClock}
              label="Requisitos con alertas"
              value={indicadores.alertas}
              description="Seguimiento de vigencias obligatorias"
              variant="cap-kpi-warning"
              color="#b45309"
            />

          </div>

          {/* MENÚ DEL EXPEDIENTE */}

          <div className="cap-panel">

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8
            }}>

              {tabs.map(item => {

                const Icon = item.icon;

                return (

                  <button
                    type="button"
                    key={item.id}
                    className={
                      tab === item.id
                        ? 'cap-primary'
                        : 'cap-secondary'
                    }
                    aria-pressed={tab === item.id}
                    onClick={() => setTab(item.id)}
                  >
                    <Icon size={17} />
                    {item.label}
                  </button>

                );

              })}

            </div>

          </div>

          {/* ================================= */}
          {/* PESTAÑA RESUMEN                   */}
          {/* ================================= */}

          {tab === 'RESUMEN' && (

            <>

              <div className="cap-panel">

                <h2>Resumen de competencias</h2>

                <div className="cap-form-grid">

                  <div>

                    <h3>Cobertura de máquinas</h3>

                    <ProgressBar
                      value={indicadores.coberturaMaquinas}
                    />

                    <p className="cap-muted">
                      {indicadores.maquinasAutorizadas}
                      {' de '}
                      {indicadores.maquinasAplicables}
                      {' máquinas aplicables'}
                    </p>

                  </div>

                  <div>

                    <h3>Cumplimiento de riesgos críticos</h3>

                    <ProgressBar
                      value={indicadores.cumplimientoRC}
                      color="#15803d"
                    />

                    <p className="cap-muted">
                      {indicadores.riesgosAutorizados}
                      {' de '}
                      {indicadores.riesgosAplicables}
                      {' RC aplicables'}
                    </p>

                  </div>

                </div>

              </div>

              <div className="cap-panel">

                <h2>Estado de riesgos críticos</h2>

                {riesgos.map(r => (

                  <div
                    key={r.riesgo_critico_id}
                    className="cap-toolbar"
                    style={{
                      padding: '15px 0',
                      borderBottom: '1px solid #e2e8f0'
                    }}
                  >

                    <div>

                      <strong>{r.riesgo_critico}</strong>

                      <div className="cap-muted">
                        {r.abreviatura}
                      </div>

                    </div>

                    <Estado value={r.estado} />

                  </div>

                ))}

                {!riesgos.length && (

                  <p className="cap-muted">
                    No existen estados operativos
                    disponibles en esta consulta.
                  </p>

                )}

              </div>

              <div className="cap-panel">

                <h2>Máquinas autorizadas</h2>

                {maquinas.filter(m =>
                  m.autorizado === true
                ).map(m => (

                  <div
                    key={m.maquina_id}
                    className="cap-toolbar"
                    style={{
                      padding: '12px 0',
                      borderBottom: '1px solid #e2e8f0'
                    }}
                  >

                    <div>
                      <strong>{m.maquina}</strong>
                      <div className="cap-muted">
                        {(m.procesos || []).join(', ')}
                      </div>
                    </div>

                    <Estado value="AUTORIZADO" />

                  </div>

                ))}

                {!indicadores.maquinasAutorizadas && (

                  <p className="cap-muted">
                    No se encontraron autorizaciones
                    de máquinas vigentes en esta consulta.
                  </p>

                )}

              </div>

            </>

          )}

          {/* ================================= */}
          {/* PESTAÑA MÁQUINAS                  */}
          {/* ================================= */}

          {tab === 'MAQUINAS' && (

            <div className="cap-panel">

              <h2>Competencias por máquina</h2>

              <div className="cap-search">

                <Search size={18} />

                <input
                  value={searchMaquina}
                  aria-label="Buscar máquinas"
                  placeholder="Buscar máquina o proceso..."
                  onChange={e =>
                    setSearchMaquina(e.target.value)
                  }
                />

              </div>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 18
              }}>

                <input
                  type="checkbox"
                  checked={soloAutorizadas}
                  onChange={e =>
                    setSoloAutorizadas(e.target.checked)
                  }
                />

                Mostrar únicamente máquinas autorizadas

              </label>

              <div className="cap-table-wrap">

                <table>

                  <thead>
                    <tr>
                      <th>Máquina</th>
                      <th>Procesos</th>
                      <th>Estado</th>
                      <th>Autorizado</th>
                    </tr>
                  </thead>

                  <tbody>

                    {maquinaFiltradas.map(m => (

                      <tr key={m.maquina_id}>

                        <td>
                          <strong>{m.maquina}</strong>
                        </td>

                        <td>
                          {(m.procesos || []).join(', ') || '—'}
                        </td>

                        <td>
                          <Estado value={m.estado} />
                        </td>

                        <td>

                          {m.estado === 'NO_REQUIERE_AUTORIZACION'
                            ? 'N/A'
                            : m.autorizado === true
                              ? 'SÍ'
                              : 'NO'}

                        </td>

                      </tr>

                    ))}

                    {!maquinaFiltradas.length && (

                      <tr>
                        <td colSpan={4} className="cap-empty">
                          No se encontraron máquinas.
                        </td>
                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

            </div>

          )}

          {/* ================================= */}
          {/* PESTAÑA RIESGOS CRÍTICOS          */}
          {/* ================================= */}

          {tab === 'RC' && (

            <>

              <div className="cap-panel">

                <h2>Autorizaciones de riesgos críticos</h2>

                <div className="cap-table-wrap">

                  <table>

                    <thead>
                      <tr>
                        <th>Riesgo crítico</th>
                        <th>Aplica</th>
                        <th>Estado operativo</th>
                        <th>Autorizado</th>
                      </tr>
                    </thead>

                    <tbody>

                      {riesgos.map(r => (

                        <tr key={r.riesgo_critico_id}>

                          <td>

                            <strong>
                              {r.riesgo_critico}
                            </strong>

                            <div className="cap-muted">
                              {r.abreviatura}
                            </div>

                          </td>

                          <td>

                            {!r.asignacion_id
                              ? 'SIN ASIGNACIÓN'
                              : r.aplica
                                ? 'SÍ'
                                : 'NO'}

                          </td>

                          <td>
                            <Estado value={r.estado} />
                          </td>

                          <td>
                            {r.autorizado === true
                              ? 'SÍ'
                              : 'NO'}
                          </td>

                        </tr>

                      ))}

                      {!riesgos.length && (

                        <tr>
                          <td colSpan={4} className="cap-empty">
                            No hay información operativa disponible.
                          </td>
                        </tr>

                      )}

                    </tbody>

                  </table>

                </div>

              </div>

              {/* CERTIFICACIONES */}

              <div className="cap-panel">

                <div className="cap-toolbar">

                  <h2>Certificaciones adicionales</h2>

                  <span className="cap-status cap-status-optional">
                    OPCIONAL
                  </span>

                </div>

                <p className="cap-muted">
                  Las certificaciones no condicionan
                  las autorizaciones de riesgos críticos.
                </p>

                <div className="cap-table-wrap">

                  <table>

                    <thead>
                      <tr>
                        <th>Riesgo crítico</th>
                        <th>Fecha de certificación</th>
                        <th>Vencimiento</th>
                        <th>Estado</th>
                      </tr>
                    </thead>

                    <tbody>

                      {certificaciones.map((v, index) => (

                        <tr key={`${v.registro_id}-${index}`}>

                          <td>{v.riesgo_critico}</td>

                          <td>
                            {formatDate(v.fecha_realizacion)}
                          </td>

                          <td>

                            {v.fecha_vencimiento
                              ? formatDate(v.fecha_vencimiento)
                              : 'Sin vencimiento registrado'}

                          </td>

                          <td>

                            <Estado
                              optional
                              value={v.estado_vencimiento}
                            />

                          </td>

                        </tr>

                      ))}

                      {!certificaciones.length && (

                        <tr>
                          <td colSpan={4} className="cap-empty">
                            No hay certificaciones disponibles.
                          </td>
                        </tr>

                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </>

          )}

          {/* ================================= */}
          {/* PESTAÑA VENCIMIENTOS              */}
          {/* ================================= */}

          {tab === 'VENCIMIENTOS' && (

            <div className="cap-panel">

              <h2>Vigencia de requisitos obligatorios</h2>

              <div className="cap-table-wrap">

                <table>

                  <thead>
                    <tr>
                      <th>Riesgo crítico</th>
                      <th>Requisito</th>
                      <th>Realización</th>
                      <th>Vencimiento</th>
                      <th>Días restantes</th>
                      <th>Estado</th>
                    </tr>
                  </thead>

                  <tbody>

                    {requisitosObligatorios.map((v, index) => (

                      <tr key={`${v.registro_id}-${index}`}>

                        <td>{v.riesgo_critico}</td>

                        <td>{estadoLabel(v.requisito)}</td>

                        <td>
                          {formatDate(v.fecha_realizacion)}
                        </td>

                        <td>
                          {formatDate(v.fecha_vencimiento)}
                        </td>

                        <td>
                          {v.dias_restantes ?? '—'}
                        </td>

                        <td>
                          <Estado value={v.estado_vencimiento} />
                        </td>

                      </tr>

                    ))}

                    {!requisitosObligatorios.length && (

                      <tr>
                        <td colSpan={6} className="cap-empty">
                          No existen vencimientos disponibles.
                        </td>
                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

              <div className="cap-alert-info">

                La ausencia de registros de vencimiento
                no implica que todos los requisitos
                estén completados.

              </div>

            </div>

          )}

          {/* ================================= */}
          {/* PESTAÑA EVIDENCIAS                */}
          {/* ================================= */}

          {tab === 'EVIDENCIAS' && (

            <>

              <div className="cap-panel">

                <h2>Historial de capacitación de máquinas</h2>

                <div className="cap-table-wrap">

                  <table>

                    <thead>
                      <tr>
                        <th>Máquina</th>
                        <th>Fecha capacitación</th>
                        <th>Firmas</th>
                        <th>Estado</th>
                        <th>Evidencia</th>
                      </tr>
                    </thead>

                    <tbody>

                      {capacitaciones.map(c => (

                        <tr key={c.id}>

                          <td>{c.maquinaNombre}</td>

                          <td>
                            {formatDate(c.fecha_capacitacion)}
                          </td>

                          <td>

                            {
                              Number(Boolean(c.firma_lider)) +
                              Number(Boolean(c.firma_colaborador))
                            }

                            /2

                          </td>

                          <td>
                            <Estado value={c.estado} />
                          </td>

                          <td>

                            {c.evidencia_path ? (

                              <button
                                type="button"
                                className="cap-secondary"
                                disabled={opening}
                                title={c.evidencia_nombre}
                                onClick={() =>
                                  abrirDocumento(c.evidencia_path)
                                }
                              >
                                <ExternalLink size={15} />
                                Ver documento
                              </button>

                            ) : '—'}

                          </td>

                        </tr>

                      ))}

                      {!capacitaciones.length && (

                        <tr>
                          <td colSpan={5} className="cap-empty">
                            No existen capacitaciones registradas.
                          </td>
                        </tr>

                      )}

                    </tbody>

                  </table>

                </div>

              </div>

              <div className="cap-panel">

                <h2>Historial documental de riesgos críticos</h2>

                <p className="cap-muted">
                  Documentación administrativa privada.
                  Consulta restringida al jefe de producción.
                </p>

                <div className="cap-table-wrap">

                  <table>

                    <thead>
                      <tr>
                        <th>Riesgo crítico</th>
                        <th>Requisito</th>
                        <th>Realización</th>
                        <th>Vencimiento</th>
                        <th>Estado</th>
                        <th>Evidencias</th>
                      </tr>
                    </thead>

                    <tbody>

                      {registrosRC.map(r => (

                        <tr key={r.id}>

                          <td>{r.riesgoNombre}</td>

                          <td>
                            {estadoLabel(r.tipo_requisito)}
                          </td>

                          <td>
                            {formatDate(r.fecha_realizacion)}
                          </td>

                          <td>
                            {formatDate(r.fecha_vencimiento)}
                          </td>

                          <td>
                            <Estado value={r.estado} />
                          </td>

                          <td>

                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8
                            }}>

                              {(documentosMap.get(r.id) || [])
                                .map(e => (

                                  <button
                                    type="button"
                                    className="cap-secondary"
                                    key={e.id}
                                    disabled={opening}
                                    title={e.archivo_nombre}
                                    onClick={() =>
                                      abrirDocumento(e.archivo_path)
                                    }
                                  >

                                    <ExternalLink size={14} />

                                    {e.tipo_evidencia ===
                                     'DIPLOMA_CERTIFICACION'
                                      ? 'Certificación'
                                      : 'Ver evidencia'}

                                  </button>

                                ))}

                              {!documentosMap.get(r.id)?.length && (
                                <span className="cap-muted">
                                  Sin evidencia disponible
                                </span>
                              )}

                            </div>

                          </td>

                        </tr>

                      ))}

                      {!registrosRC.length && (

                        <tr>
                          <td colSpan={6} className="cap-empty">
                            No existen registros documentales.
                          </td>
                        </tr>

                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </>

          )}

          {/* ================================= */}
          {/* PESTAÑA CREDENCIAL QR             */}
          {/* ================================= */}

          {tab === 'QR' && (

            <div className="cap-panel">

              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 20
              }}>

                <div style={{
                  width: 110,
                  height: 110,
                  borderRadius: 12,
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>

                  <QrCode size={65} color="#164b83" />

                </div>

                <div style={{ flex: '1 1 200px' }}>

                  <h2>Credencial de capacitación</h2>

                  <Estado value={
                    qrActivo
                      ? 'ACTIVO'
                      : 'SIN_CREDENCIAL_ACTIVA'
                  } />

                  {qrActivo && (

                    <p className="cap-muted">
                      Fecha de generación:
                      {' '}
                      {formatDate(qrActivo.created_at)}
                    </p>

                  )}

                  {!perfil.activo && (

                    <p className="cap-muted">
                      El colaborador está inactivo.
                      La vigencia del acceso público
                      debe verificarse mediante el backend.
                    </p>

                  )}

                </div>

              </div>

              <h3 style={{ marginTop: 25 }}>
                Historial de credenciales
              </h3>

              <div className="cap-table-wrap">

                <table>

                  <thead>
                    <tr>
                      <th>Generación</th>
                      <th>Estado</th>
                      <th>Revocación</th>
                    </tr>
                  </thead>

                  <tbody>

                    {credenciales.map(q => (

                      <tr key={q.id}>

                        <td>
                          {formatDate(q.created_at)}
                        </td>

                        <td>

                          <Estado value={
                            q.activo
                              ? 'ACTIVO'
                              : 'INACTIVO'
                          } />

                        </td>

                        <td>
                          {formatDate(q.fecha_revocacion)}
                        </td>

                      </tr>

                    ))}

                    {!credenciales.length && (

                      <tr>
                        <td colSpan={3} className="cap-empty">
                          No existen credenciales generadas.
                        </td>
                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

              <div className="cap-alert-info">

                La generación, impresión y revocación
                de credenciales se realizará desde
                el módulo CredencialesQR.

                Este expediente no consulta ni muestra
                los tokens privados de las credenciales.

              </div>

            </div>

          )}

          {/* PIE DEL EXPEDIENTE */}

          <div className="cap-panel">

            <div className="cap-toolbar">

              <span className="cap-muted">

                Última consulta:
                {' '}
                {formatDate(fechaConsulta)}

              </span>

              <span className="cap-muted">

                TRANSMETAL · Uso administrativo interno

              </span>

            </div>

          </div>

        </>

      )}

    </div>

  );

}
