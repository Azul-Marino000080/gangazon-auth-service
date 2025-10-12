// Script temporal para resetear la contraseña del admin
const authUtils = require('./src/utils/auth');

async function main() {
  const password = 'AdminGangazón2025';
  const hash = await authUtils.hashPassword(password);
  console.log('Hash generado:', hash);
  console.log('\nEjecuta este SQL en Supabase:');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@gangazon.com';`);
}

main().catch(console.error);
