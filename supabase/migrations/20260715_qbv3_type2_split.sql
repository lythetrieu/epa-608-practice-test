-- ============================================================================
-- QBv3 - Type II 6 -> 9 levels (per ESCO manual section density)
-- ----------------------------------------------------------------------------
-- 1. t2-leak-repair (20Q) splits into t2-leak-rates + t2-leak-inspections
-- 2. 13 t2-supplemental questions re-tagged to the new levels they belong to
-- 3. 15 NEW questions inserted (evac-levels x8, accessories x4, safety x2,
--    intro x1) - sourced from ESCO 608 Type II manual, canonical-facts checked
-- 4. study_path_progress rows for t2-leak-repair copied to BOTH successor
--    levels (users keep their stars), old rows removed
--
-- Run the WHOLE file once in the prod SQL Editor (sequvmxgtmbirnixeril).
-- Pairs with app commit: concept-map.ts 9-level Type II + BANK_VERSION 2.
-- Final counts: intro 10 - rates 10 - inspections 15 - recovery 11 -
-- evac-levels 10 - accessories 10 - evac-charging 10 - repairs-safety 10 -
-- supplemental 26  (Type II total 112 = 97 old + 15 new)
-- ============================================================================

BEGIN;

-- --- 1) t2-leak-rates -- categories, thresholds, leak-rate math -------------
UPDATE public.questions SET subtopic_id = 't2-leak-rates-001' WHERE subtopic_id = 't2-supplemental-001';
UPDATE public.questions SET subtopic_id = 't2-leak-rates-002' WHERE subtopic_id = 't2-supplemental-002';
UPDATE public.questions SET subtopic_id = 't2-leak-rates-003' WHERE subtopic_id = 't2-supplemental-003';
UPDATE public.questions SET subtopic_id = 't2-leak-rates-004' WHERE subtopic_id = 't2-supplemental-004';
UPDATE public.questions SET subtopic_id = 't2-leak-rates-005' WHERE subtopic_id = 't2-supplemental-005';
UPDATE public.questions SET subtopic_id = 't2-leak-rates-006' WHERE subtopic_id = 't2-leak-repair-001'; -- dual-use 52% process
UPDATE public.questions SET subtopic_id = 't2-leak-rates-007' WHERE subtopic_id = 't2-leak-repair-009'; -- 22% vs threshold
UPDATE public.questions SET subtopic_id = 't2-leak-rates-008' WHERE subtopic_id = 't2-leak-repair-010'; -- leak-rate verification
UPDATE public.questions SET subtopic_id = 't2-leak-rates-009' WHERE subtopic_id = 't2-leak-repair-015'; -- commercial classification
UPDATE public.questions SET subtopic_id = 't2-leak-rates-010' WHERE subtopic_id = 't2-leak-repair-019'; -- when charging triggers calc

-- --- 2) t2-leak-inspections -- timeframes, verification, records, detection -
UPDATE public.questions SET subtopic_id = 't2-leak-inspections-001' WHERE subtopic_id = 't2-leak-repair-002';
UPDATE public.questions SET subtopic_id = 't2-leak-inspections-002' WHERE subtopic_id = 't2-leak-repair-003';
UPDATE public.questions SET subtopic_id = 't2-leak-inspections-003' WHERE subtopic_id = 't2-leak-repair-004';
UPDATE public.questions SET subtopic_id = 't2-leak-inspections-004' WHERE subtopic_id = 't2-leak-repair-005';
UPDATE public.questions SET subtopic_id = 't2-leak-inspections-005' WHERE subtopic_id = 't2-leak-repair-006';
UPDATE public.questions SET subtopic_id = 't2-leak-inspections-006' WHERE subtopic_id = 't2-leak-repair-007';
UPDATE public.questions SET subtopic_id = 't2-leak-inspections-007' WHERE subtopic_id = 't2-leak-repair-008';
UPDATE public.questions SET subtopic_id = 't2-leak-inspections-008' WHERE subtopic_id = 't2-leak-repair-011';
UPDATE public.questions SET subtopic_id = 't2-leak-inspections-009' WHERE subtopic_id = 't2-leak-repair-012';
UPDATE public.questions SET subtopic_id = 't2-leak-inspections-010' WHERE subtopic_id = 't2-leak-repair-013';
UPDATE public.questions SET subtopic_id = 't2-leak-inspections-011' WHERE subtopic_id = 't2-leak-repair-014';
UPDATE public.questions SET subtopic_id = 't2-leak-inspections-012' WHERE subtopic_id = 't2-leak-repair-016';
UPDATE public.questions SET subtopic_id = 't2-leak-inspections-013' WHERE subtopic_id = 't2-leak-repair-017';
UPDATE public.questions SET subtopic_id = 't2-leak-inspections-014' WHERE subtopic_id = 't2-leak-repair-018';
UPDATE public.questions SET subtopic_id = 't2-leak-inspections-015' WHERE subtopic_id = 't2-leak-repair-020';

