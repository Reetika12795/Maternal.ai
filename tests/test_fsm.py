"""Unit tests for the deterministic guardrails and FSM loading."""

from __future__ import annotations

from pathlib import Path

import pytest

from maternal_ai.fsm import Protocol, deterministic_triage
from maternal_ai.pipeline import resolve_triage

PROTOCOL = Protocol.load(Path(__file__).resolve().parents[1] / "maternal_ai" / "protocol" / "maternal_protocol.yaml")


def test_protocol_loads_nine_states():
    assert len(PROTOCOL.states) == 9


def test_phases_split_six_three():
    pregnancy = [s for s in PROTOCOL.states.values() if s.phase == "pregnancy"]
    postpartum = [s for s in PROTOCOL.states.values() if s.phase == "postpartum"]
    assert len(pregnancy) == 6
    assert len(postpartum) == 3


def test_advance_chain_is_linear():
    cur = "s1_positive_test"
    seen = [cur]
    while PROTOCOL.advance(cur):
        cur = PROTOCOL.advance(cur)
        seen.append(cur)
    assert seen[-1] == "s9_long_term_wellbeing"
    assert len(seen) == 9


@pytest.mark.parametrize(
    "text",
    [
        "I want to kill myself",
        "I might hurt the baby",
        "I have chest pain",
        "I cannot breathe",
        "My vision is blurry",
        "My face is swollen",
    ],
)
def test_deterministic_red(text):
    assert deterministic_triage(text, PROTOCOL) == "red"


@pytest.mark.parametrize(
    "text",
    [
        "I feel overwhelmed today",
        "I cry every day",
        "I have a mild fever",
    ],
)
def test_deterministic_yellow(text):
    assert deterministic_triage(text, PROTOCOL) == "yellow"


def test_deterministic_clean():
    assert deterministic_triage("I am taking my vitamins.", PROTOCOL) is None


def test_resolve_triage_red_wins():
    assert resolve_triage("green", "red") == ("red", True)
    assert resolve_triage("yellow", "red") == ("red", True)
    assert resolve_triage("red", "red") == ("red", False)


def test_resolve_triage_yellow_upgrades_green():
    assert resolve_triage("green", "yellow") == ("yellow", True)


def test_resolve_triage_yellow_does_not_downgrade_red():
    assert resolve_triage("red", "yellow") == ("red", False)


def test_resolve_triage_no_deterministic():
    assert resolve_triage("green", None) == ("green", False)
    assert resolve_triage("red", None) == ("red", False)
