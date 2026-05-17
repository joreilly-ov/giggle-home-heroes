-- ═══════════════════════════════════════════════════════════════════════════════
-- TEST DATA — KisXCars car repair vertical
-- ═══════════════════════════════════════════════════════════════════════════════
-- All records in this migration are clearly marked as test data.
-- It is blindly obvious these are not real users.
--
-- Password for ALL test accounts: TestData123!
--
-- Garages (sign in at /auth then navigate to /contractor/profile):
--   test-fastfix@kisxcars.test      → TEST Fast Fix Autos      (Bodywork/Interior,  avg ≈ 4.5★)
--   test-drivewell@kisxcars.test    → TEST DriveWell Motors     (Mechanical/General, avg ≈ 2.9★)
--   test-quickspark@kisxcars.test   → TEST Quickspark Electrics (Electrical,         avg ≈ 4.8★)
--
-- Vehicle owners (sign in at /auth then navigate to /dashboard):
--   test-alice@kisxcars.test   → TEST Alice
--   test-bob@kisxcars.test     → TEST Bob
--   test-carol@kisxcars.test   → TEST Carol
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  -- ── Auth user IDs (garage accounts) ──────────────────────────────────────
  v_g1  UUID := '00000000-0000-0001-0000-000000000001'; -- TEST Fast Fix Autos
  v_g2  UUID := '00000000-0000-0001-0000-000000000002'; -- TEST DriveWell Motors
  v_g3  UUID := '00000000-0000-0001-0000-000000000003'; -- TEST Quickspark Electrics

  -- ── Contractor table PKs (contractors.id, referenced by reviews) ──────────
  v_c1  UUID := '00000000-0000-0002-0000-000000000001'; -- Fast Fix Autos contractor row
  v_c2  UUID := '00000000-0000-0002-0000-000000000002'; -- DriveWell Motors contractor row
  v_c3  UUID := '00000000-0000-0002-0000-000000000003'; -- Quickspark Electrics contractor row

  -- ── Auth user IDs (vehicle owner accounts) ────────────────────────────────
  v_o1  UUID := '00000000-0000-0003-0000-000000000001'; -- TEST Alice
  v_o2  UUID := '00000000-0000-0003-0000-000000000002'; -- TEST Bob
  v_o3  UUID := '00000000-0000-0003-0000-000000000003'; -- TEST Carol

  v_pw  TEXT := crypt('TestData123!', gen_salt('bf'));
  v_iid UUID := '00000000-0000-0000-0000-000000000000'; -- GoTrue instance_id
