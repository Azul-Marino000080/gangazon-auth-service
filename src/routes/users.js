const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validation');
const { createUserSchema, updateUserSchema, assignPermissionSchema, revokePermissionSchema } = require('../validators/schemas');
const { authenticateToken, requirePermission, requireSuperAdmin } = require('../middleware/auth');
const { getOne, getPaginated, createAuditLog, mapUser, paginatedResponse, checkExists } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

/**
 * POST /api/users
 */
router.post('/', requirePermission('users.create'), validate(createUserSchema), catchAsync(async (req, res) => {
  const { email, password, firstName, lastName, phone, franchiseId } = req.body;

  // Verificar email único
  await checkExists('auth_gangazon.auth_users', { email: email.toLowerCase() }, 'El email ya está registrado');

  // Verificar franquicia si se proporciona
  if (franchiseId) {
    await getOne('auth_gangazon.auth_franchises', { id: franchiseId }, 'Franquicia no encontrada');
  }

  // Crear usuario
  const result = await query(
    `INSERT INTO auth_gangazon.auth_users (email, password_hash, first_name, last_name, phone, franchise_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [email.toLowerCase(), await bcrypt.hash(password, 12), firstName, lastName, phone || null, franchiseId || null]
  );

  const newUser = result.rows[0];

  // Si es un usuario franquiciado, asignar acceso a FRANCHISEE_PANEL automáticamente
  if (franchiseId) {
    try {
      // Obtener el permiso de acceso a FRANCHISEE_PANEL
      const permResult = await query(
        `SELECT p.id, p.application_id
         FROM auth_gangazon.auth_permissions p
         JOIN auth_gangazon.auth_applications a ON p.application_id = a.id
         WHERE a.code = $1 AND p.code = 'app.access'`,
        ['FRANCHISEE_PANEL']
      );

      if (permResult.rows.length > 0) {
        const perm = permResult.rows[0];

        // Asignar acceso a FRANCHISEE_PANEL
        await query(
          `INSERT INTO auth_gangazon.auth_user_app_permissions (user_id, application_id, permission_id, is_active)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (user_id, application_id, permission_id) DO NOTHING`,
          [newUser.id, perm.application_id, perm.id]
        );

        logger.info(`Acceso a FRANCHISEE_PANEL asignado automáticamente a ${newUser.email}`);
      }
    } catch (error) {
      logger.warn(`No se pudo asignar acceso a FRANCHISEE_PANEL a ${newUser.email}: ${error.message}`);
      // No fallar la creación del usuario si falla la asignación de permisos
    }
  }

  await createAuditLog({
    userId: req.user.id,
    action: 'user_created',
    ipAddress: req.ip,
    details: { newUserId: newUser.id, email: newUser.email, franchiseId }
  });

  logger.info(`Usuario creado: ${newUser.email} por ${req.user.email}`);
  res.status(201).json({ success: true, data: { user: mapUser(newUser) } });
}));

/**
 * GET /api/users
 */
router.get('/', requirePermission('users.view'), catchAsync(async (req, res) => {
  const { page = 1, limit = 20, franchiseId, search, isActive } = req.query;

  const filters = {};
  if (franchiseId) filters.franchise_id = franchiseId;
  if (isActive !== undefined) filters.is_active = isActive === 'true';

  // Si hay búsqueda, usar query personalizada
  let result;
  if (search) {
    const offset = (page - 1) * limit;
    const searchPattern = `%${search}%`;
    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT * FROM auth_gangazon.v_auth_users_with_franchises 
         WHERE (email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)
         ${franchiseId ? 'AND franchise_id = $4' : ''}
         ${isActive !== undefined ? `AND is_active = $${franchiseId ? 5 : 4}` : ''}
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        franchiseId && isActive !== undefined
          ? [searchPattern, limit, offset, franchiseId, isActive === 'true']
          : franchiseId
          ? [searchPattern, limit, offset, franchiseId]
          : isActive !== undefined
          ? [searchPattern, limit, offset, isActive === 'true']
          : [searchPattern, limit, offset]
      ),
      query(
        `SELECT COUNT(*) as total FROM auth_gangazon.v_auth_users_with_franchises 
         WHERE (email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)
         ${franchiseId ? 'AND franchise_id = $2' : ''}
         ${isActive !== undefined ? `AND is_active = $${franchiseId ? 3 : 2}` : ''}`,
        franchiseId && isActive !== undefined
          ? [searchPattern, franchiseId, isActive === 'true']
          : franchiseId
          ? [searchPattern, franchiseId]
          : isActive !== undefined
          ? [searchPattern, isActive === 'true']
          : [searchPattern]
      )
    ]);
    result = { data: dataResult.rows, count: parseInt(countResult.rows[0].total) };
  } else {
    result = await getPaginated('auth_gangazon.v_auth_users_with_franchises', { page, limit, filters });
  }

  res.json({ success: true, data: paginatedResponse(result.data.map(mapUser), result.count, page, limit) });
}));

/**
 * GET /api/users/:id
 */
router.get('/:id', requirePermission('users.view'), catchAsync(async (req, res) => {
  const user = await getOne('auth_gangazon.v_auth_users_with_franchises', { id: req.params.id }, 'Usuario no encontrado');
  res.json({ success: true, data: { user: mapUser(user) } });
}));

/**
 * PUT /api/users/:id
 */
router.put('/:id', requirePermission('users.edit'), validate(updateUserSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, phone, isActive } = req.body;

  const existingUser = await getOne('auth_gangazon.auth_users', { id }, 'Usuario no encontrado');

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (firstName !== undefined) {
    updates.push(`first_name = $${paramIndex++}`);
    values.push(firstName);
  }
  if (lastName !== undefined) {
    updates.push(`last_name = $${paramIndex++}`);
    values.push(lastName);
  }
  if (phone !== undefined) {
    updates.push(`phone = $${paramIndex++}`);
    values.push(phone);
  }
  if (isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(isActive);
  }

  if (updates.length === 0) {
    return res.json({ success: true, data: { user: mapUser(existingUser) } });
  }

  values.push(id);
  const result = await query(
    `UPDATE auth_gangazon.auth_users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  const updatedUser = result.rows[0];
  await createAuditLog({ userId: req.user.id, action: 'user_updated', ipAddress: req.ip, details: { updatedUserId: id, changes: req.body } });

  logger.info(`Usuario actualizado: ${existingUser.email} por ${req.user.email}`);
  res.json({ success: true, data: { user: mapUser(updatedUser) } });
}));

/**
 * DELETE /api/users/:id
 */
router.delete('/:id', requireSuperAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) throw new AppError('No puedes eliminar tu propio usuario', 400);

  const existingUser = await getOne('auth_gangazon.auth_users', { id }, 'Usuario no encontrado');

  await query('DELETE FROM auth_gangazon.auth_users WHERE id = $1', [id]);

  await createAuditLog({ userId: req.user.id, action: 'user_deleted', ipAddress: req.ip, details: { deletedUserId: id, deletedEmail: existingUser.email } });

  logger.warn(`Usuario eliminado: ${existingUser.email} por ${req.user.email}`);
  res.json({ success: true, message: 'Usuario eliminado correctamente' });
}));

