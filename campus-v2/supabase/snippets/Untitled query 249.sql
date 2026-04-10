-- Batch de Migración (Test ETL - Versión Final Corregida)
DO $$ 
DECLARE 
    instance_id_val uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Usuario 1
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test_user_01@metodologia.test') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, instance_id, role, aud)
        VALUES (gen_random_uuid(), 'test_user_01@metodologia.test', 'migration_hash', now(), '{"provider":"email"}', '{"display_name":"Alumno Test 1"}', now(), now(), instance_id_val, 'authenticated', 'authenticated');
    END IF;

    -- Usuario 2
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test_user_02@metodologia.test') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, instance_id, role, aud)
        VALUES (gen_random_uuid(), 'test_user_02@metodologia.test', 'migration_hash', now(), '{"provider":"email"}', '{"display_name":"Alumno Test 2"}', now(), now(), instance_id_val, 'authenticated', 'authenticated');
    END IF;

    -- Usuario 3
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test_user_03@metodologia.test') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, instance_id, role, aud)
        VALUES (gen_random_uuid(), 'test_user_03@metodologia.test', 'migration_hash', now(), '{"provider":"email"}', '{"display_name":"Arquitecto Senior"}', now(), now(), instance_id_val, 'authenticated', 'authenticated');
    END IF;

    -- Usuario 4
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'legacy_student@oldcampus.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, instance_id, role, aud)
        VALUES (gen_random_uuid(), 'legacy_student@oldcampus.com', 'migration_hash', now(), '{"provider":"email"}', '{"display_name":"Estudiante Antiguo"}', now(), now(), instance_id_val, 'authenticated', 'authenticated');
    END IF;
END $$;

-- Sincronización de Perfiles (Niveles y XP) usando subconsultas de ID
UPDATE public.profiles SET current_level = 1, total_xp = 100 WHERE id IN (SELECT id FROM auth.users WHERE email = 'test_user_01@metodologia.test');
UPDATE public.profiles SET current_level = 2, total_xp = 1000 WHERE id IN (SELECT id FROM auth.users WHERE email = 'test_user_02@metodologia.test');
UPDATE public.profiles SET current_level = 5, total_xp = 5000 WHERE id IN (SELECT id FROM auth.users WHERE email = 'test_user_03@metodologia.test');
UPDATE public.profiles SET current_level = 3, total_xp = 2500 WHERE id IN (SELECT id FROM auth.users WHERE email = 'legacy_student@oldcampus.com');

-- Verificación de resultados cruzando tablas
SELECT u.email, p.display_name, p.current_level, p.total_xp 
FROM public.profiles p
JOIN auth.users u ON p.id = u.id;
