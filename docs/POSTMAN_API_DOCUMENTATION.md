# Gangazon Auth Service - API Documentation

## 📋 Información General

**Base URL:** `http://localhost:4000/api` (local) o `https://auth.gangazon.com/api` (producción)

**Versión:** 2.0.0

**Esquema de Base de Datos:** `auth_gangazon`

**Prefijo de Tablas:** `auth_*`

---

## 🔐 Autenticación

Todas las rutas (excepto `/auth/login`, `/auth/refresh` y `/auth/verify`) requieren un token JWT en el header:

```
Authorization: Bearer <access_token>
```

---

## 📁 Estructura de Respuestas

### Respuesta Exitosa
```json
{
  "success": true,
  "data": {
    ...
  }
}
```

### Respuesta de Error
```json
{
  "success": false,
  "error": {
    "message": "Descripción del error",
    "code": "ERROR_CODE"
  }
}
```

### Respuesta Paginada
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "totalPages": 5
    }
  }
}
```

---

## 🔑 AUTH - Autenticación

### 1. Login
**Endpoint:** `POST /auth/login`

**Descripción:** Autenticar un usuario y obtener tokens de acceso

**Permisos:** Ninguno (público)

**Request Body:**
```json
{
  "email": "admin@gangazon.com",
  "password": "SecurePassword123!",
  "applicationCode": "SCANNER_ADMIN"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@gangazon.com",
      "firstName": "Admin",
      "lastName": "Gangazon",
      "franchiseId": "uuid-franchise"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    },
    "permissions": [
      "super_admin",
      "files.view",
      "files.upload"
    ],
    "redirectUrl": "http://localhost:3000/admin"
  }
}
```

**Errores:**
- `401 Unauthorized` - Credenciales inválidas
- `403 Forbidden` - Usuario o aplicación desactivados

---

### 2. Logout
**Endpoint:** `POST /auth/logout`

**Descripción:** Cerrar sesión del usuario actual

**Permisos:** Token válido requerido

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Sesión cerrada correctamente"
}
```

---

### 3. Refresh Token
**Endpoint:** `POST /auth/refresh`

**Descripción:** Renovar el access token usando el refresh token

**Permisos:** Ninguno (requiere refresh token válido)

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "nuevo_token_access...",
      "refreshToken": "mismo_refresh_token..."
    }
  }
}
```

**Errores:**
- `401 Unauthorized` - Refresh token inválido o expirado

---

### 4. Verify Token
**Endpoint:** `POST /auth/verify`

**Descripción:** Verificar si un access token es válido (para otras aplicaciones)

**Permisos:** Token válido requerido

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "valid": true,
  "user": {
    "userId": "uuid",
    "email": "admin@gangazon.com",
    "firstName": "Admin",
    "lastName": "Gangazon",
    "franchiseId": "uuid-franchise",
    "permissions": ["super_admin", "files.view"]
  }
}
```

---

### 5. Get Current User
**Endpoint:** `GET /auth/me`

**Descripción:** Obtener información del usuario autenticado

**Permisos:** Token válido requerido

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@gangazon.com",
      "firstName": "Admin",
      "lastName": "Gangazon",
      "phone": "+34612345678",
      "isActive": true,
      "franchise": {
        "id": "uuid-franchise",
        "name": "Gangazon Matriz",
        "code": "GANGAZON_HQ"
      },
      "permissions": ["super_admin"],
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }
}
```

---

## 👥 USERS - Gestión de Usuarios

### 1. Create User
**Endpoint:** `POST /users`

**Descripción:** Crear un nuevo usuario administrador

**Permisos:** `users.create` o `super_admin`

**Request Body:**
```json
{
  "email": "newuser@gangazon.com",
  "password": "SecurePass123!",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phone": "+34612345678",
  "franchiseId": "uuid-franchise-optional"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "new-uuid",
      "email": "newuser@gangazon.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "phone": "+34612345678",
      "isActive": true,
      "franchiseId": "uuid-franchise",
      "createdAt": "2025-11-07T00:00:00Z"
    }
  }
}
```

**Errores:**
- `400 Bad Request` - Email ya registrado
- `404 Not Found` - Franquicia no encontrada

---

### 2. List Users
**Endpoint:** `GET /users`

**Descripción:** Listar todos los usuarios con paginación

**Permisos:** `users.view` o `super_admin`

**Query Parameters:**
- `page` (number, default: 1) - Número de página
- `limit` (number, default: 20) - Usuarios por página
- `franchiseId` (uuid) - Filtrar por franquicia
- `search` (string) - Buscar por email, nombre o apellido
- `isActive` (boolean) - Filtrar por estado activo

**Example Request:**
```
GET /users?page=1&limit=20&search=juan&isActive=true
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@gangazon.com",
        "firstName": "Juan",
        "lastName": "Pérez",
        "isActive": true,
        "franchise": {
          "id": "uuid-franchise",
          "name": "Madrid Centro"
        },
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

