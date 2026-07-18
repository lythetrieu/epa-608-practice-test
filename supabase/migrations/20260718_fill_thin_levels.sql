-- ============================================================================
-- Fill the 8 Study Path levels that cannot serve a full 10-question quiz.
-- ----------------------------------------------------------------------------
-- Caught by the daily QA canary (10-data-integrity: "every Study Path level has
-- enough questions to run"). A level draws 10 questions; these held 6-9, so a
-- learner retrying a level was handed the same questions again. Type III was
-- worst: 5 of its 7 levels were starved.
--
--   core-dehydration   9  -> +1      t3-leak-detection  7  -> +3
--   core-safety        9  -> +1      t3-leak-repair     8  -> +2
--   t3-intro           9  -> +1      t3-recovery        6  -> +4
--   t3-evac-charging   6  -> +4      t3-repairs-safety  6  -> +4
--                                                        total +20
--
-- Every answer is checked against _docs/canonical-facts.md and the ESCO
-- Preparatory Manual: leak rates 10/20/30, low-pressure disposal 25 mm Hg
-- absolute, nitrogen leak test at or below 10 psig (rupture disc bursts at 15).
--
-- Written as SEPARATE single-row INSERTs, pure ASCII, no semicolons inside any
-- string: the Supabase SQL editor mis-splits large multi-row VALUES lists.
-- Run the whole file once against prod.
-- ============================================================================

BEGIN;

-- --- core-dehydration -------------------------------------------------------
INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0001', 'Core', 'core-dehydration-101',
 'A deep vacuum of what level indicates that moisture and non-condensables have been pulled out of a system?',
 '["500 microns","5,000 microns","28 inches Hg","1 psig"]',
 '500 microns',
 'The accepted deep-vacuum target is 500 microns. Above that, moisture is still boiling out of the system and will form acid with the refrigerant and oil.',
 'ESCO Core - Dehydration', 'medium', true,
 '["core","thin-level-fill"]', 'single_choice', '["500 microns"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Core Dehydration',
 'Five hundred microns - "500 or the job is not done".',
 'Inches of mercury measure a shallow vacuum. Anything asking about DRYING a system is answered in microns.');

-- --- core-safety ------------------------------------------------------------
INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0002', 'Core', 'core-safety-101',
 'A recovery cylinder must never be filled beyond what portion of its capacity?',
 '["80 percent by weight","95 percent by weight","100 percent by weight","50 percent by weight"]',
 '80 percent by weight',
 'Liquid refrigerant expands as it warms. Filling past 80 percent by weight leaves no vapour space, so a warm cylinder can rupture. Use a scale - never fill by volume or by feel.',
 'ESCO Core - Safety and Cylinders', 'easy', true,
 '["core","thin-level-fill"]', 'single_choice', '["80 percent by weight"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Core Safety',
 '80 percent full, 20 percent room to grow.',
 'The limit is by WEIGHT on a scale, not by how full the cylinder looks.');

-- --- t3-intro ---------------------------------------------------------------
INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0003', 'Type III', 't3-intro-101',
 'What makes an appliance a low-pressure appliance?',
 '["It uses a refrigerant that boils below atmospheric pressure at normal temperatures","It holds less than 5 pounds of refrigerant","It runs on 24 volt control power","It uses a reciprocating compressor"]',
 'It uses a refrigerant that boils below atmospheric pressure at normal temperatures',
 'Low-pressure machines such as centrifugal chillers using R-11, R-123 or R-1233zd run in a vacuum. Because the inside is below atmospheric pressure, air and moisture leak IN rather than refrigerant leaking out.',
 'ESCO Type III - Introduction', 'easy', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["It uses a refrigerant that boils below atmospheric pressure at normal temperatures"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Introduction',
 'Low pressure = runs in a vacuum = leaks pull air IN.',
 'Charge size decides Type I, not pressure class. Low pressure is about the refrigerant, not the pounds.');

