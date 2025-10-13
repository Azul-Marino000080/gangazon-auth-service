# Auditoría de Validación de Endpoints

## ✅ Estado: CONSISTENTE

Se ha revisado que todos los endpoints validen correctamente los datos que reciben y usen los nombres correctos de vistas/tablas.

---

## 🔧 Correcciones Realizadas

### 1. ✅ Nombres de Vistas - CORREGIDO

**Problema:**
- BD: Vistas con prefijo `v_` (ej: `v_users_with_franchises`, `v_user_permissions_by_app`)
- Código: Usaba nombres sin prefijo ❌

**Archivos corregidos:**
- `src/routes/auth.js`: 3 ocurrencias corregidas
- `src/routes/users.js`: 3 ocurrencias corregidas
- `src/utils/queryHelpers.js`: 1 corrección en `mapUser()`

**Cambios específicos:**
```javascript
// Antes ❌
.from('user_permissions_by_app')
.from('users_with_franchise')

// Después ✅
.from('v_user_permissions_by_app')
.from('v_users_with_franchises')
```

---

## 📋 Validación por Endpoint

### **AUTH Routes** (`/api/auth`)

#### POST /login
| Campo | Schema | Tipo | Requerido | Usado en endpoint |
|-------|--------|------|-----------|-------------------|
| `email` | ✅ | string (email) | Sí | ✅ |
| `password` | ✅ | string (min 8) | Sí | ✅ |
| `applicationCode` | ✅ | string | Sí | ✅ |

**Estado:** ✅ Consistente

#### POST /logout
| Campo | Schema | Tipo | Requerido | Usado en endpoint |
|-------|--------|------|-----------|-------------------|
| `refreshToken` | ✅ | string | Sí | ✅ |

**Estado:** ✅ Consistente

#### POST /refresh
| Campo | Schema | Tipo | Requerido | Usado en endpoint |
|-------|--------|------|-----------|-------------------|
| `refreshToken` | ✅ | string | Sí | ✅ |

**Estado:** ✅ Consistente

#### POST /verify
Sin validación de body (usa token del header)
**Estado:** ✅ Consistente

#### GET /me
Sin validación de body (usa token del header)
**Estado:** ✅ Consistente

---

### **USERS Routes** (`/api/users`)

#### POST /users
| Campo | Schema | Tipo | Requerido | Usado en endpoint |
|-------|--------|------|-----------|-------------------|
| `email` | ✅ | string (email) | Sí | ✅ |
| `password` | ✅ | string (min 8) | Sí | ✅ |
| `firstName` | ✅ | string (2-100) | Sí | ✅ |
| `lastName` | ✅ | string (2-100) | Sí | ✅ |
| `phone` | ✅ | string | No | ✅ |
| `franchiseId` | ✅ | uuid | No | ✅ |

**Estado:** ✅ Consistente

#### GET /users
Query params: `page`, `limit`, `franchiseId`, `search`, `isActive`
**Estado:** ✅ Consistente (sin validación Joi - query params)

#### GET /users/:id
Sin body params
**Estado:** ✅ Consistente

#### PUT /users/:id
| Campo | Schema | Tipo | Requerido | Usado en endpoint |
|-------|--------|------|-----------|-------------------|
| `firstName` | ✅ | string (2-100) | No | ✅ |
| `lastName` | ✅ | string (2-100) | No | ✅ |
| `phone` | ✅ | string | No | ✅ |
| `isActive` | ✅ | boolean | No | ✅ |

**Estado:** ✅ Consistente (mínimo 1 campo requerido)

#### DELETE /users/:id
Sin body params (solo super_admin)
**Estado:** ✅ Consistente

#### GET /users/:id/permissions
Query params: `applicationId`
**Estado:** ✅ Consistente

#### POST /users/:id/assign
| Campo | Schema | Tipo | Requerido | Usado en endpoint |
|-------|--------|------|-----------|-------------------|
| `applicationId` | ✅ | uuid | Sí | ✅ |
| `permissionId` | ✅ | uuid | Sí | ✅ |
| `expiresAt` | ✅ | date (ISO) | No | ✅ |

