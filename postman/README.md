# Postman Collection - Gangazon Auth Service API

Esta carpeta contiene la configuración completa de Postman para probar y documentar la API de Gangazon Auth Service.

## 📁 Archivos incluidos

- `Gangazon-Auth-API.postman_collection.json` - Colección completa de requests
- `Gangazon-Local.postman_environment.json` - Entorno para desarrollo local
- `Gangazon-Production.postman_environment.json` - Entorno para producción (Render)
- `README.md` - Esta documentación

## 🚀 Configuración inicial

### 1. Importar en Postman

1. Abre Postman Desktop o Web
2. Ve a **Collections** → **Import**
3. Arrastra o selecciona el archivo `Gangazon-Auth-API.postman_collection.json`
4. Ve a **Environments** → **Import**
5. Importa ambos archivos de entorno (.postman_environment.json)

### 2. Conectar con GitHub

Para usar la función de **API Repository** de Postman:

1. En Postman, ve a tu workspace
2. Selecciona la colección importada
3. Click en los tres puntos → **Connect Repository**
4. Selecciona **GitHub**
5. Autoriza Postman a acceder a tu GitHub
6. Selecciona el repositorio: `Azul-Marino000080/gangazon-auth-service`
7. Configura:
   - Branch: `main`
   - Directory: `postman/`
   - Sync: **Two-way sync** (recomendado)

### 3. Seleccionar entorno

En la esquina superior derecha de Postman, selecciona:
- **Gangazon-Local** para desarrollo local
- **Gangazon-Production** para probar en Render

## 🔐 Autenticación

La colección utiliza **Bearer Token** que se guarda automáticamente al hacer login.

### Flujo de autenticación:

1. Ejecuta el request **Auth → Login**
2. El token se guarda automáticamente en `{{accessToken}}`
3. Todas las demás peticiones usarán este token

### Para crear tu primer usuario admin:

1. Selecciona entorno **Gangazon-Local** o **Gangazon-Production**
2. Ejecuta **Emergency → Create Admin User**
3. Usa las credenciales creadas para hacer login

## 📖 Estructura de la colección

```
Gangazon Auth Service API/
├── 🔐 Auth
│   ├── Login
│   ├── Register (Admin only)
│   ├── Refresh Token
│   ├── Logout
│   ├── Change Password
│   ├── Verify Token
│   └── Get Profile
├── 👤 Users
│   ├── Create User
│   ├── Get Current User
│   ├── Update Current User
│   ├── List Users
│   ├── Get User by ID
│   ├── Update User
│   └── Deactivate User
├── 🏢 Franchises
│   ├── Create Franchise
│   ├── List Franchises
│   ├── Get Franchise by ID
│   ├── Update Franchise
│   └── Change Franchise Status
├── 📍 Locations
│   ├── Create Location
│   ├── List Locations
│   ├── Get Location by ID
│   ├── Get Location Employees
│   ├── Update Location
│   └── Deactivate Location
├── ⏰ Check-ins
│   ├── Check In
│   ├── Check Out
│   ├── Get Status
│   ├── List Check-ins
│   ├── Get Check-in by ID
│   ├── Update Check-in
│   └── Get Active Employees in Location
├── 📋 Assignments
│   ├── Create Assignment
│   ├── List Assignments
│   ├── Get User Active Assignments
│   ├── Get Assignment by ID
│   ├── Update Assignment
│   └── End Assignment
├── 🎭 Roles
│   ├── List Roles
│   ├── Get Role by Name
│   ├── Get Role Permissions
│   ├── Check Permission
│   └── Get Users by Role
└── 🚨 Emergency
    ├── Create Admin User
    └── Check Status
```

## 🧪 Tests automatizados

Cada request incluye tests que verifican:
- ✅ Status code correcto
- ✅ Estructura de la respuesta
- ✅ Tipos de datos correctos
- ✅ Validaciones de negocio

### Ejecutar todos los tests:

1. Click derecho en la colección
2. Selecciona **Run collection**
3. Selecciona los requests a ejecutar
4. Click **Run Gangazon Auth Service API**

### Test scripts incluidos:

```javascript
// Ejemplo de test incluido
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has required fields", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
    pm.expect(jsonData).to.have.property('data');
});
```

