# Guía de Integración - Gangazon Auth Service

## Resumen

Este servicio centraliza la autenticación de **administradores** para las aplicaciones:
- **Scanner Admin** (gangazon-scanner2)
- **Web Admin** (gangazon-web-2)

Los **clientes** siguen usando **Supabase Auth** (esquema `public`).

---

## 1. Instalación en las aplicaciones

### Paso 1: Copiar el servicio de autenticación

Copia `examples/AuthService.js` a tu proyecto:

```
src/services/AuthService.js
```

Actualiza la constante `APPLICATION_CODE`:
- Para **Scanner Admin**: `'SCANNER_ADMIN'`
- Para **Web Admin**: `'WEB_ADMIN'`

### Paso 2: Agregar variable de entorno

Añade en tu `.env`:

```bash
REACT_APP_AUTH_SERVICE_URL=http://localhost:4000/api
```

En producción:
```bash
REACT_APP_AUTH_SERVICE_URL=https://auth.gangazon.com/api
```

---

## 2. Crear página de login admin

### Opción A: Usar el ejemplo completo

Copia los archivos de ejemplo:
- `examples/AdminLogin.jsx` → `src/pages/AdminLogin.jsx`
- `examples/AdminLogin.css` → `src/pages/AdminLogin.css`

### Opción B: Adaptar tu login existente

Reemplaza la lógica de Supabase Auth por AuthService:

```javascript
// ANTES (Supabase)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

// AHORA (Auth Service)
const result = await AuthService.login(email, password);
// result contiene: { user, accessToken, refreshToken, permissions }
```

---

## 3. Proteger rutas de administrador

### Paso 1: Copiar el componente de protección

Copia `examples/ProtectedAdminRoute.jsx` a:
```
src/components/ProtectedAdminRoute.jsx
```

### Paso 2: Configurar rutas en App.jsx

```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública de login */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Rutas protegidas sin permiso específico */}
        <Route path="/admin/dashboard" element={
          <ProtectedAdminRoute>
            <AdminDashboard />
          </ProtectedAdminRoute>
        } />
        
        {/* Rutas con permiso específico requerido */}
        <Route path="/admin/users" element={
          <ProtectedAdminRoute requiredPermission="users.view">
            <UserManagement />
          </ProtectedAdminRoute>
        } />
        
        <Route path="/admin/products" element={
          <ProtectedAdminRoute requiredPermission="products.edit">
            <ProductEditor />
          </ProtectedAdminRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 4. Hacer peticiones autenticadas

### Método 1: Usar AuthService.authenticatedFetch()

```javascript
// Esta función maneja automáticamente:
// - Agregar el token de autenticación
// - Refrescar el token si expira (401)
// - Redirigir a login si el refresh falla

const fetchProducts = async () => {
  try {
    const response = await AuthService.authenticatedFetch(
      'http://localhost:4242/api/products'
    );
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching products:', error);
  }
};
```

### Método 2: Usar el token manualmente

```javascript
const token = AuthService.getAccessToken();

