const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendSuccess, sendError, sendNotFound, sendForbidden } = require('../utils/responseHelpers');
const { ROLES, ROLE_HIERARCHY } = require('../utils/constants');

// Obtener todos los roles disponibles
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const allRoles = Object.values(ROLES);

    // Filtrar roles según el usuario
    let availableRoles = allRoles;
    const userRoleLevel = ROLE_HIERARCHY[req.user.role] || 999;

    if (req.user.role === 'admin') {
      availableRoles = allRoles;
    } else if (req.user.role === 'franchisee') {
      availableRoles = allRoles.filter(role => 
        ['manager', 'supervisor', 'employee', 'viewer'].includes(role.name)
      );
    } else if (req.user.role === 'manager') {
      availableRoles = allRoles.filter(role => 
        ['supervisor', 'employee', 'viewer'].includes(role.name)
      );
    } else if (req.user.role === 'supervisor') {
      availableRoles = allRoles.filter(role => 
        ['employee', 'viewer'].includes(role.name)
      );
    } else {
      availableRoles = allRoles.filter(role => role.name === req.user.role);
    }

    return sendSuccess(res, { roles: availableRoles });

  } catch (error) {
    next(error);
  }
});

// Obtener información de un rol específico
router.get('/:name', authenticateToken, async (req, res, next) => {
  try {
    const { name } = req.params;

    const role = ROLES[name.toUpperCase()];

    if (!role) {
      return sendNotFound(res, 'Rol');
    }

    return sendSuccess(res, { role });

  } catch (error) {
    next(error);
  }
});

// Obtener permisos de un rol específico
router.get('/:roleName/permissions', authenticateToken, async (req, res, next) => {
  try {
    const { roleName } = req.params;

    const rolePermissions = {
      // Roles del sistema Gangazon (simplificados)
      admin: [
        {
          resource: 'all',
          actions: ['*'],
          description: 'Acceso completo al sistema Gangazon',
          scope: 'global'
        }
      ],
      franchisee: [
        {
          resource: 'franchise',
          actions: ['read', 'update'],
          description: 'Gestionar su propia franquicia',
          scope: 'own_franchise'
        },
        {
          resource: 'locations',
          actions: ['read', 'create', 'update', 'delete'],
          description: 'Gestionar locales de su franquicia',
          scope: 'own_franchise'
        },
        {
          resource: 'users',
          actions: ['read', 'create', 'update', 'delete'],
          description: 'Gestionar empleados de su franquicia',
          scope: 'own_franchise'
        },
        {
          resource: 'assignments',
          actions: ['read', 'create', 'update', 'delete'],
          description: 'Gestionar asignaciones de empleados',
          scope: 'own_franchise'
        },
        {
          resource: 'checkins',
          actions: ['read', 'approve', 'modify'],
          description: 'Gestionar asistencia de la franquicia',
          scope: 'own_franchise'
        },
        {
          resource: 'reports',
          actions: ['read', 'export'],
          description: 'Ver reportes de su franquicia',
          scope: 'own_franchise'
        }
      ],
      manager: [
        {
          resource: 'location',
          actions: ['read', 'update'],
          description: 'Gestionar su local',
          scope: 'assigned_locations'
        },
        {
          resource: 'users',
          actions: ['read'],
          description: 'Ver empleados del local',
          scope: 'assigned_locations'
        },
        {
          resource: 'assignments',
          actions: ['read', 'create', 'update'],
          description: 'Gestionar asignaciones en el local',
          scope: 'assigned_locations'
        },
        {
          resource: 'checkins',
          actions: ['read', 'approve', 'modify'],
          description: 'Gestionar asistencia del local',
          scope: 'assigned_locations'
        },
        {
          resource: 'schedules',
          actions: ['read', 'create', 'update'],
          description: 'Gestionar horarios del local',
          scope: 'assigned_locations'
        },
        {
          resource: 'reports',
          actions: ['read'],
          description: 'Ver reportes del local',
          scope: 'assigned_locations'
        }
      ],
      supervisor: [
        {
          resource: 'location',
          actions: ['read'],
          description: 'Ver información del local',
          scope: 'assigned_locations'
        },
        {
          resource: 'checkins',
          actions: ['read', 'approve'],
          description: 'Supervisar asistencia',
          scope: 'assigned_locations'
        },
        {
          resource: 'employees',
          actions: ['read'],
          description: 'Ver empleados del local',
          scope: 'assigned_locations'
        },
        {
          resource: 'schedules',
          actions: ['read'],
          description: 'Ver horarios del local',
          scope: 'assigned_locations'
        }
      ],
      employee: [
        {
          resource: 'profile',
          actions: ['read', 'update'],
          description: 'Gestionar su propio perfil'
        },
        {
          resource: 'checkins',
          actions: ['create', 'read'],
          description: 'Realizar y ver sus propios check-in/check-out',
          scope: 'self'
        },
        {
          resource: 'schedule',
          actions: ['read'],
          description: 'Ver su propio horario',
          scope: 'self'
        },
        {
          resource: 'location',
          actions: ['read'],
          description: 'Ver información básica del local asignado',
          scope: 'assigned_locations'
        }
      ],
      viewer: [
        {
          resource: 'profile',
          actions: ['read', 'update'],
          description: 'Ver y actualizar su propio perfil'
        },
        {
          resource: 'locations',
          actions: ['read'],
          description: 'Ver locales asignados (solo lectura)',
          scope: 'assigned_locations'
        },
        {
          resource: 'users',
          actions: ['read'],
          description: 'Ver usuarios de locales asignados (solo lectura)',
          scope: 'assigned_locations'
        },
        {
          resource: 'checkins',
          actions: ['read'],
          description: 'Ver registros de asistencia (solo lectura)',
          scope: 'assigned_locations'
        },
        {
          resource: 'schedules',
          actions: ['read'],
          description: 'Ver horarios (solo lectura)',
          scope: 'assigned_locations'
        },
        {
          resource: 'reports',
          actions: ['read'],
          description: 'Ver reportes (solo lectura)',
          scope: 'assigned_locations'
        },
        {
          resource: 'assignments',
          actions: ['read'],
          description: 'Ver asignaciones (solo lectura)',
          scope: 'assigned_locations'
        }
      ]
    };

    if (!rolePermissions[roleName]) {
      return res.status(404).json({
        error: 'Rol no encontrado',
        message: 'El rol especificado no existe'
      });
    }

    // Verificar que el usuario puede ver estos permisos
    if (!canUserViewRole(req.user.role, roleName)) {
      return sendForbidden(res, 'No tienes permisos para ver los permisos de este rol');
    }

    return sendSuccess(res, {
      role: roleName,
      permissions: rolePermissions[roleName]
    });

  } catch (error) {
    next(error);
  }
});