BEGIN

  -- ── 1. Auth users — garages ───────────────────────────────────────────────
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES
    (v_g1, v_iid, 'authenticated', 'authenticated',
     'test-fastfix@kisxcars.test', v_pw, now() - interval '30 days',
     '{"full_name": "TEST Fast Fix Autos"}'::jsonb,
     now() - interval '30 days', now()),
    (v_g2, v_iid, 'authenticated', 'authenticated',
     'test-drivewell@kisxcars.test', v_pw, now() - interval '25 days',
     '{"full_name": "TEST DriveWell Motors"}'::jsonb,
     now() - interval '25 days', now()),
    (v_g3, v_iid, 'authenticated', 'authenticated',
     'test-quickspark@kisxcars.test', v_pw, now() - interval '20 days',
     '{"full_name": "TEST Quickspark Electrics"}'::jsonb,
     now() - interval '20 days', now())
  ON CONFLICT (id) DO NOTHING;

  -- ── 2. Auth users — vehicle owners ───────────────────────────────────────
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES
    (v_o1, v_iid, 'authenticated', 'authenticated',
     'test-alice@kisxcars.test', v_pw, now() - interval '28 days',
     '{"full_name": "TEST Alice"}'::jsonb,
     now() - interval '28 days', now()),
    (v_o2, v_iid, 'authenticated', 'authenticated',
     'test-bob@kisxcars.test', v_pw, now() - interval '22 days',
     '{"full_name": "TEST Bob"}'::jsonb,
     now() - interval '22 days', now()),
    (v_o3, v_iid, 'authenticated', 'authenticated',
     'test-carol@kisxcars.test', v_pw, now() - interval '18 days',
     '{"full_name": "TEST Carol"}'::jsonb,
     now() - interval '18 days', now())
  ON CONFLICT (id) DO NOTHING;

  -- ── 3. Auth identities (required for email/password sign-in in GoTrue) ────
  -- provider_id = email address for the email provider (NOT NULL in newer GoTrue)
  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider,
                                last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'test-fastfix@kisxcars.test', v_g1,
     json_build_object('sub', v_g1::text, 'email', 'test-fastfix@kisxcars.test')::jsonb,
     'email', now(), now(), now()),
    (gen_random_uuid(), 'test-drivewell@kisxcars.test', v_g2,
     json_build_object('sub', v_g2::text, 'email', 'test-drivewell@kisxcars.test')::jsonb,
     'email', now(), now(), now()),
    (gen_random_uuid(), 'test-quickspark@kisxcars.test', v_g3,
     json_build_object('sub', v_g3::text, 'email', 'test-quickspark@kisxcars.test')::jsonb,
     'email', now(), now(), now()),
    (gen_random_uuid(), 'test-alice@kisxcars.test', v_o1,
     json_build_object('sub', v_o1::text, 'email', 'test-alice@kisxcars.test')::jsonb,
     'email', now(), now(), now()),
    (gen_random_uuid(), 'test-bob@kisxcars.test', v_o2,
     json_build_object('sub', v_o2::text, 'email', 'test-bob@kisxcars.test')::jsonb,
     'email', now(), now(), now()),
    (gen_random_uuid(), 'test-carol@kisxcars.test', v_o3,
     json_build_object('sub', v_o3::text, 'email', 'test-carol@kisxcars.test')::jsonb,
     'email', now(), now(), now())
  ON CONFLICT DO NOTHING;

  -- ── 4. Contractors (the garage rows in Supabase) ──────────────────────────
  INSERT INTO public.contractors (id, user_id, business_name, postcode, phone, expertise,
                                   license_number, insurance_details, created_at, updated_at)
  VALUES
    (v_c1, v_g1,
     'TEST Fast Fix Autos', '90210', '555-000-0001',
     ARRAY['Bodywork', 'Interior']::text[],
     'TEST-LIC-FF-001', 'TEST — Fakewell Insurance Co, policy #FF-2024',
     now() - interval '30 days', now()),
    (v_c2, v_g2,
     'TEST DriveWell Motors', '10001', '555-000-0002',
     ARRAY['Mechanical', 'General']::text[],
     'TEST-LIC-DW-002', 'TEST — Fakewell Insurance Co, policy #DW-2024',
     now() - interval '25 days', now()),
    (v_c3, v_g3,
     'TEST Quickspark Electrics', '60601', '555-000-0003',
     ARRAY['Electrical', 'Mechanical']::text[],
     'TEST-LIC-QS-003', 'TEST — Fakewell Insurance Co, policy #QS-2024',
     now() - interval '20 days', now())
  ON CONFLICT (id) DO NOTHING;

  -- ── 5. Profiles (vehicle owner rows in Supabase) ──────────────────────────
  INSERT INTO public.profiles (id, email, full_name, interests,
                                postcode, road_address, city, state, created_at)
  VALUES
    (v_o1, 'test-alice@kisxcars.test', 'TEST Alice',
     ARRAY['Bodywork', 'Mechanical']::text[],
     '90210', '1 Test Street', 'Beverly Hills', 'CA',
     now() - interval '28 days'),
    (v_o2, 'test-bob@kisxcars.test', 'TEST Bob',
     ARRAY['Tyres', 'Windscreen']::text[],
     '10001', '2 Test Road', 'New York', 'NY',
     now() - interval '22 days'),
    (v_o3, 'test-carol@kisxcars.test', 'TEST Carol',
     ARRAY['Electrical', 'Interior']::text[],
     '60601', '3 Test Avenue', 'Chicago', 'IL',
     now() - interval '18 days')
  ON CONFLICT (id) DO NOTHING;

  -- ── 6. User metadata — mark owners as fully onboarded ────────────────────
  INSERT INTO public.user_metadata (id, setup_complete, updated_at)
  VALUES
    (v_o1, true, now()),
    (v_o2, true, now()),
    (v_o3, true, now())
  ON CONFLICT (id) DO UPDATE SET setup_complete = true;

