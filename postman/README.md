# Postman Collection - Gangazon Auth Service v2.0

Esta carpeta contiene la colección completa de Postman para probar y documentar todos los endpoints del servicio de autenticación de Gangazon.

## 📦 Archivos Incluidos

### 1. `Gangazon-Auth-Service.postman_collection.json`
Colección completa con **49 endpoints** organizados en 8 categorías:

#### 🔧 Setup (2 endpoints)
- Check Setup Status
- Create Super Admin

#### 🔐 Authentication (5 endpoints)
- Login
- Refresh Token
- Logout
- Verify Token
- Get Current User

#### 👥 Users (8 endpoints)
- List Users (con paginación y filtros)
- Get User by ID
- Create User
- Update User
- Delete User
- Get User Permissions
- Assign Permission to User
- Revoke Permission from User

#### 🏢 Franchises (5 endpoints)
- List Franchises
- Get Franchise by ID
- Create Franchise
- Update Franchise
- Delete Franchise

#### 📱 Applications (6 endpoints)
- List Applications
- Get Application by ID
- Create Application
- Update Application
- Regenerate API Key
- Delete Application

#### 🔑 Permissions (5 endpoints)
- List Permissions
- Get Permission by ID
- Create Permission
- Update Permission
- Delete Permission

#### 🖥️ Sessions (3 endpoints)
- List Sessions
- Get Session by ID
- End Session

#### 📋 Audit (2 endpoints)
- List Audit Logs
- Get Audit Log by ID

### 2. `Local.postman_environment.json`
Variables de entorno para desarrollo local:
- `base_url`: http://localhost:10000
- `access_token`: Se guarda automáticamente tras login
- `refresh_token`: Se guarda automáticamente tras login
- `setup_token`: Token para crear super admin

### 3. `Production.postman_environment.json`
Variables de entorno para producción:
- `base_url`: URL de producción (configurar)
- `access_token`: Se guarda automáticamente
- `refresh_token`: Se guarda automáticamente
- `setup_token`: Deshabilitado en producción

## 🚀 Cómo Usar

### Paso 1: Importar en Postman
1. Abre Postman
2. Click en **Import**
3. Arrastra los archivos JSON o selecciona la carpeta `postman`
4. Postman importará automáticamente:
   - ✅ Colección de endpoints
   - ✅ Ambiente Local
   - ✅ Ambiente Production

### Paso 2: Seleccionar Ambiente
1. En Postman, click en el dropdown de ambientes (esquina superior derecha)
2. Selecciona **"Gangazon Auth - Local"**

### Paso 3: Flujo de Prueba Completo

#### A. Setup Inicial (Solo primera vez)
```
1. GET /api/setup/status
   → Verifica si el setup está disponible

2. POST /api/setup/super-admin
   → Crea el primer super admin
   → Headers: x-setup-token: {{setup_token}}
   → Body: { email, password, first_name, last_name }
```

#### B. Autenticación
```
3. POST /api/auth/login
   → Inicia sesión con el super admin
   → Body: { email, password, applicationCode: "ADMIN_PANEL" }
   → ✅ Los tokens se guardan AUTOMÁTICAMENTE en las variables

4. GET /api/auth/verify
   → Verifica que el token es válido

5. GET /api/auth/me
   → Obtiene información del usuario autenticado
```

#### C. Gestión de Usuarios
```
6. GET /api/users
   → Lista todos los usuarios

7. POST /api/users
   → Crea un nuevo usuario

8. GET /api/users/:id/permissions
   → Ver permisos del usuario

9. POST /api/users/:id/assign
   → Asignar permiso a usuario
```

#### D. Gestión de Aplicaciones
```
10. GET /api/applications
    → Ver aplicaciones registradas

11. POST /api/applications
    → Registrar nueva aplicación (requiere super_admin)
```

#### E. Auditoría y Sesiones
```
12. GET /api/sessions
    → Ver sesiones activas

13. GET /api/audit
    → Consultar logs de auditoría
```

