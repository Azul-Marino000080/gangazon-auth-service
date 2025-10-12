# 📋 Estructura Simplificada - Gangazon Auth Service

## 🏢 Modelo de Negocio

```
GANGAZON (Franquicia Matriz)
│
├── 👔 Franquiciado A (ej: Juan Pérez)
│   ├── 📍 Local 1 (Madrid Centro)
│   │   ├── 👤 Manager
│   │   ├── 👤 Supervisor
│   │   └── 👤 Empleados (3)
│   ├── 📍 Local 2 (Madrid Norte)
│   └── 📍 Local 3 (Madrid Sur)
│
├── 👔 Franquiciado B (ej: María García)
│   ├── 📍 Local 1 (Barcelona)
│   └── 📍 Local 2 (Barcelona)
│
└── 👔 Franquiciado C (ej: Pedro López)
    └── 📍 Local 1 (Valencia)
```

## 👥 Roles Simplificados (6 roles)

### 🔴 **admin** - Administrador Gangazon (Casa Matriz)
- **Acceso**: Todo el sistema
- **Permisos**:
  - Crear/gestionar franquiciados
  - Ver todos los locales
  - Ver todos los empleados
  - Reportes globales
  - Configuración del sistema

### 🟠 **franchisee** - Dueño de Franquicia
- **Acceso**: Su franquicia y todos sus locales
- **Permisos**:
  - Crear/gestionar locales propios
  - Gestionar empleados de sus locales
  - Asignar managers
  - Ver reportes de su franquicia
  - NO puede ver otros franquiciados

### 🟡 **manager** - Gerente de Local
- **Acceso**: Locales asignados
- **Permisos**:
  - Gestionar empleados del local
  - Aprobar/modificar fichajes
  - Ver reportes del local
  - Gestionar horarios
  - NO puede crear locales

### 🟢 **supervisor** - Supervisor de Local
- **Acceso**: Locales asignados (solo lectura ampliada)
- **Permisos**:
  - Ver empleados del local
  - Aprobar fichajes
  - Ver reportes básicos
  - Supervisar operaciones
  - NO puede modificar empleados

### 🔵 **employee** - Empleado
- **Acceso**: Solo su información y locales asignados
- **Permisos**:
  - Check-in/Check-out
  - Ver su horario
  - Ver su perfil
  - Ver su historial de fichajes
  - NO puede ver otros empleados

### ⚪ **viewer** - Solo Lectura
- **Acceso**: Limitado según asignación
- **Permisos**:
  - Ver reportes (sin editar)
  - Ver información básica
  - Útil para contables, auditores, etc.

## 🗄️ Estructura de Base de Datos

### Tablas Principales

```sql
-- YA NO SE USA: organizations (una sola organización: Gangazon)

franchises (franquiciados)
├── id
├── name (ej: "Franquicia Juan Pérez")
├── franchisee_name (ej: "Juan Pérez")
├── franchisee_email
├── franchisee_phone
├── contract_start_date
├── contract_end_date
├── max_locations (límite de locales)
├── max_employees (límite de empleados)
├── status (active, suspended, terminated)
└── created_at

locations (locales de cada franquiciado)
├── id
├── franchise_id → franchises.id
├── name (ej: "Madrid Centro")
├── address
├── city
├── manager_id → users.id
├── max_employees
└── operating_hours

users (todos los usuarios del sistema)
├── id
├── email
├── password_hash
├── first_name
├── last_name
├── role (admin, franchisee, manager, supervisor, employee, viewer)
├── is_active
└── created_at

employee_assignments (asignación de empleados a locales)
├── id
├── user_id → users.id
├── location_id → locations.id
├── role_at_location (manager, supervisor, employee)
├── start_date
├── end_date
├── is_active
└── shift_type

employee_checkins (fichajes)
├── id
├── user_id → users.id
├── location_id → locations.id
├── check_in_time
├── check_out_time
├── break_duration
└── notes
```

## 🔐 Permisos por Endpoint

### `/api/auth` - Autenticación
- ✅ **Todos**: login, register
- 🔒 **Autenticado**: logout, refresh, change-password, profile

### `/api/users` - Usuarios
- 🔴 **admin**: Ver/editar todos
- 🟠 **franchisee**: Ver/editar empleados de sus locales
- 🟡 **manager**: Ver empleados de su local
- 🔵 **employee**: Solo su perfil

