-- ============================================================================
-- Doctor Cares — 0028 · Health tips 60-day rotation + seed library
-- ============================================================================
-- Goal: patients see a different "featured tip" every day for ~2 months,
-- then the cycle repeats. Zero cron: today's slot is computed from the date
-- itself (days-since-epoch mod 60), and each tip's rotation_order picks the
-- day it is featured on.
--
-- Implementation:
--   • `rotation_order` column (0-59) marks a tip's slot in the cycle
--   • `get_rotating_health_tips(limit)` RPC sorts tips by distance from
--     today's slot — today's tip first, yesterday's second, etc.
--   • The patient feed calls this RPC. Admin UI is unchanged.
--
-- Seed: 60 Ghana-focused tips published immediately. Re-running the migration
-- is a no-op (seed only fires when no rotating tips exist).
-- ============================================================================

alter table public.health_tips
  add column if not exists rotation_order integer;

do $$
begin
  if not exists (
    select 1 from pg_indexes where indexname = 'health_tips_rotation_order_uq'
  ) then
    create unique index health_tips_rotation_order_uq
      on public.health_tips(rotation_order)
      where rotation_order is not null;
  end if;
end $$;

-- Today's slot in the 60-day cycle (0-59). Deterministic from the date,
-- so no scheduler is needed to "rotate" anything.
create or replace function public.health_tips_today_slot()
returns integer
language sql
stable
as $$
  select (floor(extract(epoch from current_date) / 86400)::bigint % 60)::integer;
$$;

-- Patient-facing feed. Returns published tips ordered so that today's rotation
-- slot is first, yesterday's second, etc. Non-rotating tips (anything admins
-- add via the UI) sort by their published_at as before.
create or replace function public.get_rotating_health_tips(p_limit integer default 20)
returns setof public.health_tips
language sql
stable
security invoker
as $$
  with slot as (
    select public.health_tips_today_slot() as today
  )
  select ht.*
  from public.health_tips ht, slot
  where ht.is_published = true
  order by
    case
      when ht.rotation_order is null then 10000
      else ((slot.today - ht.rotation_order + 60) % 60)
    end asc,
    ht.published_at desc nulls last
  limit greatest(1, coalesce(p_limit, 20));
$$;

grant execute on function public.get_rotating_health_tips(integer) to authenticated, anon;

