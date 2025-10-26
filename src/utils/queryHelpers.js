const { query } = require('../config/database');
const logger = require('./logger');

/**
 * Helper para obtener un registro único
 */
async function getOne(table, filters, errorMessage = 'Registro no encontrado') {
  const whereClauses = [];
  const values = [];
  let paramIndex = 1;
  
  Object.entries(filters).forEach(([key, value]) => {
    whereClauses.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  });
  
  const sql = `SELECT * FROM ${table} WHERE ${whereClauses.join(' AND ')} LIMIT 1`;
  const result = await query(sql, values);
  
  if (result.rows.length === 0) {
    throw new Error(errorMessage);
  }
  
  return result.rows[0];
}

/**
 * Helper para paginación estándar
 */
async function getPaginated(table, { page = 1, limit = 20, select = '*', filters = {}, orderBy = 'created_at DESC' }) {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const values = [];
  let paramIndex = 1;
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      whereClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  });
  
  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  // Query para datos
  const dataSql = `
    SELECT ${select} 
    FROM ${table} 
    ${whereClause} 
    ORDER BY ${orderBy} 
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  // Query para contar total
  const countSql = `SELECT COUNT(*) as total FROM ${table} ${whereClause}`;
  
  const [dataResult, countResult] = await Promise.all([
    query(dataSql, [...values, limit, offset]),
    query(countSql, values)
  ]);
  
  return {
    data: dataResult.rows,
    count: parseInt(countResult.rows[0].total)
  };
}

/**
 * Helper para crear registro de auditoría
 */
async function createAuditLog({ userId, applicationId = null, action, ipAddress, details = {} }) {
  const sql = `
    INSERT INTO audit_log (user_id, application_id, action, ip_address, details)
    VALUES ($1, $2, $3, $4, $5)
  `;
  
  await query(sql, [userId, applicationId, action, ipAddress, JSON.stringify(details)]);
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
  const whereClauses = [];
  const values = [];
  let paramIndex = 1;
  
  Object.entries(filters).forEach(([key, value]) => {
    whereClauses.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  });
  
  const sql = `SELECT id FROM ${table} WHERE ${whereClauses.join(' AND ')} LIMIT 1`;
  const result = await query(sql, values);
  
  if (result.rows.length > 0 && customError) {
    throw new Error(customError);
  }
  
  return result.rows.length > 0;
}

module.exports = {
  getOne,
  getPaginated,
  createAuditLog,
  mapUser,
  paginatedResponse,
  checkExists
};
