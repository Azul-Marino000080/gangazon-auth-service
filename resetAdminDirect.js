// Script para actualizar directamente en BD usando el cliente de Supabase
const db = require('./src/config/database');
const authUtils = require('./src/utils/auth');

async function resetAdminPassword() {
  try {
    console.log('Iniciando actualización de contraseña...');
    
    const email = 'admin@gangazon.com';
    const password = 'AdminGangazón2025';
    const hashedPassword = await authUtils.hashPassword(password);
    
    console.log('Hash generado:', hashedPassword);
    
    const { data, error } = await db.getClient()
      .from('users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select('id, email, role');
    
    if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
    
    console.log('✅ Contraseña actualizada exitosamente:');
    console.log(data);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

resetAdminPassword();
