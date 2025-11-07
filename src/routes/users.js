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

  await createAuditLog({
    userId: req.user.id,
    action: 'user_created',
    ipAddress: req.ip,
    details: { newUserId: newUser.id, email: newUser.email }
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
    result = await getPaginated('v_users_with_franchises', { page, limit, filters });
  }

  res.json({ success: true, data: paginatedResponse(result.data.map(mapUser), result.count, page, limit) });
}));

/**
 * GET /api/users/:id
 */
router.get('/:id', requirePermission('users.view'), catchAsync(async (req, res) => {
  const user = await getOne('v_users_with_franchises', { id: req.params.id }, 'Usuario no encontrado');
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
 * GET /api/users/:id/permissions
 */
router.get('/:id/permissions', requirePermission('permissions.view'), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { applicationId } = req.query;

  const result = applicationId
    ? await query(
        `SELECT permission_id, permission_code, permission_display_name, permission_category, 
                application_id, application_name, application_code, assigned_at, expires_at, is_active
         FROM auth_gangazon.v_auth_user_permissions_by_app 
         WHERE user_id = $1 AND application_id = $2`,
        [id, applicationId]
      )
    : await query(
        `SELECT permission_id, permission_code, permission_display_name, permission_category,
                application_id, application_name, application_code, assigned_at, expires_at, is_active
         FROM auth_gangazon.v_auth_user_permissions_by_app 
         WHERE user_id = $1`,
        [id]
      );

  res.json({
    success: true,
    data: {
      permissions: result.rows.map(p => ({
        permissionId: p.permission_id,
        permissionCode: p.permission_code,
        permissionName: p.permission_display_name,
        category: p.permission_category,
        applicationId: p.application_id,
        applicationName: p.application_name,
        assignedAt: p.assigned_at,
        expiresAt: p.expires_at
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
  await checkExists('user_app_permissions', { user_id: id, application_id: applicationId, permission_id: permissionId }, 'El usuario ya tiene este permiso asignado');

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

module.exports = router;
