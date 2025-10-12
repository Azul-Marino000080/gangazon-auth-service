# 📮 Colección de Postman - Gangazon Auth Service

## 🚀 Configuración Rápida

### 1. Importar en Postman

1. **Abrir Postman Desktop** o **Postman Web**
2. **Importar Colección:**
   - Click en **"Import"** (botón superior izquierdo)
   - Arrastra o selecciona: `Gangazon-Auth-Service.postman_collection.json`
   - Click **"Import"**

3. **Importar Entorno:**
   - Click en **"Import"**
   - Arrastra o selecciona: `Gangazon-Auth-Production.postman_environment.json`
   - Click **"Import"**

4. **Activar Entorno:**
   - En el dropdown superior derecha, selecciona: **"Gangazon Auth Service - Production"**
   - Verifica que aparezca con un check verde ✓

## 📋 Estructura de la Colección

### 🏥 **Health & Status**
Verificar estado del servicio
- `GET /health` - Health check básico
- `GET /` - Información de la API

### 🔐 **Authentication**
Sistema de autenticación JWT
- `POST /api/auth/login` - Login (guarda token automáticamente)
- `POST /api/auth/register` - Registrar nuevo usuario
- `GET /api/auth/profile` - Obtener perfil del usuario
- `POST /api/auth/refresh` - Renovar token
- `POST /api/auth/logout` - Cerrar sesión

### 🏢 **Organizations**
Gestión de organizaciones
- `GET /api/organizations` - Listar organizaciones
- `GET /api/organizations/:id` - Obtener organización por ID

### 🎯 **Franchises**
Gestión de franquicias
- `POST /api/franchises` - Crear franquicia
- `GET /api/franchises` - Listar franquicias
- `GET /api/franchises/:id` - Obtener franquicia
- `PUT /api/franchises/:id` - Actualizar franquicia
- `DELETE /api/franchises/:id` - Eliminar franquicia

### 📍 **Locations**
Gestión de locales/ubicaciones
- `POST /api/locations` - Crear local
- `GET /api/locations?franchise_id=xxx` - Listar locales de franquicia
- `GET /api/locations/:id` - Obtener local
- `PUT /api/locations/:id` - Actualizar local
- `DELETE /api/locations/:id` - Eliminar local

### 👥 **Employee Assignments**
Asignaciones de empleados a locales
- `POST /api/assignments` - Crear asignación
- `GET /api/assignments?location_id=xxx` - Listar asignaciones
- `GET /api/assignments/:id` - Obtener asignación
- `PUT /api/assignments/:id` - Actualizar asignación
- `DELETE /api/assignments/:id` - Finalizar asignación

### ⏰ **Employee Check-ins**
Sistema de fichaje con GPS
- `POST /api/checkins` - Hacer check-in
- `POST /api/checkins/:id/checkout` - Hacer check-out
- `GET /api/checkins/location/:id/active` - Empleados activos en local
- `GET /api/checkins?user_id=xxx` - Check-ins de usuario
- `GET /api/checkins?location_id=xxx` - Check-ins de local

## 🔄 Variables Automáticas

Las siguientes variables se **rellenan automáticamente** al ejecutar las peticiones:

| Variable | Se guarda en | Uso |
|----------|-------------|-----|
| `auth_token` | Login Admin | Token JWT para autenticación |
| `user_id` | Login Admin | ID del usuario autenticado |
| `organization_id` | Login Admin | ID de la organización |
| `user_role` | Login Admin | Rol del usuario |
| `franchise_id` | Create Franchise | ID de franquicia creada |
| `location_id` | Create Location | ID de local creado |
| `assignment_id` | Create Assignment | ID de asignación creada |
| `checkin_id` | Create Check-in | ID de check-in creado |
| `new_user_id` | Register New User | ID de usuario recién creado |

## 🎯 Flujo de Prueba Recomendado

### **Paso 1: Autenticación**
```
1. Ejecutar: "Login Admin"
   → Esto guarda automáticamente el token y datos del usuario
```

### **Paso 2: Crear Estructura de Franquicia**
```
2. Ejecutar: "Create Franchise"
   → Guarda franchise_id automáticamente

3. Ejecutar: "Create Location"
   → Usa franchise_id guardado
   → Guarda location_id automáticamente
```

### **Paso 3: Gestionar Empleados**
```
4. Ejecutar: "Register New User"
   → Guarda new_user_id automáticamente

5. Ejecutar: "Create Assignment"
   → Usa new_user_id y location_id guardados
   → Guarda assignment_id automáticamente
```

### **Paso 4: Sistema de Fichaje**
```
6. Ejecutar: "Create Check-in"
   → Usa location_id guardado
   → Guarda checkin_id automáticamente

7. Ejecutar: "Get Active Employees at Location"
   → Ver empleados activos en el local

8. Ejecutar: "Create Check-out"
   → Usa checkin_id guardado
```

