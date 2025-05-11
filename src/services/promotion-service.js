/**
 * Service de promotion
 * -------------------------------------------------
 * Responsable de la gestion des promotions et offres spéciales
 */

const { sendNotification } = require('../utils/notifications');

class PromotionService {
  /**
   * Initialise le service de promotion
   * @param {Object} api - Instance de l'API SnackPrompt
   * @param {Object} analyticsService - Service d'analytics
   */
  constructor(api, analyticsService) {
    this.api = api;
    this.analyticsService = analyticsService;
    
    // Paramètres de promotion
    this.promotionParams = {
      flashDiscount: 25,           // Remise pour les promotions flash (%)
      standardDiscount: 15,        // Remise standard (%)
      bundleDiscount: 20,          // Remise pour les bundles (%)
      specialEventDiscount: 30,    // Remise pour les événements spéciaux (%)
      maxPromotionDuration: 3 * 24 // Durée maximale d'une promotion (heures)
    };
    
    // Événements spéciaux prédéfinis
    this.specialEvents = [
      { name: 'Summer Sale', month: 6, day: 21, duration: 7 * 24 },
      { name: 'Black Friday', month: 11, day: 25, duration: 3 * 24 },
      { name: 'Cyber Monday', month: 11, day: 28, duration: 1 * 24 },
      { name: 'New Year Sale', month: 1, day: 1, duration: 7 * 24 }
    ];
  }

