-- Drop partial unique index that ON CONFLICT cannot match
DROP INDEX IF EXISTS public.fbi_responses_email_unique;

-- Add a regular unique constraint on email
ALTER TABLE public.fbi_responses
  ADD CONSTRAINT fbi_responses_email_key UNIQUE (email);