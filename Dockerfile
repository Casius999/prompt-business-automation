FROM node:18-alpine

# Création du répertoire de l'application
WORKDIR /usr/src/app

# Copie des fichiers package.json et package-lock.json
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie du reste des fichiers du projet
COPY . .

# Création du répertoire .env s'il n'existe pas déjà
RUN mkdir -p config

# Exposition du port
EXPOSE 3000

# Démarrage de l'application
CMD ["npm", "start"]