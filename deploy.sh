#!/bin/bash

# Script de déploiement pour le système d'automatisation de vente de prompts IA
# Ce script permet de déployer l'application en production

set -e  # Quitter immédiatement en cas d'erreur

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}┌──────────────────────────────────────────────┐${NC}"
echo -e "${YELLOW}│ Déploiement du système d'automatisation      │${NC}"
echo -e "${YELLOW}│ de vente de prompts IA                       │${NC}"
echo -e "${YELLOW}└──────────────────────────────────────────────┘${NC}"

# Vérification des prérequis
echo -e "\n${GREEN}Vérification des prérequis...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker n'est pas installé. Veuillez l'installer avant de continuer.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose n'est pas installé. Veuillez l'installer avant de continuer.${NC}"
    exit 1
fi

# Vérification de la présence des fichiers nécessaires
echo -e "\n${GREEN}Vérification des fichiers de configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}Le fichier .env est manquant. Veuillez le créer avant de continuer.${NC}"
    exit 1
fi

# Création des dossiers requis
echo -e "\n${GREEN}Création des dossiers nécessaires...${NC}"
mkdir -p nginx/ssl
mkdir -p logs

# Génération de certificats auto-signés si nécessaire
if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    echo -e "\n${GREEN}Génération de certificats SSL auto-signés...${NC}"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
        -subj "/C=FR/ST=Paris/L=Paris/O=Organisation/OU=IT/CN=prompt-business-automation.local"
fi

# Arrêt des conteneurs existants (s'ils existent)
echo -e "\n${GREEN}Arrêt des conteneurs existants...${NC}"
docker-compose down --remove-orphans || true

# Construction et démarrage des conteneurs
echo -e "\n${GREEN}Construction et démarrage des conteneurs...${NC}"
docker-compose build --no-cache
docker-compose up -d

# Vérification du statut
echo -e "\n${GREEN}Vérification du statut des services...${NC}"
sleep 5
docker-compose ps

# Affichage des logs
echo -e "\n${GREEN}Affichage des logs initiaux...${NC}"
docker-compose logs --tail=20 app

echo -e "\n${GREEN}Déploiement terminé avec succès !${NC}"
echo -e "${GREEN}L'application est accessible à l'adresse : https://localhost${NC}"