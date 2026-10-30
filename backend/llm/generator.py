CRISIS_LINE = "If you are thinking about harming yourself, call or text 988 now (Suicide & Crisis Lifeline)."
ASK_DURATION = "Reply with how many days you have had these symptoms so we can check again."


def generate_guidance(triage: str, text: str, locale: str = "en", signals: list[str] | None = None,
                      duration_known: bool = True) -> str:
    signals = signals or []
    if triage == "EMERGENCY":
        msg = ("This could be serious. Please seek care immediately at the nearest clinic "
               "or call emergency services. If breathing worsens, do not wait.")
        return f"{msg} {CRISIS_LINE}" if "self_harm" in signals else msg
    if triage == "URGENT":
        return ("Please see a clinician within 24–48 hours. Rest, drink clean water, and monitor symptoms. "
                "If severe signs appear, go to a clinic immediately.")
    msg = ("Home care is appropriate today. Rest, drink fluids, and observe. "
           "If symptoms persist beyond 3 days or worsen, visit a clinic.")
    return msg if duration_known or not signals else f"{msg} {ASK_DURATION}"
