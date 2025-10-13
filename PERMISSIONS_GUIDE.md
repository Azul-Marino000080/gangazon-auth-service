# 📘 Guía de Gestión de Permisos

## 🎯 Conceptos

### 1. **Applications (Aplicaciones)**
Son las diferentes apps que usan el servicio de autenticación:
- App de Fichajes
- App de Productos
- App de Informes
- etc.

### 2. **Permissions (Permisos)**
Son acciones específicas que un usuario puede hacer en cada app:
- `fichajes.create` - Crear fichajes
- `fichajes.view` - Ver fichajes
- `informes.view` - Ver informes
- `informes.generate` - Generar informes
- `productos.edit` - Editar productos
- `devoluciones.create` - Crear devoluciones

### 3. **Users (Usuarios)**
Personas que usan las aplicaciones.

### 4. **Franchises (Franquicias)**
Cada usuario pertenece a una franquicia.

---

## 🔧 Flujo Completo de Configuración

### **PASO 1: Registrar una Aplicación**

```http
POST /api/applications
Content-Type: application/json

{
  "name": "App de Fichajes",
  "code": "FICHAJES",
  "description": "Aplicación para registrar entradas y salidas de empleados",
  "redirectUrl": "https://fichajes.gangazon.com/auth/callback",
  "allowedOrigins": ["https://fichajes.gangazon.com"]
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "application": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "App de Fichajes",
      "code": "FICHAJES",
      "apiKey": "ganz_1697123456_abc123xyz"
    }
  }
}
```

✅ **Guarda el `id` y `apiKey`** - Los necesitarás después

---

### **PASO 2: Crear Permisos para esa Aplicación**

Ahora defines qué acciones pueden hacer los usuarios en esa app:

```http
POST /api/permissions
Content-Type: application/json

{
  "applicationId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "fichajes.create",
  "displayName": "Crear fichajes",
  "description": "Permite registrar entradas y salidas",
  "category": "fichajes"
}
```

```http
POST /api/permissions
Content-Type: application/json

{
  "applicationId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "fichajes.view",
  "displayName": "Ver fichajes",
  "description": "Permite consultar sus propios fichajes",
  "category": "fichajes"
}
```

```http
POST /api/permissions
Content-Type: application/json

{
  "applicationId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "informes.view",
  "displayName": "Ver informes",
  "description": "Permite ver informes de fichajes",
  "category": "informes"
}
```

```http
POST /api/permissions
Content-Type: application/json

{
  "applicationId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "informes.generate",
  "displayName": "Generar informes",
  "description": "Permite crear y exportar informes",
  "category": "informes"
}
```

**Cada petición devuelve:**
```json
{
  "success": true,
  "data": {
    "permission": {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "code": "fichajes.create",
      "displayName": "Crear fichajes"
    }
  }
}
```

✅ **Guarda los IDs de los permisos**

---

### **PASO 3: Crear Usuarios**

```http
POST /api/users
Content-Type: application/json

{
  "email": "empleado@franquicia1.com",
  "password": "SecurePass123!",
  "firstName": "Juan",
  "lastName": "Pérez",
  "franchiseId": "770e8400-e29b-41d4-a716-446655440000"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "email": "empleado@franquicia1.com",
      "firstName": "Juan",
      "lastName": "Pérez"
    }
  }
}
```

---

### **PASO 4: Asignar Permisos a Usuarios**

Ahora decides qué puede hacer cada usuario en cada app:

```http
POST /api/users/880e8400-e29b-41d4-a716-446655440000/assign-permission
Content-Type: application/json

{
  "applicationId": "550e8400-e29b-41d4-a716-446655440000",
  "permissionId": "650e8400-e29b-41d4-a716-446655440001"
}
```

Puedes asignar múltiples permisos al mismo usuario:

```http
POST /api/users/880e8400-e29b-41d4-a716-446655440000/assign-permission
Content-Type: application/json

{
  "applicationId": "550e8400-e29b-41d4-a716-446655440000",
  "permissionId": "650e8400-e29b-41d4-a716-446655440002"
}
```

---

### **PASO 5: Login del Usuario**

Cuando el usuario hace login desde cualquier app:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "empleado@franquicia1.com",
  "password": "SecurePass123!",
  "applicationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "email": "empleado@franquicia1.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "franchiseId": "770e8400-e29b-41d4-a716-446655440000"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    },
    "permissions": [
      "fichajes.create",
      "fichajes.view"
    ],
    "redirectUrl": "https://fichajes.gangazon.com/auth/callback"
  }
}
```

---

## 🔐 Uso en las Aplicaciones

### En tu App Frontend:

```javascript
// 1. Redirigir al login del auth-service
window.location.href = `https://auth.gangazon.com/login?app=FICHAJES&redirect=${encodeURIComponent(window.location.href)}`;

