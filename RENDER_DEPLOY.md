# Gangazon Auth Service - Render Deployment Guide

## 🚀 Deploy en Render (Paso a Paso)

### Opción 1: Deploy desde GitHub (Recomendado)

#### Paso 1: Preparar el Repositorio
```bash
# Crear repo en GitHub si no lo tienes
git init
git add .
git commit -m "Initial auth service setup"
git remote add origin https://github.com/tu-usuario/gangazon-auth-service.git
git push -u origin main
```

#### Paso 2: Conectar con Render
1. Ve a [render.com](https://render.com)
2. Sign up/Login con GitHub
3. Click "New" → "Web Service"
4. Conecta tu repositorio `gangazon-auth-service`
5. Configurar:

**Build Settings:**
```
Name: gangazon-auth-service
Runtime: Node
Build Command: npm install
Start Command: npm start
```

**Plan:**
- Free tier: $0/mes (limitado pero perfecto para pruebas)
- Starter: $7/mes (recomendado para producción)

#### Paso 3: Variables de Entorno
En Render Dashboard → tu servicio → Environment:

```bash
# Básicas
NODE_ENV=production
PORT=10000

# Supabase (sustituir por tus valores reales)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secrets (generar claves seguras)
JWT_SECRET=tu_clave_super_secreta_de_32_caracteres_minimo
JWT_REFRESH_SECRET=otra_clave_diferente_para_refresh_tokens

# Configuración
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
LOG_LEVEL=info
DB_SCHEMA=auth_system

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS (sustituir por tus dominios)
ALLOWED_ORIGINS=https://tu-scanner-app.vercel.app,https://tu-admin-app.vercel.app
```

#### Paso 4: Deploy
- Render hará el deploy automáticamente
- URL estará disponible en: `https://gangazon-auth-service.onrender.com`

---

### Opción 2: Deploy Manual (Blueprint)

#### Usando render.yaml
1. El archivo `render.yaml` ya está configurado
2. En Render: "New" → "Blueprint"
3. Conectar repo y usar el blueprint

---

## 🔧 Configuración Específica para Render

### package.json - Scripts optimizados:
```json
{
  "scripts": {
    "start": "node src/server.js",
    "build": "npm install --production",
    "dev": "nodemon src/server.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Health Check:
Render usará automáticamente `/health` endpoint que ya tienes configurado.

---

## 🌍 Custom Domain (Opcional)

### Configurar tu dominio:
1. En Render Dashboard → Settings → Custom Domains
2. Agregar: `auth.tudominio.com`
3. Configurar DNS:
   ```
   Type: CNAME
   Name: auth
   Value: gangazon-auth-service.onrender.com
   ```

---

## 💰 Costos en Render

### Free Tier:
- ✅ Perfecto para desarrollo/testing
- ❌ Se "duerme" después de 15 min sin uso
- ❌ 750 horas/mes (suficiente para pruebas)

### Starter ($7/mes):
- ✅ Siempre activo (sin sleep)
- ✅ SSL automático
- ✅ Custom domains
- ✅ Perfecto para producción pequeña-mediana

### Pro ($25/mes):
- ✅ Más CPU/RAM
- ✅ Para alta demanda

---

## 🚀 Pasos Inmediatos

### 1. Crear cuenta en Render:
[render.com/register](https://render.com/register)

### 2. Subir código a GitHub:
```bash
# Si no tienes repo
git init
git add .
git commit -m "Auth service for Render"
git branch -M main
git remote add origin https://github.com/tu-usuario/gangazon-auth-service.git
git push -u origin main
```

### 3. Deploy en Render:
- New Web Service
- Connect GitHub repo
- Configure environment variables
- Deploy!

### 4. Actualizar tus apps:
```javascript
// En tus apps React/Flutter
const API_BASE = 'https://gangazon-auth-service.onrender.com/api';
```

---

## 🔍 Monitoreo en Render

### Logs en tiempo real:
- Dashboard → tu servicio → Logs
- Logs automáticos de errores y requests

### Métricas:
- CPU/Memory usage
- Response times
- Error rates

---

## 🔒 Seguridad en Producción

### Variables de entorno seguras:
```bash
# Generar JWT secrets seguros
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### CORS configurado:
```bash
# Solo tus dominios de producción
ALLOWED_ORIGINS=https://scanner.tudominio.com,https://admin.tudominio.com
```

---

## 🆘 Troubleshooting

### Error común: Puerto
Render usa puerto dinámico, asegúrate que tu server.js use:
```javascript
const PORT = process.env.PORT || 3001;
```

### Error: Build falla
Verificar que `package.json` tenga engines:
```json
"engines": {
  "node": ">=18.0.0"
}
```

### Error: Health check
Verificar que `/health` endpoint responda:
```bash
curl https://tu-servicio.onrender.com/health
```

---

## ✅ Checklist de Deploy

- [ ] Código en GitHub
- [ ] Cuenta en Render creada
- [ ] Servicio web configurado
- [ ] Variables de entorno añadidas
- [ ] Deploy exitoso
- [ ] Health check funcionando
- [ ] URLs actualizadas en apps cliente
- [ ] Custom domain configurado (opcional)

Tu API estará en: `https://gangazon-auth-service.onrender.com`