-- ============================================================================
-- Doctor Cares — Seed data · Health tips (8 starter posts)
-- ============================================================================
-- Run this once in the Supabase SQL Editor to populate the Health Tips feed
-- so new patients see useful content on day one instead of an empty state.
-- Each tip is set is_published=true so it appears on the patient home immediately.
-- Safe to re-run: ON CONFLICT ignores existing titles.
-- ============================================================================

insert into public.health_tips (title, body, category, is_published, published_at, created_at)
values
(
  'Stay hydrated — 2L per day',
  E'Drinking enough water keeps your kidneys flushed, your skin clear, and your energy up. The simple target: 2 litres of water per day for an adult, more in hot weather or if you''re exercising.\n\nTips:\n• Carry a 500ml bottle and refill it 4 times\n• Add a slice of lemon or cucumber for flavour without sugar\n• Watch for signs of dehydration: dark urine, headaches, fatigue\n\nSkip sugary drinks — they add calories without hydrating as effectively.',
  'nutrition', true, now() - interval '1 day', now() - interval '1 day'
),
(
  'High blood pressure: silent but serious',
  E'High blood pressure (hypertension) often has no symptoms, but over time it damages your heart, kidneys, and brain. It''s one of the biggest health risks in Ghana — about 1 in 3 adults has it.\n\nWhat you can do:\n• Check your BP at least once a year (your clinician or any pharmacy)\n• Reduce salt — avoid salted fish, cubes, and processed foods\n• Walk 30 minutes a day, 5 days a week\n• Manage stress with sleep, prayer, or meditation\n\nIf your readings are consistently above 140/90, see a doctor.',
  'cardiovascular', true, now() - interval '2 days', now() - interval '2 days'
),
(
  'Malaria prevention is easier than treatment',
  E'Malaria remains Ghana''s leading cause of outpatient visits. Prevention is cheap and highly effective — treatment, especially severe cases, is expensive and dangerous.\n\nProtect yourself:\n• Sleep under a long-lasting insecticide-treated net (LLIN) every night\n• Clear stagnant water around your home weekly\n• Wear long sleeves at dusk and dawn\n• Use repellent containing DEET or picaridin\n\nIf you develop fever, chills, or body aches — test early. Prompt treatment prevents complications.',
  'infectious-disease', true, now() - interval '3 days', now() - interval '3 days'
),
(
  'Diabetes: know your numbers',
  E'Diabetes affects about 6% of Ghanaian adults and the number is climbing. Early diagnosis changes everything — many cases of Type 2 can be reversed with lifestyle changes.\n\nAsk for these tests at your next visit:\n• Fasting blood sugar (should be < 100 mg/dL)\n• HbA1c (long-term sugar control, aim for < 5.7%)\n• Blood pressure and cholesterol (diabetes affects both)\n\nIf you''re diagnosed, logging your glucose daily in the Doctor Cares vitals tracker helps your doctor adjust your treatment faster.',
  'chronic-disease', true, now() - interval '4 days', now() - interval '4 days'
),
(
  'Mental health is health',
  E'Depression and anxiety are real medical conditions — not weakness or spiritual failure. In Ghana, over 650,000 people live with severe mental illness, and many more experience milder forms.\n\nWhen to reach out:\n• You feel sad, hopeless, or empty most days for 2+ weeks\n• You''ve lost interest in things you used to enjoy\n• Sleep, appetite, or energy have changed significantly\n• Thoughts of self-harm cross your mind\n\nTalk to a doctor on Doctor Cares. Treatment works, and asking for help is a sign of strength.',
  'mental-health', true, now() - interval '5 days', now() - interval '5 days'
),
(
  'Vaccinations save lives — at every age',
  E'Vaccines aren''t just for babies. Adults in Ghana should keep up to date with:\n\n• Tetanus booster every 10 years (especially if you garden or farm)\n• Yellow fever (required for international travel)\n• COVID-19 boosters as recommended\n• Hepatitis B if you work in healthcare or have risk factors\n• HPV vaccine for girls and young women\n\nSchedule an immunization check with your doctor. Keep your vaccination record in the Doctor Cares medical history page so no clinician asks you twice.',
  'preventive', true, now() - interval '6 days', now() - interval '6 days'
),
(
  '30 minutes of movement, 5 days a week',
  E'You don''t need a gym membership. Research consistently shows that 30 minutes of moderate activity, 5 days a week, cuts your risk of heart disease, diabetes, stroke, and several cancers by 25–40%.\n\nEasy wins:\n• Walk to the nearest market instead of taking a trotro\n• Take the stairs when you can\n• Dance for 20 minutes while cooking\n• Play football on weekends with family or friends\n\nStart with 10 minutes if 30 feels like a lot. Build up. Consistency matters more than intensity.',
  'lifestyle', true, now() - interval '7 days', now() - interval '7 days'
),
(
  'When to go to the hospital vs. book online',
  E'Not every symptom needs an in-person visit. Here''s a quick guide:\n\nGo to the hospital or call 112 immediately for:\n• Chest pain or difficulty breathing\n• Sudden weakness, confusion, or slurred speech\n• Heavy bleeding that won''t stop\n• A fever above 39°C with stiff neck\n• Serious injury\n\nA video or chat consultation on Doctor Cares is great for:\n• Minor infections (colds, UTIs, skin rashes)\n• Follow-ups on chronic conditions\n• Prescription refills\n• Mental health check-ins\n• Second opinions',
  'triage', true, now() - interval '8 days', now() - interval '8 days'
)
on conflict do nothing;
