# BEYOND THE CV — SPÉCIFICATIONS TECHNIQUES & FONCTIONNELLES

## 1. VISION PRODUIT
Application de coaching pour chercheurs d'emploi. L'objectif n'est pas seulement de produire un CV, mais de fournir une stratégie complète (analyse de marché, préparation à l'entretien, positionnement).

**Cible :** Internationale (Multi-langues : 10 langues principales).

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
- Servira de base pour le CV et la génération de questions.

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
  *Note : Ces tâches tournent en fond pendant que l'utilisateur arrive sur le dashboard.*

### Page 8 / Fin : Dashboard
- Point d'atterrissage. Affichage progressif des résultats.

---

## 4. PRODUITS DU DASHBOARD

### A. Onglet CV (Génération Synchrone)
1. **CV ATS :**
   - Prévisualisation LaTeX à droite.
   - Données éditables à gauche.
   - Bouton "Refresh" : Appel IA + Analyseur de cohérence.
2. **CV Humain :**
   - 3 Templates au choix (Couleurs/Polices/Layout).
   - Prévisualisation LaTeX -> PDF.
   - Indicateur visuel : Barre de matching (Score d'adéquation).

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

## 6. UX / UI DASHBOARD DIAGNOSTIC

L'écran d'accueil après analyse doit être un **Tableau de Bord de Pilotage** (et non du texte brut).

### Composants Clés :
1. **Score d'adéquation (Jauge) :** Note /100 + Résumé court.
2. **Forces Principales :** 3 points forts clés.
3. **Matrice des Lacunes :** Tableau {Compétence manquante | Impact | Action}.
4. **Stratégie Recommandée :** Priorités d'action.

### Boutons d'action rapides :
- Télécharger CV (ATS/Humain).
- Voir Pitch.
- Préparer Entretien.

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
