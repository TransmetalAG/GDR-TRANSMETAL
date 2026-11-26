
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef
} from 'react';

import { createClient } from '@supabase/supabase-js';

import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Factory,
  User,
  Clock,
  RefreshCw,
  Search,
  CheckCircle,
  QrCode,
  AlertTriangle,
  WifiOff,
  Info
} from 'lucide-react';

import './capacitacion.css';

// ==========================================
// CONFIGURACIÓN
// ==========================================

const REFRESH_INTERVAL = 60000;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cliente independiente para consultas públicas.
// No utiliza la sesión administrativa de GDR.

function crearClientePublico() {

  const url = import.meta.env.VITE_SUPABASE_URL;

  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'gdr-cap-public-auth'
    }
  });

}

// ==========================================
// ESTADOS OPERATIVOS
// ==========================================

const ESTADOS = {

  AUTORIZADO: {
    label: 'Autorizado',
    color: '#166534',
    bg: '#dcfce7'
  },

  PROXIMO_A_VENCER: {
    label: 'Próximo a vencer',
    color: '#92400e',
    bg: '#fef3c7'
  },

  CRITICO: {
    label: 'Vencimiento crítico',
    color: '#9a3412',
    bg: '#ffedd5'
  },

  PENDIENTE_VOBO: {
    label: 'Pendiente de VoBo',
    color: '#92400e',
    bg: '#fef3c7'
  },

  REQUISITOS_PENDIENTES: {
    label: 'Requisitos pendientes',
    color: '#1d4ed8',
    bg: '#dbeafe'
  },

  CAPACITADO: {
    label: 'Capacitado, sin autorización',
    color: '#1d4ed8',
    bg: '#dbeafe'
  },

  REQUISITOS_INCOMPLETOS: {
    label: 'Requisitos incompletos',
    color: '#991b1b',
    bg: '#fee2e2'
  },

  VENCIDO: {
    label: 'Vencido',
    color: '#991b1b',
    bg: '#fee2e2'
  },

  SUSPENDIDO: {
    label: 'Suspendido',
    color: '#991b1b',
    bg: '#fee2e2'
  },

  REVOCADO: {
    label: 'Revocado',
    color: '#991b1b',
    bg: '#fee2e2'
  },

  DEVUELTO: {
    label: 'Pendiente de corrección',
    color: '#92400e',
    bg: '#fef3c7'
  },

  NO_AUTORIZADO: {
    label: 'No autorizado',
    color: '#991b1b',
    bg: '#fee2e2'
  },

  SIN_CAPACITACION: {
    label: 'Sin capacitación',
    color: '#475569',
    bg: '#f1f5f9'
  },

  SIN_AUTORIZACION: {
    label: 'Sin autorización',
    color: '#475569',
    bg: '#f1f5f9'
  },

  SIN_ASIGNACION: {
    label: 'Sin asignación',
    color: '#475569',
    bg: '#f1f5f9'
  },

  NO_APLICA: {
    label: 'No aplica',
    color: '#64748b',
    bg: '#f1f5f9'
  },

  NO_REQUIERE_AUTORIZACION: {
    label: 'No requiere autorización',
    color: '#64748b',
    bg: '#f1f5f9'
  },

  INACTIVO: {
    label: 'Inactivo',
    color: '#64748b',
    bg: '#f1f5f9'
  },

  NO_DISPONIBLE: {
    label: 'Información no disponible',
    color: '#64748b',
    bg: '#f1f5f9'
  }

};

const ROLES_NO_APLICABLES = [
  'NO_APLICA',
  'NO_REQUIERE_AUTORIZACION',
  'INACTIVO'
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

  return ESTADOS[value] ||
    ESTADOS.NO_DISPONIBLE;

}

function formatDate(value) {

  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-GT', {
    timeZone: 'America/Guatemala',
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(date);

}

function obtenerToken() {

  const params = new URLSearchParams(
    window.location.search
  );

  return String(
    params.get('cap_qr') || ''
  ).trim();

}

function esAplicable(registro) {

  return !ROLES_NO_APLICABLES.includes(
    registro.estado
  );

}

// El permiso operativo requiere confirmación
// explícita del backend y un estado compatible.

function estaAutorizado(registro, categoria) {

  if (registro.autorizado !== true) {
    return false;
  }

  if (categoria === 'MAQUINAS') {

    return registro.estado === 'AUTORIZADO';

  }

  return [
    'AUTORIZADO',
    'PROXIMO_A_VENCER',
    'CRITICO'
  ].includes(registro.estado);

}

