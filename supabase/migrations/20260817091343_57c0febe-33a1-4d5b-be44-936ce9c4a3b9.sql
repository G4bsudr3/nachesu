WITH nomes(number, novo) AS (VALUES
  (11,'meu projeto virou link'),
  (12,'alguém entendeu sem eu explicar'),
  (13,'uma etapa a menos'),
  (14,'agora a ia trabalha pra mim'),
  (15,'vi alguém usando sem ajuda'),
  (16,'combinei quem vai testar'),
  (17,'tenho prova de uso'),
  (18,'mudei o que os dados pediram'),
  (19,'minha jornada virou história'),
  (20,'fechei a eletiva')
)
UPDATE public.module_pills p
SET title = n.novo
FROM public.modules m
JOIN public.trails t ON t.id = m.trail_id
JOIN public.courses c ON c.id = t.course_id
JOIN nomes n ON n.number = m.number
WHERE p.module_id = m.id
  AND c.slug = 'ia-na-pratica'
  AND p.kind = 'registro';