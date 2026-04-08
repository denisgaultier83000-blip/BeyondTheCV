# Étape 1 : Construction (Build) de l'application React avec Vite
FROM node:20-alpine AS build
WORKDIR /app

# Copie des dépendances et installation
COPY package*.json ./
RUN npm install

# Copie du code source et compilation (nécessite le .env pour VITE_API_URL)
COPY . .

# [FIX DE L'EXPERT] On grave la variable dans l'OS du conteneur (Priorité absolue pour Vite)
ENV VITE_API_URL=https://beyondthecv-backend-service-746792482004.europe-west1.run.app

RUN npm run build

# Étape 2 : Serveur Web de Production (Nginx)
FROM nginx:alpine

# Copie des fichiers ultra-légers compilés depuis l'étape 1
COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run utilise le port 8080 par défaut
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]