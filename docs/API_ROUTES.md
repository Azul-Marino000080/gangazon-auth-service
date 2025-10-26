# 🗺️ Mapa Completo de Rutas y Permisos

## 📊 Resumen de Permisos Especiales

### 🔴 **super_admin** (Permiso Único del Sistema)
Usuario con este permiso tiene privilegios EXCLUSIVOS para:
- ✅ **Registrar** y **eliminar** aplicaciones
- ✅ **Eliminar** permisos del catálogo (no solo revocarlos de usuarios)
- ✅ **Eliminar** usuarios del sistema
- ✅ **Eliminar** franquicias
- ✅ **Eliminar** sesiones de cualquier usuario
- ✅ Modificar aplicaciones

**⚠️ IMPORTANTE:** Solo asignar a usuarios de máxima confianza. Este permiso permite eliminar datos críticos del sistema.

---

## 🔐 **AUTH - Rutas de Autenticación**

### `POST /api/auth/login`
**Permisos:** Ninguno (público)  
**Descripción:** Login de usuario  
**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "applicationCode": "FICHAJES"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "tokens": {
      "accessToken": "...",
      "refreshToken": "..."
    },
    "permissions": ["fichajes.create", "fichajes.view"],
    "redirectUrl": "https://fichajes.gangazon.com"
  }
}
```

---

### `POST /api/auth/logout`
**Permisos:** Ninguno (requiere token válido)  
**Descripción:** Cerrar sesión del usuario actual  
**Body:**
```json
{
  "refreshToken": "..."
}
```

---

### `POST /api/auth/refresh`
**Permisos:** Ninguno (requiere refresh token)  
**Descripción:** Renovar access token  
**Body:**
```json
{
  "refreshToken": "..."
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "nuevo_token...",
      "refreshToken": "mismo_refresh..."
    }
  }
}
```

---

### `POST /api/auth/verify`
**Permisos:** Ninguno (requiere token en header)  
**Descripción:** Verificar validez de un token (para otras apps)  
**Headers:** `Authorization: Bearer <token>`  
**Response:**
```json
{
  "valid": true,
  "user": {
    "userId": "...",
    "email": "...",
    "permissions": [...],
    "franchiseId": "..."
  }
}
```

---

### `GET /api/auth/me`
**Permisos:** Ninguno (requiere token válido)  
**Descripción:** Obtener información del usuario actual  
**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "...",
      "firstName": "...",
      "lastName": "...",
      "franchise": {...}
    }
  }
}
```

---

## 👥 **USERS - Gestión de Usuarios**

