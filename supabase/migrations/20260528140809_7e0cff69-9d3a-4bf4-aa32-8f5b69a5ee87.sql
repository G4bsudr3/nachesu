
-- (re)cria o trigger que dispara handle_new_user em cada signup (incl. admin createUser)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- vincula convites de curso (claim_course_invites_on_signup) na mesma criação
DROP TRIGGER IF EXISTS on_auth_user_created_claim_invites ON auth.users;
CREATE TRIGGER on_auth_user_created_claim_invites
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.claim_course_invites_on_signup();