END $$;

-- ── 7. Reviews ────────────────────────────────────────────────────────────────
-- reviewer_id has no FK constraint (DEFAULT auth.uid()), so owner UUIDs used directly.
-- contractor_id → contractors.id (must exist — inserted above).

INSERT INTO public.reviews (contractor_id, reviewer_id, job_id,
                             rating_quality, rating_communication, rating_cleanliness,
                             comment, created_at)
VALUES

  -- ── TEST Fast Fix Autos — 4 reviews, avg ≈ 4.5★ ──────────────────────────
  ('00000000-0000-0002-0000-000000000001', '00000000-0000-0003-0000-000000000001',
   'test-job-001', 5, 5, 4,
   'TEST DATA — Brilliant bodywork repair on my BMW 3 Series front bumper. You would never know it was damaged. Finished same day, very tidy workshop.',
   now() - interval '20 days'),

  ('00000000-0000-0002-0000-000000000001', '00000000-0000-0003-0000-000000000002',
   'test-job-002', 4, 5, 5,
   'TEST DATA — Fixed a nasty door dent on my Ford Focus. Paint matched perfectly. Very professional team, no drama.',
   now() - interval '14 days'),

  ('00000000-0000-0002-0000-000000000001', '00000000-0000-0003-0000-000000000003',
   'test-job-003', 5, 4, 5,
   'TEST DATA — Sorted out my Vauxhall interior trim. Looks brand new. Competitive quote and exactly what was charged.',
   now() - interval '7 days'),

  ('00000000-0000-0002-0000-000000000001', '00000000-0000-0003-0000-000000000001',
   'test-job-004', 4, 4, 4,
   'TEST DATA — Good repair on a scrape along the side of my Audi A4. Took slightly longer than quoted but the finish is excellent.',
   now() - interval '2 days'),

  -- ── TEST DriveWell Motors — 3 reviews, avg ≈ 2.9★ ────────────────────────
  ('00000000-0000-0002-0000-000000000002', '00000000-0000-0003-0000-000000000001',
   'test-job-005', 3, 3, 2,
   'TEST DATA — Engine service done OK but left oily fingerprints on the engine cover and did not clean up after themselves. Car runs well now though.',
   now() - interval '18 days'),

  ('00000000-0000-0002-0000-000000000002', '00000000-0000-0003-0000-000000000002',
   'test-job-006', 4, 3, 3,
   'TEST DATA — Sorted the rough idle on my Toyota Corolla eventually. Required two visits to fully resolve but they got there in the end.',
   now() - interval '9 days'),

  ('00000000-0000-0002-0000-000000000002', '00000000-0000-0003-0000-000000000003',
   'test-job-007', 2, 3, 2,
   'TEST DATA — Took longer than estimated and communication was poor throughout. The repair itself seems to be holding up at least.',
   now() - interval '3 days'),

  -- ── TEST Quickspark Electrics — 4 reviews, avg ≈ 4.8★ ────────────────────
  ('00000000-0000-0002-0000-000000000003', '00000000-0000-0003-0000-000000000001',
   'test-job-008', 5, 5, 5,
   'TEST DATA — Diagnosed and fixed a complex electrical fault that two other garages had missed entirely. Absolute experts with car electrics.',
   now() - interval '25 days'),

  ('00000000-0000-0002-0000-000000000003', '00000000-0000-0003-0000-000000000002',
   'test-job-009', 5, 5, 4,
   'TEST DATA — Alternator replaced on my Volkswagen Golf. Parts and labour warranty provided. Highly recommended — will use again.',
   now() - interval '16 days'),

  ('00000000-0000-0002-0000-000000000003', '00000000-0000-0003-0000-000000000003',
   'test-job-010', 5, 4, 5,
   'TEST DATA — Fixed the flickering dashboard on my Honda Civic. Turned out to be a wiring loom fault — very knowledgeable and thorough team.',
   now() - interval '6 days'),

  ('00000000-0000-0002-0000-000000000003', '00000000-0000-0003-0000-000000000001',
   'test-job-011', 5, 5, 5,
   'TEST DATA — Third time using Quickspark. Rewired the entire lighting circuit on my Audi A4. Perfect result as always. Worth every penny.',
   now() - interval '1 day');
