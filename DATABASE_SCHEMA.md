# PostgreSQL Database Schema - BeyondTheCV

## Overview

La base de données PostgreSQL est structurée pour gérer les utilisateurs, leurs produits générés, les évaluations des clients, et les gestions d'abonnements.

## Tables

### 1. **users** - Gestion des utilisateurs

Stocke les informations de l'utilisateur avec gestion d'abonnement intégrée.

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_premium BOOLEAN DEFAULT FALSE,
    subscription_status ENUM ('active', 'expired', 'extended') DEFAULT 'active',
    subscription_start_date TIMESTAMP,
    subscription_expiration_date TIMESTAMP,
    subscription_extension_count INTEGER DEFAULT 0,
    last_extension_date TIMESTAMP,
    deleted_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
)
```

#### Champs clés:
- **subscription_status**: État de l'abonnement
- **subscription_expiration_date**: Date d'expiration (défaut: 90 jours après création)
- **subscription_extension_count**: Nombre de fois que l'abonnement a été prolongé
- **last_extension_date**: Date de la dernière prolongation

---

### 2. **products** - Produits/Documents générés

Stocke tous les produits (CVs, rapports, etc.) générés par les utilisateurs.

```sql
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_type ENUM ('cv_ats', 'cv_human', 'report', 'document', 'other') NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT,
    file_size INTEGER,
    mime_type TEXT,
    title TEXT,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    downloaded_count INTEGER DEFAULT 0,
    printed_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP,
    last_printed_at TIMESTAMP,
    is_archived BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
)
```

#### Champs clés:
- **product_type**: Type de produit (CV ATS, CV humain, rapport, document, autre)
- **downloaded_count**: Nombre de téléchargements
- **printed_count**: Nombre d'impressions
- **metadata**: Données JSON additionnelles (ex: version, options utilisées)

#### Utilisation Web:
- Vue liste: Afficher les produits de l'utilisateur
- Boutons: **Télécharger** (incremente `downloaded_count`), **Imprimer** (incremente `printed_count`)

---

### 3. **admin_evaluations** - Évaluations clients

Stocke les évaluations des clients par les administrateurs.

```sql
CREATE TABLE admin_evaluations (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    evaluator_name TEXT,
    evaluation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rating ENUM ('1_poor', '2_fair', '3_good', '4_very_good', '5_excellent'),
    overall_satisfaction_score INTEGER (1-5),
    quality_score INTEGER (1-5),
    usability_score INTEGER (1-5),
    feature_completeness_score INTEGER (1-5),
    comments TEXT,
    improvements_suggested TEXT,
    would_recommend BOOLEAN,
    tags TEXT[],
    internal_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

#### Champs clés:
- **rating**: Évaluation globale (1-5 stars)
- **quality_score, usability_score, feature_completeness_score**: Scores détaillés
- **tags**: Tags pour catégoriser (ex: ['ui_issue', 'feature_request', 'bug'])
- **would_recommend**: Recommandation du client

---

### 4. **subscription_plans** - Plans d'abonnement/prolongation

Définit les plans disponibles pour la prolongation d'abonnement.

```sql
CREATE TABLE subscription_plans (
    id TEXT PRIMARY KEY,
    plan_name TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    description TEXT,
    features JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

#### Plans par défaut:
- `plan_1_month`: 30 jours - $9.99
- `plan_3_months`: 90 jours - $24.99
- `plan_6_months`: 180 jours - $44.99
- `plan_1_year`: 365 jours - $79.99

---

### 5. **subscription_extensions** - Historique des prolongations

Enregistre chaque prolongation d'abonnement.

```sql
CREATE TABLE subscription_extensions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
    extension_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    new_expiration_date TIMESTAMP NOT NULL,
    price_paid_cents INTEGER,
    payment_status TEXT,
    transaction_id TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

---

### 6. **feedbacks** - Retours clients

Table pour les comments/feedback unstructuré des clients.

```sql
CREATE TABLE feedbacks (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature TEXT,
    feedback TEXT NOT NULL,
    reason TEXT,
    job_type TEXT,
    is_positive BOOLEAN,
    sentiment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

---

### 7. **tasks** - Tâches de fond

Suivi des tâches asynchrones (génération de CV, rapports, etc.).

```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    status TEXT,
    task_type TEXT,
    result TEXT,
    error_message TEXT,
    progress_percent INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    metadata JSONB
)
```

---

## API Endpoints

### Products

```bash
# Créer un produit
POST /api/products
{
  "user_id": "user123",
  "product_type": "cv_ats",
  "filename": "cv_john_doe.pdf",
  "title": "CV - John Doe",
  "description": "CV au format ATS"
}

