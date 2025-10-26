const crypto = require('crypto');

console.log('='.repeat(60));
console.log('GENERADOR DE TOKEN DE SETUP');
console.log('='.repeat(60));
console.log('');

const token = crypto.randomBytes(32).toString('hex');

console.log('✅ Token de setup generado exitosamente:');
console.log('');
console.log(token);
console.log('');
console.log('📋 Agregar al archivo .env:');
console.log('');
console.log(`ALLOW_SETUP=true`);
console.log(`SETUP_TOKEN=${token}`);
console.log('');
console.log('⚠️  IMPORTANTE:');
console.log('1. Este token debe mantenerse secreto');
console.log('2. Después de crear el super admin, cambiar ALLOW_SETUP=false');
console.log('3. No compartir este token en repositorios públicos');
console.log('');
console.log('='.repeat(60));
