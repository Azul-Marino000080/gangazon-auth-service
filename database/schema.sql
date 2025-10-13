-- =====================================================
-- GANGAZON AUTH SERVICE v2.0 - DATABASE SCHEMA
-- =====================================================
-- Sistema de autenticación centralizado con:
-- - Multi-aplicación
-- - Roles por aplicación
-- - Gestión de franquicias
-- - Control de sesiones
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: franchises
-- Franquicias del sistema Gangazon
-- =====================================================
CREATE TABLE IF NOT EXISTS franchises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL, -- Código único de franquicia
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

CREATE INDEX idx_franchises_code ON franchises(code);
CREATE INDEX idx_franchises_is_active ON franchises(is_active);

-- =====================================================
-- TABLA: users
-- Usuarios del sistema
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  franchise_id UUID REFERENCES franchises(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_franchise_id ON users(franchise_id);
CREATE INDEX idx_users_is_active ON users(is_active);

-- =====================================================
-- TABLA: applications
-- Aplicaciones que usan este servicio de autenticación
-- =====================================================
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL, -- Código único de la app
  description TEXT,
  redirect_url VARCHAR(500) NOT NULL, -- URL a donde redirigir tras login
  api_key VARCHAR(255) UNIQUE, -- API key para validar requests
  allowed_origins TEXT[], -- URLs permitidas para CORS
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_applications_code ON applications(code);
CREATE INDEX idx_applications_api_key ON applications(api_key);
CREATE INDEX idx_applications_is_active ON applications(is_active);

-- =====================================================
-- TABLA: permissions
-- Permisos específicos de cada aplicación
-- Ejemplo: "fichajes.create", "informes.view", "productos.edit"
-- =====================================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL, -- Código técnico: fichajes.create, informes.view
  display_name VARCHAR(100) NOT NULL, -- Nombre para mostrar: "Crear fichajes"
  description TEXT,
  category VARCHAR(50), -- Categoría: fichajes, informes, productos
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(application_id, code) -- Permiso único por aplicación
);

CREATE INDEX idx_permissions_application_id ON permissions(application_id);
CREATE INDEX idx_permissions_code ON permissions(code);
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_is_active ON permissions(is_active);

-- =====================================================
-- TABLA: user_app_permissions
-- Permisos asignados a usuarios en aplicaciones específicas
-- =====================================================
CREATE TABLE IF NOT EXISTS user_app_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Fecha de expiración opcional
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, application_id, permission_id) -- Usuario solo puede tener el mismo permiso una vez por app
);

CREATE INDEX idx_uap_user_id ON user_app_permissions(user_id);
CREATE INDEX idx_uap_application_id ON user_app_permissions(application_id);
CREATE INDEX idx_uap_permission_id ON user_app_permissions(permission_id);
CREATE INDEX idx_uap_is_active ON user_app_permissions(is_active);

-- =====================================================
-- TABLA: refresh_tokens
-- Tokens de refresco para renovar access tokens
-- =====================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  is_revoked BOOLEAN DEFAULT false
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_application_id ON refresh_tokens(application_id);
CREATE INDEX idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);

-- =====================================================
-- TABLA: sessions
-- Control de sesiones activas de usuarios
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  ip_address VARCHAR(45), -- IPv4 o IPv6
  user_agent TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_application_id ON sessions(application_id);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);