  /**
   * Configure les promotions dynamiques basées sur l'activité
   * @returns {Promise<Array>} - Liste des promotions configurées
   */
  async setupDynamicPromotions() {
    try {
      console.log('Configuration des promotions dynamiques...');
      
      // Récupérer les données d'analytics horaires
      const hourlyAnalytics = await this.analyticsService.getHourlyAnalytics(7); // 7 derniers jours
      
      // Identifier les périodes de faible activité
      const lowActivityPeriods = this.findLowActivityPeriods(hourlyAnalytics);
      
      // Récupérer tous les prompts
      const allPrompts = await this.api.getPrompts();
      
      // Créer des promotions pour les périodes de faible activité
      const createdPromotions = [];
      
      for (const period of lowActivityPeriods.slice(0, 3)) { // Limiter à 3 promotions
        try {
          // Sélectionner des prompts pour cette promotion
          const selectedPrompts = this.selectPromptsForPromotion(allPrompts, 3);
          
          if (selectedPrompts.length === 0) {
            console.log(`Pas de prompts disponibles pour la promotion ${period.day} à ${period.hour}h`);
            continue;
          }
          
          // Calculer la prochaine occurrence de cette période
          const nextOccurrence = this.getNextOccurrence(period.day, period.hour);
          
          // Créer la promotion
          const promotion = {
            name: `Flash Sale ${period.day} ${period.hour}h`,
            prompt_ids: selectedPrompts.map(p => p.id),
            discount_percentage: this.promotionParams.flashDiscount,
            start_time: nextOccurrence.toISOString(),
            end_time: new Date(nextOccurrence.getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3 heures
            description: `Limited-time ${this.promotionParams.flashDiscount}% discount on selected prompts`
          };
          
          // Enregistrer la promotion
          const createdPromotion = await this.api.schedulePromotion(promotion);
          createdPromotions.push(createdPromotion);
          
          console.log(`Promotion flash programmée pour ${period.day} à ${period.hour}h sur ${selectedPrompts.length} prompts`);
        } catch (error) {
          console.error(`Erreur lors de la création de la promotion pour ${period.day} à ${period.hour}h:`, error.message);
        }
      }
      
      // Vérifier si des événements spéciaux approchent
      const upcomingEvents = this.checkUpcomingSpecialEvents();
      for (const event of upcomingEvents) {
        try {
          // Sélectionner des prompts pour cet événement spécial (tous les prompts disponibles)
          const selectedPrompts = this.selectPromptsForPromotion(allPrompts, allPrompts.length);
          
          if (selectedPrompts.length === 0) {
            console.log(`Pas de prompts disponibles pour l'événement ${event.name}`);
            continue;
          }
          
          // Créer la promotion pour l'événement spécial
          const promotion = {
            name: event.name,
            prompt_ids: selectedPrompts.map(p => p.id),
            discount_percentage: this.promotionParams.specialEventDiscount,
            start_time: event.startDate.toISOString(),
            end_time: event.endDate.toISOString(),
            description: `${event.name}: ${this.promotionParams.specialEventDiscount}% off everything!`
          };
          
          // Enregistrer la promotion
          const createdPromotion = await this.api.schedulePromotion(promotion);
          createdPromotions.push(createdPromotion);
          
          console.log(`Promotion spéciale "${event.name}" programmée du ${event.startDate.toISOString()} au ${event.endDate.toISOString()}`);
        } catch (error) {
          console.error(`Erreur lors de la création de la promotion pour l'événement ${event.name}:`, error.message);
        }
      }
      
      // Notification des promotions créées
      if (createdPromotions.length > 0) {
        await sendNotification({
          type: 'info',
          subject: 'Promotions programmées',
          message: `${createdPromotions.length} promotions ont été configurées automatiquement.`
        });
      }
      
      return createdPromotions;
    } catch (error) {
      console.error('Erreur lors de la configuration des promotions dynamiques:', error.message);
      
      // Notification d'erreur
      await sendNotification({
        type: 'error',
        subject: 'Erreur de configuration des promotions',
        message: `Une erreur est survenue lors de la configuration des promotions: ${error.message}`
      });
      
      return [];
    }
  }

  /**
   * Trouve les périodes de faible activité
   * @param {Array} analytics - Données d'analytics horaires
   * @returns {Array} - Périodes de faible activité
   */
  findLowActivityPeriods(analytics) {
    // Calculer l'activité moyenne par jour de semaine et heure
    const activityByHourDay = {};
    
    // Jourst de la semaine (0 = Dimanche, 1 = Lundi, ...)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Calculer l'activité moyenne pour chaque heure de chaque jour
    for (const dataPoint of analytics) {
      const date = new Date(dataPoint.timestamp);
      const day = days[date.getDay()];
      const hour = date.getHours();
      
      const key = `${day}_${hour}`;
      
      if (!activityByHourDay[key]) {
        activityByHourDay[key] = {
          day,
          hour,
          count: 0,
          visits: 0
        };
      }
      
      activityByHourDay[key].count++;
      activityByHourDay[key].visits += dataPoint.visits || 0;
    }
    
    // Calculer les moyennes
    Object.values(activityByHourDay).forEach(entry => {
      entry.avgVisits = entry.visits / entry.count;
    });
    
    // Filtrer pour exclure les heures de nuit (0h-7h)
    const filteredPeriods = Object.values(activityByHourDay).filter(
      entry => entry.hour >= 7 && entry.hour <= 23
    );
    
    // Trier par activité croissante et prendre les 5 périodes avec le moins d'activité
    return filteredPeriods
      .sort((a, b) => a.avgVisits - b.avgVisits)
      .slice(0, 5);
  }

  /**
   * Calcule la prochaine occurrence d'un jour et heure spécifiques
   * @param {string} day - Jour de la semaine
   * @param {number} hour - Heure de la journée
   * @returns {Date} - Date de la prochaine occurrence
   */
  getNextOccurrence(day, hour) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const dayIndex = days.indexOf(day);
    
    // Si le jour est invalide, retourner demain à l'heure spécifiée
    if (dayIndex === -1) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      tomorrow.setHours(hour, 0, 0, 0);
      return tomorrow;
    }
    
    // Calculer le nombre de jours à ajouter
    let daysToAdd = dayIndex - today.getDay();
    if (daysToAdd <= 0) {
      // Si c'est aujourd'hui ou un jour déjà passé cette semaine, aller à la semaine prochaine
      daysToAdd += 7;
    }
    
    // Si c'est aujourd'hui mais l'heure est déjà passée, aller à la semaine prochaine
    if (daysToAdd === 0 && today.getHours() >= hour) {
      daysToAdd = 7;
    }
    
    // Créer la date de la prochaine occurrence
    const nextOccurrence = new Date(today);
    nextOccurrence.setDate(today.getDate() + daysToAdd);
    nextOccurrence.setHours(hour, 0, 0, 0);
    