## 🔄 Variables de entorno

### Gangazon-Local
```
baseUrl: http://localhost:10000
accessToken: (se auto-genera)
refreshToken: (se auto-genera)
userId: (se auto-genera)
locationId: (ejemplo)
franchiseId: (ejemplo)
```

### Gangazon-Production
```
baseUrl: https://gangazon-auth-service.onrender.com
accessToken: (se auto-genera)
refreshToken: (se auto-genera)
userId: (se auto-genera)
locationId: (ejemplo)
franchiseId: (ejemplo)
```

## 📝 Cómo usar cada endpoint

### 1. Autenticación inicial

```
1. Emergency → Create Admin User
   Crea tu primer usuario administrador
   
2. Auth → Login
   Inicia sesión con las credenciales creadas
   
3. ¡Listo! Ya puedes usar todos los endpoints
```

### 2. Crear una franquicia

```
1. Franchises → Create Franchise
   Crea una nueva franquicia
   
2. Copia el ID de la franquicia devuelto
```

### 3. Crear un local

```
1. Locations → Create Location
   Usa el franchiseId de la franquicia creada
   
2. Copia el ID del local devuelto
```

### 4. Crear empleados

```
1. Users → Create User
   Incluye franchiseId y locationId
   
2. El empleado se asigna automáticamente al local
```

### 5. Registrar asistencia

```
1. Check-ins → Check In
   El empleado registra entrada
   
2. Check-ins → Check Out
   El empleado registra salida
```

## 🎯 Ejemplos de uso

### Crear usuario admin de emergencia

```http
POST {{baseUrl}}/api/emergency/create-admin
Headers:
  x-emergency-token: {{emergencyToken}}

Body:
{
  "email": "admin@gangazon.com",
  "password": "SecurePass123!",
  "firstName": "Admin",
  "lastName": "Gangazon",
  "role": "admin"
}
```

### Login

```http
POST {{baseUrl}}/api/auth/login
Body:
{
  "email": "admin@gangazon.com",
  "password": "SecurePass123!"
}
```

### Crear franquicia

```http
POST {{baseUrl}}/api/franchises
Headers:
  Authorization: Bearer {{accessToken}}

Body:
{
  "name": "Gangazon Centro",
  "franchiseeName": "Juan Pérez",
  "franchiseeEmail": "juan@gangazon.com",
  "franchiseePhone": "+34600123456",
  "contractStartDate": "2025-01-01",
  "contractEndDate": "2030-12-31",
  "maxLocations": 5,
  "maxEmployees": 50
}
```

## 🔍 Búsqueda y filtros

La mayoría de endpoints de listado soportan parámetros de query:

```
GET /api/users?page=1&limit=50&search=juan&role=employee
GET /api/franchises?status=active&search=centro
GET /api/locations?franchiseId=xxx&city=Madrid
GET /api/checkins?userId=xxx&date=2025-10-12&locationId=xxx
GET /api/assignments?isActive=true&locationId=xxx
```

## 🐛 Troubleshooting

### Error 401 - No autorizado
- Verifica que has hecho login
- Revisa que el token no ha expirado (15 minutos)
- Usa **Refresh Token** para renovar

### Error 403 - Prohibido
- Tu rol no tiene permisos para esta acción
- Verifica que tu usuario tiene el rol correcto

### Error 404 - No encontrado
- Verifica que el ID existe
- Asegúrate de tener acceso a ese recurso

### Token expirado
1. Ejecuta **Auth → Refresh Token**
2. O vuelve a hacer **Auth → Login**

## 📚 Documentación adicional

- [Documentación de roles y permisos](../README.md#roles-y-permisos)
- [Esquema de base de datos](../database/schema.sql)
- [Variables de entorno](../.env.production)

## 🔐 Seguridad

**IMPORTANTE:** 
- Nunca subas tokens reales al repositorio
- Usa variables de entorno para datos sensibles
- Desactiva el endpoint de emergencia en producción
- Cambia el `EMERGENCY_ADMIN_TOKEN` regularmente

## 📞 Soporte

Para reportar bugs o solicitar features:
- Abre un issue en el repositorio GitHub
- Contacta al equipo de desarrollo
