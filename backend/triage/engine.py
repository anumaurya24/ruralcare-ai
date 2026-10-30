import re
from dataclasses import asdict, dataclass, field
from functools import lru_cache
from pathlib import Path

import yaml

RULES_PATH = Path(__file__).with_name("rules.yaml")
NEGATORS = {"no", "not", "denies", "deny", "without", "never", "dont", "doesnt", "didnt", "isnt", "havent"}
NEGATION_SPAN = 5  # words after a negator that it can cover
# a new subject ends a negation: "no fever and I have chest pain" must keep chest pain
SCOPE_BREAKERS = {"i", "im", "he", "she", "hes", "shes", "my", "his", "her", "we", "they", "baby", "now"}
NUMBER_WORDS = {"a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "ten": 10}
UNIT_DAYS = {"day": 1, "days": 1, "week": 7, "weeks": 7, "month": 30, "months": 30}


@lru_cache(maxsize=1)
def _load_rules() -> dict:
    return yaml.safe_load(RULES_PATH.read_text(encoding="utf-8")) or {}


def _normalize(text: str) -> str:
    t = text.lower().replace("'", "").replace("’", "")
    return re.sub(r"[^a-z0-9.,;!?\s]", " ", t)


def _clauses(text: str) -> list[list[str]]:
    """Split into clauses so a negation ('no fever, but chest pain') does not leak across them."""
    parts = re.split(r"[.,;!?]|\bbut\b|\bhowever\b", text)
    return [p.split() for p in parts if p.strip()]


def _find(words: list[str], phrase: list[str]) -> list[int]:
    n = len(phrase)
    return [i for i in range(len(words) - n + 1) if words[i:i + n] == phrase]


def _negated_positions(words: list[str]) -> set[int]:
    covered: set[int] = set()
    for j, w in enumerate(words):
        if w in NEGATORS:
            for k in range(j + 1, min(len(words), j + 1 + NEGATION_SPAN)):
                if words[k] in SCOPE_BREAKERS:
                    break
                covered.add(k)
    return covered


def extract_signals(text: str) -> tuple[set[str], set[str]]:
    """Return (present signals, negated signals) found in free text."""
    present, negated = set(), set()
    for words in _clauses(_normalize(text)):
        covered = _negated_positions(words)
        for signal, phrases in _load_rules()["signals"].items():
            for phrase in phrases:
                for i in _find(words, phrase.split()):
                    (negated if i in covered else present).add(signal)
    # temperatures like "103 F" or "39.5 C" count as a high fever
    if re.search(r"\b(10[3-7](\.\d)?)\s*(f|degrees)\b|\b(39\.[5-9]|4[0-2](\.\d)?)\s*c\b", _normalize(text)):
        present |= {"high_fever", "fever"}
    if "high_fever" in present:
        present.add("fever")
    return present, negated - present


def duration_days(text: str) -> int | None:
    t = _normalize(text)
    m = re.search(r"\b(\d+|a|an|one|two|three|four|five|six|seven|ten)\s+(days?|weeks?|months?)\b", t)
    if m:
        n = int(m.group(1)) if m.group(1).isdigit() else NUMBER_WORDS[m.group(1)]
        return n * UNIT_DAYS[m.group(2)]
    if re.search(r"\b(since|from)\s+yesterday\b", t):
        return 1
    if re.search(r"\b(since|from)\s+(this morning|today|tonight)\b", t):
        return 0
    return None


def _match(signals: set[str], section: str) -> list[str] | None:
    for r in _load_rules().get(section, []):
        if set(r["when"]) <= signals:
            return r["when"]
    return None


def apply_rules(text: str) -> str:
    signals, _ = extract_signals(text)
    if _match(signals, "red_flags"):
        return "EMERGENCY"
    if _match(signals, "urgent"):
        return "URGENT"
    return "ROUTINE"


def predict_risk(text: str) -> float:
    weights = _load_rules()["risk_weights"]
    signals, _ = extract_signals(text)
    days = duration_days(text)
    if days is not None and days >= 3:
        signals.add("long_duration")
    score = weights["base"] + sum(weights.get(s, 0) for s in signals)
    return round(min(score, 0.99), 2)


def decide(rule: str, ml_score: float | None) -> str:
    if rule in ("EMERGENCY", "URGENT"):
        return rule
    return "URGENT" if (ml_score or 0) >= 0.6 else "ROUTINE"


def _label(signals: list[str]) -> str:
    return " + ".join(s.replace("_", " ") for s in signals)


@dataclass
class Assessment:
    rule: str
    triage: str
    risk_score: float | None
    reason: str
    signals: list[str] = field(default_factory=list)
    negated: list[str] = field(default_factory=list)
    duration_days: int | None = None

    def to_dict(self) -> dict:
        return asdict(self)


def assess(text: str) -> Assessment:
    """Full triage with an explanation a clinician can read."""
    signals, negated = extract_signals(text)
    days = duration_days(text)
    red, urgent = _match(signals, "red_flags"), _match(signals, "urgent")
    rule = "EMERGENCY" if red else "URGENT" if urgent else "ROUTINE"
    score = None if rule != "ROUTINE" else predict_risk(text)
    triage = decide(rule, score)
    if red:
        reason = f"Red flag: {_label(red)}"
    elif urgent:
        reason = f"Urgent sign: {_label(urgent)}"
    elif triage == "URGENT":
        reason = f"Risk score {score} is at or above 0.6"
    elif signals:
        reason = f"No warning signs (risk score {score})"
    else:
        reason = "No symptoms recognized"
    return Assessment(rule=rule, triage=triage, risk_score=score, reason=reason,
                      signals=sorted(signals), negated=sorted(negated), duration_days=days)
