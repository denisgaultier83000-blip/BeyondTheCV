def estimate_task_cost(task_type: str, result_json: str) -> float:
    """
    Estimation simple et stable du coût IA par tâche.
    """
    base_by_task = {
        "research": 0.0200,
        "salary": 0.0080,
        "job_decoder": 0.0100,
        "completeness": 0.0060,
        "pitch": 0.0100,
        "questions": 0.0120,
        "gap_analysis": 0.0100,
        "recruiter_view": 0.0090,
        "reality_check": 0.0090,
        "flaw_coaching": 0.0080,
        "action_plan": 0.0080,
        "custom_scenarios": 0.0140,
    }
    text_len = len(result_json or "")
    variable = min(0.0600, (text_len / 120000.0) * 0.0600)
    base = base_by_task.get((task_type or "").strip().lower(), 0.0070)
    return round(base + variable, 6)
