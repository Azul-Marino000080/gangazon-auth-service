const express = require('express');
const { query } = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validation');
const { createPermissionSchema, updatePermissionSchema } = require('../validators/schemas');
const { authenticateToken, requirePermission, requireSuperAdmin } = require('../middleware/auth');
const { getOne, getPaginated, createAuditLog, checkExists, paginatedResponse } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

/**
 * POST /api/permissions
 */
router.post('/', requirePermission('permissions.create'), validate(createPermissionSchema), catchAsync(async (req, res) => {
  const { applicationId, code, displayName, description, category } = req.body;

  await getOne('auth_gangazon.auth_applications', { id: applicationId }, 'Aplicación no encontrada');
  await checkExists('auth_gangazon.auth_permissions', { application_id: applicationId, code }, 'El código de permiso ya existe para esta aplicación');

  const result = await query(
    `INSERT INTO auth_gangazon.auth_permissions (application_id, code, display_name, description, category)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [applicationId, code, displayName, description || null, category || null]
  );

  const newPermission = result.rows[0];

  await createAuditLog({ 
    userId: req.user.id, 
    applicationId, 
    action: 'permission_created', 
    ipAddress: req.ip, 
    details: { permissionCode: newPermission.code, permissionName: newPermission.display_name } 
  });

  logger.info(`Permiso creado: ${newPermission.code} por ${req.user.email}`);
  res.status(201).json({ success: true, data: { permission: mapPermission(newPermission) } });
}));

/**
 * GET /api/permissions
 */
router.get('/', requirePermission('permissions.view'), catchAsync(async (req, res) => {
  const { page = 1, limit = 50, applicationId, category, isActive } = req.query;
  
  // Construir query con joins
  const whereClauses = [];
  const values = [];
  let paramIndex = 1;

  if (applicationId) {
    whereClauses.push(`p.application_id = $${paramIndex++}`);
    values.push(applicationId);
  }
  if (category) {
    whereClauses.push(`p.category = $${paramIndex++}`);
    values.push(category);
  }
  if (isActive !== undefined) {
    whereClauses.push(`p.is_active = $${paramIndex++}`);
    values.push(isActive === 'true');
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT p.*, a.id as app_id, a.name as app_name, a.code as app_code
       FROM auth_gangazon.auth_permissions p
       LEFT JOIN auth_gangazon.auth_applications a ON p.application_id = a.id
       ${whereClause}
       ORDER BY p.category ASC, p.code ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    ),
    query(
      `SELECT COUNT(*) as total FROM auth_gangazon.auth_permissions p ${whereClause}`,
      values
    )
  ]);

  const permissions = dataResult.rows.map(p => ({
    ...p,
    application: { id: p.app_id, name: p.app_name, code: p.app_code }
  }));

  res.json({
    success: true,
    data: paginatedResponse(permissions.map(mapPermission), parseInt(countResult.rows[0].total), page, limit)
  });
}));

/**
 * GET /api/permissions/:id
 */
router.get('/:id', requirePermission('permissions.view'), catchAsync(async (req, res) => {
  const result = await query(
    `SELECT p.*, a.id as app_id, a.name as app_name, a.code as app_code
     FROM auth_gangazon.auth_permissions p
     LEFT JOIN auth_gangazon.auth_applications a ON p.application_id = a.id
     WHERE p.id = $1`,
    [req.params.id]
  );

  if (result.rows.length === 0) throw new AppError('Permiso no encontrado', 404);

  const permission = {
    ...result.rows[0],
    application: { id: result.rows[0].app_id, name: result.rows[0].app_name, code: result.rows[0].app_code }
  };

  res.json({ success: true, data: { permission: mapPermission(permission, true) } });
}));

/**
 * PUT /api/permissions/:id
 */
router.put('/:id', requirePermission('permissions.edit'), validate(updatePermissionSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { displayName, description, isActive } = req.body;

  const existing = await getOne('auth_gangazon.auth_permissions', { id }, 'Permiso no encontrado');
  // Protección: super_admin es un permiso crítico del sistema
  if (existing.code === 'super_admin') throw new AppError('No se puede modificar el permiso del sistema super_admin', 400);

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (displayName !== undefined) {
    updates.push(`display_name = $${paramIndex++}`);
    values.push(displayName);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description);
  }
  if (isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(isActive);
  }

  if (updates.length === 0) {
    return res.json({ success: true, data: { permission: mapPermission(existing) } });
  }

  values.push(id);
  const result = await query(
    `UPDATE auth_gangazon.auth_permissions SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  const updatedPermission = result.rows[0];

  await createAuditLog({ 
    userId: req.user.id, 
    applicationId: updatedPermission.application_id, 
    action: 'permission_updated', 
    ipAddress: req.ip, 
    details: { permissionCode: existing.code, changes: req.body } 
  });

  logger.info(`Permiso actualizado: ${existing.code} por ${req.user.email}`);
  res.json({ success: true, data: { permission: mapPermission(updatedPermission) } });
}));

/**
 * DELETE /api/permissions/:id
 */
router.delete('/:id', requireSuperAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;

  const existing = await getOne('auth_gangazon.auth_permissions', { id }, 'Permiso no encontrado');
  // Protección: super_admin es un permiso crítico del sistema
  if (existing.code === 'super_admin') throw new AppError('No se puede eliminar el permiso del sistema super_admin', 400);

  await query('DELETE FROM auth_gangazon.auth_permissions WHERE id = $1', [id]);

  await createAuditLog({ 
    userId: req.user.id, 
    applicationId: existing.application_id, 
    action: 'permission_deleted', 
    ipAddress: req.ip, 
    details: { deletedPermissionCode: existing.code } 
  });

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