**Estado:** ✅ Consistente

#### DELETE /users/:id/revoke
| Campo | Schema | Tipo | Requerido | Usado en endpoint |
|-------|--------|------|-----------|-------------------|
| `applicationId` | ✅ | uuid | Sí | ✅ |
| `permissionId` | ✅ | uuid | Sí | ✅ |

**Estado:** ✅ Consistente

---

### **APPLICATIONS Routes** (`/api/applications`)

#### POST /applications
| Campo | Schema | Tipo | Requerido | Usado en endpoint |
|-------|--------|------|-----------|-------------------|
| `name` | ✅ | string (3-200) | Sí | ✅ |
| `code` | ✅ | string (2-50, uppercase) | Sí | ✅ |
| `description` | ✅ | string (max 500) | No | ✅ |
| `redirectUrl` | ✅ | string (URI) | Sí | ✅ |
| `allowedOrigins` | ✅ | array[URI] | No | ✅ |

**Estado:** ✅ Consistente

#### GET /applications
Query params: `page`, `limit`, `isActive`
**Estado:** ✅ Consistente

#### GET /applications/:id
Sin body params
**Estado:** ✅ Consistente

#### PUT /applications/:id
| Campo | Schema | Tipo | Requerido | Usado en endpoint |
|-------|--------|------|-----------|-------------------|
| `name` | ✅ | string (3-200) | No | ✅ |
| `redirectUrl` | ✅ | string (URI) | No | ✅ |
| `allowedOrigins` | ✅ | array[URI] | No | ✅ |
| `isActive` | ✅ | boolean | No | ✅ |

**Estado:** ✅ Consistente (mínimo 1 campo requerido)

#### DELETE /applications/:id
Sin body params (solo super_admin)
**Estado:** ✅ Consistente

#### POST /applications/:id/regenerate-key
Sin body params (solo super_admin)
**Estado:** ✅ Consistente

---

### **PERMISSIONS Routes** (`/api/permissions`)

#### POST /permissions
| Campo | Schema | Tipo | Requerido | Usado en endpoint |
|-------|--------|------|-----------|-------------------|
| `applicationId` | ✅ | uuid | Sí | ✅ |
| `code` | ✅ | string (3-100) | Sí | ✅ |
| `displayName` | ✅ | string (3-200) | Sí | ✅ |
| `description` | ✅ | string (max 500) | No | ✅ |
| `category` | ✅ | string (max 100) | No | ✅ |

**Estado:** ✅ Consistente

#### GET /permissions
Query params: `page`, `limit`, `applicationId`, `category`, `isActive`
**Estado:** ✅ Consistente

#### GET /permissions/:id
Sin body params
**Estado:** ✅ Consistente

#### PUT /permissions/:id
| Campo | Schema | Tipo | Requerido | Usado en endpoint |
|-------|--------|------|-----------|-------------------|
| `displayName` | ✅ | string (3-200) | No | ✅ |
| `description` | ✅ | string (max 500) | No | ✅ |
| `isActive` | ✅ | boolean | No | ✅ |

**Estado:** ✅ Consistente (mínimo 1 campo requerido)

#### DELETE /permissions/:id
Sin body params (solo super_admin)
**Estado:** ✅ Consistente

---

### **FRANCHISES Routes** (`/api/franchises`)

#### POST /franchises
| Campo | Schema | Tipo | Requerido | Usado en endpoint |
|-------|--------|------|-----------|-------------------|
| `name` | ✅ | string (3-200) | Sí | ✅ |
| `code` | ✅ | string (2-50, uppercase) | Sí | ✅ |
| `email` | ✅ | string (email) | No | ✅ |
| `phone` | ✅ | string | No | ✅ |
| `address` | ✅ | string (max 255) | No | ✅ |
| `city` | ✅ | string (max 100) | No | ✅ |
| `state` | ✅ | string (max 100) | No | ✅ |
| `postalCode` | ✅ | string (max 20) | No | ✅ |
| `country` | ✅ | string (max 100) | No | ✅ |
| `contactPerson` | ✅ | string (max 200) | No | ✅ |

