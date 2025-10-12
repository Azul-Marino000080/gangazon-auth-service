/**
 * Respuesta de éxito estándar
 * @param {Object} res - Objeto response de Express
 * @param {Object} data - Datos a devolver
 * @param {string} message - Mensaje opcional
 * @param {number} statusCode - Código de estado (default: 200)
 */
function sendSuccess(res, data, message = null, statusCode = 200) {
  const response = message ? { message, ...data } : data;
  return res.status(statusCode).json(response);
}

/**
 * Respuesta de error estándar
 * @param {Object} res - Objeto response de Express
 * @param {string} error - Título del error
 * @param {string} message - Mensaje descriptivo
 * @param {number} statusCode - Código de estado (default: 400)
 * @param {Object} details - Detalles adicionales opcionales
 */
function sendError(res, error, message, statusCode = 400, details = null) {
  const response = { error, message };
  if (details) {
    response.details = details;
  }
  return res.status(statusCode).json(response);
}

/**
 * Respuesta de recurso no encontrado
 * @param {Object} res - Objeto response de Express
 * @param {string} resource - Nombre del recurso
 */
function sendNotFound(res, resource = 'Recurso') {
  return sendError(
    res,
    `${resource} no encontrado`,
    `No se pudo encontrar el ${resource.toLowerCase()}`,
    404
  );
}

/**
 * Respuesta de acceso denegado
 * @param {Object} res - Objeto response de Express
 * @param {string} reason - Razón del rechazo
 */
function sendForbidden(res, reason = 'No tienes permisos para realizar esta acción') {
  return sendError(res, 'Acceso denegado', reason, 403);
}

/**
 * Respuesta de conflicto (409)
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje del conflicto
 */
function sendConflict(res, message) {
  return sendError(res, 'Conflicto', message, 409);
}

/**
 * Respuesta con paginación
 * @param {Object} res - Objeto response de Express
 * @param {Array} items - Array de items
 * @param {Object} pagination - Objeto de paginación
 * @param {string} itemsKey - Nombre de la clave para los items (default: 'items')
 */
function sendPaginated(res, items, pagination, itemsKey = 'items') {
  return res.json({
    [itemsKey]: items,
    pagination
  });
}

/**
 * Respuesta de creación exitosa (201)
 * @param {Object} res - Objeto response de Express
 * @param {Object} data - Datos del recurso creado
 * @param {string} message - Mensaje de éxito
 */
function sendCreated(res, data, message = 'Recurso creado exitosamente') {
  return sendSuccess(res, data, message, 201);
}

/**
 * Formatea datos de usuario para respuesta
 * @param {Object} user - Usuario de la BD
 * @returns {Object} Usuario formateado
 */
function formatUserResponse(user) {
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    organizationId: user.organization_id,
    isActive: user.is_active,
    emailVerified: user.email_verified,
    createdAt: user.created_at,
    lastLogin: user.last_login_at
  };
}

/**
 * Formatea datos de franquicia para respuesta
 * @param {Object} franchise - Franquicia de la BD
 * @returns {Object} Franquicia formateada
 */
function formatFranchiseResponse(franchise) {
  if (!franchise) return null;
  
  return {
    id: franchise.id,
    organizationId: franchise.organization_id,
    name: franchise.name,
    franchiseeName: franchise.franchisee_name,
    franchiseeEmail: franchise.franchisee_email,
    franchiseePhone: franchise.franchisee_phone,
    contractStartDate: franchise.contract_start_date,
    contractEndDate: franchise.contract_end_date,
    maxLocations: franchise.max_locations,
    maxEmployees: franchise.max_employees,
    billingTier: franchise.billing_tier,
    status: franchise.status,
    settings: franchise.settings,
    createdAt: franchise.created_at,
    updatedAt: franchise.updated_at
  };
}

/**
 * Formatea datos de local para respuesta
 * @param {Object} location - Local de la BD
 * @returns {Object} Local formateado
 */
function formatLocationResponse(location) {
  if (!location) return null;
  
  return {
    id: location.id,
    franchiseId: location.franchise_id,
    name: location.name,
    address: location.address,
    city: location.city,
    postalCode: location.postal_code,
    country: location.country,
    phone: location.phone,
    email: location.email,
    managerId: location.manager_id,
    maxEmployees: location.max_employees,
    operatingHours: location.operating_hours,
    timezone: location.timezone,
    coordinates: location.latitude && location.longitude ? {
      lat: location.latitude,
      lng: location.longitude
    } : null,
    isActive: location.is_active,
    settings: location.settings,
    createdAt: location.created_at,
    updatedAt: location.updated_at
  };
}

/**
 * Formatea datos de check-in para respuesta
 * @param {Object} checkin - Check-in de la BD
 * @returns {Object} Check-in formateado
 */
function formatCheckinResponse(checkin) {
  if (!checkin) return null;
  
  let hoursWorked = null;
  if (checkin.check_out_time) {
    const checkIn = new Date(checkin.check_in_time);
    const checkOut = new Date(checkin.check_out_time);
    hoursWorked = Math.round((checkOut - checkIn) / (1000 * 60 * 60) * 100) / 100;
  }
  
  return {
    id: checkin.id,
    userId: checkin.user_id,
    locationId: checkin.location_id,
    assignmentId: checkin.assignment_id,
    checkInTime: checkin.check_in_time,
    checkOutTime: checkin.check_out_time,
    checkInMethod: checkin.check_in_method,
    hoursWorked: hoursWorked,
    breakDuration: checkin.break_duration,
    notes: checkin.notes,
    verifiedBy: checkin.verified_by,
    createdAt: checkin.created_at
  };
}

/**
 * Formatea datos de asignación para respuesta
 * @param {Object} assignment - Asignación de la BD
 * @returns {Object} Asignación formateada
 */
function formatAssignmentResponse(assignment) {
  if (!assignment) return null;
  
  return {
    id: assignment.id,
    userId: assignment.user_id,
    locationId: assignment.location_id,
    roleAtLocation: assignment.role_at_location,
    startDate: assignment.start_date,
    endDate: assignment.end_date,
    shiftType: assignment.shift_type,
    assignedBy: assignment.assigned_by,
    isActive: assignment.is_active,
    notes: assignment.notes,
    createdAt: assignment.created_at,
    updatedAt: assignment.updated_at
  };
}

module.exports = {
  sendSuccess,
  sendError,
  sendNotFound,
  sendForbidden,
  sendConflict,
  sendPaginated,
  sendCreated,
  formatUserResponse,
  formatFranchiseResponse,
  formatLocationResponse,
  formatCheckinResponse,
  formatAssignmentResponse
};
