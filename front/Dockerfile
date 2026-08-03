# Étape 1 : Construction (Build) de l'application React avec Vite
FROM node:20-alpine AS build
WORKDIR /app

# On déclare l'argument pour VITE_API_URL
ARG VITE_API_URL
# On l'expose comme variable d'environnement pour que Vite le lise
ENV VITE_API_URL=${VITE_API_URL}

# Copie des dépendances et installation
COPY package*.json ./
RUN npm install

# Copie du code source et compilation (VITE_API_URL est maintenant disponible)
COPY . .

RUN npm run build

# Étape 2 : Serveur Web de Production (Nginx)
FROM nginx:alpine

# Copie des fichiers ultra-légers compilés depuis l'étape 1
COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# On remet le port standard 80 pour Nginx
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]