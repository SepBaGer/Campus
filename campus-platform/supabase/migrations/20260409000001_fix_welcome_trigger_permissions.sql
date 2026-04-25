-- Ensure auth signup trigger can write welcome logs.

CREATE OR REPLACE FUNCTION public.handle_new_user_welcome()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_logs (kind, recipient_email, payload)
  VALUES (
    'welcome_email_requested',
    NEW.email,
    jsonb_build_object(
      'user_id', NEW.id,
      'display_name', COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'display_name',
        split_part(NEW.email, '@', 1)
      )
    )
  );

  RETURN NEW;
END;
$$;
