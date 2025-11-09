-- ============================================
-- RECREAR ESQUEMA auth_gangazon COMPLETO
-- Con usuario postgres como dueño
-- ============================================

-- 1. ELIMINAR ESQUEMA EXISTENTE (si existe)
DROP SCHEMA IF EXISTS auth_gangazon CASCADE;

-- 2. CREAR ESQUEMA NUEVO
CREATE SCHEMA auth_gangazon;

-- 3. DAR PERMISOS AL ESQUEMA
GRANT ALL ON SCHEMA auth_gangazon TO postgres;
GRANT USAGE ON SCHEMA auth_gangazon TO authenticated;
GRANT USAGE ON SCHEMA auth_gangazon TO anon;

-- ============================================
-- TABLA: auth_franchises
-- ============================================
CREATE TABLE auth_gangazon.auth_franchises (
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar franquicia matriz del sistema
INSERT INTO auth_gangazon.auth_franchises (id, name, code, email, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Gangazon Headquarters',
    'GANGAZON_HQ',
    'admin@gangazon.com',
    true
);

-- ============================================
-- TABLA: auth_users
-- ============================================
CREATE TABLE auth_gangazon.auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    franchise_id UUID REFERENCES auth_gangazon.auth_franchises(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_users_email ON auth_gangazon.auth_users(email);
CREATE INDEX idx_users_franchise ON auth_gangazon.auth_users(franchise_id);
CREATE INDEX idx_users_active ON auth_gangazon.auth_users(is_active);

-- ============================================
-- TABLA: auth_applications
-- ============================================
CREATE TABLE auth_gangazon.auth_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    redirect_url TEXT,
    allowed_origins JSONB DEFAULT '[]'::jsonb,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar aplicación del panel de administración
INSERT INTO auth_gangazon.auth_applications (id, name, code, description, redirect_url, allowed_origins, api_key, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Admin Panel',
    'ADMIN_PANEL',
    'Panel de administración central de Gangazon',
    'http://localhost:3000',
    '["http://localhost:3000", "https://admin.gangazon.com"]'::jsonb,
    'app_gangazon_admin_panel_master_key_2024',
    true
);

-- ============================================
-- TABLA: auth_permissions
-- ============================================
CREATE TABLE auth_gangazon.auth_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES auth_gangazon.auth_applications(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(application_id, code)
);

-- Índices
CREATE INDEX idx_permissions_app ON auth_gangazon.auth_permissions(application_id);
CREATE INDEX idx_permissions_code ON auth_gangazon.auth_permissions(code);
CREATE INDEX idx_permissions_category ON auth_gangazon.auth_permissions(category);

-- Insertar permisos del sistema para ADMIN_PANEL
INSERT INTO auth_gangazon.auth_permissions (application_id, code, display_name, description, category) VALUES
-- Super Admin
('00000000-0000-0000-0000-000000000001', 'super_admin', 'Super Administrador', 'Acceso total al sistema', 'system'),

-- Users
('00000000-0000-0000-0000-000000000001', 'users.view', 'Ver Usuarios', 'Puede ver la lista de usuarios', 'users'),
('00000000-0000-0000-0000-000000000001', 'users.create', 'Crear Usuarios', 'Puede crear nuevos usuarios', 'users'),
('00000000-0000-0000-0000-000000000001', 'users.edit', 'Editar Usuarios', 'Puede modificar usuarios existentes', 'users'),
('00000000-0000-0000-0000-000000000001', 'users.delete', 'Eliminar Usuarios', 'Puede eliminar usuarios', 'users'),

-- Franchises
('00000000-0000-0000-0000-000000000001', 'franchises.view', 'Ver Franquicias', 'Puede ver la lista de franquicias', 'franchises'),
('00000000-0000-0000-0000-000000000001', 'franchises.create', 'Crear Franquicias', 'Puede crear nuevas franquicias', 'franchises'),
('00000000-0000-0000-0000-000000000001', 'franchises.edit', 'Editar Franquicias', 'Puede modificar franquicias', 'franchises'),
('00000000-0000-0000-0000-000000000001', 'franchises.delete', 'Eliminar Franquicias', 'Puede eliminar franquicias', 'franchises'),

-- Applications
('00000000-0000-0000-0000-000000000001', 'applications.view', 'Ver Aplicaciones', 'Puede ver aplicaciones registradas', 'applications'),
('00000000-0000-0000-0000-000000000001', 'applications.create', 'Crear Aplicaciones', 'Puede registrar nuevas aplicaciones', 'applications'),
('00000000-0000-0000-0000-000000000001', 'applications.edit', 'Editar Aplicaciones', 'Puede modificar aplicaciones', 'applications'),
('00000000-0000-0000-0000-000000000001', 'applications.delete', 'Eliminar Aplicaciones', 'Puede eliminar aplicaciones', 'applications'),

-- Permissions
('00000000-0000-0000-0000-000000000001', 'permissions.view', 'Ver Permisos', 'Puede ver permisos del sistema', 'permissions'),
('00000000-0000-0000-0000-000000000001', 'permissions.create', 'Crear Permisos', 'Puede crear nuevos permisos', 'permissions'),
('00000000-0000-0000-0000-000000000001', 'permissions.edit', 'Editar Permisos', 'Puede modificar permisos', 'permissions'),
('00000000-0000-0000-0000-000000000001', 'permissions.delete', 'Eliminar Permisos', 'Puede eliminar permisos', 'permissions'),
('00000000-0000-0000-0000-000000000001', 'permissions.assign', 'Asignar Permisos', 'Puede asignar/revocar permisos a usuarios', 'permissions'),

-- Sessions
('00000000-0000-0000-0000-000000000001', 'sessions.view', 'Ver Sesiones', 'Puede ver sesiones activas', 'sessions'),
('00000000-0000-0000-0000-000000000001', 'sessions.delete', 'Cerrar Sesiones', 'Puede forzar cierre de sesiones', 'sessions'),

-- Audit
('00000000-0000-0000-0000-000000000001', 'audit.view', 'Ver Auditoría', 'Puede consultar logs de auditoría', 'audit');

-- ============================================
-- TABLA: auth_user_app_permissions
-- ============================================
CREATE TABLE auth_gangazon.auth_user_app_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_gangazon.auth_users(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES auth_gangazon.auth_applications(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES auth_gangazon.auth_permissions(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, application_id, permission_id)
);

-- Índices
CREATE INDEX idx_user_permissions_user ON auth_gangazon.auth_user_app_permissions(user_id);
CREATE INDEX idx_user_permissions_app ON auth_gangazon.auth_user_app_permissions(application_id);
CREATE INDEX idx_user_permissions_perm ON auth_gangazon.auth_user_app_permissions(permission_id);
CREATE INDEX idx_user_permissions_active ON auth_gangazon.auth_user_app_permissions(is_active);

-- ============================================
-- TABLA: auth_sessions
-- ============================================
CREATE TABLE auth_gangazon.auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_gangazon.auth_users(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES auth_gangazon.auth_applications(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_sessions_user ON auth_gangazon.auth_sessions(user_id);
CREATE INDEX idx_sessions_app ON auth_gangazon.auth_sessions(application_id);
CREATE INDEX idx_sessions_active ON auth_gangazon.auth_sessions(ended_at) WHERE ended_at IS NULL;

-- ============================================
-- TABLA: auth_refresh_tokens
-- ============================================
CREATE TABLE auth_gangazon.auth_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_gangazon.auth_users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_refresh_tokens_user ON auth_gangazon.auth_refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON auth_gangazon.auth_refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires ON auth_gangazon.auth_refresh_tokens(expires_at);

-- ============================================
-- TABLA: auth_audit_log
-- ============================================
CREATE TABLE auth_gangazon.auth_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth_gangazon.auth_users(id) ON DELETE SET NULL,
    application_id UUID REFERENCES auth_gangazon.auth_applications(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_audit_user ON auth_gangazon.auth_audit_log(user_id);
CREATE INDEX idx_audit_app ON auth_gangazon.auth_audit_log(application_id);
CREATE INDEX idx_audit_action ON auth_gangazon.auth_audit_log(action);
CREATE INDEX idx_audit_created ON auth_gangazon.auth_audit_log(created_at DESC);

-- ============================================
-- VISTA: v_auth_users_with_franchises
-- ============================================
CREATE OR REPLACE VIEW auth_gangazon.v_auth_users_with_franchises AS
SELECT 
    u.id,
    u.email,
    u.password_hash,
    u.first_name,
    u.last_name,
    u.phone,
    u.franchise_id,
    u.is_active,
    u.email_verified,
    u.last_login,
    u.created_at,
    u.updated_at,
    f.id as franchise_id_val,
    f.name as franchise_name,
    f.code as franchise_code
FROM auth_gangazon.auth_users u
LEFT JOIN auth_gangazon.auth_franchises f ON u.franchise_id = f.id;

-- ============================================
-- VISTA: v_user_permissions_by_app (sin prefijo auth_)
-- ============================================
CREATE OR REPLACE VIEW auth_gangazon.v_user_permissions_by_app AS
SELECT 
    uap.id,
    uap.user_id,
    uap.application_id,
    uap.permission_id,
    uap.assigned_at,
    uap.expires_at,
    uap.is_active,
    u.email as user_email,
    u.first_name as user_first_name,
    u.last_name as user_last_name,
    a.name as application_name,
    a.code as application_code,
    p.code as permission_code,
    p.display_name as permission_display_name,
    p.category as permission_category
FROM auth_gangazon.auth_user_app_permissions uap
JOIN auth_gangazon.auth_users u ON uap.user_id = u.id
JOIN auth_gangazon.auth_applications a ON uap.application_id = a.id
JOIN auth_gangazon.auth_permissions p ON uap.permission_id = p.id;

-- ============================================
-- VISTA: v_auth_user_permissions_by_app (con prefijo auth_)
-- Alias de la vista anterior para compatibilidad
-- ============================================
CREATE OR REPLACE VIEW auth_gangazon.v_auth_user_permissions_by_app AS
SELECT * FROM auth_gangazon.v_user_permissions_by_app;

-- ============================================
-- TRIGGERS: updated_at automático
-- ============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION auth_gangazon.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_franchises_updated_at
    BEFORE UPDATE ON auth_gangazon.auth_franchises
    FOR EACH ROW EXECUTE FUNCTION auth_gangazon.update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON auth_gangazon.auth_users
    FOR EACH ROW EXECUTE FUNCTION auth_gangazon.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON auth_gangazon.auth_applications
    FOR EACH ROW EXECUTE FUNCTION auth_gangazon.update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at
    BEFORE UPDATE ON auth_gangazon.auth_permissions
    FOR EACH ROW EXECUTE FUNCTION auth_gangazon.update_updated_at_column();

-- ============================================
-- PERMISOS FINALES
-- ============================================

-- Dar todos los permisos al usuario postgres
GRANT ALL ON ALL TABLES IN SCHEMA auth_gangazon TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth_gangazon TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth_gangazon TO postgres;

-- Permisos para usuario autenticado
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth_gangazon TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth_gangazon TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth_gangazon TO authenticated;

-- Permisos para usuario anónimo (solo lectura en algunas tablas)
GRANT SELECT ON auth_gangazon.auth_applications TO anon;
GRANT SELECT ON auth_gangazon.auth_permissions TO anon;

-- Establecer permisos por defecto para objetos futuros
ALTER DEFAULT PRIVILEGES IN SCHEMA auth_gangazon 
GRANT ALL ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth_gangazon 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth_gangazon 
GRANT USAGE ON SEQUENCES TO postgres, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth_gangazon 
GRANT EXECUTE ON FUNCTIONS TO postgres, authenticated;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que todo se creó correctamente
SELECT 'Schema auth_gangazon creado correctamente' as status;

SELECT 'Tablas creadas: ' || COUNT(*)::text as tables
FROM information_schema.tables 
WHERE table_schema = 'auth_gangazon' AND table_type = 'BASE TABLE';

SELECT 'Vistas creadas: ' || COUNT(*)::text as views
FROM information_schema.views 
WHERE table_schema = 'auth_gangazon';

SELECT 'Permisos insertados: ' || COUNT(*)::text as permissions
FROM auth_gangazon.auth_permissions;

SELECT 'Franquicia HQ: ' || name as franchise
FROM auth_gangazon.auth_franchises 
WHERE code = 'GANGAZON_HQ';

SELECT 'Aplicación Admin Panel: ' || name as application
FROM auth_gangazon.auth_applications 
WHERE code = 'ADMIN_PANEL';
