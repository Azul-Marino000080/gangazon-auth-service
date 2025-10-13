# 🧪 Guía de Testing - Auth & Users

## 📋 Prerequisitos

1. **Base de datos configurada**: Ejecutar `database/schema.sql` en Supabase
2. **Variables de entorno**: Configurar archivo `.env` basado en `.env.example`
3. **Dependencias instaladas**: `npm install`
4. **Servidor corriendo**: `npm run dev`

---

## 🔐 AUTH ROUTES

### 1. Login (POST /api/auth/login)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gangazon.com",
    "password": "tu_password",
    "applicationCode": "ADMIN_PANEL"
  }'
```

**Response esperado:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@gangazon.com",
      "firstName": "Super",
      "lastName": "Admin",
      "franchiseId": "uuid"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    },
    "permissions": ["super_admin"],
    "redirectUrl": "http://localhost:3000"
  }
}
```

**⚠️ Guarda el `accessToken` para las siguientes pruebas**

---

### 2. Obtener mi información (GET /api/auth/me)

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

---

### 3. Verificar token (POST /api/auth/verify)

```bash
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

---

### 4. Renovar token (POST /api/auth/refresh)

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "TU_REFRESH_TOKEN"
  }'
```

---

### 5. Logout (POST /api/auth/logout)

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "TU_REFRESH_TOKEN"
  }'
```

---

## 👥 USERS ROUTES

**IMPORTANTE:** Todas las rutas de usuarios requieren autenticación (Header: `Authorization: Bearer TOKEN`)

### 1. Crear usuario (POST /api/users)
**Permiso requerido:** `users.create`

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.perez@gangazon.com",
    "password": "SecurePass123!",
    "firstName": "Juan",
    "lastName": "Pérez",
    "phone": "+34612345678",
    "franchiseId": "uuid-de-franquicia"
  }'
```

---

### 2. Listar usuarios (GET /api/users)
**Permiso requerido:** `users.view`

```bash
# Sin filtros
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer TU_ACCESS_TOKEN"

# Con filtros
curl -X GET "http://localhost:3000/api/users?page=1&limit=10&search=juan&isActive=true" \
  -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

---

### 3. Obtener usuario por ID (GET /api/users/:id)
**Permiso requerido:** `users.view`

```bash
curl -X GET http://localhost:3000/api/users/UUID_DEL_USUARIO \
  -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

---

### 4. Actualizar usuario (PUT /api/users/:id)
**Permiso requerido:** `users.edit`

```bash
curl -X PUT http://localhost:3000/api/users/UUID_DEL_USUARIO \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan Carlos",
    "phone": "+34612345679",
    "isActive": true
  }'
```

---

### 5. Eliminar usuario (DELETE /api/users/:id)
**Permiso requerido:** `super_admin` ⚠️

```bash
curl -X DELETE http://localhost:3000/api/users/UUID_DEL_USUARIO \
  -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

---

### 6. Ver permisos de un usuario (GET /api/users/:id/permissions)
**Permiso requerido:** `permissions.view`

```bash
# Todos los permisos del usuario
curl -X GET http://localhost:3000/api/users/UUID_DEL_USUARIO/permissions \
  -H "Authorization: Bearer TU_ACCESS_TOKEN"

# Filtrar por aplicación
curl -X GET "http://localhost:3000/api/users/UUID_DEL_USUARIO/permissions?applicationId=UUID_APP" \
  -H "Authorization: Bearer TU_ACCESS_TOKEN"
```

---

### 7. Asignar permiso a usuario (POST /api/users/:id/assign)
**Permiso requerido:** `permissions.assign`

```bash
curl -X POST http://localhost:3000/api/users/UUID_DEL_USUARIO/assign \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "uuid-de-aplicacion",
    "permissionId": "uuid-de-permiso",
    "expiresAt": "2026-12-31T23:59:59Z"
  }'
```

---

### 8. Revocar permiso a usuario (DELETE /api/users/:id/revoke)
**Permiso requerido:** `permissions.assign`

```bash
curl -X DELETE http://localhost:3000/api/users/UUID_DEL_USUARIO/revoke \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "uuid-de-aplicacion",
    "permissionId": "uuid-de-permiso"
  }'
```

---

## 🎯 Flujo de Prueba Completo

### Paso 1: Crear Super Admin manualmente en la base de datos

```sql
-- 1. Crear franquicia de prueba (si no existe)
INSERT INTO franchises (id, name, code, email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Gangazon HQ',
  'HQ',
  'hq@gangazon.com'
);

