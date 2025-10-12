/**
 * Constantes del sistema
 */

// Roles del sistema
const ROLES = {
  ADMIN: 'admin',
  FRANCHISEE: 'franchisee',
  MANAGER: 'manager',
  SUPERVISOR: 'supervisor',
  EMPLOYEE: 'employee',
  VIEWER: 'viewer'
};

// Jerarquía de roles (menor número = más privilegios)
const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 1,
  [ROLES.FRANCHISEE]: 2,
  [ROLES.MANAGER]: 3,
  [ROLES.SUPERVISOR]: 4,
  [ROLES.EMPLOYEE]: 5,
  [ROLES.VIEWER]: 6
};

// Estados de franquicia
const FRANCHISE_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  TERMINATED: 'terminated',
  PENDING: 'pending'
};

// Tipos de turno
const SHIFT_TYPES = {
  FULL_TIME: 'full_time',
  PART_TIME: 'part_time',
  TEMPORARY: 'temporary',
  COVER: 'cover'
};

// Métodos de check-in
const CHECKIN_METHODS = {
  MANUAL: 'manual',
  GPS: 'gps',
  QR_CODE: 'qr_code',
  NFC: 'nfc'
};

// Roles at location (roles específicos de un empleado en un local)
const ROLES_AT_LOCATION = {
  MANAGER: 'manager',
  SUPERVISOR: 'supervisor',
  EMPLOYEE: 'employee',
  VIEWER: 'viewer'
};

// Niveles de billing
const BILLING_TIERS = {
  BASIC: 'basic',
  STANDARD: 'standard',
  PREMIUM: 'premium'
};

// ID de organización Gangazon (única organización)
const GANGAZON_ORG_ID = '00000000-0000-0000-0000-000000000001';

// Configuración de paginación
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100
};

// Configuración de GPS
const GPS = {
  DEFAULT_TOLERANCE_METERS: 100,
  MAX_TOLERANCE_METERS: 500
};

// Configuración de tokens
const TOKENS = {
  ACCESS_TOKEN_EXPIRY: '1h',
  REFRESH_TOKEN_EXPIRY: '7d',
  REFRESH_TOKEN_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000
};

// Mensajes comunes
const MESSAGES = {
  UNAUTHORIZED: 'No autenticado',
  FORBIDDEN: 'Acceso denegado',
  NOT_FOUND: 'No encontrado',
  CONFLICT: 'Ya existe',
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  ACCOUNT_INACTIVE: 'Cuenta inactiva',
  SUCCESS: 'Operación exitosa'
};

/**
 * Verifica si un rol es válido
 * @param {string} role - Rol a verificar
 * @returns {boolean}
 */
function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

/**
 * Compara jerarquía de roles
 * @param {string} role1 - Primer rol
 * @param {string} role2 - Segundo rol
 * @returns {number} -1 si role1 > role2, 0 si igual, 1 si role1 < role2
 */
function compareRoles(role1, role2) {
  const level1 = ROLE_HIERARCHY[role1];
  const level2 = ROLE_HIERARCHY[role2];
  
  if (level1 < level2) return -1;
  if (level1 > level2) return 1;
  return 0;
}

/**
 * Verifica si un rol tiene más privilegios que otro
 * @param {string} role1 - Rol a verificar
 * @param {string} role2 - Rol de referencia
 * @returns {boolean}
 */
function hasHigherPrivilege(role1, role2) {
  return ROLE_HIERARCHY[role1] < ROLE_HIERARCHY[role2];
}

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  FRANCHISE_STATUS,
  SHIFT_TYPES,
  CHECKIN_METHODS,
  ROLES_AT_LOCATION,
  BILLING_TIERS,
  GANGAZON_ORG_ID,
  PAGINATION,
  GPS,
  TOKENS,
  MESSAGES,
  isValidRole,
  compareRoles,
  hasHigherPrivilege
};
