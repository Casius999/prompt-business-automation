/**
 * Moteur d'optimisation
 * -------------------------------------------------
 * Responsable de l'optimisation continue des prompts et des prix
 */

const { sendNotification } = require('../utils/notifications');
const { retrievePromptVariations, storeTestResults } = require('../services/variation-storage');

class OptimizationEngine {
  /**
   * Initialise le moteur d'optimisation
   * @param {Object} api - Instance de l'API SnackPrompt
   * @param {Object} analyticsService - Service d'analytics
   */
  constructor(api, analyticsService) {
    this.api = api;
    this.analyticsService = analyticsService;
    
    // Paramètres d'optimisation
    this.minPriceAdjustment = 0.95; // -5%
    this.maxPriceAdjustment = 1.05; // +5%
    this.minPromptPrice = parseFloat(process.env.MIN_PROMPT_PRICE) || 25;
    this.maxPromptPrice = parseFloat(process.env.MAX_PROMPT_PRICE) || 150;
    
    // Seuils d'optimisation
    this.highConversionThreshold = 0.12; // 12%
    this.lowConversionThreshold = 0.03; // 3%
    this.highViewThreshold = 20; // 20 vues par heure
    this.minTestViews = 100; // Nombre minimum de vues pour un test A/B
  }

  /**
   * Optimisation horaire des prix basée sur la demande en temps réel
   * @param {Array} stats - Statistiques des prompts
   * @returns {Promise<Array>} - Liste des prompts mis à jour
   */
  async hourlyOptimization(stats) {
    try {
      console.log('Début de l\'optimisation horaire...');
      
      const updatedPrompts = [];
      
      for (const prompt of stats) {
        // Si le prompt a un test A/B en cours, ne pas ajuster le prix
        if (prompt.currently_testing) {
          console.log(`Prompt ${prompt.id} a un test A/B en cours, prix non ajusté`);
          continue;
        }
        
        // Critères pour augmenter le prix
        if (prompt.conversion_rate > this.highConversionThreshold && prompt.views_last_hour > this.highViewThreshold) {
          const newPrice = Math.min(prompt.price * this.maxPriceAdjustment, this.maxPromptPrice);
          
          // Si le nouveau prix est significativement différent
          if (newPrice > prompt.price + 1) {
            await this.api.updatePromptPrice(prompt.id, newPrice);
            console.log(`Prix du prompt ${prompt.id} augmenté de ${prompt.price}€ à ${newPrice}€ (taux de conversion élevé)`);
            updatedPrompts.push({ id: prompt.id, oldPrice: prompt.price, newPrice, reason: 'increase_high_conversion' });
          }
        }
        // Critères pour diminuer le prix
        else if (prompt.views_last_hour > this.highViewThreshold * 1.5 && prompt.conversion_rate < this.lowConversionThreshold) {
          const newPrice = Math.max(prompt.price * this.minPriceAdjustment, this.minPromptPrice);
          
          // Si le nouveau prix est significativement différent
          if (newPrice < prompt.price - 1) {
            await this.api.updatePromptPrice(prompt.id, newPrice);
            console.log(`Prix du prompt ${prompt.id} diminué de ${prompt.price}€ à ${newPrice}€ (nombreuses vues, faible conversion)`);
            updatedPrompts.push({ id: prompt.id, oldPrice: prompt.price, newPrice, reason: 'decrease_low_conversion' });
          }
        }
      }
      
      console.log(`Optimisation horaire terminée: ${updatedPrompts.length} prompts mis à jour`);
      return updatedPrompts;
    } catch (error) {
      console.error('Erreur lors de l\'optimisation horaire:', error.message);
      await sendNotification({
        type: 'error',
        subject: 'Erreur d\'optimisation horaire',
        message: `Une erreur est survenue lors de l'optimisation horaire: ${error.message}`
      });
      return [];
    }
  }

