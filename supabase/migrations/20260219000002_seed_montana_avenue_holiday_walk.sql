-- =====================================================
-- SEED DATA: Montana Avenue Holiday Walk Event
-- Date: 2026-02-19
-- Description: Add Montana Avenue Holiday Walk event with all details
-- =====================================================

INSERT INTO public.marketing_events (
  name,
  description,
  event_type,
  event_category,
  event_date,
  start_time,
  end_time,
  location,
  hosted_by,
  event_cost,
  status,
  payment_status,
  payment_date,
  vendor_status,
  contact_name,
  contact_email,
  contact_phone,
  expected_attendance,
  staffing_needs,
  expectations,
  physical_setup,
  communication_log,
  notes,
  created_at,
  updated_at
) VALUES (
  'Montana Avenue Holiday Walk',
  'The Holiday Walk runs 12 PM – 8 PM on Montana Avenue in Santa Monica. Enjoy nearly a mile of car-free Montana Avenue as thousands of neighbors and visitors gather for Santa, beloved appearances by the Grinch, Cindy Lou, and Elsa, plus festive performances and booths from local schools and Palisades neighbors. It''s the perfect place to share your seasonal products and connect with the community.',
  'street_fair',
  'offsite_tent',
  '2026-12-06',
  '12:00:00',
  '20:00:00',
  'Montana Avenue, Santa Monica',
  'Main Street Association/Montana Avenue Merchants Association',
  500.00,
  'confirmed',
  'paid',
  '2025-11-07',
  'Registered',
  'Jenny Rice',
  'marketing@mainstreetsm.com',
  '310-738-8711',
  8000,
  'Staff Needed: 4 people
Shift 1: 9am - 5:30pm (8.5 hours) - Alysia, Zu
Shift 2: 12:00pm - 9:00pm - Alexei, Hso confirmed
Shift 2 (partial): 6:00pm - 9:00pm - Dre',
  'Physical presence required. We are a vendor with a booth setup. Providing information and marketing materials to connect with the community.',
  'Booth Set Up
What they provide: table
Vendors must provide their own lighting as the event continues after dark. Access to electrical power is not available; vendors must plan accordingly. Setup and parking details will be sent with booth assignments.
We need to bring: chairs, tent, marketing materials',
  '[
    {
      "date": "2025-11-02",
      "type": "Email",
      "contact": "Jenny (marketing contact)",
      "summary": "Emailed Jenny regarding vendor registration",
      "notes": ""
    },
    {
      "date": "2025-11-02",
      "type": "Phone Call",
      "contact": "Event organizer",
      "summary": "Called for further inquiries",
      "notes": "They said vendor registration has not opened up yet"
    },
    {
      "date": "2025-11-07",
      "type": "Payment",
      "contact": "Main Street Association",
      "summary": "Payment finalized",
      "notes": "$500 booth fee paid"
    }
  ]'::jsonb,
  'EVENT STATUS: CONFIRMED

Payment finalized: 11/7/2025
Communication Notes:
- 11/2: Called for further inquiries and they said vendor registration has not opened up yet
- 11/2: Emailed Jenny (their marketing contact)

Additional Info:
- Foot traffic anticipated: 8,000 attendees
- Car-free event on Montana Avenue
- Features Santa, Grinch, Cindy Lou, and Elsa appearances
- Festive performances and booths from local schools and Palisades neighbors',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
