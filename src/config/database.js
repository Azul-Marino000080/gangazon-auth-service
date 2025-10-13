const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Validar variables de entorno requeridas
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL no está definida en las variables de entorno');
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY no está definida en las variables de entorno');
}

// Crear cliente de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Verificar conexión
const verifyConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    logger.info('✅ Conexión a Supabase establecida correctamente');
    return true;
  } catch (error) {
    logger.error('❌ Error conectando a Supabase:', error);
    return false;
  }
};

// Verificar conexión al iniciar
verifyConnection();

module.exports = {
  createClient: () => supabase,
  verifyConnection
};