/**
 * GET /api/users/:id/applications
 * Obtiene las aplicaciones a las que el usuario tiene acceso
 */
router.get('/:id/applications', catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `SELECT 
      a.id as application_id,
      a.code as application_code,
      a.name as application_name,
      a.description,
      a.redirect_url,
      uap.assigned_at,
      uap.expires_at,
      uap.is_active
     FROM auth_gangazon.auth_user_app_permissions uap
     JOIN auth_gangazon.auth_applications a ON uap.application_id = a.id
     JOIN auth_gangazon.auth_permissions p ON uap.permission_id = p.id
     WHERE uap.user_id = $1 AND p.code = 'app.access' AND uap.is_active = true`,
    [id]
  );

  res.json({
    success: true,
    data: {
      applications: result.rows.map(app => ({
        applicationId: app.application_id,
        applicationCode: app.application_code,
        applicationName: app.application_name,
        description: app.description,
        redirectUrl: app.redirect_url,
        assignedAt: app.assigned_at,
        expiresAt: app.expires_at
      }))
    }
  });
}));

/**
 * GET /api/users/:id/permissions (DEPRECATED - usar /applications)
 */
router.get('/:id/permissions', catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `SELECT 
      a.id as application_id,
      a.code as application_code,
      a.name as application_name,
      p.code as permission_code,
      uap.assigned_at
     FROM auth_gangazon.auth_user_app_permissions uap
     JOIN auth_gangazon.auth_applications a ON uap.application_id = a.id
     JOIN auth_gangazon.auth_permissions p ON uap.permission_id = p.id
     WHERE uap.user_id = $1 AND uap.is_active = true`,
    [id]
  );

  res.json({
    success: true,
    data: {
      permissions: result.rows.map(p => ({
        permissionCode: p.permission_code,
        applicationId: p.application_id,
        applicationCode: p.application_code,
        applicationName: p.application_name,
        assignedAt: p.assigned_at
      }))
    }
  });
}));

/**
 * POST /api/users/:id/assign
 */
router.post('/:id/assign', requirePermission('permissions.assign'), validate(assignPermissionSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { applicationId, permissionId, expiresAt } = req.body;

  const user = await getOne('auth_gangazon.auth_users', { id }, 'Usuario no encontrado');
  const permission = await getOne('auth_gangazon.auth_permissions', { id: permissionId, application_id: applicationId }, 'Permiso no encontrado o no pertenece a la aplicación');

  // Validar que expiresAt sea una fecha futura (si se proporciona)
  if (expiresAt) {
    const expirationDate = new Date(expiresAt);
    if (expirationDate <= new Date()) {
      throw new AppError('La fecha de expiración debe ser futura', 400);
    }
  }

  // Verificar si ya tiene el permiso
  await checkExists('auth_gangazon.auth_user_app_permissions', { user_id: id, application_id: applicationId, permission_id: permissionId }, 'El usuario ya tiene este permiso asignado');

  await query(
    'INSERT INTO auth_gangazon.auth_user_app_permissions (user_id, application_id, permission_id, expires_at) VALUES ($1, $2, $3, $4)',
    [id, applicationId, permissionId, expiresAt || null]
  );

  await createAuditLog({
    userId: req.user.id,
    applicationId,
    action: 'permission_assigned',
    ipAddress: req.ip,
    details: { targetUserId: id, targetUserEmail: user.email, permissionCode: permission.code, expiresAt }
  });

  logger.info(`Permiso ${permission.code} asignado a ${user.email} por ${req.user.email}`);
  res.status(201).json({ success: true, message: 'Permiso asignado correctamente' });
}));

