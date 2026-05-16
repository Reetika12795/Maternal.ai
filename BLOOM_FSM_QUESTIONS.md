# BLOOM FSM Questions

This file defines the phase-specific questions the MATERNAL ai agent should take into account during pregnancy and postpartum conversations.

The assistant should not ask every question at once. It should select the smallest useful set based on:

- Current phase.
- User's latest message.
- Known risk profile.
- Previous answers and memory.
- Triage uncertainty.
- Whether a red flag is already present.

## Safety Rules For Questions

- Ask one primary question first.
- Ask at most two follow-up questions in normal flow.
- If red flags appear, stop routine questioning and escalate.
- Do not diagnose.
- Do not replace a doctor, midwife, emergency services, or clinical care.
- If the user feels something is wrong, recommend contacting their clinician even if the exact symptom is not listed.

## BLOOM Timeline

```text
BLOOM — FSM TIMELINE

PHASE 1 — PREGNANCY

[1] Positive Test
AI Check:
"Nutrition & supplements?"

        ↓

[2] First Scan
AI Check:
"Ultrasound completed?"

        ↓

[3] Baby Development
AI Check:
"Baby movement normal?"

        ↓

[4] Risk Detection
AI Check:
"Any risk symptoms?"

        ↓

[5] Birth Preparation
AI Check:
"Ready for delivery?"

        ↓

[6] Delivery & Recovery
AI Check:
"Recovery progressing well?"


PHASE 2 — POSTPARTUM

[7] Emotional Adjustment
AI Check:
"How is your mood?"

        ↓

[8] PPD Risk Window
AI Check:
"Feeling emotionally connected?"

        ↓

[9] Long-Term Wellbeing
AI Check:
"Feeling like yourself?"
```

## Phase Mapping

```text
positive_test -> BLOOM [1] Positive Test
pregnancy_month_1 -> BLOOM [1] Positive Test
pregnancy_month_2 -> BLOOM [2] First Scan
pregnancy_month_3 -> BLOOM [2] First Scan
pregnancy_month_4 -> BLOOM [3] Baby Development
pregnancy_month_5 -> BLOOM [3] Baby Development
pregnancy_month_6 -> BLOOM [4] Risk Detection
pregnancy_month_7 -> BLOOM [4] Risk Detection
pregnancy_month_8 -> BLOOM [5] Birth Preparation
pregnancy_month_9 -> BLOOM [5] Birth Preparation
birth -> BLOOM [6] Delivery & Recovery
postpartum_week_1 -> BLOOM [6] Delivery & Recovery
postpartum_week_2 -> BLOOM [7] Emotional Adjustment
postpartum_week_6 -> BLOOM [8] PPD Risk Window
postpartum_month_3 -> BLOOM [8] PPD Risk Window
postpartum_month_6 -> BLOOM [9] Long-Term Wellbeing
recovery_complete -> BLOOM [9] Long-Term Wellbeing
```

## Question Bank Format

Each phase has:

- Primary check: the main question the assistant should ask.
- Follow-up questions: questions to clarify status.
- Memory signals: what to store for future comparison.
- Escalation signals: symptoms or statements that should trigger yellow or red triage.
- Demo intent: what this phase helps show in the hackathon demo.

## [1] Positive Test

Primary check:

- "Are you taking pregnancy-safe nutrition and supplements, or do you need help organizing first steps?"

Follow-up questions:

- "Do you know approximately when your last period started or your estimated due date?"
- "Have you booked or identified a doctor, midwife, or clinic for your first appointment?"
- "Are you taking folic acid or a prenatal vitamin?"
- "Are you currently taking any medication that your clinician has not reviewed for pregnancy?"
- "Are you having severe pain, heavy bleeding, fainting, fever, or shoulder-tip pain?"
- "Do you have a history of miscarriage, ectopic pregnancy, high blood pressure, diabetes, blood clots, or other pregnancy risks?"
- "Do you feel safe at home and supported right now?"

Memory signals:

- Estimated pregnancy start or due date.
- Care provider status.
- Supplement status.
- Medication concerns.
- Known risk factors.
- Safety and support status.

Escalation signals:

- Heavy bleeding.
- Severe one-sided pain.
- Fainting.
- High fever.
- Severe dizziness.
- User says they feel unsafe.

Demo intent:

- Show that BLOOM starts as practical guidance, not panic.

## [2] First Scan

Primary check:

- "Have you completed or scheduled your first scan or first prenatal appointment?"

Follow-up questions:

- "Do you know the scan date or expected appointment date?"
- "Did the clinician confirm the pregnancy location and estimated due date?"
- "Did they mention twins, growth concerns, bleeding concerns, or follow-up testing?"
- "Have you had bleeding, severe cramps, fever, fainting, or pain on one side?"
- "Are nausea or vomiting making it hard to keep fluids down?"
- "Do you understand what the next appointment or test is for?"
- "Do you want me to help prepare questions for your doctor or midwife?"

Memory signals:

