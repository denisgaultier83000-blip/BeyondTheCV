# BeyondTheCV — Spécification fonctionnelle et stratégie de tests automatisés

**Statut :** document de référence à transmettre à l’IA chargée du développement  
**Objectif :** fiabiliser l’application avant mise en production et constituer une recette automatisée durable  
**Priorités absolues :** traitement asynchrone déclenché depuis la page 3, création/révision d’une candidature, utilisation sans annonce identifiée, isolation des comptes, quotas et paiement

---

## 1. Mission confiée à l’IA développeuse

Tu dois analyser le dépôt BeyondTheCV, confronter le code existant à cette spécification, identifier les écarts, puis implémenter les comportements et les tests nécessaires.

Ne considère pas le nombre de tests comme une limite. Le catalogue ci-dessous constitue un socle minimal. Ajoute tout scénario nécessaire découvert dans les routes, composants, modèles, migrations, tâches asynchrones, intégrations externes et règles métier.

Avant toute modification :

1. inventorier les pages React, routes FastAPI, modèles, tâches de fond, appels IA, appels Serper, fichiers, emails, règles de quotas et fonctions Stripe ;
2. produire une matrice de traçabilité `exigence → code → test` ;
3. signaler les contradictions entre cette spécification et le comportement actuel ;
4. ne pas modifier silencieusement une règle métier ambiguë ;
5. implémenter d’abord les sécurités et tests P0, puis P1, puis P2.

Livrables attendus dans le dépôt :

- `docs/TEST_STRATEGY.md` : architecture de test et commandes ;
- `docs/TEST_CATALOG.md` ou `.yaml` : catalogue complet avec identifiants stables ;
- `docs/TRACEABILITY_MATRIX.md` : exigences, fichiers et tests associés ;
- tests unitaires et métier backend ;
- tests API/intégration sur PostgreSQL éphémère ;
- tests Playwright des parcours critiques ;
- mocks contractuels OpenAI/Gemini, Serper, email et Stripe ;
- rapports de test avec traces, captures et vidéos uniquement en cas d’échec ;
- workflow CI rapide, workflow staging complet et workflow nocturne étendu.

---

## 2. Principes non négociables

### 2.1 Un test doit prouver quelque chose

Chaque test contient :

- un identifiant stable ;
- une exigence métier ;
- des préconditions ;
- des données de test explicites ;
- des actions ;
- des résultats attendus visibles ;
- si nécessaire, des résultats attendus en base et dans les compteurs ;
- une priorité `P0`, `P1` ou `P2` ;
- un niveau `unit`, `api`, `integration`, `e2e`, `contract`, `security` ou `manual-exploratory`.

Un test qui se contente de vérifier l’absence d’exception n’est pas suffisant.

### 2.2 Les services externes ne doivent pas rendre la CI aléatoire

Dans la CI courante, OpenAI/Gemini, Serper, Stripe et le service email sont simulés par des doubles contractuels contrôlés. Prévoir au minimum les réponses suivantes : succès, timeout, HTTP 400, 401, 403, 429, 500, JSON invalide, schéma incomplet, réponse vide et réponse anormalement longue.

Les vrais appels externes sont réservés à un workflow contractuel staging, limité et planifié.

### 2.3 Aucun secret ni donnée personnelle réelle dans les tests

- utiliser exclusivement des comptes, CV et annonces synthétiques ;
- ne jamais journaliser de mot de passe, token, CV complet ou clé API ;
- ne jamais utiliser de clé Stripe live ;
- masquer les données sensibles dans les traces CI.

### 2.4 Idempotence obligatoire

Une répétition technique de la même demande ne doit jamais :

- créer deux candidatures ;
- lancer deux analyses payantes identiques ;
- consommer deux fois un quota ;
- activer deux fois un abonnement ;
- traiter deux fois un webhook Stripe ;
- produire des résultats contradictoires sur une même révision.

---

## 3. Décisions fonctionnelles à implémenter

## 3.1 Clic sur « Suivant » depuis la page 3

Le clic déclenche l’étude du nom de l’entreprise et de l’annonce en tâche de fond. L’utilisateur ne doit pas attendre la fin du traitement pour poursuivre sa navigation.

Au clic :

1. valider les champs selon le mode de candidature ;
2. enregistrer atomiquement la candidature ou sa révision ;
3. créer un instantané immuable des entrées utilisées par l’analyse ;
4. calculer une empreinte des données pertinentes ;
5. réserver ou vérifier les droits et quotas nécessaires ;
6. créer ou retrouver un job idempotent ;
7. retourner immédiatement un identifiant de job ;
8. naviguer vers la page suivante avec un état de progression visible ;
9. poursuivre le job même si l’utilisateur change de page ou recharge le navigateur ;
10. ne publier les résultats que s’ils correspondent toujours à la révision active.

### Instantané minimal du job

```json
{
  "user_id": "uuid",
  "application_id": "uuid",
  "application_revision": 3,
  "mode": "targeted",
  "company_name": "Entreprise Exemple",
  "job_title": "Directeur de la communication",
  "job_ad_text": "…",
  "employment_domain": "Communication",
  "candidate_profile_version": 4,
  "cv_version": 2,
  "prompt_version": "company-analysis-v5",
  "requested_at": "ISO-8601"
}
```

L’empreinte fonctionnelle doit dépendre au minimum de l’utilisateur, de la candidature, de sa révision, du mode, du nom d’entreprise normalisé, du poste, du texte d’annonce normalisé, du domaine, de la version du profil/CV et de la version du prompt.

### États du job

```text
PENDING → RUNNING → SUCCEEDED
                  ↘ RETRY_WAIT → RUNNING
                  ↘ FAILED_RETRYABLE
                  ↘ FAILED_FINAL
PENDING/RUNNING → SUPERSEDED
PENDING/RUNNING → CANCELLED
```

### Règles d’affichage

