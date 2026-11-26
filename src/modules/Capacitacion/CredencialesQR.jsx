
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef
} from 'react';

import {
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Users,
  User,
  Search,
  RefreshCw,
  Download,
  Printer,
  Copy,
  ExternalLink,
  Plus,
  Ban,
  History,
  Award,
  X
} from 'lucide-react';

import QRCode from 'qrcode';

import './capacitacion.css';

// ==========================================
// CONFIGURACIÓN
// ==========================================

const BUCKET = 'capacitacion-evidencias';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const QR_FIELDS = [
  'id',
  'colaborador_id',
  'token',
  'created_at',
  'activo',
  'fecha_revocacion',
  'motivo_revocacion'
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

function generarUrlPublica(token) {

  if (!UUID_REGEX.test(String(token))) {
    throw new Error('Token QR inválido.');
  }

  const url = new URL(window.location.href);

  url.search = '';
  url.hash = '';

  url.searchParams.set('cap_qr', token);

  return url.toString();

}

async function consultarPaginas(builder) {

  const registros = [];
  const pageSize = 200;

  for (let offset = 0; ; offset += pageSize) {

    const { data, error } = await builder()
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const page = data || [];

    registros.push(...page);

    if (page.length < pageSize) break;

  }

  return registros;

}

function cargarImagen(src) {

  return new Promise((resolve, reject) => {

    const image = new Image();

    image.onload = () => resolve(image);

    image.onerror = () =>
      reject(new Error('No se pudo cargar la imagen.'));

    image.src = src;

  });

}

function canvasToBlob(canvas) {

  return new Promise((resolve, reject) => {

    canvas.toBlob(blob => {

      if (blob) resolve(blob);

      else reject(
        new Error('No se pudo generar la credencial.')
      );

    }, 'image/png');

  });

}

function escribirTexto(
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight
) {

  const palabras = String(text || '')
    .split(/\s+/)
    .filter(Boolean);

  let linea = '';
  let currentY = y;

  palabras.forEach(palabra => {

    const siguiente =
      linea ? `${linea} ${palabra}` : palabra;

    if (
      ctx.measureText(siguiente).width > maxWidth &&
      linea
    ) {

      ctx.fillText(linea, x, currentY, maxWidth);

      linea = palabra;

      currentY += lineHeight;

    } else {

      linea = siguiente;

    }

  });

  if (linea) {
    ctx.fillText(linea, x, currentY, maxWidth);
  }

  return currentY + lineHeight;

}

// ==========================================
// GENERAR IMAGEN DE CREDENCIAL
// ==========================================

async function construirCredencial(
  colaborador,
  qrDataUrl,
  photoBlob
) {

  const canvas = document.createElement('canvas');

  // Formato vertical de aproximadamente
  // 54 x 86 mm a 300 DPI.

  canvas.width = 638;
  canvas.height = 1016;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas no disponible.');
  }

  // Fondo

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 638, 1016);

  // Encabezado corporativo

  ctx.fillStyle = '#164b83';
  ctx.fillRect(0, 0, 638, 145);

  ctx.textAlign = 'center';

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 43px Arial';

  ctx.fillText('TRANSMETAL', 319, 65);

  ctx.font = '22px Arial';

  ctx.fillText(
    'CREDENCIAL DE CAPACITACIÓN',
    319,
    112,
    590
  );

  // Fotografía

  const fotoX = 244;
  const fotoY = 170;
  const fotoW = 150;
  const fotoH = 175;

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(fotoX, fotoY, fotoW, fotoH);

  if (photoBlob) {

    const photoObjectUrl =
      URL.createObjectURL(photoBlob);

    try {

      const photo =
        await cargarImagen(photoObjectUrl);

      const ratio = Math.max(
        fotoW / photo.width,
        fotoH / photo.height
      );

      const w = photo.width * ratio;
      const h = photo.height * ratio;

      ctx.save();

      ctx.beginPath();

      ctx.rect(
        fotoX,
        fotoY,
        fotoW,
        fotoH
      );

      ctx.clip();

      ctx.drawImage(
        photo,
        fotoX + (fotoW - w) / 2,
        fotoY + (fotoH - h) / 2,
        w,
        h
      );

      ctx.restore();

    } finally {

      URL.revokeObjectURL(photoObjectUrl);

    }

  } else {

    ctx.fillStyle = '#94a3b8';

    ctx.beginPath();
    ctx.arc(319, 220, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
      319, 300, 51, 45,
      0, Math.PI, Math.PI * 2
    );
    ctx.fill();

  }

  // Nombre del colaborador

  ctx.fillStyle = '#164b83';
  ctx.font = 'bold 28px Arial';

  let y = escribirTexto(
    ctx,
    colaborador.nombre,
    319,
    385,
    580,
    33
  );

  // Puesto

  ctx.font = '22px Arial';
  ctx.fillStyle = '#475569';

  y = escribirTexto(
    ctx,
    colaborador.puesto || 'TRANSMETAL',
    319,
    y + 5,
    575,
    27
  );

  // Código

  ctx.font = '20px Arial';

  ctx.fillText(
    `Código: ${colaborador.codigo || '—'}`,
    319,
    y + 4,
    570
  );

  y += 35;

  if (colaborador.es_lider) {

    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 20px Arial';

    ctx.fillText(
      'LÍDER DE CAPACITACIÓN',
      319,
      y,
      580
    );

    y += 30;

  }

  // Código QR

  const qr = await cargarImagen(qrDataUrl);

  const qrTop = Math.max(510, y + 12);

  const qrSize = Math.min(
    310,
    825 - qrTop
  );

  if (qrSize < 220) {

    throw new Error(
      'El nombre o puesto es demasiado extenso ' +
      'para el formato de impresión.'
    );

  }

  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(
    qr,
    (638 - qrSize) / 2,
    qrTop,
    qrSize,
    qrSize
  );

  ctx.imageSmoothingEnabled = true;

  // Instrucciones

  ctx.fillStyle = '#164b83';
  ctx.font = 'bold 22px Arial';

  ctx.fillText(
    'ESCANEA PARA CONSULTAR',
    319,
    850,
    590
  );

  ctx.fillText(
    'AUTORIZACIONES VIGENTES',
    319,
    880,
    590
  );

  ctx.fillStyle = '#64748b';
  ctx.font = '17px Arial';

  ctx.fillText(
    'La credencial no constituye por sí sola',
    319,
    920,
    590
  );

  ctx.fillText(
    'una autorización de trabajo.',
    319,
    944,
    590
  );

  // Pie corporativo

  ctx.fillStyle = '#164b83';
  ctx.fillRect(0, 970, 638, 46);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px Arial';

  ctx.fillText(
    'SEGURIDAD · COMPETENCIA · AUTORIZACIÓN',
    319,
    999,
    610
  );

  return canvas;

}

