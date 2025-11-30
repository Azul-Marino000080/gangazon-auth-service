require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('../src/config/database');
const logger = require('../src/utils/logger');

/**
 * Script de migración para convertir password hashes SHA256 a bcrypt
 * 
 * Este script detecta automáticamente los hashes en formato SHA256 (64 caracteres)
 * y los convierte a bcrypt usando la contraseña por defecto.
 * 
 * IMPORTANTE: Este script es para migración de datos antiguos.
 * Después de ejecutarlo, los usuarios deberán usar la contraseña por defecto
 * y cambiarla en su primer login.
 */

const DEFAULT_PASSWORD = process.env.MIGRATION_DEFAULT_PASSWORD || 'Faubel.11';
const BCRYPT_ROUNDS = 12;

async function migratePasswordHashes() {
  try {
    logger.info('🔄 Iniciando migración de password hashes...');

    // 1. Buscar usuarios con hashes SHA256 (64 caracteres hexadecimales)
    const usersToMigrate = await query(`
      SELECT id, email, password_hash, LENGTH(password_hash) as hash_length
      FROM auth_gangazon.auth_users
      WHERE LENGTH(password_hash) = 64
        AND password_hash NOT LIKE '$2a$%'
        AND password_hash NOT LIKE '$2b$%'
        AND password_hash NOT LIKE '$2y$%'
    `);

    if (usersToMigrate.rows.length === 0) {
      logger.info('✅ No hay usuarios con hashes SHA256. Todos los hashes están en formato bcrypt.');
      process.exit(0);
    }

    logger.info(`📋 Encontrados ${usersToMigrate.rows.length} usuarios con hashes SHA256`);
    
    // Mostrar usuarios a migrar
    console.log('\n👥 Usuarios a migrar:');
    usersToMigrate.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`);
    });

    // Generar nuevo hash bcrypt
    const newHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
    logger.info(`\n🔐 Nuevo hash bcrypt generado (${newHash.length} caracteres)`);

    // 2. Actualizar cada usuario
    let successCount = 0;
    let errorCount = 0;

    for (const user of usersToMigrate.rows) {
      try {
        await query(
          'UPDATE auth_gangazon.auth_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [newHash, user.id]
        );
        
        logger.info(`✅ ${user.email} - Hash actualizado`);
        successCount++;
      } catch (error) {
        logger.error(`❌ ${user.email} - Error: ${error.message}`);
        errorCount++;
      }
    }

    // 3. Verificar migración
    const remainingSHA256 = await query(`
      SELECT COUNT(*) as count
      FROM auth_gangazon.auth_users
      WHERE LENGTH(password_hash) = 64
        AND password_hash NOT LIKE '$2a$%'
        AND password_hash NOT LIKE '$2b$%'
        AND password_hash NOT LIKE '$2y$%'
    `);

    logger.info('\n📊 Resumen de migración:');
    logger.info(`   ✅ Exitosos: ${successCount}`);
    logger.info(`   ❌ Fallidos: ${errorCount}`);
    logger.info(`   📝 SHA256 restantes: ${remainingSHA256.rows[0].count}`);

    if (successCount > 0) {
      logger.warn('\n⚠️  IMPORTANTE:');
      logger.warn(`   Los ${successCount} usuarios migrados ahora tienen la contraseña: ${DEFAULT_PASSWORD}`);
      logger.warn('   Deben cambiar su contraseña en el primer login.');
    }

    if (remainingSHA256.rows[0].count === 0) {
      logger.info('\n🎉 ¡Migración completada exitosamente!');
      logger.info('   Todos los password hashes están ahora en formato bcrypt.');
    }

    process.exit(errorCount > 0 ? 1 : 0);

  } catch (error) {
    logger.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

// Ejecutar
migratePasswordHashes();