- afficher une progression compréhensible, sans faux pourcentage ;
- distinguer au minimum : préparation, analyse de l’annonce, analyse de l’entreprise, synthèse ;
- permettre la navigation pendant le traitement ;
- au retour sur la candidature, récupérer l’état réel du backend ;
- afficher une action « Réessayer » uniquement lorsque cela est pertinent ;
- ne jamais montrer un résultat d’une ancienne révision comme s’il était courant ;
- conserver un diagnostic technique côté serveur sans exposer de secrets à l’utilisateur.

### Règles de quota

- une demande identique rejouée ne consomme pas deux fois ;
- un job échoué avant toute production exploitable ne consomme pas définitivement l’analyse ;
- une relance automatique ne consomme pas une nouvelle unité ;
- un nouveau calcul demandé après modification substantielle peut consommer une nouvelle unité selon la règle commerciale ;
- toute réservation doit être libérée en cas d’échec final non facturable ;
- la décision de débit doit être atomique et traçable.

## 3.2 Création d’une nouvelle candidature

Une nouvelle candidature peut provenir de deux chemins :

1. bouton **« + Ajouter une candidature »** ;
2. modification, depuis la page 3, d’un élément structurant d’une candidature existante.

### Depuis « + Ajouter une candidature »

- créer un brouillon neuf avec un nouvel identifiant ;
- conserver le profil candidat et le CV communs, sans recopier les résultats propres à l’ancienne candidature ;
- ne jamais préremplir silencieusement l’entreprise ou l’annonce précédente ;
- ne consommer une candidature du forfait qu’au moment défini par la règle métier, pas à chaque brouillon abandonné ;
- empêcher la création multiple par double clic ou reprise réseau.

### Modification d’un élément structurant sur la page 3

Éléments structurants : mode, entreprise, intitulé du poste, annonce, domaine d’emploi.

Si la candidature ne possède encore aucun résultat aval, l’utilisateur peut mettre à jour le brouillon courant.

Si des analyses ou entraînements existent déjà, ne jamais les écraser silencieusement. Afficher une confirmation proposant :

1. **Créer une nouvelle candidature** — choix recommandé ; l’ancienne reste intacte ;
2. **Mettre à jour cette candidature** — créer une nouvelle révision, invalider les résultats devenus obsolètes et conserver l’historique ;
3. **Annuler** — revenir aux valeurs précédentes.

Une modification cosmétique — espaces, casse, ponctuation non signifiante — ne doit pas créer artificiellement une nouvelle analyse. Une modification substantielle doit produire une nouvelle empreinte.

## 3.3 Candidat sans annonce : mode « Exploration métier »

L’application ne doit pas bloquer une personne qui connaît seulement son domaine d’emploi, par exemple `Communication`, `DSI`, `Ressources humaines` ou `Finance`.

Introduire deux modes explicites :

```text
TARGETED     = entreprise ou poste identifié, avec ou sans annonce complète
EXPLORATION  = domaine/famille de métiers identifié, sans annonce ciblée
```

### Données du mode Exploration

Obligatoire :

- domaine d’emploi ou famille de métiers.

Optionnel :

- fonction recherchée ;
- niveau de séniorité ;
- secteur d’activité ;
- localisation ;
- type d’organisation ;
- entreprise envisagée ;
- préférences ou contraintes du candidat.

### Résultats autorisés en Exploration

- cartographie des fonctions possibles ;
- compétences généralement attendues ;
- correspondance entre profil/CV et domaine ;
- forces transférables et lacunes générales ;
- proposition de pitch exploratoire ;
- questions d’entretien génériques par fonction ;
- exercices de mise en situation liés au domaine ;
- pistes pour préciser la recherche.

### Résultats interdits ou signalés comme indisponibles

Ne pas prétendre avoir analysé :

- la culture d’une entreprise absente ;
- une annonce inexistante ;
- des exigences précises non fournies ;
- des enjeux propres à une société inconnue.

Afficher alors une indication claire : **« Cette analyse deviendra disponible lorsque vous ajouterez une entreprise ou une annonce. »**

### Conversion Exploration → Candidature ciblée

- conserver le travail générique utile ;
- demander l’entreprise, le poste et éventuellement l’annonce ;
- créer une révision ciblée ou un objet candidature lié ;
- lancer uniquement les analyses spécifiques manquantes ;
- ne pas recalculer inutilement le profil candidat ;
- ne pas mélanger les résultats génériques et spécifiques ;
- appliquer à la conversion la règle de consommation d’une candidature du forfait.

### Règle commerciale recommandée, configurable

- un projet Exploration actif ne consomme pas immédiatement l’une des cinq candidatures ;
- les analyses IA réellement effectuées consomment des unités d’analyse ;
- une candidature est consommée lors de la conversion en mode ciblé ;
- limiter par configuration le nombre de projets Exploration actifs afin d’éviter le contournement du forfait.

Cette règle doit être centralisée dans le backend et configurable, jamais codée uniquement dans le frontend.

---

## 4. Modèle métier recommandé

Champs à adapter au modèle existant :

```text
Application
  id
  user_id
  mode: TARGETED | EXPLORATION
  status: DRAFT | ACTIVE | ARCHIVED | DELETED
  revision_number
  company_name?
  job_title?
  job_ad_text?
  employment_domain?
  seniority?
  industry?
  location?
  created_at
  updated_at

AnalysisJob
  id
  application_id
  user_id
  revision_number
  fingerprint
  idempotency_key
  state
  stage
  attempt_count
  input_snapshot_json
  result_reference?
  error_code?
  created_at
  started_at?
  finished_at?

AnalysisUsage
  id
  user_id
  application_id
  job_id
  operation_type
  state: RESERVED | CONSUMED | RELEASED
  units
  unique_operation_key
  timestamps
```

Contraintes recommandées :

- unicité de l’idempotency key par utilisateur/opération ;
- unicité du débit pour un même job ;
- index sur `application_id`, `user_id`, `state` et `fingerprint` ;
- contrôle d’appartenance sur chaque lecture et écriture ;
- verrou ou mise à jour conditionnelle pour les quotas ;
- historique des révisions conservé ou auditable.

---

## 5. Priorités d’exécution