// ==========================================
// COMPONENTES VISUALES
// ==========================================

function Estado({ activo, label }) {

  return (

    <span className={
      activo
        ? 'cap-status cap-status-success'
        : 'cap-status cap-status-neutral'
    }>

      {label || (
        activo ? 'ACTIVA' : 'REVOCADA'
      )}

    </span>

  );

}

function KPI({
  icon: Icon,
  label,
  value,
  color = '#164b83',
  variant = ''
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

    </div>

  );

}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function CredencialesQR({
  client,
  role
}) {

  const canManage =
    role === 'JEFE_PRODUCCION';

  const [colaboradores, setColaboradores] =
    useState([]);

  const [credenciales, setCredenciales] =
    useState([]);

  const [selectedId, setSelectedId] =
    useState('');

  const [qrDataUrl, setQrDataUrl] =
    useState('');

  const [publicUrl, setPublicUrl] =
    useState('');

  const [photoUrl, setPhotoUrl] =
    useState('');

  const [photoBlob, setPhotoBlob] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [previewLoading, setPreviewLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

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

  const [filterEstado, setFilterEstado] =
    useState('TODOS');

  const [includeInactive, setIncludeInactive] =
    useState(false);

  const [showRevocar, setShowRevocar] =
    useState(false);

  const [motivoRevocacion, setMotivoRevocacion] =
    useState('');

  const [confirmRevocacion, setConfirmRevocacion] =
    useState(false);

  const requestRef = useRef(0);

  const operationRef = useRef(false);

  // ==========================================
  // VERIFICAR IDENTIDAD Y PERFIL
  // ==========================================

  const verificarPermisos = useCallback(async () => {

    if (!client || !canManage) {

      throw new Error(
        'Acceso restringido al jefe de producción.'
      );

    }

    const { data, error } =
      await client.auth.getUser();

    if (error || !data?.user) {

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
        'El perfil de capacitación no está autorizado.'
      );

    }

    return data.user.id;

  }, [client, canManage]);

  // ==========================================
  // CONSULTAR CATÁLOGO Y CREDENCIALES
  // ==========================================

  const cargarDatos = useCallback(async () => {

    const requestId = ++requestRef.current;

    if (!client || !canManage) {

      setColaboradores([]);
      setCredenciales([]);
      setLoading(false);

      return;

    }

    setLoading(true);
    setError('');

    try {

      await verificarPermisos();

      const [personas, tarjetas] =
        await Promise.all([

          consultarPaginas(() =>
            client
              .from('cap_colaboradores')
              .select(`
                id,
                codigo,
                nombre,
                puesto,
                area,
                es_lider,
                fotografia_path,
                activo
              `)
              .order('nombre')
              .order('id')
          ),

          // No cargar todos los tokens QR.
          // El token se consulta únicamente
          // para el colaborador seleccionado.

          consultarPaginas(() =>
            client
              .from('cap_credenciales_qr')
              .select(`
                id,
                colaborador_id,
                created_at,
                activo,
                fecha_revocacion,
                motivo_revocacion
              `)
              .order('created_at', {
                ascending: false
              })
              .order('id')
          )

        ]);

      if (requestRef.current !== requestId) {
        return;
      }

      setColaboradores(personas);
      setCredenciales(tarjetas);

    } catch (err) {

      if (requestRef.current !== requestId) {
        return;
      }

      setColaboradores([]);
      setCredenciales([]);

      setError(
        'No fue posible consultar las credenciales: ' +
        err.message
      );

    } finally {

      if (requestRef.current === requestId) {

        setLoading(false);

      }

    }

  }, [
    client,
    canManage,
    verificarPermisos
  ]);

  useEffect(() => {

    setSelectedId('');
    setQrDataUrl('');
    setPublicUrl('');
    setPhotoBlob(null);
    setSuccess('');
    setShowRevocar(false);

    cargarDatos();

    return () => {

      requestRef.current += 1;

    };

  }, [cargarDatos]);

  // ==========================================
  // RELACIONES
  // ==========================================

  const credencialesMap = useMemo(() => {

    const map = new Map();

    credenciales.forEach(q => {

      if (!map.has(q.colaborador_id)) {

        map.set(q.colaborador_id, []);

      }

      map.get(q.colaborador_id).push(q);

    });

    return map;

  }, [credenciales]);

  const registros = useMemo(() => {

    return colaboradores.map(c => {

      const historial =
        credencialesMap.get(c.id) || [];

      const activa =
        historial.find(q => q.activo === true);

      return {

        ...c,

        credencialActiva: activa || null,

        historial,

        estadoQR: activa

          ? 'ACTIVA'

          : historial.length

            ? 'REVOCADA'

            : 'SIN_CREDENCIAL'

      };

    });

  }, [
    colaboradores,
    credencialesMap
  ]);

  const selected = registros.find(
    c => c.id === selectedId
  );

  // ==========================================
  // INDICADORES
  // ==========================================

  const indicadores = useMemo(() => {

    const activos = registros.filter(
      c => c.activo
    );

    const conQR = activos.filter(
      c => c.credencialActiva
    ).length;

    return {

      colaboradores: activos.length,

      conQR,

      sinQR: activos.length - conQR,

      revocadas: credenciales.filter(
        q => !q.activo && q.fecha_revocacion
      ).length,

      cobertura: activos.length

        ? (
            conQR / activos.length * 100
          ).toFixed(1) + '%'

        : 'N/A'

    };

  }, [
    registros,
    credenciales
  ]);

  // ==========================================
  // FILTROS
  // ==========================================

  const filtered = useMemo(() => {

    const term = normalize(search);

    return registros.filter(c => {

      if (
        !includeInactive &&
        !c.activo
      ) return false;

      if (
        filterEstado !== 'TODOS' &&
        c.estadoQR !== filterEstado
      ) return false;

      if (!term) return true;

      return [
        c.nombre,
        c.codigo,
        c.puesto,
        c.area
      ].some(value =>
        normalize(value).includes(term)
      );

    });

  }, [
    registros,
    search,
    filterEstado,
    includeInactive
  ]);

  // ==========================================
  // CONSULTAR TOKEN ACTIVO
  // ==========================================

  const consultarQRActivo = useCallback(
    async colaboradorId => {

      const { data, error } =
        await client
          .from('cap_credenciales_qr')
          .select(QR_FIELDS)
          .eq('colaborador_id', colaboradorId)
          .eq('activo', true)
          .maybeSingle();

      if (error) throw error;

      return data;

    },
    [client]
  );

  // ==========================================
  // GENERAR VISTA PREVIA LOCAL
  // ==========================================

  const selectedTokenId =
    selected?.credencialActiva?.id;

  const selectedPhotoPath =
    selected?.fotografia_path;

  const selectedActive =
    selected?.activo === true;

  useEffect(() => {

    let cancelled = false;

    setQrDataUrl('');
    setPublicUrl('');
    setPhotoBlob(null);
    setWarning('');
    setPreviewLoading(false);

    if (
      !client ||
      !canManage ||
      !selectedId ||
      loading
    ) return;

    async function cargarVistaPrevia() {

      setPreviewLoading(true);

      try {

        await verificarPermisos();

        // Cargar QR únicamente si el
        // colaborador y la credencial están activos.

        if (
          selectedTokenId &&
          selectedActive
        ) {

          const credencial =
            await consultarQRActivo(selectedId);

          if (
            !credencial ||
            credencial.id !== selectedTokenId
          ) {

            throw new Error(
              'La credencial cambió. Actualiza la consulta.'
            );

          }

          const url = generarUrlPublica(
            credencial.token
          );

          // Generación local: no se transmite
          // el token a servicios externos.

          const qr = await QRCode.toDataURL(url, {

            width: 600,

            margin: 4,

            errorCorrectionLevel: 'M',

            color: {
              dark: '#000000',
              light: '#ffffff'
            }

          });

          if (cancelled) return;

          setPublicUrl(url);
          setQrDataUrl(qr);

        }

        // Fotografía privada del colaborador.

        if (
          selectedPhotoPath &&
          selectedPhotoPath.startsWith('fotografias/')
        ) {

          const { data, error } =
            await client.storage
              .from(BUCKET)
              .download(selectedPhotoPath);

          if (cancelled) return;

          if (error) {

            setWarning(
              'La fotografía no pudo cargarse. ' +
              'La credencial se generará sin fotografía.'
            );

          } else {

            setPhotoBlob(data);

          }

        }

      } catch (err) {

        if (cancelled) return;

        setQrDataUrl('');
        setPublicUrl('');

        setError(
          'No fue posible preparar la credencial: ' +
          err.message
        );

      } finally {

        if (!cancelled) {

          setPreviewLoading(false);

        }

      }

    }

    cargarVistaPrevia();

    return () => {

      cancelled = true;

    };

  }, [
    client,
    canManage,
    selectedId,
    selectedTokenId,
    selectedPhotoPath,
    selectedActive,
    loading,
    verificarPermisos,
    consultarQRActivo
  ]);

  // ==========================================
  // FOTOGRAFÍA LOCAL
  // ==========================================

  useEffect(() => {

    if (!photoBlob) {

      setPhotoUrl('');
      return;

    }

    const url =
      URL.createObjectURL(photoBlob);

    setPhotoUrl(url);

    return () => {

      URL.revokeObjectURL(url);

    };

  }, [photoBlob]);

  // ==========================================
  // SELECCIONAR COLABORADOR
  // ==========================================

  function seleccionarColaborador(id) {

    if (operationRef.current) return;

    setQrDataUrl('');
    setPublicUrl('');
    setPhotoBlob(null);
    setPhotoUrl('');
    setSelectedId(id);
    setShowRevocar(false);
    setMotivoRevocacion('');
    setConfirmRevocacion(false);
    setSuccess('');
    setError('');
    setWarning('');

  }

  // ==========================================
  // GENERAR NUEVA CREDENCIAL
  // ==========================================

  async function generarCredencial() {

    if (
      !canManage ||
      !selected ||
      !selected.activo ||
      selected.credencialActiva ||
      operationRef.current ||
      loading
    ) return;

    const id = selected.id;

    const confirmed = window.confirm(

      `¿Generar una credencial QR para ${selected.nombre}?\n\n` +

      'El código permitirá consultar públicamente ' +

      'su nombre, puesto y estados de autorización.'

    );

    if (!confirmed) return;

    operationRef.current = true;

    setSaving(true);
    setError('');
    setSuccess('');

    try {

      await verificarPermisos();

      const {
        data: colaborador,
        error: colaboradorError
      } = await client
        .from('cap_colaboradores')
        .select('id,activo')
        .eq('id', id)
        .single();

      if (
        colaboradorError ||
        !colaborador?.activo
      ) {

        throw new Error(
          'El colaborador no se encuentra activo.'
        );

      }

      const { error } = await client.rpc(

        'cap_generar_qr',

        {

          p_colaborador_id: id

        }

      );

      if (error) throw error;

      // Consultar el registro real generado.
      // No depender del significado del UUID
      // retornado por la RPC.

      const credencial =
        await consultarQRActivo(id);

      if (
        !credencial ||
        !UUID_REGEX.test(
          String(credencial.token)
        )
      ) {

        throw new Error(
          'No se encontró una credencial activa válida.'
        );

      }

      setSuccess(
        'Credencial QR generada correctamente.'
      );

      await cargarDatos();

    } catch (err) {

      setError(
        'No fue posible generar la credencial: ' +
        err.message
      );

    } finally {

      operationRef.current = false;

      setSaving(false);

    }

  }

  // ==========================================
  // REVOCAR CREDENCIAL
  // ==========================================

  async function revocarCredencial(event) {

    event.preventDefault();

    if (
      !canManage ||
      !selected?.credencialActiva ||
      operationRef.current
    ) return;

    const motivo =
      motivoRevocacion.trim();

    if (!motivo) {

      setError(
        'Debes indicar el motivo de revocación.'
      );

      return;

    }

    if (!confirmRevocacion) {

      setError(
        'Debes confirmar la revocación.'
      );

      return;

    }

    const confirmed = window.confirm(

      `¿Revocar la credencial de ${selected.nombre}?\n\n` +

      'El QR anterior dejará de ser válido. ' +

      'Las autorizaciones del colaborador no serán ' +

      'modificadas por esta acción.'

    );

    if (!confirmed) return;

    operationRef.current = true;

    setSaving(true);
    setError('');
    setSuccess('');

    try {

      await verificarPermisos();

      const activa =
        await consultarQRActivo(selected.id);

      if (
        !activa ||
        activa.id !== selected.credencialActiva.id
      ) {

        throw new Error(
          'La credencial seleccionada cambió. ' +
          'Actualiza antes de continuar.'
        );

      }

      const { error } = await client.rpc(

        'cap_revocar_qr',

        {

          p_colaborador_id: selected.id,

          p_motivo: motivo

        }

      );

      if (error) throw error;

      setQrDataUrl('');
      setPublicUrl('');

      setShowRevocar(false);
      setMotivoRevocacion('');
      setConfirmRevocacion(false);

      setSuccess(
        'Credencial revocada correctamente. ' +
        'El código anterior ya no debe utilizarse.'
      );

      await cargarDatos();

    } catch (err) {

      setError(
        'No fue posible revocar la credencial: ' +
        err.message
      );

    } finally {

      operationRef.current = false;

      setSaving(false);

    }

  }

  // ==========================================
  // COMPROBAR VIGENCIA DEL QR
  // ==========================================

  async function verificarCredencialActual() {

    await verificarPermisos();

    if (
      !selected?.credencialActiva ||
      !publicUrl
    ) {

      throw new Error(
        'No existe una credencial disponible.'
      );

    }

    const {
      data: colaborador,
      error
    } = await client
      .from('cap_colaboradores')
      .select('id,activo')
      .eq('id', selected.id)
      .single();

    if (
      error ||
      !colaborador?.activo
    ) {

      throw new Error(
        'El colaborador no se encuentra activo.'
      );

    }

    const credencial =
      await consultarQRActivo(selected.id);

    if (
      !credencial ||
      credencial.id !== selected.credencialActiva.id ||
      generarUrlPublica(credencial.token) !== publicUrl
    ) {

      throw new Error(
        'La credencial ya no coincide con el registro activo. ' +
        'Actualiza la información.'
      );

    }

    return credencial;

  }

  // ==========================================
  // COPIAR ENLACE PÚBLICO
  // ==========================================

  async function copiarEnlace() {

    if (
      !publicUrl ||
      operationRef.current ||
      loading ||
      previewLoading
    ) return;

    operationRef.current = true;
    setSaving(true);
    setError('');
    setSuccess('');

    try {

      await verificarCredencialActual();

      await navigator.clipboard.writeText(
        publicUrl
      );

      setSuccess(
        'Enlace público copiado correctamente.'
      );

    } catch (err) {

      setError(
        'No fue posible copiar el enlace: ' +
        err.message
      );

    } finally {

      operationRef.current = false;
      setSaving(false);

    }

  }

  // ==========================================
  // ABRIR CONSULTA PÚBLICA
  // ==========================================

  async function abrirConsultaPublica() {

    if (
      !publicUrl ||
      operationRef.current ||
      loading
    ) return;

    const preview = window.open(
      'about:blank',
      '_blank'
    );

    if (!preview) {

      setError(
        'Permite las ventanas emergentes.'
      );

      return;

    }

    preview.opener = null;

    operationRef.current = true;
    setSaving(true);
    setError('');

    try {

      await verificarCredencialActual();

      if (preview.closed) {

        throw new Error(
          'La ventana fue cerrada.'
        );

      }

      preview.location.replace(publicUrl);

    } catch (err) {

      preview.close();

      setError(
        'No fue posible abrir la consulta: ' +
        err.message
      );

    } finally {

      operationRef.current = false;
      setSaving(false);

    }

  }

  // ==========================================
  // DESCARGAR ARCHIVOS
  // ==========================================

  function descargarBlob(blob, filename) {

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;
    a.download = filename;

    document.body.appendChild(a);

    a.click();

    a.remove();

    window.setTimeout(() => {

      URL.revokeObjectURL(url);

    }, 1000);

  }

  async function descargarCredencial() {

    if (
      !selected?.activo ||
      !qrDataUrl ||
      previewLoading ||
      operationRef.current ||
      loading
    ) return;

    operationRef.current = true;

    setExporting(true);
    setError('');
    setSuccess('');

    try {

      await verificarCredencialActual();

      const canvas =
        await construirCredencial(
          selected,
          qrDataUrl,
          photoBlob
        );

      const blob =
        await canvasToBlob(canvas);

      const codigo = String(
        selected.codigo || 'COL'
      ).replace(/[^a-zA-Z0-9_-]/g, '_');

      descargarBlob(
        blob,
        `Credencial_Transmetal_${codigo}.png`
      );

      setSuccess(
        'Credencial generada para descarga.'
      );

    } catch (err) {

      setError(
        'No fue posible descargar la credencial: ' +
        err.message
      );

    } finally {

      operationRef.current = false;

      setExporting(false);

    }

  }

  async function descargarSoloQR() {

    if (
      !qrDataUrl ||
      !selected?.activo ||
      operationRef.current ||
      loading ||
      previewLoading
    ) return;

    operationRef.current = true;
    setExporting(true);
    setError('');

    try {

      await verificarCredencialActual();

      const image = await cargarImagen(qrDataUrl);

      const canvas =
        document.createElement('canvas');

      canvas.width = image.width;
      canvas.height = image.height;

      const ctx = canvas.getContext('2d');

      if (!ctx) {

        throw new Error('Canvas no disponible.');

      }

      ctx.drawImage(image, 0, 0);

      const blob =
        await canvasToBlob(canvas);

      const codigo = String(
        selected.codigo || 'COL'
      ).replace(/[^a-zA-Z0-9_-]/g, '_');

      descargarBlob(
        blob,
        `QR_Transmetal_${codigo}.png`
      );

      setSuccess(
        'Código QR generado para descarga.'
      );

    } catch (err) {

      setError(
        'No fue posible descargar el QR: ' +
        err.message
      );

    } finally {

      operationRef.current = false;
      setExporting(false);

    }

  }

  // ==========================================
  // IMPRIMIR CREDENCIAL
  // ==========================================

  async function imprimirCredencial() {

    if (
      !selected?.activo ||
      !qrDataUrl ||
      operationRef.current ||
      previewLoading ||
      loading
    ) return;

    const printWindow = window.open(
      'about:blank',
      '_blank',
      'width=700,height=800'
    );

    if (!printWindow) {

      setError(
        'Permite las ventanas emergentes para imprimir.'
      );

      return;

    }

    printWindow.opener = null;

    operationRef.current = true;

    setExporting(true);
    setError('');

    try {

      await verificarCredencialActual();

      const canvas =
        await construirCredencial(
          selected,
          qrDataUrl,
          photoBlob
        );

      const imageUrl =
        canvas.toDataURL('image/png');

      if (printWindow.closed) {

        throw new Error(
          'La ventana de impresión fue cerrada.'
        );

      }

      const doc = printWindow.document;

      doc.title =
        'Credencial Transmetal';

      const style =
        doc.createElement('style');

      style.textContent = `
        @page {
          size: A4;
          margin: 10mm;
        }

        body {
          margin: 0;
          padding: 10mm;
          background: white;
          font-family: Arial, sans-serif;
        }

        .credencial {
          width: 54mm;
          height: 86mm;
          display: block;
          object-fit: contain;
          outline: 0.2mm solid #cbd5e1;
          break-inside: avoid;
        }

        @media print {
          body {
            padding: 0;
          }

          .credencial {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `;

      doc.head.appendChild(style);

      const image =
        doc.createElement('img');

      image.className = 'credencial';

      image.alt = 'Credencial de capacitación';

      image.onload = () => {

        if (!printWindow.closed) {

          printWindow.focus();
          printWindow.print();

        }

      };

      image.onerror = () => {

        if (!printWindow.closed) {
          printWindow.close();
        }

        setError(
          'No fue posible preparar la impresión.'
        );

      };

      doc.body.replaceChildren(image);

      image.src = imageUrl;

    } catch (err) {

      printWindow.close();

      setError(
        'No fue posible imprimir la credencial: ' +
        err.message
      );

    } finally {

      operationRef.current = false;
      setExporting(false);

    }

  }

  // ==========================================
  // CONTROL DE ACCESO
  // ==========================================

  if (!client || !canManage) {

    return (

      <div className="cap-panel cap-welcome">

        <ShieldAlert size={45} />

        <h2>Administración de QR restringida</h2>

        <p>
          Únicamente el jefe de producción
          puede administrar las credenciales
          de capacitación.
        </p>

      </div>

    );

  }

  const busy =
    loading || saving || exporting;

  const canExport = Boolean(

    selected?.activo &&

    selected?.credencialActiva &&

    qrDataUrl &&

    publicUrl &&

    !busy &&

    !previewLoading

  );

  const mostrarValor = value =>
    loading || error ? '—' : value;

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (

    <div className="cap-credenciales-qr">

      {/* ENCABEZADO */}

      <div className="cap-panel cap-toolbar">

        <div>

          <h2>Credenciales QR de capacitación</h2>

          <p className="cap-muted">

            Identificación individual y consulta
            pública de autorizaciones vigentes.

          </p>

        </div>

        <button
          type="button"
          className="cap-secondary"
          disabled={busy}
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

      {/* INDICADORES */}

      <div className="cap-kpi-grid">

        <KPI
          icon={Users}
          label="Colaboradores activos"
          value={mostrarValor(
            indicadores.colaboradores
          )}
        />

        <KPI
          icon={QrCode}
          label="Credenciales activas"
          value={mostrarValor(
            indicadores.conQR
          )}
          variant="cap-kpi-success"
          color="#15803d"
        />

        <KPI
          icon={User}
          label="Sin credencial activa"
          value={mostrarValor(
            indicadores.sinQR
          )}
          variant="cap-kpi-warning"
          color="#b45309"
        />

        <KPI
          icon={Ban}
          label="Revocaciones históricas"
          value={mostrarValor(
            indicadores.revocadas
          )}
          variant="cap-kpi-danger"
          color="#b91c1c"
        />

        <KPI
          icon={ShieldCheck}
          label="Cobertura de credenciales"
          value={mostrarValor(
            indicadores.cobertura
          )}
        />

      </div>

      {/* DETALLE DEL COLABORADOR */}

      {selected && (

        <div className="cap-panel">

          <div className="cap-toolbar">

            <h2>Administrar credencial</h2>

            <button
              type="button"
              className="cap-secondary"
              disabled={busy}
              onClick={() =>
                seleccionarColaborador('')
              }
            >

              <X size={16} />
              Cerrar

            </button>

          </div>

          <div style={{

            display: 'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',

            gap: 30,

            marginTop: 20

          }}>

            {/* VISTA PREVIA */}

            <div style={{

              maxWidth: 330,

              width: '100%',

              margin: '0 auto',

              border: '1px solid #cbd5e1',

              borderRadius: 12,

              overflow: 'hidden',

              background: '#ffffff',

              textAlign: 'center'

            }}>

              <div style={{

                background: '#164b83',

                color: '#ffffff',

                padding: '20px 12px'

              }}>

                <div style={{

                  fontSize: 26,

                  fontWeight: 800

                }}>

                  TRANSMETAL

                </div>

                <div style={{

                  fontSize: 11,

                  letterSpacing: 1

                }}>

                  CREDENCIAL DE CAPACITACIÓN

                </div>

              </div>

              <div style={{ padding: 22 }}>

                <div style={{

                  width: 90,

                  height: 110,

                  background: '#f1f5f9',

                  borderRadius: 8,

                  margin: '0 auto 14px',

                  overflow: 'hidden',

                  display: 'flex',

                  alignItems: 'center',

                  justifyContent: 'center'

                }}>

                  {photoUrl ? (

                    <img
                      src={photoUrl}
                      alt="Fotografía del colaborador"
                      style={{

                        width: '100%',

                        height: '100%',

                        objectFit: 'cover'

                      }}
                    />

                  ) : (

                    <User
                      size={55}
                      color="#94a3b8"
                    />

                  )}

                </div>

                <h3 style={{

                  color: '#164b83',

                  fontSize: 17,

                  overflowWrap: 'anywhere'

                }}>

                  {selected.nombre}

                </h3>

                <p className="cap-muted">

                  {selected.puesto || 'TRANSMETAL'}

                </p>

                <strong>

                  Código: {selected.codigo}

                </strong>

                {selected.es_lider && (

                  <p style={{

                    color: '#b45309',

                    fontWeight: 700,

                    fontSize: 12

                  }}>

                    <Award size={15} />

                    {' LÍDER DE CAPACITACIÓN'}

                  </p>

                )}

                <div style={{

                  borderTop: '1px solid #e2e8f0',

                  marginTop: 20,

                  paddingTop: 15

                }}>

                  {previewLoading ? (

                    <p>Cargando código QR...</p>

                  ) : qrDataUrl &&
                      selected.activo &&
                      !loading ? (

                    <img
                      src={qrDataUrl}
                      alt="Código QR de capacitación"
                      style={{

                        display: 'block',

                        width: '100%',

                        maxWidth: 205,

                        margin: '0 auto',

                        imageRendering: 'pixelated'

                      }}
                    />

                  ) : (

                    <div style={{ padding: 25 }}>

                      <QrCode
                        size={85}
                        color="#cbd5e1"
                      />

                      <p className="cap-muted">

                        {!selected.activo

                          ? 'Colaborador inactivo'

                          : 'Sin código QR disponible'}

                      </p>

                    </div>

                  )}

                </div>

                <strong style={{

                  color: '#164b83',

                  fontSize: 12

                }}>

                  ESCANEA PARA CONSULTAR
                  AUTORIZACIONES VIGENTES

                </strong>

                <p className="cap-muted" style={{

                  fontSize: 10,

                  marginTop: 15

                }}>

                  La credencial no constituye por sí
                  sola una autorización de trabajo.

                </p>

              </div>

              <div style={{

                background: '#164b83',

                color: '#ffffff',

                fontSize: 10,

                fontWeight: 700,

                padding: 12

              }}>

                SEGURIDAD · COMPETENCIA · AUTORIZACIÓN

              </div>

            </div>

            {/* ADMINISTRACIÓN */}

            <div>

              <h3>Información de la credencial</h3>

              <div className="cap-form-grid">

                <div className="cap-field">

                  <label>Colaborador</label>

                  <strong>{selected.nombre}</strong>

                </div>

                <div className="cap-field">

                  <label>Estado del colaborador</label>

                  <Estado
                    activo={selected.activo}
                    label={
                      selected.activo
                        ? 'ACTIVO'
                        : 'INACTIVO'
                    }
                  />

                </div>

                <div className="cap-field">

                  <label>Estado del QR</label>

                  <Estado
                    activo={
                      Boolean(
                        selected.credencialActiva
                      )
                    }
                    label={
                      selected.credencialActiva
                        ? 'ACTIVA'
                        : selected.estadoQR === 'REVOCADA'
                          ? 'REVOCADA'
                          : 'SIN CREDENCIAL'
                    }
                  />

                </div>

                <div className="cap-field">

                  <label>Fecha de generación</label>

                  <strong>

                    {formatDate(
                      selected.credencialActiva
                        ?.created_at
                    )}

                  </strong>

                </div>

              </div>

              {!selected.activo && (

                <div className="cap-alert-warning">

                  El colaborador está inactivo.
                  No se permite generar ni imprimir
                  nuevas credenciales para su uso.

                </div>

              )}

              {selected.activo &&
               !selected.credencialActiva && (

                <button
                  type="button"
                  className="cap-primary"
                  disabled={busy}
                  onClick={generarCredencial}
                >

                  <Plus size={18} />

                  {saving

                    ? 'Generando...'

                    : selected.historial.length

                      ? 'Generar nueva credencial'

                      : 'Generar credencial QR'}

                </button>

              )}

              {selected.credencialActiva && (

                <>

                  <h3>Acciones de credencial</h3>

                  <div style={{

                    display: 'flex',

                    flexWrap: 'wrap',

                    gap: 10

                  }}>

                    <button
                      type="button"
                      className="cap-primary"
                      disabled={!canExport}
                      onClick={imprimirCredencial}
                    >

                      <Printer size={17} />
                      Imprimir credencial

                    </button>

                    <button
                      type="button"
                      className="cap-secondary"
                      disabled={!canExport}
                      onClick={descargarCredencial}
                    >

                      <Download size={17} />
                      Descargar PNG

                    </button>

                    <button
                      type="button"
                      className="cap-secondary"
                      disabled={!canExport}
                      onClick={descargarSoloQR}
                    >

                      <QrCode size={17} />
                      Descargar solo QR

                    </button>

                    <button
                      type="button"
                      className="cap-secondary"
                      disabled={!canExport}
                      onClick={copiarEnlace}
                    >

                      <Copy size={16} />
                      Copiar enlace

                    </button>

                    <button
                      type="button"
                      className="cap-secondary"
                      disabled={!canExport}
                      onClick={abrirConsultaPublica}
                    >

                      <ExternalLink size={16} />
                      Consulta pública

                    </button>

                  </div>

                  <div
                    className="cap-alert-info"
                    style={{ marginTop: 20 }}
                  >

                    <strong>

                      Consulta dinámica

                    </strong>

                    <p>

                      El QR no almacena las autorizaciones.
                      Contiene un enlace que permite
                      consultar su estado actualizado.

                    </p>

                    <p>

                      No es necesario reemplazar la
                      credencial cuando se autoriza
                      o suspende una competencia.

                    </p>

                  </div>

                  <button
                    type="button"
                    className="cap-secondary"
                    disabled={busy}
                    style={{

                      color: '#b91c1c',

                      borderColor: '#fecaca'

                    }}
                    onClick={() => {

                      setShowRevocar(true);

                      setMotivoRevocacion('');

                      setConfirmRevocacion(false);

                    }}
                  >

                    <Ban size={17} />
                    Revocar credencial

                  </button>

                </>

              )}

            </div>

          </div>

          {/* FORMULARIO DE REVOCACIÓN */}

          {showRevocar &&
           selected.credencialActiva && (

            <form
              onSubmit={revocarCredencial}
              style={{ marginTop: 25 }}
            >

              <div className="cap-error">

                <ShieldAlert size={22} />

                {' '}

                <strong>

                  Revocación definitiva del QR

                </strong>

                <p>

                  El código anterior dejará de ser válido.
                  Si se genera una nueva credencial,
                  deberá imprimirse un nuevo código.

                </p>

                <p>

                  Esta acción no revoca las
                  autorizaciones de máquinas
                  ni de riesgos críticos.

                </p>

              </div>

              <div className="cap-field">

                <label htmlFor="cap-qr-motivo">

                  Motivo de revocación *

                </label>

                <textarea
                  id="cap-qr-motivo"
                  value={motivoRevocacion}
                  required
                  disabled={busy}
                  placeholder="Pérdida de credencial, deterioro, baja..."
                  onChange={e =>
                    setMotivoRevocacion(
                      e.target.value
                    )
                  }
                />

              </div>

              <label style={{

                display: 'flex',

                alignItems: 'center',

                gap: 10,

                margin: '15px 0'

              }}>

                <input
                  type="checkbox"
                  required
                  checked={confirmRevocacion}
                  disabled={busy}
                  onChange={e =>
                    setConfirmRevocacion(
                      e.target.checked
                    )
                  }
                />

                Confirmo que deseo invalidar
                permanentemente esta credencial.

              </label>

              <div className="cap-form-actions">

                <button
                  type="button"
                  className="cap-secondary"
                  disabled={busy}
                  onClick={() => {

                    setShowRevocar(false);
                    setMotivoRevocacion('');
                    setConfirmRevocacion(false);

                  }}
                >

                  Cancelar

                </button>

                <button
                  type="submit"
                  className="cap-primary"
                  disabled={

                    busy ||

                    !confirmRevocacion ||

                    !motivoRevocacion.trim()

                  }
                  style={{

                    background: '#b91c1c',

                    borderColor: '#b91c1c'

                  }}
                >

                  <Ban size={16} />

                  {saving

                    ? 'Revocando...'

                    : 'Confirmar revocación'}

                </button>

              </div>

            </form>

          )}

          {/* HISTORIAL */}

          <div style={{ marginTop: 30 }}>

            <div className="cap-toolbar">

              <h3>

                <History size={20} />

                {' Historial de credenciales'}

              </h3>

              <span className="cap-muted">

                {selected.historial.length} registros

              </span>

            </div>

            <div className="cap-table-wrap">

              <table>

                <thead>

                  <tr>

                    <th>Fecha de generación</th>

                    <th>Estado</th>

                    <th>Fecha de revocación</th>

                    <th>Motivo</th>

                  </tr>

                </thead>

                <tbody>

                  {selected.historial.map(q => (

                    <tr key={q.id}>

                      <td>

                        {formatDate(q.created_at)}

                      </td>

                      <td>

                        <Estado
                          activo={q.activo}
                          label={
                            q.activo
                              ? 'ACTIVA'
                              : q.fecha_revocacion
                                ? 'REVOCADA'
                                : 'INACTIVA'
                          }
                        />

                      </td>

                      <td>

                        {formatDate(
                          q.fecha_revocacion
                        )}

                      </td>

                      <td>

                        {q.motivo_revocacion || '—'}

                      </td>

                    </tr>

                  ))}

                  {!selected.historial.length && (

                    <tr>

                      <td
                        colSpan={4}
                        className="cap-empty"
                      >

                        No existen credenciales
                        registradas.

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      )}

      {/* FILTROS */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>Buscar colaboradores</h2>

          <button
            type="button"
            className="cap-secondary"
            onClick={() => {

              setSearch('');

              setFilterEstado('TODOS');

              setIncludeInactive(false);

            }}
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
            placeholder="Buscar nombre, código o puesto..."
            onChange={e =>
              setSearch(e.target.value)
            }
          />

        </div>

        <div className="cap-form-grid">

          <div className="cap-field">

            <label htmlFor="cap-qr-estado">

              Estado de credencial

            </label>

            <select
              id="cap-qr-estado"
              value={filterEstado}
              onChange={e =>
                setFilterEstado(e.target.value)
              }
            >

              <option value="TODOS">

                Todos los estados

              </option>

              <option value="ACTIVA">

                Credenciales activas

              </option>

              <option value="SIN_CREDENCIAL">

                Sin credencial generada

              </option>

              <option value="REVOCADA">

                Sin credencial activa, con historial

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
            checked={includeInactive}
            onChange={e =>
              setIncludeInactive(
                e.target.checked
              )
            }
          />

          Incluir colaboradores inactivos

        </label>

      </div>

      {/* CATÁLOGO DE CREDENCIALES */}

      <div className="cap-panel">

        <div className="cap-toolbar">

          <h2>Control de credenciales</h2>

          <span className="cap-muted">

            {filtered.length} colaboradores

          </span>

        </div>

        {loading ? (

          <div
            className="cap-welcome"
            role="status"
          >

            <RefreshCw size={35} />

            <p>Cargando credenciales...</p>

          </div>

        ) : (

          <div className="cap-table-wrap">

            <table>

              <thead>

                <tr>

                  <th>Código</th>

                  <th>Colaborador</th>

                  <th>Puesto</th>

                  <th>Estado personal</th>

                  <th>Credencial QR</th>

                  <th>Generación</th>

                  <th>Acciones</th>

                </tr>

              </thead>

              <tbody>

                {filtered.map(c => (

                  <tr key={c.id}>

                    <td>{c.codigo}</td>

                    <td>

                      <strong>

                        {c.nombre}

                      </strong>

                      {c.es_lider && (

                        <div style={{

                          color: '#b45309',

                          fontSize: 11,

                          marginTop: 4

                        }}>

                          <Award size={13} />

                          {' LÍDER'}

                        </div>

                      )}

                    </td>

                    <td>{c.puesto || '—'}</td>

                    <td>

                      <Estado
                        activo={c.activo}
                        label={
                          c.activo
                            ? 'ACTIVO'
                            : 'INACTIVO'
                        }
                      />

                    </td>

                    <td>

                      <Estado
                        activo={
                          Boolean(c.credencialActiva)
                        }
                        label={
                          c.estadoQR.replaceAll('_', ' ')
                        }
                      />

                    </td>

                    <td>

                      {formatDate(
                        c.credencialActiva
                          ?.created_at
                      )}

                    </td>

                    <td>

                      <button
                        type="button"
                        className="cap-secondary"
                        disabled={busy}
                        onClick={() =>
                          seleccionarColaborador(c.id)
                        }
                      >

                        <QrCode size={16} />

                        {c.credencialActiva

                          ? 'Ver credencial'

                          : 'Administrar'}

                      </button>

                    </td>

                  </tr>

                ))}

                {!filtered.length && (

                  <tr>

                    <td
                      colSpan={7}
                      className="cap-empty"
                    >

                      No se encontraron colaboradores
                      para los filtros seleccionados.

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* INFORMACIÓN DE SEGURIDAD */}

      <div className="cap-alert-info">

        <ShieldCheck size={20} />

        {' '}

        <strong>

          Seguridad de las credenciales

        </strong>

        <p>

          Los códigos QR contienen un token individual.
          Cualquier persona que tenga acceso al código
          podrá consultar la información pública
          permitida por Supabase.

        </p>

        <p>

          No contienen documentación médica,
          contraseñas ni enlaces privados de Storage.

        </p>

        <p>

          En caso de pérdida, se recomienda revocar
          la credencial y generar una nueva.

        </p>

      </div>

    </div>

  );

}
