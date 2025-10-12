# Guía de Despliegue en Render

## Pasos para desplegar el sistema de autenticación de franquicias

### 1. Configurar la Base de Datos en Supabase

1. **Ir a tu proyecto de Supabase**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Ejecutar el esquema completo**
   - Ve a `SQL Editor` en el panel lateral
   - Copia todo el contenido del archivo `database/complete_schema.sql`
   - Pégalo en el editor y ejecuta el script
   - Verifica que se crearon todas las tablas en el schema `auth_system`

3. **Obtener las credenciales**
   - Ve a `Settings` > `API`
   - Copia:
     - Project URL
     - `anon` public key
     - `service_role` secret key

### 2. Desplegar en Render

1. **Crear nuevo Web Service**
   - Ve a: https://render.com/dashboard
   - Click en "New +" > "Web Service"
   - Conecta tu repositorio de GitHub: `https://github.com/Azul-Marino000080/gangazon-auth-service`

2. **Configurar el servicio**
   ```
   Name: gangazon-auth-service
   Region: Frankfurt (EU Central)
   Branch: main
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

3. **Variables de entorno**
   En la sección "Environment Variables", agrega:

   ```
   SUPABASE_URL=tu-url-de-supabase
   SUPABASE_ANON_KEY=tu-anon-key
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   JWT_SECRET=ab993282457691479582aa268d21f5c1083ee68532b0d87521857540801ef7bb
   JWT_REFRESH_SECRET=91b3fd434d35f027799be2e7d1f76787b747e0e5c3bb7e633e82586532d49f70
   NODE_ENV=production
   PORT=10000
   CORS_ORIGINS=https://tu-dominio.com,https://gangazon-scanner.vercel.app
   LOG_LEVEL=info
   ```

4. **Desplegar**
   - Click en "Create Web Service"
   - Espera que el build termine (5-10 minutos)

### 3. Verificar el Despliegue

1. **Probar la API**
   Una vez desplegado, tu API estará disponible en:
   ```
   https://gangazon-auth-service.onrender.com
   ```

2. **Endpoints principales**
   ```
   GET  /health              - Estado del servicio
   POST /api/auth/register   - Registrar usuario
   POST /api/auth/login      - Login
   GET  /api/franchises      - Listar franquicias
   GET  /api/locations       - Listar locales
   ```

3. **Crear primer usuario franchisor**
   ```bash
   curl -X POST https://gangazon-auth-service.onrender.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "franchisor@tuempresa.com",
       "password": "TuPassword123!",
       "firstName": "Tu",
       "lastName": "Nombre",
       "role": "franchisor_admin"
     }'
   ```

### 4. Configurar Aplicaciones Cliente

Para conectar tus aplicaciones frontend (React, Flutter, etc.):

1. **URL del servicio**: `https://gangazon-auth-service.onrender.com`
2. **Headers requeridos**:
   ```
   Content-Type: application/json
   Authorization: Bearer <token-jwt>
   ```

### 5. Roles del Sistema

El sistema soporta estos roles jerárquicos:

- **super_admin**: Control total del sistema
- **franchisor_admin**: Gestión de franquicias de la organización
- **franchisee_admin**: Gestión de locales de su franquicia
- **location_manager**: Gestión de empleados de su local
- **user**: Empleado básico (check-in/check-out)

### 6. Funcionalidades Principales

✅ **Autenticación JWT** con refresh tokens
✅ **Gestión de franquicias** multinivel
✅ **Control de locales** por franquicia
✅ **Personal rotativo** entre locales
✅ **Check-in/check-out** con GPS
✅ **Roles jerárquicos** de permisos
✅ **Auditoría completa** de acciones
✅ **Rate limiting** y seguridad

### 7. Monitoreo

- **Logs**: Ver en Render Dashboard > Logs
- **Métricas**: Render proporciona CPU, memoria y request metrics
- **Health check**: `GET /health` retorna estado del sistema

### 8. Mantenimiento

- **Backup BD**: Supabase hace backups automáticos
- **Actualizaciones**: Push al repo main despliega automáticamente
- **Escalado**: Render puede escalar automáticamente según demanda

## ¡Listo para producción! 🚀

El sistema está diseñado para manejar:
- ✅ Múltiples franquicias por organización
- ✅ Empleados rotativos entre locales
- ✅ Control de presencia con GPS
- ✅ Roles y permisos granulares
- ✅ Escalabilidad para crecimiento