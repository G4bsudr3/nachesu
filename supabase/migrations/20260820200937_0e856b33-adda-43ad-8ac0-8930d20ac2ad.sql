with novo(n, url) as (values
(2,'/__l5e/assets-v1/869535b3-8ff8-4f3d-9277-249d6942fff3/modulo-02-abertura-web.mp4'),
(3,'/__l5e/assets-v1/be289c38-a9b7-48f2-956a-c64771b19a15/modulo-03-abertura-web.mp4'),
(4,'/__l5e/assets-v1/6b5fe664-1143-411d-ae1c-94566c64edf4/modulo-04-abertura-web.mp4'),
(5,'/__l5e/assets-v1/caea1f7b-e6d3-4094-ae1e-51e09c691701/modulo-05-abertura-web.mp4'),
(6,'/__l5e/assets-v1/401e8d2c-59b1-478c-ab10-96c1874c47bd/modulo-06-abertura-web.mp4'),
(7,'/__l5e/assets-v1/90b82fa1-bd39-4d18-8dad-20883ef60c97/modulo-07-abertura-web.mp4'),
(8,'/__l5e/assets-v1/d66a402d-fd91-474c-8e95-2eda3b0cc562/modulo-08-abertura-web.mp4'),
(9,'/__l5e/assets-v1/12524232-2588-45c1-8edd-d8e460435b2c/modulo-09-abertura-web.mp4'),
(10,'/__l5e/assets-v1/4b9a043a-7b26-4ba2-be82-0979d5f1fdd5/modulo-10-abertura-web.mp4'),
(11,'/__l5e/assets-v1/08547388-29a5-4e55-877d-e6c65dfe01a9/modulo-11-abertura-web.mp4'),
(12,'/__l5e/assets-v1/d592cba9-7650-488c-9355-2914a154bb85/modulo-12-abertura-web.mp4'),
(13,'/__l5e/assets-v1/44f1aeed-8392-4b89-adad-e4cabba884b4/modulo-13-abertura-web.mp4'),
(14,'/__l5e/assets-v1/88341f20-a282-408c-b095-66874ab7ca3c/modulo-14-abertura-web.mp4'),
(15,'/__l5e/assets-v1/a67b5688-63ce-4528-a37a-f2d944372c91/modulo-15-abertura-web.mp4'),
(16,'/__l5e/assets-v1/8a69277d-880d-4cc7-8837-6836dcbd4236/modulo-16-abertura-web.mp4'),
(17,'/__l5e/assets-v1/90b62970-6ae5-40c6-862b-e7fe4f19cb7a/modulo-17-abertura-web.mp4'),
(18,'/__l5e/assets-v1/3a19ee4a-e5a8-41f1-a9a1-04338d8439f0/modulo-18-abertura-web.mp4'),
(19,'/__l5e/assets-v1/0b1792f5-5b1a-4bab-be51-bdaf208e1b1f/modulo-19-abertura-web.mp4'),
(20,'/__l5e/assets-v1/c08102b9-56b7-4c07-8898-ca42648a5f14/modulo-20-abertura-web.mp4'))
update module_pills p
set interaction_schema = jsonb_set(p.interaction_schema, '{video_url}', to_jsonb(novo.url)),
    video_url = novo.url
from modules m
join trails t on t.id = m.trail_id
join courses c on c.id = t.course_id
join novo on novo.n = m.number
where p.module_id = m.id
  and c.slug = 'economia-circular'
  and p.interaction_schema->>'type' = 'video_with_transcript'
  and coalesce(p.interaction_schema->>'video_url','') like '%abertura.mov';