- `P0` : paiement, autorisation, perte/corruption de données, tâche page 3, candidature, quota, suppression de compte, indisponibilité générale.
- `P1` : fonctionnalité importante dégradée, récupération après incident, multi-navigateurs principaux, accessibilité essentielle.
- `P2` : variations rares, confort, rendu secondaire, cas exploratoires étendus.

Les tests P0 doivent bloquer toute fusion ou mise en production.

---

## 6. Parcours E2E critiques minimaux

Ces parcours doivent être automatisés dans Playwright. La liste n’est pas limitée à 25 ; elle doit évoluer avec le produit.

### Compte et profil

1. **E2E-P0-001** — inscription, activation éventuelle, connexion et arrivée sur le bon écran ;
2. **E2E-P0-002** — reconnexion avec session persistante puis déconnexion complète ;
3. **E2E-P0-003** — réinitialisation du mot de passe, lien expiré et ancien mot de passe refusé ;
4. **E2E-P0-004** — création/modification du profil candidat avec persistance ;
5. **E2E-P0-005** — import d’un CV valide et restitution de son état d’analyse ;
6. **E2E-P0-006** — fichier invalide refusé sans consommation ni données résiduelles.

### Candidatures et page 3

7. **E2E-P0-007** — ajout d’une candidature ciblée depuis le bouton `+` ;
8. **E2E-P0-008** — double clic sur `+` ne créant qu’un brouillon ;
9. **E2E-P0-009** — clic `Suivant` page 3, navigation immédiate et progression du job ;
10. **E2E-P0-010** — rechargement pendant le job puis reprise de l’affichage d’état ;
11. **E2E-P0-011** — navigation vers une autre page pendant le job puis résultat disponible au retour ;
12. **E2E-P0-012** — double clic sur `Suivant` ne lançant qu’un job et qu’un débit ;
13. **E2E-P0-013** — perte de réponse HTTP après création du job puis nouvelle tentative idempotente ;
14. **E2E-P0-014** — modification substantielle pendant un job : ancien résultat marqué obsolète ;
15. **E2E-P0-015** — ancienne candidature conservée lors de `Créer une nouvelle candidature` ;
16. **E2E-P0-016** — `Mettre à jour cette candidature` crée une nouvelle révision sans mélanger les résultats ;
17. **E2E-P0-017** — cinquième candidature acceptée et sixième refusée selon le forfait ;
18. **E2E-P0-018** — deux onglets tentant simultanément de créer la dernière candidature disponible ;
19. **E2E-P0-019** — candidature archivée consultable sans être modifiable accidentellement ;
20. **E2E-P0-020** — utilisateur B incapable d’accéder à la candidature, au job ou aux fichiers de A.

### Exploration métier

21. **E2E-P0-021** — création d’un projet Exploration avec seulement `Communication` ;
22. **E2E-P0-022** — création d’un projet Exploration avec seulement `DSI` ;
23. **E2E-P0-023** — affichage des modules génériques et désactivation explicite des modules spécifiques ;
24. **E2E-P0-024** — conversion Exploration vers candidature ciblée avec entreprise et annonce ;
25. **E2E-P0-025** — conservation des résultats génériques et séparation des nouveaux résultats ciblés ;
26. **E2E-P0-026** — conversion comptabilisée une seule fois dans le forfait ;
27. **E2E-P1-027** — abandon puis reprise ultérieure d’une Exploration ;
28. **E2E-P1-028** — changement de domaine avec confirmation et invalidation correcte.

### IA et services externes

29. **E2E-P0-029** — analyse normale de l’annonce et de l’entreprise ;
30. **E2E-P0-030** — Serper indisponible : résultat dégradé honnête et action de reprise ;
31. **E2E-P0-031** — fournisseur IA en timeout : job réessayé sans double débit ;
32. **E2E-P0-032** — réponse IA invalide : rejet, réparation contrôlée ou erreur explicite ;
33. **E2E-P0-033** — prompt injection dans l’annonce ignorée ;
34. **E2E-P1-034** — changement de version de prompt créant un résultat correctement versionné.

### Abonnement et RGPD

35. **E2E-P0-035** — paiement Stripe réussi puis droits activés par webhook backend ;
36. **E2E-P0-036** — paiement refusé/annulé sans activation ;
37. **E2E-P0-037** — webhook dupliqué sans double attribution ;
38. **E2E-P0-038** — impayé, renouvellement et résiliation avec états cohérents ;
39. **E2E-P0-039** — suppression du compte et disparition des données/fichiers ;
40. **E2E-P0-040** — export éventuel limité au propriétaire et sans données d’un tiers.

---

## 7. Catalogue minimal de scénarios

Chaque ligne ci-dessous doit devenir un test ou être reliée à un test existant. Si une fonctionnalité n’existe pas encore, l’indiquer comme `NOT_IMPLEMENTED` dans la matrice plutôt que de prétendre qu’elle est couverte.

### 7.1 Authentification, compte et sessions

- **AUTH-001 P0** — inscription avec données valides ; compte unique créé.
- **AUTH-002 P1** — adresse email normalisée avant contrôle d’unicité.
- **AUTH-003 P1** — email invalide refusé côté client et serveur.
- **AUTH-004 P1** — mot de passe ne respectant pas la politique refusé.
- **AUTH-005 P0** — email déjà utilisé ne crée pas de second compte.
- **AUTH-006 P0** — mauvais mot de passe ne révèle pas si le compte existe.
- **AUTH-007 P0** — session valide acceptée sur route protégée.
- **AUTH-008 P0** — session absente, expirée ou falsifiée refusée.
- **AUTH-009 P0** — déconnexion invalide effectivement la session attendue.
- **AUTH-010 P0** — changement de mot de passe invalide les sessions selon la politique.
- **AUTH-011 P0** — lien de réinitialisation à usage unique.
- **AUTH-012 P0** — lien expiré ou modifié refusé.
- **AUTH-013 P1** — limitation des tentatives de connexion et récupération correcte.
- **AUTH-014 P1** — redirection après connexion vers la destination autorisée.
- **AUTH-015 P0** — redirection externe malveillante impossible.
- **AUTH-016 P0** — utilisateur supprimé incapable de réutiliser son ancienne session.
- **AUTH-017 P1** — session simultanée sur deux appareils cohérente.
- **AUTH-018 P0** — erreur d’authentification sans token ni secret dans les logs.

