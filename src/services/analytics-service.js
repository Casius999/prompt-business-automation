/**
 * Service d'analyse
 * -------------------------------------------------
 * Responsable de l'analyse des données et des tendances
 */

const { generateChart } = require('../utils/chart-generator');
const { formatCurrency, formatPercentage } = require('../utils/formatters');

class AnalyticsService {
  /**
   * Initialise le service d'analyse
   * @param {Object} api - Instance de l'API SnackPrompt
   */
  constructor(api) {
    this.api = api;
    
    // Cache pour stocker temporairement les données
    this.dataCache = {
      promptStats: {
        data: null,
        timestamp: 0,
        ttl: 60 * 60 * 1000 // 1 heure
      },
      hourlyAnalytics: {
        data: null,
        timestamp: 0,
        ttl: 30 * 60 * 1000 // 30 minutes
      }
    };
  }

  /**
   * Récupère les statistiques des prompts
   * @returns {Promise<Array>} - Statistiques des prompts
   */
  async getPromptStats() {
    try {
      // Vérifier si les données sont en cache et valides
      const now = Date.now();
      if (this.dataCache.promptStats.data && 
          now - this.dataCache.promptStats.timestamp < this.dataCache.promptStats.ttl) {
        console.log('Utilisation des statistiques en cache');
        return this.dataCache.promptStats.data;
      }
      
      // Récupérer les données fraîches
      const stats = await this.api.getPromptStats();
      
      // Mettre à jour le cache
      this.dataCache.promptStats.data = stats;
      this.dataCache.promptStats.timestamp = now;
      
      return stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques des prompts:', error.message);
      
      // En cas d'erreur, utiliser les données en cache même si elles sont expirées
      if (this.dataCache.promptStats.data) {
        console.log('Utilisation des statistiques en cache (expirées) suite à une erreur');
        return this.dataCache.promptStats.data;
      }
      
      throw error;
    }
  }

  /**
   * Récupère des analyses détaillées
   * @returns {Promise<Object>} - Analyses détaillées
   */
  async getDetailedAnalytics() {
    try {
      return await this.api.getDetailedAnalytics();
    } catch (error) {
      console.error('Erreur lors de la récupération des analyses détaillées:', error.message);
      throw error;
    }
  }

  /**
   * Récupère les analyses horaires
   * @param {number} days - Nombre de jours d'historique
   * @returns {Promise<Array>} - Analyses horaires
   */
  async getHourlyAnalytics(days = 7) {
    try {
      // Vérifier si les données sont en cache et valides
      const now = Date.now();
      if (this.dataCache.hourlyAnalytics.data && 
          this.dataCache.hourlyAnalytics.days === days &&
          now - this.dataCache.hourlyAnalytics.timestamp < this.dataCache.hourlyAnalytics.ttl) {
        console.log('Utilisation des analyses horaires en cache');
        return this.dataCache.hourlyAnalytics.data;
      }
      
      // Récupérer les données fraîches
      const analytics = await this.api.getHourlyAnalytics(days);
      
      // Mettre à jour le cache
      this.dataCache.hourlyAnalytics.data = analytics;
      this.dataCache.hourlyAnalytics.days = days;
      this.dataCache.hourlyAnalytics.timestamp = now;
      
      return analytics;
    } catch (error) {
      console.error('Erreur lors de la récupération des analyses horaires:', error.message);
      
      // En cas d'erreur, utiliser les données en cache même si elles sont expirées
      if (this.dataCache.hourlyAnalytics.data) {
        console.log('Utilisation des analyses horaires en cache (expirées) suite à une erreur');
        return this.dataCache.hourlyAnalytics.data;
      }
      
      throw error;
    }
  }

  /**
   * Récupère les tendances à long terme d'un prompt
   * @param {string} promptId - ID du prompt
   * @returns {Promise<Object>} - Tendances à long terme
   */
  async getLongTermTrends(promptId) {
    try {
      // Dans une implémentation réelle, on récupérerait l'historique complet et on calculerait les tendances
      // Pour ce prototype, nous simulons les tendances
      
      const performance = await this.api.getPromptPerformance(promptId);
      
      // Calculer l'élasticité-prix simulée
      // Une valeur positive signifie qu'augmenter le prix augmente les conversions
      // Une valeur négative signifie qu'augmenter le prix diminue les conversions
      const priceElasticity = Math.random() * 0.4 - 0.2; // Valeur entre -0.2 et 0.2
      
      return {
        promptId,
        price_elasticity: priceElasticity,
        average_views_per_day: performance.views_last_30_days / 30,
        average_conversion_rate: performance.conversion_rate,
        price_history: [
          { date: '2025-04-11', price: performance.price * 0.9 },
          { date: '2025-04-25', price: performance.price * 0.95 },
          { date: '2025-05-01', price: performance.price }
        ]
      };
    } catch (error) {
      console.error(`Erreur lors de la récupération des tendances à long terme du prompt ${promptId}:`, error.message);
      
      // Retourner des données simulées en cas d'erreur
      return {
        promptId,
        price_elasticity: 0, // Neutre
        average_views_per_day: 0,
        average_conversion_rate: 0,
        price_history: []
      };
    }
  }

