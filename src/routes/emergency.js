const express = require('express');
const router = express.Router();
const authUtils = require('../utils/auth');
const db = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { sendSuccess, sendError, sendNotFound, sendCreated, sendConflict, sendForbidden } = require('../utils/responseHelpers');
const { recordExists } = require('../utils/queryHelpers');
const { GANGAZON_ORG_ID } = require('../utils/constants');

// Middleware para verificar que el endpoint de emergencia está habilitado
const checkEmergencyEnabled = (req, res, next) => {
  const emergencyEnabled = process.env.ENABLE_EMERGENCY_ENDPOINT === 'true';
  
  if (!emergencyEnabled) {
    logger.warn('Intento de acceso al endpoint de emergencia deshabilitado');
    return sendForbidden(res, 'El endpoint de emergencia está deshabilitado. Configure ENABLE_EMERGENCY_ENDPOINT=true para habilitarlo.');
  }
  
  next();
};

// Middleware para verificar el token de seguridad de emergencia
const checkEmergencyToken = (req, res, next) => {
  const emergencyToken = process.env.EMERGENCY_ADMIN_TOKEN;
  const providedToken = req.headers['x-emergency-token'];
  
  if (!emergencyToken) {
    logger.error('EMERGENCY_ADMIN_TOKEN no está configurado en variables de entorno');
    return sendError(res, 'Configuración incorrecta', 'El token de emergencia no está configurado en el servidor', 500);
  }
  
  if (!providedToken || providedToken !== emergencyToken) {
    logger.warn('Intento de acceso con token de emergencia inválido', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return sendError(res, 'Token inválido', 'Token de emergencia inválido o no proporcionado', 401);
  }
  
  next();
};

/**
 * Endpoint de emergencia para crear usuario administrador
 * 
 * Requisitos:
 * 1. Variable de entorno ENABLE_EMERGENCY_ENDPOINT=true
 * 2. Variable de entorno EMERGENCY_ADMIN_TOKEN configurada
 * 3. Header x-emergency-token con el token correcto
 * 
 * Uso:
 * POST /api/emergency/create-admin
 * Headers:
 *   x-emergency-token: <tu_token_secreto>
 * Body:
 * {
 *   "email": "admin@example.com",
 *   "password": "SecurePassword123!",
 *   "firstName": "Admin",
 *   "lastName": "Emergency",
 *   "role": "super_admin"
 * }
 */
router.post('/create-admin', checkEmergencyEnabled, checkEmergencyToken, async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, organizationId } = req.body;

    // Validaciones básicas
    if (!email || !password || !firstName || !lastName) {
      return sendError(res, 'Datos incompletos', 'Email, password, firstName y lastName son requeridos', 400);
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 'Email inválido', 'El formato del email no es válido', 400);
    }

    // Validar contraseña
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/;
    if (password.length < 8 || !passwordRegex.test(password)) {
      return sendError(res, 'Contraseña débil', 'La contraseña debe tener al menos 8 caracteres, incluir mayúscula, minúscula, número y carácter especial', 400);
    }

    // Validar rol
    const allowedRoles = ['admin', 'franchisee'];
    const selectedRole = role || 'admin';
    if (!allowedRoles.includes(selectedRole)) {
      return sendError(res, 'Rol inválido', `Solo se permiten roles administrativos: ${allowedRoles.join(', ')}`, 400);
    }

    // Verificar si el usuario ya existe
    const { data: existingUser } = await db.getClient()
      .from('users')
      .select('id, email, is_active')
      .eq('email', email)
      .single();

    if (existingUser) {
      if (!existingUser.is_active) {
        const hashedPassword = await authUtils.hashPassword(password);
        
        const { error: updateError } = await db.getClient()
          .from('users')
          .update({
            password_hash: hashedPassword,
            first_name: firstName,
            last_name: lastName,
            role: selectedRole,
            is_active: true,
            email_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id);

        if (updateError) {
          logger.error('Error reactivando usuario:', updateError);
          return sendError(res, 'Error reactivando usuario', 'No se pudo reactivar el usuario existente', 500);
        }

        logger.warn(`Usuario de emergencia reactivado: ${email} por IP: ${req.ip}`);

        return sendSuccess(res, {
          user: {
            id: existingUser.id,
            email: email,
            role: selectedRole,
            reactivated: true
          }
        }, 'Usuario existente reactivado exitosamente');
      } else {
        return sendConflict(res, 'Ya existe un usuario activo con este email');
      }
    }

    // Si se especifica organizationId, verificar que existe
    let finalOrgId = organizationId;
    if (organizationId) {
      const orgExists = await recordExists('organizations', { id: organizationId });
      if (!orgExists) {
        return sendNotFound(res, 'Organización');
      }
    } else {
      // Buscar o crear organización Gangazon
      let { data: sysOrg } = await db.getClient()
        .from('organizations')
        .select('id')
        .eq('name', 'Gangazon')
        .single();

      if (!sysOrg) {
        const { data: newOrg } = await db.getClient()
          .from('organizations')
          .insert({
            id: GANGAZON_ORG_ID,
            name: 'Gangazon',
            description: 'Franquicia matriz de Gangazon',
            is_active: true,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        finalOrgId = newOrg ? newOrg.id : GANGAZON_ORG_ID;
      } else {
        finalOrgId = sysOrg.id;
      }
    }

    // Hash de la contraseña
    const hashedPassword = await authUtils.hashPassword(password);

    // Crear usuario administrador
    const { data: user, error: userError } = await db.getClient()
      .from('users')
      .insert({
        id: uuidv4(),
        email,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        organization_id: finalOrgId,
        role: selectedRole,
        is_active: true,
        email_verified: true,
        created_at: new Date().toISOString()
      })
      .select('id, email, first_name, last_name, role, organization_id')
      .single();

    if (userError) {
      logger.error('Error creando usuario de emergencia:', userError);
      return sendError(res, 'Error creando usuario', 'No se pudo crear el usuario administrador', 500);
    }

    logger.warn(`Usuario de emergencia creado: ${email} con rol ${selectedRole} desde IP: ${req.ip}`);

    return sendCreated(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id
      },
      warning: 'IMPORTANTE: Desactive este endpoint cambiando ENABLE_EMERGENCY_ENDPOINT=false en producción'
    }, 'Usuario administrador creado exitosamente');

  } catch (error) {
    next(error);
  }
});

router.get('/status', (req, res) => {
  const emergencyEnabled = process.env.ENABLE_EMERGENCY_ENDPOINT === 'true';
  const hasToken = !!process.env.EMERGENCY_ADMIN_TOKEN;
  
  return sendSuccess(res, {
    enabled: emergencyEnabled,
    tokenConfigured: hasToken
  }, emergencyEnabled 
      ? 'Endpoint de emergencia HABILITADO - Desactive en producción' 
      : 'Endpoint de emergencia deshabilitado');
});

module.exports = router;
