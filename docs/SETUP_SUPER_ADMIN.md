# Crear Super Administrador - Setup Inicial

## 🔐 Configuración Requerida

### Variables de Entorno

Agregar al archivo `.env`:

```bash
# Setup del sistema
ALLOW_SETUP=true
SETUP_TOKEN=4200003e3b0715150c742166ac9e2fc9d9d173c10e8a141baff60efbf1f0c860
```

**⚠️ IMPORTANTE:** 
- Establece `ALLOW_SETUP=false` después de crear el super admin
- El token de setup es único y debe mantenerse secreto

---

## 📋 Pasos para Crear el Primer Super Admin

### 1. Verificar que el Schema esté ejecutado

Antes de crear el super admin, asegúrate de haber ejecutado el `schema.sql` en Supabase.

### 2. Verificar el estado del setup

**Endpoint:** `GET /api/setup/status`

```bash
curl http://localhost:10000/api/setup/status
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "setupEnabled": true,
    "hasSuperAdmin": false,
    "message": "Setup habilitado. Use POST /api/setup/super-admin con header x-setup-token para crear el super admin."
  }
}
```

### 3. Crear el Super Admin

**Endpoint:** `POST /api/setup/super-admin`

**Headers requeridos:**
```
Content-Type: application/json
x-setup-token: 4200003e3b0715150c742166ac9e2fc9d9d173c10e8a141baff60efbf1f0c860
```

**Body requerido:**
```json
{
  "email": "admin@gangazon.com",
  "password": "Admin123!",
  "firstName": "Super",
  "lastName": "Admin",
  "phone": "+34 600 000 000"
}
```

**Comando cURL completo:**

```bash
curl -X POST http://localhost:10000/api/setup/super-admin \
  -H "Content-Type: application/json" \
  -H "x-setup-token: 4200003e3b0715150c742166ac9e2fc9d9d173c10e8a141baff60efbf1f0c860" \
  -d '{
    "email": "admin@gangazon.com",
    "password": "Admin123!",
    "firstName": "Super",
    "lastName": "Admin",
    "phone": "+34 600 000 000"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Super administrador creado exitosamente",
  "data": {
    "user": {
      "id": "uuid-del-usuario",
      "email": "admin@gangazon.com",
      "firstName": "Super",
      "lastName": "Admin",
      "franchise": "GANGAZON_HQ"
    }
  }
}
```

---

## 🔒 Seguridad

### Protecciones Implementadas

1. **Variable de entorno:** `ALLOW_SETUP` debe ser `true`
2. **Token secreto:** Se valida el header `x-setup-token`
3. **Solo un super admin inicial:** Si ya existe uno, el endpoint se bloquea
4. **Validaciones de datos:** Email, password (min 8 chars), nombres requeridos
5. **Auditoría:** Se registra en `audit_log` con flag `createdViaSetup: true`

### Errores Comunes

#### ❌ Setup deshabilitado
```json
{
  "success": false,
  "error": "AppError",
  "message": "El endpoint de setup está deshabilitado"
}
```
**Solución:** Establecer `ALLOW_SETUP=true` en `.env`

#### ❌ Token inválido
```json
{
  "success": false,
  "error": "AppError",
  "message": "Token de setup inválido"
}
```
**Solución:** Usar el token correcto en header `x-setup-token`

#### ❌ Ya existe super admin
```json
{
  "success": false,
  "error": "AppError",
  "message": "Ya existe un super administrador en el sistema. Use el panel de administración para crear más usuarios."
}
```
**Solución:** Ya no necesitas este endpoint, usa el panel de admin

#### ❌ Schema no ejecutado
```json
{
  "success": false,
  "error": "AppError",
  "message": "Franquicia matriz no encontrada. Ejecute el schema.sql primero."
}
```
**Solución:** Ejecutar `database/schema.sql` en Supabase SQL Editor

---

## 🎯 Después de Crear el Super Admin

### 1. Deshabilitar el Setup

Editar `.env`:
```bash
ALLOW_SETUP=false
```

O eliminar la variable completamente.

### 2. Reiniciar el servidor

```bash
npm start
```

### 3. Hacer login con el super admin

**Endpoint:** `POST /api/auth/login`

