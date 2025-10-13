const { verifyAccessToken } = require('../utils/jwt');
const { createClient } = require('../config/database');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * Middleware para autenticar token JWT
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AppError('Token no proporcionado', 401);
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      throw new AppError('Token inválido o expirado', 401);
    }

    // Verificar que el usuario existe y está activo
    const supabase = createClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, franchise_id, is_active')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (!user.is_active) {
      throw new AppError('Usuario desactivado', 403);
    }

    // Agregar información al request
    req.user = {
      ...user,
      permissions: decoded.permissions || []
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('Error en authenticateToken:', error);
      next(new AppError('Error de autenticación', 401));
    }
  }
}

/**
 * Middleware para verificar permiso específico
 * @param {string|string[]} requiredPermission - Permiso o array de permisos requeridos
 */
function requirePermission(requiredPermission) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Usuario no autenticado', 401);
      }

      const userPermissions = req.user.permissions || [];
      
      // Si tiene super_admin, puede todo
      if (userPermissions.includes('super_admin')) {
        return next();
      }

      // Verificar si tiene el permiso requerido
      const permissions = Array.isArray(requiredPermission) 
        ? requiredPermission 
        : [requiredPermission];

      const hasPermission = permissions.some(perm => 
        userPermissions.includes(perm)
      );

      if (!hasPermission) {
        throw new AppError(
          `Permiso denegado. Se requiere: ${permissions.join(' o ')}`,
          403
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware para verificar que el usuario es super_admin
 */
function requireSuperAdmin(req, res, next) {
  try {
    if (!req.user) {
      throw new AppError('Usuario no autenticado', 401);
    }

    const userPermissions = req.user.permissions || [];
    
    if (!userPermissions.includes('super_admin')) {
      throw new AppError(
        'Acceso denegado. Solo super_admin puede realizar esta acción',
        403
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware opcional de autenticación (no falla si no hay token)
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = verifyAccessToken(token);
    if (decoded) {
      const supabase = createClient();
      const { data: user } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, franchise_id, is_active')
        .eq('id', decoded.userId)
        .single();

      if (user && user.is_active) {
        req.user = {
          ...user,
          permissions: decoded.permissions || []
        };
      }
    }

    next();
  } catch (error) {
    logger.warn('Error en optionalAuth:', error);
    next();
  }
}

module.exports = {
  authenticateToken,
  requirePermission,
  requireSuperAdmin,
  optionalAuth
};
