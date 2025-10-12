const express = require('express');
const router = express.Router();
const authUtils = require('../utils/auth');
const db = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Middleware para verificar que el endpoint de emergencia está habilitado
const checkEmergencyEnabled = (req, res, next) => {
  const emergencyEnabled = process.env.ENABLE_EMERGENCY_ENDPOINT === 'true';
  
  if (!emergencyEnabled) {
    logger.warn('Intento de acceso al endpoint de emergencia deshabilitado');
    return res.status(403).json({
      error: 'Endpoint deshabilitado',
      message: 'El endpoint de emergencia está deshabilitado. Configure ENABLE_EMERGENCY_ENDPOINT=true para habilitarlo.'
    });
  }
  
  next();
};

// Middleware para verificar el token de seguridad de emergencia
const checkEmergencyToken = (req, res, next) => {
  const emergencyToken = process.env.EMERGENCY_ADMIN_TOKEN;
  const providedToken = req.headers['x-emergency-token'];
  
  if (!emergencyToken) {
    logger.error('EMERGENCY_ADMIN_TOKEN no está configurado en variables de entorno');
    return res.status(500).json({
      error: 'Configuración incorrecta',
      message: 'El token de emergencia no está configurado en el servidor'
    });
  }
  
  if (!providedToken || providedToken !== emergencyToken) {
    logger.warn('Intento de acceso con token de emergencia inválido', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return res.status(401).json({
      error: 'Token inválido',
      message: 'Token de emergencia inválido o no proporcionado'
    });
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
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Email, password, firstName y lastName son requeridos'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Email inválido',
        message: 'El formato del email no es válido'
      });
    }

    // Validar contraseña (mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/;
    if (password.length < 8 || !passwordRegex.test(password)) {
      return res.status(400).json({
        error: 'Contraseña débil',
        message: 'La contraseña debe tener al menos 8 caracteres, incluir mayúscula, minúscula, número y carácter especial'
      });
    }

    // Validar rol
    const allowedRoles = ['admin', 'super_admin', 'franchisor_admin'];
    const selectedRole = role || 'admin';
    if (!allowedRoles.includes(selectedRole)) {
      return res.status(400).json({
        error: 'Rol inválido',
        message: `Solo se permiten roles administrativos: ${allowedRoles.join(', ')}`
      });
    }

    // Verificar si el usuario ya existe
    const { data: existingUser } = await db.getClient()
      .from('users')
      .select('id, email, is_active')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Si existe pero está inactivo, podemos reactivarlo
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
          return res.status(500).json({
            error: 'Error reactivando usuario',
            message: 'No se pudo reactivar el usuario existente'
          });
        }

        logger.warn(`Usuario de emergencia reactivado: ${email} por IP: ${req.ip}`);

        return res.status(200).json({
          message: 'Usuario existente reactivado exitosamente',
          user: {
            id: existingUser.id,
            email: email,
            role: selectedRole,
            reactivated: true
          }
        });
      } else {
        return res.status(409).json({
          error: 'Usuario ya existe',
          message: 'Ya existe un usuario activo con este email'
        });
      }
    }

    // Si se especifica organizationId, verificar que existe
    let finalOrgId = organizationId;
    if (organizationId) {
      const { data: org } = await db.getClient()
        .from('organizations')
        .select('id')
        .eq('id', organizationId)
        .single();

      if (!org) {
        return res.status(404).json({
          error: 'Organización no encontrada',
          message: 'La organización especificada no existe'
        });
      }
    } else {
      // Buscar u obtener organización del sistema
      let { data: sysOrg } = await db.getClient()
        .from('organizations')
        .select('id')
        .eq('name', 'Gangazon System')
        .single();

      if (sysOrg) {
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
      return res.status(500).json({
        error: 'Error creando usuario',
        message: 'No se pudo crear el usuario administrador'
      });
    }

    logger.warn(`Usuario de emergencia creado: ${email} con rol ${selectedRole} desde IP: ${req.ip}`);

    res.status(201).json({
      message: 'Usuario administrador creado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id
      },
      warning: 'IMPORTANTE: Desactive este endpoint cambiando ENABLE_EMERGENCY_ENDPOINT=false en producción'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Endpoint para verificar el estado del endpoint de emergencia
 */
router.get('/status', (req, res) => {
  const emergencyEnabled = process.env.ENABLE_EMERGENCY_ENDPOINT === 'true';
  const hasToken = !!process.env.EMERGENCY_ADMIN_TOKEN;
  
  res.json({
    enabled: emergencyEnabled,
    tokenConfigured: hasToken,
    message: emergencyEnabled 
      ? 'Endpoint de emergencia HABILITADO - Desactive en producción' 
      : 'Endpoint de emergencia deshabilitado'
  });
});

module.exports = router;
