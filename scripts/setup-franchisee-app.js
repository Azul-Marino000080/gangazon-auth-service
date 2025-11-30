require('dotenv').config();
const { Pool } = require('pg');

// Configuración para Supabase
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL o SUPABASE_DB_URL no está configurado');
  console.log('Configura la variable de entorno con la URL de conexión de Supabase');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function setupFranchiseeApp() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Configurando aplicación FRANCHISEE_PANEL...\n');
    
    await client.query('BEGIN');
    
    // 1. Crear aplicación FRANCHISEE_PANEL si no existe
    console.log('📱 Creando aplicación FRANCHISEE_PANEL...');
    const appResult = await client.query(`
      INSERT INTO auth_gangazon.auth_applications (name, code, description, active)
      VALUES ('Panel de Franquiciados', 'FRANCHISEE_PANEL', 'Panel web para gestión de franquiciados', true)
      ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name, description = EXCLUDED.description
      RETURNING id, code, name
    `);
    
    const app = appResult.rows[0];
    console.log(`✅ Aplicación creada: ${app.name} (${app.code})`);
    console.log(`   ID: ${app.id}\n`);
    
    // 2. Crear permisos para la aplicación
    console.log('🔐 Creando permisos...');
    const permissions = [
      {
        name: 'franchisee.dashboard.view',
        description: 'Ver dashboard de scrapper',
        category: 'scrapper',
      },
      {
        name: 'franchisee.scanner.use',
        description: 'Usar scanner de productos',
        category: 'scrapper',
      },
      {
        name: 'franchisee.batches.view',
        description: 'Ver lotes procesados',
        category: 'scrapper',
      },
      {
        name: 'franchisee.files.upload',
        description: 'Subir archivos de productos',
        category: 'scrapper',
      },
      {
        name: 'franchisee.stores.view',
        description: 'Ver tiendas propias',
        category: 'stores',
      },
      {
        name: 'franchisee.employees.view',
        description: 'Ver empleados propios',
        category: 'employees',
      },
      {
        name: 'franchisee.fichajes.view',
        description: 'Ver fichajes de empleados',
        category: 'fichajes',
      },
    ];
    
    for (const perm of permissions) {
      const result = await client.query(`
        INSERT INTO auth_gangazon.auth_permissions (application_id, name, description, category)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (application_id, name) DO UPDATE
        SET description = EXCLUDED.description, category = EXCLUDED.category
        RETURNING id, name
      `, [app.id, perm.name, perm.description, perm.category]);
      
      console.log(`   ✓ ${result.rows[0].name}`);
    }
    
    console.log('\n✅ Permisos creados exitosamente\n');
    
    // 3. Obtener todos los usuarios con rol FRANCHISEE
    console.log('👥 Asignando permisos a franquiciados...');
    const franchiseesResult = await client.query(`
      SELECT u.id, u.email, u.first_name, u.last_name
      FROM auth_gangazon.auth_users u
      WHERE u.role = 'FRANCHISEE'
      AND u.active = true
    `);
    
    if (franchiseesResult.rows.length === 0) {
      console.log('⚠️  No se encontraron franquiciados activos\n');
    } else {
      // 4. Obtener IDs de todos los permisos creados
      const permsResult = await client.query(`
        SELECT id FROM auth_gangazon.auth_permissions
        WHERE application_id = $1
      `, [app.id]);
      
      const permissionIds = permsResult.rows.map(r => r.id);
      
      // 5. Asignar todos los permisos a cada franquiciado
      for (const franchisee of franchiseesResult.rows) {
        for (const permId of permissionIds) {
          await client.query(`
            INSERT INTO auth_gangazon.auth_user_permissions (user_id, permission_id, application_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, permission_id) DO NOTHING
          `, [franchisee.id, permId, app.id]);
        }
        
        console.log(`   ✓ ${franchisee.first_name} ${franchisee.last_name || ''} (${franchisee.email})`);
      }
      
      console.log(`\n✅ Permisos asignados a ${franchiseesResult.rows.length} franquiciado(s)\n`);
    }
    
    // 6. Obtener todos los usuarios con rol EMPLOYEE
    console.log('👥 Asignando permisos a empleados...');
    const employeesResult = await client.query(`
      SELECT u.id, u.email, u.first_name, u.last_name
      FROM auth_gangazon.auth_users u
      WHERE u.role = 'EMPLOYEE'
      AND u.active = true
    `);
    
    if (employeesResult.rows.length === 0) {
      console.log('⚠️  No se encontraron empleados activos\n');
    } else {
      // Obtener IDs de todos los permisos creados
      const permsResult = await client.query(`
        SELECT id FROM auth_gangazon.auth_permissions
        WHERE application_id = $1
      `, [app.id]);
      
      const permissionIds = permsResult.rows.map(r => r.id);
      
      // Asignar todos los permisos a cada empleado
      for (const employee of employeesResult.rows) {
        for (const permId of permissionIds) {
          await client.query(`
            INSERT INTO auth_gangazon.auth_user_permissions (user_id, permission_id, application_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, permission_id) DO NOTHING
          `, [employee.id, permId, app.id]);
        }
        
        console.log(`   ✓ ${employee.first_name} ${employee.last_name || ''} (${employee.email})`);
      }
      
      console.log(`\n✅ Permisos asignados a ${employeesResult.rows.length} empleado(s)\n`);
    }
    
    await client.query('COMMIT');
    
    console.log('🎉 Configuración completada exitosamente!\n');
    console.log('📋 Resumen:');
    console.log(`   - Aplicación: ${app.name}`);
    console.log(`   - Código: ${app.code}`);
    console.log(`   - Permisos: ${permissions.length}`);
    console.log(`   - Franquiciados: ${franchiseesResult.rows.length}`);
    console.log(`   - Empleados: ${employeesResult.rows.length}\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la configuración:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar el script
setupFranchiseeApp()
  .then(() => {
    console.log('✅ Script finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