### `POST /api/users`
**Permisos:** `users.create`  
**Descripción:** Crear nuevo usuario  
**Body:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "firstName": "Juan",
  "lastName": "Pérez",
  "franchiseId": "uuid-optional"
}
```

---

### `GET /api/users`
**Permisos:** `users.view`  
**Descripción:** Listar usuarios  
**Query Params:**
- `?page=1`
- `?limit=20`
- `?franchiseId=uuid`
- `?search=email`

---

### `GET /api/users/:id`
**Permisos:** `users.view`  
**Descripción:** Obtener usuario por ID

---

### `PUT /api/users/:id`
**Permisos:** `users.edit`  
**Descripción:** Actualizar usuario  
**Body:**
```json
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "phone": "+34612345678",
  "isActive": true
}
```

---

### `DELETE /api/users/:id`
**Permisos:** `super_admin` ⚠️  
**Descripción:** Eliminar usuario del sistema

---

### `GET /api/users/:id/permissions`
**Permisos:** `permissions.view`  
**Descripción:** Ver permisos de un usuario  
**Query Params:** `?applicationId=uuid` (opcional)

---

### `POST /api/users/:id/assign`
**Permisos:** `permissions.assign`  
**Descripción:** Asignar permiso a usuario  
**Body:**
```json
{
  "applicationId": "uuid",
  "permissionId": "uuid",
  "expiresAt": "2026-01-01T00:00:00Z" // opcional
}
```

---

### `DELETE /api/users/:id/revoke`
**Permisos:** `permissions.assign`  
**Descripción:** Revocar permiso a usuario  
**Body:**
```json
{
  "applicationId": "uuid",
  "permissionId": "uuid"
}
```

---

## 📱 **APPLICATIONS - Gestión de Aplicaciones**

### `POST /api/applications`
**Permisos:** `super_admin` ⚠️  
**Descripción:** Registrar nueva aplicación  
**Body:**
```json
{
  "name": "App de Fichajes",
  "code": "FICHAJES",
  "description": "Aplicación para registrar entradas y salidas",
  "redirectUrl": "https://fichajes.gangazon.com/auth/callback",
  "allowedOrigins": ["https://fichajes.gangazon.com"]
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "application": {
      "id": "uuid",
      "name": "App de Fichajes",
      "code": "FICHAJES",
      "apiKey": "ganz_1697123456_abc123xyz"
    }
  }
}
```

---

### `GET /api/applications`
**Permisos:** `applications.view`  
**Descripción:** Listar aplicaciones registradas

---

### `GET /api/applications/:id`
**Permisos:** `applications.view`  
**Descripción:** Obtener aplicación por ID

---

### `PUT /api/applications/:id`
**Permisos:** `super_admin` ⚠️  
**Descripción:** Actualizar aplicación  
**Body:**
```json
{
  "name": "App de Fichajes v2",
  "redirectUrl": "https://nuevaurl.com",
  "allowedOrigins": ["https://nuevaurl.com"],
  "isActive": true
}
```

---

### `DELETE /api/applications/:id`
**Permisos:** `super_admin` ⚠️  
**Descripción:** Eliminar aplicación (también elimina sus permisos)

---

### `POST /api/applications/:id/regenerate-key`
**Permisos:** `super_admin` ⚠️  
**Descripción:** Regenerar API key de la aplicación  
**Response:**
```json
{
  "success": true,
  "data": {
    "apiKey": "ganz_1697123456_xyz789new"
  }
}
```

---

## 🔑 **PERMISSIONS - Gestión de Permisos**

### `POST /api/permissions`
**Permisos:** `permissions.create`  
**Descripción:** Crear nuevo permiso para una aplicación  
**Body:**
```json
{
  "applicationId": "uuid",
  "code": "fichajes.create",
  "displayName": "Crear fichajes",
  "description": "Permite registrar entradas y salidas",
  "category": "fichajes"
}
```

---

### `GET /api/permissions`
**Permisos:** `permissions.view`  
**Descripción:** Listar permisos  
**Query Params:**
- `?applicationId=uuid` (filtrar por app)
- `?category=fichajes` (filtrar por categoría)
- `?page=1`
- `?limit=50`

---

### `GET /api/permissions/:id`
**Permisos:** `permissions.view`  
**Descripción:** Obtener permiso por ID

---

### `PUT /api/permissions/:id`
**Permisos:** `permissions.edit`  
**Descripción:** Actualizar permiso  
**Body:**
```json
{
  "displayName": "Crear y editar fichajes",
  "description": "Nueva descripción",
  "isActive": true
}
```

---

### `DELETE /api/permissions/:id`
**Permisos:** `super_admin` ⚠️  
**Descripción:** Eliminar permiso del catálogo (también elimina asignaciones)

---

## 🏢 **FRANCHISES - Gestión de Franquicias**

### `POST /api/franchises`
**Permisos:** `franchises.create`  
**Descripción:** Crear nueva franquicia  
**Body:**
```json
{
  "name": "Franquicia Madrid Centro",
  "code": "MAD_CENTRO",
  "email": "madrid@gangazon.com",
  "phone": "+34912345678",
  "address": "Calle Gran Vía, 1",
  "city": "Madrid",
  "state": "Madrid",
  "postalCode": "28013",
  "country": "España",
  "contactPerson": "María García"
}
```

---

### `GET /api/franchises`
**Permisos:** `franchises.view`  
**Descripción:** Listar franquicias  
**Query Params:**
- `?page=1`
- `?limit=20`
- `?search=madrid`
- `?isActive=true`

---

### `GET /api/franchises/:id`
**Permisos:** `franchises.view`  
**Descripción:** Obtener franquicia por ID

---

### `PUT /api/franchises/:id`
**Permisos:** `franchises.edit`  
**Descripción:** Actualizar franquicia  
**Body:**
```json
{
  "name": "Franquicia Madrid Centro - Actualizado",
  "phone": "+34912345679",
  "isActive": true
}
```

---

### `DELETE /api/franchises/:id`
**Permisos:** `super_admin` ⚠️  
**Descripción:** Eliminar franquicia (los usuarios quedan sin franquicia)

---

## 🔒 **SESSIONS - Gestión de Sesiones**

### `GET /api/sessions`
**Permisos:** `sessions.view`  
**Descripción:** Listar sesiones activas  
**Query Params:**
- `?userId=uuid` (filtrar por usuario)
- `?applicationId=uuid` (filtrar por app)
- `?isActive=true`

---

### `GET /api/sessions/my`
**Permisos:** Ninguno (usuario autenticado)  
**Descripción:** Ver mis propias sesiones activas

---

### `DELETE /api/sessions/:id`
**Permisos:** `super_admin` ⚠️  
**Descripción:** Cerrar sesión específica

---

### `DELETE /api/sessions/user/:userId`
**Permisos:** `super_admin` ⚠️  
**Descripción:** Cerrar todas las sesiones de un usuario (forzar re-login)

---

## 📊 **AUDIT - Logs de Auditoría**

### `GET /api/audit`
**Permisos:** `audit.view`  
**Descripción:** Ver logs de auditoría  
**Query Params:**
- `?userId=uuid`
- `?applicationId=uuid`
- `?action=login,logout,permission_assigned`
- `?startDate=2025-10-01`
- `?endDate=2025-10-31`
- `?page=1`
- `?limit=50`

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "user": {
          "email": "user@example.com",
          "firstName": "Juan"
        },
        "application": {
          "name": "App Fichajes"
        },
        "action": "login",
        "details": {...},
        "ipAddress": "192.168.1.1",
        "createdAt": "2025-10-13T10:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

---

## 🛡️ Matriz de Permisos

| Ruta | super_admin | users.* | franchises.* | applications.* | permissions.* | sessions.* | audit.view |
|------|-------------|---------|--------------|----------------|---------------|------------|------------|
| POST /users | ✅ | create | ❌ | ❌ | ❌ | ❌ | ❌ |
| DELETE /users/:id | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /users | ✅ | view | ❌ | ❌ | ❌ | ❌ | ❌ |
| PUT /users/:id | ✅ | edit | ❌ | ❌ | ❌ | ❌ | ❌ |
| POST /applications | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| DELETE /applications/:id | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PUT /applications/:id | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /applications | ✅ | ❌ | ❌ | view | ❌ | ❌ | ❌ |
| POST /permissions | ✅ | ❌ | ❌ | ❌ | create | ❌ | ❌ |
| DELETE /permissions/:id | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PUT /permissions/:id | ✅ | ❌ | ❌ | ❌ | edit | ❌ | ❌ |
| GET /permissions | ✅ | ❌ | ❌ | ❌ | view | ❌ | ❌ |
| POST /franchises | ✅ | ❌ | create | ❌ | ❌ | ❌ | ❌ |
| DELETE /franchises/:id | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /franchises | ✅ | ❌ | view | ❌ | ❌ | ❌ | ❌ |
| PUT /franchises/:id | ✅ | ❌ | edit | ❌ | ❌ | ❌ | ❌ |
| DELETE /sessions/:id | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /sessions | ✅ | ❌ | ❌ | ❌ | ❌ | view | ❌ |
| POST /users/:id/assign | ✅ | ❌ | ❌ | ❌ | assign | ❌ | ❌ |
| GET /audit | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🔐 Middleware de Validación de Permisos

```javascript
// Ejemplo de uso en rutas
const { requirePermission, requireSuperAdmin } = require('../middleware/auth');

