# Étape 1 : Construction (Build) de l'application React avec Vite
FROM node:20-alpine AS build
WORKDIR /app

# Copie des dépendances et installation
COPY package*.json ./
RUN npm install

# Copie du code source et compilation (nécessite le .env pour VITE_API_URL)
COPY . .

# Si aucune valeur n'est passée, il utilisera l'URL par défaut (pratique pour le dev local)
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Étape 2 : Serveur Web de Production (Nginx)
FROM nginx:alpine

# Copie des fichiers ultra-légers compilés depuis l'étape 1
COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# [FIX] On remet le port standard 80 pour Nginx sur un VPS classique
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]