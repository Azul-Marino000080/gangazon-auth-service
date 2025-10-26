const { Pool } = require('pg');
const logger = require('../utils/logger');

// Validar variables de entorno requeridas
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

// Crear pool de conexiones a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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

// Verificar conexión
const verifyConnection = async () => {
  try {
    const result = await query('SELECT NOW()');
    logger.info('✅ Conexión a PostgreSQL establecida correctamente');
    return true;
  } catch (error) {
    logger.error('❌ Error conectando a PostgreSQL:', error);
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
