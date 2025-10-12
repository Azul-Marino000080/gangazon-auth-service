# 📚 Gangazon Auth Service - API Reference Guide

**Versión:** 1.0  
**Base URL Producción:** `https://gangazon-auth-service.onrender.com`  
**Base URL Local:** `http://localhost:10000`

---

## 📋 Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Emergency Endpoints](#emergency-endpoints)
3. [Usuarios](#usuarios)
4. [Roles](#roles)
5. [Franquicias](#franquicias)
6. [Locales](#locales)
7. [Asignaciones](#asignaciones)
8. [Check-ins](#check-ins)
9. [Códigos de Error](#códigos-de-error)

---

## 🔐 Autenticación

Todos los endpoints (excepto login, register y emergency) requieren autenticación mediante JWT.

### Header de Autenticación
```
Authorization: Bearer <accessToken>
```

### Roles del Sistema
- `admin` - Acceso total al sistema
- `franchisee` - Gestión de franquicias propias
- `manager` - Gestión de local específico
- `supervisor` - Supervisión de local
- `employee` - Acceso básico a check-ins
- `viewer` - Solo lectura

---

## 🚨 Emergency Endpoints

### 1. Create Emergency Admin

**Endpoint:** `POST /api/emergency/create-admin`  
**Auth:** Token de emergencia (header)  
**Propósito:** Crear usuario administrador de emergencia

#### Headers Requeridos
```
x-emergency-token: <EMERGENCY_ADMIN_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "admin@gangazon.com",
  "password": "SecurePass123!",
  "firstName": "Admin",
  "lastName": "Emergency",
  "role": "admin",
  "organizationId": "opcional-uuid"
}
```

#### Campos Requeridos
| Campo | Tipo | Descripción | Validación |
|-------|------|-------------|------------|
| email | string | Email único | Formato email válido |
| password | string | Contraseña | Min 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 especial |
| firstName | string | Nombre | Requerido |
| lastName | string | Apellido | Requerido |
| role | string | Rol del usuario | `admin` o `franchisee` |
| organizationId | string | ID organización | Opcional (se crea automáticamente si no se provee) |

#### Response 201 - Success
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@gangazon.com",
      "firstName": "Admin",
      "lastName": "Emergency",
      "role": "admin",
      "organizationId": "uuid"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "warning": "IMPORTANTE: Desactive este endpoint cambiando ENABLE_EMERGENCY_ENDPOINT=false en producción"
  },
  "message": "Usuario administrador creado exitosamente. Tokens generados para login automático"
}
```

#### Response 409 - Usuario ya existe (activo)
```json
{
  "success": false,
  "error": "Ya existe un usuario activo con este email"
}
```

#### Response 200 - Usuario reactivado
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@gangazon.com",
      "firstName": "Admin",
      "lastName": "Emergency",
      "role": "admin",
      "organizationId": "uuid",
      "reactivated": true
    },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "..."
    }
  },
  "message": "Usuario existente reactivado exitosamente. Tokens generados para login automático"
}
```

---

### 2. Emergency Status

**Endpoint:** `GET /api/emergency/status`  
**Auth:** No requiere

#### Response 200
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "tokenConfigured": true
  },
  "message": "Endpoint de emergencia HABILITADO - Desactive en producción"
}
```

---

## 🔑 Auth Endpoints

### 1. Login

**Endpoint:** `POST /api/auth/login`  
**Auth:** No requiere

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

#### Response 200 - Success
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "organizationId": "uuid",
      "lastLogin": "2025-10-12T15:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "Login exitoso"
}
```

#### Response 401 - Credenciales inválidas
```json
{
  "success": false,
  "error": "Credenciales inválidas",
  "message": "Email o contraseña incorrectos"
}
```

---

### 2. Register (Solo Admin)

**Endpoint:** `POST /api/auth/register`  
**Auth:** Bearer token (rol admin)

#### Request Body
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "employee"
}
```

#### Response 201 - Success
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "newuser@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "employee",
      "organizationId": "uuid"
    },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "..."
    }
  },
  "message": "Usuario registrado exitosamente"
}
```

---

### 3. Refresh Token

**Endpoint:** `POST /api/auth/refresh`  
**Auth:** No requiere

#### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response 200 - Success
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "nuevo_access_token...",
      "refreshToken": "mismo_refresh_token..."
    }
  },
  "message": "Token renovado exitosamente"
}
```

---

### 4. Logout

**Endpoint:** `POST /api/auth/logout`  
**Auth:** Bearer token

#### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response 200 - Success
```json
{
  "success": true,
  "data": {},
  "message": "Logout exitoso"
}
```

---

### 5. Change Password

**Endpoint:** `POST /api/auth/change-password`  
**Auth:** Bearer token

#### Request Body
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

#### Response 200 - Success
```json
{
  "success": true,
  "data": {},
  "message": "Contraseña actualizada exitosamente"
}
```

---

### 6. Get Profile

**Endpoint:** `GET /api/auth/profile`  
**Auth:** Bearer token

#### Response 200 - Success
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "organizationId": "uuid",
      "organization": {
        "id": "uuid",
        "name": "Gangazon"
      },
      "isActive": true,
      "emailVerified": true,
      "lastLogin": "2025-10-12T15:30:00.000Z",
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  }
}
```

