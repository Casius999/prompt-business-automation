/**
 * Gestionnaire de prompts
 * -------------------------------------------------
 * Responsable de la gestion du cycle de vie des prompts
 */

const fs = require('fs').promises;
const path = require('path');
const { generatePromptImage } = require('../utils/image-generator');
const { formatForAPI } = require('../utils/formatters');
const { sendNotification } = require('../utils/notifications');

class PromptManager {
  /**
   * Initialise le gestionnaire de prompts
   * @param {Object} api - Instance de l'API SnackPrompt
   */
  constructor(api) {
    this.api = api;
    this.promptsPath = path.join(__dirname, '../../config/prompts-database.json');
    this.publishedPrompts = new Map(); // Map des prompts publiés (id -> détails)
  }

  /**
   * Charge les prompts depuis le fichier JSON
   * @returns {Promise<Array>} - Liste des prompts
   */
  async loadPrompts() {
    try {
      const data = await fs.readFile(this.promptsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erreur lors du chargement des prompts:', error.message);
      return [];
    }
  }

  /**
   * Vérifie si des prompts existent déjà sur la plateforme
   * @returns {Promise<boolean>} - true si des prompts existent
   */
  async checkExistingPrompts() {
    try {
      const prompts = await this.api.getPrompts();
      if (prompts && prompts.length > 0) {
        console.log(`${prompts.length} prompts existants trouvés sur la plateforme`);
        
        // Stocker les prompts existants dans la map
        prompts.forEach(prompt => {
          this.publishedPrompts.set(prompt.id, prompt);
        });
        
        return true;
      }
      
      console.log('Aucun prompt existant trouvé sur la plateforme');
      return false;
    } catch (error) {
      console.error('Erreur lors de la vérification des prompts existants:', error.message);
      return false;
    }
  }

  /**
   * Publie tous les prompts initiaux
   * @returns {Promise<Array>} - Liste des prompts publiés
   */
  async publishInitialPrompts() {
    try {
      const prompts = await this.loadPrompts();
      console.log(`Publication de ${prompts.length} prompts initiaux...`);
      
      const publishedPrompts = [];
      
      for (const [index, promptData] of prompts.entries()) {
        try {
          console.log(`Publication du prompt #${index + 1}: ${promptData.title}`);
          
          // Générer une image pour le prompt
          const imageUrl = await generatePromptImage(promptData.title, promptData.category);
          
          // Formater les données pour l'API
          const apiData = formatForAPI.prompt({
            title: promptData.title,
            description: promptData.description,
            prompt_text: promptData.content,
            price: promptData.suggestedPrice,
            category: promptData.category,
            tags: promptData.tags,
            image_url: imageUrl
          });
          
          // Publier le prompt
          const publishedPrompt = await this.api.createPrompt(apiData);
          publishedPrompts.push(publishedPrompt);
          
          // Stocker le prompt publié dans la map
          this.publishedPrompts.set(publishedPrompt.id, publishedPrompt);
          
          // Stocker les variations pour les tests A/B futurs
          await this.storePromptVariations(publishedPrompt.id, promptData.variations);
          
          console.log(`Prompt #${index + 1} publié avec succès: ${publishedPrompt.id}`);
          
          // Attendre 30 secondes entre chaque publication pour éviter les rate limits
          if (index < prompts.length - 1) {
            console.log('Attente de 30 secondes avant la prochaine publication...');
            await new Promise(resolve => setTimeout(resolve, 30000));
          }
        } catch (error) {
          console.error(`Erreur lors de la publication du prompt #${index + 1}:`, error.message);
          
          // Notification d'erreur
          await sendNotification({
            type: 'error',
            subject: 'Erreur de publication de prompt',
            message: `Erreur lors de la publication du prompt "${promptData.title}": ${error.message}`
          });
          
          // Continuer avec le prompt suivant
          continue;
        }
      }
      
      // Créer les bundles initiaux
      if (publishedPrompts.length >= 3) {
        await this.createInitialBundles(publishedPrompts);
      }
      
      console.log(`Publication réussie de ${publishedPrompts.length}/${prompts.length} prompts`);
      
      // Notification de succès
      await sendNotification({
        type: 'success',
        subject: 'Prompts publiés avec succès',
        message: `${publishedPrompts.length} prompts ont été publiés avec succès sur SnackPrompt.`
      });
      
      return publishedPrompts;
    } catch (error) {
      console.error('Erreur lors de la publication des prompts initiaux:', error.message);
      throw error;
    }
  }

  /**
   * Stocke les variations d'un prompt pour les tests A/B futurs
   * @param {string} promptId - ID du prompt
   * @param {Object} variations - Variations du prompt
   * @returns {Promise<void>}
   */
  async storePromptVariations(promptId, variations) {
    try {
      // Dans une implémentation réelle, on stockerait cela dans une base de données
      // Pour ce prototype, nous simulons le stockage
      console.log(`Variations stockées pour le prompt ${promptId}:`, JSON.stringify(variations));
    } catch (error) {
      console.error(`Erreur lors du stockage des variations pour le prompt ${promptId}:`, error.message);
    }
  }

  /**
   * Crée des bundles initiaux à partir des prompts publiés
   * @param {Array} publishedPrompts - Liste des prompts publiés
   * @returns {Promise<Array>} - Liste des bundles créés
   */
  async createInitialBundles(publishedPrompts) {
    try {
      console.log('Création des bundles initiaux...');
      
      // Regrouper les prompts par catégorie
      const promptsByCategory = {};
      for (const prompt of publishedPrompts) {
        if (!promptsByCategory[prompt.category]) {
          promptsByCategory[prompt.category] = [];
        }
        promptsByCategory[prompt.category].push(prompt);
      }
      
      const createdBundles = [];
      
      // Créer un bundle pour chaque catégorie avec au moins 3 prompts
      for (const [category, prompts] of Object.entries(promptsByCategory)) {
        if (prompts.length >= 3) {
          const bundlePrompts = prompts.slice(0, Math.min(prompts.length, 5));
          
          // Calculer le prix du bundle (15% de réduction)
          const originalPrice = bundlePrompts.reduce((sum, prompt) => sum + prompt.price, 0);
          const discountPercentage = parseFloat(process.env.DEFAULT_DISCOUNT_PERCENTAGE) || 15;
          const bundlePrice = Math.round(originalPrice * (1 - discountPercentage / 100));
          
          // Créer le bundle
          const bundleData = {
            name: `Pack ${category.charAt(0).toUpperCase() + category.slice(1)} Premium`,
            description: `Collection des meilleurs prompts pour ${category} avec ${discountPercentage}% de réduction.`,
            prompt_ids: bundlePrompts.map(p => p.id),
            price: bundlePrice,
            original_price: originalPrice
          };
          
          const createdBundle = await this.api.createBundle(bundleData);
          createdBundles.push(createdBundle);
          
          console.log(`Bundle "${createdBundle.name}" créé avec succès`);
        }
      }
      
      // Créer un bundle avec tous les prompts si assez nombreux
      if (publishedPrompts.length >= 5) {
        const allPromptsIds = publishedPrompts.map(p => p.id);
        const originalPrice = publishedPrompts.reduce((sum, prompt) => sum + prompt.price, 0);
        const bundlePrice = Math.round(originalPrice * 0.7); // 30% de réduction
        
        const completeBundleData = {
          name: 'Pack Complet - Collection Ultime',
          description: 'Tous nos prompts premium avec 30% de réduction. La collection complète pour maximiser votre productivité.',
          prompt_ids: allPromptsIds,
          price: bundlePrice,
          original_price: originalPrice
        };
        
        const completeBundle = await this.api.createBundle(completeBundleData);
        createdBundles.push(completeBundle);
        
        console.log(`Bundle complet "${completeBundle.name}" créé avec succès`);
      }
      
      return createdBundles;
    } catch (error) {
      console.error('Erreur lors de la création des bundles initiaux:', error.message);
      return [];
    }
  }

  /**
   * Gère un événement de vente terminée
   * @param {Object} saleData - Données de la vente
   * @returns {Promise<void>}
   */
  async handleSaleCompleted(saleData) {
    try {
      const { userId, promptId, sale_price } = saleData;
      
      console.log(`Vente complétée - Prompt: ${promptId}, Utilisateur: ${userId}, Prix: ${sale_price}`);
      
      // Envoyer une offre de cross-selling pour les autres prompts
      await this.sendCrossSellOffer(userId, promptId);
      
      // Mettre à jour les statistiques internes
      // Dans une implémentation réelle, on stockerait cela dans une base de données
      
      // Envoyer une notification de vente
      await sendNotification({
        type: 'info',
        subject: 'Nouvelle vente',
        message: `Une nouvelle vente a été réalisée - Prompt: ${promptId}, Prix: ${sale_price}`
      });
    } catch (error) {
      console.error('Erreur lors du traitement de la vente:', error.message);
    }
  }

  /**
   * Envoie une offre de cross-selling à un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {string} purchasedPromptId - ID du prompt acheté
   * @returns {Promise<void>}
   */
  async sendCrossSellOffer(userId, purchasedPromptId) {
    try {
      // Obtenir le prompt acheté
      const purchasedPrompt = this.publishedPrompts.get(purchasedPromptId);
      
      if (!purchasedPrompt) {
        console.warn(`Prompt acheté ${purchasedPromptId} non trouvé dans la map des prompts`);
        return;
      }
      
      // Trouver des prompts complémentaires
      const complementaryPrompts = Array.from(this.publishedPrompts.values())
        .filter(p => p.id !== purchasedPromptId && p.category === purchasedPrompt.category)
        .slice(0, 3);
      
      if (complementaryPrompts.length === 0) {
        console.log('Aucun prompt complémentaire trouvé pour l\'offre de cross-selling');
        return;
      }
      
      // Créer une offre personnalisée avec 20% de réduction
      const offerData = {
        user_id: userId,
        prompt_ids: complementaryPrompts.map(p => p.id),
        discount_percentage: 20,
        expires_in: 72, // 72 heures
        message: `Complétez votre collection ${purchasedPrompt.category} avec ces prompts complémentaires à -20%`
      };
      
      // Dans une API réelle, on appellerait une méthode pour envoyer cette offre
      console.log(`Offre de cross-selling envoyée à l'utilisateur ${userId}:`, JSON.stringify(offerData));
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'offre de cross-selling:', error.message);
    }
  }
}

module.exports = PromptManager;