require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('../src/config/database');
const logger = require('../src/utils/logger');

/**
 * Script para crear el usuario Super Admin inicial
 * Este usuario tendrá acceso completo a TODAS las aplicaciones
 */

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@gangazon.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Gangazon2024!Secure';
const SUPER_ADMIN_FIRST_NAME = 'Super';
const SUPER_ADMIN_LAST_NAME = 'Admin';

async function createSuperAdmin() {
  try {
    logger.info('🚀 Iniciando creación de Super Admin...');

    // 1. Verificar que existe el esquema auth_gangazon
    const schemaCheck = await query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth_gangazon'"
    );

    if (schemaCheck.rows.length === 0) {
      logger.error('❌ El esquema auth_gangazon no existe. Ejecuta schema_auth_supabase.sql primero.');
      process.exit(1);
    }

    // 2. Verificar que la franquicia matriz existe
    const franchiseCheck = await query(
      "SELECT id FROM auth_gangazon.franchises WHERE code = 'GANGAZON_HQ'"
    );

    if (franchiseCheck.rows.length === 0) {
      logger.error('❌ La franquicia GANGAZON_HQ no existe. Ejecuta schema_auth_supabase.sql primero.');
      process.exit(1);
    }

    const franchiseId = franchiseCheck.rows[0].id;

    // 3. Verificar si el usuario ya existe
    const existingUser = await query(
      'SELECT id FROM auth_gangazon.users WHERE email = $1',
      [SUPER_ADMIN_EMAIL]
    );

    if (existingUser.rows.length > 0) {
      logger.warn(`⚠️  El usuario ${SUPER_ADMIN_EMAIL} ya existe.`);
      const userId = existingUser.rows[0].id;
      
      // Verificar permisos
      const permissions = await query(
        `SELECT COUNT(*) as count 
         FROM auth_gangazon.user_app_permissions uap
         INNER JOIN auth_gangazon.permissions p ON uap.permission_id = p.id
         WHERE uap.user_id = $1 AND p.code = 'super_admin'`,
        [userId]
      );

      logger.info(`✅ Usuario tiene ${permissions.rows[0].count} permisos de super_admin`);
      process.exit(0);
    }

    // 4. Hashear la contraseña
    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

    // 5. Crear el usuario
    const newUser = await query(
      `INSERT INTO auth_gangazon.users 
       (email, password_hash, first_name, last_name, franchise_id, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, true, true)
       RETURNING id, email`,
      [SUPER_ADMIN_EMAIL, passwordHash, SUPER_ADMIN_FIRST_NAME, SUPER_ADMIN_LAST_NAME, franchiseId]
    );

    const userId = newUser.rows[0].id;
    logger.info(`✅ Usuario creado: ${newUser.rows[0].email} (ID: ${userId})`);

    // 6. Obtener todas las aplicaciones
    const applications = await query(
      'SELECT id, name, code FROM auth_gangazon.applications WHERE is_active = true'
    );

    if (applications.rows.length === 0) {
      logger.error('❌ No hay aplicaciones registradas. Ejecuta schema_auth_supabase.sql primero.');
      process.exit(1);
    }

    logger.info(`📱 Encontradas ${applications.rows.length} aplicaciones`);

    // 7. Asignar permiso super_admin en todas las aplicaciones
    for (const app of applications.rows) {
      // Buscar el permiso super_admin para esta aplicación
      const permission = await query(
        `SELECT id FROM auth_gangazon.permissions 
         WHERE application_id = $1 AND code = 'super_admin'`,
        [app.id]
      );

      if (permission.rows.length === 0) {
        logger.warn(`⚠️  No existe permiso super_admin para ${app.name}`);
        continue;
      }

      const permissionId = permission.rows[0].id;

      // Asignar el permiso al usuario
      await query(
        `INSERT INTO auth_gangazon.user_app_permissions 
         (user_id, application_id, permission_id, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (user_id, application_id, permission_id) DO NOTHING`,
        [userId, app.id, permissionId]
      );

      logger.info(`  ✅ Permiso super_admin asignado en: ${app.name} (${app.code})`);
    }

    // 8. Verificar permisos asignados
    const assignedPermissions = await query(
      `SELECT 
         a.name as app_name,
         a.code as app_code,
         p.display_name as permission_name
       FROM auth_gangazon.user_app_permissions uap
       INNER JOIN auth_gangazon.applications a ON uap.application_id = a.id
       INNER JOIN auth_gangazon.permissions p ON uap.permission_id = p.id
       WHERE uap.user_id = $1 AND uap.is_active = true`,
      [userId]
    );

    logger.info('\n📋 Permisos asignados:');
    assignedPermissions.rows.forEach(perm => {
      logger.info(`  - ${perm.app_name}: ${perm.permission_name}`);
    });

    logger.info('\n🎉 ¡Super Admin creado exitosamente!');
    logger.info('\n📝 Credenciales:');
    logger.info(`   Email: ${SUPER_ADMIN_EMAIL}`);
    logger.info(`   Password: ${SUPER_ADMIN_PASSWORD}`);
    logger.info('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer login\n');

    process.exit(0);

  } catch (error) {
    logger.error('❌ Error creando Super Admin:', error);
    process.exit(1);
  }
}

// Ejecutar
createSuperAdmin();