---

### 3. Get User by ID
**Endpoint:** `GET /users/:id`

**Descripción:** Obtener información detallada de un usuario

**Permisos:** `users.view` o `super_admin`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@gangazon.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "phone": "+34612345678",
      "isActive": true,
      "emailVerified": false,
      "franchise": {
        "id": "uuid-franchise",
        "name": "Madrid Centro",
        "code": "MAD_CENTRO"
      },
      "lastLoginAt": "2025-11-06T10:30:00Z",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }
}
```

---

### 4. Update User
**Endpoint:** `PUT /users/:id`

**Descripción:** Actualizar información de un usuario

**Permisos:** `users.edit` o `super_admin`

**Request Body:**
```json
{
  "firstName": "Juan Carlos",
  "lastName": "Pérez García",
  "phone": "+34612345679",
  "isActive": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@gangazon.com",
      "firstName": "Juan Carlos",
      "lastName": "Pérez García",
      "phone": "+34612345679",
      "isActive": true,
      "updatedAt": "2025-11-07T00:00:00Z"
    }
  }
}
```

---

### 5. Delete User
**Endpoint:** `DELETE /users/:id`

**Descripción:** Eliminar un usuario del sistema

**Permisos:** `super_admin` únicamente

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Usuario eliminado correctamente"
}
```

**Errores:**
- `400 Bad Request` - No puedes eliminar tu propio usuario
- `404 Not Found` - Usuario no encontrado

---

### 6. Get User Permissions
**Endpoint:** `GET /users/:id/permissions`

**Descripción:** Obtener todos los permisos de un usuario

**Permisos:** `permissions.view` o `super_admin`

