const express = require('express');
const bcrypt = require('bcryptjs');
const { createClient } = require('../config/database');
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

  const supabase = createClient();

  // Verificar que no exista ya un super admin
  const { data: existingSuperAdmins } = await supabase
    .from('user_app_permissions')
    .select('user_id, permission:permissions!inner(code)')
    .eq('permission.code', 'super_admin')
    .limit(1);

  if (existingSuperAdmins && existingSuperAdmins.length > 0) {
    throw new AppError('Ya existe un super administrador en el sistema. Use el panel de administración para crear más usuarios.', 400);
  }

  // Verificar que el email no esté registrado
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existingUser) {
    throw new AppError('El email ya está registrado', 400);
  }

  // Obtener la franquicia matriz (GANGAZON_HQ)
  const { data: franchise, error: franchiseError } = await supabase
    .from('franchises')
    .select('id')
    .eq('code', 'GANGAZON_HQ')
    .single();

  if (franchiseError || !franchise) {
    throw new AppError('Franquicia matriz no encontrada. Ejecute el schema.sql primero.', 500);
  }

  // Obtener la aplicación ADMIN_PANEL
  const { data: application, error: appError } = await supabase
    .from('applications')
    .select('id')
    .eq('code', 'ADMIN_PANEL')
    .single();

  if (appError || !application) {
    throw new AppError('Aplicación ADMIN_PANEL no encontrada. Ejecute el schema.sql primero.', 500);
  }

  // Obtener el permiso super_admin
  const { data: permission, error: permError } = await supabase
    .from('permissions')
    .select('id')
    .eq('code', 'super_admin')
    .eq('application_id', application.id)
    .single();

  if (permError || !permission) {
    throw new AppError('Permiso super_admin no encontrado. Ejecute el schema.sql primero.', 500);
  }

  // Crear el usuario
  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({
      email: email.toLowerCase(),
      password_hash: await bcrypt.hash(password, 12),
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      franchise_id: franchise.id,
      is_active: true,
      email_verified: true
    })
    .select()
    .single();

  if (userError) {
    logger.error('Error creando super admin:', userError);
    throw new AppError('Error al crear usuario', 500);
  }

  // Asignar el permiso super_admin
  const { error: permAssignError } = await supabase
    .from('user_app_permissions')
    .insert({
      user_id: newUser.id,
      application_id: application.id,
      permission_id: permission.id,
      is_active: true
    });

  if (permAssignError) {
    // Intentar eliminar el usuario creado para mantener consistencia
    await supabase.from('users').delete().eq('id', newUser.id);
    logger.error('Error asignando permiso super_admin:', permAssignError);
    throw new AppError('Error al asignar permisos', 500);
  }

  // Crear log de auditoría
  await supabase.from('audit_log').insert({
    user_id: newUser.id,
    application_id: application.id,
    action: 'super_admin_created',
    ip_address: req.ip,
    details: {
      email: newUser.email,
      createdViaSetup: true
    }
  });

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
    const supabase = createClient();
    const { data: existingSuperAdmins } = await supabase
      .from('user_app_permissions')
      .select('user_id, permission:permissions!inner(code)')
      .eq('permission.code', 'super_admin')
      .limit(1);

    hasSuperAdmin = existingSuperAdmins && existingSuperAdmins.length > 0;
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