// Función auxiliar para verificar si un usuario puede ver un rol
function canUserViewRole(userRole, targetRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 999;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 999;
  return userRole === 'admin' || userLevel <= targetLevel;
}

// Verificar si un usuario tiene un permiso específico
router.post('/check-permission', authenticateToken, async (req, res, next) => {
  try {
    const { resource, action, targetUserId, targetOrganizationId } = req.body;

    if (!resource || !action) {
      return sendError(res, 'Parámetros requeridos', 'Se requieren resource y action', 400);
    }

    let hasPermission = false;
    let reason = '';

    // Super admin tiene todos los permisos
    if (req.user.role === 'super_admin') {
      hasPermission = true;
      reason = 'Super administrador tiene todos los permisos';
    }
    // Admin tiene permisos en su organización
    else if (req.user.role === 'admin') {
      switch (resource) {
        case 'users':
          if (['read', 'create', 'update', 'deactivate'].includes(action)) {
            // Si se especifica un usuario objetivo, verificar que esté en la misma organización
            if (targetUserId) {
              const { data: targetUser } = await db.getClient()
                .from('users')
                .select('organization_id, role')
                .eq('id', targetUserId)
                .single();

              if (targetUser && targetUser.organization_id === req.user.organizationId) {
                // Admin no puede gestionar otros admins o super_admins
                if (['admin', 'super_admin'].includes(targetUser.role) && action !== 'read') {
                  hasPermission = false;
                  reason = 'No puedes gestionar usuarios con rol de admin o superior';
                } else {
                  hasPermission = true;
                  reason = 'Permiso de administrador en la organización';
                }
              } else {
                hasPermission = false;
                reason = 'El usuario objetivo no pertenece a tu organización';
              }
            } else {
              hasPermission = true;
              reason = 'Permiso de administrador en la organización';
            }
          }
          break;
        case 'organization':
          if (['read', 'update'].includes(action)) {
            if (!targetOrganizationId || targetOrganizationId === req.user.organizationId) {
              hasPermission = true;
              reason = 'Permiso de administrador en la organización';
            } else {
              hasPermission = false;
              reason = 'No puedes gestionar otras organizaciones';
            }
          }
          break;
        case 'profile':
          if (['read', 'update'].includes(action)) {
            hasPermission = true;
            reason = 'Permiso básico de usuario';
          }
          break;
        case 'stats':
          if (action === 'read') {
            hasPermission = true;
            reason = 'Permiso de administrador para ver estadísticas';
          }
          break;
      }
    }
    // Usuario básico solo puede gestionar su perfil
    else if (req.user.role === 'user') {
      if (resource === 'profile' && ['read', 'update'].includes(action)) {
        if (!targetUserId || targetUserId === req.user.id) {
          hasPermission = true;
          reason = 'Permiso básico de usuario para su propio perfil';
        } else {
          hasPermission = false;
          reason = 'Solo puedes gestionar tu propio perfil';
        }
      }
    }

    if (!hasPermission && !reason) {
      reason = 'Permiso no definido para este rol y recurso';
    }

    return sendSuccess(res, {
      hasPermission,
      reason,
      user: {
        id: req.user.id,
        role: req.user.role,
        organizationId: req.user.organizationId
      },
      request: {
        resource,
        action,
        targetUserId,
        targetOrganizationId
      }
    });

  } catch (error) {
    next(error);
  }
});

// Obtener usuarios con un rol específico en una organización
router.get('/:roleName/users', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const { roleName } = req.params;
    const organizationId = req.query.organizationId || req.user.organizationId;

    if (req.user.role !== 'super_admin' && organizationId !== req.user.organizationId) {
      return sendForbidden(res, 'No tienes permisos para ver usuarios de otras organizaciones');
    }

    let query = db.getClient()
      .from('users')
      .select('id, email, first_name, last_name, is_active, created_at, last_login_at')
      .eq('role', roleName);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: users, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      return sendError(res, 'Error obteniendo usuarios', 'No se pudieron obtener los usuarios con este rol', 500);
    }

    return sendSuccess(res, {
      role: roleName,
      organizationId,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLogin: user.last_login_at
      }))
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;