  /**
   * Génère un rapport hebdomadaire
   * @returns {Promise<Object>} - Rapport hebdomadaire
   */
  async generateWeeklyReport() {
    try {
      console.log('Génération du rapport hebdomadaire...');
      
      // Récupérer les données nécessaires
      const promptStats = await this.getPromptStats();
      const hourlyAnalytics = await this.getHourlyAnalytics(7); // 7 jours
      
      // Calculer les statistiques globales
      const totalViews = promptStats.reduce((sum, p) => sum + p.views_last_7_days, 0);
      const totalSales = promptStats.reduce((sum, p) => sum + p.sales_last_7_days, 0);
      const totalRevenue = promptStats.reduce((sum, p) => sum + p.revenue_last_7_days, 0);
      const overallConversionRate = totalViews > 0 ? totalSales / totalViews * 100 : 0;
      
      // Identifier les prompts les plus performants
      const topPromptsByRevenue = [...promptStats]
        .sort((a, b) => b.revenue_last_7_days - a.revenue_last_7_days)
        .slice(0, 5);
      
      const topPromptsByConversion = [...promptStats]
        .filter(p => p.views_last_7_days >= 50) // Au moins 50 vues pour être significatif
        .sort((a, b) => b.conversion_rate - a.conversion_rate)
        .slice(0, 5);
      
      // Analyser les tendances
      const previousWeekRevenue = promptStats.reduce((sum, p) => sum + p.revenue_previous_7_days, 0);
      const revenueGrowth = previousWeekRevenue > 0 
        ? (totalRevenue - previousWeekRevenue) / previousWeekRevenue * 100 
        : 100;
      
      // Générer des graphiques
      const revenueByDayChart = await generateChart('line', 
        this.aggregateDataByDay(hourlyAnalytics, 'revenue'),
        'Revenus quotidiens (7 derniers jours)',
        'Date',
        'Revenus (€)'
      );
      
      const viewsByCategoryChart = await generateChart('pie',
        this.aggregateDataByCategory(promptStats, 'views_last_7_days'),
        'Vues par catégorie (7 derniers jours)',
        'Catégorie',
        'Vues'
      );
      
      // Assembler le rapport
      const report = {
        generated_at: new Date().toISOString(),
        period: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        summary: {
          total_views: totalViews,
          total_sales: totalSales,
          total_revenue: formatCurrency(totalRevenue),
          overall_conversion_rate: formatPercentage(overallConversionRate),
          revenue_growth: formatPercentage(revenueGrowth)
        },
        top_performers: {
          by_revenue: topPromptsByRevenue.map(p => ({
            id: p.id,
            title: p.title,
            revenue: formatCurrency(p.revenue_last_7_days),
            sales: p.sales_last_7_days
          })),
          by_conversion: topPromptsByConversion.map(p => ({
            id: p.id,
            title: p.title,
            conversion_rate: formatPercentage(p.conversion_rate),
            views: p.views_last_7_days
          }))
        },
        charts: {
          revenue_by_day: revenueByDayChart,
          views_by_category: viewsByCategoryChart
        },
        recommendations: this.generateRecommendations(promptStats, revenueGrowth)
      };
      
      console.log('Rapport hebdomadaire généré avec succès');
      
      return report;
    } catch (error) {
      console.error('Erreur lors de la génération du rapport hebdomadaire:', error.message);
      
      // Retourner un rapport minimal en cas d'erreur
      return {
        generated_at: new Date().toISOString(),
        error: error.message,
        summary: {
          message: 'Une erreur est survenue lors de la génération du rapport hebdomadaire.'
        }
      };
    }
  }

  /**
   * Agrège les données par jour
   * @param {Array} hourlyData - Données horaires
   * @param {string} metric - Métrique à agréger
   * @returns {Object} - Données agrégées par jour
   */
  aggregateDataByDay(hourlyData, metric) {
    const aggregatedData = {};
    
    hourlyData.forEach(dataPoint => {
      const date = dataPoint.timestamp.split('T')[0]; // Format YYYY-MM-DD
      
      if (!aggregatedData[date]) {
        aggregatedData[date] = 0;
      }
      
      aggregatedData[date] += dataPoint[metric] || 0;
    });
    
    return {
      labels: Object.keys(aggregatedData),
      datasets: [{
        data: Object.values(aggregatedData)
      }]
    };
  }

