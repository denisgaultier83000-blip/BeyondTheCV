# Fichier central définissant les droits et quotas pour chaque offre commerciale.

PLANS = {
    "express": {
        "name": "Express",
        "access_days": 14,
        "max_applications": 1,
        "initial_credits": 3,
        "features": {
            "cv_import": True,
            "short_form": True,
            "quick_profile_analysis": True,
            "simple_gap_analysis": True,
            "mini_company_report": True,
            "osint_company_report": False,
            "market_report": False,
            "salary_estimation": False,
            "advanced_salary_negotiation": False,
            "stress_test": False,
            "interview_debrief": False,
            "plan_30_60_90": False,
            "flaw_coaching": False,
        },
        "quotas": {
            "pitch": 1,
            "qa": 8,
            "guided_answers": 3,
            "scenario": 2,
            "oral_training": 1,
            "debrief": 0
        }
    },
    "strategic": {
        "name": "Stratégique",
        "access_days": 120,
        "max_applications": 1,
        "initial_credits": 15,
        "features": {
            "cv_import": True,
            "full_form": True,
            "full_profile_analysis": True,
            "full_gap_analysis": True,
            "osint_company_report": True,
            "market_report": True,
            "salary_estimation": True,
            "advanced_salary_negotiation": False,
            "stress_test": False,
            "interview_debrief": True,
            "plan_30_60_90": False,
            "flaw_coaching": True,
        },
        "quotas": { "pitch": 3, "qa": 25, "guided_answers": 10, "scenario": 8, "oral_training": 5, "debrief": 1 }
    },
    "intensive": {
        "name": "Intensive",
        "access_days": 120,
        "max_applications": 2, # 1 principale + 1 variante
        "initial_credits": 30,
        "features": {
            "cv_import": True,
            "full_form": True,
            "full_profile_analysis": True,
            "full_gap_analysis": True,
            "osint_company_report": True, # Approfondi via prompt
            "market_report": True, # Approfondi via prompt
            "salary_estimation": True, # Avancée via prompt
            "advanced_salary_negotiation": True,
            "stress_test": True,
            "interview_debrief": True, # 3 analyses
            "plan_30_60_90": True,
            "flaw_coaching": True,
        },
        "quotas": { "pitch": 5, "qa": 40, "guided_answers": 20, "scenario": 15, "oral_training": 10, "debrief": 3 }
    }
}