-- --- 3) t2-evac-levels -- the 2 existing chart questions move over ----------
UPDATE public.questions SET subtopic_id = 't2-evac-levels-001' WHERE subtopic_id = 't2-supplemental-025';
UPDATE public.questions SET subtopic_id = 't2-evac-levels-002' WHERE subtopic_id = 't2-supplemental-026';

-- --- 4) t2-accessories -- sight glass / drier / accumulator / valves --------
UPDATE public.questions SET subtopic_id = 't2-accessories-001' WHERE subtopic_id = 't2-supplemental-027';
UPDATE public.questions SET subtopic_id = 't2-accessories-002' WHERE subtopic_id = 't2-supplemental-028';
UPDATE public.questions SET subtopic_id = 't2-accessories-003' WHERE subtopic_id = 't2-supplemental-029';
UPDATE public.questions SET subtopic_id = 't2-accessories-004' WHERE subtopic_id = 't2-supplemental-030';
UPDATE public.questions SET subtopic_id = 't2-accessories-005' WHERE subtopic_id = 't2-supplemental-031';
UPDATE public.questions SET subtopic_id = 't2-accessories-006' WHERE subtopic_id = 't2-supplemental-032';

-- --- 5) 15 NEW questions ----------------------------------------------------
INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation,
   source_ref, difficulty, verified, tags, question_type, correct_answers,
   scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t2-qbv3-new-0001', 'Type II', 't2-evac-levels-003',
 'Under EPA rules, which of the following is considered a MAJOR repair requiring evacuation to the prescribed vacuum level?',
 '["Replacing a liquid-line filter drier","Removing the compressor","Replacing a Schrader valve core","Adjusting the TXV superheat setting"]',
 'Removing the compressor',
 'EPA defines major repairs as removal of the compressor, condenser, evaporator, or auxiliary heat exchanger coil. Swapping small components like driers or valve cores is non-major.',
 '608 Type II.txt - Required Evacuation Levels', 'medium', true,
 '["type-ii","qbv3-new"]', 'single_choice', '["Removing the compressor"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type II Evacuation Levels',
 'Major = pulling one of the BIG four: compressor, condenser, evaporator, auxiliary heat exchanger.',
 'If the part is small enough to carry in one hand, it is not a major repair.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation,
   source_ref, difficulty, verified, tags, question_type, correct_answers,
   scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t2-qbv3-new-0002', 'Type II', 't2-evac-levels-004',
 'Using recovery equipment manufactured after November 15, 1993, to what level must an R-22 appliance containing LESS than 200 pounds of refrigerant be evacuated?',
 '["0 inches Hg vacuum","4 inches Hg vacuum","10 inches Hg vacuum","15 inches Hg vacuum"]',
 '0 inches Hg vacuum',
 'The evacuation chart requires R-22 appliances under 200 lbs to reach only 0 in Hg (atmospheric pressure) - the same level for both pre- and post-1993 recovery equipment.',
 '608 Type II.txt - Required Evacuation Levels', 'medium', true,
 '["type-ii","qbv3-new"]', 'single_choice', '["0 inches Hg vacuum"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type II Evacuation Levels',
 'Small R-22 job = zero: just get it down to atmospheric.',
 'R-22 under 200 lbs is the easiest row of the chart - 0 in Hg with old OR new equipment.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation,
   source_ref, difficulty, verified, tags, question_type, correct_answers,
   scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t2-qbv3-new-0003', 'Type II', 't2-evac-levels-005',
 'Using recovery equipment manufactured after November 15, 1993, to what level must an R-22 appliance containing 200 pounds or MORE of refrigerant be evacuated?',
 '["0 inches Hg vacuum","4 inches Hg vacuum","10 inches Hg vacuum","15 inches Hg vacuum"]',
 '10 inches Hg vacuum',
 'R-22 appliances holding 200 lbs or more must reach 10 in Hg vacuum with post-1993 recovery equipment (only 4 in Hg with pre-1993 equipment).',
 '608 Type II.txt - Required Evacuation Levels', 'medium', true,
 '["type-ii","qbv3-new"]', 'single_choice', '["10 inches Hg vacuum"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type II Evacuation Levels',
 'Big R-22: 10 with new gear, 4 with old gear.',
 '200 lbs is the line that changes the whole chart - check the charge size before picking a number.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation,
   source_ref, difficulty, verified, tags, question_type, correct_answers,
   scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t2-qbv3-new-0004', 'Type II', 't2-evac-levels-006',
 'To what level must a very-high-pressure appliance using R-503 be evacuated before opening, regardless of charge size?',
 '["0 inches Hg vacuum","4 inches Hg vacuum","10 inches Hg vacuum","15 inches Hg vacuum"]',
 '0 inches Hg vacuum',
 'Very-high-pressure refrigerants (R-13, R-503) only require evacuation to 0 in Hg no matter the charge size or the age of the recovery equipment.',
 '608 Type II.txt - Required Evacuation Levels', 'medium', true,
 '["type-ii","qbv3-new"]', 'single_choice', '["0 inches Hg vacuum"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type II Evacuation Levels',
 'Very high pressure = very easy target: 0 in Hg, always.',
 'See R-13 or R-503? Stop calculating - the answer is 0 in Hg.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation,
   source_ref, difficulty, verified, tags, question_type, correct_answers,
   scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t2-qbv3-new-0005', 'Type II', 't2-evac-levels-007',
 'Using post-1993 recovery equipment, what evacuation level applies to an R-502 appliance containing 200 pounds or more of refrigerant?',
 '["0 inches Hg vacuum","4 inches Hg vacuum","10 inches Hg vacuum","15 inches Hg vacuum"]',
 '15 inches Hg vacuum',
 '"Other high-pressure" appliances (CFC-12, R-500, R-502, R-114) at 200 lbs or more require 15 in Hg with post-1993 equipment - the deepest vacuum on the high-pressure chart.',
 '608 Type II.txt - Required Evacuation Levels', 'hard', true,
 '["type-ii","qbv3-new"]', 'single_choice', '["15 inches Hg vacuum"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type II Evacuation Levels',
 '15 is the chart maximum - reserved for big non-R-22 high-pressure systems with new equipment.',
 'R-502 at 200+ lbs with new equipment is the only high-pressure combo that hits 15 in Hg.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation,
   source_ref, difficulty, verified, tags, question_type, correct_answers,
   scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t2-qbv3-new-0006', 'Type II', 't2-evac-levels-008',
 'Using recovery equipment manufactured BEFORE November 15, 1993, what evacuation level applies to an R-502 appliance containing 150 pounds of refrigerant?',
 '["0 inches Hg vacuum","4 inches Hg vacuum","10 inches Hg vacuum","15 inches Hg vacuum"]',
 '4 inches Hg vacuum',
 'With pre-1993 recovery equipment, "other high-pressure" appliances only require 4 in Hg vacuum regardless of charge size.',
 '608 Type II.txt - Required Evacuation Levels', 'hard', true,
 '["type-ii","qbv3-new"]', 'single_choice', '["4 inches Hg vacuum"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type II Evacuation Levels',
 'Old gear, easy target: pre-93 equipment never has to pull deeper than 4 in Hg on high-pressure systems.',
 '"Before November 15, 1993" in the question usually means the answer is 4.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation,
   source_ref, difficulty, verified, tags, question_type, correct_answers,
   scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t2-qbv3-new-0007', 'Type II', 't2-evac-levels-009',
 'An appliance has leaks that would prevent reaching the prescribed evacuation level, and continuing would substantially contaminate the recovered refrigerant. What does EPA allow?',
 '["Evacuate the appliance to 0 psig instead","Vent the remaining refrigerant slowly outdoors","Skip recovery entirely and repair the leak first","Pressurize with nitrogen and then release the mixture"]',
 'Evacuate the appliance to 0 psig instead',
 'When leaks make the prescribed vacuum unattainable or would contaminate the recovered refrigerant, EPA allows evacuating the appliance to 0 psig (atmospheric pressure) before opening it.',
 '608 Type II.txt - Required Evacuation Levels', 'medium', true,
 '["type-ii","qbv3-new"]', 'single_choice', '["Evacuate the appliance to 0 psig instead"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type II Evacuation Levels',
 'Leaky system rule: get it to 0 psig - never vent.',
 'Any answer that involves venting refrigerant is automatically wrong on an EPA question.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation,
   source_ref, difficulty, verified, tags, question_type, correct_answers,
   scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t2-qbv3-new-0008', 'Type II', 't2-evac-levels-010',
 'Before performing a NON-major repair that is not followed by disposal, the appliance must be evacuated to what pressure?',
 '["0 psig (atmospheric pressure)","10 inches Hg vacuum","15 inches Hg vacuum","500 microns"]',
 '0 psig (atmospheric pressure)',
 'Non-major repairs not followed by disposal only require reducing the pressure to 0 psig. The deep-vacuum evacuation chart applies to major repairs and disposal.',
 '608 Type II.txt - Required Evacuation Levels', 'medium', true,
 '["type-ii","qbv3-new"]', 'single_choice', '["0 psig (atmospheric pressure)"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type II Evacuation Levels',
 'Minor job = 0 psig. Major job or disposal = the chart.',
 'Do not give a chart vacuum for a drier swap - non-major means 0 psig only.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation,
   source_ref, difficulty, verified, tags, question_type, correct_answers,
   scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t2-qbv3-new-0009', 'Type II', 't2-accessories-007',
 'What is the purpose of the receiver in a refrigeration system?',
 '["To store liquid refrigerant leaving the condenser","To prevent liquid refrigerant from reaching the compressor","To remove moisture from the refrigerant","To meter refrigerant into the evaporator"]',
 'To store liquid refrigerant leaving the condenser',
 'The receiver is a storage vessel in the liquid line after the condenser that holds liquid refrigerant. The accumulator (in the suction line) is the component that protects the compressor from liquid.',
 '608 Type II.txt - Liquid-Line Accessories', 'easy', true,
 '["type-ii","qbv3-new"]', 'single_choice', '["To store liquid refrigerant leaving the condenser"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type II Accessories',
 'Receiver receives liquid from the condenser - accumulator catches liquid before the compressor.',
 'Receiver vs accumulator is a classic swap - receiver = liquid line, accumulator = suction line.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation,
   source_ref, difficulty, verified, tags, question_type, correct_answers,
   scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t2-qbv3-new-0010', 'Type II', 't2-accessories-008',
 'What is the purpose of a compressor crankcase heater?',
 '["To prevent refrigerant from migrating into and condensing in the compressor oil during the off cycle","To keep discharge gas hot enough to prevent flooding","To warm the evaporator during the defrost cycle","To boil off moisture trapped in the filter drier"]',
 'To prevent refrigerant from migrating into and condensing in the compressor oil during the off cycle',
 'During the off cycle refrigerant migrates to the coldest point - often the crankcase - and condenses into the oil. The crankcase heater keeps the oil warm so liquid refrigerant cannot accumulate and slug the compressor at startup.',
 '608 Type II.txt - Suction Line and Compressor Accessories', 'medium', true,
 '["type-ii","qbv3-new"]', 'single_choice', '["To prevent refrigerant from migrating into and condensing in the compressor oil during the off cycle"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type II Accessories',
 'Crankcase heater = keeps refrigerant out of the oil while the compressor sleeps.',
 'Anything about the "off cycle" plus compressor oil points to the crankcase heater.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation,
   source_ref, difficulty, verified, tags, question_type, correct_answers,
   scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t2-qbv3-new-0011', 'Type II', 't2-accessories-009',
 'What does a liquid-line filter drier remove from the refrigerant?',
 '["Moisture and solid particles","Oil and non-condensables","Air and nitrogen","Acid vapor only"]',
 'Moisture and solid particles',
 'The filter drier, installed in the liquid line, traps moisture and filters out solid contaminants before they can reach the metering device.',
 '608 Type II.txt - Liquid-Line Accessories', 'easy', true,
 '["type-ii","qbv3-new"]', 'single_choice', '["Moisture and solid particles"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type II Accessories',
 'Filter = particles, drier = moisture - the name is the function.',
 'Non-condensables are removed by recovery and evacuation, not by the drier.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation,
   source_ref, difficulty, verified, tags, question_type, correct_answers,
   scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t2-qbv3-new-0012', 'Type II', 't2-accessories-010',
 'Bubbles seen in a liquid-line sight glass during normal operation most likely indicate what?',
 '["A low refrigerant charge (flash gas in the liquid line)","An overcharged system","A restricted suction line","Too much oil in the system"]',
 'A low refrigerant charge (flash gas in the liquid line)',
 'A full column of liquid shows a clear sight glass. Bubbles mean flash gas, most commonly caused by an undercharge (or a liquid-line restriction upstream of the glass).',
 '608 Type II.txt - Liquid-Line Accessories', 'medium', true,
 '["type-ii","qbv3-new"]', 'single_choice', '["A low refrigerant charge (flash gas in the liquid line)"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type II Accessories',
 'Clear glass = solid liquid, bubbles = missing refrigerant.',
 'Bubbles point to undercharge - overcharge shows up as high head pressure, not bubbles.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation,
   source_ref, difficulty, verified, tags, question_type, correct_answers,
   scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t2-qbv3-new-0013', 'Type II', 't2-repairs-safety-101',
 'Which gas must NEVER be used to pressurize a refrigeration system for leak testing?',
 '["Oxygen or compressed air","Dry nitrogen with a pressure regulator","A small refrigerant trace charge with dry nitrogen","Carbon dioxide from a regulated cylinder"]',
 'Oxygen or compressed air',
 'Oxygen or compressed air mixed with refrigerant and oil can explode under pressure. Regulated dry nitrogen is the standard gas for pressure testing.',
 '608 Type II.txt - Leak Detection', 'easy', true,
 '["type-ii","qbv3-new"]', 'single_choice', '["Oxygen or compressed air"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type II Repairs & Safety',
 'Oil + oxygen + pressure = explosion. Nitrogen only.',
 'Compressed air counts as an oxygen answer - both are always wrong for pressure testing.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation,
   source_ref, difficulty, verified, tags, question_type, correct_answers,
   scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t2-qbv3-new-0014', 'Type II', 't2-repairs-safety-102',
 'Why should a low flow of dry nitrogen be passed through refrigerant piping while brazing?',
 '["To prevent oxide scale from forming inside the tubing","To cool the joint faster after brazing","To raise the flame temperature","To detect leaks while the joint is still hot"]',
 'To prevent oxide scale from forming inside the tubing',
 'Heat plus air creates copper-oxide scale inside the tube, which later breaks loose and plugs filter driers and metering devices. Flowing nitrogen displaces the air while brazing.',
 '608 Type II.txt - Leak Detection', 'medium', true,
 '["type-ii","qbv3-new"]', 'single_choice', '["To prevent oxide scale from forming inside the tubing"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type II Repairs & Safety',
 'Nitrogen while brazing keeps the inside of the pipe shiny.',
 'Oxide flakes end up in the filter drier - that is the clue linking brazing to nitrogen.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation,
   source_ref, difficulty, verified, tags, question_type, correct_answers,
   scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t2-qbv3-new-0015', 'Type II', 't2-intro-101',
 'A Type II certification allows a technician to service or dispose of which appliances?',
 '["High-pressure and very-high-pressure appliances, except small appliances and MVAC systems","Only appliances containing 5 pounds of refrigerant or less","Low-pressure chillers only","Any appliance, including motor vehicle air conditioning"]',
 'High-pressure and very-high-pressure appliances, except small appliances and MVAC systems',
 'Type II covers high- and very-high-pressure appliances. Small appliances fall under Type I, low-pressure appliances under Type III, and motor vehicle air conditioning has its own Section 609 program.',
 '608 Type II.txt - Introduction', 'easy', true,
 '["type-ii","qbv3-new"]', 'single_choice', '["High-pressure and very-high-pressure appliances, except small appliances and MVAC systems"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type II Introduction',
 'Type II = the high-pressure middle: bigger than Type I, hotter than Type III.',
 'MVAC is never covered by 608 Types - it is Section 609.');

