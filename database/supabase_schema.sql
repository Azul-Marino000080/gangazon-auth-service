-- ==============================================
-- SCHEMA COMPLETO PARA GANGAZON AUTH SERVICE
-- Usando schema PUBLIC para máxima compatibilidad
-- ==============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================
-- TABLA: organizations
-- Almacena información de las organizaciones
-- ==============================================

CREATE TABLE organizations (
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
CREATE INDEX idx_organizations_name ON organizations(name);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);

-- ==============================================
-- TABLA: users
-- Almacena información de los usuarios
-- ==============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role VARCHAR(30) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin', 'franchisor_admin', 'franchisee_admin', 'location_manager')),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
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
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);

-- ==============================================
-- TABLA: refresh_tokens
-- Almacena los refresh tokens para mantener sesiones
-- ==============================================

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para refresh_tokens
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ==============================================
-- TABLA: applications
-- Almacena las aplicaciones registradas que pueden usar el servicio de auth
-- ==============================================

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    api_key VARCHAR(255) NOT NULL UNIQUE,
    allowed_origins TEXT, -- Orígenes permitidos para CORS (separados por comas)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para applications
CREATE INDEX idx_applications_organization_id ON applications(organization_id);
CREATE INDEX idx_applications_api_key ON applications(api_key);
CREATE INDEX idx_applications_is_active ON applications(is_active);

-- ==============================================
-- TABLA: user_sessions
-- Almacena información de sesiones activas para auditoria
-- ==============================================

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    ip_address VARCHAR(45), -- IPv4 o IPv6
    user_agent TEXT,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    logout_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Índices para user_sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_application_id ON user_sessions(application_id);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_login_at ON user_sessions(login_at);

-- ==============================================
-- TABLA: audit_logs
-- Almacena logs de auditoria del sistema
-- ==============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45), -- IPv4 o IPv6
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para audit_logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ==============================================
-- TABLA: franchises
-- Almacena información de las franquicias
-- ==============================================

CREATE TABLE franchises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    franchisee_name VARCHAR(100) NOT NULL,
    franchisee_email VARCHAR(255) NOT NULL,
    franchisee_phone VARCHAR(20),
    contract_start_date DATE NOT NULL,
    contract_end_date DATE,
    max_locations INTEGER DEFAULT 1,
    max_employees INTEGER DEFAULT 10,
    billing_tier VARCHAR(20) DEFAULT 'basic' CHECK (billing_tier IN ('basic', 'standard', 'premium')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated', 'pending')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, name)
);

-- ==============================================
-- TABLA: locations
-- Almacena información de los locales por franquicia
-- ==============================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10),
    country VARCHAR(50) DEFAULT 'España',
    phone VARCHAR(20),
    email VARCHAR(255),
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    max_employees INTEGER DEFAULT 5,
    operating_hours JSONB DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    latitude DECIMAL(10, 8), -- Coordenadas GPS
    longitude DECIMAL(11, 8), -- Coordenadas GPS
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(franchise_id, name)
);

-- ==============================================
-- TABLA: employee_assignments
-- Asignaciones de empleados a locales (rotativo)
-- ==============================================

CREATE TABLE employee_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    role_at_location VARCHAR(50) NOT NULL DEFAULT 'employee',
    start_date DATE NOT NULL,
    end_date DATE,
    shift_type VARCHAR(20) DEFAULT 'full_time' CHECK (shift_type IN ('full_time', 'part_time', 'temporary', 'cover')),
    assigned_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- TABLA: employee_checkins
-- Control de presencia por local
-- ==============================================

CREATE TABLE employee_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES employee_assignments(id) ON DELETE SET NULL,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP WITH TIME ZONE,
    check_in_method VARCHAR(20) DEFAULT 'manual' CHECK (check_in_method IN ('manual', 'gps', 'qr_code', 'nfc')),
    check_in_latitude DECIMAL(10, 8), -- GPS coordinates del check-in
    check_in_longitude DECIMAL(11, 8), -- GPS coordinates del check-in
    shift_type VARCHAR(20) DEFAULT 'regular',
    break_duration INTEGER DEFAULT 0, -- Duración del descanso en minutos
    notes TEXT,
    verified_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- TABLA: location_permissions
-- Permisos específicos por local
-- ==============================================

CREATE TABLE location_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(user_id, location_id, permission)
);

-- ==============================================
-- ÍNDICES ADICIONALES
-- ==============================================

-- Franchises
CREATE INDEX idx_franchises_organization_id ON franchises(organization_id);
CREATE INDEX idx_franchises_status ON franchises(status);
CREATE INDEX idx_franchises_franchisee_email ON franchises(franchisee_email);

-- Locations
CREATE INDEX idx_locations_franchise_id ON locations(franchise_id);
CREATE INDEX idx_locations_manager_id ON locations(manager_id);
CREATE INDEX idx_locations_is_active ON locations(is_active);
CREATE INDEX idx_locations_city ON locations(city);

-- Employee Assignments
CREATE INDEX idx_assignments_user_id ON employee_assignments(user_id);
CREATE INDEX idx_assignments_location_id ON employee_assignments(location_id);
CREATE INDEX idx_assignments_active ON employee_assignments(is_active);
CREATE INDEX idx_assignments_date_range ON employee_assignments(start_date, end_date);

