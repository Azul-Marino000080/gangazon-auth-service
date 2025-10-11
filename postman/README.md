# 📮 Configuración de Postman para Gangazon Auth Service

## 🚀 Configuración Rápida

### 1. Importar Archivos en Postman

1. **Abrir Postman**
2. **Importar Colección:**
   - Click en **"Import"**
   - Selecciona el archivo: `postman/Gangazon-Auth-Service.postman_collection.json`
   - Click **"Import"**

3. **Importar Entorno:**
   - Click en **"Import"**
   - Selecciona el archivo: `postman/Gangazon-Auth-Production.postman_environment.json`
   - Click **"Import"**

4. **Activar Entorno:**
   - En el dropdown superior derecho, selecciona: **"Gangazon Auth Service - Production"**

### 2. Configuración Inicial

#### ✅ Variables Pre-configuradas:
- `base_url`: `https://gangazon-auth-service.onrender.com`
- `admin_email`: `admin@gangazon.com`
- `admin_password`: `Admin123!`

#### 🔐 Variables que se rellenan automáticamente:
- `auth_token` - Se rellena al hacer login
- `user_id` - Se rellena al hacer login
- `organization_id` - Se rellena al hacer login
- `franchise_id` - Se rellena al crear franquicia
- `location_id` - Se rellena al crear local
- `assignment_id` - Se rellena al crear asignación
- `checkin_id` - Se rellena al hacer check-in

## 🧪 Flujo de Pruebas Recomendado

### 1. **Verificación Inicial**
```
🏥 Health & Status
  ├── Health Check
  └── API Base Route
```

### 2. **Autenticación**
```
🔐 Authentication
  ├── Login Admin (Ejecutar PRIMERO)
  ├── Get User Profile
  ├── Register New User
  ├── Refresh Token
  └── Logout
```

### 3. **Gestión de Organizaciones**
```
🏢 Organizations
  ├── List Organizations
  ├── Create Organization
  ├── Get Organization by ID
  └── Update Organization
```

### 4. **Sistema de Franquicias**
```
🎯 Franchises
  ├── List Franchises
  ├── Create Franchise (Guarda franchise_id)
  ├── Get Franchise by ID
  ├── Update Franchise
  └── Delete Franchise
```

### 5. **Gestión de Locales**
```
📍 Locations
  ├── List Locations
  ├── List Locations by Franchise
  ├── Create Location (Guarda location_id)
  ├── Get Location by ID
  ├── Update Location
  └── Delete Location
```

### 6. **Asignaciones de Empleados**
```
👥 Employee Assignments
  ├── List Assignments
  ├── List Assignments by Location
  ├── List Assignments by User
  ├── Create Assignment (Guarda assignment_id)
  ├── Get Assignment by ID
  ├── Update Assignment
  └── Deactivate Assignment
```

### 7. **Control de Presencia**
```
⏰ Employee Check-ins
  ├── List Check-ins
  ├── List Check-ins by Location
  ├── List Check-ins by User
  ├── List Today's Check-ins
  ├── Create Check-in (Guarda checkin_id)
  ├── Create Check-in with GPS
  ├── Get Check-in by ID
  ├── Check-out
  ├── Get Current User Location
  └── Get Active Employees at Location
```

### 8. **Gestión de Usuarios**
```
👤 Users
  ├── List Users
  ├── Get User by ID
  ├── Update User
  └── Delete User
```

### 9. **Roles y Permisos**
```
🔒 Roles & Permissions
  ├── List Available Roles
  └── Check User Permissions
```

## 🔧 Campos Vacíos para Completar

### 📝 **Register New User:**
```json
{
  "email": "",                    // ← Tu email
  "password": "",                 // ← Contraseña segura
  "firstName": "",                // ← Nombre
  "lastName": "",                 // ← Apellido
  "role": "user"                  // ← Rol: user, admin, franchisor_admin, etc.
}
```

### 🏢 **Create Organization:**
```json
{
  "name": "",                     // ← Nombre de la organización
  "description": "",              // ← Descripción
  "website": "",                  // ← Sitio web
  "industry": "",                 // ← Industria
  "size": "medium"                // ← startup, small, medium, large, enterprise
}
```

### 🎯 **Create Franchise:**
```json
{
  "name": "",                     // ← Nombre de la franquicia
  "franchisee_name": "",          // ← Nombre del franquiciado
  "franchisee_email": "",         // ← Email del franquiciado
  "franchisee_phone": "",         // ← Teléfono
  "contract_start_date": "2025-01-01",
  "contract_end_date": "2030-12-31",
  "max_locations": 5,
  "max_employees": 25,
  "billing_tier": "standard"      // ← basic, standard, premium
}
```

### 📍 **Create Location:**
```json
{
  "franchise_id": "{{franchise_id}}", // ← Se rellena automáticamente
  "name": "",                     // ← Nombre del local
  "address": "",                  // ← Dirección completa
  "city": "",                     // ← Ciudad
  "postal_code": "",              // ← Código postal
  "country": "España",
  "phone": "",                    // ← Teléfono del local
  "email": "",                    // ← Email del local
  "max_employees": 10,
  "latitude": 40.4168,            // ← Coordenadas GPS reales
  "longitude": -3.7038,           // ← Coordenadas GPS reales
  "timezone": "Europe/Madrid"
}
```

### 👥 **Create Assignment:**
```json
{
  "user_id": "{{user_id}}",       // ← Se rellena automáticamente
  "location_id": "{{location_id}}", // ← Se rellena automáticamente
  "role_at_location": "employee", // ← employee, supervisor, manager
  "start_date": "2025-01-01",     // ← Fecha de inicio
  "end_date": "2025-12-31",       // ← Fecha de fin (opcional)
  "shift_type": "full_time",      // ← full_time, part_time, temporary, cover
  "notes": ""                     // ← Notas adicionales
}
```

### ⏰ **Create Check-in:**
```json
{
  "location_id": "{{location_id}}", // ← Se rellena automáticamente
  "check_in_method": "manual",    // ← manual, gps, qr_code, nfc
  "check_in_latitude": 40.4168,   // ← Coordenadas GPS del check-in
  "check_in_longitude": -3.7038,  // ← Coordenadas GPS del check-in
  "shift_type": "regular",        // ← Tipo de turno
  "notes": ""                     // ← Notas del check-in
}
```

## 🎯 Scripts Automáticos

### ✅ **Scripts Pre-configurados:**
- **Login Admin:** Guarda automáticamente el token y IDs en variables
- **Create Franchise:** Guarda el `franchise_id` para usar en otros endpoints
- **Create Location:** Guarda el `location_id` para usar en otros endpoints
- **Create Assignment:** Guarda el `assignment_id` para usar en otros endpoints
- **Create Check-in:** Guarda el `checkin_id` para usar en otros endpoints

### 🔄 **Flujo Automático:**
1. Ejecuta **"Login Admin"** primero
2. Los siguientes endpoints usarán automáticamente el token
3. Cada creación guardará el ID correspondiente
4. Los endpoints de consulta usarán los IDs guardados

## 🚨 Notas Importantes

- **Ejecutar "Login Admin" PRIMERO** para obtener el token
- **Las variables se actualizan automáticamente** con cada creación
- **Los campos vacíos deben completarse** según tus necesidades
- **El token expira cada 15 minutos** - volver a hacer login si es necesario
- **GPS coordinates:** Usa coordenadas reales de tus ubicaciones

## ✅ ¡Listo para Probar!

Con esta configuración puedes probar todo el sistema de franquicias de forma completa y automatizada.