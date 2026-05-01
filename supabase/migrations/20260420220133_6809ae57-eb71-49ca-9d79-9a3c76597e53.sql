-- Fix: search_path na função generate_share_token
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, 1 + floor(random() * 62)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Fix: bucket público sem listing aberto.
-- removemos a policy ampla de SELECT no bucket builder-card-og.
-- arquivos individuais continuam acessíveis via URL pública direta (objetos public),
-- mas listagem precisa de service role.
DROP POLICY IF EXISTS "og images publicly readable" ON storage.objects;