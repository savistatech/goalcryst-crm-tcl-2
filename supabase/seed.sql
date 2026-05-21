-- Supabase Local Development Database Seed Script
-- Populates auth.users and public tables with high-fidelity mock cases.

-- 1. Create default operators in auth.users (Password is 'password123')
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
  '00000000-0000-0000-0000-000000000000', 
  'admin@goalcryst.com', 
  '$2a$10$Yn1.HmsMvL/h52tE8KjTse1Lh6/528U6m/gEGB000gKj1e.bE.GKy', 
  NOW(), NOW(), NOW(), 
  '{"provider":"email","providers":["email"]}', 
  '{"full_name":"Super Admin","role":"Super Admin"}', 
  FALSE, 
  'authenticated', 
  'authenticated'
),
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 
  '00000000-0000-0000-0000-000000000000', 
  'manager@goalcryst.com', 
  '$2a$10$Yn1.HmsMvL/h52tE8KjTse1Lh6/528U6m/gEGB000gKj1e.bE.GKy', 
  NOW(), NOW(), NOW(), 
  '{"provider":"email","providers":["email"]}', 
  '{"full_name":"Vikram Naidu","role":"Manager"}', 
  FALSE, 
  'authenticated', 
  'authenticated'
),
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 
  '00000000-0000-0000-0000-000000000000', 
  'agent@goalcryst.com', 
  '$2a$10$Yn1.HmsMvL/h52tE8KjTse1Lh6/528U6m/gEGB000gKj1e.bE.GKy', 
  NOW(), NOW(), NOW(), 
  '{"provider":"email","providers":["email"]}', 
  '{"full_name":"Anjali Rao","role":"Agent"}', 
  FALSE, 
  'authenticated', 
  'authenticated'
),
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 
  '00000000-0000-0000-0000-000000000000', 
  'auditor@goalcryst.com', 
  '$2a$10$Yn1.HmsMvL/h52tE8KjTse1Lh6/528U6m/gEGB000gKj1e.bE.GKy', 
  NOW(), NOW(), NOW(), 
  '{"provider":"email","providers":["email"]}', 
  '{"full_name":"Syed Imran","role":"Auditor"}', 
  FALSE, 
  'authenticated', 
  'authenticated'
);

-- Note: The triggers will automatically create rows in public.profiles:
-- 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' -> Super Admin
-- 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12' -> Manager
-- 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13' -> Agent
-- 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14' -> Auditor

-- 2. Create sample import batch
INSERT INTO public.import_batches (id, filename, uploaded_by, total_rows, imported_count, duplicates_skipped, failed_count)
VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'Inputs for CRM Creation.xlsx', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 3, 3, 0, 0);

-- 3. Insert customer contracts (16 Account & Allocation fields)
INSERT INTO public.contracts (
  contract_no, customer_name, product, branch, state, area, region, 
  secured_category, allocation_category, bom_dpd, mob, bucket, bom_bucket, 
  secured_product_flag, product_detail, allocation_dpd_category, allocated_to, batch_id
) VALUES
(
  'GC-LOS-231029', 
  'Mrs. ARUNA KUMARI ADI', 
  'LAP', 
  'VIJAYAWADA', 
  'ANDHRA PRADESH', 
  'ANDHRA PRADESH', 
  'SOUTH 1', 
  'LOS', 
  'LOS', 
  143, 
  115, 
  5, 
  5, 
  'LOS', 
  'LAP', 
  'LOS',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20'
),
(
  'GC-LOS-458921', 
  'MR. CHANDRA SHEKHAR', 
  'AUTO', 
  'CHENNAI', 
  'TAMIL NADU', 
  'CHENNAI AREA', 
  'SOUTH 2', 
  'LOS', 
  'LOS', 
  78, 
  45, 
  3, 
  3, 
  'LOS', 
  'AUTO', 
  'LOS',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20'
),
(
  'GC-LOS-894102', 
  'MR. RAMANATHAN PILLAI', 
  'LAP', 
  'BANGALORE', 
  'KARNATAKA', 
  'BANGALORE AREA', 
  'SOUTH 1', 
  'LOS', 
  'LOS', 
  110, 
  88, 
  4, 
  4, 
  'LOS', 
  'LAP', 
  'LOS',
  NULL,
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20'
);

-- 4. Insert contact details
INSERT INTO public.contract_contacts (
  contract_no, mobile_1, mobile_no, primary_mobile, primary_mobile_1, 
  ref_name_1, ref_mobile_1, ref_relation_1,
  base_address, landmark, pincode, master_primary_address, permanent_address, office_address
) VALUES
(
  'GC-LOS-231029',
  '8688980367',
  '9849201029',
  '8688980367',
  '8688980367',
  'Adi Ranga Rao',
  '9988223344',
  'Spouse',
  'D NO.23-10-29, VENKATA SAI NILAYAM, BROKERS BAZAR, GUNTUR',
  'Brokers Bazar Guntur',
  '522003',
  'D NO.23-10-29,PLOT NO.5, VENKATA SAI NILAYAM, BROKERS BAZAR, GUNTUR, ANDHRA PRADESH, 522003',
  'D NO.23-10-29, VENKATA SAI NILAYAM, BROKERS BAZAR, GUNTUR',
  'D NO.79, C/O VEERANJANEYA COTTON GINNING MILL, GUNTUR, ANDHRA PRADESH, 522003'
),
(
  'GC-LOS-458921',
  '9944012345',
  '9944054321',
  '9944012345',
  '9944012345',
  'Sekhar Srinivasan',
  '9876543210',
  'Father',
  'NO 45, SECOND CROSS STREET, ANNA NAGAR, CHENNAI',
  'Near Post Office',
  '600040',
  'NO 45, SECOND CROSS STREET, ANNA NAGAR, CHENNAI, TAMIL NADU, 600040',
  'NO 45, SECOND CROSS STREET, ANNA NAGAR, CHENNAI',
  'OFFICE NO 10, TIDEL PARK, TARAMANI, CHENNAI'
),
(
  'GC-LOS-894102',
  '9886012345',
  '9886098765',
  '9886012345',
  '9886012345',
  'Pillai Murugan',
  '9123456789',
  'Brother',
  'FLAT 102, GOKULAM RESIDENCY, JAYANAGAR 4TH BLOCK, BANGALORE',
  'Opposite Metro Pillar 140',
  '560041',
  'FLAT 102, GOKULAM RESIDENCY, JAYANAGAR 4TH BLOCK, BANGALORE, KARNATAKA, 560041',
  'FLAT 102, GOKULAM RESIDENCY, JAYANAGAR, BANGALORE',
  'BLOCK B, INFOSYS CAMPUS, ELECTRONICS CITY, BANGALORE'
);

