# 🚀 Guía Rápida de Despliegue en Render

## Pasos para desplegar el Auth Service

### 1. Crear Web Service en Render

1. Ve a **https://render.com/dashboard**
2. Click **"New +"** → **"Web Service"**
3. Conecta el repositorio: `Azul-Marino000080/gangazon-auth-service`

### 2. Configuración del Servicio

```
Name: gangazon-auth-service
Region: Frankfurt (EU Central)
Branch: main
Runtime: Node
Build Command: npm install
Start Command: npm start
```

### 3. Variables de Entorno

**Copia estas variables del archivo `render-env-vars.txt`:**

#### 📋 Variables OBLIGATORIAS (actualizar con tus valores):

```bash
# SUPABASE (⚠️ Cambiar por tus valores reales)
SUPABASE_URL=https://tu-proyecto-id.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-real
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-real

# DATABASE
DB_SCHEMA=public

# JWT (ya generados - usar tal como están)
JWT_SECRET=ab993282457691479582aa268d21f5c1083ee68532b0d87521857540801ef7bb
JWT_REFRESH_SECRET=91b3fd434d35f027799be2e7d1f76787b747e0e5c3bb7e633e82586532d49f70

# SERVER
NODE_ENV=production
PORT=10000

# CORS (⚠️ Cambiar por tus dominios reales)
CORS_ORIGINS=https://tu-frontend.com,https://localhost:3000
```

### 4. Obtener Credenciales de Supabase

1. Ve a tu proyecto en **https://supabase.com/dashboard**
2. **Settings** → **API**
3. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY` 
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### 5. Desplegar

1. Pega todas las variables en Render
2. Click **"Create Web Service"**
3. Espera 5-10 minutos para el build

### 6. Verificar Despliegue

Una vez desplegado, tu API estará en:
```
https://gangazon-auth-service.onrender.com
```

**Endpoints de prueba:**
- `GET /health` - Estado del servicio
- `POST /api/auth/login` - Login con admin@gangazon.com / Admin123!

### 7. Probar la API

```bash
# Health check
curl https://gangazon-auth-service.onrender.com/health

# Login admin
curl -X POST https://gangazon-auth-service.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gangazon.com","password":"Admin123!"}'
```

## ✅ ¡Sistema listo para producción!

**Funcionalidades disponibles:**
- ✅ Autenticación JWT completa
- ✅ Sistema de franquicias multinivel
- ✅ Gestión de locales y empleados
- ✅ Check-in/check-out con GPS
- ✅ Roles jerárquicos
- ✅ Auditoría completa
- ✅ Rate limiting y seguridad

**Siguiente paso:** Configurar tus aplicaciones frontend para usar:
`https://gangazon-auth-service.onrender.com`