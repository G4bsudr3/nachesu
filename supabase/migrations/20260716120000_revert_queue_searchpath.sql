-- REVERT do SEC-09 (search_path nas funções de fila).
-- O SET search_path aplicado em 20260716090000 entrou no caminho SÍNCRONO do
-- envio de e-mail de auth (auth-email-hook → rpc enqueue_email → pgmq.send) e
-- passou a causar 500 no /auth/v1/otp (magic link). SEC-09 é severidade Baixa;
-- não vale manter o login degradado por ele. Restaura o comportamento original
-- (função sem search_path fixo, herdando o do chamador — estado que rodou em
-- produção por meses).
ALTER FUNCTION public.enqueue_email(text, jsonb) RESET search_path;
ALTER FUNCTION public.read_email_batch(text, integer, integer) RESET search_path;
ALTER FUNCTION public.delete_email(text, bigint) RESET search_path;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) RESET search_path;