## 🔧 Personalización

### **Cambiar datos de prueba:**
Puedes editar los body de las peticiones para usar tus propios datos:

**Franquicia:**
```json
{
  "name": "Tu Franquicia",
  "code": "TU-CODIGO",
  "address": "Tu dirección",
  "contact_phone": "+34XXXXXXXXX",
  "contact_email": "email@ejemplo.com"
}
```

**Local (con coordenadas GPS reales):**
```json
{
  "franchise_id": "{{franchise_id}}",
  "name": "Tu Local",
  "address": "Tu dirección",
  "latitude": 40.416775,
  "longitude": -3.703790,
  "max_distance_meters": 100
}
```

### **Obtener coordenadas GPS:**
1. Abre [Google Maps](https://maps.google.com)
2. Click derecho en tu ubicación
3. Copia las coordenadas (ejemplo: `40.416775, -3.703790`)
4. Primera cifra = `latitude`, segunda = `longitude`

## ⚙️ Crear Tests Personalizados

Cada petición puede incluir tests en la pestaña **"Tests"**. Ejemplos:

### **Test básico de status:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});
```

### **Test de estructura de respuesta:**
```javascript
pm.test("Response has required fields", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
    pm.expect(jsonData).to.have.property('name');
});
```

### **Guardar variable desde respuesta:**
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set('mi_variable', jsonData.algun_campo);
    console.log('✅ Variable guardada:', jsonData.algun_campo);
}
```

### **Test de tiempo de respuesta:**
```javascript
pm.test("Response time is less than 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

## 🚨 Notas Importantes

### **Credenciales de Testing:**

#### 👨‍💼 **Admin de Testing (Pre-configurado):**
- **Email:** `testing@gangazon.com`
- **Password:** `Testing123!`
- **Role:** `super_admin`
- **Organization ID:** `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

#### 👤 **Empleado de Testing:**
- **Email:** `employee.test@gangazon.com`
- **Password:** `Employee123!`
- **Role:** `user`
- **User ID:** `e5f6a7b8-c9d0-1234-ef01-23456789abcd`

#### 🏢 **Datos Pre-creados para Testing:**
- **Franchise ID:** `c3d4e5f6-a7b8-9012-cdef-123456789012`
- **Location ID:** `d4e5f6a7-b8c9-0123-def0-123456789abc`
- **Assignment ID:** `f6a7b8c9-d0e1-2345-f012-3456789abcde`
- **GPS Coords:** `40.416775, -3.703790` (Puerta del Sol, Madrid)

### **Token de autenticación:**
- El token expira cada **15 minutos**
- Si obtienes error 401, ejecuta **"Login Admin"** de nuevo
- El token se guarda automáticamente en la variable `auth_token`

### **Coordenadas GPS:**
- Usa coordenadas **reales** de tus ubicaciones
- El sistema valida que estés dentro del radio configurado
- Por defecto: 100 metros de distancia máxima

### **Variables de entorno:**
- Todas las variables se guardan en el **entorno activo**
- Verifica que el entorno **"Production"** esté seleccionado
- Puedes ver las variables en el icono del ojo 👁️ (superior derecha)

## 📊 Monitoreo y Automatización

### **Runner de Colección:**
1. Click en la colección
2. Click en **"Run"**
3. Selecciona las carpetas/peticiones a ejecutar
4. Click **"Run Gangazon Auth Service"**

### **Crear Monitor:**
1. Click en la colección → **"..."** → **"Monitor collection"**
2. Configura frecuencia (ej: cada 6 horas)
3. Selecciona entorno de producción
4. Activa notificaciones por email

## 🎨 Crear Flows Visuales (Postman Flows)

Para crear workflows visuales:

1. Ve a **"Flows"** en la barra lateral de Postman
2. Click **"Create Flow"**
3. Arrastra bloques desde el panel izquierdo:
   - **Send Request** → Selecciona peticiones de la colección
   - **If** → Añade lógica condicional
   - **Log** → Muestra mensajes de debug
4. Conecta bloques arrastrando desde puntos de salida
5. Click **"Run"** para ejecutar el flow

### **Ejemplo de Flow simple:**
```
Start → Login Admin → Create Franchise → Create Location → Log Success
```

## ✅ ¡Todo Listo!

Ahora tienes:
- ✅ Colección completa con todas las peticiones
- ✅ Entorno de producción configurado
- ✅ Variables automáticas que se rellenan solas
- ✅ Scripts de test en peticiones clave
- ✅ Documentación completa de uso

**¡Empieza ejecutando "Login Admin" y explora la API!** 🚀
