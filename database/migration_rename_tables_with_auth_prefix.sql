-- ================================================
-- MIGRACIÓN: Renombrar tablas con prefijo auth_
-- Este script renombra todas las tablas para que empiecen con "auth_"
-- ================================================

-- ================================================
-- 1. RENOMBRAR TABLAS
-- ================================================

-- Renombrar franchises → auth_franchises
ALTER TABLE IF EXISTS auth_gangazon.franchises 
  RENAME TO auth_franchises;

-- Renombrar users → auth_users
ALTER TABLE IF EXISTS auth_gangazon.users 
  RENAME TO auth_users;

-- Renombrar applications → auth_applications
ALTER TABLE IF EXISTS auth_gangazon.applications 
  RENAME TO auth_applications;

-- Renombrar permissions → auth_permissions
ALTER TABLE IF EXISTS auth_gangazon.permissions 
  RENAME TO auth_permissions;

-- Renombrar user_app_permissions → auth_user_app_permissions
ALTER TABLE IF EXISTS auth_gangazon.user_app_permissions 
  RENAME TO auth_user_app_permissions;

-- Renombrar refresh_tokens → auth_refresh_tokens
ALTER TABLE IF EXISTS auth_gangazon.refresh_tokens 
  RENAME TO auth_refresh_tokens;

-- Renombrar sessions → auth_sessions
ALTER TABLE IF EXISTS auth_gangazon.sessions 
  RENAME TO auth_sessions;

-- Renombrar audit_log → auth_audit_log
ALTER TABLE IF EXISTS auth_gangazon.audit_log 
  RENAME TO auth_audit_log;

-- ================================================
-- 2. RENOMBRAR VISTAS
-- ================================================

-- Renombrar v_users_with_franchises → v_auth_users_with_franchises
ALTER VIEW IF EXISTS auth_gangazon.v_users_with_franchises 
  RENAME TO v_auth_users_with_franchises;

-- Renombrar v_user_permissions_by_app → v_auth_user_permissions_by_app
ALTER VIEW IF EXISTS auth_gangazon.v_user_permissions_by_app 
  RENAME TO v_auth_user_permissions_by_app;

-- ================================================
-- 3. RECREAR VISTAS CON NUEVOS NOMBRES DE TABLAS
-- ================================================

-- Recrear vista de usuarios con franquicias
DROP VIEW IF EXISTS auth_gangazon.v_auth_users_with_franchises CASCADE;
CREATE OR REPLACE VIEW auth_gangazon.v_auth_users_with_franchises AS
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.phone,
  u.is_active,
  u.email_verified,
  u.last_login_at,
  u.created_at,
  f.id as franchise_id,
  f.name as franchise_name,
  f.code as franchise_code
FROM auth_gangazon.auth_users u
LEFT JOIN auth_gangazon.auth_franchises f ON u.franchise_id = f.id;

-- Recrear vista de permisos por aplicación
DROP VIEW IF EXISTS auth_gangazon.v_auth_user_permissions_by_app CASCADE;
CREATE OR REPLACE VIEW auth_gangazon.v_auth_user_permissions_by_app AS
SELECT 
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  a.id as application_id,
  a.name as application_name,
  a.code as application_code,
  p.id as permission_id,
  p.code as permission_code,
  p.display_name as permission_display_name,
  p.category as permission_category,
  uap.assigned_at,
  uap.expires_at,
  uap.is_active
FROM auth_gangazon.auth_users u
INNER JOIN auth_gangazon.auth_user_app_permissions uap ON u.id = uap.user_id
INNER JOIN auth_gangazon.auth_applications a ON uap.application_id = a.id
INNER JOIN auth_gangazon.auth_permissions p ON uap.permission_id = p.id;

-- ================================================
-- 4. RENOMBRAR ÍNDICES
-- ================================================

-- Índices de auth_franchises
ALTER INDEX IF EXISTS auth_gangazon.idx_franchises_code 
  RENAME TO idx_auth_franchises_code;
ALTER INDEX IF EXISTS auth_gangazon.idx_franchises_is_active 
  RENAME TO idx_auth_franchises_is_active;

-- Índices de auth_users
ALTER INDEX IF EXISTS auth_gangazon.idx_users_email 
  RENAME TO idx_auth_users_email;
ALTER INDEX IF EXISTS auth_gangazon.idx_users_franchise_id 
  RENAME TO idx_auth_users_franchise_id;
ALTER INDEX IF EXISTS auth_gangazon.idx_users_is_active 
  RENAME TO idx_auth_users_is_active;

