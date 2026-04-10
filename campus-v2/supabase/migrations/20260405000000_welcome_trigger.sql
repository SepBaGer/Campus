-- supabase/migrations/20260405000000_welcome_trigger.sql
-- Trigger para enviar email de bienvenida vía Edge Function [T-020]

-- Nota: Este trigger utiliza los Database Webhooks de Supabase
-- Requiere habilitar la extensión pg_net si no está activa

-- 1. Crear la función del trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_welcome()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the event for Alpha verification
  -- This confirms the user was created and the system intended to send an email
  INSERT INTO public.events (titulo, descripcion, fecha_inicio, tipo)
  VALUES (
    'Email de Bienvenida Generado',
    'Usuario: ' || NEW.email || ' (' || COALESCE(NEW.raw_user_meta_data->>'display_name', 'Sin nombre') || ')',
    NOW(),
    'workshop'
  );
  
  -- Para producción real, se activaría el Database Webhook de Supabase
  -- que invoca directamente a la Edge Function send-welcome.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Asegurar que el trigger existe sobre auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_welcome ON auth.users;
CREATE TRIGGER on_auth_user_created_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_welcome();
