-- =============================================================================
-- GANGAZON AUTH SERVICE - SCHEMA COMPLETO
-- Sistema de autenticación para franquicia única con múltiples franquiciados
-- Fecha: 2025-10-12
-- Versión: 2.0 (Simplificada)
-- =============================================================================

-- ESTRUCTURA:
-- GANGAZON (Franquicia matriz)
--   ├── Franquiciado A → Local 1, Local 2, Local 3
--   ├── Franquiciado B → Local 1, Local 2
--   └── Franquiciado C → Local 1

-- ROLES: admin, franchisee, manager, supervisor, employee, viewer

-- =============================================================================
-- EXTENSIONES
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. TABLA: organizations (mantenida para compatibilidad)
-- =============================================================================
-- Nota: En esta versión solo existirá una organización: "Gangazon"

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    website VARCHAR(255),
    industry VARCHAR(100),
    size VARCHAR(20) CHECK (size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE organizations IS 'Organización única: Gangazon (mantenida para futura escalabilidad)';

-- Índices
CREATE INDEX idx_organizations_is_active ON organizations(is_active);

-- Nota: La organización "Gangazon" debe crearse manualmente después del despliegue
-- o mediante el endpoint de emergency/create-admin que la crea automáticamente

-- =============================================================================
-- 2. TABLA: users
-- =============================================================================
-- Todos los usuarios del sistema (admins, franquiciados, managers, empleados)

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    
    -- Rol simplificado (6 roles)
    role VARCHAR(50) NOT NULL DEFAULT 'employee' 
        CHECK (role IN ('admin', 'franchisee', 'manager', 'supervisor', 'employee', 'viewer')),
    
    organization_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    
    -- Auditoría
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Metadata adicional
    phone VARCHAR(20),
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}'
);

COMMENT ON TABLE users IS 'Usuarios del sistema con 6 roles simplificados';
COMMENT ON COLUMN users.role IS 'admin: Admin Gangazon | franchisee: Dueño franquicia | manager: Gerente local | supervisor: Supervisor | employee: Empleado | viewer: Solo lectura';

-- Índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- =============================================================================
-- 3. TABLA: refresh_tokens
-- =============================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

COMMENT ON TABLE refresh_tokens IS 'Tokens de refresco para autenticación JWT';

-- Índices
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Limpiar tokens expirados automáticamente
CREATE OR REPLACE FUNCTION clean_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. TABLA: franchises (FRANQUICIADOS)
-- =============================================================================
-- Cada franquiciado puede tener múltiples locales

CREATE TABLE IF NOT EXISTS franchises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    
    -- Información del franquiciado
    name VARCHAR(100) NOT NULL,
    franchisee_name VARCHAR(100) NOT NULL,
    franchisee_email VARCHAR(255) NOT NULL,
    franchisee_phone VARCHAR(20),
    
    -- Contrato
    contract_start_date DATE NOT NULL,
    contract_end_date DATE,
    
    -- Límites
    max_locations INTEGER DEFAULT 1 CHECK (max_locations > 0),
    max_employees INTEGER DEFAULT 10 CHECK (max_employees > 0),
    
    -- Facturación
    billing_tier VARCHAR(20) DEFAULT 'basic' CHECK (billing_tier IN ('basic', 'standard', 'premium')),
    
    -- Estado
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated', 'pending')),
    
    -- Configuración personalizada
    settings JSONB DEFAULT '{}',
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraint único
    UNIQUE(organization_id, name)
);

COMMENT ON TABLE franchises IS 'Franquiciados de Gangazon - cada uno puede gestionar múltiples locales';

-- Índices
CREATE INDEX idx_franchises_organization_id ON franchises(organization_id);
CREATE INDEX idx_franchises_status ON franchises(status);
CREATE INDEX idx_franchises_franchisee_email ON franchises(franchisee_email);
CREATE INDEX idx_franchises_created_at ON franchises(created_at DESC);

