const express = require('express');
const bcrypt = require('bcryptjs');
const { createClient } = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validation');
const { loginSchema, refreshTokenSchema } = require('../validators/schemas');
const { authenticateToken } = require('../middleware/auth');
const { generateAccessToken, generateRefreshToken, storeRefreshToken, validateRefreshToken, revokeRefreshToken } = require('../utils/jwt');
const { getOne, createAuditLog } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/auth/login
 */
router.post('/login', validate(loginSchema), catchAsync(async (req, res) => {
  const { email, password, applicationCode } = req.body;
  const supabase = createClient();

  // Verificar aplicación
  const application = await getOne('applications', { code: applicationCode }, 'Aplicación no encontrada');
  if (!application.is_active) throw new AppError('Aplicación desactivada', 403);

  // Buscar usuario
  const user = await getOne('users', { email: email.toLowerCase() }, 'Credenciales inválidas');
  if (!user.is_active) throw new AppError('Usuario desactivado', 403);

  // Verificar contraseña
  if (!await bcrypt.compare(password, user.password_hash)) {
    throw new AppError('Credenciales inválidas', 401);
  }

  // Obtener permisos
  const { data: userPermissions } = await supabase
    .from('v_user_permissions_by_app')
    .select('permission_code')
    .eq('user_id', user.id)
    .eq('application_id', application.id);

  const permissions = userPermissions?.map(p => p.permission_code) || [];

  // Generar tokens
  const accessToken = generateAccessToken(user, permissions, application.id);
  const refreshToken = generateRefreshToken(user, application.id);
  await storeRefreshToken(user.id, refreshToken);

  // Crear sesión y auditoría
  await Promise.all([
    supabase.from('sessions').insert({
      user_id: user.id,
      application_id: application.id,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    }),
    createAuditLog({
      userId: user.id,
      applicationId: application.id,
      action: 'login',
      ipAddress: req.ip,
      details: { email, applicationCode }
    })
  ]);

  logger.info(`Login exitoso: ${email} en ${applicationCode}`);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        franchiseId: user.franchise_id
      },
      tokens: { accessToken, refreshToken },
      permissions,
      redirectUrl: application.redirect_url
    }
  });
}));

/**
 * POST /api/auth/logout
 */
router.post('/logout', validate(refreshTokenSchema), catchAsync(async (req, res) => {
  await revokeRefreshToken(req.body.refreshToken);

  if (req.user) {
    const supabase = createClient();
    await Promise.all([
      supabase.from('sessions').update({ ended_at: new Date().toISOString() })
        .eq('user_id', req.user.id).is('ended_at', null),
      createAuditLog({ userId: req.user.id, action: 'logout', ipAddress: req.ip })
    ]);
  }

  logger.info('Logout exitoso');
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
}));

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', validate(refreshTokenSchema), catchAsync(async (req, res) => {
  const tokenData = await validateRefreshToken(req.body.refreshToken);
  if (!tokenData) throw new AppError('Refresh token inválido o expirado', 401);

  const supabase = createClient();
  const user = await getOne('users', { id: tokenData.user_id }, 'Usuario no encontrado');
  if (!user.is_active) throw new AppError('Usuario desactivado', 403);

  // Validar aplicación si está en el token
  let applicationId = tokenData.applicationId;
  if (applicationId) {
    const application = await getOne('applications', { id: applicationId }, 'Aplicación no encontrada');
    if (!application.is_active) throw new AppError('Aplicación desactivada', 403);
  }

  // Obtener permisos filtrados por aplicación
  let permissionsQuery = supabase
    .from('v_user_permissions_by_app')
    .select('permission_code')
    .eq('user_id', user.id);
  
  if (applicationId) {
    permissionsQuery = permissionsQuery.eq('application_id', applicationId);
  }

  const { data: userPermissions } = await permissionsQuery;

  const permissions = userPermissions?.map(p => p.permission_code) || [];
  const newAccessToken = generateAccessToken(user, permissions, applicationId);

  logger.info(`Token renovado para usuario: ${user.email}`);
  res.json({ success: true, data: { tokens: { accessToken: newAccessToken, refreshToken: req.body.refreshToken } } });
}));

/**
 * POST /api/auth/verify
 */
router.post('/verify', authenticateToken, catchAsync(async (req, res) => {
  res.json({
    valid: true,
    user: {
      userId: req.user.id,
      email: req.user.email,
      firstName: req.user.first_name,
      lastName: req.user.last_name,
      franchiseId: req.user.franchise_id,
      permissions: req.user.permissions
    }
  });
}));

/**
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, catchAsync(async (req, res) => {
  const user = await getOne('v_users_with_franchises', { id: req.user.id }, 'Usuario no encontrado');
  
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        isActive: user.is_active,
        franchise: user.franchise_id ? {
          id: user.franchise_id,
          name: user.franchise_name,
          code: user.franchise_code
        } : null,
        permissions: req.user.permissions,
        createdAt: user.created_at
      }
    }
  });
}));

module.exports = router;
