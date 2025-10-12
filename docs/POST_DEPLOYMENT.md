# ✅ Verificación del Despliegue

## 🎉 ¡Sistema Desplegado Correctamente!

### 📍 URLs del Sistema:
- **Backend API**: `https://tu-servicio.onrender.com`
- **Base de datos**: Supabase (configurada)
- **Credenciales**: Ya configuradas

### 🧪 Verificar el Despliegue

#### Opción 1: Script de Pruebas Automático
```bash
node test-deployment.js https://tu-servicio.onrender.com
```

#### Opción 2: Pruebas Manuales con curl
```bash
# 1. Health Check
curl https://tu-servicio.onrender.com/health

# 2. Login Admin
curl -X POST https://tu-servicio.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gangazon.com","password":"Admin123!"}'

# 3. Listar Organizaciones (usar token del login)
curl https://tu-servicio.onrender.com/api/organizations \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 🔧 Endpoints Principales Disponibles:

#### 🔐 **Autenticación:**
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Renovar token
- `GET /api/auth/profile` - Perfil del usuario

#### 🏢 **Organizaciones:**
- `GET /api/organizations` - Listar organizaciones
- `POST /api/organizations` - Crear organización
- `PUT /api/organizations/:id` - Actualizar organización

#### 🎯 **Franquicias:**
- `GET /api/franchises` - Listar franquicias
- `POST /api/franchises` - Crear franquicia
- `PUT /api/franchises/:id` - Actualizar franquicia
- `DELETE /api/franchises/:id` - Eliminar franquicia

#### 📍 **Locales:**
- `GET /api/locations` - Listar locales
- `POST /api/locations` - Crear local
- `PUT /api/locations/:id` - Actualizar local
- `DELETE /api/locations/:id` - Eliminar local

#### 👥 **Asignaciones de Empleados:**
- `GET /api/assignments` - Listar asignaciones
- `POST /api/assignments` - Crear asignación
- `PUT /api/assignments/:id` - Actualizar asignación

#### ⏰ **Check-ins:**
- `GET /api/checkins` - Listar check-ins
- `POST /api/checkins` - Hacer check-in
- `PUT /api/checkins/:id/checkout` - Hacer check-out

### 🎯 Próximos Pasos:

#### 1. **Crear Primera Franquicia:**
```bash
curl -X POST https://tu-servicio.onrender.com/api/franchises \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "name": "Mi Primera Franquicia",
    "franchisee_name": "Juan Pérez",
    "franchisee_email": "juan@mifranquicia.com",
    "contract_start_date": "2025-01-01",
    "max_locations": 3,
    "max_employees": 15
  }'
```

#### 2. **Crear Primer Local:**
```bash
curl -X POST https://tu-servicio.onrender.com/api/locations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "franchise_id": "ID_DE_FRANQUICIA",
    "name": "Local Centro",
    "address": "Calle Principal 123",
    "city": "Madrid",
    "postal_code": "28001",
    "max_employees": 5,
    "latitude": 40.4168,
    "longitude": -3.7038
  }'
```

#### 3. **Registrar Empleado:**
```bash
curl -X POST https://tu-servicio.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "empleado@mifranquicia.com",
    "password": "Password123!",
    "firstName": "María",
    "lastName": "García",
    "role": "user"
  }'
```

#### 4. **Asignar Empleado a Local:**
```bash
curl -X POST https://tu-servicio.onrender.com/api/assignments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "user_id": "ID_DEL_EMPLEADO",
    "location_id": "ID_DEL_LOCAL",
    "role_at_location": "employee",
    "start_date": "2025-01-01",
    "shift_type": "full_time"
  }'
```

### 🔗 Integración con Frontend:

#### Headers requeridos:
```javascript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}` // Solo para rutas protegidas
};
```

#### Ejemplo de login en JavaScript:
```javascript
const response = await fetch('https://tu-servicio.onrender.com/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@gangazon.com',
    password: 'Admin123!'
  })
});

const data = await response.json();
if (data.success) {
  localStorage.setItem('token', data.token);
}
```

### 🛡️ Seguridad Configurada:

- ✅ **JWT Tokens** con expiración automática
- ✅ **Rate Limiting** (100 requests por 15 minutos)
- ✅ **CORS** configurado para tus dominios
- ✅ **Roles jerárquicos** de permisos
- ✅ **Validación de entrada** en todos los endpoints
- ✅ **Encriptación de contraseñas**
- ✅ **Auditoría** de todas las acciones

### 📊 Monitoreo:

- **Logs**: Ver en Render Dashboard → Tu servicio → Logs
- **Métricas**: CPU, memoria, requests en tiempo real
- **Health Check**: `GET /health` retorna estado del sistema

## 🎯 ¡Sistema Listo para Producción!

Tu sistema de franquicias está completamente operativo y listo para ser usado por tus aplicaciones frontend.