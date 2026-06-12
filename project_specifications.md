# BEYOND THE CV — SPÉCIFICATIONS TECHNIQUES & FONCTIONNELLES

## 1. VISION PRODUIT
Plateforme de coaching stratégique et de préparation aux entretiens d'embauche (Focus 100% Entretien). L'objectif est d'abandonner l'approche "générateur de CV" pour se concentrer exclusivement sur la posture, le discours, la stratégie de contournement des failles et l'entraînement sous pression.

**Cible :** Internationale (Multi-langues : 10 langues principales).
**Identité :** Un "Poste de commandement" (War Room) pour le candidat.

## 2. STACK TECHNIQUE & DESIGN
- **Frontend :** React, Lucide React icons.
- **Design System :**
  - Bleu Foncé : `#0F2650`
  - Bleu Moyen : `#446285`
  - Bleu Clair : `#6DBEF7`
  - Blanc Logo : `#F7FAFC`
- **Backend :**
  - Architecture asynchrone obligatoire (Threads de fond).
  - DB : PostgreSQL (Prod) / SQLite (Dev).
- **AI & APIs :**
  - `OPENAI_API_KEY`, `GEMINI_API_KEY` (LLM).
  - `SERPER_API_KEY` (Recherche Web en temps réel).

## 3. WORKFLOW D'ACQUISITION (FORMULAIRE 8 PAGES)

Les données sont stockées dans un JSON global au fil de la saisie.

### Page 1 : Identité & Poste Actuel
- Données personnelles + Poste actuel.
- Sert de base purement textuelle pour que l'IA connaisse le candidat.

### Page 2 : Cible & Mobilité (TRIGGER ASYNC)
- **Inputs :** Entreprise visée, Pays, Télétravail.
- **Logique Métier :**
  - Si le pays a une culture CV spécifique, le format devra s'adapter.
  - **TRIGGER BACKEND :** Au clic sur "Next" :
    1. Lancement thread `Analyse Entreprise` (si entreprise renseignée).
    2. Lancement thread `Analyse Marché` (si secteur/entreprise renseigné).

### Page 3 : Études
- Liste des diplômes.

### Page 4 : Expériences
- Liste des expériences.

### Page 5 : Soft Skills & Hobbies
- Qualités, Défauts, Hobbies, Langues.

### Page 6 : Texte Libre (TRIGGER SYNC)
- **Input :** Champ libre pour infos complémentaires.
- **TRIGGER BACKEND :** Appel synchrone pour générer les questions de clarification de la Page 7.

### Page 7 : Clarification Dynamique (TRIGGER ASYNC)
- Questions générées par l'IA pour préciser le profil.
- **TRIGGER BACKEND :** Au clic sur "Next" (passage vers Dashboard) :
  1. Estimation Salaire.
  2. Gap Analysis (Adéquation).
  3. Questionnaire Entretien.
  4. Pitch.
  5. Plan de Bataille (Training Plan).
  *Note : Ces tâches tournent en fond pendant que l'utilisateur arrive sur le dashboard.*

### Page 8 / Fin : Le Cockpit Stratégique (Dashboard)
- Point d'atterrissage hyper-visuel concentré sur les KPI de l'entretien (Score de Fit, Red Flags, Conseils de Posture).

---

## 4. PRODUITS DU DASHBOARD

### A. Onglet Cockpit (Ancien "Dossier")
- **Vue War Room :** Affichage de l'adéquation au poste, du nombre de failles identifiées, et du temps restant avant l'entretien.
- **Conseil Stratégique d'Urgence :** Posture dictée par l'IA selon l'audience (RH vs Manager) et le format (Visio vs Présentiel).
- **La Timeline :** Affichage du plan d'entraînement jour par jour (Mode Commando ou Progressif).

### B. Onglet Aide à l'Entretien
1. **Questionnaire Recruteur (IA Pipeline) :**
   - **Logique "Curiosité" :** Parser les données (ex: adresse "Rue Victor Hugo") -> Générer question culturelle.
   - **Logique "Défauts" :**
     - Question obligatoire : "Quels sont vos 3 principaux défauts ?".
     - Réponse suggérée : L'IA sélectionne les 3 "moins pires" défauts parmi ceux cochés en page 5 pour le poste visé.
   - **Interface :** Questions avec flèche déroulante pour voir la réponse attendue/suggérée (éditable).

2. **Pitch Introductif :**
   - Basé sur le JSON + Annonce.
   - Paragraphes éditables.
   - Si données insuffisantes : L'IA donne des conseils au lieu de rédiger.

### C. Onglet Analyse (Web Search + IA)
1. **Rapport Marché :**
   - Tendances & Mutations (IA, Écologie...).
   - Compétences prisées (Sémantique des offres).
   - Fiabilité : Mentionner "Estimations".
   - Échiquier concurrentiel (Attention aux oublis de startups).
   - Dynamique recrutement.

