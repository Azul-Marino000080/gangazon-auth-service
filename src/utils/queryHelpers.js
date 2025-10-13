const { createClient } = require('../config/database');
const logger = require('./logger');

/**
 * Helper para construir y ejecutar queries con manejo de errores estándar
 */
async function executeQuery(queryBuilder, errorMessage) {
  const { data, error, count } = await queryBuilder;
  
  if (error) {
    logger.error(`${errorMessage}:`, error);
    throw new Error(errorMessage);
  }
  
  return { data, count };
}

/**
 * Helper para obtener un registro único
 */
async function getOne(table, filters, errorMessage = 'Registro no encontrado') {
  const supabase = createClient();
  let query = supabase.from(table).select('*');
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  const { data, error } = await query.single();
  
  if (error || !data) {
    throw new Error(errorMessage);
  }
  
  return data;
}

/**
 * Helper para paginación estándar
 */
function buildPaginatedQuery(table, { page = 1, limit = 20, select = '*' }) {
  const supabase = createClient();
  const offset = (page - 1) * limit;
  
  return supabase
    .from(table)
    .select(select, { count: 'exact' })
    .range(offset, offset + limit - 1);
}

/**
 * Helper para aplicar múltiples filtros a una query
 */
function applyFilters(query, filters) {
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query = query.eq(key, value);
    }
  });
  return query;
}

/**
 * Helper para crear registro de auditoría
 */
async function createAuditLog({ userId, applicationId = null, action, ipAddress, details = {} }) {
  const supabase = createClient();
  
  await supabase.from('audit_log').insert({
    user_id: userId,
    application_id: applicationId,
    action,
    ip_address: ipAddress,
    details
  });
}

/**
 * Helper para mapear datos de usuario
 */
function mapUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    isActive: user.is_active,
    franchise: user.franchise_id ? {
      id: user.franchise_id,
      name: user.franchise_name,
      code: user.franchise_code
    } : null,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

/**
 * Helper para respuesta paginada
 */
function paginatedResponse(data, count, page, limit) {
  return {
    data,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
}

/**
 * Helper para verificar existencia de registro
 */
async function checkExists(table, filters, customError = null) {
  const supabase = createClient();
  let query = supabase.from(table).select('id');
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  const { data } = await query.single();
  
  if (data && customError) {
    throw new Error(customError);
  }
  
  return !!data;
}

module.exports = {
  executeQuery,
  getOne,
  buildPaginatedQuery,
  applyFilters,
  createAuditLog,
  mapUser,
  paginatedResponse,
  checkExists
};