### 7.2 Profil candidat, CV et fichiers

- **CV-001 P0** — création du profil minimal valide.
- **CV-002 P1** — mise à jour du profil sans perte de champs.
- **CV-003 P1** — champs trop longs ou caractères Unicode traités correctement.
- **CV-004 P0** — PDF valide importé et rattaché au bon utilisateur.
- **CV-005 P1** — DOCX valide importé si format accepté.
- **CV-006 P0** — extension autorisée mais contenu réel interdit refusé.
- **CV-007 P0** — taille maximale acceptée, taille supérieure refusée.
- **CV-008 P0** — fichier vide, corrompu ou chiffré géré explicitement.
- **CV-009 P0** — nom de fichier avec traversée de chemin neutralisé.
- **CV-010 P0** — fichier d’un utilisateur inaccessible à un autre par URL directe.
- **CV-011 P0** — remplacement du CV crée une version et ne mélange pas les analyses.
- **CV-012 P1** — suppression du CV invalide les accès associés.
- **CV-013 P1** — échec du parseur n’efface pas le fichier précédent valide.
- **CV-014 P1** — double upload n’entraîne pas deux analyses identiques.
- **CV-015 P1** — données extraites conformes au schéma attendu.
- **CV-016 P0** — contenu du CV ne peut pas modifier les instructions système de l’IA.
- **CV-017 P0** — absence de CV gérée selon les modules réellement disponibles.
- **CV-018 P0** — aucun texte intégral du CV dans logs ou messages techniques.

### 7.3 Navigation, brouillons et état frontend

- **NAV-001 P1** — progression entre les pages conservée après rechargement.
- **NAV-002 P1** — retour arrière ne duplique aucune écriture.
- **NAV-003 P1** — ouverture directe d’une étape interdite redirigée proprement.
- **NAV-004 P0** — changement de compte purge l’état local du précédent.
- **NAV-005 P1** — brouillon sauvegardé sans créer une candidature consommée prématurément.
- **NAV-006 P1** — abandon d’un brouillon puis reprise cohérente.
- **NAV-007 P0** — stockage navigateur ne contient aucun secret durable.
- **NAV-008 P1** — erreur backend visible et actionnable, sans écran blanc.
- **NAV-009 P1** — boutons désactivés pendant une action non idempotente.
- **NAV-010 P1** — plusieurs onglets convergent vers l’état serveur réel.
- **NAV-011 P1** — deep-link vers candidature archivée traité correctement.
- **NAV-012 P1** — état de chargement accessible au lecteur d’écran.

### 7.4 Candidatures et révisions

- **CAND-001 P0** — création ciblée avec entreprise, poste et annonce.
- **CAND-002 P0** — création ciblée avec entreprise/poste mais sans texte d’annonce.
- **CAND-003 P0** — champs obligatoires validés selon le mode.
- **CAND-004 P0** — double clic sur ajout produit un seul objet.
- **CAND-005 P0** — reprise après timeout de création sans doublon.
- **CAND-006 P1** — brouillon abandonné ne consomme pas injustement le forfait.
- **CAND-007 P0** — modification avant toute analyse met à jour le brouillon.
- **CAND-008 P0** — modification après analyse déclenche le choix explicite.
- **CAND-009 P0** — choix nouvelle candidature conserve intégralement l’ancienne.
- **CAND-010 P0** — choix mise à jour crée une révision.
- **CAND-011 P0** — choix annuler restaure les valeurs antérieures.
- **CAND-012 P1** — espaces/casse seuls ne déclenchent pas un recalcul.
- **CAND-013 P0** — nouvelle annonce substantiellement différente invalide l’ancien résultat ciblé.
- **CAND-014 P0** — changement d’entreprise invalide l’analyse entreprise.
- **CAND-015 P1** — changement de poste sans changement d’entreprise réutilise seulement les données mutualisables valides.
- **CAND-016 P0** — changement de CV invalide uniquement les analyses qui en dépendent.
- **CAND-017 P1** — archivage conserve les données mais bloque les actions inadaptées.
- **CAND-018 P1** — restauration d’archive respecte quotas et révisions.
- **CAND-019 P0** — suppression logique/physique conforme à la politique.
- **CAND-020 P0** — identifiant d’un tiers dans URL/API renvoie 403/404 sans fuite.
- **CAND-021 P1** — tri, filtres et compteurs incluent les bons statuts.
- **CAND-022 P1** — deux candidatures même entreprise/postes différents restent séparées.
- **CAND-023 P1** — deux candidatures même poste/annonces différentes restent séparées.
- **CAND-024 P1** — caractères spéciaux et texte long d’annonce traités.
- **CAND-025 P0** — données HTML/script dans annonce rendues inertes.
- **CAND-026 P0** — concurrence sur dernière place disponible atomique.
- **CAND-027 P1** — date de création/actualisation cohérente et serveur autoritaire.
- **CAND-028 P0** — restauration réseau ne réapplique pas une ancienne modification.

### 7.5 Tâche de fond déclenchée page 3 — priorité renforcée

