-- EXTENSIÓN AL ESQUEMA PARA FRANQUICIAS Y LOCALES
-- Agregar estas tablas después del schema principal

-- ==============================================
-- TABLA: franchises
-- Almacena información de las franquicias
-- ==============================================

CREATE TABLE auth_system.franchises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES auth_system.organizations(id) ON DELETE CASCADE,
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

CREATE TABLE auth_system.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID NOT NULL REFERENCES auth_system.franchises(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10),
    country VARCHAR(50) DEFAULT 'España',
    phone VARCHAR(20),
    email VARCHAR(255),
    manager_id UUID REFERENCES auth_system.users(id) ON DELETE SET NULL,
    max_employees INTEGER DEFAULT 5,
    operating_hours JSONB DEFAULT '{}', -- {"monday": {"open": "09:00", "close": "21:00"}, ...}
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    coordinates POINT, -- Para validación GPS
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

CREATE TABLE auth_system.employee_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth_system.users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES auth_system.locations(id) ON DELETE CASCADE,
    role_at_location VARCHAR(50) NOT NULL DEFAULT 'employee',
    start_date DATE NOT NULL,
    end_date DATE,
    shift_type VARCHAR(20) DEFAULT 'full_time' CHECK (shift_type IN ('full_time', 'part_time', 'temporary', 'cover')),
    assigned_by UUID NOT NULL REFERENCES auth_system.users(id),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- TABLA: employee_checkins
-- Control de presencia por local
-- ==============================================