-- =============================================================================
-- 5. TABLA: locations (LOCALES)
-- =============================================================================
-- Locales físicos de cada franquiciado

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
    
    -- Información del local
    name VARCHAR(100) NOT NULL,
    address VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10),
    country VARCHAR(50) DEFAULT 'España',
    
    -- Contacto
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Gestión
    manager_id UUID REFERENCES users(id),
    max_employees INTEGER DEFAULT 5 CHECK (max_employees > 0),
    
    -- Operación
    operating_hours JSONB DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    
    -- Geolocalización
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    
    -- Configuración
    settings JSONB DEFAULT '{}',
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraint único
    UNIQUE(franchise_id, name)
);

COMMENT ON TABLE locations IS 'Locales físicos de cada franquiciado';

-- Índices
CREATE INDEX idx_locations_franchise_id ON locations(franchise_id);
CREATE INDEX idx_locations_manager_id ON locations(manager_id);
CREATE INDEX idx_locations_is_active ON locations(is_active);
CREATE INDEX idx_locations_city ON locations(city);
CREATE INDEX idx_locations_coordinates ON locations(latitude, longitude);

-- =============================================================================
-- 6. TABLA: employee_assignments (ASIGNACIONES)
-- =============================================================================
-- Asigna empleados a locales específicos

CREATE TABLE IF NOT EXISTS employee_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    
    -- Rol en el local
    role_at_location VARCHAR(20) DEFAULT 'employee' 
        CHECK (role_at_location IN ('manager', 'supervisor', 'employee')),
    
    -- Período
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Tipo de jornada
    shift_type VARCHAR(20) DEFAULT 'full_time' 
        CHECK (shift_type IN ('full_time', 'part_time', 'temporary', 'cover')),
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoría
    assigned_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Un empleado puede estar en múltiples locales, pero verificar fechas
    CHECK (end_date IS NULL OR end_date > start_date)
);

COMMENT ON TABLE employee_assignments IS 'Asignación de empleados a locales específicos';

-- Índices
CREATE INDEX idx_assignments_user_id ON employee_assignments(user_id);
CREATE INDEX idx_assignments_location_id ON employee_assignments(location_id);
CREATE INDEX idx_assignments_is_active ON employee_assignments(is_active);
CREATE INDEX idx_assignments_dates ON employee_assignments(start_date, end_date);
CREATE INDEX idx_assignments_location_active ON employee_assignments(location_id, is_active);

-- =============================================================================
-- 7. TABLA: employee_checkins (FICHAJES)
-- =============================================================================
-- Registro de entrada/salida de empleados

CREATE TABLE IF NOT EXISTS employee_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES employee_assignments(id),
    
    -- Check-in
    check_in_time TIMESTAMP NOT NULL DEFAULT NOW(),
    check_in_method VARCHAR(20) DEFAULT 'manual' 
        CHECK (check_in_method IN ('manual', 'gps', 'qr_code', 'nfc')),
    check_in_latitude DECIMAL(10, 8),
    check_in_longitude DECIMAL(11, 8),
    
    -- Check-out
    check_out_time TIMESTAMP,
    check_out_latitude DECIMAL(10, 8),
    check_out_longitude DECIMAL(11, 8),
    
    -- Descansos (en minutos)
    break_duration INTEGER DEFAULT 0,
    
    -- Verificación
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    
    -- Notas
    notes TEXT,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Validación
    CHECK (check_out_time IS NULL OR check_out_time > check_in_time)
);

COMMENT ON TABLE employee_checkins IS 'Registro de fichajes (check-in/check-out) de empleados';

-- Índices
CREATE INDEX idx_checkins_user_id ON employee_checkins(user_id);
CREATE INDEX idx_checkins_location_id ON employee_checkins(location_id);
CREATE INDEX idx_checkins_check_in_time ON employee_checkins(check_in_time DESC);
CREATE INDEX idx_checkins_location_date ON employee_checkins(location_id, check_in_time);
CREATE INDEX idx_checkins_user_date ON employee_checkins(user_id, check_in_time DESC);