-- 5. Insert Asset & Vehicle details
INSERT INTO public.contract_assets (
  contract_no, manufacturer, asset_model, rc_number, asset_category, engine_number, chassis_number, year_of_manufacture
) VALUES
(
  'GC-LOS-231029',
  'TOYOTA',
  'INNOVA CRYSTA',
  'AP07CL1234',
  'MUV',
  '2TR-FE-129482',
  'MHF123LAP829381',
  '2021'
),
(
  'GC-LOS-458921',
  'HYUNDAI',
  'CRETA SX',
  'TN02BM5678',
  'SUV',
  'D4FA-928341',
  'MAL928AUT381928',
  '2022'
),
(
  'GC-LOS-894102',
  'TATA',
  'NEXON EV',
  'KA05EQ8899',
  'EV SUV',
  'EMOTOR-338291',
  'MAT281LAP399281',
  '2023'
);

-- 6. Insert Financial exposure
INSERT INTO public.contract_financials (
  contract_no, finance_amount, total_pos_outstanding, pos, total_amount_collectable, emi_amount, od_amount, principal_overdue, interest_overdue, bounce_charges, current_odc, total_outstanding
) VALUES
(
  'GC-LOS-231029',
  2500000.00,
  1850000.00,
  1850000.00,
  212000.00,
  45000.00,
  135000.00,
  95000.00,
  40000.00,
  5500.00,
  12000.00,
  152500.00
),
(
  'GC-LOS-458921',
  1200000.00,
  820000.00,
  820000.00,
  98000.00,
  22500.00,
  67500.00,
  48000.00,
  19500.00,
  2200.00,
  5800.00,
  75500.00
),
(
  'GC-LOS-894102',
  1800000.00,
  1350000.00,
  1350000.00,
  156000.00,
  32000.00,
  96000.00,
  72000.00,
  24000.00,
  44000.00,
  9200.00,
  109600.00
);

-- 7. Insert Legal status (using Mrs. Aruna Kumari actual disposed values)
INSERT INTO public.contract_legal (
  contract_no, notice_sent_sec138, type_of_case, cheque_amount, cheque_date, cheque_no,
  sec138_current_status, group_stage, case_no, court_location, court_name, ldoh, ndoh, advocate, legal_status
) VALUES
(
  'GC-LOS-231029',
  'SENT',
  'CC CASE',
  45000.00,
  '2025-06-15',
  '482938',
  'CASE DISPOSED',
  'CASE DISPOSED',
  '147/2019',
  'VIJAYAWADA',
  'Chif Metropolitan Magistrate',
  '2026-04-12',
  '-',
  'Kunuku Raja Sekhar',
  'CASE DISPOSED-'
),
(
  'GC-LOS-458921',
  'SENT',
  'CC CASE',
  22500.00,
  '2025-09-10',
  '002918',
  'HEARING ON SUMMONS',
  'PENDING CASE',
  '928/2023',
  'CHENNAI',
  'IX Metropolitan Magistrate Court',
  '2026-05-10',
  '2026-06-12',
  'M. Ramaswamy',
  'ACTIVE HEARINGS'
),
(
  'GC-LOS-894102',
  'PENDING',
  'ARBITRATION',
  0.00,
  NULL,
  '-',
  'NOT INITIATED',
  'PENDING EP',
  'ARB 112/2024',
  'BANGALORE',
  'Arbitration Tribunal Bangalore',
  '2026-03-05',
  '2026-06-25',
  'K. L. Gowda',
  'ARBITRATION AWARDED'
);

-- 8. Insert sample call dispositions
INSERT INTO public.dispositions (
  contract_no, agent_id, main_disposition, sub_disposition, remarks, follow_up_date, ptp_date, ptp_amount
) VALUES
(
  'GC-LOS-231029',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
  'Contactable',
  'Promise to Pay',
  'Customer agreed to clear one pending EMI outstanding of ₹45,000 on 23rd May. Promised to share payment receipt immediately.',
  NULL,
  '2026-05-23',
  45000.00
),
(
  'GC-LOS-458921',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
  'Contactable',
  'Call Back',
  'Customer traveling, requested a callback scheduled on 21st May morning 10 AM to discuss settlement waiver options.',
  '2026-05-21 10:00:00+05:30',
  NULL,
  NULL
);
