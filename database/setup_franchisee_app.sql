-- Script SQL para crear la aplicación FRANCHISEE_PANEL y asignar permisos
-- Ejecutar directamente en Supabase SQL Editor

BEGIN;

-- 1. Crear aplicación FRANCHISEE_PANEL
DO $$
DECLARE
  v_app_id UUID;
  v_perm_id UUID;
  v_user_record RECORD;
BEGIN
  -- Crear aplicación
  INSERT INTO auth_gangazon.auth_applications (name, code, description, active)
  VALUES ('Panel de Franquiciados', 'FRANCHISEE_PANEL', 'Panel web para gestión de franquiciados', true)
  ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description
  RETURNING id INTO v_app_id;
  
  RAISE NOTICE 'Aplicación creada: ID=%', v_app_id;

  -- 2. Crear permisos
  INSERT INTO auth_gangazon.auth_permissions (application_id, name, description, category)
  VALUES 
    (v_app_id, 'franchisee.dashboard.view', 'Ver dashboard de scrapper', 'scrapper'),
    (v_app_id, 'franchisee.scanner.use', 'Usar scanner de productos', 'scrapper'),
    (v_app_id, 'franchisee.batches.view', 'Ver lotes procesados', 'scrapper'),
    (v_app_id, 'franchisee.files.upload', 'Subir archivos de productos', 'scrapper'),
    (v_app_id, 'franchisee.stores.view', 'Ver tiendas propias', 'stores'),
    (v_app_id, 'franchisee.employees.view', 'Ver empleados propios', 'employees'),
    (v_app_id, 'franchisee.fichajes.view', 'Ver fichajes de empleados', 'fichajes')
  ON CONFLICT (application_id, name) DO UPDATE
  SET description = EXCLUDED.description, category = EXCLUDED.category;

  RAISE NOTICE 'Permisos creados';

  -- 3. Asignar permisos a todos los franquiciados
  FOR v_user_record IN 
    SELECT id, email, first_name, last_name
    FROM auth_gangazon.auth_users
    WHERE role = 'FRANCHISEE' AND active = true
  LOOP
    -- Asignar todos los permisos
    FOR v_perm_id IN 
      SELECT id FROM auth_gangazon.auth_permissions WHERE application_id = v_app_id
    LOOP
      INSERT INTO auth_gangazon.auth_user_permissions (user_id, permission_id, application_id)
      VALUES (v_user_record.id, v_perm_id, v_app_id)
      ON CONFLICT (user_id, permission_id) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Permisos asignados a franquiciado: % % (%)', 
      v_user_record.first_name, v_user_record.last_name, v_user_record.email;
  END LOOP;

  -- 4. Asignar permisos a todos los empleados
  FOR v_user_record IN 
    SELECT id, email, first_name, last_name
    FROM auth_gangazon.auth_users
    WHERE role = 'EMPLOYEE' AND active = true
  LOOP
    -- Asignar todos los permisos
    FOR v_perm_id IN 
      SELECT id FROM auth_gangazon.auth_permissions WHERE application_id = v_app_id
    LOOP
      INSERT INTO auth_gangazon.auth_user_permissions (user_id, permission_id, application_id)
      VALUES (v_user_record.id, v_perm_id, v_app_id)
      ON CONFLICT (user_id, permission_id) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Permisos asignados a empleado: % % (%)', 
      v_user_record.first_name, v_user_record.last_name, v_user_record.email;
  END LOOP;

END $$;

COMMIT;

-- Verificar resultados
SELECT 
  'Aplicación creada' as tipo,
  name, code, description
FROM auth_gangazon.auth_applications
WHERE code = 'FRANCHISEE_PANEL';

SELECT 
  'Permisos creados' as tipo,
  COUNT(*) as total
FROM auth_gangazon.auth_permissions p
JOIN auth_gangazon.auth_applications a ON p.application_id = a.id
WHERE a.code = 'FRANCHISEE_PANEL';

SELECT 
  'Usuarios con permisos' as tipo,
  u.role,
  COUNT(DISTINCT u.id) as total_usuarios
FROM auth_gangazon.auth_users u
JOIN auth_gangazon.auth_user_permissions up ON u.id = up.user_id
JOIN auth_gangazon.auth_permissions p ON up.permission_id = p.id
JOIN auth_gangazon.auth_applications a ON p.application_id = a.id
WHERE a.code = 'FRANCHISEE_PANEL'
GROUP BY u.role;
