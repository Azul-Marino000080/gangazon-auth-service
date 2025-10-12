# Endpoint de Emergencia para Crear Administradores

## 🚨 Descripción

Endpoint especial para crear usuarios administradores en situaciones de emergencia cuando:
- No existen usuarios administradores en el sistema
- El cliente perdió sus credenciales
- Se necesita acceso urgente al sistema

## ⚙️ Configuración

### 1. Variables de Entorno

Agregar en tu archivo `.env`:

```bash
# Habilitar endpoint de emergencia (desactivado por defecto)
ENABLE_EMERGENCY_ENDPOINT=false

# Token secreto para autenticación
EMERGENCY_ADMIN_TOKEN=tu_token_super_secreto_aqui
```

### 2. Generar Token Secreto

**Opción A - Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Opción B - PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Opción C - Online:**
https://www.uuidgenerator.net/guid

### 3. Configurar `.env`

```bash
ENABLE_EMERGENCY_ENDPOINT=true
EMERGENCY_ADMIN_TOKEN=8f7a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
```

---

## 🔐 Seguridad

### Niveles de Protección:

1. **Variable de entorno:** Endpoint deshabilitado por defecto (`ENABLE_EMERGENCY_ENDPOINT=false`)
2. **Token secreto:** Requiere header `x-emergency-token` con el token correcto
3. **Logging:** Todos los intentos se registran con IP y user-agent
4. **Validaciones:** Email válido, contraseña fuerte, roles limitados

### ⚠️ IMPORTANTE:

- ❌ **NUNCA** habilitar en producción permanentemente
- ❌ **NUNCA** compartir el token de emergencia
- ❌ **NUNCA** commitear el token en el repositorio
- ✅ Habilitar solo cuando sea necesario
- ✅ Desactivar inmediatamente después de usarlo
- ✅ Rotar el token después de cada uso

---

## 📡 Uso del Endpoint

### 1. Verificar Estado

**Request:**
```bash
GET http://localhost:3001/api/emergency/status
```

**Response:**
```json
{
  "enabled": true,
  "tokenConfigured": true,
  "message": "Endpoint de emergencia HABILITADO - Desactive en producción"
}
```

### 2. Crear Usuario Administrador

**Request:**
```bash
POST http://localhost:3001/api/emergency/create-admin
Content-Type: application/json
x-emergency-token: 8f7a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0

{
  "email": "admin@empresa.com",
  "password": "SuperSecure123!",
  "firstName": "Admin",
  "lastName": "Principal",
  "role": "super_admin"
}
```

**Response Exitosa:**
```json
{
  "message": "Usuario administrador creado exitosamente",
  "user": {
    "id": "uuid-del-usuario",
    "email": "admin@empresa.com",
    "firstName": "Admin",
    "lastName": "Principal",
    "role": "super_admin",
    "organizationId": "uuid-organizacion"
  },
  "warning": "IMPORTANTE: Desactive este endpoint cambiando ENABLE_EMERGENCY_ENDPOINT=false en producción"
}
```

---

## 📝 Parámetros del Endpoint

### Body Parameters:

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | ✅ Sí | Email del administrador (debe ser válido) |
| `password` | string | ✅ Sí | Contraseña fuerte (min 8 caracteres, mayúscula, minúscula, número, especial) |
| `firstName` | string | ✅ Sí | Nombre del administrador |
| `lastName` | string | ✅ Sí | Apellido del administrador |
| `role` | string | ❌ No | Rol del usuario (default: `admin`) |
| `organizationId` | string | ❌ No | UUID de organización existente |

### Roles Permitidos:

- `admin` - Administrador de organización
- `super_admin` - Super administrador del sistema
- `franchisor_admin` - Administrador de casa matriz

---

## 🧪 Ejemplos de Uso

### Ejemplo 1: Crear Super Admin

```bash
curl -X POST http://localhost:3001/api/emergency/create-admin \
  -H "Content-Type: application/json" \
  -H "x-emergency-token: TU_TOKEN_AQUI" \
  -d '{
    "email": "superadmin@gangazon.com",
    "password": "MegaSecure2024!",
    "firstName": "Super",
    "lastName": "Admin",
    "role": "super_admin"
  }'
```

### Ejemplo 2: Crear Admin de Organización

```bash
curl -X POST http://localhost:3001/api/emergency/create-admin \
  -H "Content-Type: application/json" \
  -H "x-emergency-token: TU_TOKEN_AQUI" \
  -d '{
    "email": "admin@franquicia.com",
    "password": "SecurePass123!",
    "firstName": "Admin",
    "lastName": "Franquicia",
    "role": "admin",
    "organizationId": "uuid-de-organizacion"
  }'
```

### Ejemplo 3: Con PowerShell

```powershell
$headers = @{
    "Content-Type" = "application/json"
    "x-emergency-token" = "TU_TOKEN_AQUI"
}

$body = @{
    email = "admin@empresa.com"
    password = "Strong123!Pass"
    firstName = "Admin"
    lastName = "Sistema"
    role = "super_admin"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/emergency/create-admin" `
  -Method Post `
  -Headers $headers `
  -Body $body
