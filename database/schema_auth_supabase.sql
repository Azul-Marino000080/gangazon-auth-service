-- =====================================================
-- GANGAZON AUTH SERVICE - ESQUEMA SEPARADO EN SUPABASE
-- =====================================================
-- Este script crea un esquema 'auth' separado del esquema 'public'
-- para aislar la gestión de administradores de la de clientes
-- =====================================================

-- Crear el esquema auth si no existe
CREATE SCHEMA IF NOT EXISTS auth_gangazon;

-- Establecer el search_path para crear todo dentro del esquema auth
SET search_path TO auth_gangazon, public;

-- Habilitar extensiones necesarias (ya existen en public, se pueden usar)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;

-- =====================================================
-- TABLA: franchises
-- Franquicias del sistema Gangazon
-- =====================================================
CREATE TABLE IF NOT EXISTS auth_gangazon.franchises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'España',
  contact_person VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_franchises_code ON auth_gangazon.franchises(code);
CREATE INDEX idx_franchises_is_active ON auth_gangazon.franchises(is_active);

-- =====================================================
-- TABLA: users
-- Usuarios del sistema (administradores)
-- =====================================================
CREATE TABLE IF NOT EXISTS auth_gangazon.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  franchise_id UUID REFERENCES auth_gangazon.franchises(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON auth_gangazon.users(email);
CREATE INDEX idx_users_franchise_id ON auth_gangazon.users(franchise_id);
CREATE INDEX idx_users_is_active ON auth_gangazon.users(is_active);

-- =====================================================
-- TABLA: applications
-- Aplicaciones que usan este servicio de autenticación
-- =====================================================
CREATE TABLE IF NOT EXISTS auth_gangazon.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  redirect_url VARCHAR(500) NOT NULL,
  api_key VARCHAR(255) UNIQUE,
  allowed_origins TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_applications_code ON auth_gangazon.applications(code);
CREATE INDEX idx_applications_api_key ON auth_gangazon.applications(api_key);
CREATE INDEX idx_applications_is_active ON auth_gangazon.applications(is_active);

-- =====================================================
-- TABLA: permissions
-- Permisos específicos de cada aplicación
-- =====================================================
CREATE TABLE IF NOT EXISTS auth_gangazon.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES auth_gangazon.applications(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(application_id, code)
);

CREATE INDEX idx_permissions_application_id ON auth_gangazon.permissions(application_id);
CREATE INDEX idx_permissions_code ON auth_gangazon.permissions(code);
CREATE INDEX idx_permissions_category ON auth_gangazon.permissions(category);
CREATE INDEX idx_permissions_is_active ON auth_gangazon.permissions(is_active);

-- =====================================================
-- TABLA: user_app_permissions
-- Permisos asignados a usuarios en aplicaciones específicas
-- =====================================================
CREATE TABLE IF NOT EXISTS auth_gangazon.user_app_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_gangazon.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES auth_gangazon.applications(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES auth_gangazon.permissions(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth_gangazon.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, application_id, permission_id)
);

CREATE INDEX idx_uap_user_id ON auth_gangazon.user_app_permissions(user_id);
CREATE INDEX idx_uap_application_id ON auth_gangazon.user_app_permissions(application_id);
CREATE INDEX idx_uap_permission_id ON auth_gangazon.user_app_permissions(permission_id);
CREATE INDEX idx_uap_is_active ON auth_gangazon.user_app_permissions(is_active);

-- =====================================================
-- TABLA: refresh_tokens
-- Tokens de refresco para renovar access tokens
-- =====================================================
CREATE TABLE IF NOT EXISTS auth_gangazon.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_gangazon.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  application_id UUID REFERENCES auth_gangazon.applications(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  is_revoked BOOLEAN DEFAULT false
);

CREATE INDEX idx_refresh_tokens_user_id ON auth_gangazon.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON auth_gangazon.refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_application_id ON auth_gangazon.refresh_tokens(application_id);
CREATE INDEX idx_refresh_tokens_is_revoked ON auth_gangazon.refresh_tokens(is_revoked);

-- =====================================================
-- TABLA: sessions
-- Control de sesiones activas de usuarios
-- =====================================================
CREATE TABLE IF NOT EXISTS auth_gangazon.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_gangazon.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES auth_gangazon.applications(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_sessions_user_id ON auth_gangazon.sessions(user_id);
CREATE INDEX idx_sessions_application_id ON auth_gangazon.sessions(application_id);
CREATE INDEX idx_sessions_is_active ON auth_gangazon.sessions(is_active);

-- =====================================================
-- TABLA: audit_log
-- Registro de auditoría de acciones importantes
-- =====================================================
CREATE TABLE IF NOT EXISTS auth_gangazon.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_gangazon.users(id) ON DELETE SET NULL,
  application_id UUID REFERENCES auth_gangazon.applications(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user_id ON auth_gangazon.audit_log(user_id);
CREATE INDEX idx_audit_log_application_id ON auth_gangazon.audit_log(application_id);
CREATE INDEX idx_audit_log_action ON auth_gangazon.audit_log(action);
CREATE INDEX idx_audit_log_created_at ON auth_gangazon.audit_log(created_at);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION auth_gangazon.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_franchises_updated_at BEFORE UPDATE ON auth_gangazon.franchises
  FOR EACH ROW EXECUTE FUNCTION auth_gangazon.update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth_gangazon.users
  FOR EACH ROW EXECUTE FUNCTION auth_gangazon.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON auth_gangazon.applications
  FOR EACH ROW EXECUTE FUNCTION auth_gangazon.update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON auth_gangazon.permissions
  FOR EACH ROW EXECUTE FUNCTION auth_gangazon.update_updated_at_column();

-- Función para asignar automáticamente nuevos permisos a usuarios con super_admin
CREATE OR REPLACE FUNCTION auth_gangazon.assign_permission_to_super_admins()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO auth_gangazon.user_app_permissions (user_id, application_id, permission_id, is_active)
  SELECT 
    uap.user_id,
    NEW.application_id,
    NEW.id,
    true
  FROM auth_gangazon.user_app_permissions uap
  INNER JOIN auth_gangazon.permissions p ON uap.permission_id = p.id
  WHERE p.code = 'super_admin'
    AND uap.is_active = true
    AND NEW.code != 'super_admin'
  ON CONFLICT (user_id, application_id, permission_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger que se ejecuta después de insertar un nuevo permiso
CREATE TRIGGER auto_assign_permission_to_super_admins
  AFTER INSERT ON auth_gangazon.permissions
  FOR EACH ROW
  EXECUTE FUNCTION auth_gangazon.assign_permission_to_super_admins();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de usuarios con sus franquicias
CREATE OR REPLACE VIEW auth_gangazon.v_users_with_franchises AS
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.phone,
  u.is_active,
  u.email_verified,
  u.last_login_at,
  u.created_at,
  f.id as franchise_id,
  f.name as franchise_name,
  f.code as franchise_code
FROM auth_gangazon.users u
LEFT JOIN auth_gangazon.franchises f ON u.franchise_id = f.id;

-- Vista de permisos de usuario por aplicación
CREATE OR REPLACE VIEW auth_gangazon.v_user_permissions_by_app AS
SELECT 
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  a.id as application_id,
  a.name as application_name,
  a.code as application_code,
  p.id as permission_id,
  p.code as permission_code,
  p.display_name as permission_display_name,
  p.category as permission_category,
  uap.assigned_at,
  uap.expires_at,
  uap.is_active
FROM auth_gangazon.users u
INNER JOIN auth_gangazon.user_app_permissions uap ON u.id = uap.user_id
INNER JOIN auth_gangazon.applications a ON uap.application_id = a.id
INNER JOIN auth_gangazon.permissions p ON uap.permission_id = p.id;

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar franquicia matriz Gangazon
INSERT INTO auth_gangazon.franchises (id, name, code, email, contact_person, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Gangazon Matriz',
  'GANGAZON_HQ',
  'admin@gangazon.com',
  'Administrador',
  true
) ON CONFLICT (code) DO NOTHING;

-- Insertar aplicación Scanner Admin
INSERT INTO auth_gangazon.applications (id, name, code, description, redirect_url, is_active)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'Scanner Admin',
  'SCANNER_ADMIN',
  'Panel de administración del escáner de productos',
  'http://localhost:3000/admin',
  true
) ON CONFLICT (code) DO NOTHING;

-- Insertar aplicación Web Admin
INSERT INTO auth_gangazon.applications (id, name, code, description, redirect_url, is_active)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  'Web Admin',
  'WEB_ADMIN',
  'Panel de administración del sitio web de e-commerce',
  'http://localhost:3001/admin',
  true
) ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- PERMISOS PARA SCANNER ADMIN
-- =====================================================
INSERT INTO auth_gangazon.permissions (application_id, code, display_name, description, category)
VALUES 
  -- Super Admin Scanner
  (
    '10000000-0000-0000-0000-000000000001',
    'super_admin',
    'Super Administrador',
    'Acceso total al sistema de scanner',
    'system'
  ),
  -- Gestión de archivos
  (
    '10000000-0000-0000-0000-000000000001',
    'files.view',
    'Ver archivos',
    'Permite ver archivos subidos',
    'files'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'files.upload',
    'Subir archivos',
    'Permite subir nuevos archivos',
    'files'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'files.delete',
    'Eliminar archivos',
    'Permite eliminar archivos',
    'files'
  ),
  -- Gestión de productos
  (
    '10000000-0000-0000-0000-000000000001',
    'products.view',
    'Ver productos',
    'Permite ver productos escaneados',
    'products'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'products.edit',
    'Editar productos',
    'Permite modificar datos de productos',
    'products'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'products.delete',
    'Eliminar productos',
    'Permite eliminar productos',
    'products'
  ),
  -- Gestión de precios
  (
    '10000000-0000-0000-0000-000000000001',
    'pricing.view',
    'Ver precios',
    'Permite ver configuración de precios',
    'pricing'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'pricing.edit',
    'Editar precios',
    'Permite modificar configuración de precios',
    'pricing'
  ),
  -- Gestión de lotes
  (
    '10000000-0000-0000-0000-000000000001',
    'batches.view',
    'Ver lotes',
    'Permite ver lotes de productos',
    'batches'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'batches.create',
    'Crear lotes',
    'Permite crear nuevos lotes',
    'batches'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'batches.edit',
    'Editar lotes',
    'Permite modificar lotes',
    'batches'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'batches.delete',
    'Eliminar lotes',
    'Permite eliminar lotes',
    'batches'
  ),
  -- Dashboard y reportes
  (
    '10000000-0000-0000-0000-000000000001',
    'dashboard.view',
    'Ver dashboard',
    'Permite ver el panel de control',
    'dashboard'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'reports.view',
    'Ver reportes',
    'Permite ver reportes del sistema',
    'reports'
  )
ON CONFLICT (application_id, code) DO NOTHING;

-- =====================================================
-- PERMISOS PARA WEB ADMIN
-- =====================================================
INSERT INTO auth_gangazon.permissions (application_id, code, display_name, description, category)
VALUES 
  -- Super Admin Web
  (
    '20000000-0000-0000-0000-000000000001',
    'super_admin',
    'Super Administrador',
    'Acceso total al sistema web',
    'system'
  ),
  -- Gestión de productos web
  (
    '20000000-0000-0000-0000-000000000001',
    'products.view',
    'Ver productos',
    'Permite ver catálogo de productos',
    'products'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'products.edit',
    'Editar productos',
    'Permite modificar productos del catálogo',
    'products'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'products.publish',
    'Publicar productos',
    'Permite publicar productos en la web',
    'products'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'products.unpublish',
    'Despublicar productos',
    'Permite quitar productos de la web',
    'products'
  ),
  -- Gestión de pedidos
  (
    '20000000-0000-0000-0000-000000000001',
    'orders.view',
    'Ver pedidos',
    'Permite ver pedidos de clientes',
    'orders'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'orders.edit',
    'Editar pedidos',
    'Permite modificar estado de pedidos',
    'orders'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'orders.cancel',
    'Cancelar pedidos',
    'Permite cancelar pedidos',
    'orders'
  ),
  -- Gestión de clientes
  (
    '20000000-0000-0000-0000-000000000001',
    'customers.view',
    'Ver clientes',
    'Permite ver lista de clientes',
    'customers'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'customers.edit',
    'Editar clientes',
    'Permite modificar datos de clientes',
    'customers'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'customers.delete',
    'Eliminar clientes',
    'Permite eliminar cuentas de clientes',
    'customers'
  ),
  -- Gestión de inventario
  (
    '20000000-0000-0000-0000-000000000001',
    'inventory.view',
    'Ver inventario',
    'Permite ver stock disponible',
    'inventory'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'inventory.edit',
    'Editar inventario',
    'Permite modificar cantidades de stock',
    'inventory'
  ),
  -- Configuración de batch timer
  (
    '20000000-0000-0000-0000-000000000001',
    'batch_timer.view',
    'Ver batch timer',
    'Permite ver configuración del timer',
    'config'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'batch_timer.edit',
    'Editar batch timer',
    'Permite modificar configuración del timer',
    'config'
  ),
  -- Dashboard y reportes
  (
    '20000000-0000-0000-0000-000000000001',
    'dashboard.view',
    'Ver dashboard',
    'Permite ver el panel de control',
    'dashboard'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'reports.view',
    'Ver reportes',
    'Permite ver reportes de ventas',
    'reports'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'analytics.view',
    'Ver analytics',
    'Permite ver analíticas de la web',
    'analytics'
  )
ON CONFLICT (application_id, code) DO NOTHING;

-- =====================================================
-- COMENTARIOS EN TABLAS
-- =====================================================

COMMENT ON SCHEMA auth_gangazon IS 'Esquema de autenticación centralizada para administradores Gangazon';
COMMENT ON TABLE auth_gangazon.franchises IS 'Franquicias del sistema Gangazon';
COMMENT ON TABLE auth_gangazon.users IS 'Usuarios administradores del sistema';
COMMENT ON TABLE auth_gangazon.applications IS 'Aplicaciones que usan el servicio de autenticación';
COMMENT ON TABLE auth_gangazon.permissions IS 'Permisos específicos por aplicación';
COMMENT ON TABLE auth_gangazon.user_app_permissions IS 'Permisos asignados a usuarios por aplicación';
COMMENT ON TABLE auth_gangazon.refresh_tokens IS 'Tokens de refresco para renovar access tokens';
COMMENT ON TABLE auth_gangazon.sessions IS 'Sesiones activas de usuarios';
COMMENT ON TABLE auth_gangazon.audit_log IS 'Registro de auditoría del sistema';

-- Restaurar search_path
RESET search_path;

