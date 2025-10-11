#!/bin/bash

# Script para configurar variables de entorno en Render
# Ejecutar después de crear el servicio en Render

echo "🔐 Configurando variables de entorno en Render..."

echo "
⚠️  IMPORTANTE: Ve a tu dashboard de Render y configura estas variables:

🔹 BÁSICAS:
NODE_ENV=production
PORT=10000

🔹 SUPABASE (sustituir por tus valores):
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=tu_service_key_aqui
SUPABASE_ANON_KEY=tu_anon_key_aqui

🔹 JWT SECRETS (generar nuevos):
"

# Generar JWT secrets seguros
echo "🔑 Generando JWT secrets seguros:"
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo "JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

echo "
🔹 CONFIGURACIÓN:
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
LOG_LEVEL=info
DB_SCHEMA=auth_system

🔹 RATE LIMITING:
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

🔹 CORS (sustituir por tus dominios):
ALLOWED_ORIGINS=https://tu-app1.vercel.app,https://tu-app2.vercel.app

✅ Copia estas variables en Render Dashboard → Environment
"