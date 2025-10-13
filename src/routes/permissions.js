const express = require('express');
const { createClient } = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validation');
const { createPermissionSchema, updatePermissionSchema } = require('../validators/schemas');
const { authenticateToken, requirePermission, requireSuperAdmin } = require('../middleware/auth');
const { getOne, buildPaginatedQuery, createAuditLog, checkExists } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

/**
 * POST /api/permissions
 */
router.post('/', requirePermission('permissions.create'), validate(createPermissionSchema), catchAsync(async (req, res) => {
  const { applicationId, code, displayName, description, category } = req.body;
  const supabase = createClient();

  await getOne('applications', { id: applicationId }, 'Aplicación no encontrada');
  await checkExists('permissions', { application_id: applicationId, code }, 'El código de permiso ya existe para esta aplicación');

  const { data: newPermission, error } = await supabase.from('permissions').insert({
    application_id: applicationId,
    code,
    display_name: displayName,
    description: description || null,
    category: category || null
  }).select().single();

  if (error) throw new AppError('Error al crear permiso', 500);

  await createAuditLog({ userId: req.user.id, applicationId, action: 'permission_created', ipAddress: req.ip, details: { permissionCode: newPermission.code, permissionName: newPermission.display_name } });

  logger.info(`Permiso creado: ${newPermission.code} por ${req.user.email}`);
  res.status(201).json({ success: true, data: { permission: mapPermission(newPermission) } });
}));

/**
 * GET /api/permissions
 */
router.get('/', requirePermission('permissions.view'), catchAsync(async (req, res) => {
  const { page = 1, limit = 50, applicationId, category, isActive } = req.query;
  const supabase = createClient();
  
  let query = buildPaginatedQuery('permissions', { page, limit })
    .select('*, application:applications(id, name, code)');

  if (applicationId) query = query.eq('application_id', applicationId);
  if (category) query = query.eq('category', category);
  if (isActive !== undefined) query = query.eq('is_active', isActive === 'true');

  query = query.order('category', { ascending: true }).order('code', { ascending: true });

  const { data: permissions, count, error } = await query;
  if (error) throw new AppError('Error al obtener permisos', 500);

  res.json({
    success: true,
    data: {
      permissions: permissions.map(mapPermission),
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
    }
  });
}));

/**
 * GET /api/permissions/:id
 */
router.get('/:id', requirePermission('permissions.view'), catchAsync(async (req, res) => {
  const supabase = createClient();
  const { data: permission, error } = await supabase.from('permissions')
    .select('*, application:applications(id, name, code)').eq('id', req.params.id).single();

  if (error || !permission) throw new AppError('Permiso no encontrado', 404);

  res.json({ success: true, data: { permission: mapPermission(permission, true) } });
}));

/**
 * PUT /api/permissions/:id
 */
router.put('/:id', requirePermission('permissions.edit'), validate(updatePermissionSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { displayName, description, isActive } = req.body;
  const supabase = createClient();

  const existing = await getOne('permissions', { id }, 'Permiso no encontrado');
  // Protección: super_admin es un permiso crítico del sistema
  if (existing.code === 'super_admin') throw new AppError('No se puede modificar el permiso del sistema super_admin', 400);

  const updateData = {};
  if (displayName !== undefined) updateData.display_name = displayName;
  if (description !== undefined) updateData.description = description;
  if (isActive !== undefined) updateData.is_active = isActive;

  const { data: updatedPermission, error } = await supabase.from('permissions').update(updateData).eq('id', id).select().single();
  if (error) throw new AppError('Error al actualizar permiso', 500);

  await createAuditLog({ userId: req.user.id, applicationId: updatedPermission.application_id, action: 'permission_updated', ipAddress: req.ip, details: { permissionCode: existing.code, changes: updateData } });

  logger.info(`Permiso actualizado: ${existing.code} por ${req.user.email}`);
  res.json({ success: true, data: { permission: mapPermission(updatedPermission) } });
}));

/**
 * DELETE /api/permissions/:id
 */
router.delete('/:id', requireSuperAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;
  const supabase = createClient();

  const existing = await getOne('permissions', { id }, 'Permiso no encontrado');
  // Protección: super_admin es un permiso crítico del sistema
  if (existing.code === 'super_admin') throw new AppError('No se puede eliminar el permiso del sistema super_admin', 400);

  const { error } = await supabase.from('permissions').delete().eq('id', id);
  if (error) throw new AppError('Error al eliminar permiso', 500);

  await createAuditLog({ userId: req.user.id, applicationId: existing.application_id, action: 'permission_deleted', ipAddress: req.ip, details: { deletedPermissionCode: existing.code } });

  logger.warn(`Permiso eliminado: ${existing.code} por ${req.user.email}`);
  res.json({ success: true, message: 'Permiso eliminado correctamente' });
}));

function mapPermission(p, includeUpdatedAt = false) {
  const mapped = {
    id: p.id,
    applicationId: p.application_id,
    applicationName: p.application?.name,
    applicationCode: p.application?.code,
    code: p.code,
    displayName: p.display_name,
    description: p.description,
    category: p.category,
    isActive: p.is_active,
    createdAt: p.created_at
  };
  if (includeUpdatedAt) mapped.updatedAt = p.updated_at;
  return mapped;
}

module.exports = router;
