CREATE POLICY "autenticado vê cartas publicadas"
  ON public.builder_cards
  FOR SELECT
  TO authenticated
  USING (is_published = true AND status = 'pronta');