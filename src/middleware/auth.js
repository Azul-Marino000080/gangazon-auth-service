const authUtils = require('../utils/auth');
const db = require('../config/database');
const logger = require('../utils/logger');

// Middleware para verificar JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        error: 'Token requerido',
        message: 'Se requiere un token de autenticación'
      });
    }

    const decoded = authUtils.verifyToken(token);
    
    // Verificar que el usuario aún existe y está activo
    const { data: user, error } = await db.getClient()
      .from('users')
      .select('id, email, is_active, organization_id, role')
      .eq('id', decoded.userId)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: 'Usuario no válido',
        message: 'El usuario no existe o está inactivo'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      organizationId: user.organization_id,
      role: user.role
    };

    next();
  } catch (error) {
    logger.error('Error en autenticación:', error);
    return res.status(401).json({
      error: 'Token inválido',
      message: 'El token de autenticación no es válido'
    });
  }
};

// Middleware para verificar roles específicos
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Se requiere autenticación'
      });
    }

    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: `Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Middleware mejorado para verificar permisos de organización/franquicia
const requireOrgAccess = (req, res, next) => {
  const requestedOrgId = req.params.organizationId || req.body.organizationId;
  const requestedFranchiseId = req.params.franchiseId || req.body.franchiseId;
  
  // Admin tiene acceso total
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Verificar acceso a organización específica
  if (requestedOrgId && req.user.organizationId !== requestedOrgId) {
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'No tienes permisos para acceder a esta organización'
    });
  }

  // Para franquiciados, verificar que la franquicia pertenece a su organización
  if (requestedFranchiseId && req.user.role === 'franchisee') {
    // Esto se verificará en el endpoint específico con query a DB
    // Aquí solo validamos que tiene un rol apropiado
  }

  next();
};

// Middleware para verificar acceso contextual a locales
const requireLocationAccess = async (req, res, next) => {
  try {
    const locationId = req.params.locationId || req.body.locationId;
    
    if (!locationId) {
      return next(); // Si no hay locationId, continuar
    }

    // Admin tiene acceso total
    if (req.user.role === 'admin') {
      return next();
    }

    const db = require('../config/database');

    // Verificar acceso según el rol
    if (req.user.role === 'franchisee') {
      // Verificar que el local pertenece a una franquicia de su organización
      const { data: location } = await db.getClient()
        .from('locations')
        .select('franchise_id')
        .eq('id', locationId)
        .in('franchise_id',
          db.getClient()
            .from('franchises')
            .select('id')
            .eq('organization_id', req.user.organizationId)
        )
        .single();

      if (!location) {
        return res.status(403).json({
          error: 'Acceso denegado',
          message: 'No tienes permisos para acceder a este local'
        });
      }
    } else if (['manager', 'supervisor'].includes(req.user.role)) {
      // Verificar que es manager o supervisor del local
      const { data: location } = await db.getClient()
        .from('locations')
        .select('id')
        .eq('id', locationId)
        .eq('manager_id', req.user.id)
        .single();

      if (!location) {
        return res.status(403).json({
          error: 'Acceso denegado',
          message: 'No eres manager/supervisor de este local'
        });
      }
    } else if (req.user.role === 'employee') {
      // Verificar que está asignado al local
      const { data: assignment } = await db.getClient()
        .from('employee_assignments')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('location_id', locationId)
        .eq('is_active', true)
        .single();

      if (!assignment) {
        return res.status(403).json({
          error: 'Acceso denegado',
          message: 'No estás asignado a este local'
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Error verificando acceso a local:', error);
    res.status(500).json({
      error: 'Error de autorización',
      message: 'Error verificando permisos de local'
    });
  }
};

// Middleware para API Key (para aplicaciones)
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        error: 'API Key requerida',
        message: 'Se requiere una API Key válida'
      });
    }

    const { data: app, error } = await db.getClient()
      .from('applications')
      .select('id, name, organization_id, is_active')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (error || !app) {
      return res.status(401).json({
        error: 'API Key inválida',
        message: 'La API Key no es válida o está inactiva'
      });
    }

    req.application = {
      id: app.id,
      name: app.name,
      organizationId: app.organization_id
    };

    next();
  } catch (error) {
    logger.error('Error en autenticación de API Key:', error);
    return res.status(401).json({
      error: 'Error de autenticación',
      message: 'Error verificando la API Key'
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireOrgAccess,
  requireLocationAccess,
  authenticateApiKey
};