---

## 👥 Users Endpoints

### 1. Create User

**Endpoint:** `POST /api/users`  
**Auth:** Bearer token (admin o franchisee)

#### Request Body
```json
{
  "email": "employee@example.com",
  "password": "SecurePass123!",
  "firstName": "Carlos",
  "lastName": "García",
  "role": "employee",
  "franchiseId": "uuid-opcional",
  "locationId": "uuid-opcional",
  "startDate": "2025-10-15",
  "phone": "+34612345678"
}
```

#### Campos
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| email | string | ✅ | Email único |
| password | string | ✅ | Min 8 caracteres con requisitos |
| firstName | string | ✅ | Nombre |
| lastName | string | ✅ | Apellido |
| role | string | ✅ | employee, manager, supervisor, viewer |
| franchiseId | string | ❌ | ID de franquicia |
| locationId | string | ❌ | ID de local (crea asignación automática) |
| startDate | string | ❌ | Fecha inicio (YYYY-MM-DD) |
| phone | string | ❌ | Teléfono |

#### Response 201 - Success
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "employee@example.com",
      "firstName": "Carlos",
      "lastName": "García",
      "role": "employee",
      "organizationId": "uuid",
      "isActive": true,
      "createdAt": "2025-10-12T16:00:00.000Z"
    },
    "assignment": {
      "id": "uuid",
      "locationId": "uuid",
      "locationName": "Local Centro",
      "roleAtLocation": "employee",
      "startDate": "2025-10-15"
    },
    "note": null
  },
  "message": "Usuario creado y asignado exitosamente"
}
```

---

### 2. Get Current User Profile

**Endpoint:** `GET /api/users/me`  
**Auth:** Bearer token

#### Response 200
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "manager",
      "organizationId": "uuid",
      "organization": {
        "name": "Gangazon",
        "description": "Franquicia matriz"
      },
      "isActive": true,
      "emailVerified": true,
      "createdAt": "2025-01-01T10:00:00.000Z",
      "lastLogin": "2025-10-12T15:30:00.000Z"
    }
  }
}
```

---

### 3. Update Current User Profile

**Endpoint:** `PUT /api/users/me`  
**Auth:** Bearer token

#### Request Body (todos los campos opcionales)
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+34612345678"
}
```

#### Response 200 - Success
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "manager",
      "organizationId": "uuid",
      "isActive": true,
      "phone": "+34612345678"
    }
  },
  "message": "Perfil actualizado exitosamente"
}
```

---

### 4. Get User by ID

**Endpoint:** `GET /api/users/:userId`  
**Auth:** Bearer token

#### Response 200
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "Carlos",
      "lastName": "García",
      "role": "employee",
      "organizationId": "uuid",
      "isActive": true,
      "emailVerified": true,
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  }
}
```

---

### 5. Update User

**Endpoint:** `PUT /api/users/:userId`  
**Auth:** Bearer token (admin)

#### Request Body (campos opcionales)
```json
{
  "firstName": "Carlos",
  "lastName": "García",
  "role": "manager",
  "isActive": true,
  "phone": "+34612345678"
}
```

#### Response 200 - Success
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "Carlos",
      "lastName": "García",
      "role": "manager",
      "organizationId": "uuid"
    }
  },
  "message": "Usuario actualizado exitosamente"
}
```

