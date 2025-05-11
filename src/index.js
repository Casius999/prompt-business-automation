/**
 * Système d'automatisation de vente de prompts IA
 * -------------------------------------------------
 * Ce système permet d'automatiser à 100% la gestion, l'optimisation et la vente
 * de prompts IA sur des plateformes comme SnackPrompt.
 */

// Importation des dépendances
require('dotenv').config({ path: './config/.env' });
const express = require('express');
const cron = require('node-cron');
const { initializeDatabase } = require('./database');
const { registerWebhooks } = require('./webhooks');
const { setupErrorHandling } = require('./utils/errors');
const { setupLogging } = require('./utils/logging');
const { sendNotification } = require('./utils/notifications');

// Importation des modules principaux
const SnackPromptAPI = require('./api/snackprompt-api');
const PromptManager = require('./core/prompt-manager');
const OptimizationEngine = require('./core/optimization-engine');
const AnalyticsService = require('./services/analytics-service');
const CustomerService = require('./services/customer-service');
const PromptGenerator = require('./services/prompt-generator');
const PromotionService = require('./services/promotion-service');

// Variables globales
let isSystemInitialized = false;
let api;
let promptManager;
let optimizationEngine;
let analyticsService;
let customerService;
let promptGenerator;
let promotionService;

/**
 * Initialisation des services principaux
 */
async function initializeServices() {
  try {
    console.log('Initialisation des services...');
    
    // Initialisation de la base de données
    await initializeDatabase();
    
    // Initialisation de l'API SnackPrompt
    api = new SnackPromptAPI({
      apiKey: process.env.SNACKPROMPT_API_KEY,
      secretKey: process.env.SNACKPROMPT_SECRET_KEY
    });
    
    // Initialisation des services principaux
    promptManager = new PromptManager(api);
    analyticsService = new AnalyticsService(api);
    optimizationEngine = new OptimizationEngine(api, analyticsService);
    customerService = new CustomerService(api);
    promptGenerator = new PromptGenerator(api);
    promotionService = new PromotionService(api, analyticsService);
    
    console.log('Services initialisés avec succès');
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des services:', error);
    await sendNotification({
      type: 'error',
      subject: 'Erreur d\'initialisation',
      message: `Le système n'a pas pu initialiser les services: ${error.message}`
    });
    return false;
  }
}

/**
 * Configuration des tâches planifiées
 */
function setupScheduledTasks() {
  console.log('Configuration des tâches planifiées...');
  
  // Analyse horaire - Toutes les heures
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('Exécution de l\'analyse horaire...');
      const stats = await analyticsService.getPromptStats();
      await optimizationEngine.hourlyOptimization(stats);
    } catch (error) {
      console.error('Erreur lors de l\'analyse horaire:', error);
    }
  });
  
  // Optimisation quotidienne - Tous les jours à 3h du matin
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('Exécution de l\'optimisation quotidienne...');
      const allData = await analyticsService.getDetailedAnalytics();
      await optimizationEngine.dailyOptimization(allData);
    } catch (error) {
      console.error('Erreur lors de l\'optimisation quotidienne:', error);
    }
  });
  
  // Refonte hebdomadaire - Chaque lundi à 2h du matin
  cron.schedule('0 2 * * 1', async () => {
    try {
      console.log('Exécution de la refonte hebdomadaire...');
      await optimizationEngine.weeklyRenovation();
    } catch (error) {
      console.error('Erreur lors de la refonte hebdomadaire:', error);
    }
  });
  
  // Génération de nouveaux prompts - Chaque mercredi à 1h du matin
  cron.schedule('0 1 * * 3', async () => {
    try {
      console.log('Génération de nouveaux prompts...');
      await promptGenerator.generateNewPrompts();
    } catch (error) {
      console.error('Erreur lors de la génération de nouveaux prompts:', error);
    }
  });
  
  // Planification des promotions - Chaque dimanche à 22h
  cron.schedule('0 22 * * 0', async () => {
    try {
      console.log('Planification des promotions dynamiques...');
      await promotionService.setupDynamicPromotions();
    } catch (error) {
      console.error('Erreur lors de la planification des promotions:', error);
    }
  });
  
  // Rapports hebdomadaires - Chaque dimanche à 8h du matin
  cron.schedule('0 8 * * 0', async () => {
    try {
      console.log('Génération du rapport hebdomadaire...');
      const report = await analyticsService.generateWeeklyReport();
      await sendNotification({
        type: 'report',
        subject: 'Rapport hebdomadaire',
        message: 'Veuillez trouver ci-joint le rapport hebdomadaire',
        attachment: report
      });
    } catch (error) {
      console.error('Erreur lors de la génération du rapport hebdomadaire:', error);
    }
  });
  
  console.log('Tâches planifiées configurées avec succès');
}

