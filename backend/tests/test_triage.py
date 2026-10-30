import pytest

from backend.triage.engine import apply_rules, decide, predict_risk


@pytest.mark.parametrize("text, expected", [
    ("I have chest pain and shortness of breath", "EMERGENCY"),
    ("heavy bleeding after a fall", "EMERGENCY"),
    ("my infant has a high fever", "URGENT"),
    ("signs of severe dehydration", "URGENT"),
    ("mild cough since yesterday", "ROUTINE"),
])
def test_apply_rules(text, expected):
    assert apply_rules(text) == expected


def test_rules_need_every_keyword():
    # chest pain alone does not match the chest pain + shortness of breath red flag
    assert apply_rules("chest pain") == "ROUTINE"


def test_risk_score_is_capped_below_one():
    assert predict_risk("fever cough breath fever") <= 0.99
    assert predict_risk("headache") == pytest.approx(0.1)


@pytest.mark.parametrize("rule, score, expected", [
    ("EMERGENCY", None, "EMERGENCY"),
    ("URGENT", 0.0, "URGENT"),
    ("ROUTINE", 0.7, "URGENT"),
    ("ROUTINE", 0.3, "ROUTINE"),
    ("ROUTINE", None, "ROUTINE"),
])
def test_rules_take_precedence_over_score(rule, score, expected):
    assert decide(rule, score) == expected
