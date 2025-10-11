const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Obtener todos los roles disponibles
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const roles = [
      {
        name: 'user',
        displayName: 'Usuario',
        description: 'Usuario básico con permisos limitados',
        permissions: ['read_own_profile', 'update_own_profile']
      },
      // Roles de Casa Matriz (Franquiciador)
      {
        name: 'franchisor_ceo',
        displayName: 'CEO/Director General',
        description: 'Máxima autoridad de la empresa, acceso total',
        permissions: ['all_permissions']
      },
      {
        name: 'franchisor_admin',
        displayName: 'Administrador Central',
        description: 'Administrador de casa matriz con acceso a todas las franquicias',
        permissions: ['manage_all_franchises', 'manage_all_users', 'view_all_reports', 'system_settings']
      },
      {
        name: 'franchisor_supervisor',
        displayName: 'Supervisor de Franquicias',
        description: 'Supervisor de casa matriz que monitorea franquicias',
        permissions: ['view_all_franchises', 'view_all_reports', 'support_franchises']
      },
      {
        name: 'franchisor_support',
        displayName: 'Soporte Técnico',
        description: 'Personal de soporte técnico para franquicias',
        permissions: ['view_franchise_issues', 'technical_support', 'basic_reports']
      },
      // Roles de Franquicia
      {
        name: 'franchisee_owner',
        displayName: 'Propietario de Franquicia',
        description: 'Dueño de la franquicia con acceso total a sus locales',
        permissions: ['manage_own_franchise', 'manage_own_locations', 'manage_franchise_users', 'franchise_reports']
      },
      {
        name: 'franchisee_admin',
        displayName: 'Administrador de Franquicia',
        description: 'Administrador de la franquicia, gestiona operaciones',
        permissions: ['manage_own_locations', 'manage_location_users', 'franchise_reports', 'employee_assignments']
      },
      {
        name: 'franchisee_accountant',
        displayName: 'Contable de Franquicia',
        description: 'Contable de la franquicia, acceso a reportes financieros',
        permissions: ['view_franchise_reports', 'financial_reports', 'payroll_reports']
      },
      // Roles de Local
      {
        name: 'location_manager',
        displayName: 'Gerente de Local',
        description: 'Gerente del local con permisos de gestión local',
        permissions: ['manage_location', 'manage_location_employees', 'location_reports', 'employee_schedules']
      },
      {
        name: 'location_supervisor',
        displayName: 'Supervisor de Local',
        description: 'Supervisor del local, ayuda en la gestión',
        permissions: ['supervise_location', 'view_location_reports', 'employee_checkins']
      },
      {
        name: 'location_employee',
        displayName: 'Empleado de Local',
        description: 'Empleado del local con permisos básicos',
        permissions: ['checkin_checkout', 'view_own_schedule', 'basic_location_access']
      },
      {
        name: 'location_temp',
        displayName: 'Empleado Temporal',
        description: 'Empleado temporal/rotativo con permisos limitados',
        permissions: ['checkin_checkout', 'basic_location_access']
      },
      // Roles legacy para retrocompatibilidad
      {
        name: 'admin',
        displayName: 'Administrador (Legacy)',
        description: 'Administrador básico - usar roles específicos de franquicia',
        permissions: ['manage_org_users', 'view_org_reports']
      },
      {
        name: 'super_admin',
        displayName: 'Super Administrador (Legacy)',
        description: 'Super administrador - usar franchisor_ceo en su lugar',
        permissions: ['all_permissions']
      }
    ];

    // Filtrar roles según el usuario
    let availableRoles = roles;
    
    if (req.user.role === 'user' || req.user.role === 'location_employee' || req.user.role === 'location_temp') {
      availableRoles = roles.filter(role => ['user', 'location_employee', 'location_temp'].includes(role.name));
    } else if (req.user.role === 'location_supervisor') {
      availableRoles = roles.filter(role => 
        ['user', 'location_employee', 'location_temp', 'location_supervisor'].includes(role.name)
      );
    } else if (req.user.role === 'location_manager') {
      availableRoles = roles.filter(role => 
        ['user', 'location_employee', 'location_temp', 'location_supervisor', 'location_manager'].includes(role.name)
      );
    } else if (req.user.role === 'franchisee_admin' || req.user.role === 'franchisee_owner') {
      availableRoles = roles.filter(role => 
        !['franchisor_ceo', 'franchisor_admin', 'franchisor_supervisor', 'super_admin'].includes(role.name)
      );
    } else if (['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      // Pueden ver todos los roles
      availableRoles = roles;
    } else {
      // Roles limitados para otros casos
      availableRoles = roles.filter(role => 
        ['user', 'location_employee', 'location_temp'].includes(role.name)
      );
    }

    res.json({
      roles: availableRoles
    });

  } catch (error) {
    next(error);
  }
});

