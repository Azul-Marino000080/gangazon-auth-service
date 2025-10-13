const express = require('express');
const crypto = require('crypto');
const { createClient } = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validation');
const { createApplicationSchema, updateApplicationSchema } = require('../validators/schemas');
const { authenticateToken, requirePermission, requireSuperAdmin } = require('../middleware/auth');
const { getOne, buildPaginatedQuery, createAuditLog, checkExists } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

/**
 * POST /api/applications
 */
router.post('/', requireSuperAdmin, validate(createApplicationSchema), catchAsync(async (req, res) => {
  const { name, code, description, redirectUrl, allowedOrigins } = req.body;
  const supabase = createClient();

  await checkExists('applications', { code }, 'El código de aplicación ya existe');

  const { data: newApp, error } = await supabase.from('applications').insert({
    name,
    code: code.toUpperCase(),
    description: description || null,
    redirect_url: redirectUrl,
    allowed_origins: allowedOrigins || [redirectUrl],
    api_key: generateApiKey()
  }).select().single();

  if (error) throw new AppError('Error al crear aplicación', 500);

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
  let query = buildPaginatedQuery('applications', { page, limit });

  if (isActive !== undefined) query = query.eq('is_active', isActive === 'true');
  query = query.order('created_at', { ascending: false });

  const { data: applications, count, error } = await query;
  if (error) throw new AppError('Error al obtener aplicaciones', 500);

  res.json({
    success: true,
    data: {
      applications: applications.map(mapApplication),
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
    }
  });
}));

/**
 * GET /api/applications/:id
 */
router.get('/:id', requirePermission('applications.view'), catchAsync(async (req, res) => {
  const app = await getOne('applications', { id: req.params.id }, 'Aplicación no encontrada');
  res.json({ success: true, data: { application: mapApplication(app, true) } });
}));

/**
 * PUT /api/applications/:id
 */
router.put('/:id', requireSuperAdmin, validate(updateApplicationSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, redirectUrl, allowedOrigins, isActive } = req.body;
  const supabase = createClient();

  const existing = await getOne('applications', { id }, 'Aplicación no encontrada');

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (redirectUrl !== undefined) updateData.redirect_url = redirectUrl;
  if (allowedOrigins !== undefined) updateData.allowed_origins = allowedOrigins;
  if (isActive !== undefined) updateData.is_active = isActive;

  const { data: updatedApp, error } = await supabase.from('applications').update(updateData).eq('id', id).select().single();
  if (error) throw new AppError('Error al actualizar aplicación', 500);

  await createAuditLog({ userId: req.user.id, applicationId: id, action: 'application_updated', ipAddress: req.ip, details: { applicationCode: existing.code, changes: updateData } });

  logger.info(`Aplicación actualizada: ${existing.code} por ${req.user.email}`);
  res.json({ success: true, data: { application: mapApplication(updatedApp) } });
}));

/**
 * DELETE /api/applications/:id
 */
router.delete('/:id', requireSuperAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;
  const supabase = createClient();

  const existing = await getOne('applications', { id }, 'Aplicación no encontrada');
  // Protección: ADMIN_PANEL es una aplicación del sistema y no puede eliminarse
  if (existing.code === 'ADMIN_PANEL') throw new AppError('No se puede eliminar la aplicación del sistema ADMIN_PANEL', 400);

  const { error } = await supabase.from('applications').delete().eq('id', id);
  if (error) throw new AppError('Error al eliminar aplicación', 500);

  await createAuditLog({ userId: req.user.id, action: 'application_deleted', ipAddress: req.ip, details: { deletedApplicationId: id, deletedApplicationCode: existing.code } });

  logger.warn(`Aplicación eliminada: ${existing.code} por ${req.user.email}`);
  res.json({ success: true, message: 'Aplicación eliminada correctamente' });
}));

/**
 * POST /api/applications/:id/regenerate-key
 */
router.post('/:id/regenerate-key', requireSuperAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;
  const supabase = createClient();

  const existing = await getOne('applications', { id }, 'Aplicación no encontrada');
  const newApiKey = generateApiKey();

  const { error } = await supabase.from('applications').update({ api_key: newApiKey }).eq('id', id);
  if (error) throw new AppError('Error al regenerar API key', 500);

  await createAuditLog({ userId: req.user.id, applicationId: id, action: 'api_key_regenerated', ipAddress: req.ip, details: { applicationCode: existing.code } });

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
    allowedOrigins: app.allowed_origins,
    apiKeyPreview: app.api_key ? `${app.api_key.substring(0, 20)}...` : null,
    isActive: app.is_active,
    createdAt: app.created_at
  };
  if (includeUpdatedAt) mapped.updatedAt = app.updated_at;
  return mapped;
}

module.exports = router;
