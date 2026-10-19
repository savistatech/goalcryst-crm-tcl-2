-- TCL-2 import template reduced to 125 columns (TCL-2 Header.xlsx).
-- Columns no longer imported are intentionally kept (nullable, unused) so no data is lost.
-- CONTACT_MODE now maps to a single contact_mode column instead of sept_contact_mode.
ALTER TABLE public.contract_trails
  ADD COLUMN IF NOT EXISTS contact_mode TEXT;

UPDATE public.contract_trails
  SET contact_mode = sept_contact_mode
  WHERE contact_mode IS NULL AND sept_contact_mode IS NOT NULL;
