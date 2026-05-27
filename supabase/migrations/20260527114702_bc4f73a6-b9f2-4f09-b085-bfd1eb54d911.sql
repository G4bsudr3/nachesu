
-- 1. novo valor de enum pra notificações
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'admin_direct_message';

-- 2. tabela de mensagens manuais admin -> estudante
CREATE TABLE public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  author_id uuid NOT NULL,
  subject text NOT NULL,
  body_md text NOT NULL,
  link text,
  email_sent boolean NOT NULL DEFAULT false,
  notification_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_messages_recipient ON public.admin_messages(recipient_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_messages TO authenticated;
GRANT ALL ON public.admin_messages TO service_role;

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin gerencia mensagens manuais"
ON public.admin_messages FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND author_id = auth.uid());

CREATE POLICY "estudante lê próprias mensagens"
ON public.admin_messages FOR SELECT TO authenticated
USING (recipient_id = auth.uid());

CREATE POLICY "estudante marca como lida"
ON public.admin_messages FOR UPDATE TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- 3. templates editáveis dos nudges
CREATE TABLE public.nudge_templates (
  level text PRIMARY KEY,
  notification_title text NOT NULL,
  notification_body text NOT NULL,
  email_subject text NOT NULL,
  email_body_md text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nudge_templates TO authenticated;
GRANT ALL ON public.nudge_templates TO service_role;

ALTER TABLE public.nudge_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin gerencia nudge templates"
ON public.nudge_templates FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- seeds (3 níveis)
INSERT INTO public.nudge_templates (level, notification_title, notification_body, email_subject, email_body_md) VALUES
('medium',
 '{professor} passou pra ver como você tá',
 'faz {dias} dias que você não aparece em {curso}',
 'oi {nome}, tudo bem por aí?',
 E'oi {nome},\n\npassei aqui só pra te lembrar que {curso} continua te esperando. faz {dias} dias que você não dá um pulo. sem cobrança, só queria saber se tá tudo bem.\n\nse quiser retomar, é só clicar abaixo.\n\nabraço,\n{professor}'),
('high',
 '{professor} sentiu sua falta',
 'faz {dias} dias que você não aparece em {curso}',
 '{nome}, vamos retomar juntos?',
 E'oi {nome},\n\nfaz {dias} dias desde sua última atividade em {curso} e tô sentindo sua falta por aqui. quero entender se rolou algo, se travou em algum ponto ou se precisa de uma força.\n\nme responde esse e-mail ou volta pelo link, eu fico de olho.\n\n{professor}'),
('lost',
 '{professor} mandou uma mensagem',
 'faz {dias} dias que você não aparece em {curso}',
 '{nome}, ainda dá tempo',
 E'oi {nome},\n\njá faz {dias} dias e não quero te perder por aqui. {curso} foi pensado pra gente fazer junto, no seu ritmo, mas precisa do seu passo.\n\nse quiser conversar antes de voltar, me responde. se quiser só retomar, o botão tá embaixo.\n\nabraço grande,\n{professor}');
