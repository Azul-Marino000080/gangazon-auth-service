# Gangazon Authentication Service

Sistema de autenticación centralizada para las aplicaciones corporativas de Gangazon.

## 🚀 Características

- **Autenticación JWT**: Tokens seguros con renovación automática
- **Multi-tenant**: Soporte para múltiples organizaciones  
- **Control de roles**: Sistema granular de permisos (user, admin, super_admin)
- **API RESTful**: Endpoints documentados y fáciles de integrar
- **Seguridad avanzada**: Rate limiting, validación de datos, logging de auditoría
- **Escalable**: Diseñado para crecer con tu organización

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │  Flutter App    │    │   Other Apps    │
│ (gangazon-scan) │    │ (fichajes)      │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │   Auth Service            │
                    │   (Render)                │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │   Supabase                │
                    │  (Database)               │
                    └───────────────────────────┘
```

## 📋 Prerrequisitos

- Node.js 18+
- Cuenta en Supabase
- Cuenta en Render

## 🛠️ Instalación Local

```bash
# Clonar repo
git clone https://github.com/tu-usuario/gangazon-auth-service.git
cd gangazon-auth-service

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Ejecutar en desarrollo
npm run dev
```

## 🚀 Deploy en Render

Consulta la guía completa en [RENDER_DEPLOY.md](./RENDER_DEPLOY.md)

### Resumen rápido:

1. **Subir a GitHub**
2. **Crear Web Service en Render**
3. **Configurar variables de entorno**
4. **Deploy automático**

Tu API estará en: `https://gangazon-auth-service.onrender.com`

## 📚 API Endpoints

### Autenticación
```http
POST /api/auth/register
POST /api/auth/login  
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/change-password
POST /api/auth/verify
```

### Usuarios
```http
GET    /api/users/me
PUT    /api/users/me
GET    /api/users
GET    /api/users/:userId
PUT    /api/users/:userId
DELETE /api/users/:userId
```

### Organizaciones
```http
POST   /api/organizations
GET    /api/organizations
GET    /api/organizations/:organizationId
PUT    /api/organizations/:organizationId
DELETE /api/organizations/:organizationId
GET    /api/organizations/:organizationId/stats
```

### Roles y Permisos
```http
GET  /api/roles
GET  /api/roles/:roleName/permissions
POST /api/roles/check-permission
GET  /api/roles/:roleName/users
```

## 🔐 Integración en Apps Cliente

### React/JavaScript
```javascript
const API_BASE = 'https://gangazon-auth-service.onrender.com/api';

// Login
const response = await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// Requests autenticadas
const response = await fetch(`${API_BASE}/users/me`, {
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### Flutter/Dart
```dart
final response = await http.post(
  Uri.parse('https://gangazon-auth-service.onrender.com/api/auth/login'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'email': email, 'password': password}),
);
```

## 🔑 Roles y Permisos

- **User**: Gestionar perfil propio
- **Admin**: Gestionar usuarios de su organización
- **Super Admin**: Acceso completo al sistema

## 🗄️ Base de Datos

Schema SQL disponible en:
- `database/schema.sql` - Esquema principal
- `database/migrations/001_enhanced_features.sql` - Funcionalidades adicionales

## 🛠️ Scripts Útiles

```bash
# Generar JWT secrets seguros
bash scripts/setup-render-env.sh

# Probar API desplegada
python scripts/test-render-api.py
```

## 📊 Monitoring

Health check disponible en: `/health`

## 🔒 Seguridad

- Rate limiting configurable
- Validación de entrada con Joi
- Headers de seguridad con Helmet
- Tokens JWT con expiración automática
- Logging de auditoría completo
- Row Level Security en base de datos

---

**Desarrollado para Gangazon** 🚀