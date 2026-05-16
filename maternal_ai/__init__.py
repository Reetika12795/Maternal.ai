"""Maternal IA - protocol-bound maternal follow-up assistant.

A control plane for pregnancy and postpartum check-ins.
FSM dictates macro-state. LLM is bound to a structured response inside
the active card. Deterministic triage rules can override the LLM verdict
on hard-coded red flags.
"""

__version__ = "0.1.0"
