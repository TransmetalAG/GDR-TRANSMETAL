
import React, {
  useState,
  useEffect,
  useCallback
} from 'react';

import { createClient } from '@supabase/supabase-js';

import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Factory,
  ShieldCheck,
  ShieldAlert,
  ClipboardCheck,
  ClipboardList,
  CalendarClock,
  Bell,
  QrCode,
  Settings,
  FolderOpen,
  Grid3X3,
  Table,
  BarChart3,
  LogIn,
  LogOut,
  RefreshCw,
  ArrowLeft,
  Lock
} from 'lucide-react';

import Colaboradores from './Colaboradores.jsx';
import Maquinas from './Maquinas.jsx';
import RiesgosCriticos from './RiesgosCriticos.jsx';
import CapacitacionMaquinas from './CapacitacionMaquinas.jsx';
import CapacitacionRC from './CapacitacionRC.jsx';
import AutorizacionesMaquinas from './AutorizacionesMaquinas.jsx';
import AutorizacionesRC from './AutorizacionesRC.jsx';
import MatrizMaquinas from './MatrizMaquinas.jsx';
import MatrizRC from './MatrizRC.jsx';
import Polivalencia from './Polivalencia.jsx';
import Vencimientos from './Vencimientos.jsx';
import Notificaciones from './Notificaciones.jsx';
import ExpedienteColaborador from './ExpedienteColaborador.jsx';
import CredencialesQR from './CredencialesQR.jsx';
import GestionUsuarios from './GestionUsuarios.jsx';
import DashboardCapacitacion from './DashboardCapacitacion.jsx';

import './capacitacion.css';

// ==========================================
// CONFIGURACIÓN DE ROLES
// ==========================================

const JEFE = 'JEFE_PRODUCCION';
const ING = 'ING_PROCESOS';
const GESTOR = 'GESTOR_RC';
const CONSULTA = 'CONSULTA';

const TODOS = [
  JEFE,
  ING,
  GESTOR,
  CONSULTA
];

const RESPONSABLES = [
  JEFE,
  ING,
  GESTOR
];

const ROLES = {
  [JEFE]: 'Jefe de producción',
  [ING]: 'Ingeniero de procesos',
  [GESTOR]: 'Gestor de riesgos críticos',
  [CONSULTA]: 'Consulta'
};

// ==========================================
// CLIENTE DE SUPABASE INDEPENDIENTE
// ==========================================

let clienteCapacitacion = null;