  /**
   * Agrège les données par catégorie
   * @param {Array} promptsData - Données des prompts
   * @param {string} metric - Métrique à agréger
   * @returns {Object} - Données agrégées par catégorie
   */
  aggregateDataByCategory(promptsData, metric) {
    const aggregatedData = {};
    
    promptsData.forEach(prompt => {
      const category = prompt.category;
      
      if (!aggregatedData[category]) {
        aggregatedData[category] = 0;
      }
      
      aggregatedData[category] += prompt[metric] || 0;
    });
    
    return {
      labels: Object.keys(aggregatedData),
      datasets: [{
        data: Object.values(aggregatedData)
      }]
    };
  }

  /**
   * Génère des recommandations basées sur les statistiques
   * @param {Array} promptStats - Statistiques des prompts
   * @param {number} revenueGrowth - Croissance des revenus
   * @returns {Array} - Liste de recommandations
   */
  generateRecommendations(promptStats, revenueGrowth) {
    const recommendations = [];
    
    // Recommandation basée sur la croissance des revenus
    if (revenueGrowth < -10) {
      recommendations.push({
        priority: 'high',
        action: 'Revoir la stratégie de prix',
        description: 'Les revenus ont diminué de manière significative. Envisagez des promotions temporaires pour stimuler les ventes.'
      });
    } else if (revenueGrowth > 20) {
      recommendations.push({
        priority: 'medium',
        action: 'Optimiser les prix des prompts populaires',
        description: 'La croissance des revenus est forte. Vous pourriez augmenter légèrement les prix des prompts les plus demandés.'
      });
    }
    
    // Recommandation basée sur les taux de conversion
    const lowConversionPrompts = promptStats.filter(p => 
      p.views_last_7_days >= 100 && p.conversion_rate < 0.03
    );
    
    if (lowConversionPrompts.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Améliorer les prompts à faible taux de conversion',
        description: `${lowConversionPrompts.length} prompts ont un taux de conversion inférieur à 3% malgré un nombre élevé de vues.`,
        affected_prompts: lowConversionPrompts.map(p => p.id)
      });
    }
    
    // Recommandation basée sur la diversification
    const categories = new Set(promptStats.map(p => p.category));
    if (categories.size < 3) {
      recommendations.push({
        priority: 'medium',
        action: 'Diversifier les catégories de prompts',
        description: 'Votre offre est concentrée sur peu de catégories. Diversifier pourrait attirer plus de clients.'
      });
    }
    
    // Recommandation basée sur les prompts sans vues
    const noViewsPrompts = promptStats.filter(p => p.views_last_7_days === 0);
    if (noViewsPrompts.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Actualiser ou retirer les prompts sans vues',
        description: `${noViewsPrompts.length} prompts n'ont reçu aucune vue cette semaine. Envisagez de les actualiser ou de les retirer.`,
        affected_prompts: noViewsPrompts.map(p => p.id)
      });
    }
    
    return recommendations;
  }

  /**
   * Récupère les statistiques du système
   * @returns {Promise<Object>} - Statistiques du système
   */
  async getSystemStats() {
    try {
      const promptStats = await this.getPromptStats();
      
      // Calculer les statistiques globales
      const totalPrompts = promptStats.length;
      const totalSales = promptStats.reduce((sum, p) => sum + p.total_sales, 0);
      const totalRevenue = promptStats.reduce((sum, p) => sum + p.total_revenue, 0);
      const totalViews = promptStats.reduce((sum, p) => sum + p.total_views, 0);
      const overallConversionRate = totalViews > 0 ? totalSales / totalViews * 100 : 0;
      
      // Calculer les statistiques sur 7 jours
      const sales7Days = promptStats.reduce((sum, p) => sum + p.sales_last_7_days, 0);
      const revenue7Days = promptStats.reduce((sum, p) => sum + p.revenue_last_7_days, 0);
      const views7Days = promptStats.reduce((sum, p) => sum + p.views_last_7_days, 0);
      
      return {
        timestamp: new Date().toISOString(),
        total_prompts: totalPrompts,
        total_stats: {
          sales: totalSales,
          revenue: totalRevenue,
          views: totalViews,
          conversion_rate: overallConversionRate
        },
        last_7_days: {
          sales: sales7Days,
          revenue: revenue7Days,
          views: views7Days,
          conversion_rate: views7Days > 0 ? sales7Days / views7Days * 100 : 0
        },
        average_per_prompt: {
          price: totalPrompts > 0 ? promptStats.reduce((sum, p) => sum + p.price, 0) / totalPrompts : 0,
          sales: totalPrompts > 0 ? totalSales / totalPrompts : 0,
          revenue: totalPrompts > 0 ? totalRevenue / totalPrompts : 0,
          views: totalPrompts > 0 ? totalViews / totalPrompts : 0
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques du système:', error.message);
      throw error;
    }
  }
}

module.exports = AnalyticsService;