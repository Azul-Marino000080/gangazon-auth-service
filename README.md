# 🔐 Gangazon Auth Service v2.0

Servicio centralizado de autenticación y autorización para el ecosistema de aplicaciones Gangazon.

## 🎯 Características

- ✅ Autenticación centralizada (SSO-like)
- ✅ Gestión multi-aplicación
- ✅ Roles específicos por aplicación
- ✅ Sistema de franquicias
- ✅ Tokens JWT con refresh
- ✅ Redirección automática a apps
- ✅ API RESTful completa

## 📋 Arquitectura

### Entidades principales

1. **Users** - Usuarios del sistema
2. **Applications** - Aplicaciones registradas
3. **Roles** - Roles por aplicación
4. **Franchises** - Franquicias del negocio
5. **User_Application_Roles** - Permisos usuario-app
6. **Sessions** - Control de sesiones

### Flujo de autenticación

```
┌─────────┐      ┌──────────────┐      ┌─────────────┐
│   App   │─────▶│ Auth Service │─────▶│  Supabase   │
│         │◀─────│              │◀─────│             │
└─────────┘      └──────────────┘      └─────────────┘
     │                   │
     │            1. Login request
     │                   │
     │            2. Validate credentials
     │                   │
     │            3. Generate JWT token
     │                   │
     │◀───────────4. Redirect with token
     │
     5. Use token for API calls
```

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Ejecutar migraciones de base de datos
npm run migrate

# Iniciar servidor de desarrollo
npm run dev

# Iniciar servidor de producción
npm start
```

## 🔧 Configuración

### Variables de entorno requeridas

Ver `.env.example` para todas las variables disponibles.

### Base de datos

El proyecto usa Supabase PostgreSQL. Ejecutar el script `database/schema.sql` para crear las tablas necesarias.

## 📚 API Endpoints

### Auth
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Renovar token
- `GET /api/auth/verify` - Verificar token

### Applications
- `POST /api/applications` - Registrar nueva app
- `GET /api/applications` - Listar apps
- `GET /api/applications/:id` - Obtener app
- `PUT /api/applications/:id` - Actualizar app
- `DELETE /api/applications/:id` - Eliminar app

### Roles
- `POST /api/roles` - Crear rol para una app
- `GET /api/roles` - Listar roles
- `GET /api/roles/:id` - Obtener rol
- `PUT /api/roles/:id` - Actualizar rol
- `DELETE /api/roles/:id` - Eliminar rol

### Franchises
- `POST /api/franchises` - Crear franquicia
- `GET /api/franchises` - Listar franquicias
- `GET /api/franchises/:id` - Obtener franquicia
- `PUT /api/franchises/:id` - Actualizar franquicia
- `DELETE /api/franchises/:id` - Eliminar franquicia

### Users
- `POST /api/users` - Crear usuario
- `GET /api/users` - Listar usuarios
- `GET /api/users/:id` - Obtener usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario
- `POST /api/users/:id/assign-role` - Asignar rol en app
- `DELETE /api/users/:id/revoke-role` - Revocar rol en app

## 🔐 Seguridad

- Tokens JWT con expiración
- Rate limiting por IP
- CORS configurado
- Helmet para headers de seguridad
- Bcrypt para contraseñas
- Validación de entrada con Joi

## 📦 Estructura del proyecto

```
gangazon-auth-service/
├── src/
│   ├── server.js              # Punto de entrada
│   ├── config/
│   │   └── database.js        # Configuración Supabase
│   ├── middleware/
│   │   ├── auth.js            # Autenticación JWT
│   │   ├── errorHandler.js   # Manejo de errores
│   │   └── validation.js      # Validación de datos
│   ├── routes/
│   │   ├── auth.js            # Rutas de autenticación
│   │   ├── applications.js    # Rutas de aplicaciones
│   │   ├── roles.js           # Rutas de roles
│   │   ├── franchises.js      # Rutas de franquicias
│   │   └── users.js           # Rutas de usuarios
│   ├── utils/
│   │   ├── jwt.js             # Utilidades JWT
│   │   ├── logger.js          # Logger Winston
│   │   └── validators.js      # Esquemas Joi
│   └── constants/
│       └── index.js           # Constantes del sistema
├── database/
│   └── schema.sql             # Schema de base de datos
├── .env.example               # Ejemplo de variables
├── .gitignore
├── package.json
└── README.md
```

## 🧪 Testing

```bash
# Ejecutar tests
npm test
```

## 📝 Licencia

ISC

## 🤝 Contribución

Este es un proyecto interno de Gangazon.