CREATE TABLE auth_system.employee_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth_system.users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES auth_system.locations(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES auth_system.employee_assignments(id) ON DELETE SET NULL,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP WITH TIME ZONE,
    check_in_method VARCHAR(20) DEFAULT 'manual' CHECK (check_in_method IN ('manual', 'gps', 'qr_code', 'nfc')),
    check_in_location POINT, -- GPS coordinates del check-in
    shift_type VARCHAR(20) DEFAULT 'regular',
    hours_worked INTERVAL GENERATED ALWAYS AS (check_out_time - check_in_time) STORED,
    break_duration INTERVAL DEFAULT '0 minutes',
    notes TEXT,
    verified_by UUID REFERENCES auth_system.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- TABLA: location_permissions
-- Permisos específicos por local
-- ==============================================

CREATE TABLE auth_system.location_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth_system.users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES auth_system.locations(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    granted_by UUID NOT NULL REFERENCES auth_system.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(user_id, location_id, permission)
);

-- ==============================================
-- TABLA: franchise_settings
-- Configuraciones específicas por franquicia
-- ==============================================

CREATE TABLE auth_system.franchise_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID NOT NULL REFERENCES auth_system.franchises(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    updated_by UUID NOT NULL REFERENCES auth_system.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(franchise_id, setting_key)
);

-- ==============================================
-- ÍNDICES PARA RENDIMIENTO
-- ==============================================

-- Franchises
CREATE INDEX idx_franchises_organization_id ON auth_system.franchises(organization_id);
CREATE INDEX idx_franchises_status ON auth_system.franchises(status);
CREATE INDEX idx_franchises_franchisee_email ON auth_system.franchises(franchisee_email);

-- Locations
CREATE INDEX idx_locations_franchise_id ON auth_system.locations(franchise_id);
CREATE INDEX idx_locations_manager_id ON auth_system.locations(manager_id);
CREATE INDEX idx_locations_is_active ON auth_system.locations(is_active);
CREATE INDEX idx_locations_city ON auth_system.locations(city);

-- Employee Assignments
CREATE INDEX idx_assignments_user_id ON auth_system.employee_assignments(user_id);
CREATE INDEX idx_assignments_location_id ON auth_system.employee_assignments(location_id);
CREATE INDEX idx_assignments_active ON auth_system.employee_assignments(is_active);
CREATE INDEX idx_assignments_date_range ON auth_system.employee_assignments(start_date, end_date);

-- Employee Checkins
CREATE INDEX idx_checkins_user_id ON auth_system.employee_checkins(user_id);
CREATE INDEX idx_checkins_location_id ON auth_system.employee_checkins(location_id);
CREATE INDEX idx_checkins_check_in_time ON auth_system.employee_checkins(check_in_time);
CREATE INDEX idx_checkins_date ON auth_system.employee_checkins(check_in_time::date);

-- Location Permissions
CREATE INDEX idx_location_permissions_user_id ON auth_system.location_permissions(user_id);
CREATE INDEX idx_location_permissions_location_id ON auth_system.location_permissions(location_id);
CREATE INDEX idx_location_permissions_active ON auth_system.location_permissions(is_active);

-- ==============================================
-- TRIGGERS PARA UPDATED_AT
-- ==============================================

CREATE TRIGGER update_franchises_updated_at 
    BEFORE UPDATE ON auth_system.franchises 
    FOR EACH ROW EXECUTE FUNCTION auth_system.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at 
    BEFORE UPDATE ON auth_system.locations 
    FOR EACH ROW EXECUTE FUNCTION auth_system.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at 
    BEFORE UPDATE ON auth_system.employee_assignments 
    FOR EACH ROW EXECUTE FUNCTION auth_system.update_updated_at_column();

-- ==============================================
-- FUNCIONES DE UTILIDAD
-- ==============================================

-- Función para obtener la ubicación actual de un empleado
CREATE OR REPLACE FUNCTION auth_system.get_employee_current_location(p_user_id UUID)
RETURNS TABLE (
    location_id UUID,
    location_name VARCHAR,
    checked_in_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.name,
        c.check_in_time
    FROM auth_system.employee_checkins c
    JOIN auth_system.locations l ON c.location_id = l.id
    WHERE c.user_id = p_user_id 
    AND c.check_out_time IS NULL
    AND c.check_in_time::date = CURRENT_DATE
    ORDER BY c.check_in_time DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si un empleado puede trabajar en un local
CREATE OR REPLACE FUNCTION auth_system.can_employee_work_at_location(
    p_user_id UUID,
    p_location_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS BOOLEAN AS $$
DECLARE
    has_assignment BOOLEAN := false;
BEGIN
    -- Verificar si tiene asignación activa para esa fecha
    SELECT EXISTS(
        SELECT 1 FROM auth_system.employee_assignments
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
CREATE OR REPLACE FUNCTION auth_system.get_location_active_employees(p_location_id UUID)
RETURNS TABLE (
    user_id UUID,
    user_email VARCHAR,
    user_name VARCHAR,
    check_in_time TIMESTAMP WITH TIME ZONE,
    role_at_location VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        CONCAT(u.first_name, ' ', u.last_name),
        c.check_in_time,
        COALESCE(a.role_at_location, 'employee')
    FROM auth_system.employee_checkins c
    JOIN auth_system.users u ON c.user_id = u.id
    LEFT JOIN auth_system.employee_assignments a ON c.assignment_id = a.id
    WHERE c.location_id = p_location_id
    AND c.check_out_time IS NULL
    AND c.check_in_time::date = CURRENT_DATE
    ORDER BY c.check_in_time;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ==============================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE auth_system.franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.employee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.employee_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_system.location_permissions ENABLE ROW LEVEL SECURITY;

-- Política para franchises - usuarios pueden ver franquicias de su organización
CREATE POLICY "Users can view franchises in their organization" ON auth_system.franchises
    FOR SELECT USING (
        organization_id = (
            SELECT organization_id FROM auth_system.users WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM auth_system.users 
            WHERE role IN ('super_admin', 'franchisor_admin') 
            AND id = auth.uid()
        )
    );

-- Política para locations - usuarios pueden ver locales de su franquicia/organización
CREATE POLICY "Users can view locations in their franchise" ON auth_system.locations
    FOR SELECT USING (
        franchise_id IN (
            SELECT f.id FROM auth_system.franchises f
            JOIN auth_system.users u ON f.organization_id = u.organization_id
            WHERE u.id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM auth_system.users 
            WHERE role IN ('super_admin', 'franchisor_admin') 
            AND id = auth.uid()
        )
    );

-- ==============================================
-- DATOS INICIALES PARA PRUEBAS
-- ==============================================

-- Insertar franquicia de ejemplo (solo si no existe)
INSERT INTO auth_system.franchises (
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
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', -- ID de la organización del sistema
    'Franquicia Madrid Centro',
    'Juan Pérez García',
    'juan.perez@franquicia-madrid.com',
    CURRENT_DATE,
    5,
    25
) ON CONFLICT DO NOTHING;

-- Insertar locales de ejemplo
INSERT INTO auth_system.locations (
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

-- Otorgar permisos para las nuevas tablas
GRANT ALL ON ALL TABLES IN SCHEMA auth_system TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth_system TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth_system TO service_role;

-- Verificar la creación
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'auth_system'
AND table_name IN ('franchises', 'locations', 'employee_assignments', 'employee_checkins', 'location_permissions')
ORDER BY table_name;