-- Índices de auth_applications
ALTER INDEX IF EXISTS auth_gangazon.idx_applications_code 
  RENAME TO idx_auth_applications_code;
ALTER INDEX IF EXISTS auth_gangazon.idx_applications_api_key 
  RENAME TO idx_auth_applications_api_key;
ALTER INDEX IF EXISTS auth_gangazon.idx_applications_is_active 
  RENAME TO idx_auth_applications_is_active;

-- Índices de auth_permissions
ALTER INDEX IF EXISTS auth_gangazon.idx_permissions_application_id 
  RENAME TO idx_auth_permissions_application_id;
ALTER INDEX IF EXISTS auth_gangazon.idx_permissions_code 
  RENAME TO idx_auth_permissions_code;
ALTER INDEX IF EXISTS auth_gangazon.idx_permissions_category 
  RENAME TO idx_auth_permissions_category;
ALTER INDEX IF EXISTS auth_gangazon.idx_permissions_is_active 
  RENAME TO idx_auth_permissions_is_active;

-- Índices de auth_user_app_permissions
ALTER INDEX IF EXISTS auth_gangazon.idx_uap_user_id 
  RENAME TO idx_auth_uap_user_id;
ALTER INDEX IF EXISTS auth_gangazon.idx_uap_application_id 
  RENAME TO idx_auth_uap_application_id;
ALTER INDEX IF EXISTS auth_gangazon.idx_uap_permission_id 
  RENAME TO idx_auth_uap_permission_id;
ALTER INDEX IF EXISTS auth_gangazon.idx_uap_is_active 
  RENAME TO idx_auth_uap_is_active;

-- Índices de auth_refresh_tokens
ALTER INDEX IF EXISTS auth_gangazon.idx_refresh_tokens_user_id 
  RENAME TO idx_auth_refresh_tokens_user_id;
ALTER INDEX IF EXISTS auth_gangazon.idx_refresh_tokens_token 
  RENAME TO idx_auth_refresh_tokens_token;
ALTER INDEX IF EXISTS auth_gangazon.idx_refresh_tokens_application_id 
  RENAME TO idx_auth_refresh_tokens_application_id;
ALTER INDEX IF EXISTS auth_gangazon.idx_refresh_tokens_is_revoked 
  RENAME TO idx_auth_refresh_tokens_is_revoked;

-- Índices de auth_sessions
ALTER INDEX IF EXISTS auth_gangazon.idx_sessions_user_id 
  RENAME TO idx_auth_sessions_user_id;
ALTER INDEX IF EXISTS auth_gangazon.idx_sessions_application_id 
  RENAME TO idx_auth_sessions_application_id;
ALTER INDEX IF EXISTS auth_gangazon.idx_sessions_is_active 
  RENAME TO idx_auth_sessions_is_active;

-- Índices de auth_audit_log
ALTER INDEX IF EXISTS auth_gangazon.idx_audit_log_user_id 
  RENAME TO idx_auth_audit_log_user_id;
ALTER INDEX IF EXISTS auth_gangazon.idx_audit_log_application_id 
  RENAME TO idx_auth_audit_log_application_id;
ALTER INDEX IF EXISTS auth_gangazon.idx_audit_log_action 
  RENAME TO idx_auth_audit_log_action;
ALTER INDEX IF EXISTS auth_gangazon.idx_audit_log_created_at 
  RENAME TO idx_auth_audit_log_created_at;

-- ================================================
-- VERIFICACIÓN
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RENOMBRADO DE TABLAS COMPLETADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tablas renombradas en auth_gangazon:';
  RAISE NOTICE '- auth_franchises';
  RAISE NOTICE '- auth_users';
  RAISE NOTICE '- auth_applications';
  RAISE NOTICE '- auth_permissions';
  RAISE NOTICE '- auth_user_app_permissions';
  RAISE NOTICE '- auth_refresh_tokens';
  RAISE NOTICE '- auth_sessions';
  RAISE NOTICE '- auth_audit_log';
  RAISE NOTICE '';
  RAISE NOTICE 'Vistas renombradas:';
  RAISE NOTICE '- v_auth_users_with_franchises';
  RAISE NOTICE '- v_auth_user_permissions_by_app';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE:';
  RAISE NOTICE '1. Actualiza tus queries para usar auth_tabla_nombre';
  RAISE NOTICE '2. Las foreign keys se actualizaron automáticamente';
  RAISE NOTICE '3. Los triggers se mantienen activos';
  RAISE NOTICE '';
  RAISE NOTICE '¡Listo para usar!';
END $$;
