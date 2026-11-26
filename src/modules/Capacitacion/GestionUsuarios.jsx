
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef
} from 'react';

import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Settings,
  Factory,
  GraduationCap,
  Eye,
  Clock,
  CalendarClock,
  Search,
  RefreshCw,
  Pencil,
  Save,
  X,
  Info,
  Lock
} from 'lucide-react';

import './capacitacion.css';

// ==========================================
// CONFIGURACIÓN DE PERFILES
// ==========================================

const ROLES = {
  JEFE_PRODUCCION: {
    label: 'Jefe de producción',
    icon: ShieldCheck,
    color: '#164b83',
    bg: '#dbeafe',
    description:
      'Administración, autorizaciones, catálogos y credenciales.',
    permisos: [
      'Administrar catálogos',
      'Asignar riesgos críticos',
      'Emitir VoBo',
      'Suspender y reactivar autorizaciones',
      'Consultar expedientes',
      'Administrar credenciales QR',
      'Administrar usuarios'
    ]
  },

  ING_PROCESOS: {
    label: 'Ingeniero de procesos',
    icon: Factory,
    color: '#0369a1',
    bg: '#e0f2fe',
    description:
      'Validación de capacitación de máquinas y aptitud médica.',
    permisos: [
      'Validar capacitación de máquinas',
      'Cargar evidencias de máquinas',
      'Registrar aptitud médica',
      'Consultar autorizaciones',
      'Consultar matrices',
      'Consultar vencimientos médicos'
    ]
  },

  GESTOR_RC: {
    label: 'Gestor de riesgos críticos',
    icon: GraduationCap,
    color: '#6d28d9',
    bg: '#ede9fe',
    description:
      'Gestión de Moodle, entrenamiento y certificaciones.',
    permisos: [
      'Validar Moodle',
      'Validar entrenamiento práctico',
      'Registrar certificaciones adicionales',
      'Cargar evidencias correspondientes',
      'Consultar matrices',
      'Consultar vencimientos asignados'
    ]
  },

  CONSULTA: {
    label: 'Consulta',
    icon: Eye,
    color: '#475569',
    bg: '#f1f5f9',
    description:
      'Consulta de información operativa sin edición.',
    permisos: [
      'Consultar matriz de máquinas',
      'Consultar matriz de riesgos críticos',
      'Consultar polivalencia',
      'Consultar estados operativos'
    ]
  }
};

// ==========================================
// ESTADOS DE ACCESO
// ==========================================

