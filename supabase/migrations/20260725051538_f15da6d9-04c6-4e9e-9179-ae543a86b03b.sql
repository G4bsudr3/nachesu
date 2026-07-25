
-- RPC admin: agregação dos mapas de fluxo da aula 6
CREATE OR REPLACE FUNCTION public.admin_module6_mapa_fluxo_stats(
  _course_slug TEXT DEFAULT 'economia-circular',
  _module_number INT DEFAULT 6
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _module_id UUID;
  _pill_id UUID;
  _briefing_module_id UUID;
  _total_students INT;
  _completed INT;
  _submitted INT;
  _with_image INT;
  _avg_vaz NUMERIC;
  _fluxo_dist JSONB;
  _samples JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT m.id INTO _module_id
  FROM public.modules m
  JOIN public.trails t ON m.trail_id = t.id
  JOIN public.courses c ON t.course_id = c.id
  WHERE c.slug = _course_slug AND m.number = _module_number
  LIMIT 1;

  IF _module_id IS NULL THEN
    RETURN jsonb_build_object('error', 'module not found');
  END IF;

  SELECT id INTO _pill_id
  FROM public.module_pills
  WHERE module_id = _module_id
    AND (interaction_schema->>'type') = 'mapa_fluxo'
  ORDER BY order_index
  LIMIT 1;

  -- módulo do briefing (aula 5)
  SELECT m.id INTO _briefing_module_id
  FROM public.modules m
  JOIN public.trails t ON m.trail_id = t.id
  JOIN public.courses c ON t.course_id = c.id
  WHERE c.slug = _course_slug AND m.number = 5
  LIMIT 1;

  -- matriculados na eletiva
  SELECT COUNT(DISTINCT e.user_id) INTO _total_students
  FROM public.enrollments e
  JOIN public.courses c ON e.course_id = c.id
  WHERE c.slug = _course_slug;

  -- concluíram o módulo
  SELECT COUNT(*) INTO _completed
  FROM public.student_module_progress smp
  WHERE smp.module_id = _module_id AND smp.completed_at IS NOT NULL;

  -- entregaram mapa
  IF _pill_id IS NOT NULL THEN
    SELECT COUNT(*),
           COUNT(*) FILTER (
             WHERE (md.content #>> ARRAY['mapa_fluxo_aula6', _pill_id::text, 'imagem', 'evidence_kind'])
                   IN ('file', 'link')
           ),
           AVG(
             COALESCE(
               jsonb_array_length(
                 COALESCE(md.content #> ARRAY['mapa_fluxo_aula6', _pill_id::text, 'vazamentos'], '[]'::jsonb)
               ),
               0
             )
           )
    INTO _submitted, _with_image, _avg_vaz
    FROM public.module_deliverables md
    WHERE md.module_id = _module_id
      AND md.content ? 'mapa_fluxo_aula6'
      AND (md.content -> 'mapa_fluxo_aula6') ? _pill_id::text;
  ELSE
    _submitted := 0; _with_image := 0; _avg_vaz := 0;
  END IF;

  -- distribuição por fluxo (do briefing aula 5)
  IF _briefing_module_id IS NOT NULL THEN
    WITH briefings AS (
      SELECT md.user_id,
             (jsonb_path_query_first(
                COALESCE(md.content->'briefing_aula5', '{}'::jsonb),
                '$.*.fluxo_principal'
             ))::text AS fluxo
      FROM public.module_deliverables md
      WHERE md.module_id = _briefing_module_id
    ),
    entregas AS (
      SELECT md.user_id
      FROM public.module_deliverables md
      WHERE md.module_id = _module_id
        AND md.content ? 'mapa_fluxo_aula6'
        AND _pill_id IS NOT NULL
        AND (md.content -> 'mapa_fluxo_aula6') ? _pill_id::text
    )
    SELECT COALESCE(
      jsonb_object_agg(fluxo_norm, cnt),
      '{}'::jsonb
    )
    INTO _fluxo_dist
    FROM (
      SELECT REPLACE(fluxo, '"', '') AS fluxo_norm, COUNT(*) AS cnt
      FROM briefings b
      JOIN entregas e ON e.user_id = b.user_id
      WHERE fluxo IS NOT NULL
      GROUP BY 1
    ) x;
  ELSE
    _fluxo_dist := '{}'::jsonb;
  END IF;

  -- últimas amostras (mask nickname)
  IF _pill_id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.updated_at DESC), '[]'::jsonb)
    INTO _samples
    FROM (
      SELECT
        COALESCE(p.display_name, split_part(u.email, '@', 1), 'estudante') AS nickname,
        md.content #>> ARRAY['mapa_fluxo_aula6', _pill_id::text, 'entrada'] AS entrada,
        md.content #>> ARRAY['mapa_fluxo_aula6', _pill_id::text, 'transformacao'] AS transformacao,
        md.content #>> ARRAY['mapa_fluxo_aula6', _pill_id::text, 'saida'] AS saida,
        CASE
          WHEN jsonb_typeof(md.content #> ARRAY['mapa_fluxo_aula6', _pill_id::text, 'vazamentos']) = 'array'
          THEN ARRAY(
            SELECT jsonb_array_elements_text(md.content #> ARRAY['mapa_fluxo_aula6', _pill_id::text, 'vazamentos'])
            LIMIT 6
          )
          ELSE ARRAY[]::text[]
        END AS vazamentos,
        (md.content #>> ARRAY['mapa_fluxo_aula6', _pill_id::text, 'imagem', 'evidence_kind']) IN ('file', 'link') AS has_image,
        md.updated_at
      FROM public.module_deliverables md
      LEFT JOIN public.profiles p ON p.id = md.user_id
      LEFT JOIN auth.users u ON u.id = md.user_id
      WHERE md.module_id = _module_id
        AND md.content ? 'mapa_fluxo_aula6'
        AND (md.content -> 'mapa_fluxo_aula6') ? _pill_id::text
      ORDER BY md.updated_at DESC
      LIMIT 20
    ) s;
  ELSE
    _samples := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'module_id', _module_id,
    'pill_id', _pill_id,
    'kpis', jsonb_build_object(
      'total_students', COALESCE(_total_students, 0),
      'completed_count', COALESCE(_completed, 0),
      'submitted_count', COALESCE(_submitted, 0),
      'with_image_count', COALESCE(_with_image, 0),
      'avg_vazamentos', COALESCE(_avg_vaz, 0)
    ),
    'fluxo_distribution', COALESCE(_fluxo_dist, '{}'::jsonb),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_module6_mapa_fluxo_stats(TEXT, INT) TO authenticated;

-- Metadados do módulo
UPDATE public.modules
SET
  title = 'encontro 6 · siga o fluxo',
  objective = 'desenhar o fluxo atual do seu problema — entrada, transformação, saída, vazamentos — pra ver onde tem oportunidade de intervir.',
  updated_at = now()
WHERE id = '29e2d414-53ad-494f-8856-3d4a7caed582';

-- Seed pills
DELETE FROM public.module_pills WHERE module_id = '29e2d414-53ad-494f-8856-3d4a7caed582';

INSERT INTO public.module_pills (module_id, order_index, kind, title, body_md, required, duration_min_low, duration_min_high, interaction_schema) VALUES
(
  '29e2d414-53ad-494f-8856-3d4a7caed582', 1, 'pilula_a',
  'siga o dinheiro. quer dizer, o fluxo.',
  'todo problema tem uma jornada. hoje você desenha a do seu.',
  true, 3, 5,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_placeholder', true,
    'transcript', E'Bem-vindo à Trilha 2. Você fechou "Enxergar" com Briefing na mão. Agora começa "Entender".\n\nAula de hoje: fluxo.\n\nTodo problema regenerativo é um problema de FLUXO. Alguma coisa entra num sistema, é transformada, sai, e no meio, vaza.\n\nSe você não desenha esse fluxo, não vê onde intervir. Fica tentando resolver "em geral". E "em geral" não resolve nada.\n\nExemplo prático: sua escola compra papel. Papel vira impressões. Impressões viram lixo. Onde vaza valor? Nas impressões desnecessárias. No papel que ainda dava pra usar. No descarte que vai pra aterro em vez de coleta seletiva. Cada "onde" é uma oportunidade.\n\nHoje você vai fazer isso com SEU problema. Vai desenhar, literalmente desenhar, mesmo que feio, o fluxo atual. Entrada, transformação, saída, vazamento.\n\nNão precisa ser bonito. Precisa ser HONESTO. Bora.',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('label', 'começar')
  )
),
(
  '29e2d414-53ad-494f-8856-3d4a7caed582', 2, 'pilula_b',
  'ciclo técnico e ciclo biológico: o modelo canônico',
  'a borboleta da Ellen MacArthur é a referência mental que você vai carregar daqui pra frente.',
  true, 12, 18,
  jsonb_build_object(
    'type', 'curated_content_with_questions',
    'cards', jsonb_build_array(
      jsonb_build_object(
        'id', 'ellen-eliminar',
        'title', 'Eliminar Resíduos e Poluição',
        'source', 'Ellen MacArthur Foundation · PT',
        'duration', '~8 min de leitura',
        'language', 'português',
        'url', 'https://www.ellenmacarthurfoundation.org/pt/eliminar-residuos-e-poluicao',
        'description', 'leia com foco no Diagrama de Borboleta. É o modelo canônico: ciclo técnico (materiais que voltam pra indústria) e ciclo biológico (nutrientes que voltam pra terra). vai virar sua referência mental daqui pra frente.'
      ),
      jsonb_build_object(
        'id', 'ellen-basics',
        'title', 'Basics of a circular economy',
        'source', 'Ellen MacArthur Foundation',
        'duration', '~4 min',
        'language', 'inglês · ative legendas automáticas em português no player',
        'url', 'https://www.ellenmacarthurfoundation.org/videos/basics-of-a-circular-economy',
        'description', 'vídeo curto que resume os princípios da economia circular na prática.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-borboleta',
        'type', 'single_choice',
        'label', 'no Diagrama de Borboleta, qual destas NÃO faz parte do ciclo técnico?',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'reparo', 'value', 'a'),
          jsonb_build_object('label', 'recondicionamento', 'value', 'b'),
          jsonb_build_object('label', 'compostagem', 'value', 'c'),
          jsonb_build_object('label', 'reciclagem', 'value', 'd')
        ),
        'correct', jsonb_build_array('c'),
        'feedback_correct', 'sacou. compostagem é ciclo biológico: devolve nutrientes ao solo. reparo, recondicionamento e reciclagem são técnicos, mantêm materiais na indústria.',
        'feedback_wrong', 'compostagem é a resposta. ela devolve nutrientes ao solo, não à indústria. é o outro lado da borboleta.'
      ),
      jsonb_build_object(
        'id', 'q2-meu-ciclo',
        'type', 'long_text',
        'label', 'pensa no seu problema. ele envolve mais ciclo técnico (materiais que precisam voltar pra indústria) ou ciclo biológico (nutrientes que voltam pra terra)? justifique.',
        'min_chars', 80
      ),
      jsonb_build_object(
        'id', 'q3-vazamento-dia',
        'type', 'long_text',
        'label', 'cite 1 exemplo do seu dia a dia onde há um vazamento óbvio de valor — algo que ainda serviria mas vai pro lixo.',
        'min_chars', 60
      )
    )
  )
),
(
  '29e2d414-53ad-494f-8856-3d4a7caed582', 3, 'exercicio_pbl',
  'missão 6: desenhe o fluxo do seu problema',
  '4 blocos + vazamentos. feio pode, honesto tem que ser. ou desenha no papel/Miro e envia foto.',
  true, 18, 28,
  jsonb_build_object(
    'type', 'mapa_fluxo',
    'briefing_source_module_id', 'b83924a0-91e5-4549-a976-041ca6b28651',
    'min_chars', 15,
    'min_vazamentos', 2,
    'completion', jsonb_build_object('label', 'entregar mapa de fluxo')
  )
),
(
  '29e2d414-53ad-494f-8856-3d4a7caed582', 4, 'pilula_c',
  'checagem rápida',
  'duas perguntas pra afiar o olhar e uma pra escolher onde intervir.',
  true, 5, 8,
  jsonb_build_object(
    'type', 'quiz',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1-zero-vazamentos',
        'type', 'single_choice',
        'label', 'um sistema com ZERO vazamentos identificáveis provavelmente significa que:',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'o sistema já é perfeitamente circular', 'value', 'a'),
          jsonb_build_object('label', 'quem mapeou não olhou fundo o suficiente', 'value', 'b'),
          jsonb_build_object('label', 'não vale a pena intervir', 'value', 'c'),
          jsonb_build_object('label', 'o problema é fácil de resolver', 'value', 'd')
        ),
        'correct', jsonb_build_array('b'),
        'feedback_correct', 'isso. todo sistema linear vaza. se você não achou vazamento, não olhou direito.',
        'feedback_wrong', 'repensa: a economia circular parte do pressuposto de que TODO sistema linear tem desperdício. se você não viu, é porque tá invisível — e o invisível é justamente onde estão as melhores oportunidades.'
      ),
      jsonb_build_object(
        'id', 'q2-tipos-vazamento',
        'type', 'multi_choice',
        'label', 'um vazamento pode ser (marque todas que se aplicam):',
        'options', jsonb_build_array(
          jsonb_build_object('label', 'material que vira lixo prematuramente', 'value', 'material'),
          jsonb_build_object('label', 'tempo de pessoas gasto em tarefa desnecessária', 'value', 'tempo'),
          jsonb_build_object('label', 'energia desperdiçada em processo ineficiente', 'value', 'energia'),
          jsonb_build_object('label', 'espaço físico subutilizado', 'value', 'espaco'),
          jsonb_build_object('label', 'conhecimento que se perde entre etapas', 'value', 'conhecimento')
        ),
        'correct', jsonb_build_array('material', 'tempo', 'energia', 'espaco', 'conhecimento'),
        'feedback_correct', 'vazamento é qualquer recurso que sai do sistema sem retornar valor. material, tempo, energia, espaço, conhecimento — todos contam.',
        'feedback_wrong', 'vazamento não é só coisa física. material, tempo, energia, espaço e conhecimento — todos contam.'
      ),
      jsonb_build_object(
        'id', 'q3-mais-valioso',
        'type', 'long_text',
        'label', 'olhando seu mapa de fluxo: qual vazamento você acha que é o mais VALIOSO de resolver? (não o mais fácil, o mais valioso.)',
        'min_chars', 80,
        'no_feedback', true
      )
    )
  )
),
(
  '29e2d414-53ad-494f-8856-3d4a7caed582', 5, 'registro',
  'bônus: como restaurantes redesenham fluxo de resíduos orgânicos',
  'referências brasileiras (Sesc, Akatu, Comida Invisível) sobre compostagem e mapeamento de resíduos.',
  false, 8, 12,
  jsonb_build_object(
    'type', 'bonus_text',
    'badge', 'selo fluxo afiado',
    'search_query', 'compostagem restaurante Brasil case Sesc Akatu Comida Invisível',
    'search_url', 'https://www.google.com/search?q=compostagem+restaurante+Brasil+case+Sesc+Akatu+%22Comida+Invis%C3%ADvel%22',
    'disclaimer', 'o link específico pode mudar com o tempo. use a busca acima e priorize materiais do Sesc, Instituto Akatu ou Comida Invisível SP.',
    'response', jsonb_build_object(
      'label', 'se leu ou assistiu, registra:',
      'fields', jsonb_build_array(
        jsonb_build_object('id', 'aprendizado_caso', 'label', 'qual insight desse caso brasileiro te ajudou a olhar melhor pro SEU mapa de fluxo?', 'min_chars', 30)
      )
    )
  )
);
