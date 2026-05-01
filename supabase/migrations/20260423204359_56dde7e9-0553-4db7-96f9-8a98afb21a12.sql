CREATE OR REPLACE FUNCTION public.validate_admin_role_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'admin'::public.app_role AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'apenas admins podem conceder admin';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (OLD.role = 'admin'::public.app_role OR NEW.role = 'admin'::public.app_role)
       AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'apenas admins podem alterar admin';
    END IF;
    IF OLD.user_id = auth.uid()
       AND OLD.role = 'admin'::public.app_role
       AND NEW.role <> 'admin'::public.app_role THEN
      RAISE EXCEPTION 'para não te trancar pra fora, peça outro admin para remover teu acesso';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin'::public.app_role AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'apenas admins podem remover admin';
    END IF;
    IF OLD.user_id = auth.uid() AND OLD.role = 'admin'::public.app_role THEN
      RAISE EXCEPTION 'para não te trancar pra fora, peça outro admin para remover teu acesso';
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS validate_admin_role_mutation_trigger ON public.user_roles;
CREATE TRIGGER validate_admin_role_mutation_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.validate_admin_role_mutation();