- First scan status.
- Estimated due date.
- Follow-up appointments.
- Early pregnancy symptoms.
- Patient understanding and confidence.

Escalation signals:

- Heavy bleeding.
- Severe cramps or one-sided pain.
- Fainting.
- Fever.
- Inability to keep fluids down.
- Clinician reported abnormal finding and user does not understand next step.

Demo intent:

- Show continuity between appointments and reduce uncertainty.

## [3] Baby Development

Primary check:

- "Are you noticing baby development or movement in a way that feels normal for your stage?"

Follow-up questions:

- "Have you started feeling movement yet, or has your clinician told you when to expect it?"
- "Compared with your usual pattern, does movement feel the same, slower, or stopped?"
- "Are you having pain, bleeding, leaking fluid, fever, or unusual discharge?"
- "Are you eating and drinking normally?"
- "Are you sleeping enough to function during the day?"
- "Do you have questions about baby growth, body changes, or upcoming tests?"
- "Do you feel more confident this week, less confident, or about the same?"

Memory signals:

- Movement pattern if movement has started.
- Energy level.
- Sleep quality.
- Confidence level.
- Nutrition and hydration.
- New body symptoms.

Escalation signals:

- Baby movement stops or becomes clearly slower than usual after movement has been established.
- Bleeding.
- Leaking fluid.
- Fever.
- Severe abdominal pain.
- Severe nausea or dehydration.

Demo intent:

- Show that the system remembers normal baseline and asks about change, not isolated facts.

## [4] Risk Detection

Primary check:

- "Are you experiencing any risk symptoms today?"

Follow-up questions:

- "Do you have a headache that is severe, new, or not going away?"
- "Do you have blurry vision, flashing lights, dizziness, or fainting?"
- "Do you have swelling in your face or hands that feels sudden or extreme?"
- "Do you have chest pain, trouble breathing, or a fast-beating heart?"
- "Do you have severe belly pain, pain under the ribs, or shoulder pain?"
- "Do you have vaginal bleeding or leaking fluid?"
- "Has baby movement become slower or stopped compared with normal?"
- "Do you have fever or chills?"
- "Do you have severe swelling, redness, or pain in one leg or arm?"
- "Are you worried that something is not right?"

Memory signals:

- Headache trend.
- Vision changes.
- Swelling trend.
- Blood pressure concerns if known.
- Movement baseline.
- Bleeding or fluid leakage.
- Pain location and severity.
- Patient intuition or concern.

Escalation signals:

- Severe or worsening headache.
- Vision changes.
- Dizziness or fainting.
- Extreme swelling of face or hands.
- Chest pain.
- Trouble breathing.
- Severe abdominal pain.
- Bleeding.
- Leaking fluid.
- Reduced fetal movement.
- Fever.
- Severe swelling, redness, or pain in one leg or arm.

Demo intent:

- This is the best phase for the red-flag pregnancy demo.

## [5] Birth Preparation

Primary check:

- "Do you feel ready for delivery, and do you know when to call your maternity team?"

Follow-up questions:

- "Do you know where you will deliver and how you will get there?"
- "Do you have your doctor, midwife, or maternity triage number saved?"
- "Are contractions regular, painful, or getting closer together?"
- "Have your waters broken or are you leaking fluid?"
- "Is the fluid clear, green, brown, foul-smelling, or bloody?"
- "Are you having vaginal bleeding?"
- "Is baby movement normal for your usual pattern?"
- "Do you have fever, severe headache, vision changes, chest pain, shortness of breath, or severe abdominal pain?"
- "Do you have support at home or someone who can go with you?"

Memory signals:

- Delivery location.
- Contact numbers.
- Transport plan.
- Birth support person.
- Contraction pattern.
- Fluid leakage status.
- Baby movement baseline.

Escalation signals:

- Bleeding.
- Waters break with concerning fluid color or smell.
- Reduced fetal movement.
- Fever.
- Severe headache.
- Vision changes.
- Chest pain.
- Shortness of breath.
- Severe abdominal pain.
- User cannot access transport or support during urgent symptoms.

Demo intent:

- Show practical readiness and escalation clarity.

## [6] Delivery & Recovery

Primary check:

- "Is your recovery progressing well physically?"

Follow-up questions:

- "How many days or weeks has it been since delivery?"
- "Are you bleeding more heavily than expected, passing large clots, or soaking pads quickly?"
- "Do you have fever, chills, bad-smelling discharge, or worsening pelvic pain?"
- "Do you have chest pain, shortness of breath, fainting, or a fast-beating heart?"
- "Do you have a severe headache or vision changes?"
- "Do you have swelling, redness, warmth, or pain in one leg?"
- "If you had a C-section or stitches, is pain, redness, swelling, or discharge getting worse?"
- "Are feeding, sleeping, and basic recovery manageable today?"
- "Do you feel safe caring for yourself and the baby right now?"

Memory signals:

- Delivery date.
- Delivery type if shared.
- Bleeding trend.
- Pain level.
- Wound or stitches status.
- Feeding status.
- Sleep level.
- Physical recovery confidence.

