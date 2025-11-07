const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Middleware para validar el token de setup
 */
function validateSetupToken(req, res, next) {
  // Verificar si el setup está habilitado
  if (process.env.ALLOW_SETUP !== 'true') {
    throw new AppError('El endpoint de setup está deshabilitado', 403);
  }

  // Verificar el token de setup
  const setupToken = req.headers['x-setup-token'];
  const expectedToken = process.env.SETUP_TOKEN || '4200003e3b0715150c742166ac9e2fc9d9d173c10e8a141baff60efbf1f0c860';

  if (!setupToken) {
    throw new AppError('Token de setup no proporcionado', 401);
  }

  if (setupToken !== expectedToken) {
    throw new AppError('Token de setup inválido', 401);
  }

  next();
}

/**
 * POST /api/setup/super-admin
 * Crea el primer super administrador del sistema
 * 
 * Headers requeridos:
 *   x-setup-token: Token de seguridad para habilitar el setup
 * 
 * Body:
 *   email: Email del super admin
 *   password: Contraseña (min 8 caracteres)
 *   firstName: Nombre
 *   lastName: Apellido
 *   phone: (opcional) Teléfono
 */
router.post('/super-admin', validateSetupToken, catchAsync(async (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body;

  // Validaciones básicas
  if (!email || !password || !firstName || !lastName) {
    throw new AppError('Email, password, firstName y lastName son requeridos', 400);
  }

  if (password.length < 8) {
    throw new AppError('La contraseña debe tener al menos 8 caracteres', 400);
  }

  // Verificar que no exista ya un super admin
  const existingSuperAdminsResult = await query(`
    SELECT uap.user_id
    FROM auth_gangazon.user_app_permissions uap
    INNER JOIN auth_gangazon.permissions p ON uap.permission_id = p.id
    WHERE p.code = 'super_admin'
    LIMIT 1
  `);

  if (existingSuperAdminsResult.rows.length > 0) {
    throw new AppError('Ya existe un super administrador en el sistema. Use el panel de administración para crear más usuarios.', 400);
  }

  // Verificar que el email no esté registrado
  const existingUserResult = await query(`
    SELECT id FROM auth_gangazon.users WHERE email = $1
  `, [email.toLowerCase()]);

  if (existingUserResult.rows.length > 0) {
    throw new AppError('El email ya está registrado', 400);
  }

  // Obtener la franquicia matriz (GANGAZON_HQ)
  const franchiseResult = await query(`
    SELECT id FROM auth_gangazon.franchises WHERE code = 'GANGAZON_HQ'
  `);

  if (franchiseResult.rows.length === 0) {
    throw new AppError('Franquicia matriz no encontrada. Ejecute el schema.sql primero.', 500);
  }
  const franchise = franchiseResult.rows[0];

  // Obtener la aplicación SCANNER_ADMIN o WEB_ADMIN
  const applicationResult = await query(`
    SELECT id FROM auth_gangazon.applications WHERE code IN ('SCANNER_ADMIN', 'WEB_ADMIN') LIMIT 1
  `);

  if (applicationResult.rows.length === 0) {
    throw new AppError('No se encontró ninguna aplicación (SCANNER_ADMIN o WEB_ADMIN). Ejecute el schema.sql primero.', 500);
  }
  const application = applicationResult.rows[0];

  // Obtener el permiso super_admin
  const permissionResult = await query(`
    SELECT id FROM auth_gangazon.permissions 
    WHERE code = 'super_admin' AND application_id = $1
  `, [application.id]);

  if (permissionResult.rows.length === 0) {
    throw new AppError('Permiso super_admin no encontrado. Ejecute el schema.sql primero.', 500);
  }
  const permission = permissionResult.rows[0];

  // Hash de la contraseña
  const passwordHash = await bcrypt.hash(password, 12);

  // Crear el usuario
  const newUserResult = await query(`
    INSERT INTO auth_gangazon.users 
    (email, password_hash, first_name, last_name, phone, franchise_id, is_active, email_verified)
    VALUES ($1, $2, $3, $4, $5, $6, true, true)
    RETURNING id, email, first_name, last_name
  `, [email.toLowerCase(), passwordHash, firstName, lastName, phone || null, franchise.id]);

  if (newUserResult.rows.length === 0) {
    logger.error('Error creando super admin');
    throw new AppError('Error al crear usuario', 500);
  }
  const newUser = newUserResult.rows[0];

  // Asignar el permiso super_admin
  try {
    await query(`
      INSERT INTO auth_gangazon.user_app_permissions 
      (user_id, application_id, permission_id, is_active)
      VALUES ($1, $2, $3, true)
    `, [newUser.id, application.id, permission.id]);
  } catch (permAssignError) {
    // Intentar eliminar el usuario creado para mantener consistencia
    await query('DELETE FROM auth_gangazon.users WHERE id = $1', [newUser.id]);
    logger.error('Error asignando permiso super_admin:', permAssignError);
    throw new AppError('Error al asignar permisos', 500);
  }

  // Crear log de auditoría
  await query(`
    INSERT INTO auth_gangazon.audit_log 
    (user_id, application_id, action, ip_address, details)
    VALUES ($1, $2, $3, $4, $5)
  `, [newUser.id, application.id, 'super_admin_created', req.ip, JSON.stringify({
    email: newUser.email,
    createdViaSetup: true
  })]);

  logger.warn(`⚠️  Super Admin creado vía setup: ${newUser.email} desde IP ${req.ip}`);

  res.status(201).json({
    success: true,
    message: 'Super administrador creado exitosamente',
    data: {
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        franchise: 'GANGAZON_HQ'
      }
    }
  });
}));

/**
 * GET /api/setup/status
 * Verifica si el setup está habilitado y si ya existe un super admin
 */
router.get('/status', catchAsync(async (req, res) => {
  const setupEnabled = process.env.ALLOW_SETUP === 'true';
  
  let hasSuperAdmin = false;
  
  if (setupEnabled) {
    const existingSuperAdminsResult = await query(`
      SELECT uap.user_id
      FROM auth_gangazon.user_app_permissions uap
      INNER JOIN auth_gangazon.permissions p ON uap.permission_id = p.id
      WHERE p.code = 'super_admin'
      LIMIT 1
    `);

    hasSuperAdmin = existingSuperAdminsResult.rows.length > 0;
  }

  res.json({
    success: true,
    data: {
      setupEnabled,
      hasSuperAdmin,
      message: setupEnabled 
        ? 'Setup habilitado. Use POST /api/setup/super-admin con header x-setup-token para crear el super admin.'
        : 'Setup deshabilitado. Configure ALLOW_SETUP=true en variables de entorno.'
    }
  });
}));

module.exports = router;