// ==========================================
// NORMALIZAR RESPUESTA PÚBLICA
// ==========================================

function prepararExpediente(data) {

  if (!data || data.valido !== true) {
    return null;
  }

  // Admitir información de identidad en la raíz
  // o dentro de un objeto colaborador.

  const persona =
    data.colaborador &&
    typeof data.colaborador === 'object'

      ? data.colaborador

      : data;

  const nombre =
    typeof persona.nombre === 'string'

      ? persona.nombre.trim()

      : typeof data.colaborador === 'string'

        ? data.colaborador.trim()

        : '';

  if (!nombre) {

    throw new Error(
      'La identidad pública no está disponible.'
    );

  }

  // No interpretar una respuesta incompleta
  // como una consulta sin autorizaciones.

  if (
    !Array.isArray(data.maquinas) ||
    !Array.isArray(data.riesgos_criticos)
      && !Array.isArray(data.rc)
  ) {

    throw new Error(
      'La respuesta operativa está incompleta.'
    );

  }

  const riesgosData =
    data.riesgos_criticos || data.rc;

  function prepararRegistro(item, categoria) {

    const estadoOriginal = String(
      item?.estado || ''
    ).toUpperCase();

    const estado =
      Object.prototype.hasOwnProperty.call(
        ESTADOS,
        estadoOriginal
      )

        ? estadoOriginal

        : 'NO_DISPONIBLE';

    // Seleccionar exclusivamente campos públicos.
    // No conservar documentos, identificadores
    // internos, motivos o información médica.

    const registro = {

      codigo: String(item?.codigo || ''),

      nombre: String(
        item?.nombre || 'No identificado'
      ),

      abreviatura: String(
        item?.abreviatura || ''
      ),

      estado,

      autorizado: item?.autorizado === true

    };

    return {

      ...registro,

      autorizado: estaAutorizado(
        registro,
        categoria
      )

    };

  }

  return {

    nombre,

    puesto: String(
      persona.puesto || data.puesto || ''
    ),

    planta: String(
      persona.planta || data.planta || 'TRANSMETAL'
    ),

    fecha_consulta: data.fecha_consulta || null,

    maquinas: data.maquinas.map(item =>

      prepararRegistro(item, 'MAQUINAS')

    ),

    riesgos: riesgosData.map(item =>

      prepararRegistro(item, 'RC')

    )

  };

}

// ==========================================
// COMPONENTES VISUALES
// ==========================================

function TarjetaIndicador({
  icon: Icon,
  label,
  value,
  description,
  color = '#164b83'
}) {

  return (
    <div className="cap-kpi">

      <Icon size={23} color={color} />

      <div className="cap-kpi-label">
        {label}
      </div>

      <div
        className="cap-kpi-value"
        style={{ color }}
      >
        {value}
      </div>

      <div className="cap-kpi-description">
        {description}
      </div>

    </div>
  );

}

function TarjetaAutorizacion({ item }) {

  const config = getEstado(item.estado);

  const noAplica =
    ROLES_NO_APLICABLES.includes(
      item.estado
    );

  const autorizado =
    item.autorizado === true;

  const Icon = autorizado

    ? ShieldCheck

    : noAplica

      ? Info

      : ShieldX;

  const color = autorizado

    ? '#15803d'

    : noAplica

      ? '#64748b'

      : '#b91c1c';

  return (

    <article style={{
      padding: 16,
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderLeft: `4px solid ${color}`,
      borderRadius: 10,
      marginBottom: 10
    }}>

      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12
      }}>

        <Icon
          size={28}
          color={color}
          style={{ flexShrink: 0 }}
        />

        <div style={{
          flex: 1,
          minWidth: 0
        }}>

          <h3 style={{
            margin: '0 0 7px',
            color: '#164b83',
            fontSize: 15,
            overflowWrap: 'anywhere'
          }}>

            {item.nombre}

          </h3>

          {(item.codigo || item.abreviatura) && (

            <div className="cap-muted">

              {[
                item.codigo,
                item.abreviatura
              ].filter(Boolean).join(' · ')}

            </div>

          )}

          <div style={{
            marginTop: 8,
            fontWeight: 700,
            fontSize: 12,
            color
          }}>

            {autorizado

              ? 'AUTORIZADO'

              : noAplica

                ? 'NO APLICA / NO REQUERIDO'

                : 'SIN AUTORIZACIÓN'}

          </div>

          <span
            className="cap-status"
            style={{
              background: config.bg,
              color: config.color,
              marginTop: 8
            }}
          >

            {config.label}

          </span>

          {autorizado &&
           [
             'PROXIMO_A_VENCER',
             'CRITICO'
           ].includes(item.estado) && (

            <p style={{
              color: '#b45309',
              fontSize: 12,
              marginBottom: 0
            }}>

              Autorización vigente con alerta
              de vencimiento.

            </p>

          )}

        </div>

      </div>

    </article>

  );

}