const response = await fetch('http://localhost:4242/api/products', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## 5. Verificar permisos en componentes

```javascript
import AuthService from '../services/AuthService';

function ProductEditor() {
  const canEdit = AuthService.hasPermission('products.edit');
  const canDelete = AuthService.hasPermission('products.delete');
  const isSuperAdmin = AuthService.hasPermission('super_admin');
  
  return (
    <div>
      <h1>Editor de Productos</h1>
      
      {canEdit && (
        <button onClick={handleSave}>Guardar cambios</button>
      )}
      
      {canDelete && (
        <button onClick={handleDelete}>Eliminar producto</button>
      )}
      
      {isSuperAdmin && (
        <button onClick={handleDangerousAction}>Acción peligrosa</button>
      )}
    </div>
  );
}
```

---

## 6. Obtener información del usuario

```javascript
import AuthService from '../services/AuthService';

function UserProfile() {
  const user = AuthService.getCurrentUser();
  const permissions = AuthService.getPermissions();
  
  return (
    <div>
      <h2>Bienvenido, {user.firstName} {user.lastName}</h2>
      <p>Email: {user.email}</p>
      
      <h3>Tus permisos:</h3>
      <ul>
        {permissions.map(perm => (
          <li key={perm}>{perm}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 7. Logout

```javascript
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/AuthService';

function LogoutButton() {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await AuthService.logout();
    navigate('/admin/login');
  };
  
  return <button onClick={handleLogout}>Cerrar Sesión</button>;
}
```

---

## 8. Permisos disponibles

### Scanner Admin (SCANNER_ADMIN)

| Permiso | Descripción |
|---------|-------------|
| `super_admin` | Acceso total al sistema |
| `files.view` | Ver archivos subidos |
| `files.upload` | Subir nuevos archivos |
| `files.delete` | Eliminar archivos |
| `products.view` | Ver productos escaneados |
| `products.edit` | Editar productos |
| `products.delete` | Eliminar productos |
| `pricing.view` | Ver configuración de precios |
| `pricing.edit` | Editar precios |
| `batches.view` | Ver lotes |
| `batches.create` | Crear lotes |
| `batches.edit` | Editar lotes |
| `batches.delete` | Eliminar lotes |
| `dashboard.view` | Ver dashboard |
| `reports.view` | Ver reportes |

### Web Admin (WEB_ADMIN)

| Permiso | Descripción |
|---------|-------------|
| `super_admin` | Acceso total al sistema |
| `products.view` | Ver catálogo |
| `products.edit` | Editar productos |
| `products.publish` | Publicar productos |
| `products.unpublish` | Despublicar productos |
| `orders.view` | Ver pedidos |
| `orders.edit` | Editar pedidos |
| `orders.cancel` | Cancelar pedidos |
| `customers.view` | Ver clientes |
| `customers.edit` | Editar clientes |
| `customers.delete` | Eliminar clientes |
| `inventory.view` | Ver inventario |
| `inventory.edit` | Editar inventario |
| `batch_timer.view` | Ver timer |
| `batch_timer.edit` | Editar timer |
| `dashboard.view` | Ver dashboard |
| `reports.view` | Ver reportes |
| `analytics.view` | Ver analytics |

---

## 9. Migración desde Supabase Auth

### gangazon-scanner2

1. **Localiza el archivo de login actual** (probablemente `src/admin/pages/Login.jsx` o similar)

2. **Reemplaza el import de Supabase**:
```javascript
// ANTES
import { supabase } from '../../services/supabase';

// AHORA
import AuthService from '../../services/AuthService';
```

3. **Cambia la lógica de login**:
```javascript
// ANTES
const handleLogin = async (e) => {
  e.preventDefault();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    setError(error.message);
  } else {
    navigate('/admin/dashboard');
  }
};

// AHORA
const handleLogin = async (e) => {
  e.preventDefault();
  try {
    await AuthService.login(email, password);
    navigate('/admin/dashboard');
  } catch (error) {
    setError(error.message);
  }
};
```

4. **Actualiza el componente ProtectedRoute**:
```javascript
// ANTES
const session = supabase.auth.getSession();
if (!session) return <Navigate to="/login" />;

// AHORA
if (!AuthService.isAuthenticated()) {
  return <Navigate to="/admin/login" />;
}
```

### gangazon-web-2

1. **Crea una nueva ruta `/admin/login`** separada del login de clientes

2. **El login de clientes (`/login`) sigue usando Supabase Auth** (no tocar)

3. **Crea páginas admin bajo `/admin/*`** que usen AuthService

4. **Mantén las páginas de clientes (`/`, `/producto/:id`, `/perfil`) con Supabase Auth**

---

## 10. Testing

### Test de login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gangazon.com",
    "password": "Gangazon2024!Secure",
    "applicationCode": "SCANNER_ADMIN"
  }'
```

### Test de petición autenticada
```bash
curl -X GET http://localhost:4000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Arquitectura Final

```
┌─────────────────────────────────────────────────────────┐
│                  USUARIOS FINALES                        │
└─────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                 │
         ▼                                 ▼
┌─────────────────┐              ┌─────────────────┐
│   CLIENTES WEB  │              │ ADMINISTRADORES │
│  (Supabase Auth)│              │ (Auth Service)  │
└─────────────────┘              └─────────────────┘
         │                                 │
         ▼                                 ▼
┌─────────────────┐              ┌─────────────────┐
│ Schema: public  │              │Schema: auth_    │
│                 │              │    gangazon     │
│ web_customers   │              │                 │
│ web_products    │              │ users           │
│ web_orders      │              │ applications    │
│ web_cart        │              │ permissions     │
└─────────────────┘              └─────────────────┘
         │                                 │
         └────────────────┬────────────────┘
                          ▼
                ┌──────────────────┐
                │  SUPABASE DB     │
                │  (PostgreSQL)    │
                └──────────────────┘
```

**Separación total**: Misma base de datos, esquemas diferentes, sistemas de auth independientes.
