ALTER TABLE public.hub_certificates
  DROP CONSTRAINT IF EXISTS hub_certificates_design_variant_check;

ALTER TABLE public.hub_certificates
  ADD CONSTRAINT hub_certificates_design_variant_check
  CHECK (
    design_variant IN ('editorial','tarot','manifesto')
    OR design_variant LIKE 'ai-%'
  );