
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  GraduationCap,
  LogIn,
  LogOut,
  RefreshCw,
  Factory,
  ShieldCheck,
  Users,
  CalendarClock,
  Search
} from 'lucide-react';

import './capacitacion.css';

// ==========================================
// CONFIGURACIÓN DE PERFILES
// ==========================================

const roles = {
  JEFE_PRODUCCION: 'Jefe de producción',
  ING_PROCESOS: 'Ingeniero de procesos',
  GESTOR_RC: 'Gestor RC',
  CONSULTA: 'Consulta'
};

// ==========================================
// CONSULTAS DISPONIBLES
// ==========================================

const views = [
  {
    id: 'cap_matriz_maquinas',
    title: 'Matriz de máquinas',
    description: 'Competencias y autorizaciones por máquina',
    icon: Factory,
    columns: [
      ['colaborador', 'Colaborador'],
      ['puesto', 'Puesto'],
      ['maquina', 'Máquina'],
      ['estado', 'Estado']
    ]
  },
  {
    id: 'cap_matriz_rc',
    title: 'Matriz de riesgos críticos',
    description: 'Cumplimiento de requisitos de seguridad',
    icon: ShieldCheck,
    columns: [
      ['colaborador', 'Colaborador'],
      ['puesto', 'Puesto'],
      ['riesgo_critico', 'Riesgo crítico'],
      ['estado', 'Estado']
    ]
  },
  {
    id: 'cap_polivalencia_maquinas',
    title: 'Polivalencia',
    description: 'Cobertura de operadores autorizados',
    icon: Users,
    columns: [
      ['maquina', 'Máquina'],
      ['minimo_operadores', 'Mínimo requerido'],
      ['operadores_autorizados', 'Autorizados'],
      ['operadores_pendientes', 'Pendientes'],
      ['brecha', 'Brecha'],
      ['estado', 'Estado']
    ]
  },
  {
    id: 'cap_consultar_vencimientos',
    title: 'Vencimientos',
    description: 'Control de requisitos y certificaciones',
    icon: CalendarClock,
    columns: [
      ['colaborador', 'Colaborador'],
      ['riesgo_critico', 'Riesgo crítico'],
      ['requisito', 'Requisito'],
      ['fecha_vencimiento', 'Vencimiento'],
      ['dias_restantes', 'Días restantes'],
      ['estado_vencimiento', 'Estado']
    ]
  }
];

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function Capacitacion() {

  const [client] = useState(() =>
    createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          storageKey: 'gdr-cap-auth',
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    )
  );

  // Autenticación

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);

  // Estados de interfaz

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [reload, setReload] = useState(0);

  // ==========================================
  // CONTROL DE SESIÓN
  // ==========================================

  useEffect(() => {

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      }
    );

    return () => {
      subscription.unsubscribe();
      client.auth.stopAutoRefresh();
    };

  }, [client]);

  const userId = session?.user?.id;

  // ==========================================
  // IDENTIFICACIÓN DEL PERFIL
  // ==========================================

  useEffect(() => {

    let alive = true;

    setRole(null);
    setRows([]);
    setView(null);

    if (!userId) return;

    setBusy(true);

    client.rpc('cap_rol_actual')
      .then(({ data, error }) => {

        if (!alive) return;

        if (
          error ||
          !Object.prototype.hasOwnProperty.call(
            roles, data
          )
        ) {
          setError(
            'El usuario no tiene un perfil activo de capacitación.'
          );
        } else {
          setRole(data);
          setError('');
        }

        setBusy(false);

      })
      .catch(() => {

        if (!alive) return;

        setError(
          'No se pudo verificar el perfil del usuario.'
        );

        setBusy(false);

      });

    return () => {
      alive = false;
    };

  }, [client, userId]);

  // ==========================================
  // CONSULTAS A SUPABASE
  // ==========================================

  useEffect(() => {

    let alive = true;

    setRows([]);
    setQuery('');

    if (!role || !view || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    client.rpc(view.id)
      .then(({ data, error }) => {

        if (!alive) return;

        if (error) {

          setError(
            'No se pudo realizar la consulta: ' +
            error.message
          );

        } else {

          setRows(
            Array.isArray(data) ? data : []
          );

        }

        setLoading(false);

      })
      .catch(() => {

        if (!alive) return;

        setError('Error de conexión con Supabase.');
        setLoading(false);

      });

    return () => {
      alive = false;
    };

  }, [client, role, view, userId, reload]);

  // ==========================================
  // INICIAR SESIÓN
  // ==========================================

  async function login(e) {

    e.preventDefault();

    setBusy(true);
    setError('');

    try {

      const { data, error } =
        await client.auth.signInWithPassword({
          email: email.trim(),
          password
        });

      if (error) {

        setError(
          'Correo electrónico o contraseña incorrectos.'
        );

      } else {

        setSession(data.session);

      }

    } catch {

      setError(
        'No fue posible conectar con Supabase.'
      );

    } finally {

      setPassword('');
      setBusy(false);

    }

  }

  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  async function logout() {

    setError('');
    setRows([]);
    setView(null);
    setRole(null);
    setBusy(true);

    try {

      const { error } =
        await client.auth.signOut({
          scope: 'local'
        });

      if (error) throw error;

      setSession(null);

    } catch {

      setError(
        'No se pudo cerrar la sesión. Intenta nuevamente.'
      );

    } finally {

      setBusy(false);

    }

  }

  // ==========================================
  // BÚSQUEDA DE REGISTROS
  // ==========================================

  const filtered = rows.filter(row => {

    if (!query) return true;

    return view?.columns.some(([key]) =>
      String(row[key] ?? '')
        .toLocaleLowerCase('es')
        .includes(
          query.toLocaleLowerCase('es')
        )
    );

  });

  // ==========================================
  // FORMATO DE ESTADOS
  // ==========================================

  function formatValue(value) {

    if (value === null || value === undefined) {
      return '—';
    }

    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }

    return String(value);

  }

  function statusClass(value) {

    switch (value) {

      case 'AUTORIZADO':
      case 'AUTORIZADA':
      case 'VIGENTE':
      case 'CAPACITADO':
      case 'CUMPLE':
        return 'cap-status cap-status-success';

      case 'PROXIMO_A_VENCER':
      case 'PENDIENTE_VOBO':
      case 'PENDIENTE':
      case 'REQUISITOS_PENDIENTES':
        return 'cap-status cap-status-warning';

      case 'VENCIDO':
      case 'CRITICO':
      case 'SUSPENDIDO':
      case 'REVOCADO':
      case 'NO_AUTORIZADO':
      case 'REQUISITOS_INCOMPLETOS':
      case 'CERTIFICACION_NO_VALIDA':
        return 'cap-status cap-status-danger';

      default:
        return 'cap-status cap-status-neutral';

    }

  }

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (

    <section className="cap-root">

      <header className="cap-header">

        <GraduationCap size={36} />

        <h1>Gestión de capacitación</h1>

        <p>
          TRANSMETAL · Competencias y autorizaciones
        </p>

      </header>

      {error && (
        <div role="alert" className="cap-error">
          {error}
        </div>
      )}

      {!session ? (

        /* FORMULARIO DE ACCESO */

        <form
          className="cap-panel cap-login"
          onSubmit={login}
        >

          <h2>Acceso al módulo</h2>

          <p>
            Ingresa con tu usuario autorizado de capacitación.
          </p>

          <label>

            Correo electrónico

            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Correo electrónico"
            />

          </label>

          <label>

            Contraseña

            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña"
            />

          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={busy}
          >

            <LogIn size={18} />

            {busy ? 'Ingresando...' : 'Iniciar sesión'}

          </button>

        </form>

      ) : (

        <>

          {/* INFORMACIÓN DEL USUARIO */}

          <div className="cap-panel cap-toolbar">

            <div>

              <strong>
                {
                  roles[role] ||
                  (
                    busy
                      ? 'Verificando perfil...'
                      : 'Perfil no disponible'
                  )
                }
              </strong>

              <div className="cap-muted">
                {session.user.email}
              </div>

            </div>

            <button
              className="cap-secondary"
              disabled={busy}
              onClick={logout}
            >

              <LogOut size={16} />

              Cerrar sesión

            </button>

          </div>

          {role && (

            <>

              {/* MENÚ DE CAPACITACIÓN */}

              <div className="cap-menu">

                {views
                  .filter(item =>
                    item.id !==
                      'cap_consultar_vencimientos' ||
                    role !== 'CONSULTA'
                  )
                  .map(item => {

                    const Icon = item.icon;

                    return (

                      <button
                        key={item.id}
                        className={
                          view === item
                            ? 'cap-tile cap-selected'
                            : 'cap-tile'
                        }
                        onClick={() => setView(item)}
                      >

                        <Icon size={26} />

                        <strong>
                          {item.title}
                        </strong>

                        <span>
                          {item.description}
                        </span>

                      </button>

                    );

                  })}

              </div>

              {/* CONTENIDO DEL MÓDULO */}

              {view ? (

                <div className="cap-panel">

                  <div className="cap-toolbar">

                    <h2>{view.title}</h2>

                    <button
                      className="cap-secondary"
                      disabled={loading}
                      onClick={() =>
                        setReload(n => n + 1)
                      }
                    >

                      <RefreshCw size={16} />

                      Actualizar

                    </button>

                  </div>

                  {/* BUSCADOR */}

                  <div className="cap-search">

                    <Search size={18} />

                    <input
                      value={query}
                      onChange={e =>
                        setQuery(e.target.value)
                      }
                      placeholder="Buscar registros..."
                    />

                  </div>

                  {view.id ===
                    'cap_consultar_vencimientos' && (

                    <p className="cap-muted">

                      La certificación adicional es opcional
                      y no condiciona la autorización
                      operativa.

                    </p>

                  )}

                  {loading ? (

                    <p role="status">
                      Cargando información...
                    </p>

                  ) : (

                    <>

                      <p className="cap-muted">

                        {filtered.length} registros

                      </p>

                      <div className="cap-table-wrap">

                        <table>

                          <thead>

                            <tr>

                              {view.columns.map(
                                ([key, label]) => (

                                  <th key={key}>
                                    {label}
                                  </th>

                                )
                              )}

                            </tr>

                          </thead>

                          <tbody>

                            {filtered.map((row, index) => (

                              <tr key={index}>

                                {view.columns.map(
                                  ([key]) => (

                                    <td key={key}>

                                      {
                                        key === 'estado' ||
                                        key === 'estado_vencimiento'
                                          ? (

                                            <span
                                              className={
                                                statusClass(
                                                  row[key]
                                                )
                                              }
                                            >

                                              {formatValue(
                                                row[key]
                                              ).replaceAll('_', ' ')}

                                            </span>

                                          ) : (

                                            formatValue(row[key])

                                          )
                                      }

                                    </td>

                                  )
                                )}

                              </tr>

                            ))}

                            {filtered.length === 0 && (

                              <tr>

                                <td
                                  colSpan={view.columns.length}
                                  className="cap-empty"
                                >

                                  No hay registros disponibles.

                                </td>

                              </tr>

                            )}

                          </tbody>

                        </table>

                      </div>

                    </>

                  )}

                </div>

              ) : (

                <div className="cap-panel cap-welcome">

                  <GraduationCap size={48} />

                  <h2>
                    Sistema de gestión de competencias
                  </h2>

                  <p>

                    Selecciona un módulo para consultar
                    las capacitaciones, autorizaciones
                    y vencimientos de los colaboradores.

                  </p>

                </div>

              )}

            </>

          )}

        </>

      )}

    </section>

  );

}