- **BG3-001 P0** — clic valide crée un job et retourne rapidement.
- **BG3-002 P0** — les entrées sont persistées avant lancement du job.
- **BG3-003 P0** — snapshot du job immuable après création.
- **BG3-004 P0** — empreinte identique pour données fonctionnellement identiques.
- **BG3-005 P0** — empreinte différente après modification substantielle.
- **BG3-006 P0** — double clic crée un seul job actif.
- **BG3-007 P0** — deux requêtes simultanées avec même clé sont idempotentes.
- **BG3-008 P0** — réponse HTTP perdue puis retry retrouve le job existant.
- **BG3-009 P0** — refresh navigateur n’annule pas le job backend.
- **BG3-010 P0** — fermeture navigateur n’annule pas arbitrairement le job.
- **BG3-011 P0** — déconnexion masque le résultat sans corrompre le job.
- **BG3-012 P0** — reconnexion propriétaire retrouve le bon état.
- **BG3-013 P0** — autre utilisateur ne peut interroger l’état du job.
- **BG3-014 P0** — transitions d’état valides et impossibilité de revenir de `SUCCEEDED` à `RUNNING`.
- **BG3-015 P0** — crash worker avant démarrage récupérable.
- **BG3-016 P0** — crash worker en cours traité sans double débit.
- **BG3-017 P0** — timeout Serper déclenche politique de reprise prévue.
- **BG3-018 P0** — rate limit Serper utilise backoff borné.
- **BG3-019 P0** — timeout IA déclenche reprise bornée.
- **BG3-020 P0** — erreur IA finale produit un état explicite.
- **BG3-021 P0** — réponse IA invalide n’est pas publiée brute.
- **BG3-022 P0** — échec partiel distingue analyse annonce et analyse entreprise.
- **BG3-023 P1** — succès partiel exploitable affiché comme tel, sans fausse complétude.
- **BG3-024 P0** — relance automatique réutilise réservation et job logique.
- **BG3-025 P0** — action utilisateur `Réessayer` ne double pas la consommation.
- **BG3-026 P0** — quota réservé atomiquement avant travail facturable.
- **BG3-027 P0** — réservation libérée après échec final non facturable.
- **BG3-028 P0** — succès consomme exactement le nombre prévu.
- **BG3-029 P0** — modification pendant job rend l’ancien job `SUPERSEDED` ou son résultat obsolète.
- **BG3-030 P0** — ancien job terminant après le nouveau ne remplace jamais le résultat courant.
- **BG3-031 P0** — suppression candidature pendant job empêche toute publication ultérieure.
- **BG3-032 P1** — archivage pendant job suit une règle définie et testée.
- **BG3-033 P0** — redéploiement d’un worker ne perd pas les jobs persistés.
- **BG3-034 P1** — progression affichée correspond aux étapes réelles.
- **BG3-035 P1** — absence de faux pourcentage ou progression régressive.
- **BG3-036 P0** — données d’un job absentes des logs non autorisés.
- **BG3-037 P1** — métriques durée/succès/échec disponibles sans PII.
- **BG3-038 P1** — job anormalement long détecté et signalé.
- **BG3-039 P0** — nettoyage ne supprime pas un job encore utile.
- **BG3-040 P1** — résultat mis en cache seulement si empreinte et droits correspondent.
- **BG3-041 P0** — résultat mutualisé entreprise ne fuit aucune donnée candidat.
- **BG3-042 P1** — changement de prompt versionne ou invalide correctement le cache.
- **BG3-043 P0** — saisie contenant injection de prompt traitée comme donnée non instruction.
- **BG3-044 P0** — HTML/script/URL malveillante n’est ni exécutée ni rendue dangereusement.
- **BG3-045 P1** — caractères Unicode, emojis et très longue annonce correctement traités.

### 7.6 Mode Exploration métier

- **EXP-001 P0** — domaine seul suffit à créer une Exploration.
- **EXP-002 P0** — absence de domaine est refusée avec explication.
- **EXP-003 P1** — sélection `Communication` produit des modules génériques pertinents.
- **EXP-004 P1** — sélection `DSI` produit une famille de métiers distincte.
- **EXP-005 P1** — domaine libre inconnu propose clarification sans inventer.
- **EXP-006 P1** — fonction cible optionnelle affine les résultats.
- **EXP-007 P1** — séniorité modifie les attentes sans changer de propriétaire.
- **EXP-008 P1** — secteur/localisation facultatifs correctement conservés.
- **EXP-009 P0** — aucune fausse analyse d’entreprise si entreprise absente.
- **EXP-010 P0** — aucune fausse analyse d’annonce si annonce absente.
- **EXP-011 P1** — modules indisponibles expliquent ce qu’il faut ajouter.
- **EXP-012 P0** — profil/CV du candidat utilisé sans recalcul inutile.
- **EXP-013 P1** — questions génériques clairement étiquetées comme telles.
- **EXP-014 P1** — pitch exploratoire n’affirme pas une candidature inexistante.
- **EXP-015 P0** — analyses consommées comptabilisées selon configuration backend.
- **EXP-016 P0** — création du projet ne consomme pas une candidature si règle activée.
- **EXP-017 P0** — limite des Explorations actives imposée côté backend.
- **EXP-018 P0** — contournement par API directe impossible.
- **EXP-019 P0** — conversion avec entreprise/poste sans annonce autorisée si prévue.
- **EXP-020 P0** — conversion avec annonce lance les analyses spécifiques.
- **EXP-021 P0** — conversion consommée une seule fois.
- **EXP-022 P0** — retry de conversion ne crée pas deux candidatures.
- **EXP-023 P1** — résultats génériques utiles conservés après conversion.
- **EXP-024 P0** — résultats spécifiques séparés et datés.
- **EXP-025 P1** — changement de domaine avant conversion invalide le bon sous-ensemble.
- **EXP-026 P0** — changement de domaine après résultats demande confirmation.
- **EXP-027 P1** — archivage/restauration d’Exploration cohérents.
- **EXP-028 P0** — Exploration d’un tiers inaccessible.
- **EXP-029 P1** — recherche de domaine utilisable au clavier et accessible.
- **EXP-030 P1** — taxonomie et texte libre produisent une valeur canonique auditable.

### 7.7 Modules IA et qualité structurelle

