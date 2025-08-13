def generate_guidance(triage: str, text: str, locale: str="en") -> str:
    if triage == "EMERGENCY":
        return ("This could be serious. Please seek care immediately at the nearest clinic "
                "or call emergency services. If breathing worsens, do not wait.")
    if triage == "URGENT":
        return ("Please see a clinician within 24–48 hours. Rest, drink clean water, and monitor symptoms. "
                "If severe signs appear, go to a clinic immediately.")
    return ("Home care is appropriate today. Rest, drink fluids, and observe. "
            "If symptoms persist beyond 3 days or worsen, visit a clinic.")
