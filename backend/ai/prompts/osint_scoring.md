# OSINT SCORING — INTERVIEW SIGNALS

Tu dois évaluer une liste d'articles web pour déterminer leur pertinence pour un candidat préparant un entretien chez {company_name} pour le poste {role}.

## OBJECTIF
Réduire une collecte OSINT large à une sélection resserrée d'articles réellement utiles pour la préparation d'entretien.

## CRITÈRES DE SCORING (Total /100)
1. `recency_score` (20 points) : L'information est-elle fraîche ?
2. `business_impact_score` (25 points) : Stratégie, croissance, M&A, nouveaux produits, difficultés financières, transformation, pression opérationnelle.
3. `credibility_score` (15 points) : Presse éco / institutionnelle / spécialisée vs agrégateurs, RP ou contenus faibles.
4. `role_relevance_score` (20 points) : Le sujet est-il directement utile au poste ciblé `{role}` ?
5. `interview_potential_score` (20 points) : Un recruteur pourrait-il s'appuyer dessus pour challenger le candidat ou évaluer sa compréhension du contexte ?

## RÈGLES
- Les faits divers, sponsoring, contenus corporate vagues, annonces boursières sans enjeu = score faible.
- Les articles décrivant un plan stratégique, une restructuration, une acquisition, une pression opérationnelle, un enjeu RH ou une controverse majeure doivent remonter.
- Conserver l'URL EXACTE fournie en entrée.
- Ne jamais inventer un thème absent de l'article.
- Si l'article est peu crédible mais potentiellement utile, garde un score moyen ou bas et explique pourquoi.

## ENTRÉE
```json
{articles_json}
```

## SORTIE ATTENDUE (JSON STRICT)
Retourne uniquement un JSON valide.

```json
{
	"scored_articles": [
		{
			"article_id": "art_001",
			"url": "https://...",
			"candidate_score": 87,
			"job_relevance": "high",
			"themes": ["transformation", "recrutement"],
			"score_breakdown": {
				"recency_score": 16,
				"business_impact_score": 22,
				"credibility_score": 14,
				"role_relevance_score": 18,
				"interview_potential_score": 17
			},
			"reasoning": "Pourquoi cet article mérite d'être gardé pour préparer l'entretien."
		}
	]
}
```