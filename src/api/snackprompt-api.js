/**
 * Module client pour l'API SnackPrompt
 * -------------------------------------------------
 * Gère toutes les interactions avec l'API SnackPrompt
 */

const axios = require('axios');
const { delay } = require('../utils/helpers');

class SnackPromptAPI {
  /**
   * Initialise le client API SnackPrompt
   * @param {Object} config - Configuration de l'API
   * @param {string} config.apiKey - Clé API SnackPrompt
   * @param {string} config.secretKey - Clé secrète SnackPrompt
   */
  constructor(config) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.baseURL = 'https://api.snackprompt.com/v1';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-API-Secret': this.secretKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 secondes
    });
    
    // Configuration des intercepteurs pour gérer les erreurs et la rate limit
    this.setupInterceptors();
  }

  /**
   * Configure les intercepteurs pour gérer les erreurs et les limites de taux
   */
  setupInterceptors() {
    // Intercepteur de requête
    this.client.interceptors.request.use(
      config => {
        console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        console.error('Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Intercepteur de réponse
    this.client.interceptors.response.use(
      response => {
        return response;
      },
      async error => {
        // Gestion des erreurs
        if (error.response) {
          const { status, data } = error.response;
          
          // Gestion de la rate limit (429)
          if (status === 429) {
            const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
            console.warn(`Rate limit atteinte. Nouvelle tentative dans ${retryAfter} secondes...`);
            await delay(retryAfter * 1000);
            return this.client(error.config);
          }
          
          // Gestion des erreurs d'authentification (401)
          if (status === 401) {
            console.error('Erreur d\'authentification API:', data);
            throw new Error('API Authentication Error');
          }
          
          // Gestion des erreurs de validation (400)
          if (status === 400) {
            console.error('Erreur de validation API:', data);
            throw new Error(`API Validation Error: ${JSON.stringify(data)}`);
          }
          
          // Gestion des erreurs serveur (500)
          if (status >= 500) {
            console.error('Erreur serveur API:', data);
            throw new Error('API Server Error');
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Crée un nouveau prompt sur SnackPrompt
   * @param {Object} promptData - Données du prompt à créer
   * @returns {Promise<Object>} - Le prompt créé
   */
  async createPrompt(promptData) {
    try {
      const response = await this.client.post('/prompts', promptData);
      console.log(`Prompt créé avec succès: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création du prompt:', error.message);
      throw error;
    }
  }

  /**
   * Récupère un prompt par son ID
   * @param {string} promptId - ID du prompt à récupérer
   * @returns {Promise<Object>} - Le prompt récupéré
   */
  async getPrompt(promptId) {
    try {
      const response = await this.client.get(`/prompts/${promptId}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du prompt ${promptId}:`, error.message);
      throw error;
    }
  }

  /**
   * Récupère tous les prompts
   * @returns {Promise<Array>} - Liste des prompts
   */
  async getPrompts() {
    try {
      const response = await this.client.get('/prompts');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des prompts:', error.message);
      throw error;
    }
  }

  /**
   * Met à jour un prompt existant
   * @param {string} promptId - ID du prompt à mettre à jour
   * @param {Object} updateData - Données à mettre à jour
   * @returns {Promise<Object>} - Le prompt mis à jour
   */
  async updatePrompt(promptId, updateData) {
    try {
      const response = await this.client.patch(`/prompts/${promptId}`, updateData);
      console.log(`Prompt ${promptId} mis à jour avec succès`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du prompt ${promptId}:`, error.message);
      throw error;
    }
  }

  /**
   * Met à jour le prix d'un prompt
   * @param {string} promptId - ID du prompt
   * @param {number} price - Nouveau prix
   * @returns {Promise<Object>} - Le prompt mis à jour
   */
  async updatePromptPrice(promptId, price) {
    try {
      // Arrondir le prix et s'assurer qu'il est dans les limites
      const minPrice = parseFloat(process.env.MIN_PROMPT_PRICE) || 10;
      const maxPrice = parseFloat(process.env.MAX_PROMPT_PRICE) || 150;
      const newPrice = Math.min(Math.max(Math.round(price), minPrice), maxPrice);
      
      const response = await this.client.patch(`/prompts/${promptId}`, { price: newPrice });
      console.log(`Prix du prompt ${promptId} mis à jour à ${newPrice}€`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du prix du prompt ${promptId}:`, error.message);
      throw error;
    }
  }

  /**
   * Supprime un prompt
   * @param {string} promptId - ID du prompt à supprimer
   * @returns {Promise<boolean>} - true si supprimé avec succès
   */
  async deletePrompt(promptId) {
    try {
      await this.client.delete(`/prompts/${promptId}`);
      console.log(`Prompt ${promptId} supprimé avec succès`);
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression du prompt ${promptId}:`, error.message);
      throw error;
    }
  }

  /**
   * Récupère les statistiques de tous les prompts
   * @returns {Promise<Array>} - Statistiques des prompts
   */
  async getPromptStats() {
    try {
      const response = await this.client.get('/analytics/prompts');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error.message);
      throw error;
    }
  }

  /**
   * Récupère les performances d'un prompt spécifique
   * @param {string} promptId - ID du prompt
   * @returns {Promise<Object>} - Performances du prompt
   */
  async getPromptPerformance(promptId) {
    try {
      const response = await this.client.get(`/analytics/prompts/${promptId}/performance`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération des performances du prompt ${promptId}:`, error.message);
      throw error;
    }
  }

  /**
   * Récupère des analytics détaillées
   * @returns {Promise<Object>} - Analytics détaillées
   */
  async getDetailedAnalytics() {
    try {
      const response = await this.client.get('/analytics/detailed');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des analytics détaillées:', error.message);
      throw error;
    }
  }

  /**
   * Récupère les analytics horaires
   * @param {number} days - Nombre de jours d'historique à récupérer
   * @returns {Promise<Array>} - Analytics horaires
   */
  async getHourlyAnalytics(days = 7) {
    try {
      const response = await this.client.get('/analytics/hourly', {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des analytics horaires:', error.message);
      throw error;
    }
  }

  /**
   * Crée un bundle de prompts
   * @param {Object} bundleData - Données du bundle
   * @returns {Promise<Object>} - Le bundle créé
   */
  async createBundle(bundleData) {
    try {
      const response = await this.client.post('/bundles', bundleData);
      console.log(`Bundle créé avec succès: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création du bundle:', error.message);
      throw error;
    }
  }

  /**
   * Programme une promotion
   * @param {Object} promotionData - Données de la promotion
   * @returns {Promise<Object>} - La promotion créée
   */
  async schedulePromotion(promotionData) {
    try {
      const response = await this.client.post('/promotions', promotionData);
      console.log(`Promotion programmée avec succès: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la programmation de la promotion:', error.message);
      throw error;
    }
  }

  /**
   * Répond à une question client
   * @param {string} questionId - ID de la question
   * @param {string} response - Réponse à la question
   * @returns {Promise<Object>} - La réponse créée
   */
  async respondToQuestion(questionId, response) {
    try {
      const result = await this.client.post(`/customer-support/questions/${questionId}/respond`, {
        response
      });
      console.log(`Réponse envoyée avec succès à la question ${questionId}`);
      return result.data;
    } catch (error) {
      console.error(`Erreur lors de la réponse à la question ${questionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Approuve une demande de remboursement
   * @param {string} refundId - ID de la demande de remboursement
   * @returns {Promise<Object>} - Le résultat de l'approbation
   */
  async approveRefund(refundId) {
    try {
      const response = await this.client.post(`/customer-support/refunds/${refundId}/approve`);
      console.log(`Remboursement ${refundId} approuvé avec succès`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de l'approbation du remboursement ${refundId}:`, error.message);
      throw error;
    }
  }

  /**
   * Refuse une demande de remboursement
   * @param {string} refundId - ID de la demande de remboursement
   * @param {string} reason - Raison du refus
   * @returns {Promise<Object>} - Le résultat du refus
   */
  async denyRefund(refundId, reason) {
    try {
      const response = await this.client.post(`/customer-support/refunds/${refundId}/deny`, {
        reason
      });
      console.log(`Remboursement ${refundId} refusé avec succès`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors du refus du remboursement ${refundId}:`, error.message);
      throw error;
    }
  }

  /**
   * Récupère les informations d'un achat
   * @param {string} userId - ID de l'utilisateur
   * @param {string} promptId - ID du prompt
   * @returns {Promise<Object>} - Informations sur l'achat
   */
  async getPurchaseInfo(userId, promptId) {
    try {
      const response = await this.client.get(`/purchases/user/${userId}/prompt/${promptId}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération des informations d'achat:`, error.message);
      throw error;
    }
  }

  /**
   * Récupère le nombre de remboursements d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<number>} - Nombre de remboursements
   */
  async getUserRefundCount(userId) {
    try {
      const response = await this.client.get(`/analytics/users/${userId}/refunds/count`);
      return response.data.count;
    } catch (error) {
      console.error(`Erreur lors de la récupération du nombre de remboursements:`, error.message);
      throw error;
    }
  }

  /**
   * Récupère les prompts les plus performants
   * @param {number} limit - Nombre de prompts à récupérer
   * @returns {Promise<Array>} - Liste des prompts les plus performants
   */
  async getTopPerformingPrompts(limit = 10) {
    try {
      const response = await this.client.get('/analytics/prompts/top', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des prompts les plus performants:', error.message);
      throw error;
    }
  }
}

module.exports = SnackPromptAPI;