-- 2. Crear usuario super admin
INSERT INTO users (id, email, password_hash, first_name, last_name, franchise_id)
VALUES (
  gen_random_uuid(),
  'admin@gangazon.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5dq.lQT8VAU0a', -- password: "Admin123!"
  'Super',
  'Admin',
  '00000000-0000-0000-0000-000000000001'
);

-- 3. Asignar permiso super_admin
INSERT INTO user_app_permissions (user_id, application_id, permission_id)
VALUES (
  (SELECT id FROM users WHERE email = 'admin@gangazon.com'),
  '00000000-0000-0000-0000-000000000001', -- ADMIN_PANEL app
  '00000000-0000-0000-0000-000000000100'  -- super_admin permission
);
```

### Paso 2: Login como Super Admin

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gangazon.com",
    "password": "Admin123!",
    "applicationCode": "ADMIN_PANEL"
  }'
```

### Paso 3: Crear nuevo usuario

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer TU_TOKEN_DE_SUPER_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@gangazon.com",
    "password": "Manager123!",
    "firstName": "Manager",
    "lastName": "Test",
    "franchiseId": "00000000-0000-0000-0000-000000000001"
  }'
```

### Paso 4: Asignar permiso al nuevo usuario

```bash
curl -X POST http://localhost:3000/api/users/UUID_DEL_NUEVO_USUARIO/assign \
  -H "Authorization: Bearer TU_TOKEN_DE_SUPER_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "00000000-0000-0000-0000-000000000001",
    "permissionId": "00000000-0000-0000-0000-000000000101"
  }'
```

### Paso 5: Login como el nuevo usuario

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@gangazon.com",
    "password": "Manager123!",
    "applicationCode": "ADMIN_PANEL"
  }'
```

---

## 🛠️ Testing con Postman

1. **Importar colección**: Crear una colección en Postman con todas estas rutas
2. **Variables de entorno**:
   - `baseUrl`: `http://localhost:3000`
   - `accessToken`: (se actualiza automáticamente después del login)
   - `refreshToken`: (se actualiza automáticamente después del login)

3. **Script de post-request para Login**:
```javascript
// Guardar tokens automáticamente
if (pm.response.code === 200) {
  const response = pm.response.json();
  pm.environment.set("accessToken", response.data.tokens.accessToken);
  pm.environment.set("refreshToken", response.data.tokens.refreshToken);
}
```

---

## 🚨 Errores Comunes

### Error 401: Token no proporcionado
```json
{
  "success": false,
  "error": "Token no proporcionado"
}
```
**Solución**: Agregar header `Authorization: Bearer TU_TOKEN`

---

### Error 403: Permiso denegado
```json
{
  "success": false,
  "error": "Permiso denegado. Se requiere: users.create"
}
```
**Solución**: El usuario no tiene el permiso necesario. Asignar el permiso con super_admin.

---

### Error 409: Email ya registrado
```json
{
  "success": false,
  "error": "El email ya está registrado"
}
```
**Solución**: Usar un email diferente o eliminar el usuario existente.

---

### Error 404: Usuario no encontrado
```json
{
  "success": false,
  "error": "Usuario no encontrado"
}
```
**Solución**: Verificar que el UUID del usuario sea correcto.

---

## 📊 Validaciones Implementadas

### Login:
- ✅ Email válido
- ✅ Contraseña mínimo 8 caracteres
- ✅ Application code requerido

### Crear Usuario:
- ✅ Email único
- ✅ Contraseña mínimo 8 caracteres
- ✅ Nombre y apellido mínimo 2 caracteres
- ✅ Franchise ID válido (si se proporciona)

### Actualizar Usuario:
- ✅ Al menos un campo debe estar presente
- ✅ Valores válidos según tipo

### Asignar Permiso:
- ✅ Usuario existe
- ✅ Permiso existe y pertenece a la aplicación
- ✅ No duplicar asignaciones

---

## ✅ Checklist de Verificación

- [ ] Servidor corriendo sin errores
- [ ] Base de datos conectada (ver logs)
- [ ] Super admin creado en la BD
- [ ] Login exitoso retorna tokens
- [ ] Token incluido en headers de requests protegidos
- [ ] Permisos funcionando correctamente
- [ ] Logs de auditoría registrándose
- [ ] Sesiones creándose en login
- [ ] Refresh tokens guardándose

---

## 🔍 Debugging

Ver logs del servidor:
```bash
tail -f logs/combined.log
tail -f logs/error.log
```

Ver queries de Supabase en el dashboard de Supabase.

---

¿Todo listo? 🚀 Ahora puedes probar las rutas de **AUTH** y **USERS**!