```bash
curl -X POST http://localhost:10000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gangazon.com",
    "password": "Admin123!",
    "applicationCode": "ADMIN_PANEL"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@gangazon.com",
      "firstName": "Super",
      "lastName": "Admin",
      "franchiseId": "uuid-gangazon-hq"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1...",
      "refreshToken": "eyJhbGciOiJIUzI1..."
    },
    "permissions": [
      "super_admin",
      "users.view",
      "users.create",
      "users.edit",
      "users.delete",
      "franchises.view",
      "franchises.create",
      "... todos los permisos ..."
    ],
    "redirectUrl": "http://localhost:3000"
  }
}
```

### 4. Verificar permisos

El super admin debería tener automáticamente TODOS los permisos del sistema gracias al trigger `assign_permission_to_super_admins()`.

---

## 📊 Datos del Super Admin Creado

| Campo | Valor |
|-------|-------|
| **Email** | admin@gangazon.com |
| **Password** | Admin123! (cambiar después del primer login) |
| **Franquicia** | GANGAZON_HQ (Franquicia Matriz) |
| **Permisos** | Todos (23 permisos automáticamente asignados) |
| **Aplicación** | ADMIN_PANEL |
| **Estado** | Activo |
| **Email verificado** | true |

---

## 🔄 Crear Más Usuarios Super Admin

Una vez que tengas el primer super admin:

1. **Login** con el primer super admin
2. **Usar endpoint:** `POST /api/users` (con token JWT)
3. **Asignar permiso:** `POST /api/users/:id/assign` con `permissionId` de `super_admin`

**El endpoint `/api/setup/super-admin` se bloqueará automáticamente** al detectar que ya existe un super admin.

---

## 🧪 Testing con Postman

### Collection: Setup Super Admin

#### 1. Check Setup Status
```
GET http://localhost:10000/api/setup/status
```

#### 2. Create Super Admin
```
POST http://localhost:10000/api/setup/super-admin
Headers:
  Content-Type: application/json
  x-setup-token: 4200003e3b0715150c742166ac9e2fc9d9d173c10e8a141baff60efbf1f0c860
Body (JSON):
{
  "email": "admin@gangazon.com",
  "password": "Admin123!",
  "firstName": "Super",
  "lastName": "Admin",
  "phone": "+34 600 000 000"
}
```

#### 3. Login as Super Admin
```
POST http://localhost:10000/api/auth/login
Headers:
  Content-Type: application/json
Body (JSON):
{
  "email": "admin@gangazon.com",
  "password": "Admin123!",
  "applicationCode": "ADMIN_PANEL"
}
```

---

## ⚠️ Consideraciones de Producción

### En Producción

1. **Nunca** dejar `ALLOW_SETUP=true` permanentemente
2. **Eliminar** la variable `ALLOW_SETUP` del `.env` después del setup
3. **Cambiar** el `SETUP_TOKEN` por uno único generado:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. **Registrar** en logs cuando se use este endpoint
5. **Considerar** eliminar completamente la ruta `/api/setup` después del setup inicial

### Script para Generar Token Único

```javascript
// generate-setup-token.js
const crypto = require('crypto');
const token = crypto.randomBytes(32).toString('hex');
console.log('Token de setup generado:');
console.log(token);
console.log('\nAgregar al .env:');
console.log(`SETUP_TOKEN=${token}`);
```

Ejecutar:
```bash
node generate-setup-token.js
```

---

## 📝 Resumen del Flujo

```
1. Ejecutar schema.sql en Supabase
   ↓
2. Configurar .env (ALLOW_SETUP=true, SETUP_TOKEN=...)
   ↓
3. Iniciar servidor (npm start)
   ↓
4. GET /api/setup/status (verificar)
   ↓
5. POST /api/setup/super-admin (con x-setup-token)
   ↓
6. Establecer ALLOW_SETUP=false
   ↓
7. Reiniciar servidor
   ↓
8. POST /api/auth/login (con credenciales del super admin)
   ↓
9. ✅ Sistema listo para usar
```

---

## 🎉 ¡Listo!

Tu super administrador está creado y el sistema está protegido contra creación no autorizada de nuevos super admins.

Desde este momento, todos los nuevos usuarios deben crearse a través del panel de administración usando las credenciales del super admin.
