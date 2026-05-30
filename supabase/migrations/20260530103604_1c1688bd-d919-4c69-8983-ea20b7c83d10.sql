CREATE POLICY "admin atualiza qualquer profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

UPDATE public.profiles
SET status='active',
    approved_at=now(),
    approved_by_admin_id='eeb9045d-9b35-42dd-98e4-355269f0a082'
WHERE status='pending';