---

### 6. List Users

**Endpoint:** `GET /api/users`  
**Auth:** Bearer token (admin, franchisee)

#### Query Parameters
| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| page | number | Número de página | `?page=1` |
| limit | number | Resultados por página (max 100) | `?limit=20` |
| role | string | Filtrar por rol | `?role=employee` |
| isActive | boolean | Filtrar por estado | `?isActive=true` |
| search | string | Buscar por email, nombre o apellido | `?search=carlos` |

#### Response 200
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user1@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "employee",
        "organizationId": "uuid",
        "isActive": true,
        "createdAt": "2025-01-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### 7. Delete User

**Endpoint:** `DELETE /api/users/:userId`  
**Auth:** Bearer token (admin)

#### Response 200 - Success
```json
{
  "success": true,
  "data": {},
  "message": "Usuario eliminado exitosamente"
}
```

---

## 🎭 Roles Endpoints

### 1. Get All Roles

**Endpoint:** `GET /api/roles`  
**Auth:** Bearer token

#### Response 200
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "name": "admin",
        "displayName": "Administrador",
        "description": "Acceso completo al sistema",
        "level": 1
      },
      {
        "name": "franchisee",
        "displayName": "Franquiciado",
        "description": "Gestión de franquicias propias",
        "level": 2
      },
      {
        "name": "manager",
        "displayName": "Gerente",
        "description": "Gestión de local específico",
        "level": 3
      },
      {
        "name": "supervisor",
        "displayName": "Supervisor",
        "description": "Supervisión de local",
        "level": 4
      },
      {
        "name": "employee",
        "displayName": "Empleado",
        "description": "Acceso básico para check-ins",
        "level": 5
      },
      {
        "name": "viewer",
        "displayName": "Visualizador",
        "description": "Solo lectura",
        "level": 6
      }
    ]
  }
}
```

---

## 🏢 Franchises Endpoints

### 1. Create Franchise

**Endpoint:** `POST /api/franchises`  
**Auth:** Bearer token (admin)

#### Request Body
```json
{
  "name": "Gangazon Madrid Centro",
  "email": "madrid@gangazon.com",
  "phone": "+34912345678",
  "address": "Calle Gran Vía, 1",
  "city": "Madrid",
  "state": "Madrid",
  "postalCode": "28013",
  "country": "España",
  "franchiseeEmail": "franchisee@example.com"
}
```

#### Campos
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| name | string | ✅ | Nombre de la franquicia |
| email | string | ❌ | Email de contacto |
| phone | string | ❌ | Teléfono |
| address | string | ❌ | Dirección |
| city | string | ❌ | Ciudad |
| state | string | ❌ | Provincia/Estado |
| postalCode | string | ❌ | Código postal |
| country | string | ❌ | País |
| franchiseeEmail | string | ❌ | Email del franquiciado responsable |

#### Response 201 - Success
```json
{
  "success": true,
  "data": {
    "franchise": {
      "id": "uuid",
      "name": "Gangazon Madrid Centro",
      "email": "madrid@gangazon.com",
      "phone": "+34912345678",
      "address": "Calle Gran Vía, 1",
      "city": "Madrid",
      "state": "Madrid",
      "postalCode": "28013",
      "country": "España",
      "organizationId": "uuid",
      "franchiseeEmail": "franchisee@example.com",
      "isActive": true,
      "createdAt": "2025-10-12T16:00:00.000Z"
    }
  },
  "message": "Franquicia creada exitosamente"
}
```

---

### 2. List Franchises

**Endpoint:** `GET /api/franchises`  
**Auth:** Bearer token

#### Query Parameters
```
?page=1&limit=20&isActive=true&search=madrid
```

#### Response 200
```json
{
  "success": true,
  "data": {
    "franchises": [
      {
        "id": "uuid",
        "name": "Gangazon Madrid Centro",
        "email": "madrid@gangazon.com",
        "city": "Madrid",
        "franchiseeEmail": "franchisee@example.com",
        "isActive": true,
        "createdAt": "2025-10-12T16:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### 3. Get Franchise by ID

**Endpoint:** `GET /api/franchises/:franchiseId`  
**Auth:** Bearer token

#### Response 200
```json
{
  "success": true,
  "data": {
    "franchise": {
      "id": "uuid",
      "name": "Gangazon Madrid Centro",
      "email": "madrid@gangazon.com",
      "phone": "+34912345678",
      "address": "Calle Gran Vía, 1",
      "city": "Madrid",
      "state": "Madrid",
      "postalCode": "28013",
      "country": "España",
      "organizationId": "uuid",
      "franchiseeEmail": "franchisee@example.com",
      "isActive": true,
      "createdAt": "2025-10-12T16:00:00.000Z",
      "locations": [
        {
          "id": "uuid",
          "name": "Local Centro",
          "address": "Calle Gran Vía, 1",
          "city": "Madrid"
        }
      ]
    }
  }
}
```

---

### 4. Update Franchise

**Endpoint:** `PUT /api/franchises/:franchiseId`  
**Auth:** Bearer token (admin o franchisee propietario)

#### Request Body (campos opcionales)
```json
{
  "name": "Gangazon Madrid Centro - Actualizado",
  "phone": "+34912345679",
  "isActive": true
}
```

#### Response 200 - Success
```json
{
  "success": true,
  "data": {
    "franchise": {
      "id": "uuid",
      "name": "Gangazon Madrid Centro - Actualizado",
      "phone": "+34912345679",
      "isActive": true
    }
  },
  "message": "Franquicia actualizada exitosamente"
}
```

---

### 5. Delete Franchise

**Endpoint:** `DELETE /api/franchises/:franchiseId`  
**Auth:** Bearer token (admin)

#### Response 200 - Success
```json
{
  "success": true,
  "data": {},
  "message": "Franquicia eliminada exitosamente"
}
```

---

## 🏪 Locations Endpoints

### 1. Create Location

**Endpoint:** `POST /api/locations`  
**Auth:** Bearer token (admin o franchisee)

#### Request Body
```json
{
  "franchiseId": "uuid",
  "name": "Local Centro",
  "address": "Calle Mayor, 10",
  "city": "Madrid",
  "state": "Madrid",
  "postalCode": "28013",
  "country": "España",
  "phone": "+34912345678",
  "email": "centro@gangazon.com",
  "openingHours": "L-V: 9:00-21:00, S-D: 10:00-22:00",
  "managerEmail": "manager@example.com"
}
```

#### Campos
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| franchiseId | string | ✅ | ID de franquicia padre |
| name | string | ✅ | Nombre del local |
| address | string | ❌ | Dirección |
| city | string | ❌ | Ciudad |
| state | string | ❌ | Provincia |
| postalCode | string | ❌ | Código postal |
| country | string | ❌ | País |
| phone | string | ❌ | Teléfono |
| email | string | ❌ | Email |
| openingHours | string | ❌ | Horario |
| managerEmail | string | ❌ | Email del gerente |

#### Response 201 - Success
```json
{
  "success": true,
  "data": {
    "location": {
      "id": "uuid",
      "franchiseId": "uuid",
      "name": "Local Centro",
      "address": "Calle Mayor, 10",
      "city": "Madrid",
      "phone": "+34912345678",
      "email": "centro@gangazon.com",
      "openingHours": "L-V: 9:00-21:00",
      "managerEmail": "manager@example.com",
      "isActive": true,
      "createdAt": "2025-10-12T16:00:00.000Z"
    }
  },
  "message": "Local creado exitosamente"
}
```

---

### 2. List Locations

**Endpoint:** `GET /api/locations`  
**Auth:** Bearer token

#### Query Parameters
```
?page=1&limit=20&franchiseId=uuid&isActive=true&search=centro
```

#### Response 200
```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "id": "uuid",
        "franchiseId": "uuid",
        "name": "Local Centro",
        "address": "Calle Mayor, 10",
        "city": "Madrid",
        "managerEmail": "manager@example.com",
        "isActive": true,
        "franchise": {
          "name": "Gangazon Madrid Centro"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

---

### 3. Get Location by ID

**Endpoint:** `GET /api/locations/:locationId`  
**Auth:** Bearer token

#### Response 200
```json
{
  "success": true,
  "data": {
    "location": {
      "id": "uuid",
      "franchiseId": "uuid",
      "name": "Local Centro",
      "address": "Calle Mayor, 10",
      "city": "Madrid",
      "state": "Madrid",
      "postalCode": "28013",
      "country": "España",
      "phone": "+34912345678",
      "email": "centro@gangazon.com",
      "openingHours": "L-V: 9:00-21:00",
      "managerEmail": "manager@example.com",
      "isActive": true,
      "createdAt": "2025-10-12T16:00:00.000Z",
      "franchise": {
        "id": "uuid",
        "name": "Gangazon Madrid Centro"
      }
    }
  }
}
```

---

### 4. Update Location

**Endpoint:** `PUT /api/locations/:locationId`  
**Auth:** Bearer token (admin, franchisee o manager)

#### Request Body (campos opcionales)
```json
{
  "name": "Local Centro - Actualizado",
  "phone": "+34912345679",
  "openingHours": "L-V: 10:00-22:00",
  "isActive": true
}
```

#### Response 200 - Success
```json
{
  "success": true,
  "data": {
    "location": {
      "id": "uuid",
      "name": "Local Centro - Actualizado",
      "phone": "+34912345679",
      "openingHours": "L-V: 10:00-22:00",
      "isActive": true
    }
  },
  "message": "Local actualizado exitosamente"
}
```

---

### 5. Delete Location

**Endpoint:** `DELETE /api/locations/:locationId`  
**Auth:** Bearer token (admin o franchisee)

#### Response 200 - Success
```json
{
  "success": true,
  "data": {},
  "message": "Local eliminado exitosamente"
}
```

---

## 📋 Assignments Endpoints

### 1. Create Assignment

**Endpoint:** `POST /api/assignments`  
**Auth:** Bearer token (admin, franchisee, manager)

#### Request Body
```json
{
  "userId": "uuid",
  "locationId": "uuid",
  "roleAtLocation": "employee",
  "startDate": "2025-10-15",
  "endDate": "2026-10-15",
  "shiftType": "full_time",
  "weeklyHours": 40,
  "notes": "Horario de mañanas"
}
```

#### Campos
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| userId | string | ✅ | ID del usuario |
| locationId | string | ✅ | ID del local |
| roleAtLocation | string | ✅ | employee, manager, supervisor |
| startDate | string | ✅ | Fecha inicio (YYYY-MM-DD) |
| endDate | string | ❌ | Fecha fin (YYYY-MM-DD) |
| shiftType | string | ❌ | full_time, part_time, temporary |
| weeklyHours | number | ❌ | Horas semanales |
| notes | string | ❌ | Notas adicionales |

#### Response 201 - Success
```json
{
  "success": true,
  "data": {
    "assignment": {
      "id": "uuid",
      "userId": "uuid",
      "locationId": "uuid",
      "roleAtLocation": "employee",
      "startDate": "2025-10-15",
      "endDate": null,
      "shiftType": "full_time",
      "weeklyHours": 40,
      "isActive": true,
      "createdAt": "2025-10-12T16:00:00.000Z"
    }
  },
  "message": "Asignación creada exitosamente"
}
```

---

### 2. List Assignments

**Endpoint:** `GET /api/assignments`  
**Auth:** Bearer token

#### Query Parameters
```
?page=1&limit=20&userId=uuid&locationId=uuid&isActive=true
```

#### Response 200
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": "uuid",
        "userId": "uuid",
        "locationId": "uuid",
        "roleAtLocation": "employee",
        "startDate": "2025-10-15",
        "shiftType": "full_time",
        "isActive": true,
        "user": {
          "firstName": "Carlos",
          "lastName": "García",
          "email": "carlos@example.com"
        },
        "location": {
          "name": "Local Centro",
          "city": "Madrid"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

---

### 3. Get Assignment by ID

**Endpoint:** `GET /api/assignments/:assignmentId`  
**Auth:** Bearer token

#### Response 200
```json
{
  "success": true,
  "data": {
    "assignment": {
      "id": "uuid",
      "userId": "uuid",
      "locationId": "uuid",
      "roleAtLocation": "employee",
      "startDate": "2025-10-15",
      "endDate": null,
      "shiftType": "full_time",
      "weeklyHours": 40,
      "notes": "Horario de mañanas",
      "isActive": true,
      "createdAt": "2025-10-12T16:00:00.000Z",
      "user": {
        "id": "uuid",
        "firstName": "Carlos",
        "lastName": "García",
        "email": "carlos@example.com"
      },
      "location": {
        "id": "uuid",
        "name": "Local Centro",
        "address": "Calle Mayor, 10",
        "city": "Madrid"
      }
    }
  }
}
```

---

### 4. Update Assignment

**Endpoint:** `PUT /api/assignments/:assignmentId`  
**Auth:** Bearer token (admin, franchisee, manager)

#### Request Body (campos opcionales)
```json
{
  "roleAtLocation": "supervisor",
  "endDate": "2026-10-15",
  "weeklyHours": 35,
  "isActive": true
}
```

#### Response 200 - Success
```json
{
  "success": true,
  "data": {
    "assignment": {
      "id": "uuid",
      "roleAtLocation": "supervisor",
      "weeklyHours": 35,
      "isActive": true
    }
  },
  "message": "Asignación actualizada exitosamente"
}
```

---

### 5. Delete Assignment

**Endpoint:** `DELETE /api/assignments/:assignmentId`  
**Auth:** Bearer token (admin, franchisee, manager)

#### Response 200 - Success
```json
{
  "success": true,
  "data": {},
  "message": "Asignación eliminada exitosamente"
}
```

---

## ⏰ Check-ins Endpoints

### 1. Check-in

**Endpoint:** `POST /api/checkins`  
**Auth:** Bearer token

#### Request Body
```json
{
  "locationId": "uuid",
  "latitude": 40.4168,
  "longitude": -3.7038,
  "notes": "Inicio turno mañana"
}
```

#### Campos
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| locationId | string | ✅ | ID del local |
| latitude | number | ❌ | Latitud GPS |
| longitude | number | ❌ | Longitud GPS |
| notes | string | ❌ | Notas del check-in |

#### Response 201 - Success
```json
{
  "success": true,
  "data": {
    "checkin": {
      "id": "uuid",
      "userId": "uuid",
      "locationId": "uuid",
      "checkinTime": "2025-10-12T08:00:00.000Z",
      "latitude": 40.4168,
      "longitude": -3.7038,
      "notes": "Inicio turno mañana",
      "createdAt": "2025-10-12T08:00:00.000Z"
    }
  },
  "message": "Check-in registrado exitosamente"
}
```

---

### 2. Check-out

**Endpoint:** `PUT /api/checkins/:checkinId/checkout`  
**Auth:** Bearer token

#### Request Body (opcional)
```json
{
  "latitude": 40.4168,
  "longitude": -3.7038,
  "notes": "Fin de turno"
}
```

#### Response 200 - Success
```json
{
  "success": true,
  "data": {
    "checkin": {
      "id": "uuid",
      "userId": "uuid",
      "locationId": "uuid",
      "checkinTime": "2025-10-12T08:00:00.000Z",
      "checkoutTime": "2025-10-12T16:00:00.000Z",
      "hoursWorked": 8.0,
      "latitude": 40.4168,
      "longitude": -3.7038
    }
  },
  "message": "Check-out registrado exitosamente"
}
```

---

### 3. List Check-ins

**Endpoint:** `GET /api/checkins`  
**Auth:** Bearer token

#### Query Parameters
```
?page=1&limit=20&userId=uuid&locationId=uuid&startDate=2025-10-01&endDate=2025-10-31
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| page | number | Número de página |
| limit | number | Resultados por página |
| userId | string | Filtrar por usuario |
| locationId | string | Filtrar por local |
| startDate | string | Fecha inicio (YYYY-MM-DD) |
| endDate | string | Fecha fin (YYYY-MM-DD) |

#### Response 200
```json
{
  "success": true,
  "data": {
    "checkins": [
      {
        "id": "uuid",
        "userId": "uuid",
        "locationId": "uuid",
        "checkinTime": "2025-10-12T08:00:00.000Z",
        "checkoutTime": "2025-10-12T16:00:00.000Z",
        "hoursWorked": 8.0,
        "user": {
          "firstName": "Carlos",
          "lastName": "García"
        },
        "location": {
          "name": "Local Centro"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

### 4. Get Check-in by ID

**Endpoint:** `GET /api/checkins/:checkinId`  
**Auth:** Bearer token

#### Response 200
```json
{
  "success": true,
  "data": {
    "checkin": {
      "id": "uuid",
      "userId": "uuid",
      "locationId": "uuid",
      "checkinTime": "2025-10-12T08:00:00.000Z",
      "checkoutTime": "2025-10-12T16:00:00.000Z",
      "hoursWorked": 8.0,
      "latitude": 40.4168,
      "longitude": -3.7038,
      "notes": "Inicio turno mañana",
      "user": {
        "id": "uuid",
        "firstName": "Carlos",
        "lastName": "García",
        "email": "carlos@example.com"
      },
      "location": {
        "id": "uuid",
        "name": "Local Centro",
        "address": "Calle Mayor, 10"
      }
    }
  }
}
```

---

### 5. Delete Check-in

**Endpoint:** `DELETE /api/checkins/:checkinId`  
**Auth:** Bearer token (admin o manager)

#### Response 200 - Success
```json
{
  "success": true,
  "data": {},
  "message": "Check-in eliminado exitosamente"
}
```

---

## ❌ Códigos de Error

### Estructura de Error Estándar
```json
{
  "success": false,
  "error": "Título del error",
  "message": "Descripción detallada del error"
}
```

### Códigos HTTP

| Código | Significado | Cuándo ocurre |
|--------|-------------|---------------|
| 200 | OK | Operación exitosa |
| 201 | Created | Recurso creado exitosamente |
| 400 | Bad Request | Datos de entrada inválidos |
| 401 | Unauthorized | Token inválido o faltante |
| 403 | Forbidden | Sin permisos para la operación |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Conflicto (ej: email duplicado) |
| 500 | Internal Server Error | Error del servidor |

---

## 🔒 Seguridad

### Requisitos de Contraseña
- Mínimo 8 caracteres
- Al menos 1 letra mayúscula
- Al menos 1 letra minúscula
- Al menos 1 número
- Al menos 1 carácter especial (!@#$%^&*)

### Tokens JWT
- **Access Token:** Expira en 30 minutos
- **Refresh Token:** Expira en 7 días

### Rate Limiting
- 100 peticiones por ventana de 15 minutos
- Headers de respuesta:
  - `ratelimit-limit`: Límite total
  - `ratelimit-remaining`: Peticiones restantes
  - `ratelimit-reset`: Segundos hasta reset

---

## 📊 Paginación Estándar

Todos los endpoints de listado soportan paginación:

### Request
```
GET /api/users?page=2&limit=50
```

### Response
```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "page": 2,
      "limit": 50,
      "total": 237,
      "totalPages": 5
    }
  }
}
```

### Límites
- `limit` mínimo: 1
- `limit` máximo: 100
- `limit` por defecto: 20

---

## 🧪 Testing en Postman

### Configurar Environment

1. Crear environment "Gangazon - Production"
2. Añadir variables:
```
baseUrl = https://gangazon-auth-service.onrender.com
emergencyToken = <tu_token_secreto>
accessToken = <se guardará automáticamente>
refreshToken = <se guardará automáticamente>
```

### Flujo de Testing Completo

1. **Emergency - Create Admin**
   - Crea usuario admin inicial
   - Guarda tokens automáticamente

2. **Auth - Login**
   - Login con credenciales
   - Actualiza tokens

3. **Users - Create User**
   - Crea empleados
   - Requiere token de admin

4. **Franchises - Create**
   - Crea franquicia
   - Guarda franchiseId

5. **Locations - Create**
   - Crea local en franquicia
   - Guarda locationId

6. **Assignments - Create**
   - Asigna usuario a local

7. **Check-ins - Create**
   - Registra entrada

8. **Check-ins - Checkout**
   - Registra salida

---

## 📞 Soporte

**Repositorio:** https://github.com/Azul-Marino000080/gangazon-auth-service  
**Issues:** https://github.com/Azul-Marino000080/gangazon-auth-service/issues

---

**Última actualización:** 12 de Octubre, 2025  
**Versión del documento:** 1.0
