const db = require('../config/database');

/**
 * Verifica si un usuario tiene acceso a un local específico
 * @param {Object} user - Usuario con id, role, organizationId
 * @param {string} locationId - ID del local
 * @returns {Promise<boolean>}
 */
async function canUserAccessLocation(user, locationId) {
  if (user.role === 'admin') {
    return true;
  }

  if (user.role === 'franchisee') {
    const { data: franchises } = await db.getClient()
      .from('franchises')
      .select('id')
      .eq('organization_id', user.organizationId);

    if (!franchises || franchises.length === 0) return false;

    const franchiseIds = franchises.map(f => f.id);

    const { data } = await db.getClient()
      .from('locations')
      .select('franchise_id')
      .eq('id', locationId)
      .in('franchise_id', franchiseIds)
      .single();

    return !!data;
  }

  if (['manager', 'supervisor'].includes(user.role)) {
    const { data } = await db.getClient()
      .from('locations')
      .select('id')
      .eq('id', locationId)
      .eq('manager_id', user.id)
      .single();

    return !!data;
  }

  if (['employee', 'viewer'].includes(user.role)) {
    const { data } = await db.getClient()
      .from('employee_assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('location_id', locationId)
      .eq('is_active', true)
      .single();

    return !!data;
  }

  return false;
}

/**
 * Calcula la distancia en metros entre dos coordenadas GPS
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distancia en metros
 */
function calculateGPSDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
}

/**
 * Valida que las coordenadas GPS estén dentro del rango permitido del local
 * @param {Object} coordinates - { lat, lng }
 * @param {string} locationId - ID del local
 * @param {number} tolerance - Tolerancia en metros (default desde env)
 * @returns {Promise<Object>} { valid: boolean, distance: number, message: string }
 */
async function validateGPSProximity(coordinates, locationId, tolerance = null) {
  const toleranceMeters = tolerance || parseInt(process.env.GPS_TOLERANCE_METERS) || 100;

  // Obtener coordenadas del local
  const { data: location, error } = await db.getClient()
    .from('locations')
    .select('latitude, longitude, name')
    .eq('id', locationId)
    .single();

  if (error || !location) {
    return {
      valid: false,
      distance: null,
      message: 'No se pudo obtener la ubicación del local'
    };
  }

  // Si el local no tiene coordenadas configuradas, permitir check-in
  if (!location.latitude || !location.longitude) {
    return {
      valid: true,
      distance: null,
      message: 'Local sin coordenadas configuradas, check-in permitido'
    };
  }

  // Calcular distancia
  const distance = calculateGPSDistance(
    coordinates.lat,
    coordinates.lng,
    location.latitude,
    location.longitude
  );

  const valid = distance <= toleranceMeters;

  return {
    valid,
    distance: Math.round(distance),
    message: valid
      ? `Check-in válido (${Math.round(distance)}m del local)`
      : `Demasiado lejos del local (${Math.round(distance)}m, máximo ${toleranceMeters}m)`
  };
}

/**
 * Verifica si un usuario puede ver/modificar un check-in específico
 * @param {Object} user - Usuario con id, role, organizationId
 * @param {string} checkinId - ID del check-in
 * @returns {Promise<boolean>}
 */
async function canUserAccessCheckin(user, checkinId) {
  if (user.role === 'admin') {
    return true;
  }

  // Obtener el check-in con información del local
  const { data: checkin } = await db.getClient()
    .from('employee_checkins')
    .select('user_id, location_id')
    .eq('id', checkinId)
    .single();

  if (!checkin) return false;

  // Si es su propio check-in
  if (checkin.user_id === user.id) {
    return true;
  }

  // Verificar acceso al local del check-in
  return await canUserAccessLocation(user, checkin.location_id);
}

/**
 * Obtiene la organización Gangazon (única organización del sistema)
 * Crea la organización si no existe
 * @returns {Promise<string>} ID de la organización Gangazon
 */
async function getGangazonOrganization() {
  const GANGAZON_ORG_ID = '00000000-0000-0000-0000-000000000001';
  
  let { data: org } = await db.getClient()
    .from('organizations')
    .select('id')
    .eq('id', GANGAZON_ORG_ID)
    .single();

  if (!org) {
    // Crear organización Gangazon si no existe
    const { data: newOrg } = await db.getClient()
      .from('organizations')
      .insert({
        id: GANGAZON_ORG_ID,
        name: 'Gangazon',
        description: 'Franquicia Gangazon',
        industry: 'franchise',
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    return newOrg ? newOrg.id : GANGAZON_ORG_ID;
  }

  return org.id;
}

/**
 * Roles válidos del sistema (simplificados)
 */
const VALID_ROLES = [
  'admin',      // Administrador Gangazon (casa matriz)
  'franchisee', // Dueño de franquicia
  'manager',    // Gerente de local
  'supervisor', // Supervisor de local
  'employee',   // Empleado
  'viewer'      // Solo lectura
];

/**
 * Permisos del rol viewer
 */
const VIEWER_PERMISSIONS = {
  canRead: ['profile', 'locations', 'franchises', 'users', 'checkins', 'assignments'],
  canWrite: [],
  canDelete: [],
  description: 'Solo puede ver información asignada, sin permisos de modificación'
};

module.exports = {
  canUserAccessLocation,
  canUserAccessCheckin,
  calculateGPSDistance,
  validateGPSProximity,
  getGangazonOrganization,
  VALID_ROLES,
  VIEWER_PERMISSIONS
};
