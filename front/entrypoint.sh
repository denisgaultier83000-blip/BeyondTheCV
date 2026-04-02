#!/bin/sh
# Ce script est exécuté au démarrage du conteneur, avant la commande principale.

# 'set -e' garantit que le script s'arrêtera immédiatement si une commande échoue.
set -e

# On remplace le placeholder dans le fichier de configuration Nginx.
# La variable $PORT est fournie par l'environnement (soit par Cloud Run, soit par le Dockerfile).
sed -i "s/PORT_PLACEHOLDER/$PORT/g" /etc/nginx/conf.d/default.conf

# 'exec "$@"' exécute ensuite la commande passée en CMD dans le Dockerfile.
# Cela permet de lancer Nginx après que la configuration ait été modifiée.
exec "$@"