# Liste des produits d'un utilisateur
GET /api/products/user/{user_id}?limit=100&offset=0

# Détails d'un produit
GET /api/products/{product_id}

# Enregistrer un téléchargement
POST /api/products/{product_id}/download

# Enregistrer une impression
POST /api/products/{product_id}/print

# Supprimer un produit
DELETE /api/products/{product_id}
```

### Evaluations

```bash
# Créer une évaluation
POST /api/evaluations
{
  "user_id": "user123",
  "product_id": "product456",
  "evaluator_name": "Admin",
  "rating": "5_excellent",
  "overall_satisfaction_score": 5,
  "quality_score": 5,
  "usability_score": 5,
  "feature_completeness_score": 4,
  "comments": "Excellent product!",
  "would_recommend": true,
  "tags": ["ui", "feature_complete"]
}

# Liste des évaluations d'un client
GET /api/evaluations/user/{user_id}

# Détails d'une évaluation
GET /api/evaluations/{evaluation_id}

# Statistiques globales
GET /api/evaluations-stats?time_period_days=30
```

### Subscriptions

```bash
# Détails de l'abonnement
GET /api/subscriptions/{user_id}

# Prolonger l'abonnement
POST /api/subscriptions/{user_id}/extend
{
  "plan_id": "plan_3_months",
  "price_paid_cents": 2499
}

# Vérifier les expirations (tâche admin)
POST /api/subscriptions/check-expiry
```

---

## Logique métier

### Cycle de vie de l'abonnement

1. **Création**: À l'inscription, l'utilisateur reçoit un essai gratuit de 3 mois
   - `subscription_status`: `'active'`
   - `subscription_expiration_date`: Date du jour + 90 jours

2. **Vérification d'expiration**: Exécution régulière
   ```python
   # Chaque heure/jour
   SubscriptionService.check_subscriptions_expiry()
   ```

3. **Prolongation**: L'utilisateur achète une plan
   ```python
   extension_id = SubscriptionService.extend_subscription(
       user_id="user123",
       plan_id="plan_3_months",
       price_paid_cents=2499,
       transaction_id="stripe_123"
   )
   ```

4. **Métrique**: Suivi des extensions
   - `subscription_extension_count`: Incrémenté à chaque prolongation
   - `last_extension_date`: Mis à jour

---

## Indexes pour Performance

```sql
CREATE INDEX idx_products_user_id ON products(user_id)
CREATE INDEX idx_products_created_at ON products(created_at)
CREATE INDEX idx_evaluations_user_id ON admin_evaluations(user_id)
CREATE INDEX idx_evaluations_product_id ON admin_evaluations(product_id)
CREATE INDEX idx_evaluations_date ON admin_evaluations(evaluation_date)
CREATE INDEX idx_users_email ON users(email)
CREATE INDEX idx_users_subscription_expiry ON users(subscription_expiration_date)
CREATE INDEX idx_tasks_user_id ON tasks(user_id)
```

---

## Migration depuis SQLite → PostgreSQL

Un script de migration est disponible: `backend/migrate_sqlite_to_pg.py`

```bash
# Avant de migrer, assurez-vous que PostgreSQL est démarré
docker compose up -d db

# Puis exécutez le script
python backend/migrate_sqlite_to_pg.py
```

---

## Notes importantes

1. **Soft delete**: Les produits/users sont soft-deletés (champ `deleted_at`)
2. **JSONB**: Le champ `metadata` utilise JSONB pour flexibilité
3. **Enums**: Utilise des types ENUM PostgreSQL pour validation
4. **Subscriptions**: Défaut 3 mois (90 jours)
5. **Téléchargements/Impressions**: Comptabilisés automatiquement via API