### `/api/franchises` - Franquiciados
- 🔴 **admin**: CRUD completo
- 🟠 **franchisee**: Ver solo su franquicia (read-only)
- ❌ **otros**: Sin acceso

### `/api/locations` - Locales
- 🔴 **admin**: Ver/editar todos
- 🟠 **franchisee**: CRUD de sus locales
- 🟡 **manager**: Ver/editar locales asignados
- 🔵 **employee**: Ver locales donde trabaja

### `/api/assignments` - Asignaciones
- 🔴 **admin**: Todas
- 🟠 **franchisee**: Asignaciones de sus locales
- 🟡 **manager**: Asignaciones de su local
- 🔵 **employee**: Solo sus asignaciones

### `/api/checkins` - Fichajes
- 🔵 **employee**: Check-in/out propio
- 🟡 **manager**: Ver/aprobar fichajes del local
- 🟠 **franchisee**: Ver fichajes de sus locales
- 🔴 **admin**: Todos los fichajes

## 🚀 Casos de Uso

### 1. Admin de Gangazon crea nuevo franquiciado
```http
POST /api/franchises
Authorization: Bearer {admin_token}
{
  "name": "Franquicia Juan Pérez",
  "franchiseeName": "Juan Pérez",
  "franchiseeEmail": "juan@email.com",
  "franchiseePhone": "+34 600 000 000",
  "contractStartDate": "2025-01-01",
  "maxLocations": 5,
  "maxEmployees": 25
}
```

### 2. Franquiciado crea un local
```http
POST /api/locations
Authorization: Bearer {franchisee_token}
{
  "franchiseId": "uuid-franquicia",
  "name": "Madrid Centro",
  "address": "Calle Gran Vía 1",
  "city": "Madrid",
  "managerId": "uuid-manager",
  "maxEmployees": 8
}
```

### 3. Manager asigna empleado a local
```http
POST /api/assignments
Authorization: Bearer {manager_token}
{
  "user_id": "uuid-empleado",
  "location_id": "uuid-local",
  "role_at_location": "employee",
  "start_date": "2025-10-15",
  "shift_type": "full_time"
}
```

### 4. Empleado hace check-in
```http
POST /api/checkins/checkin
Authorization: Bearer {employee_token}
{
  "locationId": "uuid-local",
  "checkInMethod": "manual"
}
```

## 📱 Aplicaciones que usan el Auth Service

### 1. **gangazon-scanner2** (React)
- Escaneo de productos Amazon
- Usuarios: admin, employee
- Endpoints usados:
  - `/api/auth/*`
  - `/api/users/me`

### 2. **gangazon_fichajes** (Flutter)
- Control de asistencia
- Usuarios: todos los roles
- Endpoints usados:
  - `/api/auth/*`
  - `/api/locations/*`
  - `/api/checkins/*`
  - `/api/assignments/*`

### 3. **Futuras aplicaciones**
- Todas usarán el mismo auth-service
- Roles reutilizables
- SSO (Single Sign-On)

## ⚙️ Cambios Realizados

### ❌ Eliminado
- ❌ `organizations` - Solo hay Gangazon
- ❌ Roles complejos (9 roles → 6 roles)
- ❌ `/api/organizations/*`

### ✅ Simplificado
- ✅ 6 roles claros y funcionales
- ✅ Franchises sin organizationId
- ✅ Validaciones actualizadas
- ✅ Estructura más clara

### 🔄 Mantenido
- ✅ `/api/auth` - Autenticación completa
- ✅ `/api/users` - Gestión de usuarios
- ✅ `/api/franchises` - Franquiciados
- ✅ `/api/locations` - Locales
- ✅ `/api/assignments` - Asignaciones
- ✅ `/api/checkins` - Fichajes
- ✅ `/api/emergency` - Admin de emergencia

## 🔧 Próximos Pasos

1. **Actualizar base de datos**:
   - Eliminar constraint de `organization_id` en `franchises`
   - Migrar roles existentes a los nuevos
   - Crear franquicia principal "Gangazon"

2. **Actualizar middleware de autenticación**:
   - Simplificar verificación de roles
   - Actualizar permisos

3. **Actualizar rutas**:
   - Eliminar validaciones de `organizationId`
   - Actualizar filtros de queries

4. **Testing**:
   - Probar todos los flujos con nuevos roles
   - Verificar permisos por rol

---

**🎯 Resultado**: Sistema más simple, mantenible y escalable para una franquicia con múltiples franquiciados y locales.
