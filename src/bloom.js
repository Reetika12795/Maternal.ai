export const phases = [
  "positive_test",
  "pregnancy_month_1",
  "pregnancy_month_2",
  "pregnancy_month_3",
  "pregnancy_month_4",
  "pregnancy_month_5",
  "pregnancy_month_6",
  "pregnancy_month_7",
  "pregnancy_month_8",
  "pregnancy_month_9",
  "birth",
  "postpartum_week_1",
  "postpartum_week_2",
  "postpartum_week_6",
  "postpartum_month_3",
  "postpartum_month_6",
  "recovery_complete"
];

const phaseMap = {
  positive_test: "positiveTest",
  pregnancy_month_1: "positiveTest",
  pregnancy_month_2: "firstScan",
  pregnancy_month_3: "firstScan",
  pregnancy_month_4: "babyDevelopment",
  pregnancy_month_5: "babyDevelopment",
  pregnancy_month_6: "riskDetection",
  pregnancy_month_7: "riskDetection",
  pregnancy_month_8: "birthPreparation",
  pregnancy_month_9: "birthPreparation",
  birth: "deliveryRecovery",
  postpartum_week_1: "deliveryRecovery",
  postpartum_week_2: "emotionalAdjustment",
  postpartum_week_6: "ppdRiskWindow",
  postpartum_month_3: "ppdRiskWindow",
  postpartum_month_6: "longTermWellbeing",
  recovery_complete: "longTermWellbeing"
};