**Query Parameters:**
- `applicationId` (uuid, optional) - Filtrar por aplicación específica

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "permissions": [
      {
        "permissionId": "uuid-perm",
        "permissionCode": "files.view",
        "permissionName": "Ver archivos",
        "category": "files",
        "applicationId": "uuid-app",
        "applicationName": "Scanner Admin",
        "assignedAt": "2025-01-01T00:00:00Z",
        "expiresAt": null
      }
    ]
  }
}
```

---

### 7. Assign Permission to User
**Endpoint:** `POST /users/:id/assign`

**Descripción:** Asignar un permiso a un usuario

**Permisos:** `permissions.assign` o `super_admin`

**Request Body:**
```json
{
  "applicationId": "uuid-app",
  "permissionId": "uuid-perm",
  "expiresAt": "2026-01-01T00:00:00Z"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Permiso asignado correctamente"
}
```

**Errores:**
- `400 Bad Request` - Usuario ya tiene este permiso asignado
- `400 Bad Request` - Fecha de expiración debe ser futura

---

### 8. Revoke Permission from User
**Endpoint:** `DELETE /users/:id/revoke`

**Descripción:** Revocar un permiso de un usuario

**Permisos:** `permissions.assign` o `super_admin`

**Request Body:**
```json
{
  "applicationId": "uuid-app",
  "permissionId": "uuid-perm"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Permiso revocado correctamente"
}
```

---

## 📱 APPLICATIONS - Gestión de Aplicaciones

### 1. Create Application
**Endpoint:** `POST /applications`

**Descripción:** Registrar una nueva aplicación en el sistema

**Permisos:** `super_admin` únicamente

**Request Body:**
```json
{
  "name": "Scanner Admin",
  "code": "SCANNER_ADMIN",
  "description": "Panel de administración del escáner de productos",
  "redirectUrl": "http://localhost:3000/admin",
  "allowedOrigins": [
    "http://localhost:3000",
    "https://scanner.gangazon.com"
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "application": {
      "id": "uuid-app",
      "name": "Scanner Admin",
      "code": "SCANNER_ADMIN",
      "description": "Panel de administración del escáner de productos",
      "redirectUrl": "http://localhost:3000/admin",
      "apiKey": "ganz_1730934567_abc123xyz789",
      "allowedOrigins": [
        "http://localhost:3000",
        "https://scanner.gangazon.com"
      ],
      "isActive": true,
      "createdAt": "2025-11-07T00:00:00Z"
    }
  }
}
```

---

### 2. List Applications
**Endpoint:** `GET /applications`

**Descripción:** Listar todas las aplicaciones registradas

**Permisos:** `applications.view` o `super_admin`

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `isActive` (boolean)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "uuid-app",
        "name": "Scanner Admin",
        "code": "SCANNER_ADMIN",
        "redirectUrl": "http://localhost:3000/admin",
        "isActive": true,
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 2,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

### 3. Get Application by ID
**Endpoint:** `GET /applications/:id`

**Descripción:** Obtener detalles de una aplicación

**Permisos:** `applications.view` o `super_admin`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "application": {
      "id": "uuid-app",
      "name": "Scanner Admin",
      "code": "SCANNER_ADMIN",
      "description": "Panel de administración del escáner",
      "redirectUrl": "http://localhost:3000/admin",
      "apiKey": "ganz_1730934567_abc123xyz789",
      "allowedOrigins": ["http://localhost:3000"],
      "isActive": true,
      "permissionCount": 15,
      "userCount": 8,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-11-06T00:00:00Z"
    }
  }
}
```

---

### 4. Update Application
**Endpoint:** `PUT /applications/:id`

**Descripción:** Actualizar configuración de una aplicación

**Permisos:** `super_admin` únicamente

**Request Body:**
```json
{
  "name": "Scanner Admin v2",
  "redirectUrl": "https://scanner.gangazon.com/auth/callback",
  "allowedOrigins": ["https://scanner.gangazon.com"],
  "isActive": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "application": {
      "id": "uuid-app",
      "name": "Scanner Admin v2",
      "code": "SCANNER_ADMIN",
      "redirectUrl": "https://scanner.gangazon.com/auth/callback",
      "isActive": true,
      "updatedAt": "2025-11-07T00:00:00Z"
    }
  }
}
```

---

### 5. Delete Application
**Endpoint:** `DELETE /applications/:id`

**Descripción:** Eliminar una aplicación y todos sus permisos

**Permisos:** `super_admin` únicamente

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Aplicación eliminada correctamente"
}
```

---

### 6. Regenerate API Key
**Endpoint:** `POST /applications/:id/regenerate-key`

**Descripción:** Generar una nueva API key para la aplicación

**Permisos:** `super_admin` únicamente

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "apiKey": "ganz_1730967890_xyz789new456"
  }
}
```

---

## 🔑 PERMISSIONS - Gestión de Permisos

### 1. Create Permission
**Endpoint:** `POST /permissions`

**Descripción:** Crear un nuevo permiso para una aplicación

**Permisos:** `permissions.create` o `super_admin`

**Request Body:**
```json
{
  "applicationId": "uuid-app",
  "code": "files.upload",
  "displayName": "Subir archivos",
  "description": "Permite subir nuevos archivos CSV al sistema",
  "category": "files"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "permission": {
      "id": "uuid-perm",
      "applicationId": "uuid-app",
      "code": "files.upload",
      "displayName": "Subir archivos",
      "description": "Permite subir nuevos archivos CSV al sistema",
      "category": "files",
      "isActive": true,
      "createdAt": "2025-11-07T00:00:00Z"
    }
  }
}
```