## 🔐 Autenticación Automática

La colección está configurada para **gestionar tokens automáticamente**:

### Scripts Post-Request (Test Scripts)
Cada endpoint de autenticación incluye scripts que:

1. **Login**: Guarda `access_token` y `refresh_token` automáticamente
2. **Refresh**: Actualiza el `access_token` automáticamente
3. **Console logs**: Muestra información útil en la consola de Postman

### Autorización Global
La colección tiene configurado **Bearer Token** a nivel global usando `{{access_token}}`.

Todos los endpoints (excepto login y setup) heredan automáticamente esta autorización.

## 📝 Estructura de Respuestas

### Éxito (2xx)
```json
{
  "success": true,
  "data": { ... },
  "message": "Mensaje descriptivo"
}
```

### Éxito con Paginación
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### Error (4xx, 5xx)
```json
{
  "success": false,
  "error": "Mensaje de error",
  "details": { ... }
}
```

## 🔑 Permisos Requeridos

Cada endpoint documenta qué permiso necesita:

| Categoría | Permisos |
|-----------|----------|
| **Users** | `users.view`, `users.create`, `users.edit`, `users.delete` |
| **Franchises** | `franchises.view`, `franchises.create`, `franchises.edit`, `franchises.delete` |
| **Applications** | `applications.view`, `applications.create`, `applications.edit`, `applications.delete` |
| **Permissions** | `permissions.view`, `permissions.create`, `permissions.edit`, `permissions.delete`, `permissions.assign` |
| **Sessions** | `sessions.view`, `sessions.delete` |
| **Audit** | `audit.view` |
| **Super Admin** | `super_admin` (acceso total) |

## 🛡️ Seguridad

### Tokens
- **Access Token**: Expira en 30 minutos
- **Refresh Token**: Expira en 7 días
- **Setup Token**: Solo para desarrollo, debe deshabilitarse en producción

### Rate Limiting
El servidor tiene configurado rate limiting:
- **Ventana**: 15 minutos
- **Máximo**: 100 requests por IP

### CORS
Configurado para permitir requests desde:
- http://localhost:3000
- http://localhost:5173
- (Configurar según necesidad en producción)

## 📊 Testing Automatizado

Cada request incluye:
- ✅ Descripción detallada del endpoint
- ✅ Ejemplo de body con datos realistas
- ✅ Scripts de test para validación automática
- ✅ Gestión automática de tokens
- ✅ Console logs para debugging

### Ejecutar Tests
1. Selecciona la colección "Gangazon Auth Service v2.0"
2. Click en **Run** (botón de play)
3. Selecciona los endpoints a probar
4. Click en **Run Gangazon Auth Service v2.0**
5. Postman ejecutará todos los tests automáticamente

## 🐛 Debugging

### Ver Logs
Los scripts de test imprimen información útil en la **Console** de Postman:
- Tokens guardados
- Permisos del usuario
- IDs de recursos creados

### Variables de Entorno
Puedes ver y editar las variables en cualquier momento:
1. Click en el ícono de "ojo" (ambiente activo)
2. Click en **Edit** para modificar valores

## 📚 Documentación Adicional

Para más información consulta:
- `README.md` - Documentación general del proyecto
- `API_ROUTES.md` - Detalles técnicos de cada ruta
- `PERMISSIONS_GUIDE.md` - Sistema de permisos completo
- `SETUP_SUPER_ADMIN.md` - Guía de configuración inicial

## 🤝 Contribuir

Si encuentras algún error o quieres agregar nuevos endpoints:
1. Actualiza la colección en Postman
2. Exporta la colección actualizada
3. Reemplaza el archivo JSON
4. Actualiza este README si es necesario

---

**Versión**: 2.0  
**Última actualización**: 7 de Noviembre, 2025  
**Mantenedor**: Equipo Gangazon  
**Base de Datos**: auth_gangazon schema con tablas auth_*
