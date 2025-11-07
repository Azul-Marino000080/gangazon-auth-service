const { Pool } = require('pg');
const logger = require('../utils/logger');
const dns = require('dns');

// Forzar resolución DNS a IPv4 únicamente (evita problemas con IPv6 en Render)
dns.setDefaultResultOrder('ipv4first');

// Validar variables de entorno requeridas
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

// Crear pool de conexiones a PostgreSQL con esquema 'auth_gangazon'
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase requiere SSL
  max: 20, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Aumentado a 10 segundos
  options: '-c search_path=auth_gangazon,public', // Priorizar esquema 'auth_gangazon' para todas las queries
});

// Event handlers
pool.on('connect', () => {
  logger.info('✅ Nueva conexión establecida al pool de PostgreSQL');
});

pool.on('error', (err) => {
  logger.error('❌ Error inesperado en el pool de PostgreSQL:', err);
});

// Función helper para queries
const query = async (text, params) => {
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
  await pool.end();
  logger.info('Pool de PostgreSQL cerrado');
};

module.exports = {
  query,
  getClient,
  pool,
  verifyConnection,
  closePool
};
