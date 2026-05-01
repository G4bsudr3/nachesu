-- 1. Curated list (29 handles do whatsapp)
WITH ig_map(email_lc, handle) AS (
  VALUES
    ('matheus.hassan@farmrio.com','matheushassan'),
    ('helena@perestroika.com.br','helenakich_'),
    ('postobebidas@gmail.com','joaopaulocastanheira'),
    ('livianyvictorias2@gmail.com','livi_sutello'),
    ('analice@tudodeshare.com.br','analice.attisano'),
    ('felipe.cabral@hmv.org.br','fccabral_oficial'),
    ('cewolwacz@gmail.com','carolinawolwacz'),
    ('pamela@perestroika.com.br','pmlmf'),
    ('diegotrindadepoa@gmail.com','ditrindadereal'),
    ('aldrensflores@gmail.com','mais.afro'),
    ('nathan.fogaca@grupoiesa.com.br','nathan_fogaca_'),
    ('deds.marcon@gmail.com','dedsdedsdedsdeds'),
    ('catarine@perestroika.com.br','cat_figueiredoo'),
    ('deivid.ramos2@corsan.com.br','deividr4mos'),
    ('gabriel.bredas@hotmail.com','gabreda'),
    ('pedrodasilvamagnus@gmail.com','magnusdeverdade'),
    ('marcelo@perestroika.com.br','soumarlo'),
    ('silpoa@gmail.com','silpoa9'),
    ('tfzimmermann@gmail.com','fztiago'),
    ('sherol28@gmail.com','sherol_santos'),
    ('adriano.sirius96@gmail.com','adrianosirius_'),
    ('cjunker@grupopanvel.com.br','carol.gabbi'),
    ('amanda.marangonii@gmail.com','amanda.muriel'),
    ('renatakbferreira@hotmail.com','renatakbf'),
    ('morgana.freire@institutocaldeira.org','morganagrowth'),
    ('micael.carlesso@institutocaldeira.org','mica_carlesso'),
    ('yasmin@perestroika.com.br','yfmattos'),
    ('mateusfrattezi@gmail.com','frattz_'),
    ('frattz@naches.app','frattz_')
)
UPDATE public.profiles p
SET instagram = m.handle, updated_at = now()
FROM ig_map m
JOIN auth.users u ON lower(u.email) = m.email_lc
WHERE p.user_id = u.id
  AND (p.instagram IS NULL OR p.instagram = '');

-- 2. Fallback FBI: instagram (limpa @, espaços, casos lixo)
WITH normalized AS (
  SELECT
    f.user_id,
    -- pega só primeira "palavra" do raw, tira @, lower
    lower(regexp_replace(trim(split_part(replace(f.instagram, '@', ''), ' ', 1)), '/$', '')) AS handle,
    f.submitted_at
  FROM public.fbi_responses f
  WHERE f.user_id IS NOT NULL
    AND f.instagram IS NOT NULL
    AND length(trim(f.instagram)) > 0
    AND lower(trim(f.instagram)) NOT IN ('não possuo','nao possuo','não tenho','nao tenho','-','n/a','na','nada')
),
ranked AS (
  SELECT user_id, handle,
         row_number() OVER (PARTITION BY user_id ORDER BY submitted_at DESC NULLS LAST) AS rn
  FROM normalized
  WHERE handle ~ '^[a-z0-9._]+$' AND length(handle) BETWEEN 2 AND 30
)
UPDATE public.profiles p
SET instagram = r.handle, updated_at = now()
FROM ranked r
WHERE p.user_id = r.user_id
  AND r.rn = 1
  AND (p.instagram IS NULL OR p.instagram = '');

-- 3. Fallback FBI: linkedin (mantém url completa quando vier; constroi url quando vier só handle)
WITH normalized AS (
  SELECT
    f.user_id,
    trim(f.linkedin) AS raw,
    f.submitted_at
  FROM public.fbi_responses f
  WHERE f.user_id IS NOT NULL
    AND f.linkedin IS NOT NULL
    AND length(trim(f.linkedin)) > 2
    AND lower(trim(f.linkedin)) NOT IN ('não possuo','nao possuo','não tenho','nao tenho','-','n/a','na','nada','alksdjal')
),
cleaned AS (
  SELECT user_id, submitted_at,
    CASE
      WHEN raw ~* '^https?://' THEN raw
      WHEN raw ~* '^linkedin\.' THEN 'https://www.' || raw
      WHEN raw ~* '^www\.linkedin' THEN 'https://' || raw
      WHEN raw ~ '^[A-Za-z0-9\-_./]+$' THEN 'https://www.linkedin.com/in/' || regexp_replace(raw, '^/+|/+$', '', 'g')
      ELSE NULL
    END AS url
  FROM normalized
),
ranked AS (
  SELECT user_id, url,
         row_number() OVER (PARTITION BY user_id ORDER BY submitted_at DESC NULLS LAST) AS rn
  FROM cleaned
  WHERE url IS NOT NULL
)
UPDATE public.profiles p
SET linkedin = r.url, updated_at = now()
FROM ranked r
WHERE p.user_id = r.user_id
  AND r.rn = 1
  AND (p.linkedin IS NULL OR p.linkedin = '');