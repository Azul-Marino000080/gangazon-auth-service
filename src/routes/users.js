const express = require('express');
const bcrypt = require('bcryptjs');
const { createClient } = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validation');
const { createUserSchema, updateUserSchema, assignPermissionSchema, revokePermissionSchema } = require('../validators/schemas');
const { authenticateToken, requirePermission, requireSuperAdmin } = require('../middleware/auth');
const { getOne, buildPaginatedQuery, applyFilters, createAuditLog, mapUser, paginatedResponse, checkExists } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

/**
 * POST /api/users
 */
router.post('/', requirePermission('users.create'), validate(createUserSchema), catchAsync(async (req, res) => {
  const { email, password, firstName, lastName, phone, franchiseId } = req.body;
  const supabase = createClient();

  // Verificar email único
  await checkExists('users', { email: email.toLowerCase() }, 'El email ya está registrado');

  // Verificar franquicia si se proporciona
  if (franchiseId) {
    await getOne('franchises', { id: franchiseId }, 'Franquicia no encontrada');
  }

  // Crear usuario
  const { data: newUser, error } = await supabase.from('users').insert({
    email: email.toLowerCase(),
    password_hash: await bcrypt.hash(password, 12),
    first_name: firstName,
    last_name: lastName,
    phone: phone || null,
    franchise_id: franchiseId || null
  }).select().single();

  if (error) throw new AppError('Error al crear usuario', 500);

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
  let query = buildPaginatedQuery('v_users_with_franchises', { page, limit });

  if (franchiseId) query = query.eq('franchise_id', franchiseId);
  if (search) query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  if (isActive !== undefined) query = query.eq('is_active', isActive === 'true');

  query = query.order('created_at', { ascending: false });
  const { data: users, count, error } = await query;

  if (error) throw new AppError('Error al obtener usuarios', 500);

  res.json({ success: true, data: paginatedResponse(users.map(mapUser), count, page, limit) });
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
  const supabase = createClient();

  const existingUser = await getOne('users', { id }, 'Usuario no encontrado');

  const updateData = {};
  if (firstName !== undefined) updateData.first_name = firstName;
  if (lastName !== undefined) updateData.last_name = lastName;
  if (phone !== undefined) updateData.phone = phone;
  if (isActive !== undefined) updateData.is_active = isActive;

  const { data: updatedUser, error } = await supabase.from('users').update(updateData).eq('id', id).select().single();
  if (error) throw new AppError('Error al actualizar usuario', 500);

  await createAuditLog({ userId: req.user.id, action: 'user_updated', ipAddress: req.ip, details: { updatedUserId: id, changes: updateData } });

  logger.info(`Usuario actualizado: ${existingUser.email} por ${req.user.email}`);
  res.json({ success: true, data: { user: mapUser(updatedUser) } });
}));

/**
 * DELETE /api/users/:id
 */
router.delete('/:id', requireSuperAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) throw new AppError('No puedes eliminar tu propio usuario', 400);

  const supabase = createClient();
  const existingUser = await getOne('users', { id }, 'Usuario no encontrado');

  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw new AppError('Error al eliminar usuario', 500);

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
  const supabase = createClient();

  let query = supabase
    .from('v_user_permissions_by_app')
    .select('permission_id, permission_code, permission_display_name, permission_category, application_id, application_name, application_code, assigned_at, expires_at, is_active')
    .eq('user_id', id);
  if (applicationId) query = query.eq('application_id', applicationId);

  const { data: permissions, error } = await query;
  if (error) throw new AppError('Error al obtener permisos', 500);

  res.json({
    success: true,
    data: {
      permissions: permissions.map(p => ({
        permissionId: p.permission_id,
        permissionCode: p.permission_code,
        permissionName: p.permission_name,
        category: p.category,
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
  const supabase = createClient();

  const user = await getOne('users', { id }, 'Usuario no encontrado');
  const permission = await getOne('permissions', { id: permissionId, application_id: applicationId }, 'Permiso no encontrado o no pertenece a la aplicación');

  // Validar que expiresAt sea una fecha futura (si se proporciona)
  if (expiresAt) {
    const expirationDate = new Date(expiresAt);
    if (expirationDate <= new Date()) {
      throw new AppError('La fecha de expiración debe ser futura', 400);
    }
  }

  // Verificar si ya tiene el permiso
  await checkExists('user_app_permissions', { user_id: id, application_id: applicationId, permission_id: permissionId }, 'El usuario ya tiene este permiso asignado');

  const { error } = await supabase.from('user_app_permissions').insert({
    user_id: id,
    application_id: applicationId,
    permission_id: permissionId,
    expires_at: expiresAt || null
  });

  if (error) throw new AppError('Error al asignar permiso', 500);

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
  const supabase = createClient();

  const user = await getOne('users', { id }, 'Usuario no encontrado');
  const { data: permission } = await supabase.from('permissions').select('code').eq('id', permissionId).single();

  const { error } = await supabase.from('user_app_permissions').delete()
    .eq('user_id', id).eq('application_id', applicationId).eq('permission_id', permissionId);

  if (error) throw new AppError('Error al revocar permiso', 500);

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
