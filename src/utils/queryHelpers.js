const db = require('../config/database');

/**
 * Obtiene IDs de franquicias de una organización
 * @param {string} organizationId - ID de la organización
 * @returns {Promise<string[]>} Array de franchise IDs
 */
async function getFranchiseIdsByOrganization(organizationId) {
  const { data: franchises } = await db.getClient()
    .from('franchises')
    .select('id')
    .eq('organization_id', organizationId);
  
  return (franchises || []).map(f => f.id);
}

/**
 * Obtiene IDs de locales de una o varias franquicias
 * @param {string|string[]} franchiseIds - ID(s) de franquicia(s)
 * @returns {Promise<string[]>} Array de location IDs
 */
async function getLocationIdsByFranchises(franchiseIds) {
  const ids = Array.isArray(franchiseIds) ? franchiseIds : [franchiseIds];
  
  if (ids.length === 0) return [];
  
  const { data: locations } = await db.getClient()
    .from('locations')
    .select('id')
    .in('franchise_id', ids);
  
  return (locations || []).map(l => l.id);
}

/**
 * Obtiene IDs de locales asignados a un usuario
 * @param {string} userId - ID del usuario
 * @param {boolean} activeOnly - Solo asignaciones activas
 * @returns {Promise<string[]>} Array de location IDs
 */
async function getLocationIdsByUser(userId, activeOnly = true) {
  let query = db.getClient()
    .from('employee_assignments')
    .select('location_id')
    .eq('user_id', userId);
  
  if (activeOnly) {
    query = query.eq('is_active', true);
  }
  
  const { data: assignments } = await query;
  return (assignments || []).map(a => a.location_id);
}

/**
 * Verifica si un usuario pertenece a una organización
 * @param {string} userId - ID del usuario
 * @param {string} organizationId - ID de la organización
 * @returns {Promise<boolean>}
 */
async function userBelongsToOrganization(userId, organizationId) {
  const { data: user } = await db.getClient()
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .single();
  
  return user && user.organization_id === organizationId;
}

/**
 * Verifica si un local pertenece a una franquicia
 * @param {string} locationId - ID del local
 * @param {string|string[]} franchiseIds - ID(s) de franquicia(s)
 * @returns {Promise<boolean>}
 */
async function locationBelongsToFranchise(locationId, franchiseIds) {
  const ids = Array.isArray(franchiseIds) ? franchiseIds : [franchiseIds];
  
  const { data: location } = await db.getClient()
    .from('locations')
    .select('franchise_id')
    .eq('id', locationId)
    .single();
  
  return location && ids.includes(location.franchise_id);
}

/**
 * Obtiene información básica de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object|null>}
 */
async function getUserBasicInfo(userId) {
  const { data: user, error } = await db.getClient()
    .from('users')
    .select('id, email, first_name, last_name, role, organization_id, is_active')
    .eq('id', userId)
    .single();
  
  return error ? null : user;
}

/**
 * Obtiene información de un local con franquicia
 * @param {string} locationId - ID del local
 * @returns {Promise<Object|null>}
 */
async function getLocationWithFranchise(locationId) {
  const { data: location, error } = await db.getClient()
    .from('locations')
    .select(`
      id,
      franchise_id,
      name,
      address,
      city,
      max_employees,
      is_active,
      franchises(id, name, organization_id)
    `)
    .eq('id', locationId)
    .single();
  
  return error ? null : location;
}

/**
 * Cuenta registros con filtros
 * @param {string} table - Nombre de la tabla
 * @param {Object} filters - Objeto con filtros { campo: valor }
 * @returns {Promise<number>}
 */
async function countRecords(table, filters = {}) {
  let query = db.getClient()
    .from(table)
    .select('*', { count: 'exact', head: true });
  
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      query = query.in(key, value);
    } else {
      query = query.eq(key, value);
    }
  });
  
  const { count } = await query;
  return count || 0;
}

/**
 * Verifica si existe un registro
 * @param {string} table - Nombre de la tabla
 * @param {Object} filters - Objeto con filtros
 * @returns {Promise<boolean>}
 */
async function recordExists(table, filters) {
  let query = db.getClient()
    .from(table)
    .select('id')
    .limit(1);
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  const { data } = await query.single();
  return !!data;
}

/**
 * Construye paginación estándar
 * @param {number} page - Página actual
 * @param {number} limit - Límite por página
 * @param {number} total - Total de registros
 * @returns {Object} Objeto de paginación
 */
function buildPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
}

/**
 * Aplica paginación a una query
 * @param {Object} query - Query de Supabase
 * @param {number} page - Página
 * @param {number} limit - Límite
 * @returns {Object} Query con paginación
 */
function applyPagination(query, page = 1, limit = 50) {
  const offset = (page - 1) * limit;
  return query.range(offset, offset + limit - 1);
}

module.exports = {
  getFranchiseIdsByOrganization,
  getLocationIdsByFranchises,
  getLocationIdsByUser,
  userBelongsToOrganization,
  locationBelongsToFranchise,
  getUserBasicInfo,
  getLocationWithFranchise,
  countRecords,
  recordExists,
  buildPagination,
  applyPagination
};
