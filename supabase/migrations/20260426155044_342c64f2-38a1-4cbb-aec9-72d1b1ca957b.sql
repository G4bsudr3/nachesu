-- 1. Drop FKs polimórficas indevidas
ALTER TABLE public.hub_reactions DROP CONSTRAINT IF EXISTS hub_reactions_submission_id_fkey;
ALTER TABLE public.hub_comments DROP CONSTRAINT IF EXISTS hub_comments_submission_id_fkey;

-- 2. Recriar UNIQUE incluindo target_kind
ALTER TABLE public.hub_reactions DROP CONSTRAINT IF EXISTS hub_reactions_user_id_submission_id_emoji_key;
ALTER TABLE public.hub_reactions ADD CONSTRAINT hub_reactions_unique_per_target UNIQUE (user_id, target_id, target_kind, emoji);

ALTER TABLE public.hub_comments DROP CONSTRAINT IF EXISTS hub_comments_user_id_submission_id_key;
ALTER TABLE public.hub_comments ADD CONSTRAINT hub_comments_unique_per_target UNIQUE (user_id, target_id, target_kind);

-- 3. Atualizar CHECK de target_kind pra aceitar 4 tipos
ALTER TABLE public.hub_reactions DROP CONSTRAINT IF EXISTS hub_reactions_target_kind_chk;
ALTER TABLE public.hub_reactions ADD CONSTRAINT hub_reactions_target_kind_chk
  CHECK (target_kind IN ('submission','project','material','album_photo'));

ALTER TABLE public.hub_comments DROP CONSTRAINT IF EXISTS hub_comments_target_kind_chk;
ALTER TABLE public.hub_comments ADD CONSTRAINT hub_comments_target_kind_chk
  CHECK (target_kind IN ('submission','project','material','album_photo'));

-- 4. Triggers de limpeza órfãos quando alvo é deletado (substitui o ON DELETE CASCADE da FK)
CREATE OR REPLACE FUNCTION public.cleanup_hub_engagement_for_target()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _kind text;
BEGIN
  IF TG_TABLE_NAME = 'mission_submissions' THEN _kind := 'submission';
  ELSIF TG_TABLE_NAME = 'hub_projects' THEN _kind := 'project';
  ELSIF TG_TABLE_NAME = 'hub_materials' THEN _kind := 'material';
  ELSIF TG_TABLE_NAME = 'hub_album_photos' THEN _kind := 'album_photo';
  ELSE RETURN OLD;
  END IF;

  DELETE FROM public.hub_reactions WHERE target_id = OLD.id AND target_kind = _kind;
  DELETE FROM public.hub_comments  WHERE target_id = OLD.id AND target_kind = _kind;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_engagement_subs ON public.mission_submissions;
CREATE TRIGGER trg_cleanup_engagement_subs
  AFTER DELETE ON public.mission_submissions
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_hub_engagement_for_target();

DROP TRIGGER IF EXISTS trg_cleanup_engagement_projects ON public.hub_projects;
CREATE TRIGGER trg_cleanup_engagement_projects
  AFTER DELETE ON public.hub_projects
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_hub_engagement_for_target();

DROP TRIGGER IF EXISTS trg_cleanup_engagement_materials ON public.hub_materials;
CREATE TRIGGER trg_cleanup_engagement_materials
  AFTER DELETE ON public.hub_materials
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_hub_engagement_for_target();

DROP TRIGGER IF EXISTS trg_cleanup_engagement_album ON public.hub_album_photos;
CREATE TRIGGER trg_cleanup_engagement_album
  AFTER DELETE ON public.hub_album_photos
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_hub_engagement_for_target();

-- 5. Validação de integridade leve (sem FK): trigger antes de INSERT em reactions/comments
CREATE OR REPLACE FUNCTION public.validate_hub_engagement_target()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exists boolean;
BEGIN
  IF NEW.target_kind = 'submission' THEN
    SELECT EXISTS(SELECT 1 FROM public.mission_submissions WHERE id = NEW.target_id) INTO _exists;
  ELSIF NEW.target_kind = 'project' THEN
    SELECT EXISTS(SELECT 1 FROM public.hub_projects WHERE id = NEW.target_id) INTO _exists;
  ELSIF NEW.target_kind = 'material' THEN
    SELECT EXISTS(SELECT 1 FROM public.hub_materials WHERE id = NEW.target_id) INTO _exists;
  ELSIF NEW.target_kind = 'album_photo' THEN
    SELECT EXISTS(SELECT 1 FROM public.hub_album_photos WHERE id = NEW.target_id) INTO _exists;
  ELSE
    RAISE EXCEPTION 'target_kind inválido: %', NEW.target_kind;
  END IF;

  IF NOT _exists THEN
    RAISE EXCEPTION 'target_id % não existe em %', NEW.target_id, NEW.target_kind;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_reaction_target ON public.hub_reactions;
CREATE TRIGGER trg_validate_reaction_target
  BEFORE INSERT ON public.hub_reactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_hub_engagement_target();

DROP TRIGGER IF EXISTS trg_validate_comment_target ON public.hub_comments;
CREATE TRIGGER trg_validate_comment_target
  BEFORE INSERT ON public.hub_comments
  FOR EACH ROW EXECUTE FUNCTION public.validate_hub_engagement_target();