- **AI-001 P0** — sortie conforme au schéma pour chaque module.
- **AI-002 P0** — champs obligatoires absents détectés.
- **AI-003 P0** — réponse non JSON réparée une fois ou rejetée proprement.
- **AI-004 P1** — réponse vide ou tronquée gérée.
- **AI-005 P1** — réponse excessivement longue bornée.
- **AI-006 P0** — prompt injection CV ignorée.
- **AI-007 P0** — prompt injection annonce ignorée.
- **AI-008 P0** — URL ou contenu récupéré traité comme source non fiable.
- **AI-009 P0** — aucune clé, prompt système ou donnée d’un tiers exposé.
- **AI-010 P0** — contenu discriminatoire ou illégal filtré selon politique.
- **AI-011 P1** — `recruiter_view` reste direct mais non humiliant.
- **AI-012 P1** — forces et écarts reposent sur les données disponibles.
- **AI-013 P1** — absence de données produit des réserves explicites.
- **AI-014 P1** — citations/sources d’entreprise reliées aux bons contenus si fonction présente.
- **AI-015 P1** — résultat Serper mutualisé ne contient aucune donnée candidat.
- **AI-016 P0** — quota décrémenté une seule fois par opération logique.
- **AI-017 P0** — annulation avant appel facturable suit la règle prévue.
- **AI-018 P1** — modèle de secours utilisé uniquement selon configuration.
- **AI-019 P1** — changement de fournisseur conserve le schéma contractuel.
- **AI-020 P1** — version du modèle et du prompt traçables sans exposer le prompt au client.
- **AI-021 P1** — test de non-régression sur corpus synthétique Communication.
- **AI-022 P1** — test de non-régression sur corpus synthétique DSI.
- **AI-023 P1** — corpus cadre dirigeant et corpus profil junior distingués.
- **AI-024 P1** — réponses en français correct et rubriques attendues.
- **AI-025 P0** — aucune donnée candidat utilisée pour un autre utilisateur.

### 7.8 Quotas et compteurs

- **QUOTA-001 P0** — compteur initial conforme à l’offre.
- **QUOTA-002 P0** — consommation normale atomique.
- **QUOTA-003 P0** — dernière unité disponible acceptée.
- **QUOTA-004 P0** — unité suivante refusée sans valeur négative.
- **QUOTA-005 P0** — deux requêtes concurrentes sur dernière unité : une seule réussit.
- **QUOTA-006 P0** — double clic consomme une seule fois.
- **QUOTA-007 P0** — retry réseau consomme une seule fois.
- **QUOTA-008 P0** — échec non facturable libère la réservation.
- **QUOTA-009 P0** — succès après retry consomme une seule réservation.
- **QUOTA-010 P0** — renouvellement mensuel exécuté une seule fois.
- **QUOTA-011 P0** — changement d’heure/fuseau n’avance pas le renouvellement.
- **QUOTA-012 P0** — plafond de report appliqué selon règle.
- **QUOTA-013 P1** — analyses perdues au-delà du plafond expliquées correctement.
- **QUOTA-014 P0** — recharge ajoutée au bon compte après paiement confirmé.
- **QUOTA-015 P0** — remboursement/annulation suit la règle métier.
- **QUOTA-016 P0** — frontend ne peut jamais imposer directement un nouveau compteur.
- **QUOTA-017 P0** — administrateur ou script respecte une piste d’audit.
- **QUOTA-018 P1** — affichage du compteur converge après plusieurs onglets.
- **QUOTA-019 P0** — archivage/suppression ne recrédite pas abusivement une candidature.
- **QUOTA-020 P0** — conversion Exploration comptée une seule fois.

### 7.9 Stripe et abonnement

- **PAY-001 P0** — produit/prix attendu sélectionné côté backend.
- **PAY-002 P0** — frontend ne peut modifier montant, devise ou droits.
- **PAY-003 P0** — Checkout réussi ne suffit pas sans événement backend valide.
- **PAY-004 P0** — signature webhook vérifiée.
- **PAY-005 P0** — webhook sans signature ou altéré refusé.
- **PAY-006 P0** — événement déjà traité ignoré idempotemment.
- **PAY-007 P0** — événements reçus dans le désordre convergent correctement.
- **PAY-008 P0** — paiement refusé sans droits premium.
- **PAY-009 P0** — paiement nécessitant authentification traité.
- **PAY-010 P0** — abandon Checkout ne modifie pas les droits.
- **PAY-011 P0** — abonnement actif attribué au bon utilisateur/customer.
- **PAY-012 P0** — renouvellement crédite une seule période.
- **PAY-013 P0** — facture impayée applique la période de grâce décidée.
- **PAY-014 P0** — résiliation fin de période conserve puis retire les bons droits.
- **PAY-015 P0** — résiliation immédiate si supportée cohérente.
- **PAY-016 P0** — reprise d’abonnement sans doublon customer.
- **PAY-017 P0** — changement d’offre/prorata si fonction présente.
- **PAY-018 P0** — remboursement et litige suivent une règle explicite.
- **PAY-019 P0** — mode test et mode live impossibles à mélanger.
- **PAY-020 P0** — clés Stripe absentes des logs et du frontend.
- **PAY-021 P1** — portail client accessible uniquement au propriétaire.
- **PAY-022 P1** — Test Clock simule renouvellement et impayé.
- **PAY-023 P0** — panne webhook récupérée par retry/réconciliation.
- **PAY-024 P0** — tâche de réconciliation détecte divergence Stripe/base.
- **PAY-025 P0** — suppression de compte respecte obligations comptables sans maintenir d’accès applicatif.

### 7.10 Autorisations, sécurité et confidentialité

- **SEC-001 P0** — chaque route privée exige authentification.
- **SEC-002 P0** — contrôle d’appartenance effectué côté backend.
- **SEC-003 P0** — IDOR testé sur candidatures.
- **SEC-004 P0** — IDOR testé sur analyses/jobs.
- **SEC-005 P0** — IDOR testé sur CV/fichiers.
- **SEC-006 P0** — IDOR testé sur factures/portail.
- **SEC-007 P0** — UUID valides d’un tiers ne révèlent aucune existence utile.
- **SEC-008 P0** — CORS limité aux origines nécessaires.
- **SEC-009 P0** — cookies avec attributs attendus en production.
- **SEC-010 P0** — CSRF traité selon mode d’authentification.
- **SEC-011 P0** — injections SQL neutralisées par accès paramétré.
- **SEC-012 P0** — XSS stockée et réfléchie neutralisée.
- **SEC-013 P0** — SSRF via URL/source/recherche empêchée si applicable.
- **SEC-014 P0** — upload exécutable ou polyglotte refusé.
- **SEC-015 P0** — rate limiting sur auth, IA, upload et endpoints coûteux.
- **SEC-016 P0** — erreurs ne révèlent ni stack ni secrets en production.
- **SEC-017 P0** — dépendances vulnérables critiques bloquent la livraison selon politique.
- **SEC-018 P0** — scan de secrets sur commits.
- **SEC-019 P0** — séparation stricte des secrets staging/prod.
- **SEC-020 P0** — conteneurs/services internes non publiés inutilement.
- **SEC-021 P1** — en-têtes de sécurité vérifiés.
- **SEC-022 P1** — politique de cache empêche la mise en cache de pages privées.
- **SEC-023 P0** — URL signée de fichier expire et reste liée au bon objet.
- **SEC-024 P0** — données sensibles masquées dans observabilité et traces.
- **SEC-025 P1** — audit log des actions sensibles sans contenu excessif.

