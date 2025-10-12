const { 
  getFranchiseIdsByOrganization, 
  getLocationIdsByUser,
  locationBelongsToFranchise 
} = require('./queryHelpers');
const db = require('../config/database');

/**
 * Verifica si un usuario puede acceder a una franquicia
 * @param {Object} user - Usuario con { id, role, organizationId }
 * @param {string} franchiseId - ID de la franquicia
 * @returns {Promise<Object>} { hasAccess: boolean, reason: string }
 */
async function canAccessFranchise(user, franchiseId) {
  if (user.role === 'admin') {
    // Admin puede ver franquicias de su organización
    const { data: franchise } = await db.getClient()
      .from('franchises')
      .select('organization_id')
      .eq('id', franchiseId)
      .single();
    
    if (!franchise) {
      return { hasAccess: false, reason: 'Franquicia no encontrada' };
    }
    
    if (franchise.organization_id !== user.organizationId) {
      return { hasAccess: false, reason: 'La franquicia no pertenece a tu organización' };
    }
    
    return { hasAccess: true };
  }
  
  if (user.role === 'franchisee') {
    // Franchisee solo su(s) franquicia(s)
    const franchiseIds = await getFranchiseIdsByOrganization(user.organizationId);
    
    if (!franchiseIds.includes(franchiseId)) {
      return { hasAccess: false, reason: 'No tienes acceso a esta franquicia' };
    }
    
    return { hasAccess: true };
  }
  
  return { hasAccess: false, reason: 'No tienes permisos para ver franquicias' };
}

/**
 * Verifica si un usuario puede acceder a un local
 * @param {Object} user - Usuario con { id, role, organizationId }
 * @param {string} locationId - ID del local
 * @returns {Promise<Object>} { hasAccess: boolean, reason: string }
 */
async function canAccessLocation(user, locationId) {
  if (user.role === 'admin') {
    // Admin puede ver locales de su organización
    const franchiseIds = await getFranchiseIdsByOrganization(user.organizationId);
    const hasAccess = await locationBelongsToFranchise(locationId, franchiseIds);
    
    return { 
      hasAccess,
      reason: hasAccess ? null : 'El local no pertenece a tu organización'
    };
  }
  
  if (user.role === 'franchisee') {
    // Franchisee solo locales de sus franquicias
    const franchiseIds = await getFranchiseIdsByOrganization(user.organizationId);
    const hasAccess = await locationBelongsToFranchise(locationId, franchiseIds);
    
    return {
      hasAccess,
      reason: hasAccess ? null : 'El local no pertenece a tus franquicias'
    };
  }
  
  if (['manager', 'supervisor', 'employee', 'viewer'].includes(user.role)) {
    // Deben tener asignación activa
    const locationIds = await getLocationIdsByUser(user.id);
    const hasAccess = locationIds.includes(locationId);
    
    return {
      hasAccess,
      reason: hasAccess ? null : 'No estás asignado a este local'
    };
  }
  
  return { hasAccess: false, reason: 'Rol no válido' };
}

/**
 * Verifica si un usuario puede modificar un local
 * @param {Object} user - Usuario con { id, role, organizationId }
 * @param {string} locationId - ID del local
 * @returns {Promise<Object>} { canModify: boolean, reason: string }
 */
async function canModifyLocation(user, locationId) {
  if (user.role === 'admin') {
    const accessCheck = await canAccessLocation(user, locationId);
    return { canModify: accessCheck.hasAccess, reason: accessCheck.reason };
  }
  
  if (user.role === 'franchisee') {
    const accessCheck = await canAccessLocation(user, locationId);
    return { canModify: accessCheck.hasAccess, reason: accessCheck.reason };
  }
  
  if (user.role === 'manager') {
    // Manager debe tener rol manager en el local
    const { data: assignment } = await db.getClient()
      .from('employee_assignments')
      .select('role_at_location')
      .eq('user_id', user.id)
      .eq('location_id', locationId)
      .eq('is_active', true)
      .eq('role_at_location', 'manager')
      .single();
    
    return {
      canModify: !!assignment,
      reason: assignment ? null : 'No eres manager de este local'
    };
  }
  
  return { canModify: false, reason: 'No tienes permisos para modificar locales' };
}

/**
 * Verifica si un usuario puede gestionar otro usuario
 * @param {Object} actor - Usuario que realiza la acción
 * @param {Object} target - Usuario objetivo
 * @returns {Object} { canManage: boolean, reason: string }
 */
function canManageUser(actor, target) {
  // Admin no puede gestionar otros admins
  if (actor.role === 'admin') {
    if (target.role === 'admin') {
      return { canManage: false, reason: 'No puedes gestionar otros administradores' };
    }
    
    if (target.organizationId !== actor.organizationId) {
      return { canManage: false, reason: 'El usuario no pertenece a tu organización' };
    }
    
    return { canManage: true };
  }
  
  if (actor.role === 'franchisee') {
    if (['admin', 'franchisee'].includes(target.role)) {
      return { canManage: false, reason: 'No puedes gestionar administradores o franquiciados' };
    }
    
    if (target.organizationId !== actor.organizationId) {
      return { canManage: false, reason: 'El usuario no pertenece a tu organización' };
    }
    
    return { canManage: true };
  }
  
  return { canManage: false, reason: 'No tienes permisos para gestionar usuarios' };
}

/**
 * Obtiene los IDs de locales accesibles para un usuario
 * @param {Object} user - Usuario con { id, role, organizationId }
 * @returns {Promise<string[]>} Array de location IDs
 */
async function getAccessibleLocationIds(user) {
  if (user.role === 'admin' || user.role === 'franchisee') {
    const franchiseIds = await getFranchiseIdsByOrganization(user.organizationId);
    const { getLocationIdsByFranchises } = require('./queryHelpers');
    return await getLocationIdsByFranchises(franchiseIds);
  }
  
  if (['manager', 'supervisor', 'employee', 'viewer'].includes(user.role)) {
    return await getLocationIdsByUser(user.id);
  }
  
  return [];
}

/**
 * Obtiene los IDs de franquicias accesibles para un usuario
 * @param {Object} user - Usuario con { id, role, organizationId }
 * @returns {Promise<string[]>} Array de franchise IDs
 */
async function getAccessibleFranchiseIds(user) {
  if (user.role === 'admin' || user.role === 'franchisee') {
    return await getFranchiseIdsByOrganization(user.organizationId);
  }
  
  if (['manager', 'supervisor', 'employee', 'viewer'].includes(user.role)) {
    const locationIds = await getLocationIdsByUser(user.id);
    
    if (locationIds.length === 0) return [];
    
    const { data: locations } = await db.getClient()
      .from('locations')
      .select('franchise_id')
      .in('id', locationIds);
    
    return [...new Set((locations || []).map(l => l.franchise_id))];
  }
  
  return [];
}

module.exports = {
  canAccessFranchise,
  canAccessLocation,
  canModifyLocation,
  canManageUser,
  getAccessibleLocationIds,
  getAccessibleFranchiseIds
};
