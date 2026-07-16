CREATE OR REPLACE FUNCTION public.grant_admin_gabreda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'gabreda188@gmail.com' AND NEW.email_confirmed_at IS NOT NULL THEN
    ALTER TABLE public.user_roles DISABLE TRIGGER USER;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    ALTER TABLE public.user_roles ENABLE TRIGGER USER;

    UPDATE public.profiles
       SET status = 'active',
           approved_at = COALESCE(approved_at, now())
     WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_gabreda ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_gabreda
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_gabreda();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_gabreda ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_gabreda
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_gabreda();