FROM node:18-alpine

# Création du répertoire de l'application
WORKDIR /usr/src/app

# Installation des dépendances
COPY package*.json ./
RUN npm ci --only=production

# Copie des fichiers du projet
COPY . .

# Création d'un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs && \
    chown -R nodejs:nodejs /usr/src/app
USER nodejs

# Exposition du port
EXPOSE 3000

# Commande pour démarrer l'application
CMD ["node", "src/index.js"]