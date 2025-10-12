# Gangazon Auth Service - Colección Postman

Esta carpeta contiene toda la documentación y configuración necesaria para probar la API de Gangazon Auth Service usando Postman.

## 📁 Archivos incluidos

### 1. **Gangazon-Auth-API.postman_collection.json**
Colección completa de Postman con más de 60 endpoints organizados en 9 categorías:
- ✅ Health Check
- 🔐 Authentication (7 endpoints)
- 👥 Users (7 endpoints)
- 🎭 Roles (5 endpoints)
- 🏢 Franchises (5 endpoints)
- 📍 Locations (6 endpoints)
- 📝 Assignments (6 endpoints)
- ⏰ Check-ins (8 endpoints)
- 🚨 Emergency (2 endpoints)

**Características:**
- Scripts automáticos para guardar tokens
- Tests de validación incluidos
- Ejemplos de request/response
- Documentación integrada

### 2. **openapi.yaml**
Especificación OpenAPI 3.0 completa con:
- Esquemas de datos validados
- Descripciones detalladas
- Códigos de respuesta HTTP
- Compatible con Swagger UI
- Ideal para generación de clientes

### 3. **Gangazon-Local.postman_environment.json**
Entorno para desarrollo local:
- `baseUrl`: http://localhost:10000
- Variables para tokens y IDs de recursos

### 4. **Gangazon-Production.postman_environment.json**
Entorno para producción en Render:
- `baseUrl`: https://gangazon-auth-service.onrender.com
- Configuración para servidor en vivo

## 🚀 Cómo empezar

### Paso 1: Importar en Postman

#### **Opción A: Colección Postman (Recomendado para testing)**
1. Abre Postman
2. Click en **Import** (botón superior izquierdo)
3. Arrastra `Gangazon-Auth-API.postman_collection.json`
4. La colección aparecerá en tu workspace

#### **Opción B: OpenAPI (Recomendado para documentación)**
1. Abre Postman
2. Click en **Import**
3. Arrastra `openapi.yaml`
4. Postman generará la colección automáticamente

### Paso 2: Importar entornos

1. En Postman, click en **Environments** (panel izquierdo)
2. Click en **Import**
3. Selecciona ambos archivos:
   - `Gangazon-Local.postman_environment.json`
   - `Gangazon-Production.postman_environment.json`
4. Activa el entorno que desees usar (Local o Production)

### Paso 3: Configurar el token de emergencia (opcional)

Si necesitas usar el endpoint de emergencia:

1. Ve a **Environments** → Selecciona tu entorno activo
2. Edita la variable `emergencyToken`
3. Ingresa el valor del token configurado en tu servidor

## 🔐 Flujo de autenticación

### 1. Login inicial
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@gangazon.com",
  "password": "SecurePass123!"
}
```

**Resultado:** Los tokens se guardan automáticamente en las variables `accessToken` y `refreshToken`

### 2. Usar endpoints protegidos
Todos los endpoints (excepto `/health`, `/api/auth/login`, `/api/emergency/`) requieren el header:
```http
Authorization: Bearer {{accessToken}}
```

**Nota:** La colección Postman configura esto automáticamente.

### 3. Refrescar token
Cuando el `accessToken` expire (1 hora), usa:
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{{refreshToken}}"
}
```

## 📚 Estructura de la colección

```
Gangazon Auth Service API/
├── Health Check/
│   └── Health Check
├── Authentication/
│   ├── Login (auto-guarda tokens)
│   ├── Register (Admin Only)
│   ├── Refresh Token (auto-actualiza token)
│   ├── Logout
│   ├── Change Password
│   ├── Verify Token
│   └── Get Profile
├── Users/
│   ├── Create User (con asignación automática)
│   ├── List Users (admin, paginado)
│   ├── Get User by ID
│   ├── Get Current User (Me)
│   ├── Update Current User
│   ├── Update User (admin)
│   └── Deactivate User
├── Roles/
│   ├── List Roles
│   ├── Get Role Info
│   ├── Get Role Permissions
│   ├── Check Permission
│   └── Get Users by Role
├── Franchises/
│   ├── Create Franchise
│   ├── List Franchises
│   ├── Get Franchise by ID
│   ├── Update Franchise
│   └── Change Franchise Status
├── Locations/
│   ├── Create Location
│   ├── List Locations
│   ├── Get Location by ID
│   ├── Get Location Employees
│   ├── Update Location
│   └── Deactivate Location
├── Assignments/
│   ├── Create Assignment
│   ├── List Assignments
│   ├── Get Assignment by ID
│   ├── Get User Active Assignments
│   ├── Update Assignment
│   └── End Assignment
├── Check-ins/
│   ├── Check-in (con validación GPS)
│   ├── Check-out
│   ├── Get Current Status
│   ├── List Check-ins
│   ├── Get Check-in by ID
│   ├── Modify Check-in (Manager)
│   └── Get Active Employees at Location
└── Emergency/
    ├── Create Emergency Admin
    └── Check Emergency Status
```

## 🔧 Variables de entorno

### Variables comunes (ambos entornos)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `baseUrl` | URL base del servidor | `http://localhost:10000` |
| `accessToken` | Token JWT de acceso (auto-guardado) | `eyJhbGc...` |
| `refreshToken` | Token de refresco (auto-guardado) | `eyJhbGc...` |
| `emergencyToken` | Token de emergencia (configurar manualmente) | `4200003e3b...` |

### Variables auxiliares

| Variable | Descripción | Uso |
|----------|-------------|-----|
| `userId` | ID del usuario actual | Para pruebas |
| `franchiseId` | ID de franquicia | Para pruebas |
| `locationId` | ID de local | Para pruebas |
| `assignmentId` | ID de asignación | Para pruebas |
| `checkinId` | ID de check-in | Para pruebas |