-- Employee Checkins
CREATE INDEX idx_checkins_user_id ON employee_checkins(user_id);
CREATE INDEX idx_checkins_location_id ON employee_checkins(location_id);
CREATE INDEX idx_checkins_check_in_time ON employee_checkins(check_in_time);
-- Omitimos el índice de fecha funcional por compatibilidad

-- Location Permissions
CREATE INDEX idx_location_permissions_user_id ON location_permissions(user_id);
CREATE INDEX idx_location_permissions_location_id ON location_permissions(location_id);
CREATE INDEX idx_location_permissions_active ON location_permissions(is_active);

-- ==============================================
-- FUNCIONES Y TRIGGERS
-- ==============================================

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at 
    BEFORE UPDATE ON applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_franchises_updated_at 
    BEFORE UPDATE ON franchises 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at 
    BEFORE UPDATE ON locations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at 
    BEFORE UPDATE ON employee_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- FUNCIONES DE UTILIDAD
-- ==============================================

-- Función para obtener la ubicación actual de un empleado
CREATE OR REPLACE FUNCTION get_employee_current_location(p_user_id UUID)
RETURNS TABLE (
    location_id UUID,
    location_name VARCHAR(100),
    checked_in_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.name,
        c.check_in_time
    FROM employee_checkins c
    JOIN locations l ON c.location_id = l.id
    WHERE c.user_id = p_user_id 
    AND c.check_out_time IS NULL
    AND c.check_in_time >= CURRENT_DATE
    AND c.check_in_time < CURRENT_DATE + INTERVAL '1 day'
    ORDER BY c.check_in_time DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si un empleado puede trabajar en un local
CREATE OR REPLACE FUNCTION can_employee_work_at_location(
    p_user_id UUID,
    p_location_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS BOOLEAN AS $$
DECLARE
    has_assignment BOOLEAN := false;
BEGIN
    -- Verificar si tiene asignación activa para esa fecha
    SELECT EXISTS(
        SELECT 1 FROM employee_assignments
        WHERE user_id = p_user_id 
        AND location_id = p_location_id
        AND is_active = true
        AND start_date <= p_date
        AND (end_date IS NULL OR end_date >= p_date)
    ) INTO has_assignment;
    
    RETURN has_assignment;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener empleados activos en un local
CREATE OR REPLACE FUNCTION get_location_active_employees(p_location_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_email VARCHAR(255),
    user_name VARCHAR(101),
    check_in_time TIMESTAMP WITH TIME ZONE,
    role_at_location VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        (u.first_name || ' ' || u.last_name),
        c.check_in_time,
        COALESCE(a.role_at_location, 'employee')
    FROM employee_checkins c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN employee_assignments a ON c.assignment_id = a.id
    WHERE c.location_id = p_location_id
    AND c.check_out_time IS NULL
    AND c.check_in_time >= CURRENT_DATE
    AND c.check_in_time < CURRENT_DATE + INTERVAL '1 day'
    ORDER BY c.check_in_time;
END;
$$ LANGUAGE plpgsql;

-- Función de limpieza de tokens expirados
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    -- Eliminar refresh tokens expirados
    DELETE FROM refresh_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Marcar sesiones como inactivas si no tienen logout_at después de 24 horas
    UPDATE user_sessions 
    SET is_active = false, logout_at = CURRENT_TIMESTAMP
    WHERE is_active = true 
      AND login_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
      AND logout_at IS NULL;
      
    -- Eliminar logs de auditoria antiguos (más de 1 año)
    DELETE FROM audit_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- DATOS INICIALES
-- ==============================================

-- Crear organización por defecto para super admin
INSERT INTO organizations (id, name, description, size) 
VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'Gangazon System',
    'Organización del sistema para administradores',
    'enterprise'
) ON CONFLICT (name) DO NOTHING;

-- Crear usuario super admin por defecto
-- Contraseña: Admin123! (cambiar inmediatamente en producción)
INSERT INTO users (
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

-- Insertar franquicia de ejemplo (solo si no existe)
INSERT INTO franchises (
    id,
    organization_id,
    name,
    franchisee_name,
    franchisee_email,
    contract_start_date,
    max_locations,
    max_employees
) VALUES (
    'fran-aaaa-bbbb-cccc-dddddddddddd',
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'Franquicia Madrid Centro',
    'Juan Pérez García',
    'juan.perez@franquicia-madrid.com',
    CURRENT_DATE,
    5,
    25
) ON CONFLICT DO NOTHING;

-- Insertar locales de ejemplo
INSERT INTO locations (
    id,
    franchise_id,
    name,
    address,
    city,
    postal_code
) VALUES 
(
    'loc1-aaaa-bbbb-cccc-dddddddddddd',
    'fran-aaaa-bbbb-cccc-dddddddddddd',
    'Local Centro',
    'Calle Mayor, 15',
    'Madrid',
    '28001'
),
(
    'loc2-aaaa-bbbb-cccc-dddddddddddd',
    'fran-aaaa-bbbb-cccc-dddddddddddd',
    'Local Norte',
    'Avenida de América, 88',
    'Madrid',
    '28028'
) ON CONFLICT DO NOTHING;

-- ==============================================
-- VERIFICACIÓN
-- ==============================================

-- Verificar que las tablas se crearon correctamente
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('organizations', 'users', 'franchises', 'locations', 'employee_assignments', 'employee_checkins')
ORDER BY table_name;