function crearCliente() {
  if (clienteCapacitacion) {
    return clienteCapacitacion;
  }

  const url =
    import.meta.env.VITE_SUPABASE_URL;

  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  clienteCapacitacion = createClient(url, key, {
    auth: {
      storageKey: 'gdr-cap-auth',
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });

  return clienteCapacitacion;
}

// ==========================================
// CATÁLOGO DE MÓDULOS
// ==========================================

const MODULOS = [
  {
    id: 'DASHBOARD',
    grupo: 'Inicio',
    nombre: 'Dashboard ejecutivo',
    descripcion: 'Indicadores generales de capacitación',
    icon: LayoutDashboard,
    component: DashboardCapacitacion,
    roles: TODOS
  },
  {
    id: 'NOTIFICACIONES',
    grupo: 'Inicio',
    nombre: 'Notificaciones',
    descripcion: 'Alertas y solicitudes pendientes',
    icon: Bell,
    component: Notificaciones,
    roles: TODOS
  },
  {
    id: 'COLABORADORES',
    grupo: 'Catálogos',
    nombre: 'Colaboradores',
    descripcion: 'Personal y líderes de capacitación',
    icon: Users,
    component: Colaboradores,
    roles: TODOS
  },
  {
    id: 'MAQUINAS',
    grupo: 'Catálogos',
    nombre: 'Máquinas',
    descripcion: 'Equipos y metas de polivalencia',
    icon: Factory,
    component: Maquinas,
    roles: TODOS
  },
  {
    id: 'RIESGOS_CRITICOS',
    grupo: 'Catálogos',
    nombre: 'Riesgos críticos',
    descripcion: 'Catálogo y asignaciones individuales',
    icon: ShieldAlert,
    component: RiesgosCriticos,
    roles: TODOS
  },
  {
    id: 'CAPACITACION_MAQUINAS',
    grupo: 'Capacitación y autorizaciones',
    nombre: 'Capacitación de máquinas',
    descripcion: 'Entrenamiento y evidencias',
    icon: GraduationCap,
    component: CapacitacionMaquinas,
    roles: [JEFE, ING]
  },
  {
    id: 'CAPACITACION_RC',
    grupo: 'Capacitación y autorizaciones',
    nombre: 'Capacitación RC',
    descripcion: 'Moodle, entrenamiento y aptitud médica',
    icon: ClipboardList,
    component: CapacitacionRC,
    roles: RESPONSABLES
  },
  {
    id: 'AUTORIZACIONES_MAQUINAS',
    grupo: 'Capacitación y autorizaciones',
    nombre: 'Autorizaciones de máquinas',
    descripcion: 'VoBo y control de autorizaciones',
    icon: ClipboardCheck,
    component: AutorizacionesMaquinas,
    roles: [JEFE, ING]
  },
  {
    id: 'AUTORIZACIONES_RC',
    grupo: 'Capacitación y autorizaciones',
    nombre: 'Autorizaciones RC',
    descripcion: 'VoBo y permisos operativos',
    icon: ShieldCheck,
    component: AutorizacionesRC,
    roles: [JEFE, ING]
  },
  {
    id: 'MATRIZ_MAQUINAS',
    grupo: 'Control y seguimiento',
    nombre: 'Matriz de máquinas',
    descripcion: 'Competencias por colaborador',
    icon: Grid3X3,
    component: MatrizMaquinas,
    roles: TODOS
  },
  {
    id: 'MATRIZ_RC',
    grupo: 'Control y seguimiento',
    nombre: 'Matriz de riesgos críticos',
    descripcion: 'Cumplimiento de autorizaciones RC',
    icon: Table,
    component: MatrizRC,
    roles: TODOS
  },
  {
    id: 'POLIVALENCIA',
    grupo: 'Control y seguimiento',
    nombre: 'Polivalencia',
    descripcion: 'Cobertura y brechas de operadores',
    icon: BarChart3,
    component: Polivalencia,
    roles: TODOS
  },
  {
    id: 'VENCIMIENTOS',
    grupo: 'Control y seguimiento',
    nombre: 'Vencimientos',
    descripcion: 'Control preventivo de vigencias',
    icon: CalendarClock,
    component: Vencimientos,
    roles: RESPONSABLES
  },
  {
    id: 'EXPEDIENTES',
    grupo: 'Administración',
    nombre: 'Expedientes individuales',
    descripcion: 'Ficha completa del colaborador',
    icon: FolderOpen,
    component: ExpedienteColaborador,
    roles: [JEFE]
  },
  {
    id: 'CREDENCIALES_QR',
    grupo: 'Administración',
    nombre: 'Credenciales QR',
    descripcion: 'Generación, impresión y revocación',
    icon: QrCode,
    component: CredencialesQR,
    roles: [JEFE]
  },
  {
    id: 'GESTION_USUARIOS',
    grupo: 'Administración',
    nombre: 'Gestión de usuarios',
    descripcion: 'Perfiles y vigencia de accesos',
    icon: Settings,
    component: GestionUsuarios,
    roles: [JEFE]
  }
];

// ==========================================
// CONSULTAS PAGINADAS
// ==========================================

async function consultarPaginas(builder) {
  const registros = [];
  const pageSize = 200;

  for (
    let offset = 0;
    ;
    offset += pageSize
  ) {
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

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function Capacitacion({
  onBack
}) {

  const [client] = useState(crearCliente);

  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [roleError, setRoleError] = useState('');

  const [activeView, setActiveView] =
    useState('DASHBOARD');

  const [unread, setUnread] = useState(null);

  const [showMenu, setShowMenu] =
    useState(true);

  const userId =
    session?.user?.id || null;

  // ==========================================
  // CONTROL DE SESIÓN
  // ==========================================

  useEffect(() => {
    if (!client) {
      setAuthLoading(false);
      return;
    }

    let cancelled = false;
    let authEventReceived = false;

    const { data: listener } =
      client.auth.onAuthStateChange(
        (event, newSession) => {
          if (cancelled) return;

          authEventReceived = true;

          setSession(newSession || null);
          setAuthLoading(false);

          if (!newSession) {
            setRole(null);
            setUnread(null);
            setActiveView('DASHBOARD');
          }
        }
      );

    client.auth.getSession()
      .then(({ data, error }) => {
        if (cancelled || authEventReceived) return;

        if (error) {
          setError('No se pudo recuperar la sesión.');
        }

        setSession(data?.session || null);
        setAuthLoading(false);
      })
      .catch(() => {
        if (!cancelled && !authEventReceived) {
          setAuthLoading(false);
          setError('No se pudo verificar la sesión.');
        }
      });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };

  }, [client]);

  // ==========================================
  // VALIDAR PERFIL VIGENTE
  // ==========================================

  useEffect(() => {
    setRole(null);
    setRoleError('');
    setUnread(null);
    setActiveView('DASHBOARD');

    if (!client || !userId) {
      setRoleLoading(false);
      return;
    }

    let cancelled = false;
    let checking = false;

    setRoleLoading(true);

    async function consultarRol() {
      if (checking || cancelled) return;

      checking = true;

      try {
        const { data, error } =
          await client.rpc('cap_rol_actual');

        if (cancelled) return;

        if (error) {
          throw error;
        }

        if (!TODOS.includes(data)) {
          setRole(null);

          setRoleError(
            'Tu usuario no tiene un perfil de capacitación vigente.'
          );

          return;
        }

        setRole(data);
        setRoleError('');

      } catch {
        if (!cancelled) {
          setRole(null);

          setRoleError(
            'No fue posible verificar tus permisos de acceso.'
          );
        }

      } finally {
        checking = false;

        if (!cancelled) {
          setRoleLoading(false);
        }
      }
    }

    consultarRol();

    const interval = window.setInterval(
      consultarRol,
      60000
    );

    const alRegresar = () => {
      if (document.visibilityState === 'visible') {
        consultarRol();
      }
    };

    document.addEventListener(
      'visibilitychange',
      alRegresar
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);

      document.removeEventListener(
        'visibilitychange',
        alRegresar
      );
    };

  }, [client, userId]);

  // ==========================================
  // CONTADOR DE NOTIFICACIONES
  // ==========================================

  useEffect(() => {
    setUnread(null);

    if (!client || !role || !userId) return;

    let cancelled = false;
    let checking = false;

    async function consultarNotificaciones() {
      if (checking || cancelled) return;

      checking = true;

      try {
        const [
          notificaciones,
          lecturas
        ] = await Promise.all([

          consultarPaginas(() =>
            client
              .from('cap_notificaciones')
              .select('id')
              .eq('rol_destinatario', role)
              .eq('activa', true)
              .order('id')
          ),

          consultarPaginas(() =>
            client
              .from('cap_notificaciones_lecturas')
              .select('notificacion_id')
              .eq('usuario_id', userId)
              .order('notificacion_id')
          )

        ]);

        const leidas = new Set(
          lecturas.map(l => l.notificacion_id)
        );

        const pendientes = notificaciones.filter(
          n => !leidas.has(n.id)
        ).length;

        if (!cancelled) {
          setUnread(pendientes);
        }

      } catch {
        if (!cancelled) {
          setUnread(null);
        }

      } finally {
        checking = false;
      }
    }

    consultarNotificaciones();

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        consultarNotificaciones();
      }
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };

  }, [client, role, userId, activeView]);

  // ==========================================
  // INICIAR SESIÓN
  // ==========================================

  async function iniciarSesion(event) {
    event.preventDefault();

    if (
      !client ||
      busy ||
      !email.trim() ||
      !password
    ) return;

    setBusy(true);
    setError('');
    setRoleError('');

    try {
      const { error } =
        await client.auth.signInWithPassword({
          email: email.trim(),
          password
        });

      if (error) {
        throw error;
      }

      setActiveView('DASHBOARD');
      setPassword('');

    } catch {
      setError(
        'No fue posible iniciar sesión. Verifica tus credenciales.'
      );

    } finally {
      setBusy(false);
    }
  }

  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  async function cerrarSesion() {
    if (!client || busy) return false;

    setBusy(true);
    setError('');

    try {
      const { error } =
        await client.auth.signOut({
          scope: 'local'
        });

      if (error) throw error;

      setSession(null);
      setRole(null);
      setUnread(null);
      setEmail('');
      setPassword('');
      setRoleError('');
      setActiveView('DASHBOARD');

      return true;

    } catch {
      setError(
        'No fue posible cerrar sesión. Intenta nuevamente.'
      );

      return false;

    } finally {
      setBusy(false);
    }
  }

  async function regresar() {
    if (
      typeof onBack !== 'function' ||
      busy
    ) return;

    if (session) {
      const confirmar = window.confirm(
        '¿Regresar a GDR y cerrar la sesión de capacitación?'
      );

      if (!confirmar) return;

      const cerrado = await cerrarSesion();

      if (!cerrado) return;
    }

    onBack();
  }

  // ==========================================
  // NAVEGACIÓN SEGÚN PERFIL
  // ==========================================

  const modulosPermitidos =
    MODULOS.filter(m =>
      m.roles.includes(role)
    );

  const grupos = [
    ...new Set(
      modulosPermitidos.map(m => m.grupo)
    )
  ];

  const moduloActual =
    modulosPermitidos.find(
      m => m.id === activeView
    ) ||
    modulosPermitidos.find(
      m => m.id === 'DASHBOARD'
    );

  const ActiveComponent =
    moduloActual?.component;

  const navegar = useCallback((id) => {
    const permitido = MODULOS.some(m =>
      m.id === id &&
      m.roles.includes(role)
    );

    if (!permitido) return;

    setActiveView(id);

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

  }, [role]);

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <section className="cap-root">

      <header className="cap-header">

        <GraduationCap size={36} />

        <div style={{ flex: 1 }}>
          <h1>
            Gestión de capacitación
          </h1>

          <p>
            TRANSMETAL · Competencias y autorizaciones
          </p>
        </div>

        {typeof onBack === 'function' && (
          <button
            type="button"
            className="cap-secondary"
            disabled={busy}
            onClick={regresar}
          >
            <ArrowLeft size={17} />
            Volver a GDR
          </button>
        )}

      </header>

      {!client && (
        <div className="cap-error" role="alert">
          No se encontraron las variables de
          configuración de Supabase.
        </div>
      )}

      {error && (
        <div className="cap-error" role="alert">
          {error}
        </div>
      )}

      {/* VERIFICANDO SESIÓN */}

      {client && authLoading && (
        <div className="cap-panel cap-welcome">
          <RefreshCw size={36} />
          <h2>Verificando sesión</h2>
        </div>
      )}

      {/* INICIO DE SESIÓN */}

      {client &&
       !authLoading &&
       !session && (

        <form
          className="cap-panel cap-login"
          onSubmit={iniciarSesion}
        >

          <GraduationCap
            size={45}
            color="#164b83"
          />

          <h2>Acceso a capacitación</h2>

          <p className="cap-muted">
            Ingresa con tu cuenta autorizada
            de Supabase.
          </p>

          <div className="cap-field">

            <label htmlFor="cap-login-email">
              Correo electrónico
            </label>

            <input
              id="cap-login-email"
              type="email"
              value={email}
              required
              disabled={busy}
              autoComplete="username"
              onChange={e =>
                setEmail(e.target.value)
              }
            />

          </div>

          <div className="cap-field">

            <label htmlFor="cap-login-password">
              Contraseña
            </label>

            <input
              id="cap-login-password"
              type="password"
              value={password}
              required
              disabled={busy}
              autoComplete="current-password"
              onChange={e =>
                setPassword(e.target.value)
              }
            />

          </div>

          <button
            type="submit"
            className="cap-primary"
            disabled={
              busy ||
              !email.trim() ||
              !password
            }
          >
            <LogIn size={18} />

            {busy
              ? 'Ingresando...'
              : 'Iniciar sesión'}
          </button>

        </form>
      )}

      {/* SESIÓN INICIADA */}

      {session && !authLoading && (

        <>

          <div className="cap-panel cap-toolbar">

            <div>
              <strong>
                {ROLES[role] ||
                  'Validando permisos'}
              </strong>

              <div className="cap-muted">
                {session.user.email}
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8
            }}>

              {role && (
                <button
                  type="button"
                  className="cap-secondary"
                  onClick={() =>
                    navegar('NOTIFICACIONES')
                  }
                >
                  <Bell size={18} />

                  Notificaciones

                  {unread !== null &&
                   unread > 0 && (

                    <span style={{
                      background: '#dc2626',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: 12
                    }}>
                      {unread > 99
                        ? '99+'
                        : unread}
                    </span>

                  )}

                </button>
              )}

              <button
                type="button"
                className="cap-secondary"
                disabled={busy}
                onClick={cerrarSesion}
              >
                <LogOut size={17} />
                Cerrar sesión
              </button>

            </div>
          </div>

          {roleLoading && (
            <div className="cap-panel cap-welcome">
              <RefreshCw size={35} />
              <h2>Verificando perfil</h2>
            </div>
          )}

          {!roleLoading && !role && (
            <div className="cap-panel cap-welcome">

              <Lock size={45} color="#b91c1c" />

              <h2>Acceso restringido</h2>

              <p>
                {roleError ||
                  'No existe un perfil autorizado.'}
              </p>

              <p className="cap-muted">
                Contacta al administrador del
                sistema de capacitación.
              </p>

            </div>
          )}

          {/* MENÚ Y COMPONENTES */}

          {!roleLoading && role && (

            <>

              <div className="cap-panel cap-toolbar">

                <button
                  type="button"
                  className="cap-secondary"
                  aria-expanded={showMenu}
                  onClick={() =>
                    setShowMenu(previous => !previous)
                  }
                >
                  <Grid3X3 size={17} />

                  {showMenu
                    ? 'Ocultar menú'
                    : 'Mostrar menú'}
                </button>

                <button
                  type="button"
                  className="cap-secondary"
                  onClick={() =>
                    navegar('DASHBOARD')
                  }
                >
                  <LayoutDashboard size={17} />
                  Dashboard
                </button>

              </div>

              {showMenu && grupos.map(grupo => (

                <div
                  key={grupo}
                  className="cap-panel"
                >

                  <h3 style={{
                    color: '#64748b',
                    fontSize: 12,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase'
                  }}>
                    {grupo}
                  </h3>

                  <div className="cap-menu">

                    {modulosPermitidos
                      .filter(m => m.grupo === grupo)
                      .map(m => {

                        const Icon = m.icon;

                        return (
                          <button
                            type="button"
                            key={m.id}
                            className={
                              moduloActual?.id === m.id
                                ? 'cap-tile cap-selected'
                                : 'cap-tile'
                            }
                            aria-pressed={
                              moduloActual?.id === m.id
                            }
                            onClick={() =>
                              navegar(m.id)
                            }
                          >

                            <Icon size={25} />

                            <strong>
                              {m.nombre}

                              {m.id === 'NOTIFICACIONES' &&
                               unread > 0 && (
                                <span style={{
                                  color: '#b91c1c'
                                }}>
                                  {' '}({unread})
                                </span>
                              )}
                            </strong>

                            <span>
                              {m.descripcion}
                            </span>

                          </button>
                        );
                      })}

                  </div>

                </div>

              ))}

              {ActiveComponent && (
                <div style={{
                  minWidth: 0,
                  marginTop: 20
                }}>

                  <ActiveComponent
                    key={
                      `${userId}-${role}-${moduloActual.id}`
                    }
                    client={client}
                    role={role}
                    onNavigate={navegar}
                  />

                </div>
              )}

            </>
          )}

        </>
      )}

      <footer style={{
        textAlign: 'center',
        color: '#64748b',
        fontSize: 11,
        padding: '24px 10px'
      }}>
        TRANSMETAL · Sistema de gestión de capacitación
      </footer>

    </section>
  );
}
