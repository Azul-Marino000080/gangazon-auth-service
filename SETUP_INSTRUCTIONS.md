# Instrucciones de Setup - Gangazon Auth Service

## 1. Ejecutar el SQL en Supabase

1. Ve a tu dashboard de Supabase: `https://supabase.com/dashboard/project/llbmuvecpzgiiabwzexb`
2. Abre **SQL Editor**
3. Copia todo el contenido de `database/schema_auth_supabase.sql`
4. Pega y ejecuta

Esto creará:
- ✅ Esquema `auth_gangazon` 
- ✅ 8 tablas (users, applications, permissions, franchises, sessions, etc.)
- ✅ 2 aplicaciones: `SCANNER_ADMIN` y `WEB_ADMIN`
- ✅ Todos los permisos para cada aplicación
- ✅ Franquicia matriz `GANGAZON_HQ`

## 2. Configurar la contraseña de base de datos

Edita el archivo `.env` y reemplaza `[PASSWORD]` con tu contraseña de Supabase:

```bash
DATABASE_URL=postgresql://postgres.llbmuvecpzgiiabwzexb:TU_PASSWORD_AQUI@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

La contraseña la encuentras en:
- Supabase Dashboard → Settings → Database → Connection string

## 3. Iniciar el servidor (para probar la conexión)

```powershell
npm start
```

Deberías ver:
```
✅ Conexión a PostgreSQL/Supabase establecida correctamente
📂 Esquema activo: auth_gangazon
✅ Esquema "auth_gangazon" encontrado
🚀 Gangazon Auth Service v2.0 iniciado
📡 Servidor escuchando en puerto 4000
```

## 4. Crear el Super Admin inicial

En otra terminal (con el servidor corriendo):

```powershell
node scripts/setup-super-admin.js
```

Esto creará el usuario `admin@gangazon.com` con acceso total a ambas aplicaciones.

Credenciales por defecto:
- **Email**: admin@gangazon.com
- **Password**: Gangazon2024!Secure

(Puedes cambiarlas en el archivo `.env`)

## 5. Probar el login

```bash
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "email": "admin@gangazon.com",
  "password": "Gangazon2024!Secure",
  "applicationCode": "SCANNER_ADMIN"
}
```

Deberías recibir:
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "...",
    "permissions": ["super_admin", "files.view", ...]
  }
}
```

## 6. Integrar en las aplicaciones

### Scanner Admin (gangazon-scanner2)
- Cambiar el login de Supabase Auth a auth-service
- Guardar el `accessToken` en localStorage
- Incluir el token en las peticiones: `Authorization: Bearer <token>`

### Web Admin (gangazon-web-2)
- Crear nueva página `/admin/login`
- Usar auth-service para autenticación
- Los clientes seguirán usando Supabase Auth (esquema `public`)

---

## Arquitectura final

```
Supabase PostgreSQL
├── public (esquema)
│   ├── web_customers       ← Clientes (Supabase Auth)
│   ├── web_products
│   ├── web_orders
│   └── ...
│
└── auth_gangazon (esquema)
    ├── users               ← Administradores (Auth Service)
    ├── applications        ← SCANNER_ADMIN, WEB_ADMIN
    ├── permissions
    ├── user_app_permissions
    └── ...
```

**Separación total**: Los clientes usan Supabase Auth (public), los admins usan Auth Service (auth_gangazon)
