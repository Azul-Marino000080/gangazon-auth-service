-- Migración para agregar funcionalidades adicionales al sistema de auth

-- ==============================================
-- TABLA: password_policies
-- Almacena políticas de contraseñas por organización
-- ==============================================

CREATE TABLE IF NOT EXISTS auth_system.password_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES auth_system.organizations(id) ON DELETE CASCADE,
    min_length INTEGER DEFAULT 8,
    require_uppercase BOOLEAN DEFAULT true,
    require_lowercase BOOLEAN DEFAULT true,
    require_numbers BOOLEAN DEFAULT true,
    require_special_chars BOOLEAN DEFAULT true,
    max_age_days INTEGER DEFAULT 90, -- 0 = nunca expira
    password_history_count INTEGER DEFAULT 5, -- Últimas N contraseñas no reutilizables
    max_failed_attempts INTEGER DEFAULT 5,
    lockout_duration_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id)
);

-- ==============================================
-- TABLA: password_history
-- Almacena historial de contraseñas para evitar reutilización
-- ==============================================

CREATE TABLE IF NOT EXISTS auth_system.password_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth_system.users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- TABLA: login_attempts
-- Almacena intentos de login fallidos para seguridad
-- ==============================================

CREATE TABLE IF NOT EXISTS auth_system.login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    success BOOLEAN DEFAULT false,
    failure_reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- TABLA: api_keys
-- Almacena API keys para aplicaciones externas
-- ==============================================

CREATE TABLE IF NOT EXISTS auth_system.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    organization_id UUID NOT NULL REFERENCES auth_system.organizations(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '[]', -- Array de permisos específicos
    rate_limit_per_hour INTEGER DEFAULT 1000,
    allowed_ips INET[] DEFAULT '{}', -- Array de IPs permitidas
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth_system.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- TABLA: email_templates
-- Almacena plantillas de emails del sistema
-- ==============================================

CREATE TABLE IF NOT EXISTS auth_system.email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Variables disponibles en la plantilla
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- TABLA: notifications
-- Almacena notificaciones del sistema
-- ==============================================

CREATE TABLE IF NOT EXISTS auth_system.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth_system.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    read_at TIMESTAMP WITH TIME ZONE,
    action_url VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- ÍNDICES PARA LAS NUEVAS TABLAS
-- ==============================================

CREATE INDEX idx_password_history_user_id ON auth_system.password_history(user_id);
CREATE INDEX idx_password_history_created_at ON auth_system.password_history(created_at);

CREATE INDEX idx_login_attempts_email ON auth_system.login_attempts(email);
CREATE INDEX idx_login_attempts_ip_address ON auth_system.login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created_at ON auth_system.login_attempts(created_at);

CREATE INDEX idx_api_keys_organization_id ON auth_system.api_keys(organization_id);
CREATE INDEX idx_api_keys_key_hash ON auth_system.api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON auth_system.api_keys(is_active);

CREATE INDEX idx_notifications_user_id ON auth_system.notifications(user_id);
CREATE INDEX idx_notifications_read_at ON auth_system.notifications(read_at);
CREATE INDEX idx_notifications_created_at ON auth_system.notifications(created_at);

-- ==============================================
-- TRIGGERS PARA LAS NUEVAS TABLAS
-- ==============================================

CREATE TRIGGER update_password_policies_updated_at 
    BEFORE UPDATE ON auth_system.password_policies 
    FOR EACH ROW EXECUTE FUNCTION auth_system.update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at 
    BEFORE UPDATE ON auth_system.api_keys 
    FOR EACH ROW EXECUTE FUNCTION auth_system.update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON auth_system.email_templates 
    FOR EACH ROW EXECUTE FUNCTION auth_system.update_updated_at_column();

-- ==============================================
-- FUNCIÓN PARA LIMPIAR DATOS ANTIGUOS
-- ==============================================

CREATE OR REPLACE FUNCTION auth_system.cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Limpiar intentos de login antiguos (más de 30 días)
    DELETE FROM auth_system.login_attempts 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    -- Limpiar historial de contraseñas antiguos (mantener solo los últimos 10 por usuario)
    DELETE FROM auth_system.password_history 
    WHERE id NOT IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY user_id 
                ORDER BY created_at DESC
            ) as rn
            FROM auth_system.password_history
        ) ranked
        WHERE rn <= 10
    );
    
    -- Limpiar notificaciones leídas antiguas (más de 90 días)
    DELETE FROM auth_system.notifications 
    WHERE read_at IS NOT NULL 
    AND read_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    -- Limpiar sesiones inactivas antiguas (más de 30 días)
    DELETE FROM auth_system.user_sessions 
    WHERE is_active = false 
    AND logout_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- FUNCIÓN PARA VERIFICAR POLÍTICA DE CONTRASEÑA
-- ==============================================

CREATE OR REPLACE FUNCTION auth_system.check_password_policy(
    p_organization_id UUID,
    p_password TEXT
) RETURNS TABLE (
    is_valid BOOLEAN,
    errors TEXT[]
) AS $$
DECLARE
    policy RECORD;
    error_list TEXT[] := '{}';
    password_valid BOOLEAN := true;
