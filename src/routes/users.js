const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const authUtils = require('../utils/auth');
const { authenticateToken, requireRole, requireOrgAccess } = require('../middleware/auth');
const { createUserSchema, updateUserSchema } = require('../validators/schemas');
const { getGangazonOrganization } = require('../utils/permissions');
const { v4: uuidv4 } = require('uuid');
const { sendSuccess, sendError, sendNotFound, sendCreated, sendConflict, sendForbidden, sendPaginated } = require('../utils/responseHelpers');
const { validate, validatePagination } = require('../middleware/validation');
const { recordExists, getLocationWithFranchise } = require('../utils/queryHelpers');
const { canManageUser } = require('../utils/accessControl');

// Crear nuevo usuario (ADMIN o FRANCHISEE)
// Este es el endpoint correcto para crear usuarios en el sistema
// Requiere franchiseId excepto para rol admin
router.post('/', authenticateToken, requireRole(['admin', 'franchisee']), validate(createUserSchema), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, franchiseId, locationId, startDate, phone } = req.body;

    // Verificar si el usuario ya existe
    const exists = await recordExists('users', { email });
    if (exists) {
      return sendConflict(res, 'Ya existe un usuario con este email');
    }

    // Obtener organización Gangazon (única organización)
    const organizationId = await getGangazonOrganization();

    // Si se proporciona franchiseId, verificar que existe
    if (franchiseId) {
      const franchiseExists = await recordExists('franchises', { id: franchiseId });
      if (!franchiseExists) {
        return sendNotFound(res, 'Franquicia');
      }

      // Si el usuario es franchisee, verificar permisos
      if (req.user.role === 'franchisee') {
        const { data: userFranchises } = await db.getClient()
          .from('franchises')
          .select('id')
          .eq('franchisee_email', req.user.email);

        const franchiseIds = (userFranchises || []).map(f => f.id);
        if (!franchiseIds.includes(franchiseId)) {
          return sendForbidden(res, 'No tienes permisos para crear usuarios en esta franquicia');
        }
      }
    }

    // Si se proporciona locationId, verificar que existe y pertenece a la franquicia
    let locationData = null;
    if (locationId) {
      locationData = await getLocationWithFranchise(locationId);
      if (!locationData) {
        return sendNotFound(res, 'Local');
      }

      if (franchiseId && locationData.franchise_id !== franchiseId) {
        return sendError(res, 'Local inválido', 'El local no pertenece a la franquicia especificada', 400);
      }
    }

    // Hash de la contraseña
    const hashedPassword = await authUtils.hashPassword(password);

    // Crear usuario
    const { data: user, error: userError } = await db.getClient()
      .from('users')
      .insert({
        id: uuidv4(),
        email,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        organization_id: organizationId,
        role: role || 'employee',
        phone,
        is_active: true,
        email_verified: false,
        created_at: new Date().toISOString()
      })
      .select('id, email, first_name, last_name, role, organization_id, is_active, created_at')
      .single();

    if (userError) {
      logger.error('Error creando usuario:', userError);
      return sendError(res, 'Error creando usuario', 'No se pudo crear el usuario', 500);
    }

    // Crear asignación automática si se proporcionó locationId
    let assignment = null;
    if (locationId && ['manager', 'supervisor', 'employee', 'viewer'].includes(role)) {
      const { data: newAssignment, error: assignmentError } = await db.getClient()
        .from('employee_assignments')
        .insert({
          id: uuidv4(),
          user_id: user.id,
          location_id: locationId,
          role_at_location: role === 'manager' ? 'manager' : role === 'supervisor' ? 'supervisor' : 'employee',
          start_date: startDate || new Date().toISOString().split('T')[0],
          shift_type: 'full_time',
          assigned_by: req.user.id,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select('id, location_id, role_at_location, start_date')
        .single();

      if (!assignmentError && newAssignment) {
        assignment = {
          id: newAssignment.id,
          locationId: newAssignment.location_id,
          locationName: locationData?.name,
          roleAtLocation: newAssignment.role_at_location,
          startDate: newAssignment.start_date
        };
      }
    }

    logger.info(`Usuario creado: ${email} por ${req.user.email}`);

    let note = null;
    if (!assignment) {
      if (!franchiseId) {
        note = 'Usuario admin creado sin asignación de franquicia';
      } else if (!locationId) {
        note = 'Usuario creado. Asígnalo a un local específico vía POST /api/assignments';
      }
    }

    return sendCreated(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id,
        isActive: user.is_active,
        createdAt: user.created_at
      },
      assignment,
      note
    }, assignment ? 'Usuario creado y asignado exitosamente' : 'Usuario creado exitosamente');

  } catch (error) {
    next(error);
  }
});

// Obtener perfil del usuario actual
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const { data: user, error } = await db.getClient()
      .from('users')
      .select(`
        id, 
        email, 
        first_name, 
        last_name, 
        role, 
        organization_id,
        is_active,
        email_verified,
        created_at,
        last_login_at,
        organizations(name, description)
      `)
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return sendNotFound(res, 'Usuario');
    }

    return sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id,
        organization: user.organizations,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// Actualizar perfil del usuario actual