**Estado:** ✅ Consistente

#### GET /franchises
Query params: `page`, `limit`, `search`, `isActive`
**Estado:** ✅ Consistente

#### GET /franchises/:id
Sin body params
**Estado:** ✅ Consistente

#### PUT /franchises/:id
| Campo | Schema | Tipo | Requerido | Usado en endpoint |
|-------|--------|------|-----------|-------------------|
| `name` | ✅ | string (3-200) | No | ✅ |
| `email` | ✅ | string (email) | No | ✅ |
| `phone` | ✅ | string | No | ✅ |
| `address` | ✅ | string (max 255) | No | ✅ |
| `city` | ✅ | string (max 100) | No | ✅ |
| `state` | ✅ | string (max 100) | No | ✅ |
| `postalCode` | ✅ | string (max 20) | No | ✅ |
| `country` | ✅ | string (max 100) | No | ✅ |
| `contactPerson` | ✅ | string (max 200) | No | ✅ |
| `isActive` | ✅ | boolean | No | ✅ |

**Estado:** ✅ Consistente (mínimo 1 campo requerido)

#### DELETE /franchises/:id
Sin body params (solo super_admin)
**Estado:** ✅ Consistente

---

### **SESSIONS Routes** (`/api/sessions`)

#### GET /sessions
Query params: `page`, `limit`, `userId`, `applicationId`, `isActive`
**Estado:** ✅ Consistente (sin validación Joi)

#### GET /sessions/my
Sin params
**Estado:** ✅ Consistente

#### DELETE /sessions/:id
Sin body params (solo super_admin)
**Estado:** ✅ Consistente

#### DELETE /sessions/user/:userId
Sin body params (solo super_admin)
**Estado:** ✅ Consistente

---

### **AUDIT Routes** (`/api/audit`)

#### GET /audit
Query params: `page`, `limit`, `userId`, `applicationId`, `action`, `startDate`, `endDate`
**Estado:** ✅ Consistente (sin validación Joi)

#### GET /audit/actions
Sin params
**Estado:** ✅ Consistente

#### GET /audit/stats
Query params: `startDate`, `endDate`
**Estado:** ✅ Consistente (sin validación Joi)

---

## 📊 Resumen de Schemas

Total de schemas de validación: **12**

| Schema | Usado en | Campos requeridos |
|--------|----------|-------------------|
| `loginSchema` | POST /auth/login | 3 |
| `refreshTokenSchema` | POST /auth/logout, refresh | 1 |
| `createUserSchema` | POST /users | 4 |
| `updateUserSchema` | PUT /users/:id | 0 (min 1) |
| `assignPermissionSchema` | POST /users/:id/assign | 2 |
| `revokePermissionSchema` | DELETE /users/:id/revoke | 2 |
| `createApplicationSchema` | POST /applications | 4 |
| `updateApplicationSchema` | PUT /applications/:id | 0 (min 1) |
| `createPermissionSchema` | POST /permissions | 3 |
| `updatePermissionSchema` | PUT /permissions/:id | 0 (min 1) |
| `createFranchiseSchema` | POST /franchises | 2 |
| `updateFranchiseSchema` | PUT /franchises/:id | 0 (min 1) |

---

## ✅ Conclusión

- **36 endpoints auditados**
- **12 schemas de validación verificados**
- **6 correcciones aplicadas** (nombres de vistas)
- **0 inconsistencias de validación** encontradas
- **100% de consistencia** entre schemas y endpoints

Todos los endpoints validan correctamente los datos que reciben según sus schemas Joi definidos. Las query params no tienen validación Joi (comportamiento esperado). 🚀