```

---

## 🛠️ Casos de Uso

### Escenario 1: Cliente Perdió Credenciales

1. Cliente solicita acceso de emergencia
2. Verificar identidad del cliente por canales seguros
3. Habilitar endpoint: `ENABLE_EMERGENCY_ENDPOINT=true`
4. Reiniciar servidor
5. Crear nuevo admin con el endpoint
6. Deshabilitar endpoint: `ENABLE_EMERGENCY_ENDPOINT=false`
7. Reiniciar servidor
8. Cliente cambia contraseña

### Escenario 2: Sistema Nuevo sin Usuarios

1. Instalar y configurar aplicación
2. Habilitar endpoint temporalmente
3. Crear primer usuario super_admin
4. Deshabilitar endpoint
5. Continuar creando usuarios por panel de admin

### Escenario 3: Reactivar Usuario Inactivo

Si el email ya existe pero el usuario está inactivo, el endpoint:
- Reactiva automáticamente el usuario
- Actualiza la contraseña
- Actualiza el rol si se especifica
- Marca como verificado

---

## 🚦 Estados y Errores

### Errores Comunes:

**403 - Endpoint Deshabilitado:**
```json
{
  "error": "Endpoint deshabilitado",
  "message": "El endpoint de emergencia está deshabilitado. Configure ENABLE_EMERGENCY_ENDPOINT=true para habilitarlo."
}
```

**401 - Token Inválido:**
```json
{
  "error": "Token inválido",
  "message": "Token de emergencia inválido o no proporcionado"
}
```

**400 - Contraseña Débil:**
```json
{
  "error": "Contraseña débil",
  "message": "La contraseña debe tener al menos 8 caracteres, incluir mayúscula, minúscula, número y carácter especial"
}
```

**409 - Usuario Ya Existe:**
```json
{
  "error": "Usuario ya existe",
  "message": "Ya existe un usuario activo con este email"
}
```

---

## 📋 Checklist de Seguridad

Antes de habilitar en producción:

- [ ] ¿Es realmente necesario?
- [ ] ¿Se ha verificado la identidad del solicitante?
- [ ] ¿El token es lo suficientemente fuerte?
- [ ] ¿El token no ha sido compartido previamente?
- [ ] ¿Está el endpoint protegido por firewall/VPN?
- [ ] ¿Se ha notificado al equipo de seguridad?

Después de usar:

- [ ] ¿Se deshabilitó el endpoint?
- [ ] ¿Se reinició el servidor?
- [ ] ¿Se rotó el token?
- [ ] ¿Se documentó el uso en logs de auditoría?
- [ ] ¿El cliente cambió la contraseña temporal?

---

## 📊 Logs de Auditoría

Todos los usos del endpoint se registran:

```
WARN: Usuario de emergencia creado: admin@empresa.com con rol super_admin desde IP: 192.168.1.100
WARN: Intento de acceso con token de emergencia inválido { ip: '10.0.0.5', userAgent: 'curl/7.68.0' }
WARN: Intento de acceso al endpoint de emergencia deshabilitado
```

---

## 🔄 Proceso Completo Paso a Paso

### En Desarrollo:

```bash
# 1. Generar token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Agregar a .env
echo "ENABLE_EMERGENCY_ENDPOINT=true" >> .env
echo "EMERGENCY_ADMIN_TOKEN=tu_token_generado" >> .env

# 3. Reiniciar servidor
npm run dev

# 4. Crear admin
curl -X POST http://localhost:3001/api/emergency/create-admin \
  -H "Content-Type: application/json" \
  -H "x-emergency-token: tu_token_generado" \
  -d '{"email":"admin@test.com","password":"Test123!","firstName":"Admin","lastName":"Test","role":"super_admin"}'

# 5. Desactivar
# Cambiar en .env: ENABLE_EMERGENCY_ENDPOINT=false
npm run dev
```

### En Producción:

```bash
# 1. SSH al servidor
ssh user@production-server

# 2. Editar variables de entorno
nano /path/to/.env
# Cambiar: ENABLE_EMERGENCY_ENDPOINT=true
# Verificar: EMERGENCY_ADMIN_TOKEN=xxxxx

# 3. Reiniciar servicio
pm2 restart gangazon-auth

# 4. Crear admin (desde máquina segura)
curl -X POST https://api.tudominio.com/api/emergency/create-admin \
  -H "Content-Type: application/json" \
  -H "x-emergency-token: xxxxx" \
  -d '{"email":"admin@cliente.com","password":"Temporal123!","firstName":"Admin","lastName":"Cliente","role":"admin"}'

# 5. INMEDIATAMENTE desactivar
nano /path/to/.env
# Cambiar: ENABLE_EMERGENCY_ENDPOINT=false

# 6. Reiniciar servicio
pm2 restart gangazon-auth

# 7. Verificar que está desactivado
curl https://api.tudominio.com/api/emergency/status
```

---

## 📞 Soporte

Si tienes problemas con el endpoint de emergencia:

1. Verificar logs del servidor
2. Comprobar configuración de variables de entorno
3. Validar que el token es correcto
4. Revisar que el endpoint está habilitado
5. Contactar al equipo de desarrollo

---

## 📄 Archivos Relacionados

- `src/routes/emergency.js` - Implementación del endpoint
- `src/server.js` - Registro de rutas
- `.env.example` - Ejemplo de configuración
- `EMERGENCY_ENDPOINT.md` - Esta documentación