router.put('/me', authenticateToken, validate(updateUserSchema), async (req, res, next) => {
  try {
    const updateData = {};
    if (req.body.firstName) updateData.first_name = req.body.firstName;
    if (req.body.lastName) updateData.last_name = req.body.lastName;
    if (req.body.email) updateData.email = req.body.email;
    
    updateData.updated_at = new Date().toISOString();

    const { data: user, error: updateError } = await db.getClient()
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .select('id, email, first_name, last_name, role, organization_id')
      .single();

    if (updateError) {
      return sendError(res, 'Error actualizando usuario', 'No se pudo actualizar el usuario', 500);
    }

    logger.info(`Usuario actualizado: ${user.email}`);

    return sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id
      }
    }, 'Perfil actualizado exitosamente');

  } catch (error) {
    next(error);
  }
});

// Listar usuarios (solo para admins)
router.get('/', authenticateToken, requireRole(['admin']), validatePagination, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const role = req.query.role || '';

    const offset = (page - 1) * limit;

    let query = db.getClient()
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        organization_id,
        is_active,
        email_verified,
        created_at,
        last_login_at,
        organizations(name)
      `, { count: 'exact' });

    query = query.eq('organization_id', req.user.organizationId);

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq('role', role);
    }

    const { data: users, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return sendError(res, 'Error obteniendo usuarios', 'No se pudieron obtener los usuarios', 500);
    }

    return sendPaginated(res, 
      users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id,
        organization: user.organizations,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login_at
      })),
      count,
      page,
      limit,
      'users'
    );

  } catch (error) {
    next(error);
  }
});

// Obtener usuario por ID (solo para admins)
router.get('/:userId', authenticateToken, requireRole(['admin']), requireOrgAccess, async (req, res, next) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await db.getClient()
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        organization_id,
        is_active,
        email_verified,
        created_at,
        last_login_at,
        organizations(name, description)
      `)
      .eq('id', userId)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (error || !user) {
      return sendNotFound(res, 'Usuario');
    }

    return sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id,
        organization: user.organizations,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// Actualizar usuario (solo para admins)
router.put('/:userId', authenticateToken, requireRole(['admin']), requireOrgAccess, validate(updateUserSchema), async (req, res, next) => {
  try {
    const { userId } = req.params;

    const { data: existingUser, error: userError } = await db.getClient()
      .from('users')
      .select('id, organization_id, role')
      .eq('id', userId)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (userError || !existingUser) {
      return sendNotFound(res, 'Usuario');
    }

    // Validaciones de permisos para cambio de rol
    if (req.body.role && req.body.role !== existingUser.role) {
      if (!canManageUser(req.user, existingUser)) {
        return sendForbidden(res, 'No puedes modificar usuarios con rol de admin');
      }
    }

    const updateData = {};
    if (req.body.firstName) updateData.first_name = req.body.firstName;
    if (req.body.lastName) updateData.last_name = req.body.lastName;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.role) updateData.role = req.body.role;
    if (req.body.isActive !== undefined) updateData.is_active = req.body.isActive;
    
    updateData.updated_at = new Date().toISOString();

    const { data: user, error: updateError } = await db.getClient()
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, first_name, last_name, role, organization_id, is_active')
      .single();

    if (updateError) {
      return sendError(res, 'Error actualizando usuario', 'No se pudo actualizar el usuario', 500);
    }

    logger.info(`Usuario ${userId} actualizado por ${req.user.email}`);

    return sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id,
        isActive: user.is_active
      }
    }, 'Usuario actualizado exitosamente');

  } catch (error) {
    next(error);
  }
});

// Desactivar usuario (solo para admins)
router.delete('/:userId', authenticateToken, requireRole(['admin']), requireOrgAccess, async (req, res, next) => {
  try {
    const { userId } = req.params;

    const { data: existingUser, error: userError } = await db.getClient()
      .from('users')
      .select('id, organization_id, role, email')
      .eq('id', userId)
      .eq('organization_id', req.user.organizationId)
      .single();

    if (userError || !existingUser) {
      return sendNotFound(res, 'Usuario');
    }

    if (existingUser.id === req.user.id) {
      return sendError(res, 'Operación no permitida', 'No puedes desactivar tu propia cuenta', 400);
    }

    if (!canManageUser(req.user, existingUser)) {
      return sendForbidden(res, 'No puedes desactivar usuarios con rol de admin');
    }

    const { error: updateError } = await db.getClient()
      .from('users')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      return sendError(res, 'Error desactivando usuario', 'No se pudo desactivar el usuario', 500);
    }

    await db.getClient()
      .from('refresh_tokens')
      .delete()
      .eq('user_id', userId);

    logger.info(`Usuario ${existingUser.email} desactivado por ${req.user.email}`);

    return sendSuccess(res, {}, 'Usuario desactivado exitosamente');

  } catch (error) {
    next(error);
  }
});

module.exports = router;