-- ============================================================================
-- Seed · 60 Ghana-focused health tips
-- ============================================================================
insert into public.health_tips (title, body, category, is_published, published_at, rotation_order)
select v.title, v.body, v.category, true, now(), v.rotation_order
from (values
  (0,  'Stay hydrated — 2 litres a day', 'nutrition',
   E'Water keeps your kidneys flushed, your skin clear, and your energy up. Adults should aim for about 2 litres a day — more in Ghana''s heat or when exercising.\n\n• Carry a 500ml bottle and refill it 4 times\n• Add lemon or cucumber for flavour, not sugar\n• Dark urine, headaches and fatigue mean you''re behind\n\nSkip sugary drinks — they add calories without truly hydrating.'),
  (1,  'High blood pressure: silent but serious', 'cardiovascular',
   E'About 1 in 3 Ghanaian adults has hypertension, and most feel nothing. Over time it damages the heart, brain and kidneys.\n\n• Check BP at least once a year — any pharmacy will do it\n• Cut back on salt, cubes, and salted fish\n• Walk 30 minutes a day\n• See a doctor if readings stay above 140/90'),
  (2,  'Malaria prevention is cheaper than treatment', 'infectious-disease',
   E'Malaria remains Ghana''s top reason for outpatient visits. Prevention costs almost nothing — treatment, especially severe cases, costs a lot.\n\n• Sleep under a treated mosquito net every night\n• Clear stagnant water around your compound weekly\n• Use repellent at dusk and dawn\n• Fever + chills? Test early — don''t assume.'),
  (3,  'Diabetes: know your numbers', 'chronic-disease',
   E'Diabetes affects roughly 6% of Ghanaian adults and the figure is climbing. Caught early, many cases of Type 2 can be reversed.\n\nAsk for these at your next visit:\n• Fasting blood sugar (<100 mg/dL)\n• HbA1c (<5.7%)\n• Blood pressure + cholesterol\n\nLog daily readings in Doctor Cares — your doctor can adjust treatment faster.'),
  (4,  'Mental health is health', 'mental-health',
   E'Depression and anxiety are medical conditions, not spiritual weakness. Over 650,000 Ghanaians live with severe mental illness.\n\nTalk to a doctor if for 2+ weeks you''ve felt:\n• Sad, hopeless, or empty most days\n• No interest in things you used to enjoy\n• Big changes in sleep, appetite or energy\n• Thoughts of self-harm\n\nAsking for help is strength, not weakness.'),
  (5,  'Vaccines are not just for babies', 'preventive',
   E'Keep adult shots up to date:\n• Tetanus booster every 10 years (farmers, gardeners especially)\n• Yellow fever if you travel\n• COVID-19 boosters as recommended\n• Hepatitis B for healthcare workers and at-risk adults\n• HPV for girls and young women\n\nSave your immunization record in Doctor Cares so no clinician has to ask twice.'),
  (6,  '30 minutes of movement, 5 days a week', 'lifestyle',
   E'No gym needed. 30 minutes of moderate activity 5 days a week cuts your risk of heart disease, diabetes, stroke and several cancers by 25–40%.\n\n• Walk to the market instead of taking a trotro\n• Take the stairs when you can\n• Dance for 20 minutes while cooking\n• Play football on weekends\n\nStart with 10 minutes if 30 feels like a lot. Consistency beats intensity.'),
  (7,  'When to rush to hospital vs. book online', 'triage',
   E'Call 112 or go to A&E immediately for:\n• Chest pain or trouble breathing\n• Sudden weakness, slurred speech or confusion\n• Heavy bleeding that won''t stop\n• Fever above 39°C with a stiff neck\n• Serious injury\n\nA chat or video on Doctor Cares is perfect for:\n• Minor infections (colds, UTIs, rashes)\n• Chronic condition follow-ups\n• Prescription refills\n• Mental-health check-ins'),
  (8,  'Handwashing: the cheapest medicine', 'preventive',
   E'Clean hands prevent cholera, typhoid, flu, and most food-borne illness. Wash with soap for at least 20 seconds (sing "Happy Birthday" twice):\n\n• Before eating or cooking\n• After the toilet or changing a nappy\n• After handling money or public surfaces\n• After coughing or sneezing\n\nAlcohol hand gel is good — but water + soap is better for visible dirt.'),
  (9,  'Breastfeeding: aim for 6 exclusive months', 'maternal-child',
   E'Breast milk is the complete food for babies under 6 months — no water or porridge needed. It protects against diarrhoea, chest infections and malnutrition.\n\n• Feed on demand, day and night\n• Latch deeply, not just on the nipple\n• Mum needs extra fluids and calories\n• Keep feeding alongside solids up to 2 years\n\nStruggling? A nurse on Doctor Cares can help you troubleshoot.'),
  (10, 'Sleep: 7–9 hours, protect it', 'lifestyle',
   E'Short sleep raises your risk of weight gain, diabetes, depression and poor concentration. Adults need 7–9 hours a night.\n\n• Keep a consistent sleep and wake time\n• No screens for 30 minutes before bed\n• Dark, cool room; no TV left on\n• Caffeine after lunch disturbs sleep for many\n\nSnoring loudly with daytime fatigue? Ask about sleep apnoea.'),
  (11, 'Quit smoking — your lungs recover fast', 'lifestyle',
   E'Within 24 hours of your last cigarette, carbon monoxide clears from your blood. Within a year, your heart-attack risk is cut in half.\n\n• Pick a quit date and tell someone\n• Throw away ashtrays and lighters\n• Nicotine patches/gum double your odds\n• Expect cravings — they pass in 3-5 minutes\n\nTalk to a doctor on Doctor Cares — they can prescribe help.'),
  (12, 'Alcohol: less is more', 'lifestyle',
   E'There''s no truly "safe" amount, but risk rises sharply above 2 drinks a day for men and 1 for women. Alcohol raises risk of liver disease, high BP, several cancers, and accidents.\n\n• Have alcohol-free days each week\n• Never drink and drive — ever\n• Don''t drink while pregnant or breastfeeding\n• Mixing alcohol with medication is dangerous'),
  (13, 'Cut the salt — your heart will thank you', 'nutrition',
   E'Ghanaians eat on average twice the daily salt the WHO recommends. Lower salt = lower BP = fewer strokes and heart attacks.\n\nWhere the salt hides:\n• Maggi/stock cubes (very high)\n• Salted fish, koobi, momoni\n• Bread, sausages, instant noodles\n\nSwap in: fresh herbs, garlic, ginger, pepper, lemon. Your taste adjusts in about 2 weeks.'),
  (14, 'Eat the rainbow — fruits & vegetables', 'nutrition',
   E'Half your plate should be fruit or vegetable at every main meal. They lower risk of heart disease, cancer, and bowel problems.\n\n• Local wins: kontomire, aleefi, okra, garden eggs, pawpaw, pineapple, oranges\n• Frozen is fine — nutrients are preserved\n• Eat the skin where safe — fibre lives there\n\nAim for 5 portions a day. A portion = roughly a handful.'),
  (15, 'Protein at every meal keeps you steady', 'nutrition',
   E'Protein keeps you full longer, protects muscle as you age, and steadies blood sugar.\n\nGood sources:\n• Fish (tilapia, mackerel, sardines)\n• Beans, cowpea, groundnut\n• Eggs — up to 1 a day is fine for most people\n• Chicken, lean beef\n• Soya, tofu\n\nSpread it across all 3 meals; don''t pile it all into supper.'),
  (16, 'Sugary drinks: hidden sugar bombs', 'nutrition',
   E'A single 500ml soft drink can contain 13 teaspoons of sugar — more than a day''s worth. Fruit juice is almost as bad.\n\n• Drink water, bissap without sugar, or sobolo with less sugar\n• Dilute juice 50/50 with water\n• Energy drinks are not safe for kids\n• Check the label — anything ending in "-ose" is sugar\n\nCutting sugary drinks alone can drop 3-5 kg in a year.'),
  (17, 'Brush, floss, and don''t fear the dentist', 'preventive',
   E'Gum disease is linked to heart disease, diabetes complications, and in pregnancy, early labour.\n\n• Brush twice a day, 2 minutes, fluoride toothpaste\n• Clean between teeth daily (floss or interdental brush)\n• Avoid chewing on hard things like bottle caps\n• Dentist every 12 months — catch problems small\n\nChildren''s first dental visit should be by age 2.'),
  (18, 'Eye exam every year — even if you see fine', 'preventive',
   E'Glaucoma — the "silent thief of sight" — is 4× more common in people of African descent. By the time you notice vision loss, it''s often permanent.\n\n• Full eye exam yearly from age 40 (earlier if diabetic or hypertensive)\n• Headache + blurred vision + eye pain? Go today\n• Children with squinting or sitting close to the TV need an exam\n\nEye drops for glaucoma are cheap and save sight.'),
  (19, 'Protect your skin from the sun', 'preventive',
   E'Melanoma is less common in Black skin, but when it appears it''s often diagnosed late. UV also ages skin and worsens pigmentation.\n\n• Wear a hat and sunglasses when outside midday\n• Sunscreen SPF 30+ on exposed skin, reapply every 2 hours\n• Watch moles that change colour, size or shape — show a doctor\n• Children burn fastest — cover them up'),
  (20, 'Breast self-check: once a month', 'preventive',
   E'Most breast cancers are first noticed by the woman herself. Early = highly curable.\n\n• Check about a week after your period ends\n• Look in the mirror for shape or skin changes\n• Feel each breast in small circles, up to the armpit\n• Report any new lump, dimpling, nipple discharge or persistent pain\n\nMammogram from age 40, or earlier if a close relative had breast cancer.'),
  (21, 'Cervical screening saves lives', 'preventive',
   E'Cervical cancer is almost 100% preventable with regular screening and the HPV vaccine. In Ghana it''s still a leading cancer in women — because screening is skipped.\n\n• Pap smear or VIA every 3 years from age 25\n• HPV vaccine for girls 9–14 (and up to 26)\n• Any abnormal bleeding — between periods or after sex — needs a visit\n\nBook a screening on Doctor Cares.'),
  (22, 'Men over 50: check your prostate', 'preventive',
   E'Prostate cancer is the most common cancer in Ghanaian men. Caught early, it''s very treatable.\n\n• Discuss PSA testing with your doctor from age 50 (45 if a close relative had it)\n• See a doctor if you''re getting up multiple times to urinate, straining to start, or seeing blood\n• An enlarged prostate is not always cancer — don''t avoid the check out of fear'),
  (23, 'Stress is normal — but manage it', 'mental-health',
   E'Chronic stress raises BP, worsens diabetes, and crushes sleep.\n\nSmall habits that help:\n• 10 minutes of deep breathing a day\n• A short walk after work\n• Prayer, meditation, journaling — pick one\n• Talk to someone — don''t carry it alone\n• Limit news and social media binges\n\nIf stress is affecting work or relationships, a doctor can help.'),
  (24, 'Depression warning signs', 'mental-health',
   E'Depression is more than sadness — it''s a medical illness. Signs for 2+ weeks:\n\n• Low mood most of the day, almost every day\n• No pleasure in things you used to enjoy\n• Sleep too little or too much\n• Appetite changes, weight loss or gain\n• Fatigue, poor concentration\n• Feelings of worthlessness or guilt\n• Any thoughts of self-harm — speak up today\n\nTreatment works. Book a mental-health visit on Doctor Cares.'),
  (25, 'Anxiety is treatable', 'mental-health',
   E'Everyone worries. Anxiety becomes a disorder when it''s constant, uncontrollable, or stops you living normally.\n\n• Panic attacks: fast heart, shortness of breath, feeling of doom\n• Generalised anxiety: nonstop worry about many things\n• Social anxiety: fear of being judged in groups\n\nBreathing exercises, talking therapy and (sometimes) medication help. You don''t have to white-knuckle through it.'),
  (26, 'Social connection is a health behaviour', 'mental-health',
   E'Loneliness raises risk of heart disease, dementia and depression — as much as smoking does.\n\n• Phone one person you care about this week\n• Join a church, mosque, team, or community group\n• Volunteer — helping others helps you\n• For older people living alone, a daily check-in matters\n\nIf you''re isolated and struggling, a doctor on Doctor Cares can help.'),
  (27, 'Cholera: safe water, safe food', 'infectious-disease',
   E'Cholera outbreaks still kill in Ghana. The infection spreads through contaminated water and food.\n\n• Drink only treated, boiled, or sachet water\n• Wash fruit and vegetables with clean water\n• Cook food thoroughly; eat it while hot\n• Keep latrines away from drinking water\n• ORS saves lives — have sachets at home\n\nSudden watery diarrhoea? Hydrate aggressively and go in.'),
  (28, 'Typhoid is preventable', 'infectious-disease',
   E'Typhoid spreads through dirty water and food — common where sanitation is poor.\n\n• Vaccine available — ask your doctor\n• Boil or filter drinking water when unsure\n• Street food: eat it hot and freshly cooked\n• Wash hands before eating\n\nProlonged fever, headache, stomach pain, loss of appetite? Test for typhoid, don''t just treat for malaria.'),
  (29, 'Hepatitis B: get vaccinated', 'infectious-disease',
   E'Hepatitis B is 50–100× more infectious than HIV and causes liver cancer later in life. Ghana has a very high prevalence.\n\n• Vaccine is a 3-shot series — long-lasting protection\n• Babies get it at birth under EPI\n• Adults: get tested; if negative, vaccinate\n• Pregnant women should be screened early\n\nIf you''re positive, treatment keeps your liver healthy for decades.'),
  (30, 'HIV: test, know, live', 'infectious-disease',
   E'HIV is now a manageable chronic condition. On treatment, people live normal lifespans and can''t pass it on sexually.\n\n• Everyone should test at least once; sexually active people yearly\n• Testing is free and confidential at any CHPS or clinic\n• Early treatment protects you and your partners\n• Condoms + PrEP remain highly effective at prevention\n\nStigma is dropping. Testing is routine, not shameful.'),
  (31, 'Know your STI status', 'infectious-disease',
   E'Many sexually transmitted infections have no symptoms until they cause damage — infertility, chronic pain, cancer.\n\n• Yearly STI screening if sexually active with new partners\n• Chlamydia and gonorrhoea are easily cured — once found\n• Syphilis is rising again — simple blood test\n• HPV vaccine prevents cervical and some mouth/throat cancers\n\nUse condoms consistently; test together with new partners.'),
  (32, 'Family planning: your choice, your health', 'reproductive-health',
   E'Spacing pregnancies by at least 2 years lowers risk for mother and baby. Many safe methods are available in Ghana:\n\n• Implants and IUDs — "set and forget" for 3-10 years\n• Pills — daily, reversible\n• Injectables every 3 months\n• Condoms also prevent STIs\n\nA nurse or doctor on Doctor Cares can walk you through what fits your life.'),
  (33, 'Pregnant? Start antenatal care early', 'maternal-child',
   E'First antenatal visit should be before 12 weeks. Early care catches problems before they grow.\n\n• 8+ visits across the pregnancy\n• Folic acid and iron reduce birth defects and anaemia\n• Blood pressure monitoring prevents eclampsia\n• HIV and syphilis screening protects baby\n• Vaccines (tetanus, flu) are safe and important\n\nDoctor Cares can hold your records and reminders in one place.'),
  (34, 'Postnatal depression is real', 'maternal-child',
   E'Up to 1 in 7 new mothers experience postnatal depression. It is not weakness or failure — it''s hormones + exhaustion + life upheaval.\n\nWarning signs:\n• Constant sadness or tearfulness\n• No bond with the baby\n• Severe anxiety or panic\n• Thoughts of harming yourself or the baby — urgent, speak up today\n\nTreatment works. Ask a doctor on Doctor Cares.'),
  (35, 'Vaccinate your child on schedule', 'maternal-child',
   E'Ghana''s EPI schedule saves thousands of lives yearly. Keep it on track:\n\n• At birth: BCG, OPV0, Hep B\n• 6, 10, 14 weeks: Penta, OPV, PCV, Rota\n• 9 months: Measles-Rubella 1, Yellow Fever\n• 18 months: MR 2, Men A\n• Then: HPV for girls, boosters later\n\nMissed one? Catch-up is almost always possible — don''t skip.'),
  (36, 'Deworm your children every 6 months', 'maternal-child',
   E'Intestinal worms cause anaemia, poor growth, and poor school performance. Mass deworming is cheap and highly effective.\n\n• Albendazole 400mg or mebendazole 500mg every 6 months for ages 1-14\n• Wash hands after playing, before eating\n• Wear shoes outside — hookworms enter through feet\n• Keep nails trimmed and clean\n\nAsk at your next clinic visit or buy at any pharmacy.'),
  (37, 'Feed growing children well', 'maternal-child',
   E'Chronic malnutrition in the first 1000 days damages the brain for life. After that, kids still need balanced food to grow.\n\n• A protein at every meal (egg, fish, bean, groundnut)\n• Variety of fruit and vegetables\n• Limit sugar, biscuits, fried snacks\n• Water, not soft drinks\n\nA stunted or underweight child needs assessment — book a paediatric visit.'),
  (38, 'Teen health: puberty, moods, and body changes', 'adolescent-health',
   E'Puberty brings big changes — physical, emotional, sometimes confusing. Open conversations keep teens safe.\n\n• Talk about periods before they start — no surprises\n• HPV vaccine for girls 9-14, and for boys where available\n• Acne is normal; a doctor can help if severe\n• Risky behaviour, withdrawal, or sudden grade drops — check in\n\nTeens can book their own confidential visit on Doctor Cares.'),
  (39, 'Older adults: prevent falls at home', 'elderly',
   E'A fall at 70+ can mean a broken hip and loss of independence. Most falls happen at home and are preventable.\n\n• Good lighting at night, especially stairs and bathrooms\n• No loose rugs or trailing wires\n• Grab bars in the shower and beside the toilet\n• Review medications — some cause dizziness\n• Simple strength + balance exercises twice a week\n\nAn eye check and good shoes also help.'),
  (40, 'Dementia: early signs matter', 'elderly',
   E'Normal ageing slows memory a little. Dementia goes further and gets worse. Early diagnosis means better planning and sometimes treatment.\n\nSigns to notice in a parent or elder:\n• Forgetting recent events, repeating questions\n• Getting lost on familiar routes\n• Trouble handling money or medications\n• Personality or behaviour changes\n\nA doctor can assess and refer. Don''t write it off as "just old age".'),
  (41, 'Keep your bones strong', 'elderly',
   E'Osteoporosis — thinning bones — often shows up only when something breaks. Build bone early, keep it later.\n\n• Calcium: dairy, kontomire, sardines with bones, groundnut\n• Vitamin D: 15 minutes of morning sun\n• Weight-bearing exercise (walking, dancing) 3-5 times a week\n• Avoid smoking and heavy alcohol\n\nWomen after menopause and anyone over 65 should discuss bone health.'),
  (42, 'First aid for burns', 'first-aid',
   E'For minor burns (small, no blistering):\n• Cool under running water for 20 minutes — not ice\n• Remove jewellery before swelling starts\n• Cover with clean, non-fluffy cloth\n• Paracetamol for pain\n\nGo to A&E for:\n• Burns on the face, hands, feet, genitals\n• Burns larger than a palm\n• Burns in children\n• Any chemical or electrical burn\n\nNEVER put oil, toothpaste or raw egg on a burn.'),
  (43, 'First aid for cuts and bleeding', 'first-aid',
   E'For most cuts:\n• Press firmly on the wound with a clean cloth for 10 minutes\n• Lift the injured part above the heart if possible\n• Once bleeding stops, clean with running water and cover\n• Tetanus booster if last one was over 10 years ago\n\nGo to A&E for:\n• Blood that spurts or doesn''t stop after 10 minutes\n• Deep cuts, especially on the face or hand\n• Cuts from rusty metal, animal bites, or glass embedded in skin'),
  (44, 'CPR basics — you can save a life', 'first-aid',
   E'If an adult suddenly collapses and isn''t breathing:\n\n1. Shout for help, call 112\n2. Place heel of hand in centre of chest\n3. Push hard and fast — 2 pushes per second, 5-6 cm deep\n4. Don''t stop until professional help arrives or they wake up\n\nHands-only CPR is better than no CPR. A first-aid class in person is worth every cedi — most hospitals run them.'),
  (45, 'Choking: the Heimlich manoeuvre', 'first-aid',
   E'If someone is choking and cannot speak or breathe:\n\n1. 5 firm back blows between the shoulder blades\n2. If still choking: stand behind them, fist above the navel, pull sharply inward and upward — repeat 5 times\n3. Alternate back blows and abdominal thrusts\n4. Call 112\n\nFor babies under 1: back blows on your knee, chest thrusts — never abdominal thrusts.'),
  (46, 'Snakebite first aid in Ghana', 'first-aid',
   E'Several venomous snakes live in Ghana (puff adders, cobras, mambas). What to do:\n\n• Keep calm and still — movement spreads venom\n• Lie down, keep the bitten limb below heart level\n• Remove rings, watches before swelling\n• Get to a hospital NOW — antivenom is the only real treatment\n\nDO NOT: cut the wound, suck venom out, apply ice, give alcohol, or use a tourniquet.'),
  (47, 'Food poisoning — when it''s serious', 'triage',
   E'Most food poisoning (vomiting + diarrhoea for 24-48h) resolves on its own with fluids and rest.\n\nGo in if:\n• Bloody diarrhoea\n• Fever above 39°C\n• Severe stomach pain\n• Signs of dehydration (dizziness, no urine for 8+ hours)\n• Diarrhoea lasting more than 3 days\n• Baby, elderly, pregnant, or someone with chronic illness\n\nORS at home, sip slowly, and don''t force food.'),
  (48, 'Spotting dehydration in children', 'maternal-child',
   E'Children lose fluids fast with diarrhoea, vomiting, or heat.\n\nWarning signs:\n• No wet nappy for 6+ hours\n• Sunken eyes or soft spot on the head\n• Dry mouth, no tears when crying\n• Floppy, drowsy, hard to wake\n\nStart ORS at the first sign — small sips, often. If they can''t keep anything down, go in. Child dehydration can go from "fine" to dangerous in hours.'),
  (49, 'Fever: when to worry', 'triage',
   E'Fever itself isn''t dangerous — it''s how the body fights infection. Treat the person, not the number.\n\nGo in for fever with:\n• Stiff neck or confusion\n• Severe headache or new rash\n• Breathing trouble\n• A baby under 3 months — any fever is urgent\n• Fever lasting more than 3 days\n\nTepid sponging, light clothes, paracetamol (not aspirin for kids), plenty of fluids.'),
  (50, 'Cold vs flu vs COVID — telling them apart', 'triage',
   E'A cold hits slowly, mostly a runny nose and mild sore throat. Flu and COVID come fast with fever, body aches, and exhaustion.\n\n• Rest, fluids, paracetamol handle most\n• Antibiotics don''t treat viruses — don''t demand them\n• Loss of smell/taste suggests COVID — test if you can\n• Shortness of breath or chest pain = go in\n\nStay home while contagious; wear a mask around vulnerable people.'),
  (51, 'Allergies: know yours', 'preventive',
   E'Food, medication, dust and insect allergies can all become serious.\n\n• Mild: itching, rash, sneezing — antihistamines help\n• Severe (anaphylaxis): swelling of lips/tongue, trouble breathing — call 112, use adrenaline if prescribed\n\n• Keep a list of your allergies on your Doctor Cares profile\n• Wear a medical ID if you''ve had a severe reaction\n• Tell every clinician before new medication'),
  (52, 'Asthma: control your triggers', 'chronic-disease',
   E'With good control, asthma shouldn''t stop you doing anything. Without control, it can be fatal.\n\n• Common triggers: dust, smoke, pollen, cold air, strong perfume\n• Take your preventer inhaler every day, not just when wheezing\n• Reliever inhaler for sudden symptoms\n• Review inhaler technique — most people get it wrong\n\nUsing the reliever more than 2 days a week? Your asthma isn''t controlled — see a doctor.'),
  (53, 'Back pain — most clears without scans', 'musculoskeletal',
   E'80% of adults get back pain at some point. Most resolves within 6 weeks.\n\nFirst-line care:\n• Keep moving gently — bed rest makes it worse\n• Paracetamol or ibuprofen for a few days\n• Heat pack for muscle spasm\n• Gentle stretching, walking\n\nSee a doctor urgently for:\n• Numbness/weakness in a leg\n• Loss of bladder/bowel control\n• Back pain + fever\n• Night pain that wakes you'),
  (54, 'Fix your desk, save your neck', 'musculoskeletal',
   E'Office or laptop work? Small posture tweaks prevent years of neck and shoulder pain.\n\n• Top of screen at eye level\n• Elbows roughly 90°, wrists straight\n• Feet flat on the floor\n• Stand up and stretch every 30-45 minutes\n• Phone? Lift it to eye level instead of hunching\n\nFive minutes of neck and shoulder stretches a day pays off huge dividends.'),
  (55, 'Protect your hearing', 'preventive',
   E'Noise-induced hearing loss is permanent — and more common than people think.\n\n• If you have to shout to be heard, it''s too loud\n• Keep headphone volume under 60%, limit to 60 minutes at a time\n• Wear earplugs at concerts, construction sites, or loud workplaces\n• Don''t stick anything in your ear — not even cotton buds\n\nTrouble hearing in a crowd, or ringing (tinnitus)? Get checked.'),
  (56, 'Sunglasses are not just fashion', 'preventive',
   E'UV exposure speeds up cataracts and macular degeneration — the leading causes of blindness.\n\n• Choose sunglasses labelled UV400 or 100% UV protection\n• Wider frames or wrap-around block more side rays\n• Wear them whenever you''re outside in bright light, not only at the beach\n• Kids need sunglasses too — their lenses let in more UV\n\nAn eye exam every year catches early damage.'),
  (57, 'Travelling? Plan vaccines early', 'preventive',
   E'See a travel doctor 4-6 weeks before leaving. Some vaccines need multiple doses.\n\n• Yellow fever: required for many African entries + required to re-enter Ghana\n• Hepatitis A, typhoid: smart for most travel\n• Meningitis for Sahel travel in dry season\n• Rabies if going rural\n• Malaria prophylaxis for high-risk regions\n\nPack ORS, paracetamol, hand gel, and your prescription meds in carry-on.'),
  (58, 'Prevent kidney stones — drink up', 'preventive',
   E'Kidney stones cause one of the worst pains people describe. Risk is higher in hot climates where we dehydrate easily.\n\n• 2-3 litres of water a day — more if you sweat heavily\n• Limit sodium (salt), red meat, and sugary drinks\n• Moderate calcium is protective (don''t cut it)\n• Pee should be pale yellow, not dark\n\nSevere one-sided back pain radiating to the groin + blood in urine? Go in.'),
  (59, 'Yearly check-up: catch problems early', 'preventive',
   E'Even if you feel fine, an annual check catches silent conditions early.\n\nAsk your doctor for:\n• Blood pressure, weight, waist measurement\n• Blood sugar and lipids\n• Kidney and liver function\n• Age/sex-appropriate cancer screening\n• Medication and vaccine review\n• Mental-health check-in\n\nBook once a year on Doctor Cares — put it on repeat, like a birthday.')
) as v(rotation_order, title, category, body)
where not exists (
  select 1 from public.health_tips where rotation_order is not null
);
