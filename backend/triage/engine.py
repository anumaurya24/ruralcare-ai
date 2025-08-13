import yaml
from pathlib import Path

RULES_PATH = Path(__file__).with_name("rules.yaml")

def _load_rules():
    return yaml.safe_load(RULES_PATH.read_text(encoding="utf-8")) or {}

def _has(text: str, keys: list[str]) -> bool:
    t = text.lower()
    return all(k.replace("_"," ") in t for k in keys)

def apply_rules(text: str) -> str:
    rules = _load_rules()
    for r in rules.get("red_flags", []):
        if _has(text, r.get("when", [])):
            return "EMERGENCY"
    for r in rules.get("urgent", []):
        if _has(text, r.get("when", [])):
            return "URGENT"
    return "ROUTINE"

def predict_risk(text: str) -> float:
    t = text.lower()
    score = 0.1
    if "fever" in t: score += 0.2
    if "cough" in t: score += 0.1
    if "breath" in t: score += 0.4
    return min(score, 0.99)

def decide(rule: str, ml_score: float | None) -> str:
    if rule in ("EMERGENCY","URGENT"):
        return rule
    return "URGENT" if (ml_score or 0) >= 0.6 else "ROUTINE"
