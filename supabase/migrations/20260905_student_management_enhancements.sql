-- Phase 2 student management: persist reject/deactivate reasons and
-- allow admins to update those profile fields without weakening student RLS.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_by UUID;

ALTER TABLE public.approval_status
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.approval_status
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles (is_active);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Students can still edit their own profile, but cannot self-reactivate
-- or rewrite admin deactivation metadata.
CREATE OR REPLACE FUNCTION public.protect_profile_activation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NEW.is_active := OLD.is_active;
    NEW.deactivation_reason := OLD.deactivation_reason;
    NEW.deactivated_at := OLD.deactivated_at;
    NEW.deactivated_by := OLD.deactivated_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_activation_fields ON public.profiles;
CREATE TRIGGER protect_profile_activation_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_activation_fields();