const bloomBank = {
  positiveTest: {
    order: 1,
    title: "Positive Test",
    primaryCheck: "Are you taking pregnancy-safe nutrition and supplements, or do you need help organizing first steps?",
    followUpQuestions: [
      "Do you know approximately when your last period started or your estimated due date?",
      "Have you booked or identified a doctor, midwife, or clinic for your first appointment?",
      "Are you taking folic acid or a prenatal vitamin?",
      "Are you taking any medication that your clinician has not reviewed for pregnancy?",
      "Are you having severe pain, heavy bleeding, fainting, fever, or shoulder-tip pain?",
      "Do you feel safe at home and supported right now?"
    ],
    memorySignals: ["due date estimate", "care provider status", "supplement status", "known risk factors", "support status"],
    escalationSignals: ["heavy bleeding", "severe one-sided pain", "fainting", "high fever", "feeling unsafe"]
  },
  firstScan: {
    order: 2,
    title: "First Scan",
    primaryCheck: "Have you completed or scheduled your first scan or first prenatal appointment?",
    followUpQuestions: [
      "Do you know the scan date or expected appointment date?",
      "Did the clinician confirm the pregnancy location and estimated due date?",
      "Did they mention twins, growth concerns, bleeding concerns, or follow-up testing?",
      "Have you had bleeding, severe cramps, fever, fainting, or pain on one side?",
      "Are nausea or vomiting making it hard to keep fluids down?",
      "Do you want me to help prepare questions for your doctor or midwife?"
    ],
    memorySignals: ["first scan status", "due date", "follow-up appointments", "early symptoms", "confidence"],
    escalationSignals: ["heavy bleeding", "severe cramps", "one-sided pain", "fainting", "fever", "dehydration"]
  },
  babyDevelopment: {
    order: 3,
    title: "Baby Development",
    primaryCheck: "Are you noticing baby development or movement in a way that feels normal for your stage?",
    followUpQuestions: [
      "Have you started feeling movement yet, or has your clinician told you when to expect it?",
      "Compared with your usual pattern, does movement feel the same, slower, or stopped?",
      "Are you having pain, bleeding, leaking fluid, fever, or unusual discharge?",
      "Are you eating and drinking normally?",
      "Are you sleeping enough to function during the day?",
      "Do you feel more confident this week, less confident, or about the same?"
    ],
    memorySignals: ["movement pattern", "energy", "sleep", "confidence", "nutrition", "hydration"],
    escalationSignals: ["reduced movement", "bleeding", "leaking fluid", "fever", "severe abdominal pain", "dehydration"]
  },
  riskDetection: {
    order: 4,
    title: "Risk Detection",
    primaryCheck: "Are you experiencing any risk symptoms today?",
    followUpQuestions: [
      "Do you have a headache that is severe, new, or not going away?",
      "Do you have blurry vision, flashing lights, dizziness, or fainting?",
      "Do you have swelling in your face or hands that feels sudden or extreme?",
      "Do you have chest pain, trouble breathing, or a fast-beating heart?",
      "Do you have severe belly pain, pain under the ribs, or shoulder pain?",
      "Do you have vaginal bleeding or leaking fluid?",
      "Has baby movement become slower or stopped compared with normal?",
      "Do you have fever or chills?",
      "Do you have severe swelling, redness, or pain in one leg or arm?"
    ],
    memorySignals: ["headache trend", "vision changes", "swelling trend", "movement baseline", "pain severity"],
    escalationSignals: ["severe headache", "vision changes", "extreme swelling", "chest pain", "trouble breathing", "bleeding", "leaking fluid", "reduced fetal movement", "fever"]
  },
  birthPreparation: {
    order: 5,
    title: "Birth Preparation",
    primaryCheck: "Do you feel ready for delivery, and do you know when to call your maternity team?",
    followUpQuestions: [
      "Do you know where you will deliver and how you will get there?",
      "Do you have your doctor, midwife, or maternity triage number saved?",
      "Are contractions regular, painful, or getting closer together?",
      "Have your waters broken or are you leaking fluid?",
      "Is the fluid clear, green, brown, foul-smelling, or bloody?",
      "Are you having vaginal bleeding?",
      "Is baby movement normal for your usual pattern?",
      "Do you have fever, severe headache, vision changes, chest pain, shortness of breath, or severe abdominal pain?"
    ],
    memorySignals: ["delivery location", "transport plan", "support person", "contraction pattern", "fluid leakage", "baby movement"],
    escalationSignals: ["bleeding", "concerning fluid", "reduced movement", "fever", "severe headache", "vision changes", "chest pain", "shortness of breath"]
  },
  deliveryRecovery: {
    order: 6,
    title: "Delivery & Recovery",
    primaryCheck: "Is your recovery progressing well physically?",
    followUpQuestions: [
      "How many days or weeks has it been since delivery?",
      "Are you bleeding more heavily than expected, passing large clots, or soaking pads quickly?",
      "Do you have fever, chills, bad-smelling discharge, or worsening pelvic pain?",
      "Do you have chest pain, shortness of breath, fainting, or a fast-beating heart?",
      "Do you have a severe headache or vision changes?",
      "Do you have swelling, redness, warmth, or pain in one leg?",
      "If you had a C-section or stitches, is pain, redness, swelling, or discharge getting worse?",
      "Do you feel safe caring for yourself and the baby right now?"
    ],
    memorySignals: ["delivery date", "bleeding trend", "pain level", "wound status", "feeding status", "sleep"],
    escalationSignals: ["heavy bleeding", "fever", "bad-smelling discharge", "chest pain", "shortness of breath", "fainting", "severe headache", "vision changes", "leg swelling"]
  },
  emotionalAdjustment: {
    order: 7,
    title: "Emotional Adjustment",
    primaryCheck: "How is your mood today?",
    followUpQuestions: [
      "Compared with your last check-in, is your mood better, worse, or the same?",
      "Are you crying more than usual or feeling overwhelmed most of the day?",
      "Are you sleeping at all when you have the chance?",
      "Do you feel supported by someone around you?",
      "Do you feel anxious, panicky, numb, disconnected, or unusually irritable?",
      "Are you having thoughts of hurting yourself or the baby?",
      "Do you feel safe right now?"
    ],
    memorySignals: ["mood trend", "anxiety", "crying frequency", "sleep", "support", "confidence", "safety"],
    escalationSignals: ["self-harm", "baby-harm", "feeling unsafe", "unable to care for self or baby", "severe panic", "rapid mood worsening"]
  },
  ppdRiskWindow: {
    order: 8,
    title: "PPD Risk Window",
    primaryCheck: "Are you feeling emotionally connected to yourself, your baby, or the people supporting you?",
    followUpQuestions: [
      "Do you feel bonded with the baby, disconnected, or unsure?",
      "Do you feel like yourself, or do you feel persistently unlike yourself?",
      "Have you lost interest in things that usually matter to you?",
      "Do you feel hopeless, guilty, trapped, or like you are failing?",
      "Are worries or intrusive thoughts making it hard to function?",
      "Are symptoms getting better, worse, or staying the same over the last two weeks?",
      "Have you told a doctor, midwife, partner, friend, or family member how you feel?",
      "Are you having thoughts of hurting yourself or the baby?"
    ],
    memorySignals: ["bonding trend", "hopelessness", "interest level", "guilt language", "intrusive thoughts", "duration"],
    escalationSignals: ["self-harm", "baby-harm", "hopelessness with safety concern", "psychosis-like statements", "unable to care for self or baby", "persistent worsening"]
  },
  longTermWellbeing: {
    order: 9,
    title: "Long-Term Wellbeing",
    primaryCheck: "Are you feeling like yourself again?",
    followUpQuestions: [
      "Compared with earlier postpartum check-ins, are you improving, stable, or worsening?",
      "Do you still have pain, bleeding, fatigue, feeding difficulties, or sleep problems that concern you?",
      "Are you able to do basic daily activities?",
      "Do you feel emotionally connected and supported?",
      "Are you anxious, low, numb, or overwhelmed most days?",
      "Have you returned to medical follow-up or mental health support if needed?",
      "Do you have any symptom or feeling that makes you think something is not right?",
      "Are you having thoughts of hurting yourself or the baby?"
    ],
    memorySignals: ["recovery trajectory", "persistent symptoms", "daily functioning", "mood trend", "support", "confidence"],
    escalationSignals: ["red-flag physical symptom", "self-harm", "baby-harm", "severe depression", "severe anxiety", "inability to function", "feeling unsafe"]
  }
};

export function getBloomContext(phase) {
  return bloomBank[phaseMap[phase] || "positiveTest"];
}

export function getTimeline() {
  return Object.values(bloomBank).sort((a, b) => a.order - b.order);
}

