const express = require('express');
const router = express.Router();
const authUtils = require('../utils/auth');
const db = require('../config/database');
const logger = require('../utils/logger');
const { registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema } = require('../validators/schemas');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Registro de usuario (SOLO ADMIN)
// Para usuarios normales usar POST /api/users
router.post('/register', authenticateToken, requireRole(['admin']), async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { email, password, firstName, lastName, organizationId, role } = value;

    // Verificar si el usuario ya existe
    const { data: existingUser } = await db.getClient()
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        error: 'Usuario ya existe',
        message: 'Ya existe un usuario con este email'
      });
    }

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
        role: role || 'user',
        is_active: true,
        email_verified: false,
        created_at: new Date().toISOString()
      })
      .select('id, email, first_name, last_name, role, organization_id')
      .single();

    if (userError) {
      logger.error('Error creando usuario:', userError);
      return res.status(500).json({
        error: 'Error creando usuario',
        message: 'No se pudo crear el usuario'
      });
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
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
        created_at: new Date().toISOString()
      });

    logger.info(`Usuario registrado: ${email}`);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    next(error);
  }
});

// Login de usuario
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { email, password } = value;

    // Buscar usuario
    const { data: user, error: userError } = await db.getClient()
      .from('users')
      .select('id, email, password_hash, first_name, last_name, role, organization_id, is_active, last_login_at')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Cuenta inactiva',
        message: 'Tu cuenta ha sido desactivada'
      });
    }

    // Verificar contraseña
    const isValidPassword = await authUtils.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
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
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      });

    logger.info(`Usuario logueado: ${email}`);

    res.json({
      message: 'Login exitoso',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id,
        lastLogin: user.last_login_at
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { refreshToken } = value;

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
      return res.status(401).json({
        error: 'Refresh token inválido',
        message: 'El refresh token no es válido'
      });
    }

    // Verificar que no haya expirado
    if (new Date(tokenData.expires_at) < new Date()) {
      // Eliminar token expirado
      await db.getClient()
        .from('refresh_tokens')
        .delete()
        .eq('id', tokenData.id);

      return res.status(401).json({
        error: 'Refresh token expirado',
        message: 'El refresh token ha expirado'
      });
    }

    // Obtener datos del usuario
    const { data: user, error: userError } = await db.getClient()
      .from('users')
      .select('id, email, role, organization_id, is_active')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user || !user.is_active) {
      return res.status(401).json({
        error: 'Usuario inválido',
        message: 'El usuario no existe o está inactivo'
      });
    }

    // Generar nuevo access token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id
    };

    const newAccessToken = authUtils.generateAccessToken(tokenPayload);

    res.json({
      message: 'Token renovado exitosamente',
      tokens: {
        accessToken: newAccessToken,
        refreshToken // Mantener el mismo refresh token
      }
    });

  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken;

    if (refreshToken) {
      // Eliminar refresh token de la base de datos
      await db.getClient()
        .from('refresh_tokens')
        .delete()
        .eq('token', refreshToken)
        .eq('user_id', req.user.id);
    }

    res.json({
      message: 'Logout exitoso'
    });

  } catch (error) {
    next(error);
  }
});

// Cambiar contraseña
router.post('/change-password', authenticateToken, async (req, res, next) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { currentPassword, newPassword } = value;

    // Obtener contraseña actual del usuario
    const { data: user, error: userError } = await db.getClient()
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se pudo encontrar el usuario'
      });
    }

    // Verificar contraseña actual
    const isCurrentValid = await authUtils.verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      return res.status(400).json({
        error: 'Contraseña incorrecta',
        message: 'La contraseña actual es incorrecta'
      });
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
      return res.status(500).json({
        error: 'Error actualizando contraseña',
        message: 'No se pudo actualizar la contraseña'
      });
    }

    logger.info(`Contraseña cambiada para usuario: ${req.user.email}`);

    res.json({
      message: 'Contraseña actualizada exitosamente'
    });

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
        organizations(id, name, type)
      `)
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se pudo encontrar el usuario'
      });
    }

    res.json({
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