2. **Rapport Entreprise :**
   - Identité & ADN.
   - USP (Positionnement unique).
   - Actualités (3 dernières news via Serper).
   - Culture (Attention : accès Glassdoor souvent bloqué, rester sur l'image publique).

3. **Estimation Salariale :**
   - Fourchette basée sur CV + Marché.

### D. Onglet Adéquation (Gap Analysis)
- Affichage web clair :
  - Key needs from job.
  - Missing / Gaps.
  - Recommended adjustments.

### E. Onglet S'entrainer (Module Interactif)
Cet onglet permet au candidat de s'entraîner activement en répondant à des questions et en recevant un feedback instantané de l'IA.

1. **Mises en situation sur mesure :**
   - L'IA génère des scénarios de crise adaptés au poste (basé sur `custom_scenarios.md`).
   - Le candidat saisit ou dicte sa réponse.
   - L'IA évalue la réponse (structure, pertinence, sang-froid) et propose une version améliorée (basé sur `mise_en_situation.md`).
2. **Entraînement sur questions ciblées :**
   - Le candidat choisit un thème (ex: "Gestion de conflit", "Négociation").
   - L'IA génère des questions sur ce thème (basé sur `custom_question_generator.md`).
   - Le candidat répond et l'IA évalue la réponse en s'appuyant sur la méthode STAR (basé sur `evaluate_interview_answer.md`).

---

## 5. FONCTIONNALITÉS AVANCÉES & FUTURES (MODULES PREMIUM)

### Score d’employabilité (Recruiter Score)
- Score /100 basé sur : Cohérence, Clarté, Marché, Compétences, Rareté.
- Benchmark par secteur.

### Stratégie de recherche
- Rapport : Où candidater (Plateformes vs Réseau vs Direct).

### Analyse LinkedIn
- Optimisation Titre / Résumé / Mots-clés.

### Plan de montée en compétences
- Identification des lacunes -> Proposition de formations/certifications.

### Analyse des risques
- Warning sur l'entreprise (décroissance, turnover) ou le poste (impasse).

### Lettre de motivation intelligente
- Hyper-personnalisée (Poste + CV + Analyse Entreprise).

### Plan d'intégration (30-60-90 jours)
- Feuille de route pour la prise de poste.

### Career Radar (Trajectoires)
- Détection de trajectoires non linéaires plausibles.
- Ex: Officier Marine -> Chef Sécurité.

### Décodeur de Fiche de Poste
- Traduction du jargon RH en réalité opérationnelle (ex: "Environnement exigeant" -> "Grosse charge de travail").

### Hidden Job Market Engine
- Stratégie réseau : Qui contacter (Rôles cibles) et message d'approche.

### Synthèse "One-Liner"
- "Votre profil en une phrase" pour l'entête du CV.

---

## 6. UX / UI COCKPIT STRATÉGIQUE

L'écran d'accueil après analyse rompt totalement avec la notion de "Dossier de candidature". Il s'agit d'un **Tableau de Bord de Pilotage (Cockpit)**.

### Composants Clés :
1. **Bandeau de Contexte :** Date, Audience cible, Format (Visio/Présentiel), État d'esprit du candidat.
2. **Alerte de Posture :** Conseil direct de l'IA (ex: "Face à ce RH, évitez le jargon tech, souriez à la caméra").
3. **Scorecards KPI :** Match Score (%), Gaps Identifiés, Questions Pièges générées.
4. **Timeline de Bataille :** Le programme des révisions jour par jour.

### Boutons d'action rapides :
- Exporter le Rapport de Bataille (PDF).
- Lancer une session de simulation (S'entraîner).

### Modules Spéciaux :
- **Recruiter View :** "Voir mon profil comme un recruteur" (Points qui rassurent vs Doutes/Risques perçus).
- **GPS de Carrière :**
  - Position actuelle (Benchmark).
  - Destination (Poste visé).
  - Route (Étapes : Certifs, Expérience manquante).
  - ETA (Temps estimé).
- **Simulateur de Carrière :** "Si je passe la certif AWS, mon employabilité monte de +12%".

---

## 7. RÈGLES D'AFFICHAGE & IA
- **Pas de paragraphes vides :** Si pas de données, on n'affiche pas le bloc.
- **Transparence :** Afficher "Analyse basée sur X compétences détectées" pour crédibiliser l'IA.
- **Internationale :** Menu déroulant langue -> Appel prompt traduction IA.
```

<!--
[PROMPT_SUGGESTION]Analyse maintenant le fichier backend/services/cv_generator.py et vérifie s'il implémente correctement la logique des Threads de fond décrite dans la spécification.[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Crée un test unitaire qui simule le flux complet de la Page 2 (Trigger Async) jusqu'à la récupération du résultat par le Dashboard.[/PROMPT_SUGGESTION]
