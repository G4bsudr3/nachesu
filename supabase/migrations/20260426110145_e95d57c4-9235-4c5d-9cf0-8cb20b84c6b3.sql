-- 1. Tabela do álbum coletivo
CREATE TABLE public.hub_album_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  caption text,
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_album_photos_created_at ON public.hub_album_photos (created_at DESC);
CREATE INDEX idx_hub_album_photos_user_id ON public.hub_album_photos (user_id);

ALTER TABLE public.hub_album_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth lê fotos do álbum"
  ON public.hub_album_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "user posta foto em nome próprio"
  ON public.hub_album_photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user edita própria foto"
  ON public.hub_album_photos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user ou admin remove foto"
  ON public.hub_album_photos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.hub_album_photos;
ALTER TABLE public.hub_album_photos REPLICA IDENTITY FULL;

-- 2. Bucket público para o álbum
INSERT INTO storage.buckets (id, name, public)
VALUES ('hub-album', 'hub-album', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "álbum público leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hub-album');

CREATE POLICY "álbum upload autenticado em pasta própria"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'hub-album'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "álbum delete dono ou admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'hub-album'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- 3. Tabela settings chave/valor para link das fotos oficiais (e futuros)
CREATE TABLE public.hub_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.hub_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth lê settings"
  ON public.hub_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin gerencia settings"
  ON public.hub_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- seed da chave do link oficial (vazio até admin preencher)
INSERT INTO public.hub_settings (key, value) VALUES ('official_photos_url', NULL)
ON CONFLICT (key) DO NOTHING;