  /**
   * Optimisation quotidienne basée sur des analyses plus approfondies
   * @param {Object} allData - Données d'analytics détaillées
   * @returns {Promise<Array>} - Liste des actions effectuées
   */
  async dailyOptimization(allData) {
    try {
      console.log('Début de l\'optimisation quotidienne...');
      
      const actions = [];
      
      // 1. Lancer des tests A/B sur les prompts avec suffisamment de données
      const promptsForTesting = allData.filter(p => 
        p.total_views > this.minTestViews && 
        !p.currently_testing && 
        p.conversion_rate < this.highConversionThreshold
      );
      
      for (const prompt of promptsForTesting.slice(0, 2)) { // Limiter à 2 tests par jour
        const action = await this.startABTest(prompt);
        if (action) {
          actions.push(action);
        }
      }
      
      // 2. Optimiser les titres/descriptions des prompts peu performants
      const lowPerformingPrompts = allData.filter(p => 
        p.total_views > this.minTestViews * 2 && 
        p.conversion_rate < this.lowConversionThreshold &&
        !p.currently_testing
      );
      
      for (const prompt of lowPerformingPrompts.slice(0, 3)) { // Limiter à 3 prompts par jour
        const action = await this.improvePromptContent(prompt);
        if (action) {
          actions.push(action);
        }
      }
      
      // 3. Ajuster les prix des prompts selon les tendances à long terme
      const stablePricePrompts = allData.filter(p => 
        p.total_views > this.minTestViews * 3 && 
        !p.price_changed_recently &&
        !p.currently_testing
      );
      
      for (const prompt of stablePricePrompts) {
        const action = await this.optimizeLongTermPrice(prompt);
        if (action) {
          actions.push(action);
        }
      }
      
      console.log(`Optimisation quotidienne terminée: ${actions.length} actions effectuées`);
      
      return actions;
    } catch (error) {
      console.error('Erreur lors de l\'optimisation quotidienne:', error.message);
      await sendNotification({
        type: 'error',
        subject: 'Erreur d\'optimisation quotidienne',
        message: `Une erreur est survenue lors de l'optimisation quotidienne: ${error.message}`
      });
      return [];
    }
  }