// 2. Recibir el callback con el token
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// 3. Guardar token y decodificarlo
localStorage.setItem('accessToken', token);
const payload = JSON.parse(atob(token.split('.')[1]));

// 4. Verificar permisos antes de mostrar funcionalidades
if (payload.permissions.includes('fichajes.create')) {
  // Mostrar botón "Nuevo Fichaje"
}

if (payload.permissions.includes('informes.view')) {
  // Mostrar sección "Informes"
}
```

### En tu App Backend:

```javascript
// Verificar que el usuario tiene permiso para una acción
app.post('/api/fichajes', authenticateToken, (req, res) => {
  // El middleware authenticateToken valida el token
  // y añade req.user con la info del JWT
  
  if (!req.user.permissions.includes('fichajes.create')) {
    return res.status(403).json({
      error: 'No tienes permiso para crear fichajes'
    });
  }
  
  // Crear fichaje...
});
```

---

## 📊 Ejemplos de Permisos por Tipo de Usuario

### **Empleado Normal:**
- `fichajes.create` - Puede fichar entrada/salida
- `fichajes.view` - Puede ver sus propios fichajes

### **Manager de Tienda:**
- `fichajes.create`
- `fichajes.view`
- `fichajes.view_all` - Puede ver fichajes de su tienda
- `informes.view` - Puede ver informes

### **Administrador de Franquicia:**
- `fichajes.*` - Todos los permisos de fichajes
- `informes.*` - Todos los permisos de informes
- `usuarios.create` - Puede crear usuarios
- `usuarios.edit` - Puede editar usuarios

### **Super Admin:**
- `*` - Todos los permisos de todas las apps

---

## 🔄 Gestión de Permisos

### Ver permisos de un usuario:

```http
GET /api/users/880e8400-e29b-41d4-a716-446655440000/permissions?applicationId=550e8400-e29b-41d4-a716-446655440000
```

### Revocar un permiso:

```http
DELETE /api/users/880e8400-e29b-41d4-a716-446655440000/revoke-permission
Content-Type: application/json

{
  "applicationId": "550e8400-e29b-41d4-a716-446655440000",
  "permissionId": "650e8400-e29b-41d4-a716-446655440001"
}
```

### Listar todos los permisos de una app:

```http
GET /api/permissions?applicationId=550e8400-e29b-41d4-a716-446655440000
```

---

## 💡 Buenas Prácticas

### 1. **Usa códigos descriptivos:**
```
✅ fichajes.create
✅ productos.edit
✅ devoluciones.approve
❌ perm1
❌ action_2
```

### 2. **Agrupa por categorías:**
```
fichajes.*
├── fichajes.create
├── fichajes.view
├── fichajes.edit
└── fichajes.delete

informes.*
├── informes.view
├── informes.generate
└── informes.export
```

### 3. **Usa permisos granulares:**
```
✅ informes.view (solo ver)
✅ informes.generate (crear nuevos)
✅ informes.export (descargar)

❌ informes.all (demasiado amplio)
```

### 4. **Incluye permisos de administración:**
```
usuarios.create
usuarios.edit
usuarios.delete
usuarios.assign_permissions
```

---

## 🎯 Resumen del Flujo

```
1. Creas una APP → Obtienes ID
2. Creas PERMISOS para esa app → Obtienes IDs
3. Creas USUARIOS → Obtienes IDs
4. Asignas PERMISOS a USUARIOS para cada APP
5. Usuario hace LOGIN → Recibe token con sus permisos
6. App valida permisos del token antes de cada acción
```

---

## ❓ Preguntas Frecuentes

**Q: ¿Puedo asignar el mismo permiso varias veces a un usuario?**  
A: No, hay una restricción UNIQUE que lo impide.

**Q: ¿Los permisos expiran?**  
A: Puedes establecer `expiresAt` al asignar un permiso.

**Q: ¿Puedo cambiar los permisos sin que el usuario haga logout?**  
A: Los cambios se aplican en el siguiente login. Para forzar actualización, revoca su refresh token.

**Q: ¿Cómo sé qué permisos necesita mi app?**  
A: Analiza las funcionalidades de tu app y crea un permiso por cada acción que requiera autorización.