**Nota:** Las variables auxiliares puedes actualizarlas manualmente para facilitar el testing.

## 🧪 Tests automatizados

La colección incluye tests automáticos que:
- ✅ Validan códigos de respuesta HTTP
- ✅ Verifican estructura de datos
- ✅ Guardan tokens automáticamente
- ✅ Extraen IDs de recursos creados

### Ejemplo de script incluido (Login)
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    if (jsonData.data && jsonData.data.tokens) {
        pm.environment.set('accessToken', jsonData.data.tokens.accessToken);
        pm.environment.set('refreshToken', jsonData.data.tokens.refreshToken);
        console.log('Tokens guardados en variables de entorno');
    }
}
```

## 📖 Ejemplos de uso

### Crear usuario con asignación automática
```http
POST /api/users
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "email": "empleado@gangazon.com",
  "password": "SecurePass123!",
  "firstName": "Juan",
  "lastName": "Pérez",
  "role": "employee",
  "franchiseId": "{{franchiseId}}",
  "locationId": "{{locationId}}",
  "phone": "+34600123456",
  "startDate": "2024-01-15"
}
```

### Hacer check-in con GPS
```http
POST /api/checkins/checkin
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "locationId": "{{locationId}}",
  "checkInMethod": "gps",
  "coordinates": {
    "lat": 40.4168,
    "lng": -3.7038
  },
  "notes": "Check-in normal"
}
```

### Listar locales con filtros
```http
GET /api/locations?page=1&limit=50&franchiseId={{franchiseId}}&city=Madrid
Authorization: Bearer {{accessToken}}
```

## 🎯 Casos de uso comunes

### 1. **Configuración inicial del sistema**
```
1. Health Check → Verificar que el servidor está funcionando
2. Emergency/Create Admin → Crear primer administrador (si es necesario)
3. Login → Autenticarse con admin
4. Franchises/Create → Crear franquicia
5. Locations/Create → Crear local
6. Users/Create User → Crear empleados
```

### 2. **Gestión de empleados**
```
1. Login como admin/franchisee
2. Users/List Users → Ver todos los usuarios
3. Assignments/Create → Asignar empleado a local
4. Locations/Get Location Employees → Verificar asignación
```

### 3. **Control de asistencia**
```
1. Login como empleado
2. Check-ins/Check-in → Registrar entrada
3. Check-ins/Get Current Status → Verificar estado
4. Check-ins/Check-out → Registrar salida
```

### 4. **Reportes y consultas**
```
1. Login como manager/admin
2. Locations/Get Location by ID → Ver detalles + estadísticas
3. Check-ins/List → Ver historial de asistencia
4. Assignments/List → Ver asignaciones activas
```

## 🔍 Troubleshooting

### Error: "Token inválido" o "No autenticado"
**Solución:**
1. Verifica que el token esté guardado: `{{accessToken}}`
2. Ejecuta nuevamente el endpoint de Login
3. Si el token expiró (1h), usa Refresh Token

### Error: "Acceso denegado"
**Solución:**
1. Verifica tu rol de usuario
2. Algunos endpoints requieren roles específicos:
   - Admin: Todos los endpoints
   - Franchisee: Su franquicia y locales
   - Manager: Su local asignado
   - Employee: Solo sus propios datos

### Error: "Coordenadas GPS fuera de rango"
**Solución:**
1. Asegúrate de que el local tenga coordenadas configuradas
2. Verifica que estés dentro del rango permitido (default: 100m)
3. Ajusta `GPS_TOLERANCE_METERS` en el servidor si es necesario

### Endpoint de emergencia no funciona
**Solución:**
1. Verifica que `ENABLE_EMERGENCY_ENDPOINT=true` en el servidor
2. Configura `EMERGENCY_ADMIN_TOKEN` en el servidor
3. Actualiza la variable `emergencyToken` en tu entorno de Postman

## 🔐 Seguridad

### ⚠️ Advertencias importantes

1. **Nunca compartas tokens en producción**
   - Los tokens tienen información sensible
   - Cambia los tokens si fueron expuestos

2. **Endpoint de emergencia**
   - Solo para desarrollo o recuperación
   - **Desactívalo en producción**: `ENABLE_EMERGENCY_ENDPOINT=false`

3. **Variables de entorno**
   - No hagas commit de entornos con tokens reales
   - Usa valores de ejemplo en el repositorio

4. **Passwords de prueba**
   - Cambia las contraseñas de ejemplo en producción
   - Usa contraseñas fuertes (min 8 caracteres, mayúsculas, números, símbolos)

## 📝 Notas adicionales

### Roles y permisos
- **admin**: Acceso completo al sistema
- **franchisee**: Gestiona su franquicia y locales
- **manager**: Gestiona su local asignado
- **supervisor**: Supervisa empleados de su local
- **employee**: Hace check-in/out, ve su horario
- **viewer**: Solo lectura (sin modificaciones)

### Validación GPS
- Tolerancia por defecto: 100 metros
- El local debe tener coordenadas configuradas
- El empleado debe tener asignación activa al local

### Paginación
- Por defecto: 50 resultados por página
- Máximo: 100 resultados por página
- Parámetros: `?page=1&limit=50`

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs del servidor
2. Verifica la documentación OpenAPI
3. Consulta el README principal del proyecto
4. Contacta al equipo de desarrollo

## 📚 Referencias

- [Documentación Postman](https://learning.postman.com/docs/getting-started/introduction/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [JWT.io](https://jwt.io/) - Decodifica tokens JWT
- [Swagger Editor](https://editor.swagger.io/) - Valida OpenAPI

---

**Última actualización:** Octubre 2025  
**Versión de la API:** 1.0.0  
**Mantenido por:** Equipo Gangazon
