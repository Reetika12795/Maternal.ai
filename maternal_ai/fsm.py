"""Finite-state machine for the maternal pathway.

The FSM owns macro-state: which card the user is on, what the
deterministic red and yellow phrases are, and which transitions are
legal. The LLM is never asked to choose the next state. The FSM is.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import yaml


@dataclass
class State:
    id: str
    phase: str
    label: str
    goals: list[str] = field(default_factory=list)
    routine_questions: list[str] = field(default_factory=list)
    red_flags: list[str] = field(default_factory=list)
    yellow_flags: list[str] = field(default_factory=list)
    education_topics: list[str] = field(default_factory=list)
    next_state: Optional[str] = None


@dataclass
class Protocol:
    name: str
    description: str
    states: dict[str, State]
    deterministic_red_phrases: list[str]
    deterministic_yellow_phrases: list[str]
    llm: dict
    voice: dict

    @classmethod
    def load(cls, path: str | Path) -> "Protocol":
        data = yaml.safe_load(Path(path).read_text())
        states = {
            s["id"]: State(
                id=s["id"],
                phase=s["phase"],
                label=s["label"],
                goals=s.get("goals", []),
                routine_questions=s.get("routine_questions", []),
                red_flags=s.get("red_flags", []),
                yellow_flags=s.get("yellow_flags", []),
                education_topics=s.get("education_topics", []),
                next_state=s.get("next_state"),
            )
            for s in data["states"]
        }
        return cls(
            name=data["name"],
            description=data["description"],
            states=states,
            deterministic_red_phrases=data.get("deterministic_red_phrases", []),
            deterministic_yellow_phrases=data.get("deterministic_yellow_phrases", []),
            llm=data.get("llm", {}),
            voice=data.get("voice", {}),
        )

    def state(self, state_id: str) -> State:
        if state_id not in self.states:
            raise KeyError(f"unknown state: {state_id}")
        return self.states[state_id]

    def advance(self, state_id: str) -> Optional[str]:
        return self.state(state_id).next_state


def deterministic_triage(transcript: str, protocol: Protocol) -> Optional[str]:
    """Return 'red' or 'yellow' if a deterministic phrase fires, else None.

    Red wins over yellow. Substring match, lowercased. Pure function,
    no side effects, no LLM. The FSM uses this BEFORE consulting the
    LLM and AFTER receiving the LLM verdict, so the LLM can never
    downgrade a deterministic red signal.
    """
    text = transcript.lower()
    for phrase in protocol.deterministic_red_phrases:
        if phrase.lower() in text:
            return "red"
    for phrase in protocol.deterministic_yellow_phrases:
        if phrase.lower() in text:
            return "yellow"
    return None
