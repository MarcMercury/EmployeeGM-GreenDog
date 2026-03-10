-- Migration: Add newly identified IDEXX and Antech contact emails
-- Date: 2026-03-10

-- ================================================================
-- PART 1: Add new IDEXX contacts to med_ops_partner_contacts
-- ================================================================
DO $$
DECLARE
  v_idexx_id UUID;
BEGIN
  SELECT id INTO v_idexx_id FROM public.med_ops_partners WHERE name = 'Idexx Laboratories' LIMIT 1;

  IF v_idexx_id IS NOT NULL THEN
    -- Martha Coleman
    INSERT INTO public.med_ops_partner_contacts (partner_id, name, title, email, is_primary, relationship_notes)
    VALUES (v_idexx_id, 'Martha Coleman', 'IDEXX Contact', 'Martha-Coleman@idexx.com', false, 'IDEXX contact')
    ON CONFLICT DO NOTHING;

    -- Jillian Johnson
    INSERT INTO public.med_ops_partner_contacts (partner_id, name, title, email, is_primary, relationship_notes)
    VALUES (v_idexx_id, 'Jillian Johnson', 'IDEXX Contact', 'jillian-johnson@idexx.com', false, 'IDEXX contact')
    ON CONFLICT DO NOTHING;

    -- Celeste Roy
    INSERT INTO public.med_ops_partner_contacts (partner_id, name, title, email, is_primary, relationship_notes)
    VALUES (v_idexx_id, 'Celeste Roy', 'IDEXX Contact', 'Celeste-Roy@idexx.com', false, 'IDEXX contact')
    ON CONFLICT DO NOTHING;

    -- Jason Quinn
    INSERT INTO public.med_ops_partner_contacts (partner_id, name, title, email, is_primary, relationship_notes)
    VALUES (v_idexx_id, 'Jason Quinn', 'IDEXX Contact', 'Jason-Quinn@idexx.com', false, 'IDEXX contact')
    ON CONFLICT DO NOTHING;

    -- Michelle Knowles-Clifford
    INSERT INTO public.med_ops_partner_contacts (partner_id, name, title, email, is_primary, relationship_notes)
    VALUES (v_idexx_id, 'Michelle Knowles-Clifford', 'IDEXX Contact', 'michelle-clifford@idexx.com', false, 'IDEXX contact')
    ON CONFLICT DO NOTHING;

    -- Update Josh Pacheco with alternate email in notes (already exists with Josh-Pacheco@idexx.com)
    UPDATE public.med_ops_partner_contacts
    SET relationship_notes = COALESCE(relationship_notes, '') || E'\nAlternate email: josh-pacheco@idexx.com'
    WHERE partner_id = v_idexx_id AND name = 'Josh Pacheco'
      AND relationship_notes NOT LIKE '%josh-pacheco@idexx.com%';

    -- Joel Crawford already exists — no changes needed

    -- Billing/Software department contacts (stored as contacts for easy lookup)
    INSERT INTO public.med_ops_partner_contacts (partner_id, name, title, email, is_primary, relationship_notes)
    VALUES (v_idexx_id, 'IDEXX Software Billing', 'Billing/Software Dept', 'softwarebilling@idexx.com', false, 'Billing/Software department. Additional email: veterinarysoftware@idexx.com')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ================================================================
-- PART 2: Add Antech contacts to med_ops_partner_contacts
-- ================================================================
DO $$
DECLARE
  v_antech_id UUID;
BEGIN
  SELECT id INTO v_antech_id FROM public.med_ops_partners WHERE name = 'Antech Diagnostics' LIMIT 1;

  IF v_antech_id IS NOT NULL THEN
    -- Katherine Dean
    INSERT INTO public.med_ops_partner_contacts (partner_id, name, title, email, is_primary, relationship_notes)
    VALUES (v_antech_id, 'Katherine Dean', 'Antech Contact', 'Katherine.Dean@antechdx.com', false, 'Alternate email: Katherine.Dean@antechmail.com')
    ON CONFLICT DO NOTHING;

    -- Maureen Ryan
    INSERT INTO public.med_ops_partner_contacts (partner_id, name, title, email, is_primary, relationship_notes)
    VALUES (v_antech_id, 'Maureen Ryan', 'Antech Contact', 'Maureen.Ryan@antechdx.com', false, 'Alternate email: Maureen.Ryan@antechmail.com')
    ON CONFLICT DO NOTHING;

    -- Jeffrey Hayslip (also associated with Sound Vet)
    INSERT INTO public.med_ops_partner_contacts (partner_id, name, title, email, is_primary, relationship_notes)
    VALUES (v_antech_id, 'Jeffrey Hayslip', 'Antech / Sound Vet Contact', 'Jeffrey.Hayslip@antechdx.com', false, 'Also reachable at Jeff.hayslip@soundvet.com. Already listed under Sound partner as well.')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
