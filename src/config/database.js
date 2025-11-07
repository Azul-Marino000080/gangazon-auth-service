const { Pool } = require('pg');
const logger = require('../utils/logger');
const { parse } = require('pg-connection-string');
const dns = require('dns').promises;

// Validar variables de entorno requeridas
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

// Parsear el connection string
const config = parse(process.env.DATABASE_URL);

// Función para resolver solo IPv4
async function resolveIPv4(hostname) {
  try {
    const addresses = await dns.resolve4(hostname);
    if (addresses && addresses.length > 0) {
      logger.info(`✅ Resolviendo ${hostname} a IPv4: ${addresses[0]}`);
      return addresses[0];
    }
  } catch (error) {
    logger.warn(`⚠️  No se pudo resolver ${hostname} a IPv4, usando hostname original`);
  }
  return hostname;
}

// Crear pool después de resolver el host
let pool;

async function initializePool() {
  const host = await resolveIPv4(config.host);
  
  pool = new Pool({
    host: host,
    port: config.port || 5432,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    options: '-c search_path=auth_gangazon,public',
  });

  // Event handlers
  pool.on('connect', () => {
    logger.info('✅ Nueva conexión establecida al pool de PostgreSQL');
  });

  pool.on('error', (err) => {
    logger.error('❌ Error inesperado en el pool de PostgreSQL:', err);
  });

  return pool;
}

// Inicializar el pool
const poolPromise = initializePool();

// Función helper para queries
const query = async (text, params) => {
  const pool = await poolPromise;
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query ejecutada', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Error en query', { text, error: error.message });
    throw error;
  }
};

// Función para obtener un cliente para transacciones
const getClient = async () => {
  const pool = await poolPromise;
  const client = await pool.connect();
  const originalQuery = client.query;
  const originalRelease = client.release;
  
  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    logger.error('Cliente no liberado después de 5 segundos!');
  }, 5000);
  
  // Monkey patch the client.query method
  client.query = (...args) => {
    return originalQuery.apply(client, args);
  };
  
  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease.apply(client);
  };
  
  return client;
};

// Verificar conexión y esquema 'auth_gangazon'
const verifyConnection = async () => {
  try {
    await poolPromise; // Esperar a que el pool esté inicializado
    const result = await query('SELECT NOW(), current_schema()');
    logger.info('✅ Conexión a PostgreSQL/Supabase establecida correctamente');
    logger.info(`📂 Esquema activo: ${result.rows[0].current_schema}`);
    
    // Verificar que existe el esquema auth_gangazon
    const schemaCheck = await query("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth_gangazon'");
    if (schemaCheck.rows.length === 0) {
      logger.warn('⚠️  El esquema "auth_gangazon" no existe. Ejecuta schema_auth_supabase.sql primero');
    } else {
      logger.info('✅ Esquema "auth_gangazon" encontrado');
    }
    
    return true;
  } catch (error) {
    logger.error('❌ Error conectando a PostgreSQL/Supabase:', error);
    return false;
  }
};

// Verificar conexión al iniciar
verifyConnection();

// Cerrar pool cuando la aplicación termina
const closePool = async () => {
  const pool = await poolPromise;
  await pool.end();
  logger.info('Pool de PostgreSQL cerrado');
};

module.exports = {
  query,
  getClient,
  get pool() { return poolPromise; },
  verifyConnection,
  closePool
};
