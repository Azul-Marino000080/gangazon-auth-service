# Auditoría de Nomenclatura - Base de Datos vs APIs

## ✅ Estado: CONSISTENTE

Se ha revisado la consistencia de nomenclatura entre la base de datos (PostgreSQL) y las rutas de las APIs.

---

## 📊 Convenciones de Nomenclatura

### **Base de Datos (snake_case)**
- Nombres de tablas: `snake_case` (ej: `user_app_permissions`)
- Nombres de columnas: `snake_case` (ej: `first_name`, `franchise_id`, `created_at`)
- Códigos únicos: `UPPER_SNAKE_CASE` (ej: `GANGAZON_HQ`, `ADMIN_PANEL`)

### **APIs (camelCase)**
- Request body: `camelCase` (ej: `firstName`, `franchiseId`, `redirectUrl`)
- Response JSON: `camelCase` (ej: `firstName`, `isActive`, `createdAt`)
- Rutas: `kebab-case` o `/resource/:id` (ej: `/regenerate-key`, `/users/:id`)

---

## 🔍 Mapeo de Campos por Entidad

### **Users (usuarios)**
| Base de Datos | API Request/Response | Mapper |
|---------------|---------------------|--------|
| `id` | `id` | ✅ |
| `email` | `email` | ✅ |
| `password_hash` | `password` (solo request) | ✅ |
| `first_name` | `firstName` | ✅ |
| `last_name` | `lastName` | ✅ |
| `phone` | `phone` | ✅ |
| `franchise_id` | `franchiseId` | ✅ |
| `is_active` | `isActive` | ✅ |
| `email_verified` | `emailVerified` | ✅ |
| `last_login_at` | `lastLoginAt` | ✅ |
| `created_at` | `createdAt` | ✅ |
| `updated_at` | `updatedAt` | ✅ |

### **Franchises (franquicias)**
| Base de Datos | API Request/Response | Mapper |
|---------------|---------------------|--------|
| `id` | `id` | ✅ |
| `name` | `name` | ✅ |
| `code` | `code` | ✅ |
| `email` | `email` | ✅ |
| `phone` | `phone` | ✅ |
| `address` | `address` | ✅ |
| `city` | `city` | ✅ |
| `state` | `state` | ✅ |
| `postal_code` | `postalCode` | ✅ |
| `country` | `country` | ✅ |
| `contact_person` | `contactPerson` | ✅ |
| `is_active` | `isActive` | ✅ |
| `created_at` | `createdAt` | ✅ |
| `updated_at` | `updatedAt` | ✅ |

### **Applications (aplicaciones)**
| Base de Datos | API Request/Response | Mapper |
|---------------|---------------------|--------|
| `id` | `id` | ✅ |
| `name` | `name` | ✅ |
| `code` | `code` | ✅ |
| `description` | `description` | ✅ |
| `redirect_url` | `redirectUrl` | ✅ |
| `api_key` | `apiKey` / `apiKeyPreview` | ✅ |
| `allowed_origins` | `allowedOrigins` | ✅ |
| `is_active` | `isActive` | ✅ |
| `created_at` | `createdAt` | ✅ |
| `updated_at` | `updatedAt` | ✅ |

### **Permissions (permisos)**
| Base de Datos | API Request/Response | Mapper |
|---------------|---------------------|--------|
| `id` | `id` | ✅ |
| `application_id` | `applicationId` | ✅ |
| `code` | `code` | ✅ |
| `display_name` | `displayName` | ✅ |
| `description` | `description` | ✅ |
| `category` | `category` | ✅ |
| `is_active` | `isActive` | ✅ |
| `created_at` | `createdAt` | ✅ |
| `updated_at` | `updatedAt` | ✅ |

### **Sessions (sesiones)**
| Base de Datos | API Request/Response | Mapper |
|---------------|---------------------|--------|
| `id` | `id` | ✅ |
| `user_id` | `userId` | ✅ |
| `application_id` | `applicationId` | ✅ |
| `ip_address` | `ipAddress` | ✅ |
| `user_agent` | `userAgent` | ✅ |
| `created_at` | `createdAt` | ✅ |
| `last_activity_at` | `lastActivityAt` | ✅ |
| `ended_at` | `endedAt` | ✅ |

### **Audit Log (auditoría)**
| Base de Datos | API Request/Response | Mapper |
|---------------|---------------------|--------|
| `id` | `id` | ✅ |
| `user_id` | `userId` | ✅ |
| `application_id` | `applicationId` | ✅ |
| `action` | `action` | ✅ |
| `ip_address` | `ipAddress` | ✅ |
| `details` | `details` | ✅ |
| `created_at` | `createdAt` | ✅ |

---

## 🔧 Códigos Especiales Validados

### **Franquicias**
- ✅ `GANGAZON_HQ` - Franquicia matriz (protegida contra edición/eliminación)

### **Aplicaciones**
- ✅ `ADMIN_PANEL` - Aplicación de administración (protegida contra eliminación)

### **Permisos**
- ✅ `super_admin` - Permiso especial (protegido contra edición/eliminación)

---

## 🐛 Correcciones Realizadas

### 1. ✅ Franquicia Matriz - CORREGIDO
**Problema:**
- BD: `GANGAZON_HQ`
- API: Validaba como `HQ` ❌

**Solución:**
- Actualizado `src/routes/franchises.js` para usar `GANGAZON_HQ` en las validaciones
- Mensajes de error mejorados: "franquicia matriz Gangazon"

---

## 📝 Funciones Mapper

Cada entidad tiene su función mapper que convierte snake_case (BD) a camelCase (API):

| Archivo | Función Mapper | Ubicación |
|---------|---------------|-----------|
| `users.js` | `mapUser()` | `queryHelpers.js` (compartido) |
| `applications.js` | `mapApplication()` | Local en archivo |
| `permissions.js` | `mapPermission()` | Local en archivo |
| `franchises.js` | `mapFranchise()` | Local en archivo |
| `sessions.js` | `mapSession()` | Local en archivo |
| `audit.js` | `mapAuditLog()` | Local en archivo |

---

## ✅ Conclusión

- **Nomenclatura consistente** entre BD y APIs
- **Mappers implementados** correctamente
- **Validaciones alineadas** con valores reales de BD
- **Códigos protegidos** correctamente identificados
- **1 corrección aplicada** (GANGAZON_HQ)

El sistema está listo para funcionar sin inconsistencias de nomenclatura. 🚀