Escalation signals:

- Heavy bleeding.
- Fever or chills.
- Bad-smelling discharge.
- Severe or worsening pain.
- Chest pain.
- Shortness of breath.
- Fainting.
- Severe headache.
- Vision changes.
- One-sided leg swelling, redness, or pain.
- Feeling unable to care for self or baby.

Demo intent:

- Show immediate postpartum physical safety net.

## [7] Emotional Adjustment

Primary check:

- "How is your mood today?"

Follow-up questions:

- "Compared with your last check-in, is your mood better, worse, or the same?"
- "Are you crying more than usual or feeling overwhelmed most of the day?"
- "Are you sleeping at all when you have the chance?"
- "Are you eating and drinking enough?"
- "Do you feel supported by someone around you?"
- "Do you feel anxious, panicky, numb, disconnected, or unusually irritable?"
- "Are you having thoughts of hurting yourself or the baby?"
- "Do you feel safe right now?"

Memory signals:

- Mood trend.
- Anxiety level.
- Crying frequency.
- Sleep quality.
- Support level.
- Confidence level.
- Safety status.

Escalation signals:

- Thoughts of self-harm.
- Thoughts of harming the baby.
- Feeling unsafe.
- Feeling unable to care for self or baby.
- Severe panic.
- Rapid mood worsening.
- No sleep with extreme agitation or confusion.

Demo intent:

- Show that BLOOM can detect emotional risk without branding itself as therapy.

## [8] PPD Risk Window

Primary check:

- "Are you feeling emotionally connected to yourself, your baby, or the people supporting you?"

Follow-up questions:

- "Do you feel bonded with the baby, disconnected, or unsure?"
- "Do you feel like yourself, or do you feel persistently unlike yourself?"
- "Have you lost interest in things that usually matter to you?"
- "Do you feel hopeless, guilty, trapped, or like you are failing?"
- "Are worries or intrusive thoughts making it hard to function?"
- "Are symptoms getting better, worse, or staying the same over the last two weeks?"
- "Have you told a doctor, midwife, partner, friend, or family member how you feel?"
- "Are you having thoughts of hurting yourself or the baby?"

Memory signals:

- Bonding trend.
- Hopelessness.
- Interest level.
- Guilt or failure language.
- Intrusive thoughts.
- Emotional support disclosure.
- Duration of symptoms.

Escalation signals:

- Self-harm or baby-harm thoughts.
- Hopelessness with safety concern.
- Psychosis-like statements.
- Feeling detached from reality.
- Feeling unable to care for self or baby.
- Persistent worsening over multiple check-ins.

Demo intent:

- This is the best phase for the postpartum depression early-detection demo.

## [9] Long-Term Wellbeing

Primary check:

- "Are you feeling like yourself again?"

Follow-up questions:

- "Compared with earlier postpartum check-ins, are you improving, stable, or worsening?"
- "Do you still have pain, bleeding, fatigue, feeding difficulties, or sleep problems that concern you?"
- "Are you able to do basic daily activities?"
- "Do you feel emotionally connected and supported?"
- "Are you anxious, low, numb, or overwhelmed most days?"
- "Have you returned to medical follow-up, contraception planning, pelvic floor care, or mental health support if needed?"
- "Do you have any symptom or feeling that makes you think something is not right?"
- "Are you having thoughts of hurting yourself or the baby?"

Memory signals:

- Recovery trajectory.
- Persistent symptoms.
- Daily functioning.
- Mood trend.
- Support level.
- Follow-up care status.
- Confidence returning.

Escalation signals:

- Any red-flag physical symptom.
- Self-harm or baby-harm thoughts.
- Persistent severe depression or anxiety.
- Inability to function.
- Feeling unsafe.
- User reports that something is seriously wrong.

Demo intent:

- Show long-term memory and recovery tracking beyond the first few weeks.

## Prompt Insert

Use this block inside the MATERNAL ai prompt as `phase_question_context`.

```text
Current BLOOM phase:
{{bloom_phase}}

Primary phase check:
{{primary_phase_check}}

Relevant follow-up questions:
{{phase_follow_up_questions}}

Memory signals to update:
{{phase_memory_signals}}

Escalation signals to watch:
{{phase_escalation_signals}}

Instruction:
Use the current BLOOM phase to select the smallest useful number of questions.
Do not ask every question.
If a red escalation signal is present, stop routine questioning and prioritize safety escalation.
```

## JSON Context Shape

```json
{
  "bloomPhase": "Risk Detection",
  "primaryPhaseCheck": "Are you experiencing any risk symptoms today?",
  "followUpQuestions": [
    "Do you have a headache that is severe, new, or not going away?",
    "Do you have blurry vision, flashing lights, dizziness, or fainting?"
  ],
  "memorySignals": [
    "headache trend",
    "vision changes",
    "swelling trend"
  ],
  "escalationSignals": [
    "severe or worsening headache",
    "vision changes",
    "extreme swelling of face or hands"
  ]
}
```

