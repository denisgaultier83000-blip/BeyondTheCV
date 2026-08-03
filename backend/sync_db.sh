#!/bin/bash

# Script pour synchroniser la base de données distante (VPS) vers l'environnement local.
# Utilisation : ./sync_db.sh <environnement>
# Exemple   : ./sync_db.sh staging

set -e # Arrête le script si une commande échoue

TARGET_ENV=$1
if [ -z "$TARGET_ENV" ]; then
  echo "❌ Erreur : Veuillez spécifier l'environnement cible (staging ou production)."
  echo "   Usage: $0 staging"
  exit 1
fi

DUMP_FILE="vps_dump_$(date +%Y%m%d_%H%M%S).sql"

# --- Étape 1: Vérification des prérequis ---
echo "🔍 Vérification des prérequis..."
if ! command -v docker &> /dev/null; then echo "❌ Docker n'est pas installé."; exit 1; fi
if ! command -v scp &> /dev/null; then echo "❌ SCP n'est pas installé."; exit 1; fi
if [ ! -f ".env" ]; then echo "❌ Fichier .env local introuvable."; exit 1; fi

# [FIX] Remplacement de xargs par une méthode plus sûre qui gère les caractères spéciaux.
# 'set -o allexport' demande au shell d'exporter toutes les variables définies dans le fichier sourcé.
set -o allexport
source .env
set +o allexport

if [ -z "$VPS_HOST" ] || [ -z "$VPS_USER" ]; then
    echo "❌ Les variables VPS_HOST et VPS_USER doivent être définies dans votre fichier .env local."
    exit 1
fi

# [FIX] Nettoyage explicite des variables pour supprimer les caractères de fin de ligne Windows (\r)
VPS_HOST=$(echo "$VPS_HOST" | tr -d '\r')
VPS_USER=$(echo "$VPS_USER" | tr -d '\r')

echo "✅ Prérequis validés."

# --- Étape 2: Confirmation ---
echo -e "\n🔥 Restauration de la base de données distante sur votre environnement local. Attention, votre base de données locale va être écrasée."

read -p "Êtes-vous sûr de vouloir continuer ? (o/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "🛑 Opération annulée."
    exit 1
fi

# --- Étape 3: Exportation depuis le VPS ---
APP_DIR="/app/beyondthecv-$TARGET_ENV"
echo -e "\n📦 Exportation de la base de données depuis l'environnement '$TARGET_ENV' sur le VPS..."

ssh "$VPS_USER@$VPS_HOST" "
    set -e
    cd $APP_DIR
    source .env

    COMPOSE_FILE=\"docker-compose.$TARGET_ENV.yml\"
    PROJECT_NAME=\"btcv-$TARGET_ENV\"
    DB_NAME_SUFFIX=\"_${TARGET_ENV}\"
    
    echo '   - Lancement de pg_dump sur le VPS...'
    docker compose -p \$PROJECT_NAME -f \$COMPOSE_FILE exec -T db pg_dump -U \$POSTGRES_USER -d \${POSTGRES_DB}\$DB_NAME_SUFFIX > $DUMP_FILE
"
echo "✅ Exportation sur le VPS terminée."

# --- Étape 4: Téléchargement du dump ---
echo -e "\n🚚 Téléchargement de $DUMP_FILE depuis $VPS_HOST..."
scp "$VPS_USER@$VPS_HOST:$APP_DIR/$DUMP_FILE" .
echo "✅ Téléchargement terminé."

# --- Étape 5: Nettoyage sur le VPS ---
ssh "$VPS_USER@$VPS_HOST" "rm $APP_DIR/$DUMP_FILE"
echo "🗑️ Fichier de dump temporaire nettoyé sur le VPS."

# --- Étape 6: Restauration en local ---
echo -e "\n🔥 Restauration sur la base de données locale ($POSTGRES_DB)..."
docker compose up -d db # S'assure que le service DB local est démarré

echo "   - Suppression de la base de données locale..."
docker compose exec -T db dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB"
echo "   - Création d'une base de données vide..."
docker compose exec -T db createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
echo "   - Importation des données..."
cat "$DUMP_FILE" | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
echo "✅ Restauration locale terminée."

# --- Étape 7: Nettoyage local ---
rm "$DUMP_FILE"
echo "🗑️ Fichier de dump local nettoyé."
echo -e "\n🎉 Synchronisation terminée avec succès !"