/**
 * DELETE /api/users/:id/revoke
 */
router.delete('/:id/revoke', requirePermission('permissions.assign'), validate(revokePermissionSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { applicationId, permissionId } = req.body;

  const user = await getOne('auth_gangazon.auth_users', { id }, 'Usuario no encontrado');
  const permissionResult = await query('SELECT code FROM auth_gangazon.auth_permissions WHERE id = $1', [permissionId]);
  const permission = permissionResult.rows[0];

  await query(
    'DELETE FROM auth_gangazon.auth_user_app_permissions WHERE user_id = $1 AND application_id = $2 AND permission_id = $3',
    [id, applicationId, permissionId]
  );

  await createAuditLog({
    userId: req.user.id,
    applicationId,
    action: 'permission_revoked',
    ipAddress: req.ip,
    details: { targetUserId: id, targetUserEmail: user.email, permissionCode: permission?.code }
  });

  logger.info(`Permiso ${permission?.code} revocado de ${user.email} por ${req.user.email}`);
  res.json({ success: true, message: 'Permiso revocado correctamente' });
}));

/**
 * POST /api/users/:id/grant-access
 * Otorga acceso a una aplicación (sistema simplificado)
 */
router.post('/:id/grant-access', catchAsync(async (req, res) => {
  const { id } = req.params;
  const { applicationCode } = req.body;

  if (!applicationCode) {
    throw new AppError('El código de aplicación es requerido', 400);
  }

  const user = await getOne('auth_gangazon.auth_users', { id }, 'Usuario no encontrado');
  
  // Obtener el permiso de acceso a la aplicación
  const permResult = await query(
    `SELECT p.id as permission_id, p.application_id, a.name as app_name
     FROM auth_gangazon.auth_permissions p
     JOIN auth_gangazon.auth_applications a ON p.application_id = a.id
     WHERE a.code = $1 AND p.code = 'app.access'`,
    [applicationCode]
  );

  if (permResult.rows.length === 0) {
    throw new AppError('Aplicación no encontrada', 404);
  }

  const { permission_id, application_id, app_name } = permResult.rows[0];

  // Verificar si ya tiene acceso
  const existingAccess = await query(
    'SELECT id FROM auth_gangazon.auth_user_app_permissions WHERE user_id = $1 AND application_id = $2',
    [id, application_id]
  );

  if (existingAccess.rows.length > 0) {
    return res.json({ success: true, message: 'El usuario ya tiene acceso a esta aplicación' });
  }

  // Otorgar acceso
  await query(
    'INSERT INTO auth_gangazon.auth_user_app_permissions (user_id, application_id, permission_id, is_active) VALUES ($1, $2, $3, true)',
    [id, application_id, permission_id]
  );

  await createAuditLog({
    userId: req.user.id,
    applicationId: application_id,
    action: 'access_granted',
    ipAddress: req.ip,
    details: { targetUserId: id, targetUserEmail: user.email, applicationCode, applicationName: app_name }
  });

  logger.info(`Acceso a ${applicationCode} otorgado a ${user.email} por ${req.user.email}`);
  res.status(201).json({ success: true, message: `Acceso a ${app_name} otorgado correctamente` });
}));

/**
 * DELETE /api/users/:id/revoke-access
 * Revoca acceso a una aplicación (sistema simplificado)
 */
router.delete('/:id/revoke-access', catchAsync(async (req, res) => {
  const { id } = req.params;
  const { applicationCode } = req.body;

  if (!applicationCode) {
    throw new AppError('El código de aplicación es requerido', 400);
  }

  const user = await getOne('auth_gangazon.auth_users', { id }, 'Usuario no encontrado');
  
  const appResult = await query(
    'SELECT id, name FROM auth_gangazon.auth_applications WHERE code = $1',
    [applicationCode]
  );

  if (appResult.rows.length === 0) {
    throw new AppError('Aplicación no encontrada', 404);
  }

  const { id: application_id, name: app_name } = appResult.rows[0];

  await query(
    'DELETE FROM auth_gangazon.auth_user_app_permissions WHERE user_id = $1 AND application_id = $2',
    [id, application_id]
  );

  await createAuditLog({
    userId: req.user.id,
    applicationId: application_id,
    action: 'access_revoked',
    ipAddress: req.ip,
    details: { targetUserId: id, targetUserEmail: user.email, applicationCode, applicationName: app_name }
  });

  logger.info(`Acceso a ${applicationCode} revocado de ${user.email} por ${req.user.email}`);
  res.json({ success: true, message: `Acceso a ${app_name} revocado correctamente` });
}));

module.exports = router;