-- --- t3-leak-detection ------------------------------------------------------
INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0004', 'Type III', 't3-leak-detection-101',
 'What is the maximum pressure of dry nitrogen that may be used to leak test a low-pressure chiller?',
 '["10 psig","15 psig","50 psig","150 psig"]',
 '10 psig',
 'The rupture disc on a low-pressure machine bursts at 15 psig, so testing is limited to no more than 10 psig. Going higher blows the disc and dumps the charge.',
 'ESCO Type III - Leak Detection', 'medium', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["10 psig"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Leak Detection',
 'Test at 10, the disc blows at 15 - stay under.',
 '15 psig is the burst point, not the test pressure. The answer is always the smaller number.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0005', 'Type III', 't3-leak-detection-102',
 'What is the job of the purge unit on a low-pressure chiller?',
 '["Remove air and moisture that leak into the machine","Add refrigerant automatically when the charge drops","Circulate oil through the compressor bearings","Raise the condenser pressure during start-up"]',
 'Remove air and moisture that leak into the machine',
 'A low-pressure machine runs in a vacuum, so leaks pull air and moisture IN. The purge unit removes those non-condensables. A purge that runs constantly is itself the symptom of a leak.',
 'ESCO Type III - Leak Detection', 'medium', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["Remove air and moisture that leak into the machine"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Leak Detection',
 'Purge unit throws OUT what the vacuum sucked IN.',
 'A hard-running purge unit means a leak - it is a symptom to investigate, not a machine working well.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0006', 'Type III', 't3-leak-detection-103',
 'During a standing pressure test on an evacuated low-pressure appliance, what result indicates a leak?',
 '["The vacuum rises from 1 mm Hg to more than 2.5 mm Hg within 24 hours","The vacuum holds steady for 24 hours","The oil temperature climbs above 130 F","The purge unit stops running"]',
 'The vacuum rises from 1 mm Hg to more than 2.5 mm Hg within 24 hours',
 'The machine is pulled to about 1 mm Hg and isolated. If the pressure climbs past 2.5 mm Hg in 24 hours, something is leaking in or moisture is still boiling off.',
 'ESCO Type III - Leak Detection', 'hard', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["The vacuum rises from 1 mm Hg to more than 2.5 mm Hg within 24 hours"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Leak Detection',
 'From 1 up past 2.5 in a day means air is getting in.',
 'On a machine in a vacuum a leak makes pressure RISE. Do not look for a pressure drop.');

-- --- t3-leak-repair ---------------------------------------------------------
INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0007', 'Type III', 't3-leak-repair-101',
 'A low-pressure chiller cooling an office building holds 900 pounds of refrigerant. What annual leak rate triggers the repair requirement?',
 '["10 percent","20 percent","30 percent","35 percent"]',
 '10 percent',
 'A chiller used to cool an occupied space is comfort cooling, and the comfort cooling trigger has been 10 percent per year since January 1, 2019.',
 'ESCO Type III - Leak Repair Requirements', 'medium', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["10 percent"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Leak Repair',
 'Comfort cooling is the strictest at 10 percent - people, not product.',
 'Classify by what the machine COOLS, not by its size. A big chiller cooling offices is still comfort cooling.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0008', 'Type III', 't3-leak-repair-102',
 'Once an appliance with 50 pounds or more of refrigerant is found to exceed its leak rate, how long does the owner normally have to repair it?',
 '["30 days","10 days","90 days","1 year"]',
 '30 days',
 'The standard repair window is 30 days from discovery. Systems of 200 pounds or more also need a follow-up verification test within 10 days of the initial verification.',
 'ESCO Type III - Leak Repair Requirements', 'medium', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["30 days"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Leak Repair',
 '30 days to fix, 10 days to re-verify on the big ones.',
 'The 10 day figure belongs to follow-up verification, not to the repair deadline.');

-- --- t3-recovery ------------------------------------------------------------
INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0009', 'Type III', 't3-recovery-101',
 'To what level must a low-pressure appliance be evacuated before it is disposed of?',
 '["25 mm Hg absolute","10 mm Hg absolute","0 psig","15 inches Hg"]',
 '25 mm Hg absolute',
 'Low-pressure appliances require evacuation to 25 mm Hg absolute before disposal, and that same figure applies whether the recovery equipment was built before or after November 15, 1993.',
 'ESCO Type III - Recovery Requirements', 'hard', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["25 mm Hg absolute"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Recovery',
 'Low pressure disposal is 25 mm Hg - one number, no exceptions.',
 'Older study guides split this by equipment age. Current rule is 25 mm Hg for both pre- and post-1993 equipment.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0010', 'Type III', 't3-recovery-102',
 'When recovering from a low-pressure chiller, why is liquid removed before vapour?',
 '["Liquid moves far more refrigerant per minute, so the job finishes sooner","Vapour recovery would damage the rupture disc","Liquid cannot be recovered once the vapour is gone","The rules forbid recovering vapour first"]',
 'Liquid moves far more refrigerant per minute, so the job finishes sooner',
 'Pulling liquid first removes the bulk of the charge quickly. Vapour recovery then finishes the job, but on its own it would be extremely slow.',
 'ESCO Type III - Recovery Techniques', 'medium', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["Liquid moves far more refrigerant per minute, so the job finishes sooner"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Recovery',
 'Liquid first for speed, vapour last to finish.',
 'It is about speed, not legality. Recovering vapour is allowed - it is just slow.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0011', 'Type III', 't3-recovery-103',
 'When heat is applied to speed recovery from a low-pressure machine, what temperature must not be exceeded?',
 '["130 F","100 F","150 F","212 F"]',
 '130 F',
 'Refrigerant and oil begin to break down with heat. 130 F is the ceiling when warming a machine or its oil to drive refrigerant out faster.',
 'ESCO Type III - Recovery Techniques', 'medium', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["130 F"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Recovery',
 '130 F is the ceiling - hotter cooks the oil.',
 '212 F is water boiling and has nothing to do with this limit.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0012', 'Type III', 't3-recovery-104',
 'What happens if a low-pressure appliance is pressurised above 15 psig?',
 '["The rupture disc bursts and the charge is released","The purge unit shuts down safely","The relief valve reseats automatically","Nothing until 50 psig is reached"]',
 'The rupture disc bursts and the charge is released',
 'The rupture disc is the machine safety limit at 15 psig. Blowing it vents refrigerant to the atmosphere, which is exactly what recovery rules exist to prevent - so leak testing stays at or below 10 psig.',
 'ESCO Type III - Recovery Techniques', 'medium', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["The rupture disc bursts and the charge is released"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Recovery',
 '15 psig is the disc, so work below 10.',
 'A rupture disc does not reseat. Once it goes, it must be replaced.');

-- --- t3-evac-charging -------------------------------------------------------
INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0013', 'Type III', 't3-evac-charging-101',
 'When charging an evacuated low-pressure chiller, why is vapour added before liquid?',
 '["To raise the pressure so water in the tubes cannot freeze","To prime the oil pump before start-up","To force the purge unit to run","Because liquid cannot enter a machine in a vacuum"]',
 'To raise the pressure so water in the tubes cannot freeze',
 'Liquid refrigerant flashing into a deep vacuum gets extremely cold and can freeze the water inside the chiller tubes, splitting them. Vapour is added first to bring the pressure up above the freezing point.',
 'ESCO Type III - Recharging Techniques', 'hard', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["To raise the pressure so water in the tubes cannot freeze"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Recharging',
 'Vapour first or you freeze and split the tubes.',
 'The risk is frozen WATER in the tubes, not damage to the refrigerant.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0014', 'Type III', 't3-evac-charging-102',
 'What is the purpose of triple evacuation on a low-pressure appliance?',
 '["To dilute and remove non-condensables and moisture more completely","To test the rupture disc three times","To warm the oil before start-up","To satisfy a three-hour minimum required by EPA"]',
 'To dilute and remove non-condensables and moisture more completely',
 'Evacuating, breaking the vacuum with dry nitrogen and evacuating again dilutes what is left each cycle, so three passes clear the system far better than one long pull.',
 'ESCO Type III - Recharging Techniques', 'medium', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["To dilute and remove non-condensables and moisture more completely"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Recharging',
 'Pull, break with nitrogen, pull again - dilute what is left.',
 'There is no EPA rule setting a number of hours. Triple evacuation is a technique, not a legal minimum.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0015', 'Type III', 't3-evac-charging-103',
 'Dry nitrogen is used to break the vacuum between evacuations because it',
 '["Contains no moisture, so it does not add water back into the system","Reacts with any remaining refrigerant","Is heavier than air and settles in the evaporator","Raises the oil temperature safely"]',
 'Contains no moisture, so it does not add water back into the system',
 'Breaking a vacuum with shop air would put moisture straight back in. Dry nitrogen is inert and dry, so each cycle leaves the system cleaner.',
 'ESCO Type III - Recharging Techniques', 'medium', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["Contains no moisture, so it does not add water back into the system"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Recharging',
 'Nitrogen is dry and does nothing - that is the point.',
 'Never break a vacuum with compressed air. Air carries moisture and oxygen.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0016', 'Type III', 't3-evac-charging-104',
 'While a low-pressure machine is being evacuated, what should be done with the chilled water pumps?',
 '["Keep water flowing through the tubes so they cannot freeze","Shut them off to save energy","Drain the water side completely first","Reverse the flow direction"]',
 'Keep water flowing through the tubes so they cannot freeze',
 'A deep vacuum drops the temperature inside the shell. Circulating water keeps the tubes above freezing so they do not burst.',
 'ESCO Type III - Recharging Techniques', 'hard', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["Keep water flowing through the tubes so they cannot freeze"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Recharging',
 'Keep the water moving or the tubes freeze and split.',
 'Standing water freezes fastest. Moving water is the protection, not draining.');

-- --- t3-repairs-safety ------------------------------------------------------
INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0017', 'Type III', 't3-repairs-safety-101',
 'Which standard requires a refrigerant monitor and alarm in a machinery room?',
 '["ASHRAE Standard 15","AHRI 700","DOT 49 CFR","AHRI 740"]',
 'ASHRAE Standard 15',
 'ASHRAE 15 is the safety standard for refrigeration systems and machinery rooms, including refrigerant monitors, alarms and ventilation.',
 'ESCO Type III - Safety', 'medium', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["ASHRAE Standard 15"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Safety',
 '15 for the room you stand in, 700 for the refrigerant in the drum.',
 'AHRI 700 is reclaimed refrigerant purity and AHRI 740 is recovery equipment. Neither covers machinery rooms.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0018', 'Type III', 't3-repairs-safety-102',
 'The greatest immediate danger of a large refrigerant release in an enclosed machinery room is',
 '["Oxygen displacement leading to suffocation","Frostbite from cold piping","Ozone depletion in the room","Loss of system efficiency"]',
 'Oxygen displacement leading to suffocation',
 'Refrigerant vapour is heavier than air, pools low in the room and pushes the breathable air out. A technician can pass out before noticing anything is wrong, which is why monitors and ventilation are required.',
 'ESCO Type III - Safety', 'easy', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["Oxygen displacement leading to suffocation"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Safety',
 'Heavier than air - it fills the room from the floor up.',
 'Refrigerant vapour has little smell and gives no warning. Never rely on noticing it.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0019', 'Type III', 't3-repairs-safety-103',
 'Where must the discharge from a low-pressure machine pressure relief device be routed?',
 '["To the outdoors","Into the machinery room","Into the chilled water loop","Back into the condenser"]',
 'To the outdoors',
 'Relief discharge is piped outside so a release cannot fill the machinery room with refrigerant and displace the air technicians are breathing.',
 'ESCO Type III - Safety', 'medium', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["To the outdoors"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Safety',
 'Relief goes outside, never into the room with people in it.',
 'Relief piping vents outdoors. Nothing routes back into the system.');

INSERT INTO public.questions
  (id, category, subtopic_id, question, options, answer_text, explanation, source_ref, difficulty, verified, tags, question_type, correct_answers, scoring, source_quiz, memory_tip, exam_trick)
VALUES
('t3fill-new-0020', 'Type III', 't3-repairs-safety-104',
 'R-123 carries the safety group classification B1. What does the B tell you?',
 '["Higher toxicity","Higher flammability","Lower pressure","Higher global warming potential"]',
 'Higher toxicity',
 'In ASHRAE safety groups the letter is toxicity and the number is flammability. B means higher toxicity, and 1 means no flame propagation - so R-123 is toxic but not flammable, which drives the monitoring requirements around it.',
 'ESCO Type III - Safety', 'hard', true,
 '["type-iii","thin-level-fill"]', 'single_choice', '["Higher toxicity"]',
 '{"style":"exact_match","points_if_incorrect":0,"points_if_all_correct":1,"correct_options_needed":1,"incorrect_options_allowed":0,"points_if_partially_correct":0}',
 'Type III Safety',
 'Letter is toxicity, number is flame. B1 = toxic, will not burn.',
 'Do not read B as flammable. Flammability is the digit - A1 and B1 both mean no flame propagation.');

COMMIT;

-- --- VERIFY (expect every level at 10 or more) ------------------------------
SELECT regexp_replace(subtopic_id, '-\d+$', '') AS prefix, count(*)
FROM public.questions
WHERE verified = true
  AND regexp_replace(subtopic_id, '-\d+$', '') IN
      ('core-dehydration','core-safety','t3-intro','t3-leak-detection',
       't3-leak-repair','t3-recovery','t3-evac-charging','t3-repairs-safety')
GROUP BY 1 ORDER BY 1;