---

### 2. List Permissions
**Endpoint:** `GET /permissions`

**Descripción:** Listar todos los permisos

**Permisos:** `permissions.view` o `super_admin`

**Query Parameters:**
- `applicationId` (uuid) - Filtrar por aplicación
- `category` (string) - Filtrar por categoría
- `page` (number)
- `limit` (number)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "permissions": [
      {
        "id": "uuid-perm",
        "applicationId": "uuid-app",
        "applicationName": "Scanner Admin",
        "code": "files.upload",
        "displayName": "Subir archivos",
        "category": "files",
        "isActive": true
      }
    ],
    "pagination": {
      "total": 30,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    }
  }
}
```

---

### 3. Get Permission by ID
**Endpoint:** `GET /permissions/:id`

**Descripción:** Obtener detalles de un permiso

**Permisos:** `permissions.view` o `super_admin`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "permission": {
      "id": "uuid-perm",
      "applicationId": "uuid-app",
      "applicationName": "Scanner Admin",
      "code": "files.upload",
      "displayName": "Subir archivos",
      "description": "Permite subir nuevos archivos CSV",
      "category": "files",
      "isActive": true,
      "userCount": 5,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }
}
```

---

### 4. Update Permission
**Endpoint:** `PUT /permissions/:id`

**Descripción:** Actualizar un permiso existente

**Permisos:** `permissions.edit` o `super_admin`

**Request Body:**
```json
{
  "displayName": "Subir y gestionar archivos",
  "description": "Permite subir archivos CSV y gestionar los existentes",
  "isActive": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "permission": {
      "id": "uuid-perm",
      "code": "files.upload",
      "displayName": "Subir y gestionar archivos",
      "description": "Permite subir archivos CSV y gestionar los existentes",
      "isActive": true,
      "updatedAt": "2025-11-07T00:00:00Z"
    }
  }
}
```

---

### 5. Delete Permission
**Endpoint:** `DELETE /permissions/:id`

**Descripción:** Eliminar un permiso del catálogo (también elimina asignaciones)

**Permisos:** `super_admin` únicamente

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Permiso eliminado correctamente"
}
```

---

## 🏢 FRANCHISES - Gestión de Franquicias

### 1. Create Franchise
**Endpoint:** `POST /franchises`

**Descripción:** Crear una nueva franquicia

**Permisos:** `franchises.create` o `super_admin`

**Request Body:**
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

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "franchise": {
      "id": "uuid-franchise",
      "name": "Franquicia Madrid Centro",
      "code": "MAD_CENTRO",
      "email": "madrid@gangazon.com",
      "phone": "+34912345678",
      "address": "Calle Gran Vía, 1",
      "city": "Madrid",
      "state": "Madrid",
      "postalCode": "28013",
      "country": "España",
      "contactPerson": "María García",
      "isActive": true,
      "createdAt": "2025-11-07T00:00:00Z"
    }
  }
}
```

---

### 2. List Franchises
**Endpoint:** `GET /franchises`

**Descripción:** Listar todas las franquicias