/**
 * Configuration des webhooks
 */
function setupWebhooks(app) {
  console.log('Configuration des webhooks...');
  
  app.post('/webhooks/customer-question', async (req, res) => {
    try {
      await customerService.handleCustomerQuestion(req.body);
      res.status(200).send('Question traitée avec succès');
    } catch (error) {
      console.error('Erreur lors du traitement de la question client:', error);
      res.status(500).send('Erreur lors du traitement de la question');
    }
  });
  
  app.post('/webhooks/refund-request', async (req, res) => {
    try {
      await customerService.handleRefundRequest(req.body);
      res.status(200).send('Demande de remboursement traitée avec succès');
    } catch (error) {
      console.error('Erreur lors du traitement de la demande de remboursement:', error);
      res.status(500).send('Erreur lors du traitement de la demande');
    }
  });
  
  app.post('/webhooks/sale-completed', async (req, res) => {
    try {
      await promptManager.handleSaleCompleted(req.body);
      res.status(200).send('Vente traitée avec succès');
    } catch (error) {
      console.error('Erreur lors du traitement de la vente:', error);
      res.status(500).send('Erreur lors du traitement de la vente');
    }
  });
  
  console.log('Webhooks configurés avec succès');
}

/**
 * Configuration du serveur Express
 */
function setupExpressServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  // Middlewares
  app.use(express.json());
  setupLogging(app);
  
  // Routes de base
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      initialized: isSystemInitialized,
      timestamp: new Date().toISOString()
    });
  });
  
  app.get('/stats', async (req, res) => {
    try {
      if (!isSystemInitialized) {
        return res.status(503).json({ error: 'System not initialized yet' });
      }
      
      const stats = await analyticsService.getSystemStats();
      res.status(200).json(stats);
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({ error: 'Could not retrieve stats' });
    }
  });
  
  // Configuration des webhooks
  setupWebhooks(app);
  
  // Démarrage du serveur
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
  });
  
  return app;
}

/**
 * Fonction principale de démarrage du système
 */
async function startSystem() {
  try {
    console.log('Démarrage du système d\'automatisation de vente de prompts...');
    
    // Initialisation des services
    const servicesInitialized = await initializeServices();
    if (!servicesInitialized) {
      console.error('Échec de l\'initialisation des services. Redémarrage dans 5 minutes...');
      setTimeout(startSystem, 5 * 60 * 1000);
      return;
    }
    
    // Configuration du serveur Express
    const app = setupExpressServer();
    
    // Configuration de la gestion des erreurs
    setupErrorHandling(app);
    
    // Configuration des tâches planifiées
    setupScheduledTasks();
    
    // Publication initiale des prompts si nécessaire
    const promptsExist = await promptManager.checkExistingPrompts();
    if (!promptsExist) {
      console.log('Aucun prompt existant détecté. Publication des prompts initiaux...');
      await promptManager.publishInitialPrompts();
    }
    
    isSystemInitialized = true;
    console.log('Système d\'automatisation démarré avec succès');
    
    await sendNotification({
      type: 'info',
      subject: 'Système démarré',
      message: 'Le système d\'automatisation de vente de prompts a démarré avec succès.'
    });
  } catch (error) {
    console.error('Erreur fatale lors du démarrage du système:', error);
    await sendNotification({
      type: 'error',
      subject: 'Erreur fatale',
      message: `Une erreur fatale est survenue lors du démarrage: ${error.message}`
    });
    
    // Redémarrage après 5 minutes
    console.log('Tentative de redémarrage dans 5 minutes...');
    setTimeout(startSystem, 5 * 60 * 1000);
  }
}

// Démarrage du système
startSystem();