// Obtener permisos de un rol específico
router.get('/:roleName/permissions', authenticateToken, async (req, res, next) => {
  try {
    const { roleName } = req.params;

    const rolePermissions = {
      // Roles básicos
      user: [
        {
          resource: 'profile',
          actions: ['read', 'update'],
          description: 'Gestionar su propio perfil'
        }
      ],
      
      // Roles de Casa Matriz
      franchisor_ceo: [
        {
          resource: 'all',
          actions: ['*'],
          description: 'Acceso completo al sistema',
          scope: 'global'
        }
      ],
      franchisor_admin: [
        {
          resource: 'franchises',
          actions: ['read', 'create', 'update', 'delete'],
          description: 'Gestionar todas las franquicias',
          scope: 'global'
        },
        {
          resource: 'locations',
          actions: ['read', 'create', 'update', 'delete'],
          description: 'Gestionar todos los locales',
          scope: 'global'
        },
        {
          resource: 'users',
          actions: ['read', 'create', 'update', 'delete'],
          description: 'Gestionar todos los usuarios',
          scope: 'global'
        },
        {
          resource: 'reports',
          actions: ['read', 'export'],
          description: 'Ver todos los reportes del sistema',
          scope: 'global'
        }
      ],
      franchisor_supervisor: [
        {
          resource: 'franchises',
          actions: ['read'],
          description: 'Ver todas las franquicias',
          scope: 'global'
        },
        {
          resource: 'reports',
          actions: ['read'],
          description: 'Ver reportes consolidados',
          scope: 'global'
        },
        {
          resource: 'support',
          actions: ['provide'],
          description: 'Dar soporte a franquicias'
        }
      ],
      franchisor_support: [
        {
          resource: 'franchises',
          actions: ['read'],
          description: 'Ver franquicias para soporte',
          scope: 'assigned'
        },
        {
          resource: 'support_tickets',
          actions: ['read', 'update'],
          description: 'Gestionar tickets de soporte'
        }
      ],
      
      // Roles de Franquicia
      franchisee_owner: [
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
          resource: 'reports',
          actions: ['read', 'export'],
          description: 'Ver reportes de su franquicia',
          scope: 'own_franchise'
        }
      ],
      franchisee_admin: [
        {
          resource: 'locations',
          actions: ['read', 'update'],
          description: 'Gestionar locales de la franquicia',
          scope: 'own_franchise'
        },
        {
          resource: 'users',
          actions: ['read', 'create', 'update'],
          description: 'Gestionar empleados básicos',
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
          actions: ['read', 'approve'],
          description: 'Supervisar asistencia',
          scope: 'own_franchise'
        }
      ],
      franchisee_accountant: [
        {
          resource: 'reports',
          actions: ['read', 'export'],
          description: 'Ver reportes financieros',
          scope: 'own_franchise'
        },
        {
          resource: 'payroll',
          actions: ['read', 'process'],
          description: 'Gestionar nóminas',
          scope: 'own_franchise'
        }
      ],
      
      // Roles de Local
      location_manager: [
        {
          resource: 'location',
          actions: ['read', 'update'],
          description: 'Gestionar su local',
          scope: 'assigned_locations'
        },
        {
          resource: 'users',
          actions: ['read', 'assign'],
          description: 'Gestionar empleados del local',
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
        }
      ],
      location_supervisor: [
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
        }
      ],
      location_employee: [
        {
          resource: 'profile',
          actions: ['read', 'update'],
          description: 'Gestionar su propio perfil'
        },
        {
          resource: 'checkins',
          actions: ['create'],
          description: 'Realizar check-in/check-out',
          scope: 'assigned_locations'
        },
        {
          resource: 'schedule',
          actions: ['read'],
          description: 'Ver su propio horario'
        }
      ],
      location_temp: [
        {
          resource: 'checkins',
          actions: ['create'],
          description: 'Realizar check-in/check-out',
          scope: 'assigned_locations'
        },
        {
          resource: 'schedule',
          actions: ['read'],
          description: 'Ver horario asignado'
        }
      ],
      
      // Roles legacy
      admin: [
        {
          resource: 'users',
          actions: ['read', 'create', 'update', 'deactivate'],
          description: 'Gestionar usuarios de su organización',
          scope: 'organization'
        },
        {
          resource: 'organization',
          actions: ['read', 'update'],
          description: 'Gestionar información de su organización'
        }
      ],
      super_admin: [
        {
          resource: 'all',
          actions: ['*'],
          description: 'Acceso completo al sistema (legacy)',
          scope: 'global'
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
    const userRole = req.user.role;
    const canViewRole = canUserViewRole(userRole, roleName);
    
    if (!canViewRole) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos para ver los permisos de este rol'
      });
    }

    res.json({
      role: roleName,
      permissions: rolePermissions[roleName]
    });

  } catch (error) {
    next(error);
  }
});

