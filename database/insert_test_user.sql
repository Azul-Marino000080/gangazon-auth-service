-- ==============================================
-- INSERTAR USUARIO DE TESTING
-- ==============================================
-- Este script crea un usuario de testing completo con:
-- - Organización de prueba
-- - Usuario con email verificado
-- - Permisos básicos
-- 
-- Credenciales del usuario:
-- Email: test@gangazon.com
-- Password: Test123!
-- ==============================================

-- 1. Crear organización de testing (si no existe)
INSERT INTO organizations (id, name, description, size, is_active) 
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Testing Organization',
    'Organización de pruebas para desarrollo y testing',
    'startup',
    true
) ON CONFLICT (name) DO NOTHING;

-- 2. Crear usuario de testing
-- Password: Test123! (hash bcrypt con salt rounds 12)
-- Puedes generar nuevos hashes con: bcrypt.hash('TuPassword', 12)
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    organization_id,
    is_active,
    email_verified,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'test@gangazon.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILNk6nMf2',  -- Test123!
    'Usuario',
    'Testing',
    'user',
    '00000000-0000-0000-0000-000000000001'::uuid,
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    is_active = EXCLUDED.is_active,
    email_verified = EXCLUDED.email_verified,
    updated_at = CURRENT_TIMESTAMP;

-- 3. Crear usuario admin de testing (opcional)
-- Password: Admin123!
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    organization_id,
    is_active,
    email_verified,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000003'::uuid,
    'testadmin@gangazon.com',
    '$2a$12$LGqG8Gn2COwZo0A9VEBOaeZBYjGdKb.PklpgcQeTPsDrRBKImOkq.',  -- Admin123!
    'Admin',
    'Testing',
    'admin',
    '00000000-0000-0000-0000-000000000001'::uuid,
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    email_verified = EXCLUDED.email_verified,
    updated_at = CURRENT_TIMESTAMP;

-- 4. Crear franquicia de testing (opcional, para tests completos)
INSERT INTO franchises (
    id,
    organization_id,
    name,
    franchisee_name,
    franchisee_email,
    franchisee_phone,
    contract_start_date,
    max_locations,
    max_employees,
    billing_tier,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Test Franchise',
    'Testing Manager',
    'testfranchise@gangazon.com',
    '+34 600 000 000',
    CURRENT_DATE,
    5,
    20,
    'standard',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (organization_id, name) DO UPDATE SET
    franchisee_email = EXCLUDED.franchisee_email,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

-- 5. Crear location de testing (opcional)
INSERT INTO locations (
    id,
    franchise_id,
    name,
    address,
    city,
    postal_code,
    country,
    phone,
    email,
    max_employees,
    timezone,
    is_active,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000005'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'Test Location Madrid',
    'Calle Falsa 123',
    'Madrid',
    '28001',
    'España',
    '+34 600 000 001',
    'testlocation@gangazon.com',
    10,
    'Europe/Madrid',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (franchise_id, name) DO UPDATE SET
    address = EXCLUDED.address,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ==============================================
-- VERIFICACIÓN
-- ==============================================

-- Mostrar información de los usuarios creados
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.is_active,
    u.email_verified,
    o.name as organization_name
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.email IN ('test@gangazon.com', 'testadmin@gangazon.com')
ORDER BY u.email;

-- Mostrar información de la organización de testing
SELECT 
    id,
    name,
    description,
    size,
    is_active,
    created_at
FROM organizations
WHERE name = 'Testing Organization';

-- Mostrar información de la franquicia de testing
SELECT 
    f.id,
    f.name,
    f.franchisee_name,
    f.franchisee_email,
    f.status,
    o.name as organization_name
FROM franchises f
JOIN organizations o ON f.organization_id = o.id
WHERE f.name = 'Test Franchise';

-- ==============================================
-- CREDENCIALES PARA TESTING
-- ==============================================
-- Usuario básico:
--   Email: test@gangazon.com
--   Password: Test123!
--   Role: user
--
-- Usuario admin:
--   Email: testadmin@gangazon.com
--   Password: Admin123!
--   Role: admin
-- ==============================================