const ESTADOS = {
  VIGENTE: {
    label: 'Acceso vigente',
    color: '#166534',
    bg: '#dcfce7'
  },

  INACTIVO: {
    label: 'Desactivado',
    color: '#991b1b',
    bg: '#fee2e2'
  },

  VENCIDO: {
    label: 'Acceso vencido',
    color: '#991b1b',
    bg: '#fee2e2'
  },

  PROGRAMADO: {
    label: 'Acceso programado',
    color: '#92400e',
    bg: '#fef3c7'
  },

  SIN_CONFIGURAR: {
    label: 'Sin configurar',
    color: '#475569',
    bg: '#f1f5f9'
  },

  INVALIDO: {
    label: 'Configuración inválida',
    color: '#991b1b',
    bg: '#fee2e2'
  }
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

function formatDate(value) {
  if (!value) return '—';

  const [year, month, day] =
    String(value).slice(0, 10).split('-');

  return `${day}/${month}/${year}`;
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getRol(value) {
  return ROLES[value] || {
    label: value || 'Sin perfil asignado',
    color: '#64748b',
    bg: '#f1f5f9',
    icon: UserX,
    description: '',
    permisos: []
  };
}

function getEstadoUsuario(
  usuario,
  hoy = fechaGuatemala()
) {
  if (usuario.configurado !== true) {
    return 'SIN_CONFIGURAR';
  }

  if (usuario.activo !== true) {
    return 'INACTIVO';
  }

  if (!Object.prototype.hasOwnProperty.call(
    ROLES,
    usuario.rol
  )) {
    return 'INVALIDO';
  }

  if (
    usuario.fecha_inicio &&
    usuario.fecha_fin &&
    usuario.fecha_fin < usuario.fecha_inicio
  ) {
    return 'INVALIDO';
  }

  if (
    usuario.fecha_inicio &&
    usuario.fecha_inicio > hoy
  ) {
    return 'PROGRAMADO';
  }

  if (
    usuario.fecha_fin &&
    usuario.fecha_fin < hoy
  ) {
    return 'VENCIDO';
  }

  return 'VIGENTE';
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

function crearFormulario(usuario) {
  return {
    usuario_id: usuario.usuario_id,
    correo: usuario.correo || '',
    nombre: usuario.nombre || '',
    puesto: usuario.puesto || '',
    rol: usuario.rol || 'CONSULTA',
    activo: usuario.configurado
      ? usuario.activo === true
      : false,
    fecha_inicio:
      usuario.fecha_inicio || fechaGuatemala(),
    fecha_fin: usuario.fecha_fin || '',
    observaciones: usuario.observaciones || ''
  };
}

// ==========================================
// COMPONENTES VISUALES
// ==========================================

function EstadoUsuario({ value }) {
  const config =
    ESTADOS[value] || ESTADOS.SIN_CONFIGURAR;

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

function PerfilUsuario({ value }) {
  const config = getRol(value);
  const Icon = config.icon;

  return (
    <span
      className="cap-status"
      style={{
        background: config.bg,
        color: config.color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }}
    >
      <Icon size={14} />
      {config.label}
    </span>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  description,
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

      <div className="cap-kpi-description">
        {description}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function GestionUsuarios({
  client,
  role
}) {
  const canManage =
    role === 'JEFE_PRODUCCION';

  const [usuarios, setUsuarios] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [filterRol, setFilterRol] = useState('TODOS');
  const [filterEstado, setFilterEstado] = useState('TODOS');

  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);

  const [showPermisos, setShowPermisos] = useState(false);
  const [confirmacion, setConfirmacion] = useState(false);

  const requestRef = useRef(0);
  const savingRef = useRef(false);

  // ==========================================
  // VERIFICAR PERMISOS
  // ==========================================

  const verificarPermisos = useCallback(async () => {
    if (!client || !canManage) {
      throw new Error(
        'Acceso restringido al jefe de producción.'
      );
    }

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
        'Tu perfil no tiene autorización administrativa vigente.'
      );
    }

    return authData.user.id;

  }, [client, canManage]);

  // ==========================================
  // CONSULTAR USUARIOS
  // ==========================================

  const cargarUsuarios = useCallback(async () => {
    const requestId = ++requestRef.current;

    if (!client || !canManage) {
      setUsuarios([]);
      setCurrentUserId(null);
      setLoading(false);
      return false;
    }

    setLoading(true);
    setError('');
    setWarning('');

    try {
      const userId = await verificarPermisos();

      const registros = [];
      const pageSize = 200;

      // Consultar usuarios mediante la RPC
      // administrativa. No acceder directamente
      // a auth.users desde el navegador.

      for (
        let offset = 0;
        ;
        offset += pageSize
      ) {
        const { data, error } = await client
          .rpc('cap_consultar_usuarios')
          .order('usuario_id')
          .range(
            offset,
            offset + pageSize - 1
          );

        if (error) throw error;

        if (requestRef.current !== requestId) {
          return false;
        }

        const page = data || [];

        registros.push(...page);

        if (page.length < pageSize) {
          break;
        }
      }

      if (requestRef.current !== requestId) {
        return false;
      }

      setUsuarios(registros);
      setCurrentUserId(userId);

      return true;

    } catch (err) {
      if (requestRef.current !== requestId) {
        return false;
      }

      setUsuarios([]);
      setCurrentUserId(null);

      setError(
        'No fue posible consultar los usuarios: ' +
        err.message
      );

      return false;

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

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  useEffect(() => {
    setUsuarios([]);
    setCurrentUserId(null);
    setForm(null);
    setOriginal(null);
    setSuccess('');
    setConfirmacion(false);

    cargarUsuarios();

    return () => {
      requestRef.current += 1;
    };

  }, [cargarUsuarios]);

  // ==========================================
  // ESTADOS CALCULADOS
  // ==========================================

  const registros = useMemo(() => {
    const hoy = fechaGuatemala();

    return usuarios.map(u => ({
      ...u,
      estadoAcceso: getEstadoUsuario(u, hoy)
    }));

  }, [usuarios]);

  // ==========================================
  // INDICADORES
  // ==========================================

  const indicadores = useMemo(() => {
    const vigentes = registros.filter(
      u => u.estadoAcceso === 'VIGENTE'
    );

    return {
      total: registros.length,

      configurados: registros.filter(
        u => u.configurado === true
      ).length,

      vigentes: vigentes.length,

      inactivos: registros.filter(
        u => u.estadoAcceso === 'INACTIVO'
      ).length,

      vencidos: registros.filter(
        u => u.estadoAcceso === 'VENCIDO'
      ).length,

      programados: registros.filter(
        u => u.estadoAcceso === 'PROGRAMADO'
      ).length,

      sinConfigurar: registros.filter(
        u => u.estadoAcceso === 'SIN_CONFIGURAR'
      ).length,

      temporales: vigentes.filter(
        u => Boolean(u.fecha_fin)
      ).length,

      proximosVencer: vigentes.filter(u => {
        const dias = diasRestantes(u.fecha_fin);

        return dias !== null &&
          dias >= 0 &&
          dias <= 30;
      }).length,

      administradores: vigentes.filter(
        u => u.rol === 'JEFE_PRODUCCION'
      ).length
    };

  }, [registros]);

  // ==========================================
  // DISTRIBUCIÓN POR PERFIL
  // ==========================================

  const resumenRoles = useMemo(() => {
    return Object.entries(ROLES).map(
      ([rol, config]) => {

        const usuariosRol = registros.filter(
          u =>
            u.configurado === true &&
            u.rol === rol
        );

        return {
          rol,
          ...config,
          total: usuariosRol.length,
          vigentes: usuariosRol.filter(
            u => u.estadoAcceso === 'VIGENTE'
          ).length
        };

      }
    );

  }, [registros]);

  // ==========================================
  // FILTROS
  // ==========================================

  const filtered = useMemo(() => {
    const term = normalize(search);

    return registros.filter(u => {
      if (
        filterRol !== 'TODOS' &&
        u.rol !== filterRol
      ) {
        return false;
      }

      if (
        filterEstado !== 'TODOS' &&
        u.estadoAcceso !== filterEstado
      ) {
        return false;
      }

      if (!term) return true;

      return [
        u.nombre,
        u.correo,
        u.puesto,
        getRol(u.rol).label
      ].some(value =>
        normalize(value).includes(term)
      );

    }).sort((a, b) =>
      String(a.nombre || a.correo || '')
        .localeCompare(
          String(b.nombre || b.correo || ''),
          'es'
        )
    );

  }, [
    registros,
    search,
    filterRol,
    filterEstado
  ]);

  // ==========================================
  // EDITAR USUARIO
  // ==========================================

  function editarUsuario(usuario) {
    if (savingRef.current || loading) return;

    setOriginal(usuario);
    setForm(crearFormulario(usuario));

    setConfirmacion(false);
    setError('');
    setSuccess('');
    setWarning('');
  }

  function cancelarEdicion() {
    if (savingRef.current) return;

    setForm(null);
    setOriginal(null);
    setConfirmacion(false);
  }

  function updateField(field, value) {
    setForm(previous => ({
      ...previous,
      [field]: value
    }));

    setConfirmacion(false);
  }

  function limpiarFiltros() {
    setSearch('');
    setFilterRol('TODOS');
    setFilterEstado('TODOS');
  }

  const editandoPropioUsuario = Boolean(
    form &&
    currentUserId &&
    form.usuario_id === currentUserId
  );

  const cambiosSeguridad = Boolean(
    form &&
    original &&
    (
      original.configurado !== true ||
      form.rol !== original.rol ||
      form.activo !== original.activo ||
      (form.fecha_inicio || null) !==
        (original.fecha_inicio || null) ||
      (form.fecha_fin || null) !==
        (original.fecha_fin || null)
    )
  );

  const estadoPrevisto = form

    ? getEstadoUsuario({
        ...form,
        configurado: true
      })

    : null;

  // ==========================================
  // VALIDAR FORMULARIO
  // ==========================================

  function validarFormulario(
    values,
    actualUserId,
    usuarioActual
  ) {
    if (!values.usuario_id) {
      return 'No existe un usuario seleccionado.';
    }

    if (!values.nombre.trim()) {
      return 'Debes ingresar el nombre del usuario.';
    }

    if (!values.puesto.trim()) {
      return 'Debes ingresar el puesto del usuario.';
    }

    if (!Object.prototype.hasOwnProperty.call(
      ROLES,
      values.rol
    )) {
      return 'Selecciona un perfil válido.';
    }

    if (!values.fecha_inicio) {
      return 'Debes indicar una fecha de inicio.';
    }

    if (
      values.fecha_fin &&
      values.fecha_fin < values.fecha_inicio
    ) {
      return (
        'La fecha de finalización no puede ser ' +
        'anterior a la fecha de inicio.'
      );
    }

    // Protección adicional contra
    // bloqueo accidental del administrador.

    if (values.usuario_id === actualUserId) {
      if (
        values.rol !== usuarioActual.rol ||
        values.activo !== usuarioActual.activo ||
        (values.fecha_inicio || null) !==
          (usuarioActual.fecha_inicio || null) ||
        (values.fecha_fin || null) !==
          (usuarioActual.fecha_fin || null)
      ) {
        return (
          'No puedes modificar tu propio perfil, ' +
          'estado ni vigencia desde este módulo.'
        );
      }
    }

    return null;
  }

  // ==========================================
  // GUARDAR CONFIGURACIÓN
  // ==========================================

  async function guardarUsuario(event) {
    event.preventDefault();

    if (
      !client ||
      !canManage ||
      !form ||
      !original ||
      savingRef.current ||
      loading
    ) {
      return;
    }

    setError('');
    setSuccess('');
    setWarning('');

    const values = {
      ...form,
      nombre: form.nombre.trim().toUpperCase(),
      puesto: form.puesto.trim().toUpperCase(),
      observaciones: form.observaciones.trim()
    };

    const validationError = validarFormulario(
      values,
      currentUserId,
      original
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    if (
      cambiosSeguridad &&
      !confirmacion
    ) {
      setError(
        'Debes confirmar los cambios de acceso.'
      );
      return;
    }

    if (!window.confirm(
      '¿Guardar la configuración de acceso?\n\n' +
      `Usuario: ${values.nombre}\n` +
      `Correo: ${values.correo}\n` +
      `Perfil: ${getRol(values.rol).label}\n` +
      `Estado: ${ESTADOS[estadoPrevisto]?.label}`
    )) {
      return;
    }

    savingRef.current = true;
    setSaving(true);

    let guardado = false;

    try {
      const actualUserId =
        await verificarPermisos();

      if (actualUserId !== currentUserId) {
        throw new Error(
          'La sesión cambió. Actualiza el módulo.'
        );
      }

      // Verificar que la configuración no haya
      // cambiado desde otra sesión administrativa.

      const {
        data: currentRows,
        error: currentError
      } = await client
        .rpc('cap_consultar_usuarios')
        .eq('usuario_id', values.usuario_id);

      if (currentError) throw currentError;

      const usuarioActual =
        currentRows?.find(
          u => u.usuario_id === values.usuario_id
        );

      if (!usuarioActual) {
        throw new Error(
          'El usuario ya no está disponible.'
        );
      }

      const campos = [
        'configurado',
        'nombre',
        'puesto',
        'rol',
        'activo',
        'fecha_inicio',
        'fecha_fin',
        'observaciones'
      ];

      const modificado = campos.some(field =>
        (usuarioActual[field] ?? null) !==
        (original[field] ?? null)
      );

      if (modificado) {
        throw new Error(
          'La configuración cambió desde otra sesión. ' +
          'Cancela la edición y actualiza los datos.'
        );
      }

      const finalValidation = validarFormulario(
        values,
        actualUserId,
        usuarioActual
      );

      if (finalValidation) {
        throw new Error(finalValidation);
      }

      // Ejecutar exclusivamente la RPC existente.
      // No modificar auth.users ni contraseñas.

      const { error } = await client.rpc(
        'cap_gestionar_usuario',
        {
          p_usuario_id: values.usuario_id,

          p_nombre: values.nombre,

          p_puesto: values.puesto,

          p_rol: values.rol,

          p_activo: values.activo === true,

          p_fecha_inicio:
            values.fecha_inicio || null,

          p_fecha_fin:
            values.fecha_fin || null,

          p_observaciones:
            values.observaciones || null
        }
      );

      if (error) throw error;

      guardado = true;

      setForm(null);
      setOriginal(null);
      setConfirmacion(false);

      const actualizado =
        await cargarUsuarios();

      setSuccess(
        actualizado
          ? 'Configuración de usuario guardada correctamente.'
          : 'Configuración guardada. Actualiza el catálogo para verificar los cambios.'
      );

    } catch (err) {
      setError(
        guardado
          ? 'Los cambios se guardaron, pero no se pudo actualizar la consulta.'
          : 'No fue posible guardar el usuario: ' +
            err.message
      );

    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  // ==========================================
  // CONTROL DE ACCESO
  // ==========================================

  if (!client || !canManage) {
    return (
      <div className="cap-panel cap-welcome">
        <Lock size={45} />

        <h2>Administración de usuarios restringida</h2>

        <p>
          Únicamente el jefe de producción puede
          configurar los accesos del sistema de
          capacitación.
        </p>
      </div>
    );
  }

  const busy = loading || saving;

  const mostrarValor = value =>
    loading || error ? '—' : value;

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (
    <div className="cap-gestion-usuarios">

      {/* ENCABEZADO */}

      <div className="cap-panel cap-toolbar">
        <div>
          <h2>Gestión de usuarios</h2>

          <p className="cap-muted">
            Perfiles, permisos y vigencia de accesos
            al sistema de capacitación.
          </p>
        </div>

        <button
          type="button"
          className="cap-secondary"
          disabled={busy || Boolean(form)}
          onClick={cargarUsuarios}
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
          label="Usuarios registrados"
          value={mostrarValor(indicadores.total)}
          description="Cuentas disponibles en la consulta"
        />

        <KPI
          icon={UserCheck}
          label="Accesos vigentes"
          value={mostrarValor(indicadores.vigentes)}
          description="Usuarios habilitados actualmente"
          color="#15803d"
          variant="cap-kpi-success"
        />

        <KPI
          icon={UserPlus}
          label="Sin configurar"
          value={mostrarValor(
            indicadores.sinConfigurar
          )}
          description="Pendientes de perfil de capacitación"
          color="#b45309"
          variant="cap-kpi-warning"
        />

        <KPI
          icon={UserX}
          label="Desactivados"
          value={mostrarValor(indicadores.inactivos)}
          description="Sin acceso habilitado"
          color="#b91c1c"
          variant="cap-kpi-danger"
        />

        <KPI
          icon={CalendarClock}
          label="Accesos temporales vigentes"
          value={mostrarValor(indicadores.temporales)}
          description="Con fecha de finalización"
        />

        <KPI
          icon={Clock}
          label="Próximos a vencer"
          value={mostrarValor(
            indicadores.proximosVencer
          )}
          description="Dentro de los próximos 30 días"
          color="#b45309"
          variant="cap-kpi-warning"
        />

        <KPI
          icon={ShieldAlert}
          label="Accesos vencidos"
          value={mostrarValor(indicadores.vencidos)}
          description="Fecha de finalización superada"
          color="#b91c1c"
          variant="cap-kpi-danger"
        />

      </div>

      {/* DISTRIBUCIÓN DE PERFILES */}

      <div className="cap-panel">
        <div className="cap-toolbar">
          <h2>Distribución de usuarios por perfil</h2>

          <button
            type="button"
            className="cap-secondary"
            onClick={() =>
              setShowPermisos(previous => !previous)
            }
          >
            <ShieldCheck size={16} />

            {showPermisos
              ? 'Ocultar permisos'
              : 'Ver permisos'}
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 15
        }}>

          {resumenRoles.map(r => {
            const Icon = r.icon;

            return (
              <div
                key={r.rol}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 18,
                  background: '#ffffff'
                }}
              >
                <div style={{
                  width: 45,
                  height: 45,
                  borderRadius: 10,
                  background: r.bg,
                  color: r.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={25} />
                </div>

                <h3 style={{
                  color: r.color,
                  fontSize: 15,
                  margin: '14px 0 8px'
                }}>
                  {r.label}
                </h3>

                <div style={{
                  color: r.color,
                  fontWeight: 700,
                  fontSize: 32
                }}>
                  {mostrarValor(r.vigentes)}
                </div>

                <p className="cap-muted">
                  Usuarios vigentes de {r.total} configurados
                </p>

                <p style={{
                  fontSize: 12,
                  color: '#64748b'
                }}>
                  {r.description}
                </p>

                {showPermisos && (
                  <div style={{
                    marginTop: 15,
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: 10
                  }}>
                    {r.permisos.map(permiso => (
                      <div
                        key={permiso}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 7,
                          fontSize: 12,
                          marginBottom: 8
                        }}
                      >
                        <ShieldCheck
                          size={15}
                          color={r.color}
                          style={{ flexShrink: 0 }}
                        />

                        {permiso}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="cap-secondary"
                  style={{ marginTop: 10 }}
                  onClick={() => {
                    limpiarFiltros();
                    setFilterRol(r.rol);
                  }}
                >
                  Ver usuarios
                </button>

              </div>
            );
          })}

        </div>
      </div>

      {/* FORMULARIO DE CONFIGURACIÓN */}

      {form && (
        <div className="cap-panel">

          <div className="cap-toolbar">
            <h2>
              {original?.configurado
                ? 'Editar configuración de usuario'
                : 'Configurar nuevo acceso'}
            </h2>

            <button
              type="button"
              className="cap-secondary"
              disabled={saving}
              onClick={cancelarEdicion}
            >
              <X size={16} />
              Cerrar
            </button>
          </div>

          {editandoPropioUsuario && (
            <div className="cap-alert-info">
              <Lock size={18} />

              {' '}

              Estás editando tu propio usuario.

              Por seguridad, únicamente puedes
              modificar nombre, puesto y observaciones.
            </div>
          )}

          <form onSubmit={guardarUsuario}>

            <div className="cap-form-grid">

              {/* CORREO */}

              <div className="cap-field cap-field-full">
                <label htmlFor="cap-usr-correo">
                  Correo electrónico
                </label>

                <input
                  id="cap-usr-correo"
                  value={form.correo}
                  readOnly
                  style={{
                    background: '#f1f5f9',
                    color: '#64748b'
                  }}
                />

                <span className="cap-muted">
                  Correo registrado en Supabase Auth.
                  No puede modificarse desde este módulo.
                </span>
              </div>

              {/* NOMBRE */}

              <div className="cap-field">
                <label htmlFor="cap-usr-nombre">
                  Nombre completo *
                </label>

                <input
                  id="cap-usr-nombre"
                  value={form.nombre}
                  required
                  disabled={saving}
                  placeholder="Nombre completo"
                  onChange={e =>
                    updateField(
                      'nombre',
                      e.target.value
                    )
                  }
                />
              </div>

              {/* PUESTO */}

              <div className="cap-field">
                <label htmlFor="cap-usr-puesto">
                  Puesto *
                </label>

                <input
                  id="cap-usr-puesto"
                  value={form.puesto}
                  required
                  disabled={saving}
                  placeholder="Puesto del usuario"
                  onChange={e =>
                    updateField(
                      'puesto',
                      e.target.value
                    )
                  }
                />
              </div>

              {/* PERFIL */}

              <div className="cap-field">
                <label htmlFor="cap-usr-rol">
                  Perfil de capacitación *
                </label>

                <select
                  id="cap-usr-rol"
                  value={form.rol}
                  required
                  disabled={
                    saving ||
                    editandoPropioUsuario
                  }
                  onChange={e =>
                    updateField(
                      'rol',
                      e.target.value
                    )
                  }
                >
                  {Object.entries(ROLES).map(
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

              {/* ESTADO */}

              <div className="cap-field">
                <label htmlFor="cap-usr-activo">
                  Estado administrativo
                </label>

                <select
                  id="cap-usr-activo"
                  value={
                    form.activo
                      ? 'ACTIVO'
                      : 'INACTIVO'
                  }
                  disabled={
                    saving ||
                    editandoPropioUsuario
                  }
                  onChange={e =>
                    updateField(
                      'activo',
                      e.target.value === 'ACTIVO'
                    )
                  }
                >
                  <option value="ACTIVO">
                    Activo
                  </option>

                  <option value="INACTIVO">
                    Desactivado
                  </option>
                </select>
              </div>

              {/* FECHA INICIO */}

              <div className="cap-field">
                <label htmlFor="cap-usr-inicio">
                  Fecha de inicio *
                </label>

                <input
                  id="cap-usr-inicio"
                  type="date"
                  value={form.fecha_inicio}
                  required
                  disabled={
                    saving ||
                    editandoPropioUsuario
                  }
                  onChange={e =>
                    updateField(
                      'fecha_inicio',
                      e.target.value
                    )
                  }
                />
              </div>

              {/* FECHA FINALIZACIÓN */}

              <div className="cap-field">
                <label htmlFor="cap-usr-fin">
                  Fecha de finalización
                </label>

                <input
                  id="cap-usr-fin"
                  type="date"
                  value={form.fecha_fin}
                  min={form.fecha_inicio}
                  disabled={
                    saving ||
                    editandoPropioUsuario
                  }
                  onChange={e =>
                    updateField(
                      'fecha_fin',
                      e.target.value
                    )
                  }
                />

                <span className="cap-muted">
                  Déjala vacía para un acceso
                  sin fecha de finalización.
                </span>
              </div>

              {/* OBSERVACIONES */}

              <div className="cap-field cap-field-full">
                <label htmlFor="cap-usr-observaciones">
                  Observaciones administrativas
                </label>

                <textarea
                  id="cap-usr-observaciones"
                  value={form.observaciones}
                  rows={4}
                  disabled={saving}
                  placeholder="Motivo de asignación, traslado, cobertura temporal..."
                  onChange={e =>
                    updateField(
                      'observaciones',
                      e.target.value
                    )
                  }
                />
              </div>

            </div>

            {/* RESUMEN DEL PERFIL */}

            <div style={{
              background: getRol(form.rol).bg,
              borderRadius: 10,
              padding: 18,
              margin: '20px 0'
            }}>

              <h3 style={{
                color: getRol(form.rol).color,
                marginTop: 0
              }}>
                Permisos del perfil seleccionado
              </h3>

              <PerfilUsuario value={form.rol} />

              <div style={{ marginTop: 15 }}>
                {getRol(form.rol).permisos.map(p => (
                  <div
                    key={p}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      marginBottom: 9,
                      fontSize: 13
                    }}
                  >
                    <ShieldCheck
                      size={17}
                      color={getRol(form.rol).color}
                    />

                    {p}
                  </div>
                ))}
              </div>

            </div>

            {/* ESTADO PREVISTO */}

            <div className="cap-alert-info">
              <div className="cap-toolbar">
                <strong>
                  Estado de acceso previsto
                </strong>

                <EstadoUsuario
                  value={estadoPrevisto}
                />
              </div>

              <p>
                Inicio: {formatDate(form.fecha_inicio)}
              </p>

              <p>
                Finalización: {
                  form.fecha_fin
                    ? formatDate(form.fecha_fin)
                    : 'Indefinida'
                }
              </p>

              {estadoPrevisto === 'PROGRAMADO' && (
                <p>
                  El acceso se habilitará cuando llegue
                  la fecha de inicio, siempre que el
                  usuario permanezca activo.
                </p>
              )}

              {estadoPrevisto === 'VENCIDO' && (
                <p>
                  La fecha de finalización ya fue
                  superada. El acceso no estará vigente.
                </p>
              )}
            </div>

            {/* CONFIRMACIÓN */}

            {cambiosSeguridad && (
              <div className="cap-alert-warning">

                <strong>
                  Modificación de permisos
                </strong>

                <p>
                  Los cambios de perfil, estado o
                  vigencia pueden modificar el acceso
                  del usuario al sistema de capacitación.
                </p>

                {form.rol === 'JEFE_PRODUCCION' && (
                  <p>
                    Este perfil concede permisos
                    administrativos, incluyendo acceso
                    a expedientes y gestión de usuarios.
                  </p>
                )}

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <input
                    type="checkbox"
                    checked={confirmacion}
                    required
                    disabled={saving}
                    onChange={e =>
                      setConfirmacion(e.target.checked)
                    }
                  />

                  Confirmo la asignación de estos
                  permisos y condiciones de acceso.
                </label>

              </div>
            )}

            {/* BOTONES */}

            <div className="cap-form-actions">

              <button
                type="button"
                className="cap-secondary"
                disabled={saving}
                onClick={cancelarEdicion}
              >
                <X size={16} />
                Cancelar
              </button>

              <button
                type="submit"
                className="cap-primary"
                disabled={
                  saving ||
                  (
                    cambiosSeguridad &&
                    !confirmacion
                  )
                }
              >
                <Save size={18} />

                {saving
                  ? 'Guardando...'
                  : 'Guardar configuración'}
              </button>

            </div>
          </form>
        </div>
      )}

      {/* FILTROS */}

      <div className="cap-panel">

        <div className="cap-toolbar">
          <h2>Filtros de usuarios</h2>

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
            placeholder="Buscar nombre, correo o puesto..."
            aria-label="Buscar usuarios"
            onChange={e =>
              setSearch(e.target.value)
            }
          />
        </div>

        <div className="cap-form-grid">

          <div className="cap-field">
            <label htmlFor="cap-usr-filter-rol">
              Perfil
            </label>

            <select
              id="cap-usr-filter-rol"
              value={filterRol}
              onChange={e =>
                setFilterRol(e.target.value)
              }
            >
              <option value="TODOS">
                Todos los perfiles
              </option>

              {Object.entries(ROLES).map(
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
            <label htmlFor="cap-usr-filter-estado">
              Estado de acceso
            </label>

            <select
              id="cap-usr-filter-estado"
              value={filterEstado}
              onChange={e =>
                setFilterEstado(e.target.value)
              }
            >
              <option value="TODOS">
                Todos los estados
              </option>

              {Object.entries(ESTADOS).map(
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

        </div>
      </div>

      {/* TABLA DE USUARIOS */}

      <div className="cap-panel">

        <div className="cap-toolbar">
          <h2>Control de usuarios</h2>

          <span className="cap-muted">
            {filtered.length} de {registros.length} usuarios
          </span>
        </div>

        {loading ? (
          <div className="cap-welcome" role="status">
            <RefreshCw size={35} />
            <p>Cargando usuarios...</p>
          </div>
        ) : (
          <div className="cap-table-wrap">

            <table>

              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo electrónico</th>
                  <th>Puesto</th>
                  <th>Perfil</th>
                  <th>Estado</th>
                  <th>Inicio</th>
                  <th>Finalización</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>

                {filtered.map(u => {
                  const dias =
                    diasRestantes(u.fecha_fin);

                  return (
                    <tr key={u.usuario_id}>

                      <td>
                        <strong>
                          {u.nombre || 'Sin configurar'}
                        </strong>

                        {u.usuario_id === currentUserId && (
                          <div style={{
                            fontSize: 11,
                            color: '#164b83',
                            marginTop: 4
                          }}>
                            <UserCheck size={13} />
                            {' Tu usuario'}
                          </div>
                        )}
                      </td>

                      <td>
                        {u.correo || '—'}
                      </td>

                      <td>
                        {u.puesto || '—'}
                      </td>

                      <td>
                        <PerfilUsuario value={u.rol} />
                      </td>

                      <td>
                        <EstadoUsuario
                          value={u.estadoAcceso}
                        />
                      </td>

                      <td>
                        {formatDate(u.fecha_inicio)}
                      </td>

                      <td>
                        {!u.configurado
                          ? '—'
                          : u.fecha_fin
                            ? formatDate(u.fecha_fin)
                            : 'Indefinida'}

                        {u.estadoAcceso === 'VIGENTE' &&
                         dias !== null &&
                         dias >= 0 &&
                         dias <= 30 && (
                          <div style={{
                            color: '#b45309',
                            fontWeight: 700,
                            fontSize: 11,
                            marginTop: 4
                          }}>
                            {dias === 0
                              ? 'Vence hoy'
                              : `${dias} días restantes`}
                          </div>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="cap-secondary"
                          disabled={
                            busy ||
                            Boolean(form)
                          }
                          onClick={() => editarUsuario(u)}
                        >
                          {u.configurado
                            ? <Pencil size={15} />
                            : <UserPlus size={15} />}

                          {u.configurado
                            ? 'Editar'
                            : 'Configurar'}
                        </button>
                      </td>

                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={8}
                      className="cap-empty"
                    >
                      No se encontraron usuarios
                      para los filtros seleccionados.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* REGISTRO DE NUEVOS USUARIOS */}

      <div className="cap-panel">

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <UserPlus size={27} color="#164b83" />

          <h2>
            Incorporar un nuevo usuario
          </h2>
        </div>

        <p className="cap-muted">
          Las cuentas de autenticación deben crearse
          previamente en Supabase Auth.
        </p>

        {[
          'Ingresar al proyecto de Supabase.',
          'Abrir Authentication → Users.',
          'Crear o invitar al usuario mediante su correo.',
          'Regresar al módulo Gestión de usuarios.',
          'Actualizar el catálogo y localizar el correo.',
          'Configurar nombre, puesto, perfil y vigencia.',
          'Activar el acceso y guardar la configuración.'
        ].map((step, index) => (
          <div
            key={step}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 0',
              borderBottom: '1px solid #e2e8f0'
            }}
          >
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#eff6ff',
              color: '#164b83',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              flexShrink: 0
            }}>
              {index + 1}
            </div>

            <span style={{ fontSize: 13 }}>
              {step}
            </span>
          </div>
        ))}

      </div>

      {/* SEGURIDAD */}

      <div className="cap-alert-info">

        <ShieldCheck size={21} />

        {' '}

        <strong>
          Seguridad y control de accesos
        </strong>

        <p>
          Este módulo administra exclusivamente los
          permisos del sistema de capacitación.
        </p>

        <p>
          Desactivar un usuario no elimina su cuenta
          de autenticación, su historial ni los
          registros administrativos que haya generado.
        </p>

        <p>
          La vigencia del acceso es verificada por
          las políticas y funciones de Supabase.
          Las contraseñas no se consultan ni almacenan
          desde este componente.
        </p>

      </div>

    </div>
  );
}
