import pytest

from backend.triage.engine import apply_rules, assess, decide, duration_days, extract_signals, predict_risk


@pytest.mark.parametrize("text, expected", [
    ("I have chest pain and shortness of breath", "EMERGENCY"),
    ("my chest feels tight and I'm short of breath", "EMERGENCY"),
    ("no fever and I have chest pain", "URGENT"),
    ("chest tightness and trouble breathing", "EMERGENCY"),
    ("chest pain and I can barely catch my breath", "EMERGENCY"),
    ("I can't breathe", "EMERGENCY"),
    ("heavy bleeding after a fall", "EMERGENCY"),
    ("my dad passed out in the kitchen", "EMERGENCY"),
    ("her face drooping and slurred speech", "EMERGENCY"),
    ("I want to end my life", "EMERGENCY"),
    ("fever and a stiff neck", "EMERGENCY"),
    ("I'm pregnant and there is blood", "EMERGENCY"),
    ("my infant has a high fever", "URGENT"),
    ("my 6 month old baby is burning up", "URGENT"),
    ("baby has a fever of 103 F", "URGENT"),
    ("he can't keep water down", "URGENT"),
    ("chest pain when I lift things", "URGENT"),
    ("mild cough since yesterday", "ROUTINE"),
])
def test_apply_rules(text, expected):
    assert apply_rules(text) == expected


def test_negation_is_respected():
    assert apply_rules("no chest pain and no shortness of breath, just tired") == "ROUTINE"
    present, negated = extract_signals("I don't have a fever or cough")
    assert present == set() and negated == {"fever", "cough"}


def test_negation_stops_at_clause_boundary():
    present, negated = extract_signals("no fever, but I fainted")
    assert "loss_of_consciousness" in present and negated == {"fever"}
    assert apply_rules("no fever, but I fainted") == "EMERGENCY"


@pytest.mark.parametrize("text, days", [
    ("coughing for 3 days", 3),
    ("fever for two weeks", 14),
    ("sick since yesterday", 1),
    ("started this morning? since this morning", 0),
    ("cough", None),
])
def test_duration(text, days):
    assert duration_days(text) == days


def test_risk_score_uses_signals_and_duration():
    assert predict_risk("headache") == pytest.approx(0.1)
    assert predict_risk("fever and vomiting") == pytest.approx(0.5)
    assert predict_risk("fever and vomiting for 4 days") == pytest.approx(0.7)
    assert predict_risk("no fever, no vomiting") == pytest.approx(0.1)


@pytest.mark.parametrize("rule, score, expected", [
    ("EMERGENCY", None, "EMERGENCY"),
    ("URGENT", 0.0, "URGENT"),
    ("ROUTINE", 0.7, "URGENT"),
    ("ROUTINE", 0.3, "ROUTINE"),
    ("ROUTINE", None, "ROUTINE"),
])
def test_rules_take_precedence_over_score(rule, score, expected):
    assert decide(rule, score) == expected


def test_assess_explains_the_decision():
    a = assess("chest pain and difficulty breathing")
    assert a.triage == "EMERGENCY" and a.reason == "Red flag: chest pain + shortness of breath"
    assert a.risk_score is None
    b = assess("fever and vomiting for 4 days")
    assert b.triage == "URGENT" and b.reason == "Risk score 0.7 is at or above 0.6"
    assert b.duration_days == 4
    assert assess("hello").reason == "No symptoms recognized"
