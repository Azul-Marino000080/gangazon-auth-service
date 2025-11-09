const express = require('express');
const crypto = require('crypto');
const { query } = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validation');
const { createApplicationSchema, updateApplicationSchema } = require('../validators/schemas');
const { authenticateToken, requirePermission, requireSuperAdmin } = require('../middleware/auth');
const { getOne, getPaginated, createAuditLog, checkExists, paginatedResponse } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

/**
 * POST /api/applications
 */
router.post('/', requireSuperAdmin, validate(createApplicationSchema), catchAsync(async (req, res) => {
  const { name, code, description, redirectUrl, allowedOrigins } = req.body;

  await checkExists('auth_gangazon.auth_applications', { code }, 'El código de aplicación ya existe');

  const result = await query(
    `INSERT INTO auth_gangazon.auth_applications (name, code, description, redirect_url, allowed_origins, api_key)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, code.toUpperCase(), description || null, redirectUrl, JSON.stringify(allowedOrigins || [redirectUrl]), generateApiKey()]
  );

  const newApp = result.rows[0];

  await createAuditLog({
    userId: req.user.id,
    applicationId: newApp.id,
    action: 'application_created',
    ipAddress: req.ip,
    details: { applicationCode: newApp.code, applicationName: newApp.name }
  });

  logger.info(`Aplicación creada: ${newApp.code} por ${req.user.email}`);
  res.status(201).json({ success: true, data: { application: mapApplication(newApp) } });
}));

/**
 * GET /api/applications
 */
router.get('/', requirePermission('applications.view'), catchAsync(async (req, res) => {
  const { page = 1, limit = 20, isActive } = req.query;

  const filters = {};
  if (isActive !== undefined) filters.is_active = isActive === 'true';

  const result = await getPaginated('auth_gangazon.auth_applications', { page, limit, filters });

  res.json({
    success: true,
    data: paginatedResponse(result.data.map(mapApplication), result.count, page, limit)
  });
}));

/**
 * GET /api/applications/:id
 */
router.get('/:id', requirePermission('applications.view'), catchAsync(async (req, res) => {
  const app = await getOne('auth_gangazon.auth_applications', { id: req.params.id }, 'Aplicación no encontrada');
  res.json({ success: true, data: { application: mapApplication(app, true) } });
}));

/**
 * PUT /api/applications/:id
 */
router.put('/:id', requireSuperAdmin, validate(updateApplicationSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, redirectUrl, allowedOrigins, isActive } = req.body;

  const existing = await getOne('auth_gangazon.auth_applications', { id }, 'Aplicación no encontrada');

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (redirectUrl !== undefined) {
    updates.push(`redirect_url = $${paramIndex++}`);
    values.push(redirectUrl);
  }
  if (allowedOrigins !== undefined) {
    updates.push(`allowed_origins = $${paramIndex++}`);
    values.push(JSON.stringify(allowedOrigins));
  }
  if (isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(isActive);
  }

  if (updates.length === 0) {
    return res.json({ success: true, data: { application: mapApplication(existing) } });
  }

  values.push(id);
  const result = await query(
    `UPDATE auth_gangazon.auth_applications SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  const updatedApp = result.rows[0];

  await createAuditLog({ 
    userId: req.user.id, 
    applicationId: id, 
    action: 'application_updated', 
    ipAddress: req.ip, 
    details: { applicationCode: existing.code, changes: req.body } 
  });

  logger.info(`Aplicación actualizada: ${existing.code} por ${req.user.email}`);
  res.json({ success: true, data: { application: mapApplication(updatedApp) } });
}));

/**
 * DELETE /api/applications/:id
 */
router.delete('/:id', requireSuperAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;

  const existing = await getOne('auth_gangazon.auth_applications', { id }, 'Aplicación no encontrada');
  // Protección: ADMIN_PANEL es una aplicación del sistema y no puede eliminarse
  if (existing.code === 'ADMIN_PANEL') throw new AppError('No se puede eliminar la aplicación del sistema ADMIN_PANEL', 400);

  await query('DELETE FROM auth_gangazon.auth_applications WHERE id = $1', [id]);

  await createAuditLog({ 
    userId: req.user.id, 
    action: 'application_deleted', 
    ipAddress: req.ip, 
    details: { deletedApplicationId: id, deletedApplicationCode: existing.code } 
  });

  logger.warn(`Aplicación eliminada: ${existing.code} por ${req.user.email}`);
  res.json({ success: true, message: 'Aplicación eliminada correctamente' });
}));

/**
 * POST /api/applications/:id/regenerate-key
 */
router.post('/:id/regenerate-key', requireSuperAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;

  const existing = await getOne('auth_gangazon.auth_applications', { id }, 'Aplicación no encontrada');
  const newApiKey = generateApiKey();

  await query('UPDATE auth_gangazon.auth_applications SET api_key = $1, updated_at = NOW() WHERE id = $2', [newApiKey, id]);

  await createAuditLog({ 
    userId: req.user.id, 
    applicationId: id, 
    action: 'api_key_regenerated', 
    ipAddress: req.ip, 
    details: { applicationCode: existing.code } 
  });

  logger.warn(`API key regenerada para: ${existing.code} por ${req.user.email}`);
  res.json({ success: true, data: { apiKey: newApiKey } });
}));

/**
 * Genera una API key única para aplicaciones
 * Formato: app_[64 caracteres hexadecimales]
 */
function generateApiKey() {
  return `app_${crypto.randomBytes(32).toString('hex')}`;
}

function mapApplication(app, includeUpdatedAt = false) {
  const mapped = {
    id: app.id,
    name: app.name,
    code: app.code,
    description: app.description,
    redirectUrl: app.redirect_url,
    allowedOrigins: typeof app.allowed_origins === 'string' ? JSON.parse(app.allowed_origins) : app.allowed_origins,
    apiKeyPreview: app.api_key ? `${app.api_key.substring(0, 20)}...` : null,
    isActive: app.is_active,
    createdAt: app.created_at
  };
  if (includeUpdatedAt) mapped.updatedAt = app.updated_at;
  return mapped;
}

module.exports = router;