-- =====================================================
-- TABLA: audit_log
-- Registro de auditoría de acciones importantes
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- login, logout, role_assigned, etc.
  entity_type VARCHAR(50), -- users, applications, roles, etc.
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_application_id ON audit_log(application_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_franchises_updated_at BEFORE UPDATE ON franchises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para asignar automáticamente nuevos permisos a usuarios con super_admin
CREATE OR REPLACE FUNCTION assign_permission_to_super_admins()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar el nuevo permiso para todos los usuarios que tienen super_admin
  INSERT INTO user_app_permissions (user_id, application_id, permission_id, is_active)
  SELECT 
    uap.user_id,
    NEW.application_id,
    NEW.id,
    true
  FROM user_app_permissions uap
  INNER JOIN permissions p ON uap.permission_id = p.id
  WHERE p.code = 'super_admin'
    AND uap.is_active = true
    AND NEW.code != 'super_admin' -- No auto-asignar super_admin a super_admins
  ON CONFLICT (user_id, application_id, permission_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger que se ejecuta después de insertar un nuevo permiso
CREATE TRIGGER auto_assign_permission_to_super_admins
  AFTER INSERT ON permissions
  FOR EACH ROW
  EXECUTE FUNCTION assign_permission_to_super_admins();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de usuarios con sus franquicias
CREATE OR REPLACE VIEW v_users_with_franchises AS
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
FROM users u
LEFT JOIN franchises f ON u.franchise_id = f.id;

-- Vista de permisos de usuario por aplicación
CREATE OR REPLACE VIEW v_user_permissions_by_app AS
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
FROM users u
INNER JOIN user_app_permissions uap ON u.id = uap.user_id
INNER JOIN applications a ON uap.application_id = a.id
INNER JOIN permissions p ON uap.permission_id = p.id;

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar franquicia matriz Gangazon
INSERT INTO franchises (id, name, code, email, contact_person, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Gangazon Matriz',
  'GANGAZON_HQ',
  'admin@gangazon.com',
  'Administrador',
  true
) ON CONFLICT (code) DO NOTHING;

-- Insertar aplicación de administración
INSERT INTO applications (id, name, code, description, redirect_url, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Admin Panel',
  'ADMIN_PANEL',
  'Panel de administración central de Gangazon',
  'http://localhost:3000',
  true
) ON CONFLICT (code) DO NOTHING;

-- Insertar permisos básicos para Admin Panel
INSERT INTO permissions (id, application_id, code, display_name, description, category)
VALUES 
  -- SUPER ADMIN - Permiso especial con acceso total
  (
    '00000000-0000-0000-0000-000000000100',
    '00000000-0000-0000-0000-000000000001',
    'super_admin',
    'Super Administrador',
    'Acceso total al sistema - Puede eliminar registros críticos, gestionar aplicaciones y sesiones',
    'system'
  ),
  -- Gestión de usuarios
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'users.view',
    'Ver usuarios',
    'Permite ver la lista de usuarios',
    'users'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'users.create',
    'Crear usuarios',
    'Permite crear nuevos usuarios',
    'users'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'users.edit',
    'Editar usuarios',
    'Permite modificar datos de usuarios',
    'users'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'users.delete',
    'Eliminar usuarios',
    'Permite eliminar usuarios (requiere super_admin)',
    'users'
  ),
  -- Gestión de franquicias
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'franchises.view',
    'Ver franquicias',
    'Permite ver la lista de franquicias',
    'franchises'
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'franchises.create',
    'Crear franquicias',
    'Permite crear nuevas franquicias',
    'franchises'
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    'franchises.edit',
    'Editar franquicias',
    'Permite modificar datos de franquicias',
    'franchises'
  ),
  (
    '00000000-0000-0000-0000-000000000013',
    '00000000-0000-0000-0000-000000000001',
    'franchises.delete',
    'Eliminar franquicias',
    'Permite eliminar franquicias (requiere super_admin)',
    'franchises'
  ),
  -- Gestión de aplicaciones
  (
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000001',
    'applications.view',
    'Ver aplicaciones',
    'Permite ver aplicaciones registradas',
    'applications'
  ),
  (
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000001',
    'applications.create',
    'Crear aplicaciones',
    'Permite registrar nuevas aplicaciones (requiere super_admin)',
    'applications'
  ),
  (
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000001',
    'applications.edit',
    'Editar aplicaciones',
    'Permite modificar aplicaciones (requiere super_admin)',
    'applications'
  ),
  (
    '00000000-0000-0000-0000-000000000023',
    '00000000-0000-0000-0000-000000000001',
    'applications.delete',
    'Eliminar aplicaciones',
    'Permite eliminar aplicaciones (requiere super_admin)',
    'applications'
  ),
  -- Gestión de permisos
  (
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000001',
    'permissions.view',
    'Ver permisos',
    'Permite ver permisos del sistema',
    'permissions'
  ),
  (
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000001',
    'permissions.create',
    'Crear permisos',
    'Permite crear nuevos permisos para aplicaciones',
    'permissions'
  ),
  (
    '00000000-0000-0000-0000-000000000032',
    '00000000-0000-0000-0000-000000000001',
    'permissions.edit',
    'Editar permisos',
    'Permite modificar permisos existentes',
    'permissions'
  ),
  (
    '00000000-0000-0000-0000-000000000033',
    '00000000-0000-0000-0000-000000000001',
    'permissions.delete',
    'Eliminar permisos',
    'Permite eliminar permisos del sistema (requiere super_admin)',
    'permissions'
  ),
  (
    '00000000-0000-0000-0000-000000000034',
    '00000000-0000-0000-0000-000000000001',
    'permissions.assign',
    'Asignar permisos',
    'Permite asignar/revocar permisos a usuarios',
    'permissions'
  ),
  -- Gestión de sesiones
  (
    '00000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000001',
    'sessions.view',
    'Ver sesiones',
    'Permite ver sesiones activas',
    'sessions'
  ),
  (
    '00000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000001',
    'sessions.delete',
    'Eliminar sesiones',
    'Permite cerrar sesiones de usuarios (requiere super_admin)',
    'sessions'
  ),
  -- Auditoría
  (
    '00000000-0000-0000-0000-000000000050',
    '00000000-0000-0000-0000-000000000001',
    'audit.view',
    'Ver auditoría',
    'Permite ver logs de auditoría del sistema',
    'audit'
  )
ON CONFLICT (application_id, code) DO NOTHING;

-- =====================================================
-- COMENTARIOS EN TABLAS
-- =====================================================

COMMENT ON TABLE franchises IS 'Franquicias del sistema Gangazon';
COMMENT ON TABLE users IS 'Usuarios del sistema de autenticación';
COMMENT ON TABLE applications IS 'Aplicaciones que usan el servicio de autenticación';
COMMENT ON TABLE permissions IS 'Permisos específicos por aplicación';
COMMENT ON TABLE user_app_permissions IS 'Permisos asignados a usuarios por aplicación';
COMMENT ON TABLE refresh_tokens IS 'Tokens de refresco para renovar access tokens';
COMMENT ON TABLE sessions IS 'Sesiones activas de usuarios';
COMMENT ON TABLE audit_log IS 'Registro de auditoría del sistema';