  /**
   * Démarre un test A/B sur un prompt
   * @param {Object} prompt - Données du prompt
   * @returns {Promise<Object|null>} - Action effectuée ou null
   */
  async startABTest(prompt) {
    try {
      // Récupérer les variations stockées
      const variations = await retrievePromptVariations(prompt.id);
      
      if (!variations || !variations.titles || !variations.descriptions || variations.titles.length <= 1) {
        console.log(`Pas assez de variations disponibles pour le prompt ${prompt.id}`);
        return null;
      }
      
      // Si toutes les variantes ont été testées, appliquer la meilleure
      if (variations.tested_count >= variations.titles.length) {
        if (!variations.results || variations.results.length === 0) {
          console.log(`Aucun résultat de test disponible pour le prompt ${prompt.id}`);
          return null;
        }
        
        const bestVariation = variations.results.sort((a, b) => b.conversion - a.conversion)[0];
        await this.api.updatePrompt(prompt.id, {
          title: bestVariation.title,
          description: bestVariation.description
        });
        
        console.log(`Meilleure variante appliquée pour ${prompt.id}: conv. rate ${bestVariation.conversion}%`);
        
        return {
          type: 'apply_best_variation',
          promptId: prompt.id,
          variation: bestVariation,
          timestamp: new Date().toISOString()
        };
      } 
      // Sinon, tester la prochaine variante
      else {
        const nextIndex = variations.tested_count || 0;
        await this.api.updatePrompt(prompt.id, {
          title: variations.titles[nextIndex],
          description: variations.descriptions[nextIndex],
          currently_testing: true
        });
        
        console.log(`Test A/B démarré pour ${prompt.id}: variante #${nextIndex + 1}`);
        
        // Planifier la fin du test (après 3 jours)
        this.scheduleTestEnd(prompt.id, nextIndex, 3 * 24 * 60 * 60 * 1000);
        
        return {
          type: 'start_ab_test',
          promptId: prompt.id,
          variationIndex: nextIndex,
          title: variations.titles[nextIndex],
          description: variations.descriptions[nextIndex],
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error(`Erreur lors du démarrage du test A/B pour ${prompt.id}:`, error.message);
      return null;
    }
  }

  /**
   * Planifie la fin d'un test A/B
   * @param {string} promptId - ID du prompt
   * @param {number} variationIndex - Index de la variation testée
   * @param {number} duration - Durée du test en millisecondes
   */
  scheduleTestEnd(promptId, variationIndex, duration) {
    setTimeout(async () => {
      try {
        // Récupérer les performances du prompt
        const results = await this.api.getPromptPerformance(promptId);
        
        // Stocker les résultats du test
        await storeTestResults(promptId, variationIndex, results);
        
        // Mettre fin au test
        await this.api.updatePrompt(promptId, { currently_testing: false });
        
        console.log(`Test A/B terminé pour ${promptId}, variation #${variationIndex + 1}`);
      } catch (error) {
        console.error(`Erreur lors de la fin du test A/B pour ${promptId}:`, error.message);
      }
    }, duration);
    
    console.log(`Fin du test A/B planifiée pour ${promptId} dans ${duration / (1000 * 60 * 60)} heures`);
  }

  /**
   * Améliore le contenu d'un prompt peu performant
   * @param {Object} prompt - Données du prompt
   * @returns {Promise<Object|null>} - Action effectuée ou null
   */
  async improvePromptContent(prompt) {
    try {
      // Dans une implémentation réelle, on utiliserait OpenAI pour générer de meilleures versions
      // Pour ce prototype, nous simulons l'amélioration
      
      const improvedTitle = `${prompt.title} - Version Optimisée`;
      const improvedDescription = `${prompt.description} Cette version améliorée offre des résultats plus précis et personnalisés.`;
      
      await this.api.updatePrompt(prompt.id, {
        title: improvedTitle,
        description: improvedDescription
      });
      
      console.log(`Contenu du prompt ${prompt.id} amélioré`);
      
      return {
        type: 'improve_content',
        promptId: prompt.id,
        oldTitle: prompt.title,
        newTitle: improvedTitle,
        oldDescription: prompt.description,
        newDescription: improvedDescription,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Erreur lors de l'amélioration du contenu du prompt ${prompt.id}:`, error.message);
      return null;
    }
  }

  /**
   * Optimise le prix à long terme d'un prompt
   * @param {Object} prompt - Données du prompt
   * @returns {Promise<Object|null>} - Action effectuée ou null
   */
  async optimizeLongTermPrice(prompt) {
    try {
      // Analyser les tendances de prix et de conversion
      const longTermData = await this.analyticsService.getLongTermTrends(prompt.id);
      
      if (!longTermData || !longTermData.price_elasticity) {
        console.log(`Pas assez de données pour optimiser le prix du prompt ${prompt.id}`);
        return null;
      }
      
      // Si l'élasticité-prix est positive (augmenter le prix augmente les conversions)
      if (longTermData.price_elasticity > 0.1) {
        const newPrice = Math.min(prompt.price * 1.1, this.maxPromptPrice);
        await this.api.updatePromptPrice(prompt.id, newPrice);
        
        console.log(`Prix du prompt ${prompt.id} augmenté de ${prompt.price}€ à ${newPrice}€ (optimisation long terme)`);
        
        return {
          type: 'optimize_long_term_price_up',
          promptId: prompt.id,
          oldPrice: prompt.price,
          newPrice,
          elasticity: longTermData.price_elasticity,
          timestamp: new Date().toISOString()
        };
      } 
      // Si l'élasticité-prix est négative (diminuer le prix augmente les conversions)
      else if (longTermData.price_elasticity < -0.1) {
        const newPrice = Math.max(prompt.price * 0.9, this.minPromptPrice);
        await this.api.updatePromptPrice(prompt.id, newPrice);
        
        console.log(`Prix du prompt ${prompt.id} diminué de ${prompt.price}€ à ${newPrice}€ (optimisation long terme)`);
        
        return {
          type: 'optimize_long_term_price_down',
          promptId: prompt.id,
          oldPrice: prompt.price,
          newPrice,
          elasticity: longTermData.price_elasticity,
          timestamp: new Date().toISOString()
        };
      }
      
      console.log(`Prix du prompt ${prompt.id} maintenu à ${prompt.price}€ (élasticité neutre)`);
      return null;
    } catch (error) {
      console.error(`Erreur lors de l'optimisation du prix à long terme du prompt ${prompt.id}:`, error.message);
      return null;
    }
  }

  /**
   * Effectue une rénovation hebdomadaire des prompts
   * @returns {Promise<Array>} - Liste des actions effectuées
   */
  async weeklyRenovation() {
    try {
      console.log('Début de la rénovation hebdomadaire...');
      
      const actions = [];
      
      // 1. Récupérer tous les prompts avec leurs performances
      const allPrompts = await this.api.getPrompts();
      const promptsWithPerformance = await Promise.all(
        allPrompts.map(async prompt => {
          try {
            const performance = await this.api.getPromptPerformance(prompt.id);
            return { ...prompt, performance };
          } catch (error) {
            console.error(`Erreur lors de la récupération des performances du prompt ${prompt.id}:`, error.message);
            return { ...prompt, performance: null };
          }
        })
      );
      
      // 2. Rafraîchir le contenu des prompts les plus anciens
      const oldPrompts = promptsWithPerformance
        .filter(p => p.creation_date && new Date(p.creation_date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Prompts de plus de 30 jours
        .slice(0, 2); // Limiter à 2 prompts par semaine
      
      for (const prompt of oldPrompts) {
        const action = await this.refreshPromptContent(prompt);
        if (action) {
          actions.push(action);
        }
      }
      
      // 3. Retirer les promotions des prompts avec une forte demande
      const highDemandPrompts = promptsWithPerformance
        .filter(p => p.performance && p.performance.views_last_7_days > 500 && p.performance.conversion_rate > this.highConversionThreshold)
        .slice(0, 3); // Limiter à 3 prompts
      
      for (const prompt of highDemandPrompts) {
        if (prompt.on_promotion) {
          const action = await this.removePromotion(prompt);
          if (action) {
            actions.push(action);
          }
        }
      }
      
      // 4. Appliquer des promotions aux prompts avec faible demande
      const lowDemandPrompts = promptsWithPerformance
        .filter(p => 
          p.performance && 
          p.performance.views_last_7_days > 100 && 
          p.performance.views_last_7_days < 300 && 
          p.performance.conversion_rate < this.lowConversionThreshold &&
          !p.on_promotion
        )
        .slice(0, 3); // Limiter à 3 prompts
      
      for (const prompt of lowDemandPrompts) {
        const action = await this.applyPromotion(prompt);
        if (action) {
          actions.push(action);
        }
      }
      
      console.log(`Rénovation hebdomadaire terminée: ${actions.length} actions effectuées`);
      
      // Notification de rapport
      await sendNotification({
        type: 'report',
        subject: 'Rapport de rénovation hebdomadaire',
        message: `La rénovation hebdomadaire a effectué ${actions.length} actions. Voir le détail ci-joint.`,
        attachment: JSON.stringify(actions, null, 2)
      });
      
      return actions;
    } catch (error) {
      console.error('Erreur lors de la rénovation hebdomadaire:', error.message);
      await sendNotification({
        type: 'error',
        subject: 'Erreur de rénovation hebdomadaire',
        message: `Une erreur est survenue lors de la rénovation hebdomadaire: ${error.message}`
      });
      return [];
    }
  }

  /**
   * Rafraîchit le contenu d'un prompt ancien
   * @param {Object} prompt - Données du prompt
   * @returns {Promise<Object|null>} - Action effectuée ou null
   */
  async refreshPromptContent(prompt) {
    try {
      // Dans une implémentation réelle, on utiliserait OpenAI pour générer un contenu actualisé
      // Pour ce prototype, nous simulons le rafraîchissement
      
      const refreshedTitle = `${prompt.title} [2025 Edition]`;
      const refreshedDescription = `${prompt.description} Mis à jour pour 2025 avec les dernières techniques et optimisations.`;
      
      await this.api.updatePrompt(prompt.id, {
        title: refreshedTitle,
        description: refreshedDescription,
        last_refresh_date: new Date().toISOString()
      });
      
      console.log(`Contenu du prompt ${prompt.id} rafraîchi`);
      
      return {
        type: 'refresh_content',
        promptId: prompt.id,
        oldTitle: prompt.title,
        newTitle: refreshedTitle,
        oldDescription: prompt.description,
        newDescription: refreshedDescription,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Erreur lors du rafraîchissement du contenu du prompt ${prompt.id}:`, error.message);
      return null;
    }
  }

  /**
   * Retire une promotion d'un prompt
   * @param {Object} prompt - Données du prompt
   * @returns {Promise<Object|null>} - Action effectuée ou null
   */
  async removePromotion(prompt) {
    try {
      // Calculer le prix normal (sans promotion)
      const normalPrice = Math.round(prompt.price / (1 - prompt.promotion_percentage / 100));
      
      await this.api.updatePrompt(prompt.id, {
        price: normalPrice,
        on_promotion: false,
        promotion_percentage: 0
      });
      
      console.log(`Promotion retirée du prompt ${prompt.id}, prix ajusté de ${prompt.price}€ à ${normalPrice}€`);
      
      return {
        type: 'remove_promotion',
        promptId: prompt.id,
        oldPrice: prompt.price,
        newPrice: normalPrice,
        promotionPercentage: prompt.promotion_percentage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Erreur lors du retrait de la promotion du prompt ${prompt.id}:`, error.message);
      return null;
    }
  }

  /**
   * Applique une promotion à un prompt
   * @param {Object} prompt - Données du prompt
   * @returns {Promise<Object|null>} - Action effectuée ou null
   */
  async applyPromotion(prompt) {
    try {
      // Calculer le prix en promotion (15% de réduction)
      const promotionPercentage = 15;
      const promotionPrice = Math.round(prompt.price * (1 - promotionPercentage / 100));
      
      await this.api.updatePrompt(prompt.id, {
        price: promotionPrice,
        on_promotion: true,
        promotion_percentage: promotionPercentage,
        promotion_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours
      });
      
      console.log(`Promotion de ${promotionPercentage}% appliquée au prompt ${prompt.id}, prix ajusté de ${prompt.price}€ à ${promotionPrice}€`);
      
      return {
        type: 'apply_promotion',
        promptId: prompt.id,
        oldPrice: prompt.price,
        newPrice: promotionPrice,
        promotionPercentage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Erreur lors de l'application d'une promotion au prompt ${prompt.id}:`, error.message);
      return null;
    }
  }
}

module.exports = OptimizationEngine;