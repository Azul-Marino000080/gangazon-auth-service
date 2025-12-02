const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
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

  // Verificar aplicación
  const application = await getOne('auth_gangazon.auth_applications', { code: applicationCode }, 'Aplicación no encontrada');
  if (!application.is_active) throw new AppError('Aplicación desactivada', 403);

  // Buscar usuario
  const user = await getOne('auth_gangazon.auth_users', { email: email.toLowerCase() }, 'Credenciales inválidas');
  if (!user.is_active) throw new AppError('Usuario desactivado', 403);

  // Verificar contraseña
  if (!await bcrypt.compare(password, user.password_hash)) {
    throw new AppError('Credenciales inválidas', 401);
  }

  // Verificar que el usuario tenga acceso a esta aplicación
  const accessResult = await query(
    `SELECT uap.id 
     FROM auth_gangazon.auth_user_app_permissions uap
     JOIN auth_gangazon.auth_permissions p ON uap.permission_id = p.id
     WHERE uap.user_id = $1 
       AND uap.application_id = $2 
       AND p.code = 'app.access'
       AND uap.is_active = true`,
    [user.id, application.id]
  );

  if (accessResult.rows.length === 0) {
    throw new AppError('No tienes permiso para acceder a esta aplicación', 403);
  }

  // Permisos simplificados: solo 'app.access'
  const permissions = ['app.access'];

  // Generar tokens
  const accessToken = generateAccessToken(user, permissions, application.id);
  const refreshToken = generateRefreshToken(user, application.id);
  await storeRefreshToken(user.id, refreshToken);

  // Crear sesión y auditoría
  await Promise.all([
    query(
      'INSERT INTO auth_gangazon.auth_sessions (user_id, application_id, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
      [user.id, application.id, req.ip, req.get('user-agent')]
    ),
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
    await Promise.all([
      query(
        'UPDATE auth_gangazon.auth_sessions SET ended_at = NOW() WHERE user_id = $1 AND ended_at IS NULL',
        [req.user.id]
      ),
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

  const user = await getOne('auth_gangazon.auth_users', { id: tokenData.user_id }, 'Usuario no encontrado');
  if (!user.is_active) throw new AppError('Usuario desactivado', 403);

  // Validar aplicación si está en el token
  let applicationId = tokenData.applicationId;
  if (applicationId) {
    const application = await getOne('auth_gangazon.auth_applications', { id: applicationId }, 'Aplicación no encontrada');
    if (!application.is_active) throw new AppError('Aplicación desactivada', 403);
  }

  // Obtener permisos filtrados por aplicación
  const permissionsResult = applicationId
    ? await query(
        'SELECT permission_code FROM auth_gangazon.v_auth_user_permissions_by_app WHERE user_id = $1 AND application_id = $2',
        [user.id, applicationId]
      )
    : await query(
        'SELECT permission_code FROM auth_gangazon.v_auth_user_permissions_by_app WHERE user_id = $1',
        [user.id]
      );

  const permissions = permissionsResult.rows.map(p => p.permission_code);
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
  const user = await getOne('auth_gangazon.v_auth_users_with_franchises', { id: req.user.id }, 'Usuario no encontrado');
  
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
