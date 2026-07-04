# OSINT SCORING — INTERVIEW SIGNALS

Tu dois évaluer une liste d'extraits web pour déterminer leur pertinence pour un candidat préparant un entretien chez {company_name}.

## CRITÈRES DE SCORING (Total /100) :
1. Récence (20 points) : L'information est-elle fraîche ?
2. Impact Business (30 points) : Stratégie, croissance, M&A, nouveaux produits, ou difficultés financières.
3. Impact Recrutement/RH (20 points) : Turnover, culture, conflits sociaux, création de postes, management.
4. Crédibilité de la source (15 points) : Presse éco/institutionnelle vs sites de RP ou forums.
5. Potentiel de question d'entretien (15 points) : Un recruteur pourrait-il utiliser ça pour challenger le candidat ?

## RÈGLES
- Les "faits divers", "sponsoring" ou "annonces boursières génériques" = Score < 40.
- Les "plans stratégiques", "restructurations", "controverses", "acquisitions" = Score > 75.
- Renvoie l'URL EXACTE telle que fournie.

## ENTRÉE
```json
{articles_json}
```

## SORTIE ATTENDUE (JSON STRICT)
Renvoie un JSON structuré avec "scored_articles" contenant des objets avec "url", "score" (entier) et "reasoning".