-- ============================================
-- MIGRACIÓN: Simplificar permisos a solo acceso a aplicaciones
-- ============================================
-- Este script elimina los permisos granulares y crea un sistema simple
-- donde solo existe un permiso por aplicación: el acceso

BEGIN;

-- 1. GUARDAR USUARIOS QUE TIENEN ACCESO A CADA APLICACIÓN
CREATE TEMP TABLE temp_user_app_access AS
SELECT DISTINCT 
  uap.user_id,
  uap.application_id,
  a.code as app_code,
  u.email
FROM auth_gangazon.auth_user_app_permissions uap
JOIN auth_gangazon.auth_applications a ON uap.application_id = a.id
JOIN auth_gangazon.auth_users u ON uap.user_id = u.id
WHERE uap.is_active = true;

-- 2. LIMPIAR PERMISOS EXISTENTES
TRUNCATE auth_gangazon.auth_user_app_permissions;
TRUNCATE auth_gangazon.auth_permissions CASCADE;

-- 3. CREAR NUEVO PERMISO SIMPLE POR CADA APLICACIÓN
INSERT INTO auth_gangazon.auth_permissions (application_id, code, display_name, description, category)
SELECT 
  id,
  'app.access',
  'Acceso a ' || name,
  'Permiso de acceso a la aplicación ' || name,
  'access'
FROM auth_gangazon.auth_applications
WHERE is_active = true;

-- 4. RESTAURAR ACCESOS DE USUARIOS
INSERT INTO auth_gangazon.auth_user_app_permissions (user_id, application_id, permission_id, is_active)
SELECT DISTINCT
  t.user_id,
  t.application_id,
  p.id,
  true
FROM temp_user_app_access t
JOIN auth_gangazon.auth_permissions p ON p.application_id = t.application_id AND p.code = 'app.access';

-- 5. VERIFICAR RESULTADO
SELECT 
  a.code as aplicacion,
  a.name,
  COUNT(DISTINCT uap.user_id) as usuarios_con_acceso,
  ARRAY_AGG(DISTINCT u.email ORDER BY u.email) as emails
FROM auth_gangazon.auth_applications a
LEFT JOIN auth_gangazon.auth_user_app_permissions uap ON uap.application_id = a.id AND uap.is_active = true
LEFT JOIN auth_gangazon.auth_users u ON uap.user_id = u.id
GROUP BY a.id, a.code, a.name
ORDER BY a.code;

COMMIT;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada: Sistema simplificado a permisos de acceso por aplicación';
  RAISE NOTICE '   - Cada aplicación ahora tiene 1 solo permiso: app.access';
  RAISE NOTICE '   - Los usuarios que tenían cualquier permiso en una app, ahora tienen acceso a esa app';
END $$;
