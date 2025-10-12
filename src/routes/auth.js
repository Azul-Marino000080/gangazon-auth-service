const express = require('express');
const router = express.Router();
const authUtils = require('../utils/auth');
const db = require('../config/database');
const logger = require('../utils/logger');
const { registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema } = require('../validators/schemas');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getGangazonOrganization } = require('../utils/permissions');
const { v4: uuidv4 } = require('uuid');
const { sendSuccess, sendError, sendNotFound, sendCreated, sendConflict } = require('../utils/responseHelpers');
const { validate } = require('../middleware/validation');
const { recordExists } = require('../utils/queryHelpers');
const { TOKENS, MESSAGES } = require('../utils/constants');

// Registro de usuario (SOLO ADMIN)
// Para usuarios normales usar POST /api/users
router.post('/register', authenticateToken, requireRole(['admin']), validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Verificar si el usuario ya existe
    const exists = await recordExists('users', { email });
    if (exists) {
      return sendConflict(res, 'Ya existe un usuario con este email');
    }

    // Obtener organización Gangazon (única organización)
    const organizationId = await getGangazonOrganization();

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
        is_active: true,
        email_verified: false,
        created_at: new Date().toISOString()
      })
      .select('id, email, first_name, last_name, role, organization_id')
      .single();

    if (userError) {
      logger.error('Error creando usuario:', userError);
      return sendError(res, 'Error creando usuario', 'No se pudo crear el usuario', 500);
    }

    // Generar tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id
    };

    const accessToken = authUtils.generateAccessToken(tokenPayload);
    const refreshToken = authUtils.generateRefreshToken({ userId: user.id });

    // Guardar refresh token
    await db.getClient()
      .from('refresh_tokens')
      .insert({
        id: uuidv4(),
        user_id: user.id,
        token: refreshToken,
        expires_at: new Date(Date.now() + TOKENS.REFRESH_TOKEN_EXPIRY_MS).toISOString(),
        created_at: new Date().toISOString()
      });

    logger.info(`Usuario registrado: ${email}`);

    return sendCreated(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id
      },
      tokens: { accessToken, refreshToken }
    }, 'Usuario registrado exitosamente');

  } catch (error) {
    next(error);
  }
});

// Login de usuario
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const { data: user, error: userError } = await db.getClient()
      .from('users')
      .select('id, email, password_hash, first_name, last_name, role, organization_id, is_active, last_login_at')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return sendError(res, MESSAGES.INVALID_CREDENTIALS, 'Email o contraseña incorrectos', 401);
    }

    if (!user.is_active) {
      return sendError(res, MESSAGES.ACCOUNT_INACTIVE, 'Tu cuenta ha sido desactivada', 401);
    }

    // Verificar contraseña
    const isValidPassword = await authUtils.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return sendError(res, MESSAGES.INVALID_CREDENTIALS, 'Email o contraseña incorrectos', 401);
    }

    // Actualizar último login
    await db.getClient()
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Generar tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id
    };

    const accessToken = authUtils.generateAccessToken(tokenPayload);
    const refreshToken = authUtils.generateRefreshToken({ userId: user.id });

    // Guardar refresh token
    await db.getClient()
      .from('refresh_tokens')
      .insert({
        id: uuidv4(),
        user_id: user.id,
        token: refreshToken,
        expires_at: new Date(Date.now() + TOKENS.REFRESH_TOKEN_EXPIRY_MS).toISOString(),
        created_at: new Date().toISOString()
      });

    logger.info(`Usuario logueado: ${email}`);

    return sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id,
        lastLogin: user.last_login_at
      },
      tokens: { accessToken, refreshToken }
    }, 'Login exitoso');

  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Verificar refresh token
    const decoded = authUtils.verifyToken(refreshToken, true);

    // Verificar que el token existe en la base de datos
    const { data: tokenData, error: tokenError } = await db.getClient()
      .from('refresh_tokens')
      .select('id, user_id, expires_at')
      .eq('token', refreshToken)
      .eq('user_id', decoded.userId)
      .single();

    if (tokenError || !tokenData) {
      return sendError(res, 'Refresh token inválido', 'El refresh token no es válido', 401);
    }

    // Verificar que no haya expirado
    if (new Date(tokenData.expires_at) < new Date()) {
      await db.getClient()
        .from('refresh_tokens')
        .delete()
        .eq('id', tokenData.id);

      return sendError(res, 'Refresh token expirado', 'El refresh token ha expirado', 401);
    }

    // Obtener datos del usuario
    const { data: user, error: userError } = await db.getClient()
      .from('users')
      .select('id, email, role, organization_id, is_active')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user || !user.is_active) {
      return sendError(res, 'Usuario inválido', 'El usuario no existe o está inactivo', 401);
    }

    // Generar nuevo access token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id
    };

    const newAccessToken = authUtils.generateAccessToken(tokenPayload);

    return sendSuccess(res, {
      tokens: {
        accessToken: newAccessToken,
        refreshToken
      }
    }, 'Token renovado exitosamente');

  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken;

    if (refreshToken) {
      await db.getClient()
        .from('refresh_tokens')
        .delete()
        .eq('token', refreshToken)
        .eq('user_id', req.user.id);
    }

    return sendSuccess(res, {}, 'Logout exitoso');

  } catch (error) {
    next(error);
  }
});

// Cambiar contraseña
router.post('/change-password', authenticateToken, validate(changePasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Obtener contraseña actual del usuario
    const { data: user, error: userError } = await db.getClient()
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      return sendNotFound(res, 'Usuario');
    }

    // Verificar contraseña actual
    const isCurrentValid = await authUtils.verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      return sendError(res, 'Contraseña incorrecta', 'La contraseña actual es incorrecta', 400);
    }

    // Hash de la nueva contraseña
    const newHashedPassword = await authUtils.hashPassword(newPassword);

    // Actualizar contraseña
    const { error: updateError } = await db.getClient()
      .from('users')
      .update({ 
        password_hash: newHashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    if (updateError) {
      return sendError(res, 'Error actualizando contraseña', 'No se pudo actualizar la contraseña', 500);
    }

    logger.info(`Contraseña cambiada para usuario: ${req.user.email}`);

    return sendSuccess(res, {}, 'Contraseña actualizada exitosamente');

  } catch (error) {
    next(error);
  }
});

// Verificar token (para validación desde otras aplicaciones)
router.post('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// Obtener perfil del usuario autenticado
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    // Obtener información completa del usuario
    const { data: user, error: userError } = await db.getClient()
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
        last_login_at,
        created_at,
        organizations(id, name)
      `)
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
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
        lastLogin: user.last_login_at,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;