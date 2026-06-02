-- Migration: remove customer_payable_amount
-- Purpose: Remove the auto-calculated customer payable amount from waiver_requests.

ALTER TABLE public.waiver_requests
DROP COLUMN IF EXISTS customer_payable_amount;
