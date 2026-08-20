update public.module_pills
set body_md = regexp_replace(
      regexp_replace(
        regexp_replace(body_md, '(^|[^[:alpha:]])encontro([^[:alpha:]])', '\1módulo\2', 'g'),
      '(^|[^[:alpha:]])aula([^[:alpha:]])', '\1módulo\2', 'g'),
    '(^|[^[:alpha:]])aulas([^[:alpha:]])', '\1módulos\2', 'g')
where body_md ~* '(^|[^[:alpha:]])(encontro|aulas?)([^[:alpha:]]|$)';

update public.module_pills
set body_md = regexp_replace(body_md, '(^|[^[:alpha:]])missão([^[:alpha:]])', '\1exercício\2', 'g')
where body_md ~ '(^|[^[:alpha:]])missão([^[:alpha:]])';