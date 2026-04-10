-- Batch de Migración (Test ETL)
-- Inserta usuarios directamente en la tabla de Auth para saltar el error 500 del API

DO $$ 
DECLARE 
    instance_id_val uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Usuario 1
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, instance_id, role)
    VALUES (gen_random_uuid(), 'test_user_01@metodologia.test', 'migration_hash', now(), '{"provider":"email"}', '{"display_name":"Alumno Test 1"}', now(), now(), instance_id_val, 'authenticated')
    ON CONFLICT (email) DO NOTHING;

    -- Usuario 2
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, instance_id, role)
    VALUES (gen_random_uuid(), 'test_user_02@metodologia.test', 'migration_hash', now(), '{"provider":"email"}', '{"display_name":"Alumno Test 2"}', now(), now(), instance_id_val, 'authenticated')
    ON CONFLICT (email) DO NOTHING;

    -- Usuario 3
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, instance_id, role)
    VALUES (gen_random_uuid(), 'test_user_03@metodologia.test', 'migration_hash', now(), '{"provider":"email"}', '{"display_name":"Arquitecto Senior"}', now(), now(), instance_id_val, 'authenticated')
    ON CONFLICT (email) DO NOTHING;

    -- Usuario 4
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, instance_id, role)
    VALUES (gen_random_uuid(), 'legacy_student@oldcampus.com', 'migration_hash', now(), '{"provider":"email"}', '{"display_name":"Estudiante Antiguo"}', now(), now(), instance_id_val, 'authenticated')
    ON CONFLICT (email) DO NOTHING;
END $$;

-- Verificación de progreso (Asegura que los triggers crearon los perfiles)
SELECT id, email, display_name, current_level, total_xp FROM public.profiles;
SELECT * FROM public.profiles;