    return nextOccurrence;
  }

  /**
   * Sélectionne des prompts pour une promotion
   * @param {Array} prompts - Liste de tous les prompts
   * @param {number} count - Nombre de prompts à sélectionner
   * @returns {Array} - Prompts sélectionnés
   */
  selectPromptsForPromotion(prompts, count) {
    // Filtrer pour exclure les prompts déjà en promotion
    const availablePrompts = prompts.filter(p => !p.on_promotion);
    
    // Si pas assez de prompts disponibles, retourner tous les prompts disponibles
    if (availablePrompts.length <= count) {
      return availablePrompts;
    }
    
    // Dans une implémentation réelle, on sélectionnerait de manière intelligente
    // Pour ce prototype, nous sélectionnons aléatoirement
    
    // Mélanger les prompts
    const shuffled = [...availablePrompts].sort(() => 0.5 - Math.random());
    
    // Prendre les n premiers
    return shuffled.slice(0, count);
  }

  /**
   * Vérifie les événements spéciaux à venir
   * @returns {Array} - Événements spéciaux à venir dans les 14 jours
   */
  checkUpcomingSpecialEvents() {
    const today = new Date();
    const upcomingEvents = [];
    
    for (const event of this.specialEvents) {
      // Créer la date de l'événement pour l'année en cours
      const eventDate = new Date(today.getFullYear(), event.month - 1, event.day);
      
      // Si l'événement est déjà passé cette année, passer à l'année suivante
      if (eventDate < today) {
        eventDate.setFullYear(today.getFullYear() + 1);
      }
      
      // Calculer le nombre de jours jusqu'à l'événement
      const daysUntilEvent = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
      
      // Si l'événement est dans moins de 14 jours, l'ajouter à la liste
      if (daysUntilEvent <= 14) {
        upcomingEvents.push({
          ...event,
          startDate: eventDate,
          endDate: new Date(eventDate.getTime() + event.duration * 60 * 60 * 1000),
          daysUntilEvent
        });
      }
    }
    
    return upcomingEvents;
  }

  /**
   * Crée un bundle de prompts
   * @param {Array} promptIds - IDs des prompts à inclure
   * @param {string} name - Nom du bundle
   * @param {string} description - Description du bundle
   * @returns {Promise<Object>} - Bundle créé
   */
  async createBundle(promptIds, name, description) {
    try {
      if (!promptIds || promptIds.length < 2) {
        throw new Error('Un bundle doit contenir au moins 2 prompts');
      }
      
      // Récupérer les détails des prompts
      const prompts = await Promise.all(
        promptIds.map(id => this.api.getPrompt(id))
      );
      
      // Calculer le prix original (somme des prix individuels)
      const originalPrice = prompts.reduce((sum, prompt) => sum + prompt.price, 0);
      
      // Calculer le prix du bundle avec la remise
      const bundlePrice = Math.round(originalPrice * (1 - this.promotionParams.bundleDiscount / 100));
      
      // Créer le bundle
      const bundleData = {
        name: name || `Bundle of ${prompts.length} prompts`,
        description: description || `Save ${this.promotionParams.bundleDiscount}% on this collection of premium prompts`,
        prompt_ids: promptIds,
        price: bundlePrice,
        original_price: originalPrice
      };
      
      const createdBundle = await this.api.createBundle(bundleData);
      
      console.log(`Bundle "${createdBundle.name}" créé avec succès`);
      
      return createdBundle;
    } catch (error) {
      console.error('Erreur lors de la création du bundle:', error.message);
      throw error;
    }
  }

  /**
   * Crée des bundles de prompts par catégorie
   * @returns {Promise<Array>} - Liste des bundles créés
   */
  async createCategoryBundles() {
    try {
      console.log('Création de bundles par catégorie...');
      
      // Récupérer tous les prompts
      const allPrompts = await this.api.getPrompts();
      
      // Regrouper les prompts par catégorie
      const promptsByCategory = {};
      for (const prompt of allPrompts) {
        if (!promptsByCategory[prompt.category]) {
          promptsByCategory[prompt.category] = [];
        }
        promptsByCategory[prompt.category].push(prompt);
      }
      
      const createdBundles = [];
      
      // Créer un bundle pour chaque catégorie avec au moins 3 prompts
      for (const [category, prompts] of Object.entries(promptsByCategory)) {
        if (prompts.length >= 3) {
          try {
            const bundlePrompts = prompts.slice(0, Math.min(prompts.length, 5));
            
            const bundle = await this.createBundle(
              bundlePrompts.map(p => p.id),
              `${category.charAt(0).toUpperCase() + category.slice(1)} Collection`,
              `Complete ${category} toolkit with our best ${bundlePrompts.length} prompts at ${this.promotionParams.bundleDiscount}% off`
            );
            
            createdBundles.push(bundle);
          } catch (error) {
            console.error(`Erreur lors de la création du bundle pour la catégorie ${category}:`, error.message);
          }
        }
      }
      
      // Créer un bundle avec tous les prompts si assez nombreux
      if (allPrompts.length >= 5) {
        try {
          const allPromptsBundle = await this.createBundle(
            allPrompts.map(p => p.id),
            'Complete Collection',
            `Get all our premium prompts with ${this.promotionParams.specialEventDiscount}% off in this ultimate bundle`
          );
          
          createdBundles.push(allPromptsBundle);
        } catch (error) {
          console.error('Erreur lors de la création du bundle complet:', error.message);
        }
      }
      
      console.log(`${createdBundles.length} bundles créés avec succès`);
      
      return createdBundles;
    } catch (error) {
      console.error('Erreur lors de la création des bundles par catégorie:', error.message);
      return [];
    }
  }

  /**
   * Applique une promotion à un prompt
   * @param {string} promptId - ID du prompt
   * @param {number} discountPercentage - Pourcentage de remise
   * @param {number} durationHours - Durée de la promotion en heures
   * @returns {Promise<Object>} - Prompt mis à jour
   */
  async applyPromotionToPrompt(promptId, discountPercentage, durationHours) {
    try {
      // Récupérer les détails du prompt
      const prompt = await this.api.getPrompt(promptId);
      
      // Vérifier si le prompt est déjà en promotion
      if (prompt.on_promotion) {
        console.log(`Le prompt ${promptId} est déjà en promotion`);
        return prompt;
      }
      
      // Limiter la remise
      const actualDiscount = Math.min(discountPercentage, 50); // Maximum 50% de remise
      
      // Calculer le prix en promotion
      const promotionPrice = Math.round(prompt.price * (1 - actualDiscount / 100));
      
      // Limiter la durée
      const actualDuration = Math.min(durationHours, this.promotionParams.maxPromotionDuration);
      
      // Calculer la date de fin
      const endDate = new Date(Date.now() + actualDuration * 60 * 60 * 1000);
      
      // Mettre à jour le prompt
      const updatedPrompt = await this.api.updatePrompt(promptId, {
        price: promotionPrice,
        on_promotion: true,
        promotion_percentage: actualDiscount,
        promotion_end_date: endDate.toISOString()
      });
      
      console.log(`Promotion de ${actualDiscount}% appliquée au prompt ${promptId} jusqu'au ${endDate.toISOString()}`);
      
      return updatedPrompt;
    } catch (error) {
      console.error(`Erreur lors de l'application de la promotion au prompt ${promptId}:`, error.message);
      throw error;
    }
  }

  /**
   * Retire une promotion d'un prompt
   * @param {string} promptId - ID du prompt
   * @returns {Promise<Object>} - Prompt mis à jour
   */
  async removePromotionFromPrompt(promptId) {
    try {
      // Récupérer les détails du prompt
      const prompt = await this.api.getPrompt(promptId);
      
      // Vérifier si le prompt est en promotion
      if (!prompt.on_promotion) {
        console.log(`Le prompt ${promptId} n'est pas en promotion`);
        return prompt;
      }
      
      // Calculer le prix normal (sans promotion)
      const normalPrice = Math.round(prompt.price / (1 - prompt.promotion_percentage / 100));
      
      // Mettre à jour le prompt
      const updatedPrompt = await this.api.updatePrompt(promptId, {
        price: normalPrice,
        on_promotion: false,
        promotion_percentage: 0,
        promotion_end_date: null
      });
      
      console.log(`Promotion retirée du prompt ${promptId}, prix ajusté de ${prompt.price}€ à ${normalPrice}€`);
      
      return updatedPrompt;
    } catch (error) {
      console.error(`Erreur lors du retrait de la promotion du prompt ${promptId}:`, error.message);
      throw error;
    }
  }
}

module.exports = PromotionService;