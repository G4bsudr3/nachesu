update public.trails t
set color = v.color
from (values (1,'#F25E3D'),(2,'#F2BC57'),(3,'#75BF9C'),(4,'#448FF2')) as v(idx,color)
where t.order_index = v.idx
  and t.course_id = (select id from public.courses where slug = 'economia-circular');

update public.modules m
set cover_color = t.color
from public.trails t
where t.id = m.trail_id and t.color is not null;