// Función auxiliar para verificar si un usuario puede ver un rol
function canUserViewRole(userRole, targetRole) {
  const roleHierarchy = {
    // Casa matriz puede ver todos los roles
    'franchisor_ceo': ['*'],
    'franchisor_admin': ['*'],
    'super_admin': ['*'],
    
    // Supervisor puede ver roles de franquicia y locales
    'franchisor_supervisor': [
      'franchisee_owner', 'franchisee_admin', 'franchisee_accountant',
      'location_manager', 'location_supervisor', 'location_employee', 'location_temp'
    ],
    
    // Franquicia puede ver roles de local
    'franchisee_owner': [
      'franchisee_admin', 'franchisee_accountant',
      'location_manager', 'location_supervisor', 'location_employee', 'location_temp'
    ],
    'franchisee_admin': [
      'location_manager', 'location_supervisor', 'location_employee', 'location_temp'
    ],
    
    // Local puede ver roles subordinados
    'location_manager': ['location_supervisor', 'location_employee', 'location_temp'],
    'location_supervisor': ['location_employee', 'location_temp'],
    
    // Roles básicos solo pueden ver su propio rol
    'location_employee': ['location_employee'],
    'location_temp': ['location_temp'],
    'user': ['user'],
    
    // Legacy
    'admin': ['user', 'admin'],
  };

  const allowedRoles = roleHierarchy[userRole] || [];
  return allowedRoles.includes('*') || allowedRoles.includes(targetRole) || userRole === targetRole;
}

// Verificar si un usuario tiene un permiso específico
router.post('/check-permission', authenticateToken, async (req, res, next) => {
  try {
    const { resource, action, targetUserId, targetOrganizationId } = req.body;

    if (!resource || !action) {
      return res.status(400).json({
        error: 'Parámetros requeridos',
        message: 'Se requieren resource y action'
      });
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

    res.json({
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

    // Verificar permisos
    if (req.user.role !== 'super_admin' && organizationId !== req.user.organizationId) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos para ver usuarios de otras organizaciones'
      });
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
      return res.status(500).json({
        error: 'Error obteniendo usuarios',
        message: 'No se pudieron obtener los usuarios con este rol'
      });
    }

    res.json({
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