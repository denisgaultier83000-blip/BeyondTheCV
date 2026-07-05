# Matrice centralisée des coûts en crédits pour chaque action IA.
# Cela facilite la maintenance et l'ajustement des prix.
QUOTA_COSTS = {
    "evaluate_answer": {"quota": "qa", "cost": 1},
    "evaluate_scenario": {"quota": "mes", "cost": 1},
    "generate_question": {"quota": "qa", "cost": 1},
    "generate_scenario": {"quota": "mes", "cost": 2},
    "evaluate_vocal_pitch": {"quota": "pitch", "cost": 2},
    "evaluate_oral_pitch": {"quota": "pitch", "cost": 1}, # Obsolète mais conservé pour l'exemple
}