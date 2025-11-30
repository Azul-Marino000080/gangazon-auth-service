# Política de Hash de Contraseñas

## Resumen

Este servicio de autenticación **SIEMPRE** utiliza bcrypt para almacenar contraseñas de forma segura.

## Estándar

- **Algoritmo**: bcrypt
- **Rounds**: 12
- **Formato**: `$2a$12$...` (60 caracteres)
- **Librería**: `bcryptjs` v2.4.3 o superior

## Implementación

### Creación de Usuario

```javascript
const bcrypt = require('bcryptjs');
const passwordHash = await bcrypt.hash(password, 12);
```

**Ejemplos en el código:**
- `/src/routes/users.js` línea 30: Creación de usuarios
- `/src/routes/setup.js` línea 109: Setup de super admin
- `/scripts/setup-super-admin.js` línea 51: Script de setup

### Validación de Contraseña

```javascript
const bcrypt = require('bcryptjs');
const isValid = await bcrypt.compare(password, passwordHash);
```

**Ejemplos en el código:**
- `/src/routes/auth.js` línea 29: Login de usuarios

## Migración desde SHA256

Si tienes usuarios antiguos con hashes SHA256 (64 caracteres hexadecimales), ejecuta:

```bash
node scripts/migrate-password-hashes.js
```

Este script:
1. Detecta automáticamente hashes SHA256 (64 caracteres que no empiezan con `$2a$`, `$2b$` o `$2y$`)
2. Los convierte a bcrypt usando la contraseña por defecto configurada en `MIGRATION_DEFAULT_PASSWORD`
3. Los usuarios afectados deberán cambiar su contraseña en el primer login

### Variables de Entorno

```env
# Contraseña por defecto para usuarios migrados
MIGRATION_DEFAULT_PASSWORD=Faubel.11
```

## Detección de Formato

### Hash bcrypt válido
```
$2a$12$.QzOgJOFM03kcHOMJmBaL.k.CvVI/tQZ6uwhgMZ9Uo/JIS6hANQeq
```
- Longitud: 60 caracteres
- Empieza con: `$2a$`, `$2b$` o `$2y$`
- Contiene: rounds (`12`), salt y hash

### Hash SHA256 (OBSOLETO)
```
ddc12a8d21174c70706b6cbc48be0842c732437cdc729a2bb617557df9cc7539
```
- Longitud: 64 caracteres
- Solo caracteres hexadecimales (0-9, a-f)
- **NO USAR**: No es seguro, no tiene salt

## Verificación

Para verificar que todos los usuarios tienen hashes bcrypt correctos:

```sql
-- Buscar hashes SHA256 (debería devolver 0)
SELECT COUNT(*) as sha256_count
FROM auth_gangazon.auth_users
WHERE LENGTH(password_hash) = 64
  AND password_hash NOT LIKE '$2a$%'
  AND password_hash NOT LIKE '$2b$%'
  AND password_hash NOT LIKE '$2y$%';

-- Buscar hashes bcrypt (debería devolver todos los usuarios)
SELECT COUNT(*) as bcrypt_count
FROM auth_gangazon.auth_users
WHERE password_hash LIKE '$2a$%'
   OR password_hash LIKE '$2b$%'
   OR password_hash LIKE '$2y$%';
```

## Seguridad

### ¿Por qué bcrypt?

1. **Salt automático**: Cada hash tiene un salt único generado automáticamente
2. **Costo adaptativo**: El parámetro de rounds (12) hace que el hash sea más lento, dificultando ataques de fuerza bruta
3. **Estándar de la industria**: Recomendado por OWASP y ampliamente probado
4. **Resistente a rainbow tables**: Gracias al salt único por contraseña

### ¿Por qué NO usar SHA256 directamente?

1. **Sin salt**: Dos usuarios con la misma contraseña tendrán el mismo hash
2. **Muy rápido**: SHA256 está diseñado para ser rápido, lo que facilita ataques de fuerza bruta
3. **Rainbow tables**: Existen tablas precalculadas de hashes SHA256 comunes
4. **No está diseñado para contraseñas**: SHA256 es para verificar integridad, no para almacenar contraseñas

## Troubleshooting

### Error: "Credenciales inválidas" con contraseña correcta

1. Verificar formato del hash en la base de datos:
```sql
SELECT email, password_hash, LENGTH(password_hash) as hash_length
FROM auth_gangazon.auth_users
WHERE email = 'usuario@ejemplo.com';
```

2. Si el hash tiene 64 caracteres (SHA256), ejecutar migración:
```bash
node scripts/migrate-password-hashes.js
```

### Error: bcryptjs no instalado

```bash
npm install bcryptjs
```

### Cambiar número de rounds

⚠️ **NO RECOMENDADO** en producción con datos existentes.

Si necesitas cambiar los rounds:
1. Actualiza todas las referencias a `bcrypt.hash(password, 12)` con el nuevo número
2. Los hashes existentes seguirán funcionando (bcrypt detecta automáticamente los rounds)
3. Los nuevos usuarios tendrán el nuevo número de rounds

## Referencias

- [bcryptjs en npm](https://www.npmjs.com/package/bcryptjs)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Bcrypt Wikipedia](https://en.wikipedia.org/wiki/Bcrypt)

## Mantenimiento

- **Última actualización**: 2024-11-30
- **Versión del servicio**: 2.0
- **Responsable**: Equipo de Desarrollo Gangazon
