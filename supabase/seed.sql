-- Supabase Local Development Database Seed Script
-- Populates auth.users and public tables with high-fidelity mock cases.

-- Auth users are intentionally not seeded in production. Create the first Admin
-- through the Supabase Auth Admin API/Studio with user metadata:
-- {"full_name":"System Admin","role":"Admin","username":"admin"}.

-- 8a. Insert Main Dispositions
INSERT INTO public.main_dispositions (id, name, is_active) VALUES
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Contactable', TRUE),
('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Non-Contactable', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 8b. Insert Sub Dispositions with Dynamic Schema
INSERT INTO public.sub_dispositions (id, main_disposition_id, name, form_schema, is_active) VALUES
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Call Back', '[{"id":"follow_up_date","label":"Callback Date & Time","type":"datetime-local","required":true}]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Promise to Pay', '[{"id":"ptp_date","label":"Commitment Promise Date","type":"date","required":true},{"id":"ptp_amount","label":"Commitment Amount (₹)","type":"number","required":true}]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Agree to Pay', '[{"id":"ptp_date","label":"Commitment Promise Date","type":"date","required":true},{"id":"ptp_amount","label":"Commitment Amount (₹)","type":"number","required":true}]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Refuse to Pay', '[]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Wrong Number', '[]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Out of Station', '[]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Intentional Issue', '[]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a08', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Financial Issue', '[]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a09', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Legal Issue', '[]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Dispute', '[]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Call Disconnect', '[]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Customer Expired', '[]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Broken PTP', '[]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Customer Claims Paid', '[]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Part Paid', '[{"id":"payment_date","label":"Payment Date","type":"date","required":true},{"id":"paid_amount","label":"Paid Amount (₹)","type":"number","required":true}]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Ringing No Response', '[]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Swithced off', '[]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Not Reachable', '[]'::jsonb, TRUE),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Number Does Not Exist', '[]'::jsonb, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 8c. Insert Waiver Reasons
INSERT INTO public.waiver_reasons (id, reason, is_active) VALUES
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Hardship settlement', TRUE),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Dispute over charges', TRUE)
ON CONFLICT (id) DO NOTHING;
