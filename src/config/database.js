const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

class SupabaseService {
  constructor() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('Faltan variables de entorno de Supabase');
    }

    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: process.env.DB_SCHEMA || 'public'
        }
      }
    );

    logger.info('✅ Conexión a Supabase establecida');
  }

  getClient() {
    return this.supabase;
  }

  // Método para verificar la conexión
  async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('count(*)')
        .limit(1);
      
      if (error) throw error;
      
      logger.info('✅ Conexión a base de datos verificada');
      return true;
    } catch (error) {
      logger.error('❌ Error conectando a la base de datos:', error.message);
      return false;
    }
  }
}

module.exports = new SupabaseService();