BEGIN
    -- Obtener política de la organización o usar la por defecto
    SELECT * INTO policy 
    FROM auth_system.password_policies 
    WHERE organization_id = p_organization_id AND is_active = true;
    
    -- Si no hay política específica, usar valores por defecto
    IF NOT FOUND THEN
        policy.min_length := 8;
        policy.require_uppercase := true;
        policy.require_lowercase := true;
        policy.require_numbers := true;
        policy.require_special_chars := true;
    END IF;
    
    -- Verificar longitud mínima
    IF length(p_password) < policy.min_length THEN
        password_valid := false;
        error_list := array_append(error_list, 
            'La contraseña debe tener al menos ' || policy.min_length || ' caracteres');
    END IF;
    
    -- Verificar mayúsculas
    IF policy.require_uppercase AND p_password !~ '[A-Z]' THEN
        password_valid := false;
        error_list := array_append(error_list, 
            'La contraseña debe contener al menos una letra mayúscula');
    END IF;
    
    -- Verificar minúsculas
    IF policy.require_lowercase AND p_password !~ '[a-z]' THEN
        password_valid := false;
        error_list := array_append(error_list, 
            'La contraseña debe contener al menos una letra minúscula');
    END IF;
    
    -- Verificar números
    IF policy.require_numbers AND p_password !~ '[0-9]' THEN
        password_valid := false;
        error_list := array_append(error_list, 
            'La contraseña debe contener al menos un número');
    END IF;
    
    -- Verificar caracteres especiales
    IF policy.require_special_chars AND p_password !~ '[!@#$%^&*()_+\-=\[\]{};'':"|,.<>?]' THEN
        password_valid := false;
        error_list := array_append(error_list, 
            'La contraseña debe contener al menos un carácter especial');
    END IF;
    
    RETURN QUERY SELECT password_valid, error_list;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- PLANTILLAS DE EMAIL POR DEFECTO
-- ==============================================

INSERT INTO auth_system.email_templates (name, subject, body_html, body_text, variables) VALUES
('welcome', 
 'Bienvenido a {{organization_name}}', 
 '<h1>¡Bienvenido {{user_name}}!</h1><p>Tu cuenta ha sido creada exitosamente en {{organization_name}}.</p><p>Tu email: {{user_email}}</p><p>Puedes acceder a tu cuenta en: <a href="{{login_url}}">{{login_url}}</a></p>',
 'Bienvenido {{user_name}}! Tu cuenta ha sido creada exitosamente en {{organization_name}}. Tu email: {{user_email}}. Puedes acceder en: {{login_url}}',
 '["user_name", "user_email", "organization_name", "login_url"]'),

('password_reset',
 'Restablecer contraseña - {{organization_name}}',
 '<h2>Restablecer contraseña</h2><p>Hola {{user_name}},</p><p>Hemos recibido una solicitud para restablecer tu contraseña.</p><p><a href="{{reset_url}}">Haz clic aquí para restablecer tu contraseña</a></p><p>Este enlace expira en 1 hora.</p><p>Si no solicitaste este cambio, ignora este email.</p>',
 'Hola {{user_name}}, hemos recibido una solicitud para restablecer tu contraseña. Visita este enlace: {{reset_url}} (expira en 1 hora). Si no solicitaste este cambio, ignora este email.',
 '["user_name", "reset_url", "organization_name"]'),

('email_verification',
 'Verificar email - {{organization_name}}',
 '<h2>Verificar tu email</h2><p>Hola {{user_name}},</p><p>Por favor verifica tu dirección de email haciendo clic en el siguiente enlace:</p><p><a href="{{verification_url}}">Verificar email</a></p><p>Este enlace expira en 24 horas.</p>',
 'Hola {{user_name}}, por favor verifica tu email visitando: {{verification_url}} (expira en 24 horas).',
 '["user_name", "verification_url", "organization_name"]')
ON CONFLICT (name) DO NOTHING;

-- ==============================================
-- POLÍTICAS DE CONTRASEÑA POR DEFECTO
-- ==============================================

-- Crear política por defecto para la organización del sistema
INSERT INTO auth_system.password_policies (
    organization_id, 
    min_length, 
    require_uppercase, 
    require_lowercase, 
    require_numbers, 
    require_special_chars, 
    max_age_days, 
    password_history_count,
    max_failed_attempts,
    lockout_duration_minutes
) VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', -- ID de la organización del sistema
    12, -- Contraseñas más seguras para admins
    true,
    true,
    true,
    true,
    60, -- Cambio cada 60 días
    10, -- Recordar últimas 10 contraseñas
    3,  -- Máximo 3 intentos fallidos
    60  -- Bloqueo por 1 hora
) ON CONFLICT (organization_id) DO NOTHING;

-- Otorgar permisos para las nuevas tablas
GRANT ALL ON ALL TABLES IN SCHEMA auth_system TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth_system TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth_system TO service_role;

-- Verificar que todo se creó correctamente
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'auth_system'
ORDER BY table_name;