// Requiere super_admin
router.delete('/users/:id', requireSuperAdmin, deleteUser);

// Requiere permiso específico
router.get('/users', requirePermission('users.view'), listUsers);

// Requiere uno de varios permisos
router.get('/permissions', 
  requirePermission(['permissions.view', 'super_admin']), 
  listPermissions
);
```

---

## 📝 Notas Importantes

### ⚠️ **Acciones que SOLO puede hacer super_admin:**
1. Eliminar usuarios (DELETE /users/:id)
2. Registrar aplicaciones (POST /applications)
3. Eliminar aplicaciones (DELETE /applications/:id)
4. Editar aplicaciones (PUT /applications/:id)
5. Regenerar API keys (POST /applications/:id/regenerate-key)
6. Eliminar permisos del catálogo (DELETE /permissions/:id)
7. Eliminar franquicias (DELETE /franchises/:id)
8. Cerrar sesiones de otros usuarios (DELETE /sessions/:id y DELETE /sessions/user/:userId)

### ✅ **Acciones que puede hacer cualquier usuario con el permiso adecuado:**
1. Ver usuarios (users.view)
2. Crear usuarios (users.create)
3. Editar usuarios (users.edit)
4. Crear permisos (permissions.create)
5. Editar permisos (permissions.edit)
6. Asignar/Revocar permisos a usuarios (permissions.assign)
7. Ver y gestionar aplicaciones (applications.view)
8. Crear, ver y editar franquicias (franchises.create, franchises.view, franchises.edit)
9. Ver sesiones (sessions.view)
10. Ver auditoría (audit.view)

---

## 🚀 Flujo de Configuración Inicial

### 1. **Crear Super Admin** (mediante script SQL o endpoint de emergencia)
```sql
-- Crear usuario super admin
INSERT INTO users (id, email, password_hash, first_name, last_name)
VALUES ('uuid', 'admin@gangazon.com', 'hash', 'Super', 'Admin');

-- Asignar permiso super_admin
INSERT INTO user_app_permissions (user_id, application_id, permission_id)
VALUES (
  'uuid-usuario',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000100' -- ID del permiso super_admin
);
```

### 2. **Super Admin hace login**
```http
POST /api/auth/login
{
  "email": "admin@gangazon.com",
  "password": "...",
  "applicationCode": "ADMIN_PANEL"
}
```

### 3. **Super Admin registra nueva aplicación**
```http
POST /api/applications
{
  "name": "App de Fichajes",
  "code": "FICHAJES",
  ...
}
```

### 4. **Super Admin crea permisos para esa app**
```http
POST /api/permissions
{
  "applicationId": "uuid-fichajes",
  "code": "fichajes.create",
  ...
}
```

### 5. **Super Admin crea usuarios y les asigna permisos**
```http
POST /api/users
POST /api/users/:id/assign
```

---

¿Quieres que ahora implemente todas estas rutas con sus controladores? 🚀