### 7.11 Résilience, concurrence et performance

- **RES-001 P0** — backend indisponible : frontend affiche une reprise possible.
- **RES-002 P1** — réseau lent ne déclenche pas de soumission multiple.
- **RES-003 P0** — timeout client ne signifie pas automatiquement échec serveur.
- **RES-004 P0** — redémarrage backend conserve l’état persistant.
- **RES-005 P0** — redémarrage worker récupère les jobs.
- **RES-006 P0** — PostgreSQL indisponible échoue sans corruption.
- **RES-007 P1** — pool de connexions saturé revient à la normale.
- **RES-008 P1** — panne Serper ne bloque pas les modules indépendants.
- **RES-009 P1** — panne IA ne bloque pas la consultation des résultats existants.
- **RES-010 P0** — deux onglets concurrents ne violent pas quotas/révisions.
- **RES-011 P1** — file de jobs applique une limite et une pression arrière.
- **RES-012 P1** — job bloqué détecté par timeout/heartbeat.
- **RES-013 P1** — très longue annonce respecte limites de taille et durée.
- **RES-014 P1** — tableau de bord avec volume réaliste reste sous budget performance défini.
- **RES-015 P1** — pagination/chargement évite de récupérer toutes les données.
- **RES-016 P0** — sauvegarde PostgreSQL réalisable.
- **RES-017 P0** — restauration de sauvegarde testée sur environnement isolé.
- **RES-018 P0** — migrations aller testées sur copie représentative.
- **RES-019 P0** — procédure de rollback ou roll-forward documentée.
- **RES-020 P1** — métriques et alertes détectent taux d’échec anormal.

### 7.12 RGPD et cycle de vie des données

- **RGPD-001 P0** — politique de confidentialité accessible.
- **RGPD-002 P1** — consentements nécessaires datés/versionnés si applicables.
- **RGPD-003 P0** — suppression de compte exige authentification récente ou confirmation forte.
- **RGPD-004 P0** — suppression retire l’accès immédiatement.
- **RGPD-005 P0** — données applicatives supprimées/anonymisées selon politique.
- **RGPD-006 P0** — fichiers CV supprimés des stockages actifs.
- **RGPD-007 P1** — sauvegardes suivent la politique de rétention documentée.
- **RGPD-008 P0** — données comptables obligatoires séparées des données applicatives.
- **RGPD-009 P0** — export éventuel ne contient que les données du demandeur.
- **RGPD-010 P1** — rectification du profil propagée aux vues pertinentes.
- **RGPD-011 P1** — durée de conservation des brouillons/archives appliquée.
- **RGPD-012 P0** — suppression pendant job empêche la réapparition des données.
- **RGPD-013 P0** — sous-traitants IA/recherche ne reçoivent que le minimum nécessaire.
- **RGPD-014 P1** — logs et analytics respectent minimisation/rétention.
- **RGPD-015 P0** — environnement staging dépourvu de données réelles non autorisées.

### 7.13 Interface, navigateurs et accessibilité

- **UI-001 P1** — parcours P0 sous Chromium desktop.
- **UI-002 P1** — parcours P0 sous Firefox desktop.
- **UI-003 P1** — parcours P0 sous WebKit.
- **UI-004 P1** — parcours principal sur viewport mobile.
- **UI-005 P1** — aucun bouton essentiel hors écran ou masqué.
- **UI-006 P1** — navigation complète au clavier.
- **UI-007 P1** — focus visible et logique dans modales.
- **UI-008 P1** — champs associés à des labels.
- **UI-009 P1** — erreurs annoncées et liées au champ concerné.
- **UI-010 P1** — progression de tâche annoncée sans spam lecteur d’écran.
- **UI-011 P1** — contrastes principaux conformes au seuil choisi.
- **UI-012 P1** — une structure de titres cohérente par page.
- **UI-013 P1** — boutons désactivés distinguables et expliqués.
- **UI-014 P2** — zoom 200 % sans perte fonctionnelle majeure.
- **UI-015 P1** — langue française et formats date/nombre cohérents.

### 7.14 Déploiement et exploitation

- **OPS-001 P0** — build frontend/backend reproductible.
- **OPS-002 P0** — variables obligatoires vérifiées au démarrage.
- **OPS-003 P0** — aucune valeur de staging en production et inversement.
- **OPS-004 P0** — migration exécutée une seule fois de manière contrôlée.
- **OPS-005 P0** — healthcheck distinct de readiness si nécessaire.
- **OPS-006 P0** — déploiement incomplet ne reçoit pas le trafic prématurément.
- **OPS-007 P0** — smoke test après déploiement.
- **OPS-008 P0** — rollback/roll-forward ne corrompt pas jobs et schéma.
- **OPS-009 P1** — images Docker scannées et versions épinglées selon politique.
- **OPS-010 P1** — logs corrélables par request/job sans PII.
- **OPS-011 P1** — alertes sur erreurs 5xx, jobs bloqués et webhooks en échec.
- **OPS-012 P0** — sauvegarde programmée et restauration périodiquement vérifiée.
- **OPS-013 P0** — domaine, TLS et redirections HTTPS vérifiés.
- **OPS-014 P1** — cache/CDN ne sert pas de contenu privé à un autre utilisateur.
- **OPS-015 P0** — déploiement production conditionné au succès des tests P0.