-- --- 6) Users keep their stars: copy t2-leak-repair progress to BOTH halves -
INSERT INTO public.study_path_progress
  (user_id, concept_id, status, pass_count, attempts, best_score, last_score, last_passed)
SELECT p.user_id, x.new_id, p.status, p.pass_count, p.attempts,
       p.best_score, p.last_score, p.last_passed
FROM public.study_path_progress p
CROSS JOIN (VALUES ('t2-leak-rates'), ('t2-leak-inspections')) AS x(new_id)
WHERE p.concept_id = 't2-leak-repair'
ON CONFLICT (user_id, concept_id) DO NOTHING;

DELETE FROM public.study_path_progress WHERE concept_id = 't2-leak-repair';

-- --- 7) Re-point any study materials off the retired concept id -------------
UPDATE public.learning_assets
SET concept_id = 't2-leak-rates'
WHERE concept_id = 't2-leak-repair';

COMMIT;

-- --- VERIFY (run after commit; expected counts in comments) -----------------
-- intro 10 - leak-rates 10 - leak-inspections 15 - recovery 11 -
-- evac-levels 10 - accessories 10 - evac-charging 10 - repairs-safety 10 -
-- supplemental 26 - and t2-leak-repair must be GONE.
SELECT regexp_replace(subtopic_id, '-\d+$', '') AS prefix, count(*)
FROM public.questions
WHERE subtopic_id LIKE 't2-%'
GROUP BY 1 ORDER BY 1;
