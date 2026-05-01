-- Substitui as policies de SELECT amplas por leitura via URL direta apenas
-- (mantém arquivos publicamente acessíveis pela URL pública,
-- mas impede listagem indiscriminada do bucket via API).

DROP POLICY IF EXISTS "leitura pública hub-materials" ON storage.objects;
DROP POLICY IF EXISTS "leitura pública hub-project-covers" ON storage.objects;

-- materiais: apenas authenticated lista; público acessa via URL pública direta (sem listing).
CREATE POLICY "auth lista hub-materials"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hub-materials');

-- capas de projeto: apenas authenticated lista
CREATE POLICY "auth lista hub-project-covers"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hub-project-covers');