**Permisos:** `franchises.view` o `super_admin`

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `search` (string) - Buscar por nombre, código o ciudad
- `isActive` (boolean)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "franchises": [
      {
        "id": "uuid-franchise",
        "name": "Franquicia Madrid Centro",
        "code": "MAD_CENTRO",
        "city": "Madrid",
        "isActive": true,
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 12,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

### 3. Get Franchise by ID
**Endpoint:** `GET /franchises/:id`

**Descripción:** Obtener detalles de una franquicia

**Permisos:** `franchises.view` o `super_admin`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "franchise": {
      "id": "uuid-franchise",
      "name": "Franquicia Madrid Centro",
      "code": "MAD_CENTRO",
      "email": "madrid@gangazon.com",
      "phone": "+34912345678",
      "address": "Calle Gran Vía, 1",
      "city": "Madrid",
      "state": "Madrid",
      "postalCode": "28013",
      "country": "España",
      "contactPerson": "María García",
      "isActive": true,
      "userCount": 3,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-11-06T00:00:00Z"
    }
  }
}
```

---

### 4. Update Franchise
**Endpoint:** `PUT /franchises/:id`

**Descripción:** Actualizar información de una franquicia

**Permisos:** `franchises.edit` o `super_admin`

**Request Body:**
```json
{
  "name": "Franquicia Madrid Centro - Actualizado",
  "phone": "+34912345679",
  "isActive": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "franchise": {
      "id": "uuid-franchise",
      "name": "Franquicia Madrid Centro - Actualizado",
      "code": "MAD_CENTRO",
      "phone": "+34912345679",
      "isActive": true,
      "updatedAt": "2025-11-07T00:00:00Z"
    }
  }
}
```

**Errores:**
- `400 Bad Request` - No se puede modificar GANGAZON_HQ (franquicia matriz)

---

### 5. Delete Franchise
**Endpoint:** `DELETE /franchises/:id`

**Descripción:** Eliminar una franquicia

**Permisos:** `super_admin` únicamente

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Franquicia eliminada correctamente"
}
```

**Errores:**
- `400 Bad Request` - No se puede eliminar GANGAZON_HQ
- `400 Bad Request` - Franquicia tiene usuarios asociados

---

## 🔒 SESSIONS - Gestión de Sesiones

### 1. List Sessions
**Endpoint:** `GET /sessions`

**Descripción:** Listar sesiones activas del sistema

**Permisos:** `sessions.view` o `super_admin`

**Query Parameters:**
- `userId` (uuid) - Filtrar por usuario
- `applicationId` (uuid) - Filtrar por aplicación
- `isActive` (boolean)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid-session",
        "userId": "uuid-user",
        "userEmail": "user@gangazon.com",
        "applicationId": "uuid-app",
        "applicationName": "Scanner Admin",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "startedAt": "2025-11-07T10:00:00Z",
        "lastActivityAt": "2025-11-07T12:30:00Z",
        "isActive": true
      }
    ]
  }
}
```

---

### 2. Get My Sessions
**Endpoint:** `GET /sessions/my`

**Descripción:** Ver las sesiones activas del usuario autenticado

**Permisos:** Token válido requerido

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid-session",
        "applicationName": "Scanner Admin",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "startedAt": "2025-11-07T10:00:00Z",
        "lastActivityAt": "2025-11-07T12:30:00Z",
        "isActive": true
      }
    ]
  }
}
```

---

### 3. Delete Session
**Endpoint:** `DELETE /sessions/:id`

**Descripción:** Cerrar una sesión específica

**Permisos:** `super_admin` únicamente

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Sesión cerrada correctamente"
}
```

---

### 4. Delete User Sessions
**Endpoint:** `DELETE /sessions/user/:userId`

**Descripción:** Cerrar todas las sesiones de un usuario (forzar re-login)

**Permisos:** `super_admin` únicamente

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Todas las sesiones del usuario han sido cerradas"
}
```

---

## 📊 AUDIT - Logs de Auditoría

### 1. List Audit Logs
**Endpoint:** `GET /audit`

**Descripción:** Ver registros de auditoría del sistema

**Permisos:** `audit.view` o `super_admin`

