"""Three scripted demo scenarios for the 60-second pitch.

Run with `python demo/scenarios.py` after installing requirements and
exporting OPENAI_API_KEY. The Gradium TTS step is optional and will be
skipped if GRADIUM_API_KEY is not set.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from maternal_ai.fsm import Protocol  # noqa: E402
from maternal_ai.pipeline import checkin  # noqa: E402

PROTOCOL_PATH = ROOT / "maternal_ai" / "protocol" / "maternal_protocol.yaml"


SCENARIOS = [
    {
        "name": "Green - first trimester nausea",
        "state_id": "s1_positive_test",
        "transcript": "I feel nauseous in the morning and I want to know if I should eat differently.",
        "memory": "First check-in.",
    },
    {
        "name": "Yellow - postpartum mood",
        "state_id": "s7_emotional_adjustment",
        "transcript": "I cry almost every day and I feel overwhelmed, but I do not want to hurt myself or the baby.",
        "memory": "Day 3 postpartum: tired but calm. Day 7: crying sometimes.",
    },
    {
        "name": "Red - late pregnancy red flag",
        "state_id": "s4_risk_detection",
        "transcript": "I have a terrible headache, my vision is blurry, and my hands and face are swollen.",
        "memory": "Month 7. No prior complications reported.",
    },
]


def main() -> int:
    if not os.environ.get("OPENAI_API_KEY"):
        print("OPENAI_API_KEY is required.")
        return 2
    protocol = Protocol.load(PROTOCOL_PATH)
    for sc in SCENARIOS:
        print("\n" + "=" * 72)
        print(sc["name"])
        print("=" * 72)
        print(f"State: {sc['state_id']}")
        print(f"User : {sc['transcript']}")
        result = checkin(
            protocol=protocol,
            state_id=sc["state_id"],
            transcript=sc["transcript"],
            memory_context=sc["memory"],
        )
        d = result.to_dict()
        print(f"Triage final       : {d['triage']['final'].upper()}")
        print(f"  LLM verdict      : {d['triage']['llm']}")
        print(f"  Deterministic    : {d['triage']['deterministic']}")
        print(f"  Overridden by FSM: {d['triage']['overridden']}")
        print(f"Assistant: {d['assistantText']}")
        if d["followUpQuestions"]:
            print("Follow-ups:")
            for q in d["followUpQuestions"]:
                print(f"  - {q}")
        if d["doctorSummary"].get("needed"):
            print("Doctor summary:")
            print(json.dumps(d["doctorSummary"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
