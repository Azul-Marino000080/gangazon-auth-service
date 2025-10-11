-- Gangazon Auth Service - Database Schema
-- Este script crea todas las tablas necesarias para el sistema de autenticación centralizada

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear schema para el sistema de autenticación
CREATE SCHEMA IF NOT EXISTS auth_system;

-- ==============================================
-- TABLA: organizations
-- Almacena información de las organizaciones
-- ==============================================

CREATE TABLE auth_system.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    website VARCHAR(255),
    industry VARCHAR(100),
    size VARCHAR(20) CHECK (size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para organizations
CREATE INDEX idx_organizations_name ON auth_system.organizations(name);
CREATE INDEX idx_organizations_is_active ON auth_system.organizations(is_active);

-- ==============================================
-- TABLA: users
-- Almacena información de los usuarios
-- ==============================================

CREATE TABLE auth_system.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    organization_id UUID REFERENCES auth_system.organizations(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para users
CREATE INDEX idx_users_email ON auth_system.users(email);
CREATE INDEX idx_users_organization_id ON auth_system.users(organization_id);
CREATE INDEX idx_users_role ON auth_system.users(role);
CREATE INDEX idx_users_is_active ON auth_system.users(is_active);
CREATE INDEX idx_users_email_verification_token ON auth_system.users(email_verification_token);
CREATE INDEX idx_users_password_reset_token ON auth_system.users(password_reset_token);

-- ==============================================
-- TABLA: refresh_tokens
-- Almacena los refresh tokens para mantener sesiones
-- ==============================================

CREATE TABLE auth_system.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth_system.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para refresh_tokens
CREATE INDEX idx_refresh_tokens_user_id ON auth_system.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON auth_system.refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON auth_system.refresh_tokens(expires_at);

-- ==============================================
-- TABLA: applications
-- Almacena las aplicaciones registradas que pueden usar el servicio de auth
-- ==============================================

CREATE TABLE auth_system.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES auth_system.organizations(id) ON DELETE CASCADE,
    api_key VARCHAR(255) NOT NULL UNIQUE,
    allowed_origins TEXT[], -- Array de orígenes permitidos para CORS
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para applications
CREATE INDEX idx_applications_organization_id ON auth_system.applications(organization_id);
CREATE INDEX idx_applications_api_key ON auth_system.applications(api_key);
CREATE INDEX idx_applications_is_active ON auth_system.applications(is_active);

-- ==============================================
-- TABLA: user_sessions
-- Almacena información de sesiones activas para auditoria
-- ==============================================

CREATE TABLE auth_system.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth_system.users(id) ON DELETE CASCADE,
    application_id UUID REFERENCES auth_system.applications(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    logout_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Índices para user_sessions
CREATE INDEX idx_user_sessions_user_id ON auth_system.user_sessions(user_id);
CREATE INDEX idx_user_sessions_application_id ON auth_system.user_sessions(application_id);
CREATE INDEX idx_user_sessions_is_active ON auth_system.user_sessions(is_active);
CREATE INDEX idx_user_sessions_login_at ON auth_system.user_sessions(login_at);

-- ==============================================
-- TABLA: audit_logs
-- Almacena logs de auditoria del sistema
-- ==============================================

CREATE TABLE auth_system.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth_system.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES auth_system.organizations(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para audit_logs
CREATE INDEX idx_audit_logs_user_id ON auth_system.audit_logs(user_id);
CREATE INDEX idx_audit_logs_organization_id ON auth_system.audit_logs(organization_id);
CREATE INDEX idx_audit_logs_action ON auth_system.audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON auth_system.audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON auth_system.audit_logs(created_at);

-- ==============================================
-- FUNCIONES Y TRIGGERS
-- ==============================================

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION auth_system.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON auth_system.organizations 
    FOR EACH ROW EXECUTE FUNCTION auth_system.update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON auth_system.users 
    FOR EACH ROW EXECUTE FUNCTION auth_system.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at 
    BEFORE UPDATE ON auth_system.applications 
    FOR EACH ROW EXECUTE FUNCTION auth_system.update_updated_at_column();

-- ==============================================
-- FUNCIÓN DE LIMPIEZA DE TOKENS EXPIRADOS
-- ==============================================

CREATE OR REPLACE FUNCTION auth_system.cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    -- Eliminar refresh tokens expirados
    DELETE FROM auth_system.refresh_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Marcar sesiones como inactivas si no tienen logout_at después de 24 horas
    UPDATE auth_system.user_sessions 
    SET is_active = false, logout_at = CURRENT_TIMESTAMP
    WHERE is_active = true 
      AND login_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
      AND logout_at IS NULL;
      
    -- Eliminar logs de auditoria antiguos (más de 1 año)
    DELETE FROM auth_system.audit_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- DATOS INICIALES
-- ==============================================

-- Crear organización por defecto para super admin
INSERT INTO auth_system.organizations (id, name, description, size) 
VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'Gangazon System',
    'Organización del sistema para administradores',
    'enterprise'
) ON CONFLICT (name) DO NOTHING;

-- Crear usuario super admin por defecto
-- Contraseña: Admin123! (cambiar inmediatamente en producción)
INSERT INTO auth_system.users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    organization_id,
    is_active,
    email_verified
) VALUES (
    '11111111-2222-3333-4444-555555555555',
    'admin@gangazon.com',
    '$2a$12$LGqG8Gn2COwZo0A9VEBOaeZBYjGdKb.PklpgcQeTPsDrRBKImOkq.',  -- Admin123!
    'Super',
    'Admin',
    'super_admin',
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- ==============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ==============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE auth_system.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.audit_logs ENABLE ROW LEVEL SECURITY;

-- Política para organizations - solo super_admin puede ver todas
CREATE POLICY "Users can view their own organization" ON auth_system.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth_system.users 
            WHERE users.organization_id = organizations.id 
            AND users.id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM auth_system.users 
            WHERE users.role = 'super_admin' 
            AND users.id = auth.uid()
        )
    );

-- Política para users - usuarios ven su organización
CREATE POLICY "Users can view organization users" ON auth_system.users
    FOR SELECT USING (
        organization_id = (
            SELECT organization_id FROM auth_system.users WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM auth_system.users 
            WHERE role = 'super_admin' 
            AND id = auth.uid()
        )
    );

-- ==============================================
-- COMENTARIOS EN TABLAS
-- ==============================================

COMMENT ON SCHEMA auth_system IS 'Schema para el sistema de autenticación centralizada de Gangazon';

COMMENT ON TABLE auth_system.organizations IS 'Organizaciones que usan el sistema';
COMMENT ON TABLE auth_system.users IS 'Usuarios del sistema con roles y organización';
COMMENT ON TABLE auth_system.refresh_tokens IS 'Tokens de renovación para mantener sesiones';
COMMENT ON TABLE auth_system.applications IS 'Aplicaciones registradas que pueden usar el servicio';
COMMENT ON TABLE auth_system.user_sessions IS 'Registro de sesiones de usuarios para auditoria';
COMMENT ON TABLE auth_system.audit_logs IS 'Logs de auditoria del sistema';

-- ==============================================
-- PERMISOS PARA EL SERVICE ROLE
-- ==============================================

-- Otorgar permisos al service role de Supabase
GRANT USAGE ON SCHEMA auth_system TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth_system TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth_system TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth_system TO service_role;

-- Verificar que las tablas se crearon correctamente
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'auth_system'
ORDER BY tablename;