function PantallaEstado({
  icon: Icon,
  title,
  description,
  color = '#164b83',
  onRetry,
  loading = false
}) {

  return (

    <div
      className="cap-panel cap-welcome"
      role={loading ? 'status' : 'alert'}
      style={{
        padding: '35px 20px',
        textAlign: 'center'
      }}
    >

      <Icon size={58} color={color} />

      <h2 style={{ color }}>
        {title}
      </h2>

      <p>{description}</p>

      {onRetry && (

        <button
          type="button"
          className="cap-primary"
          onClick={onRetry}
          disabled={loading}
        >

          <RefreshCw size={17} />

          Volver a consultar

        </button>

      )}

    </div>

  );

}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function ConsultaPublicaQR({
  token: tokenProp
}) {

  const [client] = useState(
    crearClientePublico
  );

  const token = String(
    tokenProp ?? obtenerToken()
  ).trim();

  const [expediente, setExpediente] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [estadoConsulta, setEstadoConsulta] =
    useState('CARGANDO');

  const [ultimaConsulta, setUltimaConsulta] =
    useState(null);

  const [tab, setTab] =
    useState('RC');

  const [search, setSearch] =
    useState('');

  const [filterEstado, setFilterEstado] =
    useState('TODOS');

  const requestRef = useRef(0);

  const loadingRef = useRef(false);

  // ==========================================
  // CONSULTAR EXPEDIENTE PÚBLICO
  // ==========================================

  const consultarExpediente = useCallback(
    async () => {

      if (loadingRef.current) {
        return;
      }

      const requestId =
        ++requestRef.current;

      // No conservar autorizaciones anteriores
      // mientras se valida nuevamente el QR.

      setExpediente(null);
      setUltimaConsulta(null);

      if (!UUID_REGEX.test(token)) {

        setEstadoConsulta('INVALIDO');
        setLoading(false);

        return;

      }

      if (!client) {

        setEstadoConsulta('ERROR');
        setLoading(false);

        return;

      }

      loadingRef.current = true;

      setLoading(true);
      setEstadoConsulta('CARGANDO');

      try {

        const { data, error } =
          await client.rpc(

            'cap_consultar_expediente_qr',

            {
              p_token: token
            }

          );

        if (
          requestRef.current !== requestId
        ) return;

        if (error) {

          throw new Error(
            'Consulta pública no disponible.'
          );

        }

        if (data?.valido === false) {

          setEstadoConsulta('INVALIDO');

          return;

        }

        if (data?.valido !== true) {

          throw new Error(
            'Respuesta pública no reconocida.'
          );

        }

        const resultado =
          prepararExpediente(data);

        if (!resultado) {

          setEstadoConsulta('INVALIDO');

          return;

        }

        setExpediente(resultado);

        setUltimaConsulta(new Date());

        setEstadoConsulta('VALIDO');

      } catch {

        if (
          requestRef.current !== requestId
        ) return;

        // No revelar errores SQL ni detalles
        // internos en una pantalla pública.

        setExpediente(null);

        setUltimaConsulta(null);

        setEstadoConsulta('ERROR');

      } finally {

        if (
          requestRef.current === requestId
        ) {

          loadingRef.current = false;

          setLoading(false);

        }

      }

    },
    [client, token]
  );

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  useEffect(() => {

    loadingRef.current = false;

    setExpediente(null);
    setUltimaConsulta(null);
    setTab('RC');
    setSearch('');
    setFilterEstado('TODOS');

    consultarExpediente();

    return () => {

      requestRef.current += 1;

      loadingRef.current = false;

    };

  }, [consultarExpediente]);

  // ==========================================
  // ACTUALIZACIÓN AUTOMÁTICA
  // ==========================================

  useEffect(() => {

    if (!UUID_REGEX.test(token) || !client) {
      return;
    }

    const actualizar = () => {

      if (
        document.visibilityState === 'visible'
      ) {

        consultarExpediente();

      }

    };

    const interval = window.setInterval(

      actualizar,

      REFRESH_INTERVAL

    );

    // Volver a verificar al regresar
    // a la pestaña o al recuperar conexión.

    document.addEventListener(
      'visibilitychange',
      actualizar
    );

    window.addEventListener(
      'online',
      actualizar
    );

    const sinConexion = () => {

      requestRef.current += 1;

      loadingRef.current = false;

      setExpediente(null);
      setUltimaConsulta(null);
      setLoading(false);
      setEstadoConsulta('ERROR');

    };

    window.addEventListener(
      'offline',
      sinConexion
    );

    return () => {

      window.clearInterval(interval);

      document.removeEventListener(
        'visibilitychange',
        actualizar
      );

      window.removeEventListener(
        'online',
        actualizar
      );

      window.removeEventListener(
        'offline',
        sinConexion
      );

    };

  }, [
    client,
    token,
    consultarExpediente
  ]);

  // ==========================================
  // INDICADORES
  // ==========================================

  const indicadores = useMemo(() => {

    const maquinas =
      expediente?.maquinas || [];

    const riesgos =
      expediente?.riesgos || [];

    return {

      maquinasTotal: maquinas.filter(
        esAplicable
      ).length,

      maquinasAutorizadas: maquinas.filter(

        m =>

          esAplicable(m) &&

          m.autorizado === true

      ).length,

      riesgosTotal: riesgos.filter(
        esAplicable
      ).length,

      riesgosAutorizados: riesgos.filter(

        r =>

          esAplicable(r) &&

          r.autorizado === true

      ).length,

      alertasVencimiento: riesgos.filter(

        r =>

          r.autorizado === true &&

          [
            'PROXIMO_A_VENCER',
            'CRITICO'
          ].includes(r.estado)

      ).length

    };

  }, [expediente]);

  // ==========================================
  // FILTROS
  // ==========================================

  const registros = tab === 'RC'

    ? expediente?.riesgos || []

    : expediente?.maquinas || [];

  const filtered = useMemo(() => {

    const term = normalize(search);

    return registros

      .filter(item => {

        if (
          filterEstado === 'AUTORIZADOS' &&
          item.autorizado !== true
        ) {

          return false;

        }

        if (
          filterEstado === 'NO_AUTORIZADOS' &&
          (
            item.autorizado === true ||
            !esAplicable(item)
          )
        ) {

          return false;

        }

        if (
          filterEstado === 'NO_APLICA' &&
          esAplicable(item)
        ) {

          return false;

        }

        if (!term) return true;

        return [

          item.nombre,

          item.codigo,

          item.abreviatura,

          getEstado(item.estado).label

        ].some(value =>

          normalize(value).includes(term)

        );

      })

      .sort((a, b) =>

        a.nombre.localeCompare(
          b.nombre,
          'es'
        )

      );

  }, [
    registros,
    search,
    filterEstado
  ]);

  function cambiarTab(value) {

    setTab(value);
    setSearch('');
    setFilterEstado('TODOS');

  }

  // ==========================================
  // INTERFAZ PÚBLICA
  // ==========================================

  return (

    <div
      className="cap-root"
      style={{
        minHeight: '100vh',
        background: '#f4f6f9',
        margin: 0,
        padding: 0
      }}
    >

      {/* ENCABEZADO CORPORATIVO */}

      <header style={{
        background: '#164b83',
        color: '#ffffff',
        padding: '28px 15px',
        textAlign: 'center'
      }}>

        <ShieldCheck size={47} />

        <h1 style={{
          fontSize: 27,
          margin: '10px 0 4px',
          color: '#ffffff',
          letterSpacing: 1
        }}>

          TRANSMETAL

        </h1>

        <p style={{
          fontSize: 12,
          margin: 0,
          letterSpacing: 1,
          color: '#dbeafe'
        }}>

          CONSULTA DE AUTORIZACIONES

        </p>

      </header>

      <main style={{
        width: '100%',
        maxWidth: 760,
        padding: 14,
        boxSizing: 'border-box',
        margin: '0 auto'
      }}>

        {/* ESTADO: CARGANDO */}

        {loading && (

          <PantallaEstado
            icon={RefreshCw}
            title="Verificando credencial"
            description={
              'Consultando el estado actualizado ' +
              'de las autorizaciones.'
            }
            loading
          />

        )}

        {/* ESTADO: QR INVÁLIDO */}

        {!loading &&
         estadoConsulta === 'INVALIDO' && (

          <PantallaEstado
            icon={ShieldX}
            title="Credencial no válida"
            description={
              'El código QR no permite consultar ' +
              'un expediente vigente. Solicita su ' +
              'verificación al jefe de producción.'
            }
            color="#b91c1c"
            onRetry={
              UUID_REGEX.test(token)

                ? consultarExpediente

                : undefined
            }
          />

        )}

        {/* ESTADO: ERROR DE CONSULTA */}

        {!loading &&
         estadoConsulta === 'ERROR' && (

          <>

            <PantallaEstado
              icon={WifiOff}
              title="Consulta no disponible"
              description={
                'No fue posible verificar las ' +
                'autorizaciones. Comprueba tu ' +
                'conexión e intenta nuevamente.'
              }
              color="#b45309"
              onRetry={consultarExpediente}
            />

            <div className="cap-alert-warning">

              <AlertTriangle size={20} />

              {' '}

              No se ha podido confirmar
              la autorización operativa.

              No utilices esta consulta como
              evidencia de autorización.

            </div>

          </>

        )}

        {/* ESTADO: EXPEDIENTE VÁLIDO */}

        {!loading &&
         estadoConsulta === 'VALIDO' &&
         expediente && (

          <>

            {/* IDENTIFICACIÓN */}

            <div className="cap-panel">

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#15803d',
                fontWeight: 700,
                fontSize: 13,
                marginBottom: 18
              }}>

                <CheckCircle size={20} />

                CREDENCIAL VÁLIDA

              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 15
              }}>

                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>

                  <User
                    size={36}
                    color="#164b83"
                  />

                </div>

                <div style={{
                  flex: 1,
                  minWidth: 0
                }}>

                  <h2 style={{
                    fontSize: 19,
                    color: '#164b83',
                    margin: '0 0 5px',
                    overflowWrap: 'anywhere'
                  }}>

                    {expediente.nombre}

                  </h2>

                  <div className="cap-muted">

                    {expediente.puesto || '—'}

                  </div>

                  <div className="cap-muted">

                    Planta: {expediente.planta}

                  </div>

                </div>

              </div>

              <div style={{
                marginTop: 18,
                paddingTop: 15,
                borderTop: '1px solid #e2e8f0'
              }}>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 11,
                  color: '#64748b'
                }}>

                  <Clock size={14} />

                  Última verificación:

                  {' '}

                  {formatDate(ultimaConsulta)}

                </div>

                <button
                  type="button"
                  className="cap-secondary"
                  style={{
                    width: '100%',
                    marginTop: 12
                  }}
                  onClick={consultarExpediente}
                >

                  <RefreshCw size={16} />

                  Actualizar autorizaciones

                </button>

              </div>

            </div>

            {/* INDICADORES */}

            <div style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(2, minmax(0, 1fr))',
              gap: 10,
              margin: '14px 0'
            }}>

              <TarjetaIndicador
                icon={Factory}
                label="Máquinas autorizadas"
                value={
                  `${indicadores.maquinasAutorizadas}/` +
                  `${indicadores.maquinasTotal}`
                }
                color="#15803d"
                description="Equipos aplicables consultados"
              />

              <TarjetaIndicador
                icon={ShieldCheck}
                label="RC autorizados"
                value={
                  `${indicadores.riesgosAutorizados}/` +
                  `${indicadores.riesgosTotal}`
                }
                color="#15803d"
                description="Riesgos aplicables consultados"
              />

            </div>

            {/* ALERTAS DE VENCIMIENTO */}

            {indicadores.alertasVencimiento > 0 && (

              <div className="cap-alert-warning">

                <Clock size={18} />

                {' '}

                {indicadores.alertasVencimiento}

                {' autorizaciones RC vigentes '}

                presentan alertas de vencimiento.

              </div>

            )}

            {/* ACLARACIÓN OPERATIVA */}

            <div className="cap-alert-info">

              <Info size={18} />

              {' '}

              Una credencial válida no significa
              que el colaborador esté autorizado
              para todas las actividades.

              Verifica cada máquina y riesgo
              crítico individualmente.

            </div>

            {/* PESTAÑAS */}

            <div style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(2, minmax(0, 1fr))',
              gap: 8,
              margin: '16px 0'
            }}>

              <button
                type="button"
                className={
                  tab === 'RC'
                    ? 'cap-primary'
                    : 'cap-secondary'
                }
                aria-pressed={tab === 'RC'}
                onClick={() =>
                  cambiarTab('RC')
                }
              >

                <ShieldCheck size={17} />

                Riesgos críticos

              </button>

              <button
                type="button"
                className={
                  tab === 'MAQUINAS'
                    ? 'cap-primary'
                    : 'cap-secondary'
                }
                aria-pressed={
                  tab === 'MAQUINAS'
                }
                onClick={() =>
                  cambiarTab('MAQUINAS')
                }
              >

                <Factory size={17} />

                Máquinas

              </button>

            </div>

            {/* FILTROS */}

            <div className="cap-panel">

              <h2 style={{ fontSize: 17 }}>

                {tab === 'RC'

                  ? 'Autorizaciones de riesgos críticos'

                  : 'Autorizaciones de máquinas'}

              </h2>

              <div className="cap-search">

                <Search size={17} />

                <input
                  value={search}
                  placeholder={
                    tab === 'RC'

                      ? 'Buscar riesgo crítico...'

                      : 'Buscar máquina...'
                  }
                  aria-label="Buscar autorización"
                  onChange={e =>
                    setSearch(e.target.value)
                  }
                />

              </div>

              <div className="cap-field">

                <label htmlFor="cap-public-filter">

                  Estado de autorización

                </label>

                <select
                  id="cap-public-filter"
                  value={filterEstado}
                  onChange={e =>
                    setFilterEstado(
                      e.target.value
                    )
                  }
                >

                  <option value="TODOS">

                    Todos los estados

                  </option>

                  <option value="AUTORIZADOS">

                    Solo autorizados

                  </option>

                  <option value="NO_AUTORIZADOS">

                    Sin autorización

                  </option>

                  <option value="NO_APLICA">

                    No aplicables / no requeridos

                  </option>

                </select>

              </div>

              <p className="cap-muted">

                {filtered.length}

                {' de '}

                {registros.length}

                {' registros'}

              </p>

            </div>

            {/* TARJETAS OPERATIVAS */}

            {filtered.map((item, index) => (

              <TarjetaAutorizacion
                key={
                  `${item.codigo}-${index}`
                }
                item={item}
              />

            ))}

            {!filtered.length && (

              <div className="cap-panel cap-welcome">

                <Search size={35} />

                <h3>

                  No se encontraron registros

                </h3>

                <p>

                  Modifica los filtros o actualiza
                  la información.

                </p>

              </div>

            )}

            {/* AVISO DE SEGURIDAD */}

            <div
              className="cap-panel"
              style={{ marginTop: 20 }}
            >

              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10
              }}>

                <ShieldAlert
                  size={23}
                  color="#164b83"
                  style={{ flexShrink: 0 }}
                />

                <div>

                  <strong>

                    Información de seguridad

                  </strong>

                  <p
                    className="cap-muted"
                    style={{ lineHeight: 1.6 }}
                  >

                    Esta consulta informa el estado
                    de las autorizaciones registradas
                    en el sistema de capacitación.

                    No sustituye el permiso de trabajo,
                    el análisis de riesgos, los controles
                    operacionales ni los procedimientos
                    de seguridad establecidos.

                  </p>

                  <p className="cap-muted">

                    La información se verifica
                    automáticamente cada 60 segundos
                    mientras la pantalla está visible.

                  </p>

                </div>

              </div>

            </div>

          </>

        )}

      </main>

      {/* PIE CORPORATIVO */}

      <footer style={{
        background: '#164b83',
        color: '#ffffff',
        textAlign: 'center',
        padding: 20,
        marginTop: 15
      }}>

        <QrCode size={25} />

        <p style={{
          fontSize: 12,
          fontWeight: 700,
          margin: '8px 0'
        }}>

          TRANSMETAL

        </p>

        <p style={{
          fontSize: 10,
          margin: 0,
          color: '#dbeafe'
        }}>

          SEGURIDAD · COMPETENCIA · AUTORIZACIÓN

        </p>

        <p style={{
          fontSize: 10,
          marginBottom: 0,
          color: '#dbeafe'
        }}>

          Sistema de gestión de capacitación

        </p>

      </footer>

    </div>

  );

}