---

## 8. Tests particuliers de la page 3 à implémenter au niveau API

Les scénarios suivants doivent exister indépendamment de Playwright afin de vérifier les invariants métier :

1. soumettre deux fois la même payload avec la même idempotency key ;
2. soumettre simultanément deux payloads identiques avec deux connexions ;
3. perdre artificiellement la réponse après commit puis rejouer ;
4. modifier la candidature pendant `RUNNING` ;
5. terminer l’ancien job après le nouveau ;
6. supprimer la candidature pendant `RUNNING` ;
7. épuiser le quota entre réservation et démarrage ;
8. faire échouer Serper puis réussir l’IA ;
9. réussir Serper puis faire échouer l’IA ;
10. faire retourner un JSON invalide par l’IA ;
11. arrêter le worker après réservation mais avant appel externe ;
12. arrêter le worker après appel externe mais avant persistance ;
13. rejouer le même message de file ;
14. simuler un job bloqué au-delà du timeout ;
15. tenter de consulter, relancer ou annuler le job avec un autre compte.

Pour chaque scénario, vérifier simultanément : état du job, résultat courant, historique de révision, réservation/débit, compteur utilisateur et absence de doublon.

---

## 9. Données de test minimales

Créer des fixtures synthétiques versionnées :

- deux utilisateurs standards A et B ;
- un utilisateur sans abonnement et un utilisateur abonné ;
- un profil Communication ;
- un profil DSI ;
- un CV cadre dirigeant ;
- un CV junior ;
- un CV vide/corrompu ;
- une annonce normale ;
- une annonce très longue ;
- une annonce contenant HTML/XSS ;
- une annonce contenant prompt injection ;
- deux entreprises homonymes ;
- deux postes dans une même entreprise ;
- un projet Exploration Communication ;
- un projet Exploration DSI ;
- comptes aux limites 0/1/4/5/6 candidatures ;
- compte avec 0/1/149/150/200 analyses selon configuration ;
- événements Stripe succès, échec, doublon et désordre.

Les fixtures doivent être réinitialisables, isolées par test et sans dépendance à l’ordre d’exécution.

---

## 10. Organisation CI/CD attendue

### Pull request — cible inférieure à 10 minutes

- lint et type checking ;
- tests unitaires ;
- tests API principaux ;
- migrations sur base vide ;
- scan secrets/dépendances ;
- smoke tests Playwright P0 sélectionnés ;
- services externes simulés.

### Fusion vers branche principale

- totalité unit/API ;
- tous les E2E P0 ;
- Chromium systématique ;
- rapports et traces sur échec.

### Après déploiement staging

- E2E P0 et P1 ;
- Chromium, Firefox et WebKit ;
- tests mobile ;
- Stripe test ;
- tests contractuels externes limités ;
- vérification de la reprise des jobs de fond.

### Workflow nocturne

- catalogue automatisé complet ;
- sécurité dynamique autorisée sur staging ;
- concurrence et limites ;
- accessibilité ;
- performance légère ;
- scénarios exploratoires générés par agent ;
- aucune action destructive hors comptes de test dédiés.

---

## 11. Critères GO / NO GO

### NO GO automatique

- un test P0 échoue ;
- accès possible aux données d’un autre utilisateur ;
- double consommation ou contournement de quota ;
- résultat d’une ancienne révision affiché comme courant ;
- double candidature créée par répétition technique ;
- paiement et droits applicatifs divergents ;
- webhook non authentifié accepté ;
- perte de données, migration non maîtrisée ou restauration non vérifiée ;
- prompt injection capable de modifier le comportement système ;
- tâche de fond perdue silencieusement ;
- suppression de compte incomplète sur les données actives.

### GO conditionnel

- 100 % des P0 passent ;
- aucun défaut de sécurité critique/élevé connu ;
- taux de réussite P1 supérieur au seuil défini, avec dérogations documentées ;
- workflows staging reproductibles ;
- métriques et alertes de base opérationnelles ;
- procédure de rollback/roll-forward documentée ;
- limitations connues présentées honnêtement à l’utilisateur.

---

## 12. Méthode d’extension du catalogue par l’IA

Après analyse du dépôt, pour chaque page, endpoint et état, générer les variantes :

1. chemin nominal ;
2. entrée absente ;
3. entrée invalide ;
4. valeur minimale/maximale ;
5. utilisateur non authentifié ;
6. utilisateur authentifié mais non propriétaire ;
7. double soumission ;
8. concurrence entre deux requêtes ;
9. timeout avant commit ;
10. timeout après commit ;
11. service externe indisponible ;
12. reprise après redémarrage ;
13. modification de la donnée pendant le traitement ;
14. suppression pendant le traitement ;
15. affichage mobile et accessibilité si interface concernée.

Dédupliquer les scénarios réellement équivalents, mais ne pas supprimer une variante qui teste un invariant distinct. Toute anomalie détectée en production ou staging doit créer un test de non-régression avant correction.

---

## 13. Instruction finale à l’IA développeuse

Ne commence pas par écrire 200 tests Playwright. Commence par cartographier le produit et les invariants, puis place chaque contrôle au niveau le plus bas et le plus rapide : unité, API, intégration, contrat ou E2E.

La priorité fonctionnelle absolue est la suivante :

1. aucune perte, duplication ou incohérence lors du clic `Suivant` page 3 ;
2. aucune confusion entre ancienne candidature, nouvelle candidature et nouvelle révision ;
3. fonctionnement utile et honnête pour un candidat ne disposant encore que d’un domaine d’emploi ;
4. aucune fuite de données entre comptes ;
5. aucune consommation multiple ou activation payante frauduleuse ;
6. reprise propre après timeout, panne de service ou redéploiement.

Avant de déclarer la tâche terminée, fournir :

- le nombre de scénarios recensés ;
- le nombre automatisé par niveau ;
- la liste des scénarios non automatisables et leur justification ;
- les durées mesurées des workflows ;
- les défauts découverts et corrigés ;
- les risques résiduels ;
- une décision GO/NO GO argumentée.