-- =============================================================================
-- 8. TABLA: audit_logs (AUDITORÍA)
-- =============================================================================
-- Registro de acciones importantes

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Registro de auditoría de acciones del sistema';

-- Índices
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =============================================================================
-- 9. FUNCIONES AUXILIARES
-- =============================================================================

-- Función: Verificar si empleado puede trabajar en un local
CREATE OR REPLACE FUNCTION can_employee_work_at_location(
    p_user_id UUID,
    p_location_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_assignment BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM employee_assignments
        WHERE user_id = p_user_id
          AND location_id = p_location_id
          AND is_active = true
          AND start_date <= CURRENT_DATE
          AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ) INTO v_has_assignment;
    
    RETURN v_has_assignment;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener empleados activos en un local
CREATE OR REPLACE FUNCTION get_location_active_employees(p_location_id UUID)
RETURNS TABLE (
    user_id UUID,
    full_name VARCHAR,
    email VARCHAR,
    role_at_location VARCHAR,
    is_checked_in BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        CONCAT(u.first_name, ' ', u.last_name),
        u.email,
        ea.role_at_location,
        EXISTS (
            SELECT 1 FROM employee_checkins ec
            WHERE ec.user_id = u.id
              AND ec.location_id = p_location_id
              AND ec.check_out_time IS NULL
              AND ec.check_in_time::date = CURRENT_DATE
        ) as is_checked_in
    FROM users u
    INNER JOIN employee_assignments ea ON ea.user_id = u.id
    WHERE ea.location_id = p_location_id
      AND ea.is_active = true
      AND ea.start_date <= CURRENT_DATE
      AND (ea.end_date IS NULL OR ea.end_date >= CURRENT_DATE)
      AND u.is_active = true
    ORDER BY ea.role_at_location, u.last_name;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular horas trabajadas
CREATE OR REPLACE FUNCTION calculate_worked_hours(
    p_checkin_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
    v_check_in TIMESTAMP;
    v_check_out TIMESTAMP;
    v_break_duration INTEGER;
    v_hours NUMERIC;
BEGIN
    SELECT check_in_time, check_out_time, COALESCE(break_duration, 0)
    INTO v_check_in, v_check_out, v_break_duration
    FROM employee_checkins
    WHERE id = p_checkin_id;
    
    IF v_check_out IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Calcular horas (restar descansos)
    v_hours := EXTRACT(EPOCH FROM (v_check_out - v_check_in)) / 3600;
    v_hours := v_hours - (v_break_duration / 60.0);
    
    RETURN ROUND(v_hours, 2);
END;
$$ LANGUAGE plpgsql;

-- Función: Verificar límites de franquicia
CREATE OR REPLACE FUNCTION check_franchise_limits(p_franchise_id UUID)
RETURNS TABLE (
    current_locations INTEGER,
    max_locations INTEGER,
    current_employees INTEGER,
    max_employees INTEGER,
    can_add_location BOOLEAN,
    can_add_employee BOOLEAN
) AS $$
DECLARE
    v_franchise franchises%ROWTYPE;
    v_current_locations INTEGER;
    v_current_employees INTEGER;
BEGIN
    SELECT * INTO v_franchise FROM franchises WHERE id = p_franchise_id;
    
    SELECT COUNT(*) INTO v_current_locations
    FROM locations WHERE franchise_id = p_franchise_id AND is_active = true;
    
    SELECT COUNT(DISTINCT ea.user_id) INTO v_current_employees
    FROM employee_assignments ea
    INNER JOIN locations l ON l.id = ea.location_id
    WHERE l.franchise_id = p_franchise_id AND ea.is_active = true;
    
    RETURN QUERY SELECT
        v_current_locations,
        v_franchise.max_locations,
        v_current_employees,
        v_franchise.max_employees,
        v_current_locations < v_franchise.max_locations,
        v_current_employees < v_franchise.max_employees;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 10. VISTAS
-- =============================================================================

-- Vista: Estadísticas de franquicias
CREATE OR REPLACE VIEW v_franchise_stats AS
SELECT 
    f.id as franchise_id,
    f.name as franchise_name,
    f.franchisee_name,
    f.status,
    f.billing_tier,
    COUNT(DISTINCT l.id) as total_locations,
    COUNT(DISTINCT CASE WHEN l.is_active THEN l.id END) as active_locations,
    COUNT(DISTINCT ea.user_id) as total_employees,
    COUNT(DISTINCT CASE WHEN ea.is_active THEN ea.user_id END) as active_employees,
    COUNT(DISTINCT ec.id) FILTER (WHERE ec.check_in_time::date = CURRENT_DATE) as today_checkins,
    f.max_locations,
    f.max_employees,
    f.created_at
FROM franchises f
LEFT JOIN locations l ON l.franchise_id = f.id
LEFT JOIN employee_assignments ea ON ea.location_id = l.id
LEFT JOIN employee_checkins ec ON ec.location_id = l.id
GROUP BY f.id, f.name, f.franchisee_name, f.status, f.billing_tier, f.max_locations, f.max_employees, f.created_at;

-- Vista: Estadísticas de locales
CREATE OR REPLACE VIEW v_location_stats AS
SELECT 
    l.id as location_id,
    l.name as location_name,
    l.city,
    l.is_active,
    f.name as franchise_name,
    CONCAT(m.first_name, ' ', m.last_name) as manager_name,
    COUNT(DISTINCT ea.user_id) as total_employees,
    COUNT(DISTINCT CASE WHEN ea.is_active THEN ea.user_id END) as active_employees,
    COUNT(DISTINCT ec.id) FILTER (WHERE ec.check_in_time::date = CURRENT_DATE) as today_checkins,
    COUNT(DISTINCT ec.id) FILTER (WHERE ec.check_in_time::date = CURRENT_DATE AND ec.check_out_time IS NULL) as currently_checked_in,
    l.max_employees,
    l.created_at
FROM locations l
INNER JOIN franchises f ON f.id = l.franchise_id
LEFT JOIN users m ON m.id = l.manager_id
LEFT JOIN employee_assignments ea ON ea.location_id = l.id
LEFT JOIN employee_checkins ec ON ec.location_id = l.id
GROUP BY l.id, l.name, l.city, l.is_active, f.name, m.first_name, m.last_name, l.max_employees, l.created_at;

-- =============================================================================
-- 11. TRIGGERS
-- =============================================================================

-- Trigger: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_franchises_updated_at BEFORE UPDATE ON franchises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON employee_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checkins_updated_at BEFORE UPDATE ON employee_checkins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 12. DATOS INICIALES
-- =============================================================================

-- NO SE INCLUYEN DATOS DE PRUEBA
-- Usa el endpoint /api/emergency/create-admin para crear el primer usuario administrador
-- Ver: docs/GUIA_RAPIDA_DESPLIEGUE.md

-- =============================================================================
-- 13. PERMISOS Y SEGURIDAD
-- =============================================================================

-- Row Level Security (RLS) - Opcional, descomentar si se usa Supabase
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE employee_assignments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE employee_checkins ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 14. VERIFICACIÓN
-- =============================================================================

-- Verificar que todo se creó correctamente
SELECT 
    'organizations' as table_name, COUNT(*) as records FROM organizations
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'franchises', COUNT(*) FROM franchises
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'employee_assignments', COUNT(*) FROM employee_assignments
UNION ALL
SELECT 'employee_checkins', COUNT(*) FROM employee_checkins;

-- =============================================================================
-- FIN DEL SCHEMA
-- =============================================================================

SELECT 'Schema de Gangazon Auth Service creado exitosamente!' as message;
SELECT 'Base de datos limpia - Sin datos de prueba' as status;
SELECT 'Usar /api/emergency/create-admin para crear primer usuario' as next_step;
