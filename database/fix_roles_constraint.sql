-- ==============================================
-- FIX: Actualizar constraint de roles en tabla users
-- ==============================================
-- Este script debe ejecutarse en la base de datos para corregir
-- la incompatibilidad entre los roles usados en la API y los
-- permitidos por el CHECK constraint de la base de datos.
-- 
-- Fecha: 2025-10-12
-- Motivo: La API usa roles adicionales que no están en el constraint
-- ==============================================

-- 1. Eliminar el constraint actual (usar DO block para IF EXISTS)
DO $$ 
BEGIN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- 2. Crear el nuevo constraint con todos los roles necesarios
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'user',                    -- Usuario regular
    'admin',                   -- Administrador de organización
    'super_admin',             -- Super administrador del sistema
    'franchisor_admin',        -- Administrador de casa matriz
    'franchisor_ceo',          -- CEO de casa matriz (usado en la API)
    'franchisee_admin',        -- Administrador de franquicia
    'franchisee_owner',        -- Propietario de franquicia (usado en la API)
    'location_manager',        -- Manager de local
    'location_supervisor'      -- Supervisor de local (usado en la API)
  )
);

-- 3. Verificar el nuevo constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
  AND conname = 'users_role_check';

-- ==============================================
-- NOTA: Este script debe ejecutarse con permisos
-- suficientes para modificar la estructura de la BD.
-- Si se ejecuta en producción, coordinar con el equipo
-- para evitar downtime y asegurar que no haya usuarios
-- con roles incompatibles.
-- ==============================================