**Query Parameters:**
- `userId` (uuid) - Filtrar por usuario
- `applicationId` (uuid) - Filtrar por aplicación
- `action` (string) - Filtrar por acción (login, logout, user_created, etc.)
- `startDate` (ISO 8601) - Fecha inicio
- `endDate` (ISO 8601) - Fecha fin
- `page` (number)
- `limit` (number)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid-log",
        "user": {
          "id": "uuid-user",
          "email": "admin@gangazon.com",
          "firstName": "Admin",
          "lastName": "Gangazon"
        },
        "application": {
          "id": "uuid-app",
          "name": "Scanner Admin",
          "code": "SCANNER_ADMIN"
        },
        "action": "login",
        "entityType": null,
        "entityId": null,
        "details": {
          "email": "admin@gangazon.com",
          "applicationCode": "SCANNER_ADMIN"
        },
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2025-11-07T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 523,
      "page": 1,
      "limit": 50,
      "totalPages": 11
    }
  }
}
```

---

## 🛡️ Matriz de Permisos

| Endpoint | super_admin | users.* | franchises.* | applications.* | permissions.* | sessions.* | audit.view |
|----------|-------------|---------|--------------|----------------|---------------|------------|------------|
| POST /users | ✅ | create | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /users | ✅ | view | ❌ | ❌ | ❌ | ❌ | ❌ |
| PUT /users/:id | ✅ | edit | ❌ | ❌ | ❌ | ❌ | ❌ |
| DELETE /users/:id | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| POST /applications | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /applications | ✅ | ❌ | ❌ | view | ❌ | ❌ | ❌ |
| PUT /applications/:id | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| DELETE /applications/:id | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| POST /permissions | ✅ | ❌ | ❌ | ❌ | create | ❌ | ❌ |
| GET /permissions | ✅ | ❌ | ❌ | ❌ | view | ❌ | ❌ |
| PUT /permissions/:id | ✅ | ❌ | ❌ | ❌ | edit | ❌ | ❌ |
| DELETE /permissions/:id | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| POST /franchises | ✅ | ❌ | create | ❌ | ❌ | ❌ | ❌ |
| GET /franchises | ✅ | ❌ | view | ❌ | ❌ | ❌ | ❌ |
| PUT /franchises/:id | ✅ | ❌ | edit | ❌ | ❌ | ❌ | ❌ |
| DELETE /franchises/:id | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /sessions | ✅ | ❌ | ❌ | ❌ | ❌ | view | ❌ |
| DELETE /sessions/:id | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| POST /users/:id/assign | ✅ | ❌ | ❌ | ❌ | assign | ❌ | ❌ |
| GET /audit | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 📝 Códigos de Error Comunes

| Código | Mensaje | Descripción |
|--------|---------|-------------|
| 400 | Bad Request | Datos inválidos en la petición |
| 401 | Unauthorized | Token inválido o expirado |
| 403 | Forbidden | No tienes permisos para esta acción |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | El recurso ya existe (email, código, etc.) |
| 500 | Internal Server Error | Error del servidor |

---

## 🚀 Flujo de Setup Inicial

### 1. Ejecutar SQL de creación de esquema
```bash
# Ejecutar schema_auth_supabase.sql en Supabase SQL Editor
```

### 2. Crear Super Admin (script o SQL directo)
```sql
-- Insertar usuario super admin
INSERT INTO auth_gangazon.auth_users (email, password_hash, first_name, last_name)
VALUES ('admin@gangazon.com', '$2a$12$...', 'Super', 'Admin');

-- Asignar permiso super_admin
INSERT INTO auth_gangazon.auth_user_app_permissions (user_id, application_id, permission_id)
VALUES ('uuid-usuario', 'uuid-app-scanner', 'uuid-permiso-super-admin');
```

### 3. Login como Super Admin
```bash
POST /api/auth/login
{
  "email": "admin@gangazon.com",
  "password": "...",
  "applicationCode": "SCANNER_ADMIN"
}
```

### 4. Crear nuevas aplicaciones, permisos y usuarios
```bash
# Crear aplicación
POST /api/applications

# Crear permisos
POST /api/permissions

# Crear usuarios
POST /api/users

# Asignar permisos
POST /api/users/:id/assign
```

---

## 💡 Tips de Uso

1. **Tokens**: Los access tokens expiran en 15 minutos. Usa refresh tokens para renovarlos.
2. **Permisos**: El permiso `super_admin` otorga acceso total al sistema.
3. **Franquicias**: GANGAZON_HQ no se puede modificar ni eliminar.
4. **API Keys**: Guárdalas en secreto. Regenera si se comprometen.
5. **Auditoría**: Todas las acciones importantes quedan registradas en audit_log.
6. **Paginación**: Usa `page` y `limit` para grandes volúmenes de datos.

---

**Documentación generada el 7 de noviembre de 2025**
