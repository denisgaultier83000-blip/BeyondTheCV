"""
Moteur commun d'évaluation orale pour BeyondTheCV.

Calcule les métriques mécaniques (WPM, tics, mots dévalorisants) de manière
locale, sans appel IA. Ces métriques sont partagées par tous les entraînements
oraux : pitch, questions, mises en situation, négociation salariale.
"""

import re
from typing import Any


# Dictionnaire de base des mots de remplissage / tics de langage
FILLER_WORDS_BASE = {
    "euh", "heu", "bah", "beuh", "ben", "voilà", "voila", "genre",
    "en fait", "enfin", "du coup", "quoi", "alors", "bon", "tu vois",
    "vous voyez", "en gros", "bref", "finalement", "somme toute",
    "comment dire", "en quelque sorte", "si vous voulez", "si tu veux",
    "à la limite", "en tout cas", "de toute façon", "c'est-à-dire",
    "c'est à dire", "hein",
}

# Mots dévalorisants génériques (contexte neutre)
NEGATIVE_WORDS_BASE = {
    "impossible", "incapable", "incompétent", "nul", "nulle", "perdre",
    "échec", "echec", "rate", "rater", "raté", "faute", "catastrophe",
    "horrible", "désastre", "desastre", "pitié", "dommage", "honte",
    "peur", "paniquer", "stresser", "angoisse", "anxiété", "anxiete",
}

# Mots spécifiques à la négociation salariale
NEGOTIATION_WEAK_WORDS = {
    "désolé", "desole", "désolée", "desolee", "excuse", "excuses",
    "peut-être", "peut etre", "peut-etre", "probablement", "éventuellement",
    "eventuellement", "si c'est possible", "si possible", "un peu", "un petit peu",
    "pas grand-chose", "pas grand chose", "juste", "seulement", "environ",
    "à peu près", "a peu pres", "approximativement", "si vous voulez bien",
    "si ça ne vous dérange pas", "si ca ne vous derange pas",
    "j'espère", "j espere", "j'espere", "ce serait sympa", "ce serait gentil",
    "malheureusement", "hélas", "helas", "trop", "cher", "élevé", "eleve",
}

# Mots dévalorisants spécifiques au pitch (manque d'assurance)
PITCH_WEAK_WORDS = {
    "je pense que", "je crois que", "il me semble que", "peut-être",
    "à mon humble avis", "si vous voulez", "je voulais juste",
    "je ne suis pas sûr", "je ne suis pas sur", "pas certain",
}


def _normalize_text(text: str) -> str:
    """Normalise le texte pour la détection : minuscules, accents conservés."""
    return str(text or "").lower().strip()


def _detect_substrings(text: str, patterns: set[str]) -> list[str]:
    """
    Détecte les sous-chaînes d'un ensemble dans un texte.
    Retourne les occurrences uniques trouvées dans l'ordre de leur première apparition.
    """
    found: list[str] = []
    seen: set[str] = set()
    for pattern in patterns:
        if pattern in text and pattern not in seen:
            found.append(pattern)
            seen.add(pattern)
    return found


def _count_overlapping_substrings(text: str, patterns: set[str]) -> int:
    """Compte le nombre total d'occurrences de sous-chaînes (peut compter des chevauchements)."""
    count = 0
    for pattern in patterns:
        start = 0
        while True:
            idx = text.find(pattern, start)
            if idx == -1:
                break
            count += 1
            start = idx + 1
    return count


def _pace_status(wpm: int) -> str:
    if 90 <= wpm <= 160:
        return "bon"
    if wpm < 90:
        return "lent"
    return "rapide"


def compute_oral_metrics(
    transcript: str,
    duration_seconds: float = 0,
    exercise_type: str = "pitch",
    language: str = "fr",
) -> dict[str, Any]:
    """
    Calcule les métriques orales locales pour un transcript.

    Args:
        transcript: Texte retranscrit de la réponse orale.
        duration_seconds: Durée en secondes de l'enregistrement.
        exercise_type: Type d'exercice ('pitch', 'qa', 'mes', 'negotiation', 'generic').
        language: Langue du transcript (utilisée pour d'éventuels dictionnaires futurs).

    Returns:
        Dictionnaire contenant wpm, pace_status, tics, mots dévalorisants, etc.
    """
    normalized = _normalize_text(transcript)
    words = [w for w in re.split(r"\s+", normalized) if w]
    word_count = len(words)

    # Calcul du WPM
    try:
        duration_seconds = float(duration_seconds or 0)
    except (TypeError, ValueError):
        duration_seconds = 0.0
    duration_minutes = max(duration_seconds, 1) / 60.0
    wpm = round(word_count / duration_minutes) if word_count else 0

    # Tics de langage
    filler_detected = _detect_substrings(normalized, FILLER_WORDS_BASE)
    filler_count = _count_overlapping_substrings(normalized, FILLER_WORDS_BASE)

    # Mots dévalorisants contextuels
    exercise_type = (exercise_type or "generic").lower()
    if exercise_type == "negotiation":
        negative_patterns = NEGATIVE_WORDS_BASE | NEGOTIATION_WEAK_WORDS
    elif exercise_type == "pitch":
        negative_patterns = NEGATIVE_WORDS_BASE | PITCH_WEAK_WORDS
    else:
        # qa, mes, generic : on reste sur le dictionnaire de base
        negative_patterns = NEGATIVE_WORDS_BASE

    negative_detected = _detect_substrings(normalized, negative_patterns)
    negative_count = _count_overlapping_substrings(normalized, negative_patterns)

    # Débit / longueur qualitative
    pace_status = _pace_status(wpm)
    length_assessment = "adéquate"
    if word_count < 20:
        length_assessment = "très courte"
    elif word_count < 40:
        length_assessment = "courte"
    elif word_count > 250:
        length_assessment = "longue"
    elif word_count > 180:
        length_assessment = "un peu longue"

    return {
        "wpm": wpm,
        "pace_status": pace_status,
        "word_count": word_count,
        "duration_seconds": round(duration_seconds, 2),
        "duration_minutes": round(duration_minutes, 2),
        "filler_words_detected": filler_detected,
        "filler_count": filler_count,
        "negative_words_detected": negative_detected,
        "negative_count": negative_count,
        "length_assessment": length_assessment,
        "exercise_type": exercise_type,
        "language": language,
    }


def impact_label(score: int | float) -> str:
    """Renvoie un libellé qualitatif pour un score d'impact sur 100."""
    try:
        score = int(score)
    except (TypeError, ValueError):
        return "Non évalué"
    if score >= 85:
        return "Excellent"
    if score >= 70:
        return "Très bien"
    if score >= 55:
        return "Bonne base"
    if score >= 40:
        return "À consolider"
    return "À retravailler"


def get_metrics_summary(metrics: dict[str, Any] | None) -> dict[str, Any]:
    """Retourne un résumé lisible des métriques pour l'interface."""
    if not metrics:
        return {}
    return {
        "wpm": metrics.get("wpm", 0),
        "pace_status": metrics.get("pace_status", "non mesuré"),
        "pace_label": f"{metrics.get('wpm', 0)} mots/min",
        "filler_count": metrics.get("filler_count", 0),
        "filler_label": "Aucun" if metrics.get("filler_count", 0) == 0 else f"{metrics.get('filler_count')} détecté(s)",
        "negative_count": metrics.get("negative_count", 0),
        "negative_label": "Aucun" if metrics.get("negative_count", 0) == 0 else f"{metrics.get('negative_count')} détecté(s)",
    }
